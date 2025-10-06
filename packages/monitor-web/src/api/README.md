# API 模块使用指南

本模块提供了与 EzMonitor Server 交互的所有 API 接口，专门用于接收和管理性能监控数据。

## 📁 目录结构

```
src/api/
├── index.ts          # API 配置和基础请求方法
├── performance.ts    # 性能监控相关 API
└── example.tsx       # 使用示例和自定义 Hooks

src/types/
└── performance.ts    # 性能数据类型定义
```

## 🔧 配置

### 环境变量

在项目根目录创建 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:3000
```

### 支持的环境变量

- `VITE_API_BASE_URL`: API 服务器地址（默认: `http://localhost:3000`）

## 📚 API 接口

### 基础请求方法

位于 `src/api/index.ts`，提供了以下通用方法：

- `request<T>(url, options)` - 通用请求方法
- `get<T>(url, params)` - GET 请求
- `post<T>(url, data)` - POST 请求
- `put<T>(url, data)` - PUT 请求
- `del<T>(url, params)` - DELETE 请求

### 性能监控 API

位于 `src/api/performance.ts`，提供以下接口：

#### 1. 获取性能数据列表

```typescript
import { getPerformanceList } from '@/api/performance';

const result = await getPerformanceList({
  appId: '123456',
  subType: 'fcp',  // 可选：fp, fcp, lcp, load, fetch, xhr, resource, long-task
  limit: 50,       // 可选：返回数量限制
  startTime: Date.now() - 3600000,  // 可选：开始时间戳
  endTime: Date.now(),               // 可选：结束时间戳
});

// 返回格式
// {
//   total: number,
//   list: PerformanceData[]
// }
```

#### 2. 获取性能统计数据

```typescript
import { getPerformanceStats } from '@/api/performance';

const stats = await getPerformanceStats({
  appId: '123456',
  startTime: Date.now() - 86400000,  // 可选
  endTime: Date.now(),                // 可选
});

// 返回格式
// {
//   total: number,
//   fp: { count, avg, min, max },
//   fcp: { count, avg, min, max },
//   lcp: { count, avg, min, max },
//   load: { count, avg, min, max },
//   fetch: { count, avg, min, max, successRate },
//   xhr: { count, avg, min, max, successRate },
//   resource: { count, avg, min, max, totalSize },
//   'long-task': { count, avg, min, max }
// }
```

#### 3. 获取性能趋势数据

```typescript
import { getPerformanceTrend } from '@/api/performance';

const trend = await getPerformanceTrend({
  appId: '123456',
  subType: 'fcp',
  interval: 3600000,  // 可选：时间间隔（毫秒），默认1小时
  startTime: Date.now() - 86400000,  // 可选
  endTime: Date.now(),                // 可选
});

// 返回格式
// {
//   subType: 'fcp',
//   data: [
//     { timestamp, avg, min, max, count },
//     ...
//   ]
// }
```

#### 4. 便捷方法

针对特定类型的性能数据，提供了便捷方法：

```typescript
import {
  getPageLoadPerformance,
  getFCPPerformance,
  getLCPPerformance,
  getFetchPerformance,
  getXHRPerformance,
  getResourcePerformance,
  getLongTaskPerformance,
} from '@/api/performance';

// 获取页面加载性能数据
const loadData = await getPageLoadPerformance('123456', 20);

// 获取 FCP 性能数据
const fcpData = await getFCPPerformance('123456', 20);

// 获取 LCP 性能数据
const lcpData = await getLCPPerformance('123456', 20);

// 获取 Fetch 请求性能数据
const fetchData = await getFetchPerformance('123456', 50);

// 获取 XHR 请求性能数据
const xhrData = await getXHRPerformance('123456', 50);

// 获取资源加载性能数据
const resourceData = await getResourcePerformance('123456', 100);

// 获取长任务性能数据
const longTaskData = await getLongTaskPerformance('123456', 50);
```

## 🎨 在 React 组件中使用

