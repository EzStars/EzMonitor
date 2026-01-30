# 自定义埋点插件使用指南

## 简介

自定义埋点插件 (`TrackingPlugin`) 是 EzMonitor SDK v2 的核心插件之一，专门用于收集和上报用户行为数据。它提供了灵活的埋点能力，支持事件埋点、页面埋点、用户埋点等多种场景。

## 功能特性

- **事件埋点**：自定义事件追踪，支持任意属性和上下文信息
- **页面埋点**：页面访问追踪，支持自动和手动两种模式
- **用户埋点**：用户行为和属性追踪
- **智能上下文**：自动收集页面、设备、网络等环境信息
- **批量上报**：智能批量处理，优化网络性能
- **离线缓存**：支持离线存储，网络恢复后自动同步
- **事件过滤**：支持自定义过滤规则
- **数据处理**：支持自定义数据预处理

## 快速开始

### 1. 基础使用

```typescript
import { createSDK, TrackingPlugin } from '@ezmonitor/sdkv2'

// 创建 SDK 实例
const sdk = createSDK({
  appId: 'your-app-id',
  apiUrl: 'https://your-api.com',
})

// 创建并注册埋点插件
const trackingPlugin = new TrackingPlugin({
  enableBatch: true,
  batchInterval: 5000, // 5秒批量上报
  batchSize: 20,
  autoTrackPage: true, // 启用自动页面追踪
})

sdk.pluginManager.register(trackingPlugin)

// 初始化和启动 SDK
await sdk.init()
await sdk.start()
```

### 2. 事件埋点

```typescript
// 基础事件埋点
trackingPlugin.track('button_click', {
  buttonName: '购买按钮',
  productId: '12345',
  price: 99.99,
})

// 带自定义上下文的事件埋点
trackingPlugin.track('form_submit', {
  formType: '注册表单',
  fields: ['username', 'email', 'password'],
}, {
  experimentId: 'A001',
  variant: 'control',
})
```

### 3. 页面埋点

```typescript
// 手动页面埋点
trackingPlugin.trackPage('/product/detail', {
  productId: '12345',
  category: 'electronics',
  source: 'search',
})

// 带页面属性的埋点
trackingPlugin.trackPage('/checkout', {
  step: 'payment',
  totalAmount: 299.99,
  itemCount: 3,
})
```

### 4. 用户埋点

```typescript
// 用户登录埋点
trackingPlugin.trackUser('user123', {
  email: 'user@example.com',
  plan: 'premium',
  registrationDate: '2024-01-01',
})

// 用户属性更新
trackingPlugin.trackUser('user123', {
  lastLoginTime: Date.now(),
  preferredLanguage: 'zh-CN',
})
```

## 高级配置

### 完整配置选项

```typescript
const trackingPlugin = new TrackingPlugin({
  // 批量上报配置
  enableBatch: true, // 启用批量上报
  batchInterval: 10000, // 批量间隔（毫秒）
  batchSize: 50, // 批量大小阈值

  // 页面追踪配置
  autoTrackPage: true, // 自动页面追踪

  // 离线缓存配置
  enableOfflineCache: true, // 启用离线缓存
  offlineCacheSize: 1000, // 缓存容量

  // 自定义处理器
  dataProcessor: (data) => {
    // 自定义数据预处理
    return {
      ...data,
      timestamp: Date.now(),
      version: '1.0.0',
    }
  },

  // 事件过滤器
  eventFilter: (eventName, properties) => {
    // 过滤调试事件
    return !eventName.startsWith('debug_')
  },
})
```

### 上下文管理

```typescript
// 设置全局上下文
trackingPlugin.setContext({
  userId: 'user123',
  experimentGroup: 'A',
  deviceType: 'mobile',
})

// 移除特定上下文
trackingPlugin.removeContext('experimentGroup')

// 清空所有自定义上下文
trackingPlugin.clearContext()
```

### 手动刷新

```typescript
// 立即上报所有缓存的事件
trackingPlugin.flush()
```

## 事件数据结构

### 事件埋点数据

