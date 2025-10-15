# 录屏功能文档

## 概述

EzMonitor SDK 集成了基于 `rrweb` 的录屏功能，通过记录用户操作事件实现页面行为回放，主要用于错误场景的问题排查和用户行为分析。

## 核心特性

- ✅ 基于事件记录，文件体积小
- ✅ 支持 Canvas 录制
- ✅ 分片存储，内存优化
- ✅ 数据压缩，减少带宽
- ✅ 滑动窗口，保持最新数据

## 工作原理

### 录屏实现方式

不同于传统的视频录制，rrweb 采用事件记录方式：

```
传统录屏：用户操作 → 捕获像素 → 视频文件 (大文件)
事件录屏：用户操作 → 记录事件 → 事件序列 (小文件)
```

### 数据结构

```typescript
interface RecordEventScope {
  scope: string;        // 时间范围 "开始时间-结束时间"
  eventList: Event[];   // 该时间段的事件列表
}
```

### 分片策略

- **时间片段**：每 3 秒创建一个新片段
- **数量限制**：最多保留 3 个片段（约 9 秒数据）
- **滑动窗口**：自动删除最旧片段，保持最新数据

## API 参考

### RecordScreen 类

```typescript
class RecordScreen {
  public eventList: RecordEventScope[];  // 事件列表
  public scopeScreenTime: number;        // 片段时间间隔(3000ms)
  public screenCnt: number;              // 最大片段数量(3个)
  
  constructor();                         // 自动初始化录屏
  init(): void;                         // 启动录屏
  close(): void;                        // 停止录屏
}
```

### 获取录屏数据

```typescript
// 获取录屏实例
const recordScreen = getRecordScreen();

// 获取压缩后的录屏数据
const recordScreenData = getRecordScreenData();
```

### 数据处理流程

```typescript
export const getRecordScreenData = () => {
  const recordScreen = getRecordScreen();
  
  // 1. 获取最近2个片段
  const eventList = recordScreen?.eventList.slice(-2) || [];
  
  // 2. 合并所有事件
  const data = eventList.reduce((pre, cur) => {
    return [...pre, ...cur.eventList];
  }, []);
  
  // 3. 压缩数据
  const eventData = zip(data.flat());
  
  return eventData;
};
```

## 使用示例

### 基础用法

```typescript
import { getRecordScreenData } from '@ez-monitor/sdk';

// 在错误发生时获取录屏数据
try {
  // 业务代码
} catch (error) {
  const recordScreenData = getRecordScreenData();
  
  // 上报错误和录屏数据
  reportError({
    error: error.message,
    recordScreen: recordScreenData,
    timestamp: Date.now()
  });
}
```

### 手动控制录屏

```typescript
import { getRecordScreen } from '@ez-monitor/sdk';

const recordScreen = getRecordScreen();

// 停止录屏
recordScreen.close();

// 重新开始录屏
recordScreen.init();
```

## 录屏回放

### 在原项目中回放

```typescript
import { Replayer } from 'rrweb';
import { unzip } from '@ez-monitor/sdk';

// 解压录屏数据
const events = unzip(recordScreenData);

// 创建回放器
const replayer = new Replayer(events);
replayer.play();
```

### 在监控后台回放

```typescript
// 创建独立回放容器
function createPlayer(compressedData) {
  const container = document.createElement('div');
  container.style.cssText = `
    width: 1200px;
    height: 800px;
    border: 1px solid #ccc;
    overflow: hidden;
  `;
  
  const events = unzip(compressedData);
  const replayer = new Replayer(events, {
    root: container,
    loadTimeout: 1000,
    showWarning: false
  });
  
  return {
    container,
    play: () => replayer.play(),
    pause: () => replayer.pause(),
    goto: (time) => replayer.goto(time)
  };
}
```


## 配置选项

### 录屏配置

```typescript
// 在 RecordScreen.init() 中的配置
{
  emit: (event, isCheckout) => { /* 事件处理 */ },
  recordCanvas: true,              // 录制 Canvas 元素
  checkoutEveryNms: 3000,         // 每3秒重新制作快照
  collectFonts: true,             // 收集字体信息（可选）
  inlineStylesheet: true,         // 内联样式表（可选）
}
```

### 回放配置

```typescript
new Replayer(events, {
  root: container,                // 回放容器
  loadTimeout: 1000,             // 资源加载超时
  showWarning: false,            // 是否显示警告
  speed: 1,                      // 播放速度
  skipInactive: true,            // 跳过不活跃时间
  showDebug: false,              // 是否显示调试信息
  maskInputOptions: {            // 输入框遮罩配置
    password: true,              // 遮罩密码输入
    email: false,               // 不遮罩邮箱输入
  }
});
```

## 数据压缩

SDK 使用 `zip` 函数对录屏数据进行压缩：

```typescript
// 压缩
const compressed = zip(eventData);

// 解压（需要在回放时使用）
const events = unzip(compressed);
```

## 性能优化

### 内存管理
- 分片存储避免内存无限增长
- 自动清理旧数据
- 压缩存储减少内存占用

### 网络传输
- 事件数据比视频文件小 90%+
- 压缩传输进一步减少带宽
- 按需获取，不自动上报

### 录屏优化建议

```typescript
// 自定义配置减少性能影响
const recordScreen = new RecordScreen();
recordScreen.scopeScreenTime = 5000;  // 增加片段时间到5秒
recordScreen.screenCnt = 2;           // 减少保留片段数量到2个
```

## 应用场景

