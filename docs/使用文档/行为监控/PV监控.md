# PV (Page View) 监控

## 📖 概述

PV (Page View) 监控是 EzMonitor SDK 的核心功能之一，用于统计和分析网站的页面访问量。该功能支持传统页面和 SPA (单页应用) 的路由变化监控，提供全面的流量分析数据。

## 🚀 功能特性

- ✅ **多种触发方式**：支持页面加载、Hash路由、History API路由变化
- ✅ **实时上报**：PV数据立即上报，确保流量统计的实时性
- ✅ **丰富的上下文**：收集页面信息、用户来源、设备信息等
- ✅ **SPA友好**：完美支持现代单页应用的路由监控
- ✅ **自动初始化**：SDK初始化时自动启动PV监控

## 📊 监控数据结构

### PV 数据格式
```typescript
interface PvInfoType {
  type: 'behavior';                       // 追踪类型
  subType: 'pv';                          // 子类型：pv
  timestamp: number;                      // 访问时间戳
  pageInfo: PageInformation;              // 页面基础信息
  originInfo: originInfoType;             // 用户来源信息
}
```

### 页面信息 (PageInformation)
```typescript
interface PageInformation {
  host: string;                 // 域名+端口，如: example.com:8080
  hostname: string;             // 纯域名，如: example.com  
  href: string;                 // 完整URL
  protocol: string;             // 协议，如: https:
  origin: string;               // 源，如: https://example.com
  port: string;                 // 端口号
  pathname: string;             // 路径，如: /page
  search: string;               // 查询参数，如: ?id=1
  hash: string;                 // 哈希值，如: #section1
  title: string;                // 页面标题
  language: string;             // 语言设置，如: zh
  userAgent: string;            // 用户代理字符串
  winScreen: string;            // 屏幕分辨率，如: 1920x1080
  docScreen: string;            // 页面可视区域，如: 1200x800
  pageLoadType: string;         // 页面加载类型
}
```

### 来源信息 (originInfoType)
```typescript
interface originInfoType {
  referrer: string;             // 来源页面URL
  navigationType: string | number; // 导航类型
}
```

#### 导航类型说明
- `0 (navigate)`: 页面通过常规导航加载（输入URL、点击链接等）
- `1 (reload)`: 页面通过重新加载（刷新）加载
- `2 (back_forward)`: 页面通过浏览器前进/后退按钮加载
- `255 (reserved)`: 任何其他类型的导航

## 🎯 触发机制

### 1. 页面首次加载
```typescript
afterLoad(() => {
  handler(); // 页面 DOMContentLoaded 或 load 事件后触发
});
```
**触发场景**：
- 用户直接访问网站
- 刷新页面 (F5)
- 通过书签访问

### 2. Hash 路由变化
```typescript
proxyHash(handler); // 监听 hashchange 事件
```
**触发场景**：
- `example.com/#/home` → `example.com/#/about`
- Hash 模式的 Vue/React 路由跳转

### 3. History API 路由变化
```typescript
proxyHistory(handler); // 监听 pushState/replaceState
```
**触发场景**：
- `example.com/home` → `example.com/about`  
- History 模式的现代 SPA 路由跳转

## 🔧 快速开始

### 基础使用

SDK 初始化时自动启动 PV 监控，无需额外配置：

```typescript
import EzMonitor from '@EzStars/EzMonitor';

// 初始化 SDK，PV 监控自动启动
const monitor = new EzMonitor({
  url: 'https://your-api.com/monitor',    // 上报地址
  projectName: 'your-project',            // 项目名称
  appId: 'your-app-id',                   // 项目ID
  userId: 'user-123',                     // 用户ID
});
```

### 高级配置

```typescript
const monitor = new EzMonitor({
  url: 'https://your-api.com/monitor',
  projectName: 'your-project',
  appId: 'your-app-id',
  userId: 'user-123',
  batchSize: 10,                          // 批量上报大小
  isAjax: true,                           // 开启Ajax上报
  
  // 上报回调函数
  reportBefore: (data) => {
    console.log('上报前:', data);
    return data; // 可以修改数据后返回
  },
  
  reportSuccess: (data) => {
    console.log('上报成功:', data);
  },
  
  reportFail: (error) => {
    console.error('上报失败:', error);
  }
});
```

## 📈 数据上报策略

### 立即上报
```typescript
lazyReportBatch(reportData); // PV 数据立即上报
```

**为什么立即上报？**
- 📊 **实时统计需求**：流量数据需要实时反映
- 🎯 **核心指标**：PV 是网站分析的基础指标  
- ⏱️ **防止丢失**：用户可能快速跳转或关闭页面

### 与其他监控的区别
| 监控类型 | 上报策略 | 数据存储 | 主要用途 |
|----------|----------|----------|----------|
| **PV监控** | 立即上报 | 不存储到breadcrumbs | 流量统计、实时分析 |
| **路由监控** | 不上报 | 存储到breadcrumbs | 用户行为轨迹分析 |
| **点击监控** | 立即上报 | 同时存储到breadcrumbs | 交互分析、热力图 |

