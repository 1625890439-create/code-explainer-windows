import { contextBridge, ipcRenderer } from "electron";
import type { ExplainRequest } from "@code-explainer/contracts";

contextBridge.exposeInMainWorld("codeExplainer", {
  explain: (request: ExplainRequest) => ipcRenderer.invoke("explain", request),
  onSelectionReceived: (callback: (request: ExplainRequest) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, request: ExplainRequest) => callback(request);
    ipcRenderer.on("selection-received", handler);
    // Return an unsubscribe function so the renderer can clean up
    return () => ipcRenderer.removeListener("selection-received", handler);
  },
});