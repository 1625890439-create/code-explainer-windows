export type ExplainMode = "overview" | "line-by-line" | "review";

export interface ExplainRequest {
  requestId: string;
  code: string;
  language?: string;
  mode: ExplainMode;
  source: "hotkey" | "context-menu" | "cli";
  createdAt: string;
}

export interface ExplainResult {
  requestId: string;
  summary: string;
  details: string;
  risks: string[];
  followUps: string[];
  provider: string;
}

export interface ExplainError {
  requestId: string;
  code: "EMPTY_SELECTION" | "TOO_LARGE" | "AUTH" | "NETWORK" | "PROVIDER";
  message: string;
}

export type ExplainResponse = ExplainResult | ExplainError;

