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
│   └── monitor-app/     # Next.js 演示应用
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

## 🛠️ 开发

### 环境要求

- Node.js >= 20（推荐 22 LTS）
- pnpm >= 10

### 快速启动（推荐）

```bash
# 安装依赖
pnpm install

# 启动演示应用（Next.js）
pnpm run dev:monitor-app
```

启动后访问：`http://localhost:3000`

### 常用开发命令

```bash
# 构建整个仓库（turbo）
pnpm run build:all

# 构建 SDK v2
pnpm --filter @ezstars/monitor-sdkv2 run build

# SDK v2 watch 模式
pnpm --filter @ezstars/monitor-sdkv2 run dev

# 运行测试
pnpm test

# 代码检查
pnpm lint

# 运行文档网站
pnpm run docs:dev
```

### 常见问题

- 端口占用：如果 `3000` 端口被占用，Next.js 会自动切换到其他端口，启动日志里会显示实际地址。
- 首次安装较慢：`monitor-sdkv2` 的 `prepare` 会自动构建一次 SDK，属于正常现象。
- Next.js 告警：`images.domains` 废弃和 `baseline-browser-mapping` 过期提示不会阻塞开发启动。

### 构建

```bash
# 构建 SDK
pnpm run build:all

# 构建文档
pnpm run docs:build
```

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
