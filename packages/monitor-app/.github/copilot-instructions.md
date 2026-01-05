# EzMonitor Monitor-App AI 指南

## 项目上下文
本应用是 EzMonitor Monorepo 的一部分（pnpm workspaces + Turbo），位于 `packages/monitor-app/`。Monorepo 包含：
- **monitor-app**（本项目）：Next.js 16 演示与看板应用
- **monitor-sdk**：旧版 SDK（v1.0.0）
- **monitor-sdkv2**：当前模块化 SDK（v0.1.0），本应用集成此版本
- **docs/**：VitePress 文档站点

## 架构与路由
- **框架栈**：Next.js 16 App Router + React 19 + Tailwind v4 + shadcn/ui
- **根布局**：[app/layout.tsx](../app/layout.tsx) 注入 Geist 字体、全局样式、Navigation 与 AppProviders（SessionProvider + MonitorProvider）
- **路由分组**：
  - `(main)/`：公开落地页 [app/page.tsx](../app/page.tsx)
  - `(auth)/`：独立认证布局（app/(auth)/layout.tsx），包含登录页 app/(auth)/login/page.tsx
  - `(protected)/`：受保护页（app/(protected)/layout.tsx 注入 [AuthGuard](../components/auth-guard.tsx)），包含 /dashboard、/demo

## 认证与授权
- **实现**：NextAuth v4 GitHub Provider，配置在 [lib/auth.ts](../lib/auth.ts)，API 路由 app/api/auth/[...nextauth]/route.ts
- **会话**：JWT 策略，signIn/error 页均指向根路径
- **登录流程**：app/(auth)/login/page.tsx 使用 signIn('github')，支持 ?redirect= 查询参数（默认 /dashboard）
- **保护机制**：[AuthGuard](../components/auth-guard.tsx) 在 loading 时显示提示，未认证时显示 toast 并在 2s 后重定向到 /login?redirect=...
- **必需环境变量**：GITHUB_ID、GITHUB_SECRET、NEXTAUTH_SECRET

## Monitor SDK 集成（v2）
- **SDK 封装**：[lib/monitor.ts](../lib/monitor.ts) 提供 initMonitorSDK、getMonitorSDK、getTrackingPlugin 三个导出函数
- **插件架构**：使用 monitor-sdkv2 的 createSDK + TrackingPlugin（autoTrackPage: true），全局单例避免重复实例化
- **配置默认值**：
  - appId: `NEXT_PUBLIC_MONITOR_APP_ID` || 'ezmonitor-app'
  - appVersion: `NEXT_PUBLIC_APP_VERSION` || '1.0.0'
  - reportUrl: `NEXT_PUBLIC_MONITOR_REPORT_URL` || '/api/monitor'（相对路径会在客户端归一化为绝对 URL）
  - debug: 仅在 development 环境开启
- **生命周期**：[components/monitor-provider.tsx](../components/monitor-provider.tsx) 在客户端 useEffect 中初始化（await init() + start()），组件卸载时调用 destroy()
- **使用注意**：所有监控调用仅限客户端，SSR/edge 环境不可用；埋点前需轮询 getTrackingPlugin() 判断 SDK 就绪状态

## 演示与测试（/demo）
- **位置**：app/(protected)/demo/page.tsx（'use client' 组件）
- **功能模块**：
  - 错误触发：JS Error、Promise Rejection、资源加载失败
  - 性能测试：阻塞主线程、批量 DOM 操作
  - 行为埋点：track 自定义事件、trackPage 页面浏览、trackUser 用户信息、表单提交模拟
  - SDK 信息：展示 getStatus/getSessionId/getConfig 的实时状态
- **日志面板**：右侧实时显示事件日志（带时间戳），clearLogs 按钮清空历史
- **就绪检测**：sdkReady 状态通过轮询 getMonitorSDK() 和 getTrackingPlugin() 确认，所有埋点依赖此标志

## 看板与数据（/dashboard）
- **位置**：app/(protected)/dashboard/page.tsx
- **数据源**：当前使用静态 mock 数组（指标卡、错误列表、性能 Core Web Vitals、用户行为统计）
- **替换策略**：对接真实 API 时保持 Card/Badge/Separator 布局结构，避免破坏样式一致性

## 样式与组件规范
- **UI 库**：components/ui/ 下的 shadcn 风格原子组件（button、card、badge、separator、avatar 等）
- **类名工具**：[lib/utils.ts](../lib/utils.ts) 的 cn 函数合并 Tailwind 类名
- **主题适配**：落地页与登录页已实现渐变背景和动效，新页面需保持暗色/浅色模式兼容性
- **导航更新**：新增顶级路由需同步 [components/navigation.tsx](../components/navigation.tsx) 的 navigation 数组，外链标记 external: true

## 开发工作流
- **本地开发**：`pnpm dev`（在 monitor-app/ 目录下）或根目录 `pnpm run dev:monitor-app`
- **构建部署**：`pnpm build && pnpm start`
- **代码检查**：`pnpm lint`（eslint-config-next）
- **Monorepo 构建**：根目录 `pnpm run build:all`（构建所有 workspace 包）
- **测试**：当前无自动化测试，通过演示页手动验证

## 已知问题与注意事项
- 演示路由实际为 /demo，旧 README 标注的 /test 已过时，更新文档时需同步路由与导航配置
- Navigation 组件基于 next-auth session 动态切换"登录/退出"，已登录时隐藏登录链接
- monitor-sdkv2 为 workspace 依赖，确保根目录已执行 `pnpm install` 并构建 SDK 包
