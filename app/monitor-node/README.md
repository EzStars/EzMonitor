# monitor-node

NestJS 后端服务，负责接收监控上报、写入 MongoDB，并向 `monitor-app` 提供查询接口。

## 启动顺序

1. 先启动 MongoDB
2. 再启动本服务
3. 最后启动 `monitor-test` / `monitor-app`

## 环境变量

来自 `.env` / `.env.example`：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://localhost:27017/ezmonitor` | MongoDB 连接串 |
| `PORT` | `3001` | 后端监听端口 |
| `NODE_ENV` | `development` | 运行环境 |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:5174` | 前端来源白名单（当前实现实际在 `src/main.ts` 里固定允许 5173/5174） |

## 启动

```bash
pnpm install
pnpm --filter monitor-node run start:dev
```

## API 概览

- `GET /`
- `GET /api/monitor/tracking`
- `GET /api/monitor/performance`
- `GET /api/monitor/error`
- `GET /api/monitor/stats/overview`
- `GET /api/monitor/stats/tracking`
- `GET /api/monitor/stats/performance`
- `GET /api/monitor/stats/error`
- `POST /api/monitor/tracking`
- `POST /api/monitor/performance`
- `POST /api/monitor/error`
- `POST /api/monitor/batch`

## 验证

```bash
pnpm --filter monitor-node run test
pnpm --filter monitor-node run test:e2e
```

## 排查

- **MongoDB 连接失败**：先确认 `MONGODB_URI` 可连通。
- **前端跨域失败**：确认前端端口是 `5173/5174`，或同步修改 `src/main.ts` 的 CORS 白名单。
- **端口被占用**：修改 `PORT` 后重启，并同步更新前端的 `VITE_API_URL` / `VITE_MONITOR_REPORT_URL`。
