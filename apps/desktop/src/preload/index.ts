import { contextBridge, ipcRenderer } from "electron";
import type { ExplainRequest } from "@code-explainer/contracts";

contextBridge.exposeInMainWorld("codeExplainer", {
  explain: (request: ExplainRequest) => ipcRenderer.invoke("explain", request)
});

