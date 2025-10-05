# SSE (Server-Sent Events) 使用指南

## 🔌 前端接入示例

### 原生 JavaScript

```javascript
// 连接 SSE
const appId = '123456';
const eventSource = new EventSource(`http://127.0.0.1:3001/api/performance/stream?appId=${appId}`);

// 监听连接成功
eventSource.addEventListener('connected', (event) => {
  const data = JSON.parse(event.data);
  console.log('✅ SSE 连接成功:', data);
});

// 监听心跳
eventSource.addEventListener('heartbeat', (event) => {
  const data = JSON.parse(event.data);
  console.log('💓 心跳:', data);
});

// 监听 FCP 数据
eventSource.addEventListener('performance:fcp', (event) => {
  const data = JSON.parse(event.data);
  console.log('📊 收到 FCP 数据:', data);
  // 更新 UI
  updateFCPChart(data);
});

// 监听 LCP 数据
eventSource.addEventListener('performance:lcp', (event) => {
  const data = JSON.parse(event.data);
  console.log('📊 收到 LCP 数据:', data);
  updateLCPChart(data);
});

// 监听统计数据
eventSource.addEventListener('performance:stats', (event) => {
  const data = JSON.parse(event.data);
  console.log('📈 最新统计:', data);
  updateDashboard(data);
});

// 监听慢请求告警
eventSource.addEventListener('performance:slow-request', (event) => {
  const data = JSON.parse(event.data);
  console.warn('⚠️  检测到慢请求:', data);
  showAlert(`慢请求: ${data.message}`);
});

// 监听错误
eventSource.onerror = (error) => {
  console.error('❌ SSE 连接错误:', error);
  // EventSource 会自动重连
};

// 关闭连接
// eventSource.close();
```

### React 示例

```typescript
import { useEffect, useState } from 'react';

interface PerformanceData {
  id: string;
  subType: string;
  duration: number;
  timestamp: number;
  // ... 其他字段
}

interface PerformanceStats {
  fp: number;
  fcp: number;
  lcp: number;
  loadTime: number;
  // ... 其他字段
}