## 💡 使用示例

### Vue.js 项目集成
```typescript
// main.js
import { createApp } from 'vue';
import EzMonitor from '@EzStars/EzMonitor';
import App from './App.vue';

// 初始化监控
const monitor = new EzMonitor({
  url: 'https://api.example.com/monitor',
  projectName: 'vue-app',
  appId: 'vue-app-001',
  userId: localStorage.getItem('userId') || 'anonymous',
});

const app = createApp(App);
app.mount('#app');
```

### React 项目集成
```typescript
// index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import EzMonitor from '@EzStars/EzMonitor';
import App from './App';

// 初始化监控
const monitor = new EzMonitor({
  url: 'https://api.example.com/monitor',
  projectName: 'react-app',
  appId: 'react-app-001',
  userId: localStorage.getItem('userId') || 'anonymous',
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

### Next.js 项目集成
```typescript
// _app.js
import EzMonitor from '@EzStars/EzMonitor';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // 初始化监控
    const monitor = new EzMonitor({
      url: 'https://api.example.com/monitor',
      projectName: 'nextjs-app',
      appId: 'nextjs-app-001',
      userId: 'user-123',
    });
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
```

### 手动获取 PV 数据
```typescript
// 获取行为监控实例
const behavior = window.$SDK.Behaviour;

// 获取当前页面信息
const pageInfo = getPageInfo();
console.log('当前页面信息:', pageInfo);

// 获取来源信息
const originInfo = getOriginInfo();
console.log('来源信息:', originInfo);
```

### 结合自定义埋点
```typescript
// 特定页面的自定义 PV 统计
window.$SDK.Behaviour.customHandler({
  eventKey: 'special_page_view',
  eventAction: 'expose',
  eventValue: {
    page: '/special-page',
    source: 'campaign',
    campaign_id: 'summer_sale_2024'
  }
});
```

## 📊 应用场景

### 1. 流量统计
- **实时监控**：网站访问量实时变化
- **趋势分析**：日活、周活、月活统计  
- **峰值分析**：访问高峰时段识别

### 2. 渠道分析  
- **来源统计**：哪些渠道带来更多流量
- **转化分析**：不同来源的用户转化率
- **营销效果**：广告投放效果评估

### 3. 产品优化
- **页面热度**：识别最受欢迎的页面
- **用户路径**：分析用户访问轨迹  
- **跳出分析**：页面留存能力评估

### 4. 技术决策
- **设备适配**：根据设备分辨率优化
- **浏览器兼容**：分析用户浏览器分布
- **性能优化**：高流量页面优先优化

## 🔍 数据分析维度

### 时间维度
- 访问时间戳
- 页面停留时长（结合路由监控）
- 访问频次统计

### 页面维度  
- URL 路径分析
- 页面标题统计
- 查询参数分析

### 用户维度
- 来源渠道分布
- 设备类型统计  
- 地理位置分析（需结合IP）

### 技术维度
- 浏览器类型分布
- 屏幕分辨率统计
- 页面加载方式分析

## ⚠️ 注意事项

1. **数据量控制**：PV 数据量较大，注意服务端处理能力
2. **隐私合规**：收集用户数据需符合隐私政策
3. **性能影响**：监控代码应尽量轻量，避免影响页面性能  
4. **SPA 兼容**：确保路由库与监控代理兼容
5. **数据准确性**：注意去重和异常数据过滤

## 🛠️ 故障排除

### 常见问题

**Q: SPA 应用路由跳转没有触发 PV？**  
A: 检查路由模式是否为 History 或 Hash 模式，确认代理函数正常工作。可以在控制台查看：
```javascript
console.log('PV监控状态:', window.$SDK.Behaviour);
```

**Q: PV 数据重复上报？**  
A: 检查是否多次初始化 SDK，或者页面存在多个监控实例

**Q: 缺少页面信息？**  
A: 确认页面加载完成后再调用，或检查浏览器 API 兼容性

**Q: 上报失败？**  
A: 检查网络连接和上报地址是否正确，可以通过 `reportFail` 回调查看错误信息

### 调试方法
```typescript
// 开启调试模式查看 PV 数据
const monitor = new EzMonitor({
  // ... 其他配置
  reportBefore: (data) => {
    if (data.subType === 'pv') {
      console.log('PV数据:', data);
    }
    return data;
  }
});

// 手动触发 PV 统计查看数据
console.log('页面信息:', getPageInfo());
console.log('来源信息:', getOriginInfo());
```

## 📚 相关文档

- [用户行为收集](./用户行为收集.md)
- [错误录屏回放](./错误录屏回放.md)
- [快速开始](../快速开始.md)
- [数据上报](../数据上报/智能上报方案.md)

PV 监控为网站提供了全面的访问量统计能力，是数据驱动决策的重要基础！ 📈
