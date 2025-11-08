# 自定义埋点插件 - 开发完成总结

## 🎉 功能完成

我已经成功为您的 sdkv2 项目添加了一个完整的自定义埋点插件 (`TrackingPlugin`)。

## 📁 文件结构

```
packages/sdkv2/src/plugins/tracking/
├── TrackingPlugin.ts          # 核心插件实现
├── types.ts                   # 类型定义
├── ContextCollector.ts        # 上下文收集器
├── TrackingCache.ts           # 缓存管理器
├── index.ts                   # 导出入口
├── README.md                  # 详细使用文档
├── examples.ts                # 使用示例
└── TrackingPlugin.test.ts     # 测试用例
```

## ✨ 核心功能

### 1. 埋点类型支持
- **事件埋点** (`track`): 自定义事件追踪
- **页面埋点** (`trackPage`): 页面访问追踪
- **用户埋点** (`trackUser`): 用户行为和属性追踪

### 2. 智能特性
- **自动上下文收集**: 页面、设备、网络信息
- **批量上报**: 智能批量处理，优化性能
- **离线缓存**: 支持离线存储，网络恢复后同步
- **自动页面追踪**: 可选的 SPA 路由监听

### 3. 高级配置
- **事件过滤器**: 自定义过滤规则
- **数据处理器**: 数据预处理和格式化
- **上下文管理**: 全局和局部上下文设置

## 🚀 快速开始

### 基础使用

```typescript
import { createSDK, TrackingPlugin } from '@ezmonitor/sdkv2';

// 创建 SDK
const sdk = createSDK({
  appId: 'your-app-id',
  apiUrl: 'https://your-api.com',
});

// 创建埋点插件
const trackingPlugin = new TrackingPlugin({
  enableBatch: true,
  batchInterval: 5000,
  batchSize: 20,
  autoTrackPage: true,
});

// 注册插件
sdk.pluginManager.register(trackingPlugin);

// 初始化
await sdk.init();
await sdk.start();
```

### 埋点示例

```typescript
// 事件埋点
trackingPlugin.track('button_click', {
  buttonName: '购买按钮',
  productId: '12345',
  price: 99.99,
});

// 页面埋点
trackingPlugin.trackPage('/product/detail', {
  productId: '12345',
  category: 'electronics',
});

// 用户埋点
trackingPlugin.trackUser('user123', {
  email: 'user@example.com',
  plan: 'premium',
});
```

## 🔧 配置选项

```typescript
const trackingPlugin = new TrackingPlugin({
  // 批量上报
  enableBatch: true,
  batchInterval: 10000,     // 10秒
  batchSize: 50,
  
  // 页面追踪
  autoTrackPage: true,
  
  // 离线缓存
  enableOfflineCache: true,
  offlineCacheSize: 1000,
  
  // 自定义处理
  dataProcessor: (data) => ({ ...data, version: '1.0.0' }),
  eventFilter: (name) => !name.startsWith('debug_'),
});
```

## 📊 事件数据结构

### 事件埋点数据
```typescript
{
  eventName: string;
  properties?: Record<string, any>;
  context?: {
    page?: { url, title, referrer };
    device?: { userAgent, screen, viewport };
    network?: { effectiveType, downlink };
    custom?: Record<string, any>;
  };
  timestamp: number;
  sessionId: string;
  userId?: string;
  appId: string;
}
```

## 🎯 使用场景

### 1. 电商场景
```typescript
// 商品浏览
trackingPlugin.track('product_view', {
  productId: 'prod_001',
  category: 'electronics',
  price: 7999,
});

// 加入购物车
trackingPlugin.track('add_to_cart', {
  productId: 'prod_001',
  quantity: 1,
});

// 购买完成
trackingPlugin.track('purchase_complete', {
  orderId: 'order_456',
  totalAmount: 7999,
});
```

### 2. 用户行为分析
```typescript
// 功能使用
trackingPlugin.track('feature_used', {
  featureName: 'advanced_search',
  duration: 1200,
});

// 表单提交
trackingPlugin.track('form_submit', {
  formType: '注册表单',
  fields: ['username', 'email'],
});
```

### 3. A/B 测试
```typescript
// 设置实验上下文
trackingPlugin.setContext({
  experimentId: 'A001',
  variant: 'treatment',
});

// 后续所有埋点都会包含实验信息
trackingPlugin.track('button_click', {
  buttonType: 'cta',
});
```

## 🔗 事件集成

插件会自动触发以下事件，您可以监听这些事件进行处理：

```typescript
// 监听埋点事件
sdk.eventBus.on('tracking:event', (payload) => {
  console.log('埋点事件:', payload);
});

// 监听批量上报
sdk.eventBus.on('tracking:batch', (payload) => {
  console.log('批量埋点:', payload.events);
});

// 监听数据上报
sdk.eventBus.on('report:data', (payload) => {
  console.log('数据上报:', payload);
});
```

## 📝 文档和示例

- **完整文档**: `src/plugins/tracking/README.md`
- **使用示例**: `src/plugins/tracking/examples.ts`
- **测试用例**: `src/plugins/tracking/TrackingPlugin.test.ts`

## ⚡ 性能优化建议

1. **合理配置批量参数**:
   - 高流量: `batchInterval: 10000, batchSize: 100`
   - 普通流量: `batchInterval: 5000, batchSize: 50`
   - 低流量: `batchInterval: 2000, batchSize: 20`

2. **使用事件过滤器**:
   ```typescript
   eventFilter: (eventName) => {
     // 过滤高频低价值事件
     if (eventName === 'mouse_move') return false;
     // 采样处理
     if (eventName === 'scroll') return Math.random() < 0.1;
     return true;
   }
   ```

3. **合理设置缓存大小**:
   ```typescript
   offlineCacheSize: 2000, // 根据用户设备性能调整
   ```

## 🎯 下一步建议

1. **集成到现有项目**: 将插件注册到您的 SDK 实例中
2. **配置数据上报**: 确保事件能正确发送到您的服务端
3. **定制化开发**: 根据业务需求调整配置和处理逻辑
4. **测试验证**: 使用提供的测试用例验证功能

## 📞 技术支持

如果您在使用过程中遇到任何问题或需要进一步的功能扩展，请随时联系我！

---

🎊 **恭喜！您的自定义埋点插件已经准备就绪，可以开始收集宝贵的用户行为数据了！**
