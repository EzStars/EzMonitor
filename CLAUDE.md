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

### 开发环境
```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm run build:all

# 开发服务器
pnpm run dev:monitor-app    # 启动 Next.js 应用程序
pnpm run docs:dev          # 启动文档站点

# 单个包开发
cd packages/monitor-app && pnpm dev
```

### 构建
```bash
# 仅构建 SDK
cd packages/monitor-sdk && pnpm run build

# 构建文档
pnpm run docs:build
```

### 代码质量
```bash
# 检查所有代码
pnpm run lint

# 标准化提交（使用 commitizen + cz-git）
pnpm run commit
```

## 关键配置

### SDK 配置（`packages/monitor-sdk/src/common/config.ts`）
默认配置包括：
- `url`: 上报端点
- `batchSize`: 5（批量上报阈值）
- `isAjax`: false（默认使用 sendBeacon）
- `containerElements`: ['html', 'body', '#app', '#root']
- 回调钩子：`reportBefore`、`reportAfter`、`reportSuccess`、`reportFail`

### 构建系统
- **Rollup** 用于旧版 SDK 打包（ESM + CJS 输出）
- **Next.js** 用于 monitor-app，具有 App Router 和 React 19
- **VitePress** 用于文档
- **Turbo** 用于 monorepo 构建编排

### 代码标准
- **ESLint** 支持 TypeScript，启用 JSX
- **Commitlint** 具有常规提交和表情符号支持
- **Prettier** 用于代码格式化
- **Husky** + **lint-staged** 用于提交前钩子

## 使用 SDK

### 添加新的监控功能
1. 在适当的 `plugins/` 子目录中创建插件
2. 在 `src/types/index.ts` 中定义 TypeScript 接口
3. 在 `src/common/enum.ts` 中添加跟踪类型
4. 从主 `src/index.ts` 导出

### 数据上报管道
所有监控数据都通过 `src/common/report.ts` 中的 `lazyReportBatch()` 流转：
- 根据载荷大小自动选择最优传输方式
- 为性能实现批处理和空闲时间上报
- 支持重试逻辑和回调钩子

### 框架集成
- **React**：使用 `Error.ErrorBoundary` 组件作为错误边界
- **Vue**：将 `Error.initVueError` 设置为全局错误处理器
- **原生 JS**：调用 `Error.initErrorEventListener()` 进行全局错误捕获

## 测试和调试

目前没有正式的测试套件。可通过以下方式进行测试：
1. 构建 SDK：`pnpm run build:all`
2. 运行 Web 演示：`pnpm run dev:monitor-app`
3. 检查浏览器控制台中的“埋点上报----”日志

## 文档

`docs/使用文档/` 中的全面文档包括：
- 快速开始指南
- 单个监控模块（错误、性能、行为、异常）
- 数据上报策略
- 框架集成示例