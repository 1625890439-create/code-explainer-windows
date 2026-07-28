import type { ExplainRequest, ExplainResponse } from "@code-explainer/contracts";

declare global {
  interface Window {
    codeExplainer: { explain(request: ExplainRequest): Promise<ExplainResponse> };
  }
}

// The renderer never gets Node.js access. UI implementation belongs here in phase 2.
export {};

