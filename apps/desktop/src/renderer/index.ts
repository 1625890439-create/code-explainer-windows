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
  if (color) badge.style.background = color;
  else badge.style.background = "";
}

function renderResult(response: ExplainResponse): string {
  if ("code" in response) {
    return `<div class="error-card">
      <p>${escapeHtml(response.message)}</p>
    </div>`;
  }

  const risksHtml = response.risks.length
    ? `<ul class="risks">${response.risks.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`
    : "";

  const followUpsHtml = response.followUps.length
    ? `<div class="follow-ups">${response.followUps.map((f) => `<span class="chip">${escapeHtml(f)}</span>`).join("")}</div>`
    : "";

  return `<div class="card" style="margin-top:0">
    <div class="card-header">
      <span class="lang-tag">${escapeHtml(response.provider)}</span>
    </div>
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
  </div>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return text.replace(/[&<>"']/g, (c) => map[c] || c);
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

async function submitCode(): Promise<void> {
  const codeInput = el<HTMLTextAreaElement>("code-input");
  const code = codeInput.value.trim();
  if (!code) return;

  const langSelect = el<HTMLSelectElement>("lang-select");
  const modeSelect = el<HTMLSelectElement>("mode-select");
  const btn = el<HTMLButtonElement>("btn-explain");
  const resultBlock = el("result-block");

  const request: ExplainRequest = {
    requestId: crypto.randomUUID(),
    code,
    language: langSelect.value || undefined,
    mode: modeSelect.value as "overview" | "line-by-line" | "review",
    source: "cli",
    createdAt: new Date().toISOString(),
  };

  isLoading = true;
  btn.disabled = true;
  btn.textContent = "⏳ 解释中…";
  setStatus("解释中…", "#f9e2af");

  resultBlock.innerHTML = `<div style="padding:24px;text-align:center">
    <span class="spinner"></span> 正在调用 DeepSeek-V4-Pro…
  </div>`;

  try {
    const response = await window.codeExplainer.explain(request);
    isLoading = false;
    btn.disabled = false;
    btn.textContent = "⚡ 解释";

    if ("code" in response) {
      setStatus("出错", "var(--danger)");
    } else {
      setStatus("已完成", "#a6e3a1");
    }

    resultBlock.innerHTML = renderResult(response);
  } catch (err) {
    isLoading = false;
    btn.disabled = false;
    btn.textContent = "⚡ 解释";
    setStatus("连接失败", "var(--danger)");
    resultBlock.innerHTML = `<div class="error-card">
      <p>与桌面端通信失败。请重启应用。</p>
    </div>`;
  }
}

/* ------------------------------------------------------------------ */
/*  Bootstrap                                                          */
/* ------------------------------------------------------------------ */

function init(): void {
  // Manual explain button
  el<HTMLButtonElement>("btn-explain").addEventListener("click", submitCode);

  // Ctrl+Enter shortcut in textarea
  el<HTMLTextAreaElement>("code-input").addEventListener("keydown", (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      submitCode();
    }
  });

  // AHK pipe listener (for when AutoHotkey is available)
  window.codeExplainer.onSelectionReceived((request: ExplainRequest) => {
    if (isLoading) return;
    // Auto-fill the input with received code
    el<HTMLTextAreaElement>("code-input").value = request.code;
    if (request.language) {
      el<HTMLSelectElement>("lang-select").value = request.language;
    }
    submitCode();
  });

  // Auto-paste: detect paste into body when textarea not focused, route to input
  document.addEventListener("paste", (e: ClipboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return;
    // If pasting elsewhere, focus the code input and let the paste land there
    const codeInput = el<HTMLTextAreaElement>("code-input");
    codeInput.focus();
    // Small delay to let the paste event complete in the new target
    setTimeout(() => {
      if (codeInput.value.trim()) {
        codeInput.scrollTop = 0;
      }
    }, 50);
  });
}

init();