export function PerformanceMonitor() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [recentData, setRecentData] = useState<PerformanceData[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const appId = '123456';
    const eventSource = new EventSource(
      `http://127.0.0.1:3001/api/performance/stream?appId=${appId}`
    );

    // 连接成功
    eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      console.log('✅ SSE 连接成功:', data);
      setConnected(true);
    });

    // 监听所有性能数据类型
    const performanceTypes = ['fp', 'fcp', 'lcp', 'load', 'fetch', 'xhr', 'resource'];
    
    performanceTypes.forEach((type) => {
      eventSource.addEventListener(`performance:${type}`, (event) => {
        const data = JSON.parse(event.data);
        console.log(`📊 收到 ${type.toUpperCase()} 数据:`, data);
        
        // 添加到最近数据列表
        setRecentData((prev) => [data, ...prev].slice(0, 20));
      });
    });

    // 监听统计数据
    eventSource.addEventListener('performance:stats', (event) => {
      const data = JSON.parse(event.data);
      console.log('📈 更新统计数据:', data);
      setStats(data);
    });

    // 监听慢请求告警
    eventSource.addEventListener('performance:slow-request', (event) => {
      const data = JSON.parse(event.data);
      console.warn('⚠️  慢请求告警:', data);
      // 显示通知
      alert(`检测到慢请求: ${data.message}`);
    });

    // 错误处理
    eventSource.onerror = (error) => {
      console.error('❌ SSE 连接错误:', error);
      setConnected(false);
      // EventSource 会自动重连
    };

    // 清理
    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, []);

  return (
    <div>
      <h1>性能监控面板</h1>
      
      {/* 连接状态 */}
      <div>
        状态: {connected ? '✅ 已连接' : '❌ 未连接'}
      </div>

      {/* 统计数据 */}
      {stats && (
        <div>
          <h2>核心 Web Vitals</h2>
          <ul>
            <li>FP: {stats.fp}ms</li>
            <li>FCP: {stats.fcp}ms</li>
            <li>LCP: {stats.lcp}ms</li>
            <li>Load Time: {stats.loadTime}ms</li>
          </ul>
        </div>
      )}

      {/* 最近数据 */}
      <div>
        <h2>最近数据 (实时)</h2>
        <ul>
          {recentData.map((item) => (
            <li key={item.id}>
              [{item.subType}] {item.duration}ms - {new Date(item.timestamp).toLocaleTimeString()}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

### Vue 3 示例

```vue
<template>
  <div class="performance-monitor">
    <h1>性能监控面板</h1>
    
    <!-- 连接状态 -->
    <div class="status">
      状态: {{ connected ? '✅ 已连接' : '❌ 未连接' }}
    </div>

    <!-- 统计数据 -->
    <div v-if="stats" class="stats">
      <h2>核心 Web Vitals</h2>
      <ul>
        <li>FP: {{ stats.fp }}ms</li>
        <li>FCP: {{ stats.fcp }}ms</li>
        <li>LCP: {{ stats.lcp }}ms</li>
        <li>Load Time: {{ stats.loadTime }}ms</li>
      </ul>
    </div>

    <!-- 最近数据 -->
    <div class="recent-data">
      <h2>最近数据 (实时)</h2>
      <ul>
        <li v-for="item in recentData" :key="item.id">
          [{{ item.subType }}] {{ item.duration }}ms - 
          {{ new Date(item.timestamp).toLocaleTimeString() }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface PerformanceData {
  id: string;
  subType: string;
  duration: number;
  timestamp: number;
}

interface PerformanceStats {
  fp: number;
  fcp: number;
  lcp: number;
  loadTime: number;
}

const connected = ref(false);
const stats = ref<PerformanceStats | null>(null);
const recentData = ref<PerformanceData[]>([]);
let eventSource: EventSource | null = null;

onMounted(() => {
  const appId = '123456';
  eventSource = new EventSource(
    `http://127.0.0.1:3001/api/performance/stream?appId=${appId}`
  );

  // 连接成功
  eventSource.addEventListener('connected', (event) => {
    const data = JSON.parse(event.data);
    console.log('✅ SSE 连接成功:', data);
    connected.value = true;
  });

  // 监听性能数据
  const performanceTypes = ['fp', 'fcp', 'lcp', 'load', 'fetch', 'xhr', 'resource'];
  
  performanceTypes.forEach((type) => {
    eventSource!.addEventListener(`performance:${type}`, (event) => {
      const data = JSON.parse(event.data);
      console.log(`📊 收到 ${type.toUpperCase()} 数据:`, data);
      
      // 添加到最近数据列表
      recentData.value = [data, ...recentData.value].slice(0, 20);
    });
  });

  // 监听统计数据
  eventSource.addEventListener('performance:stats', (event) => {
    const data = JSON.parse(event.data);
    console.log('📈 更新统计数据:', data);
    stats.value = data;
  });

  // 监听慢请求告警
  eventSource.addEventListener('performance:slow-request', (event) => {
    const data = JSON.parse(event.data);
    console.warn('⚠️  慢请求告警:', data);
    alert(`检测到慢请求: ${data.message}`);
  });

  // 错误处理
  eventSource.onerror = (error) => {
    console.error('❌ SSE 连接错误:', error);
    connected.value = false;
  };
});

onUnmounted(() => {
  if (eventSource) {
    eventSource.close();
    connected.value = false;
  }
});
</script>

<style scoped>
.performance-monitor {
  padding: 20px;
}

.status {
  margin: 10px 0;
  font-size: 18px;
  font-weight: bold;
}

.stats ul,
.recent-data ul {
  list-style: none;
  padding: 0;
}

.stats li,
.recent-data li {
  padding: 5px 0;
  border-bottom: 1px solid #eee;
}
</style>
```

## 🧪 测试 SSE 连接

### 使用 curl

```bash
# 连接 SSE
curl -N http://127.0.0.1:3001/api/performance/stream?appId=123456

# 你会看到类似这样的输出:
# event: connected
# data: {"clientId":"1234567890-abc","appId":"123456","message":"连接成功","timestamp":1234567890}
#
# event: heartbeat
# data: {"timestamp":1234567890}
```

### 使用浏览器

直接在浏览器中打开:
```
http://127.0.0.1:3001/api/performance/stream?appId=123456
```

浏览器会持续接收服务端推送的数据。

## 📊 查看 SSE 统计信息

```bash
# 获取当前 SSE 连接数和详情
curl http://127.0.0.1:3001/api/performance/sse-stats
```

响应示例:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "totalConnections": 3,
    "apps": {
      "123456": {
        "connections": 3,
        "clientIds": ["1234567890-abc", "1234567890-def", "1234567890-ghi"]
      }
    }
  }
}
```

## 🎯 SSE 事件类型

| 事件名 | 说明 | 触发时机 |
|--------|------|----------|
| `connected` | 连接成功 | 客户端首次连接 |
| `heartbeat` | 心跳 | 每 30 秒 |
| `performance:fp` | FP 数据 | 收到 FP 上报 |
| `performance:fcp` | FCP 数据 | 收到 FCP 上报 |
| `performance:lcp` | LCP 数据 | 收到 LCP 上报 |
| `performance:load` | 页面加载 | 收到 Load 上报 |
| `performance:fetch` | Fetch 请求 | 收到 Fetch 上报 |
| `performance:xhr` | XHR 请求 | 收到 XHR 上报 |
| `performance:resource` | 资源加载 | 收到 Resource 上报 |
| `performance:stats` | 统计数据 | 收到新数据后重新计算 |
| `performance:slow-request` | 慢请求告警 | 检测到耗时>1s 的请求 |

## 🔄 自动重连

EventSource 自带自动重连功能:
- 连接断开后会自动尝试重连
- 默认重连间隔: 3 秒
- 无需手动处理重连逻辑

## 💡 最佳实践

1. **单页面应用**: 在应用启动时建立一次连接，全局共享
2. **多页签**: 每个页签建立独立连接，服务端会广播给所有客户端
3. **断线重连**: 依赖浏览器自动重连，无需手动处理
4. **心跳检测**: 服务端每 30 秒发送心跳，保持连接活跃
5. **内存管理**: 组件卸载时记得调用 `eventSource.close()`
