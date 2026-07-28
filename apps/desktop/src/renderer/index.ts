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

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

let isLoading = false;

/* ------------------------------------------------------------------ */
/*  Rendering                                                          */
/* ------------------------------------------------------------------ */

function setStatus(text: string, color = ""): void {
  const badge = el<HTMLSpanElement>("status-badge");
  badge.textContent = text;
  badge.style.background = color || "";
}

function renderCard(request: ExplainRequest): string {
  const preview = request.code.length > 500
    ? request.code.slice(0, 500) + "\n// … 共 " + request.code.length + " 字符"
    : request.code;

  return `<div class="card">
    <div class="card-header">
      <span class="lang-tag">${escapeHtml(request.language ?? "自动")}</span>
      <span class="meta">${request.code.length} 字符 · ${new Date(request.createdAt).toLocaleTimeString("zh-CN")}</span>
    </div>
    <pre class="code-block">${escapeHtml(preview)}</pre>
    <div id="inner-result"></div>
  </div>`;
}

function renderResult(response: ExplainResponse): string {
  if ("code" in response) {
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

  return `
    <div class="result-section">
      <h3>📋 概述</h3>
      <p>${escapeHtml(response.summary)}</p>
    </div>
    ${risksHtml}
    ${followUpsHtml}
    <div class="result-section" style="margin-top:16px">
      <h3>📝 详细解释</h3>
      <p style="white-space:pre-wrap">${escapeHtml(response.details)}</p>
    </div>
    <div style="margin-top:12px;font-size:11px;color:var(--muted)">提供者: ${escapeHtml(response.provider)}</div>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return text.replace(/[&<>"']/g, (c) => map[c] || c);
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

async function handleExplain(request: ExplainRequest): Promise<void> {
  isLoading = true;
  setStatus("解释中…", "#f9e2af");

  const main = el("app-main");
  main.innerHTML = renderCard(request) + `<div style="text-align:center;padding:24px"><span class="spinner"></span> 正在解释…</div>`;

  try {
    const response = await window.codeExplainer.explain(request);
    isLoading = false;

    if ("code" in response) {
      setStatus("出错", "var(--danger)");
    } else {
      setStatus("已完成", "#a6e3a1");
    }

    const inner = document.getElementById("inner-result");
    if (inner) inner.innerHTML = renderResult(response);

    const retryBtn = document.getElementById("btn-retry");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => handleExplain(request));
    }
  } catch {
    isLoading = false;
    setStatus("连接失败", "var(--danger)");
    const inner = document.getElementById("inner-result");
    if (inner) inner.innerHTML = `<div class="error-card"><p>通信失败，请重启应用。</p></div>`;
  }
}

/* ------------------------------------------------------------------ */
/*  Bootstrap                                                          */
/* ------------------------------------------------------------------ */

function init(): void {
  window.codeExplainer.onSelectionReceived((request: ExplainRequest) => {
    if (isLoading) return;
    handleExplain(request);
  });
}

init();