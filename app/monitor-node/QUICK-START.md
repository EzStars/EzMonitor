# Monitor 模块快速安装

## ⚡ 一键安装

在 `C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-node` 目录下运行：

```bash
node setup-monitor-v2.js
```

这将创建完整的 Monitor 模块结构。

## 📋 创建的文件

```
src/monitor/
├── dto/
│   ├── create-monitor-event.dto.ts
│   └── query-monitor.dto.ts
├── entities/
│   └── monitor-event.entity.ts
├── monitor.controller.ts
├── monitor.service.ts
└── monitor.module.ts
```

## 🔧 手动完成步骤

安装脚本运行后，还需要手动：

### 1. 更新 src/app.module.ts

添加 MonitorModule 导入：

```typescript
// 在文件顶部添加
import { MonitorModule } from './monitor/monitor.module'

// 在 @Module 装饰器的 imports 数组中添加
@Module({
  imports: [
    // ... 其他imports
    MonitorModule,  // 添加这行
  ],
  //...
})
```

或者直接复制 `src/app.module.NEW.ts` 的内容替换 `src/app.module.ts`。

### 2. 验证和运行

```bash
# 检查代码格式
pnpm run lint

# 构建项目
pnpm run build

# 启动开发服务器
pnpm run start:dev
```

### 3. 测试 API

```bash
# 健康检查
curl http://localhost:3000/monitor/health

# 应该返回：
# {"success":true,"status":"ok","timestamp":...}
```

## 🎯 API 端点

- `POST /monitor/events` - 创建事件
- `POST /monitor/events/batch` - 批量创建
- `GET /monitor/events` - 查询事件
- `GET /monitor/events/:id` - 获取详情
- `DELETE /monitor/events/:id` - 删除事件
- `GET /monitor/statistics` - 统计数据
- `GET /monitor/health` - 健康检查

## ℹ️ 更多信息

查看详细指南：[MONITOR-SETUP-GUIDE.md](./MONITOR-SETUP-GUIDE.md)

---

**注意**：当前使用内存存储，重启后数据会丢失。
