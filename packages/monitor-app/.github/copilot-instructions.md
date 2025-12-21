# EzMonitor AI 指南

- **架构总览**
  - Next.js 16（App Router）+ Tailwind v4；全局布局在 app/layout.tsx，包裹 Navigation 与 MonitorProvider。
  - 主要页面：落地页 app/page.tsx；看板 app/dashboard/page.tsx（当前为静态 mock 数据）；SDK 演示页 app/demo/page.tsx（client 组件）。
  - UI 基础组件位于 components/ui/（shadcn 风格）；导航栏 components/navigation.tsx 使用 usePathname 计算激活态。
- **Monitor SDK 生命周期**
  - SDK 集中封装于 lib/monitor.ts（createSDK + TrackingPlugin）；请使用 initMonitorSDK/getMonitorSDK/getTrackingPlugin，避免重复实例化。
  - MonitorProvider（components/monitor-provider.tsx）仅在客户端初始化 SDK，卸载时销毁实例，勿在 SSR/edge 调用。
  - 环境变量默认值：NEXT_PUBLIC_MONITOR_APP_ID=ezmonitor-app，NEXT_PUBLIC_APP_VERSION=1.0.0，NEXT_PUBLIC_MONITOR_REPORT_URL=/api/monitor；开发模式自动开启 debug。
  - TrackingPlugin 自动页面埋点；demo 页通过 getTrackingPlugin 统一调用 track/trackPage/trackUser，勿新建插件以免重复。
- **演示/测试流程（app/demo/page.tsx）**
  - 错误触发：JS 错误、Promise 错误、资源加载错误按钮。
  - 性能压力：阻塞循环、批量 DOM 操作。
  - 行为埋点：自定义事件、页面浏览、用户信息、表单提交；右侧事件日志面板就地输出。
  - SDK 信息按钮展示状态、Session、配置；页面声明 'use client'，保持仅客户端运行。
- **看板与数据**
  - 看板当前使用本地静态数组（指标/错误/行为），后续可替换为真实 API；保持 Card/Badge/Separator 结构以符合现有样式。
- **样式与组件**
  - 采用 Tailwind 实用类与暗色变体，落地页含渐变与动效；合并类名使用 lib/utils.ts 的 cn；优先复用 components/ui/ 组件，不要手写临时样式组件。
- **导航约定**
  - 新增顶级路由请更新 components/navigation.tsx 的 navigation 数组；外链标记 external: true 以添加 target/rel。
- **开发流程与命令**
  - 安装：pnpm install；开发：pnpm dev；生产：pnpm build && pnpm start；Lint：pnpm lint（eslint-config-next）。当前无测试用例。
- **注意事项**
  - SDK 仅应在客户端初始化，避免在服务器环境调用 initMonitorSDK；全局仅挂载一个 MonitorProvider。
  - README 标注 /test，但实际路由为 /demo，新增/改名时注意文档与路由同步。
  - @ezstars/monitor-sdkv2 为 workspace 占位依赖，落地运行前确认依赖可用。

如需补充更细的 SDK 线索、数据接入方式或样式规范，请告知，我会完善本指南。
