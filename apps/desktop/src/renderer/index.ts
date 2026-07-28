import type { ExplainRequest, ExplainResponse } from "@code-explainer/contracts";

declare global {
  interface Window {
    codeExplainer: {
      explain(request: ExplainRequest): Promise<ExplainResponse>;
      onSelectionReceived(callback: (request: ExplainRequest) => void): () => void;
    };
  }
}

/* ------------------------------------------------------------------ */
/*  DOM helpers                                                        */
/* ------------------------------------------------------------------ */

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function qs<T extends HTMLElement>(selector: string, parent: ParentNode = document): T | null {
  return parent.querySelector(selector);
}

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

let currentRequest: ExplainRequest | null = null;
let isLoading = false;

/* ------------------------------------------------------------------ */
/*  Rendering                                                          */
/* ------------------------------------------------------------------ */

function setStatus(text: string, color = ""): void {
  const badge = el<HTMLSpanElement>("status-badge");
  badge.textContent = text;
  if (color) badge.style.background = color;
  else badge.style.background = "";
}

function showPlaceholder(): void {
  const main = el("app-main");
  main.innerHTML = `<div class="placeholder" id="placeholder">
    <p>在任意编辑器中<strong>选中代码</strong></p>
    <p>按下 <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>E</kbd></p>
  </div>`;
}

function renderRequestCard(request: ExplainRequest): string {
  const lang = request.language ?? "未知";
  const time = new Date(request.createdAt).toLocaleTimeString("zh-CN");
  const preview = request.code.length > 500
    ? request.code.slice(0, 500) + "\n// … 共 " + request.code.length + " 字符"
    : request.code;

  return `<div class="card" id="request-card">
    <div class="card-header">
      <span class="lang-tag">${escapeHtml(lang)}</span>
      <span class="meta">${request.code.length} 字符 · ${time}</span>
    </div>
    <pre class="code-block">${escapeHtml(preview)}</pre>
    <div id="result-area" style="margin-top:12px"></div>
  </div>`;
}

function renderLoading(): string {
  return `<div style="padding:16px 0;text-align:center">
    <span class="spinner"></span> 正在解释…
  </div>`;
}

function renderResult(response: ExplainResponse): string {
  if ("code" in response) {
    // ExplainError
    return `<div class="error-card">
      <p>${escapeHtml(response.message)}</p>
      <button class="retry" id="btn-retry">重试</button>
    </div>`;
  }

  const risksHtml = response.risks.length
    ? `<ul class="risks">${response.risks.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`
    : "";

  const followUpsHtml = response.followUps.length
    ? `<div class="follow-ups">${response.followUps.map((f) => `<span class="chip">${escapeHtml(f)}</span>`).join("")}</div>`
    : "";

  return `<div class="result-section">
    <h3>📋 概述</h3>
    <p>${escapeHtml(response.summary)}</p>
    ${risksHtml}
    ${followUpsHtml}
    <div class="result-section" style="margin-top:16px">
      <h3>📝 详细解释</h3>
      <p style="white-space:pre-wrap">${escapeHtml(response.details)}</p>
    </div>
    <div style="margin-top:12px;font-size:11px;color:var(--muted)">提供者: ${escapeHtml(response.provider)}</div>
  </div>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return text.replace(/[&<>"']/g, (c) => map[c] || c);
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

async function handleExplain(request: ExplainRequest): Promise<void> {
  currentRequest = request;
  isLoading = true;
  setStatus("解释中…", "#f9e2af");

  // Show the request card with loading
  const main = el("app-main");
  main.innerHTML = renderRequestCard(request);
  const resultArea = el("result-area");
  resultArea.innerHTML = renderLoading();

  try {
    const response = await window.codeExplainer.explain(request);
    isLoading = false;

    if ("code" in response) {
      setStatus("出错", "var(--danger)");
    } else {
      setStatus("已完成", "#a6e3a1");
    }

    resultArea.innerHTML = renderResult(response);

    // Wire up retry button if error
    const retryBtn = qs<HTMLButtonElement>("#btn-retry");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => handleExplain(request));
    }
  } catch (err) {
    isLoading = false;
    setStatus("连接失败", "var(--danger)");
    resultArea.innerHTML = `<div class="error-card">
      <p>与桌面端通信失败。请重启应用。</p>
    </div>`;
  }
}

/* ------------------------------------------------------------------ */
/*  Bootstrap                                                          */
/* ------------------------------------------------------------------ */

function init(): void {
  window.codeExplainer.onSelectionReceived((request: ExplainRequest) => {
    // Ignore if already processing; in Phase 3 we'll add a queue
    if (isLoading) return;
    handleExplain(request);
  });
}

init();