import type { ExplainRequest, ExplainResponse } from "@code-explainer/contracts";
import type { ExplainerProvider } from "../index.js";
import { buildExplanationPrompt } from "../index.js";

export interface OpenAiProviderOptions {
  apiKey: string;
  baseUrl?: string; // defaults to https://api.openai.com/v1
  model?: string;   // defaults to gpt-4o-mini
}

/**
 * OpenAI-compatible provider that calls the chat completions endpoint.
 * Works with OpenAI, Azure, DeepSeek, and any compatible API gateway.
 */
export class OpenAiProvider implements ExplainerProvider {
  readonly name = "openai";
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(options: OpenAiProviderOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
    this.model = options.model ?? "gpt-4o-mini";
  }

  async explain(request: ExplainRequest): Promise<ExplainResponse> {
    const prompt = buildExplanationPrompt(request);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: "You are a helpful code tutor. Always reply in Chinese. Structure your response as JSON with fields: summary (简短概述), details (详细解释), risks (潜在风险列表), followUps (可追问的问题列表).",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
        signal: AbortSignal.timeout(45_000), // 45s timeout per architecture spec
      });

      if (response.status === 401 || response.status === 403) {
        return {
          requestId: request.requestId,
          code: "AUTH",
          message: "API 密钥无效或已过期。请在设置中重新配置。",
        };
      }

      if (!response.ok) {
        return {
          requestId: request.requestId,
          code: "PROVIDER",
          message: `模型服务返回错误 (${response.status})。请稍后重试。`,
        };
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };

      const rawContent = data.choices?.[0]?.message?.content ?? "";
      return this.parseContent(rawContent, request.requestId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("timeout") || msg.includes("AbortError")) {
        return {
          requestId: request.requestId,
          code: "NETWORK",
          message: "请求超时。请检查网络连接后重试。",
        };
      }
      return {
        requestId: request.requestId,
        code: "NETWORK",
        message: "网络连接失败。请检查网络和 API 地址。",
      };
    }
  }

  /**
   * Parse the model's JSON response. Gracefully falls back to treating the
   * entire response as the details field if JSON parsing fails.
   */
  private parseContent(raw: string, requestId: string): ExplainResponse {
    try {
      // Try to extract JSON from the response (the model may wrap it in markdown)
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          requestId,
          summary: String(parsed.summary ?? ""),
          details: String(parsed.details ?? parsed.summary ?? raw),
          risks: Array.isArray(parsed.risks) ? parsed.risks.map(String) : [],
          followUps: Array.isArray(parsed.followUps) ? parsed.followUps.map(String) : [],
          provider: this.name,
        };
      }
    } catch {
      // JSON parse failed — use raw text as details
    }

    return {
      requestId,
      summary: raw.slice(0, 200),
      details: raw,
      risks: [],
      followUps: [],
      provider: this.name,
    };
  }
}