# monitor-test

monitor-test 是 EzMonitor SDK 的测试门户应用，不是单一 demo 页面。

## 目标

- 提供统一测试主页
- 通过路由进入专项测试页
- 在不入侵业务代码的前提下验证 SDK 现有能力

## 路由清单

- `/`：测试主页
- `/tracking`：TrackingPlugin（track / trackPage / trackUser）
- `/performance`：性能测试首版（long task 模拟）
- `/error`：错误测试首版（JS/Promise/资源错误）

## 运行

```bash
pnpm install
pnpm --filter monitor-test run dev
```

## 验收步骤

1. 打开主页，确认可跳转到三个专题页。
2. 在 tracking 页分别触发 track、trackPage、trackUser，确认页面日志有回显。
3. 在 performance 页触发 long task，确认耗时显示并触发事件上报。
4. 在 error 页触发三类错误，确认错误回显区域可见记录。
5. 运行构建与 lint：

```bash
pnpm --filter monitor-test run build
pnpm --filter monitor-test run lint
```

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
