# @ezmonitor/server

EzMonitor 监控数据接收服务器 - 基于 Koa + TypeScript

## 功能特性

- ✅ 接收 SDK 上报的监控数据
- ✅ 数据分类处理（错误、性能、行为）
- ✅ RESTful API 设计
- ✅ TypeScript 类型安全
- ✅ CORS 跨域支持
- ✅ 开发热重载

## 快速开始

### 安装依赖

```bash
# 在项目根目录执行
pnpm install
```

### 开发模式

```bash
# 启动开发服务器（支持热重载）
pnpm dev
```

服务器将运行在 `http://127.0.0.1:3000`

### 构建生产版本

```bash
# 编译 TypeScript
pnpm build

# 运行生产版本
pnpm start
```

## API 接口

### 1. 健康检查

```
GET /health
```

**响应示例：**
```json
{
  "status": "ok",
  "timestamp": "2025-10-05T12:00:00.000Z",
  "service": "EzMonitor Server"
}
```

### 2. 接收监控数据

```
POST /api/monitor/report
```

**请求体：**
```json
{
  "userId": "user123",
  "sendType": "batch",
  "data": [
    {
      "type": "error",
      "subType": "jsError",
      "time": 1696500000000,
      "pageUrl": "https://example.com",
      "message": "Uncaught TypeError: xxx"
    }
  ]
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "received": 1
  }
}
```

### 3. 查询监控数据（待实现）

```
GET /api/monitor/list
```

## 配置 SDK

在您的应用中配置 SDK 上报地址：

```typescript
import EzMonitor from '@ezmonitor/sdk';

EzMonitor.init({
  url: 'http://127.0.0.1:3000/api/monitor/report',
  userId: 'your-user-id',
  apikey: 'your-api-key',
  // 其他配置...
});
```

## 目录结构

```
packages/monitor-server/
├── src/
│   ├── app.ts              # 应用入口
│   ├── routes/             # 路由定义
│   │   ├── index.ts
│   │   └── monitor.ts
│   ├── controllers/        # 控制器
│   │   └── monitor.ts
│   └── types/              # 类型定义
│       └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## 后续优化

- [ ] 接入数据库（MongoDB/MySQL）
- [ ] 数据持久化存储
- [ ] 数据查询接口完善
- [ ] 告警功能（错误告警、性能告警）
- [ ] 数据统计分析
- [ ] 认证鉴权机制
- [ ] 日志系统完善
- [ ] Docker 部署支持

## 开发者

EzStars

## License

MIT
