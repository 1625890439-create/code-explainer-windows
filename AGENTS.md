# Agent Handoff

## Product contract

目标是解释用户当前选中的代码，而不是读取整个项目。默认触发方式为 `Ctrl+Alt+E`；主窗口展示解释、风险和可继续追问的上下文。

## Non-negotiable rules

- 所有跨进程 payload 必须来自 `@code-explainer/contracts`，不要在 UI 或脚本中复制类型。
- `apps/desktop/src/main` 是唯一允许调用 Electron/Node 特权 API 的位置；渲染层只能经 `preload` 暴露的窄接口通信。
- 不记录原始代码、剪贴板内容或 API 密钥。诊断日志只记录长度、耗时、错误码和提供者名称。
- 模型提供者必须实现 `ExplainerProvider`；不要把某个供应商 SDK 直接引入 UI。
- 先做快捷键和剪贴板流程。跨应用原生右键菜单是可选增强，需要单独的兼容性验收。

## Where to work

- 改请求/响应字段：`packages/contracts/src`，然后同步更新 `docs/protocol.md`。
- 改解释策略或模型：`packages/explainer-core/src`。
- 改窗口、IPC、配置保存：`apps/desktop/src/main`。
- 改页面：`apps/desktop/src/renderer`。
- 改全局交互：`integrations/autohotkey`，需在 Windows 真机验证。

## Verification baseline

提交前运行 `npm run typecheck` 和 `npm test`。涉及 Electron 或 AutoHotkey 的改动还要按 `docs/test-plan.md` 做 Windows 手工验收。