### 1. 错误重现
配合错误监控，自动收集错误发生前的用户操作：

```typescript
window.addEventListener('error', (error) => {
  const recordScreenData = getRecordScreenData();
  
  reportError({
    message: error.message,
    stack: error.error?.stack,
    recordScreen: recordScreenData,
    userAgent: navigator.userAgent,
    url: window.location.href
  });
});
```

### 2. 用户行为分析
分析用户交互路径和使用习惯：

```typescript
// 在关键节点收集录屏数据
function trackUserBehavior(action) {
  const recordScreenData = getRecordScreenData();
  
  analytics.track(action, {
    recordScreen: recordScreenData,
    timestamp: Date.now()
  });
}
```

### 3. 产品优化
了解用户在特定功能上的操作流程：

```typescript
// 在表单提交时收集录屏
document.getElementById('form').addEventListener('submit', () => {
  const recordScreenData = getRecordScreenData();
  
  // 分析用户填表过程
  analyzeFormFilling(recordScreenData);
});
```

## 注意事项

### 隐私保护

#### 敏感信息遮罩
```typescript
// 配置敏感元素遮罩
record({
  emit: callback,
  maskInputOptions: {
    password: true,        // 遮罩密码
    email: true,          // 遮罩邮箱
    tel: true,            // 遮罩电话
  },
  blockClass: 'sensitive',  // 添加此class的元素不会被录制
  ignoreClass: 'ignore',    // 忽略此class的元素变化
});
```

#### HTML标记
```html
<!-- 敏感信息区域 -->
<div class="sensitive">
  <input type="password" placeholder="请输入密码">
</div>

<!-- 忽略变化的区域 -->
<div class="ignore">
  <div class="real-time-data">实时数据</div>
</div>
```

### 兼容性

| 浏览器 | 版本要求 | 备注 |
|--------|----------|------|
| Chrome | 51+ | 完全支持 |
| Firefox | 54+ | 完全支持 |
| Safari | 10+ | 部分CSS可能不支持 |
| Edge | 79+ | 完全支持 |
| IE | 不支持 | 需要polyfill |

### 性能影响

#### 性能监控
```typescript
// 监控录屏对性能的影响
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    if (entry.name === 'rrweb-record') {
      console.log('录屏性能影响:', entry.duration);
    }
  });
});
observer.observe({entryTypes: ['measure']});
```

#### 性能优化
```typescript
// 在性能敏感场景下暂停录屏
function onHeavyOperation() {
  const recordScreen = getRecordScreen();
  recordScreen.close();  // 暂停录屏
  
  // 执行重操作
  performHeavyTask().then(() => {
    recordScreen.init();  // 恢复录屏
  });
}
```

## 故障排除

### 常见问题

#### Q: 回放时样式丢失？
**A:** 启用内联样式或确保CSS资源可访问
```typescript
record({
  emit: callback,
  inlineStylesheet: true,    // 内联样式表
  collectFonts: true,        // 收集字体
});
```

#### Q: 录屏数据过大？
**A:** 调整配置参数
```typescript
const recordScreen = new RecordScreen();
recordScreen.scopeScreenTime = 5000;  // 增加时间间隔
recordScreen.screenCnt = 2;           // 减少片段数量
```

#### Q: 回放卡顿？
**A:** 优化回放配置
```typescript
new Replayer(events, {
  speed: 2,              // 加快播放速度
  skipInactive: true,    // 跳过不活跃时间
  showWarning: false,    // 隐藏警告信息
});
```

#### Q: 跨域回放问题？
**A:** 使用代理解决资源访问
```typescript
new Replayer(events, {
  loadTimeout: 0,        // 禁用资源加载
  insertRule: false,     // 不插入CSS规则
});
```

### 调试模式

```typescript
// 启用调试模式查看详细信息
new Replayer(events, {
  showDebug: true,       // 显示调试信息
  showWarning: true,     // 显示警告
});

// 监听回放事件
replayer.on('resize', (dimension) => {
  console.log('页面尺寸变化:', dimension);
});

replayer.on('fullsnapshot-rebuilt', () => {
  console.log('快照重建完成');
});
```

## 最佳实践

### 1. 按需启用
```typescript
// 只在需要时启用录屏
if (shouldEnableRecording()) {
  initBehavior();
}
```

### 2. 错误场景自动收集
```typescript
// 全局错误处理
window.addEventListener('unhandledrejection', (event) => {
  const recordScreenData = getRecordScreenData();
  reportError({
    type: 'unhandledRejection',
    reason: event.reason,
    recordScreen: recordScreenData
  });
});
```

### 3. 数据采样
```typescript
// 按比例收集录屏数据
function shouldCollectRecordScreen() {
  return Math.random() < 0.1; // 10% 采样率
}

if (shouldCollectRecordScreen()) {
  const recordScreenData = getRecordScreenData();
  // 上报数据
}
```

### 4. 定期清理
```typescript
// 定期清理录屏数据
setInterval(() => {
  const recordScreen = getRecordScreen();
  if (recordScreen.eventList.length > 5) {
    recordScreen.eventList = recordScreen.eventList.slice(-3);
  }
}, 60000); // 每分钟清理一次
```

---

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 支持基础录屏功能
- 支持数据压缩和回放

### v1.1.0 (2024-02-01)
- 新增 Canvas 录制支持
- 优化分片存储策略
- 改进性能表现

### v1.2.0 (2024-03-01)
- 新增敏感信息遮罩
- 支持自定义配置
- 修复跨域回放问题
