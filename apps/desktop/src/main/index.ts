import { app, BrowserWindow, globalShortcut, ipcMain } from "electron";
import { join } from "node:path";
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
    : join(app.getAppPath(), "..", "..", "..");
  const env = loadEnv(envDir);

  const apiKey = env.OPENAI_API_KEY;
  if (apiKey) {
    provider = new OpenAiProvider({
      apiKey,
      baseUrl: env.OPENAI_BASE_URL,
      model: env.OPENAI_MODEL ?? "gpt-4o-mini",
    });
    console.log("[Provider]", env.OPENAI_MODEL ?? "gpt-4o-mini");
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
    show: false,
  });

  mainWindow.loadFile(join(__dirname, "../renderer/index.html"));

  mainWindow.on("close", (e) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

app.whenReady().then(() => {
  initProvider();
  createWindow();

  ipcMain.handle("explain", (_, request: ExplainRequest) => explain(request));

  // Pipe server: AHK sends selection here
  selectionServer.onRequest((request: ExplainRequest) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send("selection-received", request);
    }
  });
  selectionServer.start();

  const userDataPath = app.getPath("userData");
  selectionServer.writeConfigFile(userDataPath);

  console.log("[Pipe]", selectionServer.pipePath);

  // Fallback: also register global hotkey (in case AHK is not running)
  const ok = globalShortcut.register("CommandOrControl+Alt+E", () => {
    console.log("[Hotkey] Ctrl+Alt+E pressed (AHK should be primary)");
  });
  if (ok) console.log("[Hotkey] Ctrl+Alt+E registered as fallback");
});

app.on("window-all-closed", () => {
  // Keep running in background
});

app.on("will-quit", () => {
  selectionServer.stop();
  globalShortcut.unregisterAll();
});