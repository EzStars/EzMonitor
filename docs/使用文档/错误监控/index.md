# 错误监控

EzMonitor SDK 提供了全面的错误监控能力，能够捕获各类前端错误并上报到服务端。

## 📋 错误类型

- **[JS错误捕获](./JS错误捕获.md)** - JavaScript 运行时错误捕获
- **[Promise错误捕获](./promise错误捕获.md)** - Promise 未处理的错误捕获
- **[资源加载错误捕获](./资源加载错误捕获.md)** - 图片、脚本等资源加载失败监控
- **[React错误捕获](./react错误捕获.md)** - React ErrorBoundary 集成
- **[Vue错误捕获](./vue错误捕获.md)** - Vue errorHandler 集成
- **[SourceMap集成指南](./SourceMap集成指南.md)** - 使用 SourceMap 进行源码定位

## 🚀 快速开始

SDK 初始化后，错误监控会自动启动：

```typescript
import EzMonitor from '@ezstars/monitor-sdk'

EzMonitor.init({
  url: 'https://your-api.com/monitor',
  projectName: 'your-project',
  appId: 'your-app-id',
  userId: 'user-123',
})

// 错误监控已自动启用
EzMonitor.Error.initErrorEventListener()
```

## 🔍 错误上报

当发生错误时，SDK 会自动收集以下信息：

- 错误类型和消息
- 错误堆栈信息
- 错误发生的页面 URL
- 错误发生的时间戳
- 用户行为轨迹（面包屑）
- 屏幕录制数据（如果启用）

更多详细信息请查看各个子文档。
