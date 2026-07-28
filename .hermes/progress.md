# 开发进度

> 自动生成，每个 Phase 完成后更新。

## Phase 0: Repository baseline ✅

**完成时间**: 2026-07-28

### 验收结果
- ✅ `npm install` 成功（Electron 需设 `ELECTRON_MIRROR` 镜像）
- ✅ `npm run typecheck` 所有 4 个 workspace 通过

### 改动
- `apps/desktop/tsconfig.json`: 添加 `skipLibCheck: true` 解决 Electron 与 `@types/node` 类型冲突
- 依赖已安装：electron 33.2.1, electron-vite 2.3.0, tsx 4.19.2, typescript 5.7.3

---

## Phase 1: Selection to window ✅

**完成时间**: 2026-07-28

### 验收结果
- ✅ `npm run typecheck` 全过
- ✅ `npm --workspace @code-explainer/desktop run build` 构建成功

### 新增/修改文件

| 文件 | 说明 |
|------|------|
| `apps/desktop/src/main/selection-server.ts` | Windows named-pipe 服务端，随机 token 认证，128KB 上限 |
| `apps/desktop/src/main/pipe-client.ts` | stdin → pipe 客户端，供 AHK 调用 |
| `apps/desktop/src/main/index.ts` | 集成 SelectionServer，选区通过 IPC 转发到渲染层 |
| `apps/desktop/src/preload/index.ts` | 暴露 `onSelectionReceived` 监听 |
| `apps/desktop/src/renderer/index.ts` | 渲染层：接收选区、调用 explain、展示结果 |
| `apps/desktop/src/renderer/index.html` | 深色主题 UI：placeholder → 代码卡片 → 解释结果 |
| `integrations/autohotkey/code-explainer.ahk` | 改写为 stdin → pipe-client 流程 |
| `apps/desktop/tsconfig.json` | 加 `skipLibCheck` |

---

## Phase 2: Explanation MVP ✅

**完成时间**: 2026-07-28

### 验收结果
- ✅ `npm run typecheck` 全过
- ✅ `npm --workspace @code-explainer/desktop run build` 构建成功

### 新增/修改文件

| 文件 | 说明 |
|------|------|
| `packages/explainer-core/src/providers/openai.ts` | OpenAI 兼容 provider：fetch + 45s 超时 + JSON 解析 fallback |
| `apps/desktop/src/main/env-loader.ts` | 独立 .env 加载器（electron-vite 不处理 process.env） |
| `apps/desktop/src/main/index.ts` | initProvider() 读 .env 初始化 OpenAiProvider |
| `electron.vite.config.ts` | 精简配置，env 由 env-loader 处理 |

### 架构要点
- Provider 通过 `ExplainerProvider` 接口注入，后续可换 DeepSeek/本地模型
- 模型要求返回结构化 JSON（summary/details/risks/followUps），解析失败则整段当 details
- API key 从项目根 `.env` 读取，生产环境计划迁移到 Windows Credential Manager

---

## Phase 3: Product hardening

⏳ 待开始

---

## Phase 4: Windows distribution

⏳ 待开始

---

## Phase 5: Optional right-click integrations

⏳ 待开始