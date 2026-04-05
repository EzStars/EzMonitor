# EzMonitor SDK

🚀 轻量级前端监控 SDK，提供全方位的性能监控、错误捕获和用户行为分析解决方案。

[![npm version](https://img.shields.io/npm/v/@ezstars/monitor-sdk.svg)](https://www.npmjs.com/package/@ezstars/monitor-sdk)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## ✨ 功能特性

### 🎯 错误监控
- **JavaScript 异常捕获**: 自动捕获运行时 JS 错误和堆栈信息
- **Promise 异常监控**: 捕获未处理的 Promise rejection
- **资源加载错误**: 监控图片、脚本、样式等资源加载失败
- **跨域脚本错误**: 处理第三方脚本错误
- **框架集成**: 支持 React ErrorBoundary 和 Vue errorHandler

### 📊 性能监控
- **核心性能指标**: FP、FCP、LCP 等关键指标
- **资源加载性能**: DNS、TCP、TTFB、传输时间等详细指标
- **页面加载性能**: 完整的页面加载时序分析
- **接口性能监控**: HTTP 请求耗时和状态监控

### 👤 用户行为分析
- **点击行为追踪**: 记录用户点击操作和路径
- **页面访问分析**: PV/UV 统计
- **路由跳转监控**: SPA 路由变化追踪
- **录屏回放**: 基于 rrweb 的错误现场重现
- **自定义埋点**: 灵活的事件追踪能力

### 🛡️ 异常检测
- **白屏检测**: 智能判断页面白屏异常
- **卡顿监控**: 页面性能异常检测
- **崩溃监控**: 页面崩溃异常捕获

### 📤 数据上报
- **批量上报**: 减少网络请求，提升性能
- **失败重试**: 确保数据可靠上报
- **数据压缩**: 支持数据压缩减少传输开销
- **上报策略**: 支持立即上报和延迟上报
- **离线缓存**: LocalStorage 持久化，离线数据自动恢复 ⭐ 新增
- **智能恢复**: 网络恢复时自动上报离线数据 ⭐ 新增

## 📦 安装

```bash
# npm
npm install @ezstars/monitor-sdk

# pnpm
pnpm add @ezstars/monitor-sdk

# yarn
yarn add @ezstars/monitor-sdk
```

> 注意：当前版本还在开发完善中，暂未正式发布到 npm

## 🚀 快速开始

### 基础使用

```typescript
import EzMonitor from '@ezstars/monitor-sdk'

// 初始化配置
EzMonitor.init({
  url: 'https://your-api.com/monitor', // 上报地址
  projectName: 'your-project', // 项目名称
  appId: 'your-app-id', // 应用 ID
  userId: 'user-123', // 用户 ID
  batchSize: 5, // 批量上报大小
  isAjax: false, // 是否启用 Ajax 监控
  containerElements: ['html', 'body', '#app'], // 容器元素
  skeletonElements: [] // 骨架屏元素
})

// 启动各个监控模块
EzMonitor.Performance() // 性能监控
EzMonitor.Error.initErrorEventListener() // 错误监控
EzMonitor.Behavior() // 行为监控
EzMonitor.Exception() // 异常监控
```

### React 集成

```tsx
import EzMonitor from '@ezstars/monitor-sdk'

// 使用 React ErrorBoundary
function App() {
  return (
    <EzMonitor.Error.ErrorBoundary
      fallback={<div>Something went wrong.</div>}
    >
      <YourComponent />
    </EzMonitor.Error.ErrorBoundary>
  )
}
```

### Vue 集成

```javascript
import EzMonitor from '@ezstars/monitor-sdk'

// Vue 2
Vue.config.errorHandler = EzMonitor.Error.initVueError

// Vue 3
const app = createApp(App)
app.config.errorHandler = EzMonitor.Error.initVueError
```

### 自定义埋点

```javascript
import EzMonitor, { getBehaviour } from '@ezstars/monitor-sdk'

// 获取行为实例
const behavior = getBehaviour()

// 自定义事件上报
behavior.customHandler({
  eventKey: 'button_click',
  eventAction: 'click',
  eventValue: 'homepage_banner'
})
```

## 🏗️ 项目架构

EzMonitor 采用 **Monorepo** 架构和模块化设计：

```
EzMonitor/
├── packages/
│   ├── monitor-sdkv2/   # 核心 SDK 包（TypeScript，插件化架构）
│   │   ├── src/
│   │   │   ├── core/            # 内核：事件总线、插件管理、上报器
│   │   │   ├── plugins/         # 官方插件（如 tracking）
│   │   │   └── types/           # TypeScript 类型定义
│   │   └── package.json
│   └── monitor-app/     # React/Vite 监控看板应用
├── docs/                # 项目文档
└── package.json
```

### 核心模块

- **采集层**: 各种监控插件负责数据采集
- **处理层**: 数据标准化、过滤和采样
- **存储层**: 本地缓存和队列管理
- **上报层**: 批量上报和失败重试

## ⚙️ 配置选项

```typescript
interface ConfigType {
  url: string // 上报接口地址
  projectName: string // 项目名称
  appId: string // 应用唯一标识
  userId: string // 用户唯一标识
  batchSize: number // 批量上报条数，默认 5
  isAjax: boolean // 是否监控 Ajax 请求，默认 false
  containerElements: string[] // 页面容器元素选择器
  skeletonElements: string[] // 骨架屏元素选择器
  reportBefore?: Function // 上报前钩子函数
  reportAfter?: Function // 上报后钩子函数
  reportSuccess?: Function // 上报成功钩子函数
  reportFail?: Function // 上报失败钩子函数
  // 缓存配置（新增）
  enableLocalStorage?: boolean // 是否启用 LocalStorage 持久化，默认 true
  localStorageKey?: string // LocalStorage 存储键名，默认 'ez_monitor_cache'
  maxCacheSize?: number // 最大缓存条数，默认 100
  cacheExpireTime?: number // 缓存过期时间（毫秒），默认 24小时
}
```

## 🛠️ 本地联调与部署指南

### 环境要求

- Node.js >= 20（推荐 22 LTS）
- pnpm >= 10
- 本地 MongoDB 可访问

### 三端启动顺序

1. **MongoDB**
   - 先确认数据库服务可连接。
2. **后端 `monitor-node`**
   - 负责接收埋点、写入 MongoDB、提供聚合查询接口。
3. **前端 `monitor-test` / `monitor-app`**
   - `monitor-test` 用于上报联调与数据生成。
   - `monitor-app` 用于查看监控数据看板。

> 如果同时启动两个前端，Vite 可能自动切到 `5174`；以启动日志里的实际端口为准。

### 环境变量说明

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://localhost:27017/ezmonitor` | 后端 MongoDB 连接串 |
| `PORT` | `3001` | 后端服务端口 |
| `NODE_ENV` | `development` | 后端运行环境 |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:5174` | 允许的前端来源（当前代码里固定允许 5173/5174，若改端口需同步调整后端 CORS） |
| `VITE_API_URL` | `http://localhost:3001` | `monitor-app` 查询后端的基础地址 |
| `VITE_MONITOR_REPORT_URL` | `http://localhost:3001/api/monitor/batch` | `monitor-test` 的上报地址 |

### 启动步骤

```bash
pnpm install

# 1) 启动后端
pnpm --filter monitor-node run start:dev

# 2) 启动联调前端（按需选择）
pnpm --filter monitor-test run dev
pnpm --filter monitor-app run dev
```

### 端到端验证步骤

1. 打开 `monitor-test`，确认首页可正常加载。
2. 依次进入 `tracking`、`performance`、`error` 页面，触发一次埋点、一次性能事件和一次错误事件。
3. 检查浏览器 Network / 控制台，确认请求已发送到 `monitor-node`。
4. 打开 `monitor-app`，确认列表和统计面板能查到刚写入的数据。
5. 如有需要，可直接在 MongoDB 中确认数据已落库。

### 常用开发命令

```bash
pnpm run build:all
pnpm --filter @ezstars/monitor-sdkv2 run build
pnpm --filter @ezstars/monitor-sdkv2 run dev
pnpm test
pnpm lint
pnpm run docs:dev
pnpm run docs:build
```

### 常见问题排查

- **端口占用**：先看终端启动日志，前端可能自动切换端口；后端 `PORT` 冲突则手动换端口，并同步修改 `VITE_API_URL` / `VITE_MONITOR_REPORT_URL`。
- **MongoDB 未启动**：后端会连接失败或接口无数据；先确认 `MONGODB_URI` 指向的实例可访问。
- **跨域问题**：确认前端来源在后端 `app.enableCors(...)` 白名单内；如果前端使用了非 `5173/5174` 端口，需要同步更新后端 CORS。
- **首次安装较慢**：`monitor-sdkv2` 的 `prepare` 会先构建一次 SDK，属于正常现象。

## 📚 文档

完整的使用文档请访问：

- [快速开始](docs/使用文档/快速开始.md)
- [错误监控](docs/使用文档/错误监控/)
- [性能监控](docs/使用文档/性能监控/)
- [行为监控](docs/使用文档/行为监控/)
- [异常监控](docs/使用文档/异常监控/)
- [数据上报](docs/使用文档/数据上报/)

## 🤝 贡献

欢迎社区贡献代码！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

详细贡献指南请参考 [贡献文档](docs/贡献文档/index.md)

## 📄 License

本项目基于 [MIT](LICENSE) 协议开源

## 📞 技术支持

- 📧 邮箱: support@ezstars.com
- 🐛 问题反馈: [GitHub Issues](https://github.com/EzStars/EzMonitor/issues)
- 📖 文档网站: [https://ezstars.github.io/EzMonitor/](https://ezstars.github.io/EzMonitor/)

---

⭐ 如果这个项目对你有帮助，请给我们一个星标！
