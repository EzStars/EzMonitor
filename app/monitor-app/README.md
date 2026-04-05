# monitor-app

监控数据看板应用，用于查询 `monitor-node` 写入的埋点、性能和错误数据。

## 启动顺序

1. 启动 MongoDB
2. 启动 `monitor-node`
3. 启动本应用

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:3001` | 后端 API 基础地址 |

## 启动

```bash
pnpm install
pnpm --filter monitor-app run dev
```

## 验证

1. 打开首页，确认图表和列表能正常加载。
2. 切换到不同监控页，确认接口返回正常。
3. 如果页面无数据，先在 `monitor-test` 触发一次上报，再刷新本页。

## 构建与检查

```bash
pnpm --filter monitor-app run build
pnpm --filter monitor-app run lint
```

## 排查

- **接口请求失败**：确认 `VITE_API_URL` 指向的后端已启动。
- **跨域失败**：确认后端 `src/main.ts` 已允许当前前端端口。
- **端口冲突**：Vite 可能自动切到别的端口，请以终端日志为准。
