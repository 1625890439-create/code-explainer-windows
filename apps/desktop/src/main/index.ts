import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import type { ExplainRequest, ExplainResponse } from "@code-explainer/contracts";
import { validateRequest } from "@code-explainer/explainer-core";

let mainWindow: BrowserWindow | undefined;

async function explain(request: ExplainRequest): Promise<ExplainResponse> {
  const invalid = validateRequest(request);
  if (invalid) return invalid;
  // Replace this deterministic stub with a provider selected in settings.
  return { requestId: request.requestId, summary: "模型提供者尚未配置。", details: "桌面端已收到选中的代码。下一阶段将在此调用 ExplainerProvider。", risks: [], followUps: [], provider: "unconfigured" };
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 960, height: 720, minWidth: 720, minHeight: 520,
    webPreferences: { preload: join(__dirname, "../preload/index.js"), contextIsolation: true, nodeIntegration: false }
  });
  mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(() => {
  createWindow();
  ipcMain.handle("explain", (_, request: ExplainRequest) => explain(request));
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

