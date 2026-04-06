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

本项目通过 Vite `envDir=../../` 读取仓库根目录环境变量，建议统一在根目录 `.env` 维护。

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

## SourceMap 定位验证

要看到 SourceMap 定位效果，需要满足两个条件：

1. 错误上报里包含 `release`（默认 `monitor-test-local`，可通过 `VITE_MONITOR_RELEASE` 覆盖）。
2. 对应 release 的 `.map` 文件已上传到 `monitor-node`。

本项目已在构建阶段自动上传 sourcemap（低侵入，不需要业务页面或运行时代码改造）。
自动上传触发条件：

- 执行 `pnpm --filter monitor-test run build`
- 环境变量中存在 `MONITOR_SOURCEMAP_UPLOAD_KEY`
- 默认上传失败不会中断构建；如需强制失败，可设置 `MONITOR_SOURCEMAP_STRICT=true`

另外请注意：

- 在 `vite dev` 下报错堆栈通常已经是源码路径（如 `src/pages/*.tsx`），不属于压缩产物反解场景。
- 建议使用 `build + preview` 场景验证 SourceMap（堆栈会指向 `dist/assets/*.js`）。

示例流程：

```bash
# 1) 配置上传密钥（写在 root .env/.env.local 或 app/monitor-node/.env 也可）
# set MONITOR_SOURCEMAP_UPLOAD_KEY=your_key
# set MONITOR_RELEASE=monitor-test-local

# 2) 生成带 sourcemap 的构建产物（构建完成后自动上传）
pnpm --filter monitor-test run build

# 3) 启动 preview 后触发错误（而不是 vite dev）
pnpm --filter monitor-test run preview
```

上传成功后，触发一次错误并在 `monitor-app` 错误详情查看：
- `定位状态`（symbolicated/partial/failed/skipped）
- `sourcemap (mapped frames)` 是否出现源码文件与行列号

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
