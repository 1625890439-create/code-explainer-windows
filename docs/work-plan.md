# Work Plan

This plan is ordered by user value and risk. An agent should finish a phase, run its acceptance checks, then update this document with evidence.

## Phase 0: Repository baseline

- [x] Create workspace layout, contracts, architecture handoff and decision records.
- [ ] Add shared ESLint, formatter, CI and conventional commit rules.
- Acceptance: clean clone passes `npm run typecheck` and `npm test`.

## Phase 1: Selection to window

- [ ] Implement named-pipe server in `apps/desktop/src/main/selection-server.ts` with per-session token validation.
- [ ] Implement a small compiled launcher or Node helper; make the AutoHotkey script call it.
- [ ] Show received code metadata and restore the prior clipboard on success, timeout and error.
- Acceptance: select text in Notepad, VS Code and a browser, press `Ctrl+Alt+E`, and observe the exact selection in the app without changing the clipboard.

## Phase 2: Explanation MVP

- [ ] Add an OpenAI-compatible provider adapter and secure API-key storage.
- [ ] Build result view: overview, line-by-line and review modes; loading, error and retry states.
- [ ] Add request cancellation, 30k input limit and a 45-second timeout.
- Acceptance: a TypeScript, Python and SQL selection yields a Chinese explanation; bad credentials never expose a key or stack trace.

## Phase 3: Product hardening

- [ ] Persist user settings in a versioned schema and migrate safely.
- [ ] Add opt-in redaction rules for secrets, telemetry-free diagnostics, accessibility and dark/light themes.
- [ ] Test provider failures and clipboard restoration automatically where possible.
- Acceptance: settings survive restart; secrets matching configured patterns are blocked before network transmission.

## Phase 4: Windows distribution

- [ ] Add electron-builder, code signing configuration and installer/uninstaller.
- [ ] Register startup and tray controls only with explicit user consent.
- [ ] Package AutoHotkey dependency or replace it with a signed native launcher.
- Acceptance: fresh Windows 10 and 11 VMs install, launch, update and uninstall cleanly.

## Phase 5: Optional right-click integrations

- [ ] Build VS Code extension with a native editor context-menu command.
- [ ] Evaluate app-specific integrations for JetBrains/Notepad++ based on demand.
- [ ] Do not implement generic process injection unless a separate security review approves it.
- Acceptance: VS Code right-click action sends the editor selection through the shared protocol.

