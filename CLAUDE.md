# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 重要规则

**始终使用中文回复** - 除非用户明确要求使用英文，否则请全程使用中文与用户交流。

## 项目概述

EzMonitor 是一个基于 TypeScript 构建的全面前端监控 SDK，采用 Monorepo 架构，使用 pnpm workspaces 和 Turbo 进行构建编排。项目提供实时性能监控、错误跟踪、用户行为分析和异常检测功能。

## 架构设计

### 仓库结构
- **packages/monitor-app**: Next.js 16 Web 应用程序（仪表板/演示界面）
- **packages/monitor-sdk**: 旧版 SDK 库（v1.0.0）具有监控功能
- **packages/monitor-sdkv2**: 当前模块化 TypeScript SDK（v0.1.0）具有插件架构
- **docs/**: VitePress 文档站点，包含全面的中文指南

### 监控应用架构（`packages/monitor-app/`）

Next.js 16 应用程序，使用 App Router：
- **身份验证**: NextAuth v4 基于会话的认证
- **UI 框架**: React 19 + TailwindCSS v4 + shadcn/ui 组件
- **路由系统**: App Router 分组路由：
  - `(auth)/`: 身份验证页面
  - `(main)/`: 公开落地页
  - `(protected)/`: 需要身份验证的仪表板和演示页面
- **SDK 集成**: 仅在客户端初始化，通过 MonitorProvider

### 旧版 SDK 架构（`packages/monitor-sdk/src/`）

旧版 SDK 采用基于插件的架构，包含四个主要监控模块：

1. **错误模块**（`plugins/error/`）：捕获 JavaScript 错误、Promise 拒绝、资源加载失败和框架特定错误（React ErrorBoundary、Vue errorHandler）

2. **性能模块**（`plugins/performance/`）：收集核心 Web 指标（FP、FCP、LCP）、资源加载指标和 API 性能数据

3. **行为模块**（`plugins/behavior/`）：跟踪用户交互、页面浏览、路由变化，并使用 rrweb 提供屏幕录制功能

4. **异常模块**（`plugins/exception/`）：检测页面异常，如白屏、卡顿和崩溃

### 现行 SDK 架构（`packages/monitor-sdkv2/src/`）

现代化 SDK 采用模块化架构：
- **核心系统**（`core/`）：SDKCore、PluginManager 和 Reporter，具有多种传输策略
- **传输层**（`core/transports/`）：Beacon、XHR 和 Image 传输实现
- **插件系统**（`plugins/`）：可扩展的插件架构，包含跟踪和示例实现
- **类型安全**（`types/`）：所有 SDK 组件的全面 TypeScript 定义

### 数据流架构

SDK 使用精密的数据管道：

1. **收集层**：每个插件模块收集特定的遥测数据
2. **处理层**：`src/common/` 中的通用工具处理数据标准化和过滤
3. **存储层**：缓存系统（`src/common/cache.ts`）管理本地数据缓冲
4. **上报层**：智能上传器（`src/common/report.ts`）支持多种传输方式：
   - **sendBeacon**：用于小载荷（<60KB）和保证交付
   - **XHR**：用于较大载荷或需要显式控制时
   - **Image 请求**：用于微小载荷（<2KB）作为备选

### 类型系统

`src/types/index.ts` 中的全面 TypeScript 定义包括：
- 配置接口（`ConfigType`）
- 性能指标（`PerformanceResourceType`、`PaintType`）
- 错误结构（`JsErrorType`、`PromiseErrorType`、`VueErrorType`、`ReactErrorType`）
- 行为跟踪（`PvInfoType`、`RouterChangeType`、`TargetInfoType`）
- 异常检测（`whiteScreenType`、`stutterStype`、`CrashType`）

## 常用命令

### 首次设置
```bash
# 1. 安装依赖
pnpm install

# 2. 构建所有 SDK 包（必需，因为 monitor-app 依赖 workspace 包）
pnpm run build:all

# 3. 配置环境变量（monitor-app 需要）
# 复制 packages/monitor-app/.env.local.example 到 .env.local
# 设置以下变量：
# - GITHUB_ID, GITHUB_SECRET (GitHub OAuth App)
# - NEXTAUTH_SECRET (运行 `openssl rand -base64 32` 生成)
# - NEXTAUTH_URL (默认 http://localhost:3000)
```

### 开发环境
```bash
# 启动 Next.js 应用程序（需先构建 SDK）
pnpm run dev:monitor-app

# 启动文档站点
pnpm run docs:dev

# 单个包开发（在对应目录下）
cd packages/monitor-app && pnpm dev
cd packages/monitor-sdk && pnpm build --watch
cd packages/monitor-sdkv2 && pnpm build
```

### 构建
```bash
# 构建所有包（使用 Turbo 并行构建）
pnpm run build:all

# 构建单个 SDK
pnpm run dev:monitor-sdk          # 旧版 SDK
cd packages/monitor-sdkv2 && pnpm build  # v2 SDK

# 构建 Next.js 应用
cd packages/monitor-app && pnpm build

# 构建文档
pnpm run docs:build
```

### 版本发布（仅针对 monitor-sdkv2）
```bash
# 1. 添加 changeset（交互式选择变更类型）
pnpm changeset:add

# 2. 查看待发布状态
pnpm changeset:status

# 3. 生成版本号并更新 CHANGELOG
pnpm changeset:version

# 4. 构建并发布到 npm
pnpm changeset:publish

# 或使用一键发布（包含版本号生成和发布）
pnpm release
```

### 代码质量
```bash
# 检查所有代码
pnpm run lint

# 标准化提交（使用 commitizen + cz-git）
pnpm run commit
```

### 包依赖关系
```
monitor-sdkv2 (独立) → monitor-app (依赖 workspace:*)
monitor-sdk (独立，旧版)
docs (独立)
```

## 关键配置

### Monitor App 环境变量（`packages/monitor-app/.env.local`）
必需的环境变量：
```bash
# NextAuth 配置
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here  # 使用 openssl rand -base64 32 生成

# GitHub OAuth（https://github.com/settings/developers 创建应用）
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret

# 可选：Monitor SDK 配置
NEXT_PUBLIC_MONITOR_APP_ID=ezmonitor-app       # 默认值
NEXT_PUBLIC_APP_VERSION=1.0.0                  # 默认值
NEXT_PUBLIC_MONITOR_REPORT_URL=/api/monitor    # 默认值，相对路径会自动归一化
```

**认证流程**：
- `lib/auth.ts` 配置 NextAuth v4，使用 JWT 策略
- `components/auth-guard.tsx` 在 `(protected)/` 路由中保护页面
- 未认证用户会被重定向到 `/login?redirect=...`
- 登录后自动返回原页面

**Monitor SDK 集成**：
- `lib/monitor.ts` 封装 SDK 初始化逻辑（单例模式）
- `components/monitor-provider.tsx` 在客户端 useEffect 中初始化
- `/demo` 页面提供完整的错误、性能、行为埋点测试
- SDK 仅在客户端运行，SSR/Edge 环境不可用

### SDK 配置（`packages/monitor-sdk/src/common/config.ts`）
旧版 SDK 默认配置：
- `url`: 上报端点
- `batchSize`: 5（批量上报阈值）
- `isAjax`: false（默认使用 sendBeacon）
- `containerElements`: ['html', 'body', '#app', '#root']
- 回调钩子：`reportBefore`、`reportAfter`、`reportSuccess`、`reportFail`

### SDK v2 配置（`packages/monitor-sdkv2`）
现代化 SDK 配置：
- **插件架构**：使用 `createSDK` 和 `PluginManager`
- **传输策略**：BeaconTransport、XHRTransport、ImageTransport 自动选择
- **批量上报**：BatchBuffer 和 ReportQueue 管理队列
- **重试机制**：RetryScheduler 处理失败重试
- **类型安全**：完整的 TypeScript 类型定义

### 构建系统
- **Rollup** 用于 SDK 打包（ESM + CJS 双输出）
- **Next.js 16** 用于 monitor-app（App Router + React 19）
- **VitePress** 用于文档站点
- **Turbo** 用于 monorepo 构建编排（并行任务和增量缓存）

### 代码标准
- **ESLint** 支持 TypeScript，启用 JSX
- **Commitlint** 具有常规提交和表情符号支持（参见 commitlint.config.js）
- **Prettier** 用于代码格式化
- **Husky** + **lint-staged** 用于提交前钩子
- **Changesets** 用于版本管理和发布（仅 monitor-sdkv2）

## 使用 SDK

### 为 monitor-sdk（旧版）添加新功能
1. 在适当的 `plugins/` 子目录中创建插件（error/performance/behavior/exception）
2. 在 `src/types/index.ts` 中定义 TypeScript 接口
3. 在 `src/common/enum.ts` 中添加跟踪类型枚举
4. 从主 `src/index.ts` 导出功能

### 为 monitor-sdkv2 添加新插件
1. 在 `packages/monitor-sdkv2/src/plugins/` 创建新插件文件
2. 实现 `Plugin` 接口（name, version, install, start, destroy）
3. 在 `src/index.ts` 中导出插件
4. 参考 `plugins/tracking/TrackingPlugin.ts` 作为示例

### 数据上报管道

**旧版 SDK**（monitor-sdk）：
- 所有监控数据通过 `src/common/report.ts` 中的 `lazyReportBatch()` 流转
- 根据载荷大小自动选择传输方式：
  - `<2KB`: Image 请求
  - `<60KB`: sendBeacon
  - `>60KB`: XHR
- 批处理和空闲时间上报优化性能
- 支持重试逻辑和回调钩子（reportBefore, reportAfter, reportSuccess, reportFail）

**新版 SDK**（monitor-sdkv2）：
- 使用 `Reporter` 和传输策略模式（`core/transports/`）
- `BatchBuffer` 管理批量队列
- `RetryScheduler` 处理失败重试
- `EventBus` 用于插件间通信

### 框架集成

**旧版 SDK**：
- **React**：使用 `Error.ErrorBoundary` 组件作为错误边界
- **Vue**：将 `Error.initVueError` 设置为全局错误处理器
- **原生 JS**：调用 `Error.initErrorEventListener()` 进行全局错误捕获

**新版 SDK**：
- 使用 `createSDK` 创建 SDK 实例
- 通过 `PluginManager` 注册插件
- 调用 `init()` 和 `start()` 启动监控
- 在组件卸载时调用 `destroy()` 清理资源

## 测试和调试

### 手动测试流程
目前没有正式的自动化测试套件。可通过以下方式进行测试：

1. **构建 SDK**：
   ```bash
   pnpm run build:all
   ```

2. **启动演示应用**：
   ```bash
   pnpm run dev:monitor-app
   ```

3. **使用演示页面**（`http://localhost:3000/demo`）：
   - 触发 JavaScript 错误
   - 模拟 Promise 拒绝
   - 测试资源加载失败
   - 阻塞主线程测试性能监控
   - 批量 DOM 操作测试
   - 自定义埋点跟踪
   - 查看 SDK 状态信息

4. **检查控制台日志**：
   - 旧版 SDK：查找"埋点上报----"日志
   - 新版 SDK：查找 SDK 初始化和上报日志
   - 在 `debug: true` 模式下会有详细日志

### 调试技巧
- **开启 debug 模式**：在 SDK 配置中设置 `debug: true`
- **查看网络请求**：在浏览器 DevTools Network 面板查看上报请求
- **使用 React DevTools**：查看 MonitorProvider 和组件状态
- **断点调试**：在 `lib/monitor.ts` 和插件代码中设置断点

### 常见问题
- **SDK 未初始化**：确保先执行 `pnpm run build:all` 构建 workspace 包
- **认证失败**：检查 `.env.local` 中的 GitHub OAuth 配置
- **上报失败**：查看浏览器控制台错误，确认 reportUrl 配置正确

## 文档

`docs/使用文档/` 中的全面文档包括：
- 快速开始指南
- 单个监控模块（错误、性能、行为、异常）
- 数据上报策略
- 框架集成示例