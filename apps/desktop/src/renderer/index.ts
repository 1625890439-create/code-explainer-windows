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
let particleRaf = 0;
/** 当前请求（用于追问时传递 originalRequestId + code） */
let currentRequest: ExplainRequest | null = null;

/* ------------------------------------------------------------------ */
/*  Particle system (canvas)                                           */
/* ------------------------------------------------------------------ */

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  opacity: number;
}

let particles: Particle[] = [];
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

function startParticles(): void {
  canvas = el<HTMLCanvasElement>("particle-canvas");
  ctx = canvas.getContext("2d")!;

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  const count = 50;
  particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.4 + 0.1,
    });
  }

  function draw() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 229, 255, ${p.opacity})`;
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0, 229, 255, ${0.06 * (1 - dist / 80)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    particleRaf = requestAnimationFrame(draw);
  }

  draw();
}

function stopParticles(): void {
  if (particleRaf) {
    cancelAnimationFrame(particleRaf);
    particleRaf = 0;
  }
  particles = [];
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

function setStatus(text: string, state: "idle" | "loading" | "done" | "error" = "idle"): void {
  const dot = el<HTMLSpanElement>("status-dot");
  const badge = el<HTMLSpanElement>("status-badge");
  badge.textContent = text;
  dot.className = "status-dot " + state;
}

/* ------------------------------------------------------------------ */
/*  Rendering                                                          */
/* ------------------------------------------------------------------ */

function renderCard(request: ExplainRequest): string {
  const preview = request.code.length > 500
    ? request.code.slice(0, 500) + "\n// … 共 " + request.code.length + " 字符"
    : request.code;

  return `<div class="card" id="result-card">
    <div class="card-header">
      <span class="lang-tag">${escapeHtml(request.language ?? "自动")}</span>
      <span class="meta">${request.code.length} 字符 · ${new Date(request.createdAt).toLocaleTimeString("zh-CN")}</span>
    </div>
    <pre class="code-block">${escapeHtml(preview)}</pre>
    <div id="inner-result"></div>
    <!-- 追问区域：新的追问结果会追加到这里 -->
    <div id="follow-up-results"></div>
  </div>`;
}

function renderSkeleton(): string {
  return `<div class="skeleton-card">
    <div class="skeleton-row"></div>
    <div class="skeleton-row"></div>
    <div class="skeleton-row"></div>
    <div class="skeleton-row"></div>
  </div>`;
}

function renderResult(response: ExplainResponse): string {
  if ("code" in response) {
    return `<div class="error-card glitching">
      <p>⚠ ${escapeHtml(response.message)}</p>
      <button class="retry" id="btn-retry">↻ 重试</button>
    </div>`;
  }

  const risksHtml = response.risks.length
    ? `<ul class="risks">${response.risks.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`
    : "";

  const followUpsHtml = response.followUps.length
    ? `<div class="follow-ups" id="follow-ups">${response.followUps.map((f) => `<span class="chip">${escapeHtml(f)}</span>`).join("")}</div>`
    : "";

  return `
    <div class="result-section">
      <h3>概述</h3>
      <p>${escapeHtml(response.summary)}</p>
    </div>
    ${risksHtml}
    ${followUpsHtml}
    <div class="result-section" style="margin-top:18px">
      <h3>详细解释</h3>
      <p style="white-space:pre-wrap">${escapeHtml(response.details)}</p>
    </div>
    <div class="provider-footnote">▸ 提供者: ${escapeHtml(response.provider)}</div>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return text.replace(/[&<>"']/g, (c) => map[c] || c);
}

/* ------------------------------------------------------------------ */
/*  Follow-up question rendering                                       */
/* ------------------------------------------------------------------ */

/**
 * 渲染追问回答卡片，追加到 #follow-up-results 区域。
 * 每个追问卡片带有问题标签 + AI 回答 + 删除按钮。
 */
function appendFollowUpResult(question: string, response: ExplainResponse): void {
  const container = document.getElementById("follow-up-results");
  if (!container) return;

  if ("code" in response) {
    // 追问出错
    const errorCard = document.createElement("div");
    errorCard.className = "follow-up-card error-card";
    errorCard.innerHTML = `<div class="fu-question">❓ ${escapeHtml(question)}</div>
      <p>⚠ ${escapeHtml(response.message)}</p>`;
    container.appendChild(errorCard);
    return;
  }

  const card = document.createElement("div");
  card.className = "follow-up-card";

  card.innerHTML = `
    <div class="fu-question">❓ ${escapeHtml(question)}</div>
    <div class="fu-answer" style="white-space:pre-wrap">${escapeHtml(response.details)}</div>
    <button class="fu-dismiss" title="移除">✕</button>
  `;

  // 删除按钮
  const dismissBtn = card.querySelector(".fu-dismiss");
  if (dismissBtn) {
    dismissBtn.addEventListener("click", () => card.remove());
  }

  container.appendChild(card);
  card.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

async function handleExplain(request: ExplainRequest): Promise<void> {
  isLoading = true;
  currentRequest = request;  // 记录当前请求，供追问使用
  setStatus("解析中…", "loading");
  stopParticles();

  const main = el("app-main");
  const placeholder = document.getElementById("placeholder");
  if (placeholder) placeholder.style.display = "none";

  // 卡片 + 骨架屏
  main.innerHTML = renderCard(request) + renderSkeleton();

  try {
    const response = await window.codeExplainer.explain(request);
    isLoading = false;

    if ("code" in response) {
      setStatus("错误", "error");
    } else {
      setStatus("完成", "done");
      const card = document.getElementById("result-card");
      if (card) card.classList.add("result-ready");
    }

    const inner = document.getElementById("inner-result");
    if (inner) {
      inner.innerHTML = renderResult(response);
      // 绑定追问 chip 点击事件
      bindFollowUpChips(request);
    }
  } catch {
    isLoading = false;
    setStatus("连接失败", "error");
    const inner = document.getElementById("inner-result");
    if (inner) {
      inner.innerHTML = `<div class="error-card glitching"><p>⚠ 通信失败，请重启应用。</p></div>`;
    }
  }

  // 绑定重试
  const retryBtn = document.getElementById("btn-retry");
  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      isLoading = false;
      handleExplain(request);
    });
  }
}