### 方式 1: 直接使用 API

```typescript
import React, { useEffect, useState } from 'react';
import { getPerformanceStats } from '@/api/performance';
import type { PerformanceStats } from '@/types/performance';

function PerformanceStatsComponent() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await getPerformanceStats({ appId: '123456' });
        setStats(data);
      } catch (error) {
        console.error('获取统计数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <div>加载中...</div>;
  if (!stats) return <div>暂无数据</div>;

  return (
    <div>
      <p>总数: {stats.total}</p>
      <p>FCP 平均值: {stats.fcp?.avg}ms</p>
      <p>LCP 平均值: {stats.lcp?.avg}ms</p>
    </div>
  );
}
```

### 方式 2: 使用自定义 Hooks

参考 `src/api/example.tsx` 中的示例 Hooks：

```typescript
import { usePerformanceStats, usePerformanceList } from '@/api/example';

function PerformanceComponent() {
  const { stats, loading: statsLoading } = usePerformanceStats('123456');
  const { list, total, loading: listLoading } = usePerformanceList('123456', 'fcp', 20);

  return (
    <div>
      {/* 使用数据 */}
    </div>
  );
}
```

## 📦 类型定义

所有性能相关的类型定义都在 `src/types/performance.ts` 中：

### 主要类型

- `BasePerformanceData` - 性能数据基础结构
- `FPData` - First Paint 数据
- `FCPData` - First Contentful Paint 数据
- `LCPData` - Largest Contentful Paint 数据
- `LoadData` - 页面加载数据
- `FetchData` - Fetch 请求数据
- `XHRData` - XHR 请求数据
- `ResourceData` - 资源加载数据
- `LongTaskData` - 长任务数据
- `PerformanceData` - 所有性能数据的联合类型
- `PerformanceStats` - 性能统计数据

### 使用类型

```typescript
import type {
  PerformanceData,
  PerformanceStats,
  FPData,
  FCPData,
  LCPData,
} from '@/types/performance';

// 在组件中使用
const [stats, setStats] = useState<PerformanceStats | null>(null);
const [list, setList] = useState<PerformanceData[]>([]);
```

## 🚀 快速开始

### 1. 确保服务器正在运行

```bash
# 在项目根目录运行
pnpm run dev
```

### 2. 在组件中使用 API

```typescript
import { useEffect } from 'react';
import { getPerformanceStats } from '@/api/performance';

function MyComponent() {
  useEffect(() => {
    // 获取性能统计数据
    getPerformanceStats({ appId: '123456' })
      .then(stats => {
        console.log('性能统计:', stats);
      })
      .catch(error => {
        console.error('获取失败:', error);
      });
  }, []);

  return <div>My Component</div>;
}
```

## 🔍 调试

### 查看请求日志

所有 API 请求失败时会自动在控制台打印错误信息：

```typescript
console.error('API请求失败:', error);
```

### 查看网络请求

在浏览器开发者工具的 Network 面板中可以查看所有 API 请求：

- 请求 URL
- 请求方法
- 请求参数
- 响应数据
- 响应状态

## 📝 注意事项

1. **环境变量**: 确保 `.env` 文件中配置了正确的 `VITE_API_BASE_URL`
2. **错误处理**: 建议在使用 API 时添加 try-catch 错误处理
3. **类型安全**: 充分利用 TypeScript 类型定义，避免类型错误
4. **性能优化**: 对于频繁调用的接口，考虑添加缓存或防抖处理

## 🤝 扩展

如需添加新的 API 接口：

1. 在 `src/types/performance.ts` 中添加类型定义
2. 在 `src/api/performance.ts` 中添加 API 方法
3. 在 `src/api/example.tsx` 中添加使用示例

## 📖 相关文档

- [Server API 文档](../../monitor-server/README.md)
- [性能监控指标说明](../../docs/使用文档/性能监控/性能监控指标.md)
- [PerformanceObserver 使用](../../docs/使用文档/性能监控/PerformanceObserver.md)
