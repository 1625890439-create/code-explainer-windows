# Architecture Decisions

## ADR-001: Electron desktop shell

Decision: Electron + TypeScript is the application shell.

Reason: it provides Windows packaging, secure main/renderer separation, a rich result UI, and an approachable TypeScript ecosystem. Tauri remains a future option only if binary size becomes a measured problem.

## ADR-002: Hotkey is the guaranteed entry point

Decision: `Ctrl+Alt+E` is the MVP interaction; AutoHotkey v2 captures selected text.

Reason: Windows does not expose a supported generic API to modify the text-selection context menu of every arbitrary application. A global right-click menu requires hooks/injection or app-specific integrations and will be brittle. The product can make the hotkey discoverable and add native menu actions selectively.

## ADR-003: Local named pipe, not command-line arguments

Decision: pass selected code through an authenticated local named pipe.

Reason: command lines are inspectable by local processes and may be preserved by diagnostics. A pipe constrains exposure and supports a running background app.

## ADR-004: Provider adapter boundary

Decision: model vendors are behind `ExplainerProvider`.

Reason: it lets users choose cloud, enterprise gateway, or local inference without rewriting Electron code or UI.

