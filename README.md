# Code Explainer for Windows

Windows 代码解释工具。在任意编辑器中选中代码，按 `Ctrl+Alt+\`，桌面窗口自动展示 AI 解释结果。

## 运行效果

1. 在 VS Code / 记事本 / 浏览器等任意应用中选中代码
2. 按 `Ctrl+Alt+\`
3. Code Explainer 窗口弹出，显示中文解释、风险提示和可追问问题

## 环境要求

- **Node.js** 22+
- **AutoHotkey v2.0**（用于全局热键和剪贴板操作）
- **npm** 包管理器

## 部署步骤

### 1. 安装依赖

```bash
# 安装 AutoHotkey v2（如已安装可跳过）
winget install AutoHotkey.AutoHotkey --version 2.0.18

# 进入项目目录
cd code-explainer-windows

# 安装 Node 依赖（如遇 Electron 下载超时，设置国内镜像）
npm install
```

> 国内网络安装 Electron 超时？先设置镜像：
> ```bash
> export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
> npm install
> ```

### 2. 配置 API Key

在项目根目录创建 `.env` 文件：

```env
OPENAI_API_KEY=你的API密钥
OPENAI_BASE_URL=你的模型调用地址
OPENAI_MODEL=你的模型名称
```

支持任意 OpenAI 兼容接口（DeepSeek、通义千问、本地 LLM 等），修改 `OPENAI_BASE_URL` 和 `OPENAI_MODEL` 即可切换。

### 3. 编译 pipe-client

```bash
cd apps/desktop
npx esbuild src/main/pipe-client.ts --bundle --platform=node --target=node18 --outfile=../code-explainer-windows/pipe-client.js #outfile注意补充项目的绝对路径
cd ..
```

> pipe-client 是 AHK 热键与 Electron 之间的桥梁，不要被 dev build 覆盖。

### 4. 启动

#### 方式一：一键启动（推荐）

双击项目根目录的 `launch.ahk`，自动完成：
- 启动 Electron 桌面端（`npm run dev`）
- 等待服务就绪
- 加载热键脚本

#### 方式二：手动启动

```bash
# 终端 1：启动 Electron
cd code-explainer-windows\apps\desktop
npm run dev

# 终端 2：加载热键（或双击运行）
code-explainer-windows\integrations\autohotkey\code-explainer.ahk
```

### 5. 使用

1. 确认热键脚本和 Electron 都已在运行
2. 在任意应用中**选中代码文本**
3. 按 `Ctrl+Alt+\`（反斜杠键）
4. 等待窗口弹出显示解释结果

## 项目结构

```
code-explainer-windows/
├── apps/
│   ├── cli/                    CLI 调试入口
│   └── desktop/                Electron 桌面端
│       ├── src/main/           主进程（IPC、pipe server、模型提供者）
│       ├── src/preload/        预加载层（contextBridge API）
│       └── src/renderer/       渲染界面（解释结果展示）
├── integrations/
│   └── autohotkey/             AHK 热键脚本
├── packages/
│   ├── contracts/              类型定义和数据契约
│   └── explainer-core/         解释核心（验证、提示词、模型接口）
├── launch.ahk                  一键启动脚本
├── pipe-client.js              管道客户端（AHK → Electron 桥梁）
└── docs/                       架构文档和工作计划
```

## 关键文件说明

| 文件 | 作用 |
|------|------|
| `launch.ahk` | 一键启动 Electron + 热键 |
| `integrations/autohotkey/code-explainer.ahk` | 全局热键 `Ctrl+Alt+\`，捕获选中代码并通过 pipe 发送 |
| `pipe-client.js` | 独立 Node.js 脚本，从 stdin 读取代码，通过 named pipe 发送给 Electron |
| `apps/desktop/src/main/selection-server.ts` | Named pipe 服务端，接收 AHK 发来的代码 |
| `apps/desktop/src/main/index.ts` | Electron 主进程入口，连接 pipe server、API provider、IPC handler |
| `.env` | API 密钥和模型配置（不纳入版本管理） |
| `.pipe-token` | 会话 token，每次 Electron 启动时生成（不纳入版本管理） |

## 开发

```bash
# 启动开发模式
cd apps/desktop
npm run dev

# 类型检查
npm run typecheck

# 编译 pipe-client（每次 dev build 后需重新执行）
npx esbuild src/main/pipe-client.ts --bundle --platform=node --target=node18 --outfile=../../pipe-client.js
```

## 常见问题

### 热键无反应
- 运行目录内 `launch-debug.ahk`，看卡在哪一步
- 确认 AHK 脚本正在运行（系统托盘应有 AHK 图标）
- 确认已选中文本（非空白区域）
- 重新加载 AHK：双击 `code-explainer.ahk`


### 窗口弹出但提示 API 错误
- 检查 `.env` 中 API Key 是否正确
- 运行 `curl` 测试 API 连通性：
  ```bash
  curl ${OPENAI_BASE_URL}/chat/completions \
    -H "Authorization: Bearer 你的Key" \
    -H "Content-Type: application/json" \
    -d '{"model":"你的模型名称","messages":[{"role":"user","content":"hi"}]}'
  ```

### 端口被占用
- 关闭之前的 Electron 进程或等待旧端口释放
- 开发模式会自动尝试递增端口号（5173 → 5174 → 5175…）