# monitor-test

monitor-test 是 EzMonitor SDK 的测试门户应用，不是单一 demo 页面。

## 目标

- 提供统一测试主页
- 通过路由进入专项测试页
- 在不入侵业务代码的前提下验证 SDK 现有能力

## 路由清单

- `/`：测试主页
- `/tracking`：TrackingPlugin（track / trackPage / trackUser）
- `/performance`：性能测试（long task、Navigation/Resource/User Timing，含 Core Web Vitals 自动采集）
- `/error`：错误测试（同步错误、Promise rejection、资源错误）
- `/data-generator`：批量数据生成器

## 运行

```bash
pnpm install
pnpm --filter monitor-test run dev
```

## 联调顺序

1. 启动 MongoDB
2. 启动 `monitor-node`
3. 启动本应用

默认上报地址为 `${VITE_API_URL || http://localhost:3000}/api/monitor/batch`，可通过 `VITE_MONITOR_REPORT_URL` 覆盖。

## 验收步骤

1. 打开主页，确认可跳转到所有专题页。
2. 在 tracking 页分别触发 track、trackPage、trackUser，确认页面日志有回显。
3. 在 performance 页触发 long task，确认耗时显示并触发事件上报。
4. 在 error 页触发三类错误，确认错误回显区域可见记录。
5. 运行构建与 lint：

```bash
pnpm --filter monitor-test run build
pnpm --filter monitor-test run lint
```

## 上报地址

- 默认：`${VITE_API_URL || http://localhost:3000}/api/monitor/batch`
- 覆盖：设置 `VITE_MONITOR_REPORT_URL`

## 排查

- **没有数据上报**：确认 `monitor-node` 已启动且 `VITE_MONITOR_REPORT_URL` 指向正确。
- **跨域失败**：确认前端端口在后端 CORS 白名单中。
- **端口冲突**：如果 `monitor-app` 同时运行，Vite 可能自动切换到 `5174`。

## 目录结构

```text
src/
  hooks/useMonitorSDK.ts
  services/sdkRuntime.ts
  pages/HomePage.tsx
  pages/TrackingPage.tsx
  pages/PerformancePage.tsx
  pages/ErrorPage.tsx
  pages/NotFoundPage.tsx
```
