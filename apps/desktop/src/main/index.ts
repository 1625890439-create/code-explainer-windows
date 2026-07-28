import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import type { ExplainRequest, ExplainResponse } from "@code-explainer/contracts";
import { validateRequest, type ExplainerProvider } from "@code-explainer/explainer-core";
import { OpenAiProvider } from "@code-explainer/explainer-core/src/providers/openai";
import { SelectionServer } from "./selection-server";
import { loadEnv } from "./env-loader";

let mainWindow: BrowserWindow | undefined;
const selectionServer = new SelectionServer();
let provider: ExplainerProvider | null = null;

function initProvider(): void {
  // In development, .env is in the project root; in production, alongside the exe
  const envDir = app.isPackaged ? join(app.getAppPath(), "..") : join(app.getAppPath(), "..", "..", "..");
  const env = loadEnv(envDir);

  const apiKey = env.OPENAI_API_KEY;
  if (apiKey) {
    provider = new OpenAiProvider({
      apiKey,
      baseUrl: env.OPENAI_BASE_URL,
      model: env.OPENAI_MODEL ?? "gpt-4o-mini",
    });
    console.log("[Provider] OpenAI provider initialized (model:", env.OPENAI_MODEL ?? "gpt-4o-mini", ")");
  } else {
    console.log("[Provider] No OPENAI_API_KEY in .env — using stub responses");
  }
}

async function explain(request: ExplainRequest): Promise<ExplainResponse> {
  const invalid = validateRequest(request);
  if (invalid) return invalid;

  if (provider) {
    return provider.explain(request);
  }

  return {
    requestId: request.requestId,
    summary: "模型提供者尚未配置。",
    details: `桌面端已收到选中的代码（${request.code.length} 字符，语言: ${request.language ?? "未知"}）。\n\n在项目根目录的 .env 文件中设置 OPENAI_API_KEY 来启用 AI 解释。`,
    risks: [],
    followUps: ["如何配置 API Key？", "支持哪些模型？"],
    provider: "unconfigured",
  };
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 720,
    minHeight: 520,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(() => {
  initProvider();
  createWindow();

  ipcMain.handle("explain", (_, request: ExplainRequest) => explain(request));

  selectionServer.onRequest((request: ExplainRequest) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("selection-received", request);
    }
  });
  selectionServer.start();

  const userDataPath = app.getPath("userData");
  selectionServer.writeConfigFile(userDataPath);

  console.log(`[SelectionServer] Listening on ${selectionServer.pipePath}`);
});

app.on("window-all-closed", () => {
  selectionServer.stop();
  if (process.platform !== "darwin") app.quit();
});