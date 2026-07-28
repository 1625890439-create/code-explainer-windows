import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import type { ExplainRequest, ExplainResponse } from "@code-explainer/contracts";
import { validateRequest, type ExplainerProvider } from "@code-explainer/explainer-core";
import { OpenAiProvider } from "@code-explainer/explainer-core/src/providers/openai";
import { SelectionServer } from "./selection-server.js";
import { loadEnv } from "./env-loader.js";

let mainWindow: BrowserWindow | undefined;
const selectionServer = new SelectionServer();
let provider: ExplainerProvider | null = null;

function initProvider(): void {
  const envDir = app.isPackaged
    ? join(app.getAppPath(), "..")
    : join(app.getAppPath(), "..", "..");
  const env = loadEnv(envDir);

  const apiKey = env.OPENAI_API_KEY;
  if (apiKey) {
    provider = new OpenAiProvider({
      apiKey,
      baseUrl: env.OPENAI_BASE_URL,
      model: env.OPENAI_MODEL ?? "gpt-4o-mini",
    });
    console.log("[Provider]", env.OPENAI_MODEL ?? "gpt-4o-mini");
  } else {
    console.log("[Provider] No API key configured");
  }
}

async function explain(request: ExplainRequest): Promise<ExplainResponse> {
  const invalid = validateRequest(request);
  if (invalid) return invalid;
  if (provider) return provider.explain(request);
  return {
    requestId: request.requestId,
    summary: "未配置 API Key。",
    details: "在项目根目录 .env 中设置 OPENAI_API_KEY。",
    risks: [],
    followUps: [],
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
    show: true,  // Show immediately for debugging
  });

  mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(() => {
  initProvider();
  createWindow();

  ipcMain.handle("explain", (_, request: ExplainRequest) => explain(request));

  // Pipe server: AHK sends selection here
  selectionServer.onRequest((request: ExplainRequest) => {
    console.log("[Pipe] Request received:", request.code.substring(0, 50));
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send("selection-received", request);
    }
  });
  selectionServer.start();

  // Write token
  const appPath = app.getAppPath();
  const projectRoot = app.isPackaged ? join(appPath, "..") : join(appPath, "..", "..");
  const tokenPath = join(projectRoot, ".pipe-token");
  try {
    writeFileSync(tokenPath, selectionServer.sessionToken, "utf-8");
    console.log("[Token] Written to", tokenPath);
  } catch (e: any) {
    console.error("[Token] Failed to write:", e.message);
  }

  console.log("[Pipe]", selectionServer.pipePath);
  console.log("[AppPath]", appPath);
});

app.on("window-all-closed", () => {});

app.on("will-quit", () => {
  selectionServer.stop();
});