/**
 * 为 follow-ups 区域的 chip 绑定点击事件。
 * 点击 chip 后发送追问请求，将 AI 回答追加到 #follow-up-results。
 */
function bindFollowUpChips(request: ExplainRequest): void {
  const chips = document.querySelectorAll("#follow-ups .chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      if (isLoading) return;
      const question = chip.textContent ?? "";
      handleFollowUp(request, question);
    });
  });
}

/**
 * 执行追问：构造带 followUp 的 ExplainRequest，调 explain()，
 * 结果追加到 #follow-up-results。
 */
async function handleFollowUp(request: ExplainRequest, question: string): Promise<void> {
  isLoading = true;
  setStatus("追问中…", "loading");

  // 在追问区域插入加载指示
  const container = document.getElementById("follow-up-results");
  if (container) {
    const loader = document.createElement("div");
    loader.className = "follow-up-card";
    loader.id = "fu-loading";
    loader.innerHTML = `<div class="fu-question">❓ ${escapeHtml(question)}</div>
      <div class="skeleton-row" style="height:16px"></div>`;
    container.appendChild(loader);
  }

  try {
    const response = await window.codeExplainer.explain({
      requestId: crypto.randomUUID(),
      code: request.code,
      language: request.language,
      mode: request.mode,
      source: request.source,
      createdAt: new Date().toISOString(),
      followUp: {
        originalRequestId: request.requestId,
        question,
      },
    });

    // 移除 loading
    const loaderEl = document.getElementById("fu-loading");
    if (loaderEl) loaderEl.remove();

    appendFollowUpResult(question, response);
    setStatus("完成", "done");
  } catch {
    const loaderEl = document.getElementById("fu-loading");
    if (loaderEl) loaderEl.remove();
    setStatus("追问失败", "error");

    if (container) {
      const errorCard = document.createElement("div");
      errorCard.className = "follow-up-card error-card";
      errorCard.innerHTML = `<div class="fu-question">❓ ${escapeHtml(question)}</div>
        <p>⚠ 网络错误，请重试</p>`;
      container.appendChild(errorCard);
    }
  } finally {
    isLoading = false;
  }
}

/* ------------------------------------------------------------------ */
/*  Bootstrap                                                          */
/* ------------------------------------------------------------------ */

function init(): void {
  startParticles();

  window.codeExplainer.onSelectionReceived((request: ExplainRequest) => {
    if (isLoading) return;
    handleExplain(request);
  });
}

init();