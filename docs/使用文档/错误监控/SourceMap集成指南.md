# SourceMap 集成使用指南

## 📦 安装依赖

```bash
cd packages/monitor-sdk
pnpm install
```

## ⚙️ 配置启用 SourceMap

### 基础配置

```typescript
import EzMonitor from '@ezstars/monitor-sdk'

EzMonitor.init({
  url: 'https://your-api.com/monitor',
  projectName: 'your-project',
  appId: 'your-app-id',
  userId: 'user-123',

  // SourceMap 配置
  enableSourceMap: true, // 启用 SourceMap 解析
  sourceMapTimeout: 5000, // 获取超时时间（毫秒）
  sourceMapCacheSize: 100, // 缓存数量
})
```

### 生产环境配置

```typescript
// 仅在开发/测试环境启用
const isDev = process.env.NODE_ENV !== 'production'

EzMonitor.init({
  // ... 其他配置
  enableSourceMap: isDev, // 生产环境通常关闭
  sourceMapTimeout: isDev ? 10000 : 3000,
})
```

## 🔧 SourceMap 文件部署

### 1. Webpack 配置

```javascript
// webpack.config.js
module.exports = {
  devtool: 'source-map', // 生成 .map 文件

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    publicPath: 'https://your-cdn.com/assets/',
  },
}
```

### 2. Vite 配置

```javascript
// vite.config.js
export default {
  build: {
    sourcemap: true, // 生成 sourcemap
  },
}
```

### 3. 确保 SourceMap 可访问

生成的文件应包含如下注释：
```javascript
// # sourceMappingURL=main.js.map
```

## 📊 错误报告增强

启用 SourceMap 后，错误报告将包含：

```typescript
{
  // 原始信息（编译后）
  filename: "https://cdn.com/bundle.min.js",
  lineno: 1,
  colno: 1234,
  functionName: "a",

  // 增强信息（源码）
  originalFilename: "src/components/UserProfile.tsx",
  originalLineno: 42,
  originalColno: 15,
  originalFunctionName: "handleUserClick",
}
```

## 🚨 注意事项

### 安全考虑

1. **生产环境谨慎使用**: SourceMap 可能暴露源码结构
2. **访问控制**: 确保 SourceMap 文件有适当的访问控制
3. **内网部署**: 考虑将 SourceMap 部署在内网

### 性能影响

1. **网络开销**: 首次解析需要下载 SourceMap 文件
2. **内存使用**: 缓存 SourceMap 会占用内存
3. **解析时间**: 异步解析可能稍微延迟错误上报

### 故障回退

- SourceMap 获取失败时自动回退到基础堆栈
- 解析超时时使用原始错误信息
- 网络异常不影响正常的错误监控

## 🔍 调试和监控

### 控制台日志

启用 SourceMap 后，控制台会显示相关日志：

```
SourceMap parsing failed, fallback to basic parsing: Error: Failed to fetch sourcemap
```

### 错误统计

可通过 `reportAfter` 回调监控 SourceMap 解析成功率：

```typescript
EzMonitor.init({
  // ... 其他配置
  reportAfter: (data) => {
    if (data.stack?.[0]?.originalFilename) {
      console.log('SourceMap 解析成功')
    }
  },
})
```

## 🔧 高级配置

### 自定义 SourceMap 服务

```typescript
EzMonitor.init({
  enableSourceMap: true,
  sourceMapEndpoint: 'https://sourcemap-service.com/api/',
  sourceMapTimeout: 8000,
})
```

### 条件启用

```typescript
// 仅对特定错误启用
EzMonitor.init({
  enableSourceMap: window.location.search.includes('debug=true'),
})
```
