# EzMonitor SDK

前端监控 SDK

## 功能特性

- [x] 监控 JavaScript 异常
- [x] 监控 Promise 异常
- [x] 监控 resource 异常
- [x] 监控跨域异常
- [x] 监控白屏异常
- [x] 监控接口异常
- [x] 监控页面性能
- [x] 监控网站信息
- [x] 监控用户行为

## 安装

<font color="red"> 暂时还没发布，下面这行命令可以安装 </font>

```bash
npm i @ezstars/ezmonitor
```

## 环境测试

```bash
pnpm run build
node test/test.js
```

## 使用方法

```typescript
import Monitor from 'monitor-sdk';

const monitor = new Monitor({
  url: 'http://127.0.0.1:3000/api/data', // 上报地址
  projectName: 'EzMonitor', // 项目名称
  appId: 'your-app-id', // 项目 ID
  userId: 'your-user-id', // 用户 ID
  isAjax: true, // 是否开启 AJAX 上报
  batchSize: 10, // 批量上报大小
  containerElements: ['html', 'body', '#app'], // 容器元素
  skeletonElements: ['.skeleton'], // 骨架屏元素
});
```

## 项目架构

EzMonitor 采用 **Monorepo** 架构，包含以下模块：

- **monitor-sdk**: 核心 SDK，提供性能监控、异常捕获等功能。
- **monitor-web**: Web 端监控插件。
- **monitor-node**: Node.js 端监控插件。

## 贡献指南

欢迎社区贡献代码！请参考 [贡献文档](docs/贡献文档/index.md) 了解如何提交 PR。

## 技术支持

如需技术支持，请访问 [EzMonitor 官方文档](https://ezstars.github.io/EzMonitor/) 或加入我们的开发者社区。

## 开源协议

EzMonitor 基于 [MIT 许可证](LICENSE) 开源，欢迎自由使用和修改.
