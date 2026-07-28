import type { ExplainRequest, ExplainResponse } from "@code-explainer/contracts";

export interface ExplainerProvider {
  readonly name: string;
  explain(request: ExplainRequest): Promise<ExplainResponse>;
}

export function buildExplanationPrompt(request: ExplainRequest): string {
  return [
    "You are a concise code tutor. Reply in Chinese.",
    `Mode: ${request.mode}`,
    `Language: ${request.language ?? "unknown"}`,
    "Explain purpose, important logic, assumptions, and risks. Do not invent context.",
    "Selected code:",
    request.code
  ].join("\n\n");
}

export function validateRequest(request: ExplainRequest): ExplainResponse | undefined {
  if (!request.code.trim()) return { requestId: request.requestId, code: "EMPTY_SELECTION", message: "没有检测到选中的代码。" };
  if (request.code.length > 30_000) return { requestId: request.requestId, code: "TOO_LARGE", message: "选中内容超过 30,000 个字符。" };
}

