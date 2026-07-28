# Architecture

## Scope

系统解释“当前选区”的代码。它运行在 Windows 桌面环境，初期支持全局热键，后续可增加特定编辑器的右键项和 VS Code 扩展。

```text
Selected text
    | Ctrl+Alt+E
AutoHotkey v2 launcher
    | named pipe (local only, authenticated)
Electron main process
    | validates request
explainer-core -> provider adapter -> model API
    | structured response
Electron renderer -> explanation window
```

## Components

| Component | Owns | Must not own |
| --- | --- | --- |
| `integrations/autohotkey` | global hotkey, copy selection, start IPC client | model API key, UI state |
| `apps/desktop/main` | window lifecycle, IPC server, OS secure-store access | markdown rendering, provider-specific UI |
| `packages/explainer-core` | input limits, prompt generation, provider interface | Electron imports |
| `packages/contracts` | versioned request and response types | business logic |
| `apps/desktop/renderer` | display, retry, copy answer, settings forms | Node/Electron privileged APIs |

## Data flow and safety

1. Launcher saves the clipboard, sends `Ctrl+C`, reads the selection, and restores the clipboard.
2. It sends a JSON `ExplainRequest` to a local named pipe. Selection text must never appear in command-line arguments, persistent logs, analytics, or crash reports.
3. Main process validates the size and forwards it to a configured `ExplainerProvider`.
4. Renderer receives a typed `ExplainResponse`; errors are rendered as recoverable states.

The named pipe uses a random token generated at app start and passed to the launcher through a protected local configuration file. Only the current Windows user may connect. API credentials live in Windows Credential Manager, not `.env` in production.

## Why the desktop app owns IPC

AutoHotkey is excellent for system-wide selection capture but poor at networking, secure credential storage and rich UI. Electron handles the latter three, while keeping the provider-agnostic core testable outside Electron.

## Extension points

- Add an OpenAI-compatible provider by implementing `ExplainerProvider` in `packages/explainer-core/src/providers`.
- Add a VS Code extension under `integrations/vscode`; it maps an editor selection to the same `ExplainRequest`.
- Add a Windows Explorer context menu only for files, not code selections. Cross-application native selection menus have no dependable Windows-wide API; use the hotkey as the product baseline.