```typescript
interface TrackingEventData {
  eventName: string // 事件名称
  properties?: Record<string, any> // 事件属性
  context?: TrackingContext // 上下文信息
  timestamp?: number // 时间戳
  sessionId?: string // 会话ID
  userId?: string // 用户ID
  appId?: string // 应用ID
}
```

### 页面埋点数据

```typescript
interface TrackingPageData {
  page: string // 页面路径
  properties?: Record<string, any> // 页面属性
  context?: TrackingContext // 上下文信息
  timestamp?: number // 时间戳
  sessionId?: string // 会话ID
  userId?: string // 用户ID
  appId?: string // 应用ID
}
```

### 用户埋点数据

```typescript
interface TrackingUserData {
  userId: string // 用户ID
  properties?: Record<string, any> // 用户属性
  timestamp?: number // 时间戳
  sessionId?: string // 会话ID
  appId?: string // 应用ID
}
```

### 上下文信息

```typescript
interface TrackingContext {
  page?: {
    url?: string // 页面URL
    title?: string // 页面标题
    referrer?: string // 来源页面
  }
  device?: {
    userAgent?: string // 用户代理
    screen?: { width: number, height: number } // 屏幕尺寸
    viewport?: { width: number, height: number } // 视口尺寸
  }
  network?: {
    effectiveType?: string // 网络类型
    downlink?: number // 下行速度
  }
  custom?: Record<string, any> // 自定义上下文
}
```

## 最佳实践

### 1. 事件命名规范

```typescript
// 推荐：使用下划线分隔的描述性名称
trackingPlugin.track('product_view', { productId: '123' })
trackingPlugin.track('add_to_cart', { productId: '123', quantity: 2 })
trackingPlugin.track('purchase_complete', { orderId: 'order_456', amount: 99.99 })

// 不推荐：使用模糊或过于简单的名称
trackingPlugin.track('click', { button: 'buy' })
trackingPlugin.track('event1', { data: 'something' })
```

### 2. 属性设计

```typescript
// 推荐：结构化的属性设计
trackingPlugin.track('video_play', {
  videoId: 'video_123',
  title: '产品介绍视频',
  duration: 120,
  quality: '1080p',
  autoPlay: false,
  source: 'recommendation',
})

// 不推荐：嵌套过深或属性过多
trackingPlugin.track('complex_event', {
  data: {
    nested: {
      too: {
        deep: 'value'
      }
    }
  }
})
```

### 3. 性能优化

```typescript
// 启用批量上报
const trackingPlugin = new TrackingPlugin({
  enableBatch: true,
  batchInterval: 5000, // 根据业务需求调整间隔
  batchSize: 30, // 根据网络条件调整批量大小
})

// 合理使用事件过滤器
const trackingPlugin = new TrackingPlugin({
  eventFilter: (eventName, properties) => {
    // 过滤高频但价值较低的事件
    if (eventName === 'mouse_move')
      return false
    if (eventName === 'scroll' && Math.random() > 0.1)
      return false // 采样
    return true
  },
})
```

### 4. 错误处理

```typescript
// 监听插件错误
sdk.eventBus.on('plugin:error', (payload) => {
  if (payload.pluginName === 'tracking') {
    console.error('埋点插件错误:', payload.error)
    // 进行错误上报或降级处理
  }
})
```

## 常见问题

### Q: 如何确保埋点数据不丢失？
A: 插件提供了离线缓存功能，即使在网络不稳定的情况下也能保证数据完整性：

```typescript
const trackingPlugin = new TrackingPlugin({
  enableOfflineCache: true,
  offlineCacheSize: 2000, // 增大缓存容量
})
```

### Q: 如何减少埋点对性能的影响？
A: 使用批量上报和合理的配置：

```typescript
const trackingPlugin = new TrackingPlugin({
  enableBatch: true,
  batchInterval: 10000, // 适当增加间隔
  batchSize: 100, // 适当增加批量大小
})
```

### Q: 如何实现A/B测试埋点？
A: 使用自定义上下文：

```typescript
// 设置A/B测试上下文
trackingPlugin.setContext({
  abTestGroup: 'group_a',
  experimentId: 'exp_001',
})

// 所有后续埋点都会包含这个上下文
trackingPlugin.track('button_click', { buttonType: 'cta' })
```
