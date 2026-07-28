# Code Explainer for Windows

Windows 代码解释工具。用户在任意编辑器中选中代码，按 `Ctrl+Alt+E`，桌面窗口会展示解释结果。

本仓库以 Electron 桌面端为核心，AutoHotkey v2 负责系统级触发。详情从 [docs/architecture.md](docs/architecture.md) 和 [docs/work-plan.md](docs/work-plan.md) 开始。

## 当前状态

已建立可开发骨架和模块边界；模型调用、安装包和原生右键菜单仍按工作计划实施。

## 快速开始

1. 安装 Node.js 22+ 和 AutoHotkey v2。
2. 在仓库根目录执行 `npm install`。
3. 执行 `npm run dev` 启动桌面端。
4. 将 `integrations/autohotkey/code-explainer.ahk` 中的应用路径改为本机 Electron 可执行文件后运行该脚本。

开发期可向桌面端传入文本：`npm run cli -- --code "const sum = (a, b) => a + b" --language typescript`。

## 目录

```text
apps/desktop/              Electron 主进程、预加载层与渲染界面
apps/cli/                  供快捷键脚本调用的命令行入口
packages/contracts/        所有跨进程数据契约
packages/explainer-core/   语言识别、提示词与模型提供者抽象
integrations/autohotkey/   Windows 选区采集和热键入口
docs/                      面向人和 agent 的架构、决策和计划
```

