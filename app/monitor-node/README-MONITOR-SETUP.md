# Monitor 模块创建 - 操作总结

由于环境限制（PowerShell 6+ 未安装），无法自动运行脚本。但是我已经为您准备好了所有必需的脚本和文档。

## 📦 已创建的辅助文件

1. **setup-monitor-v2.js** - 主安装脚本
2. **verify-monitor-setup.js** - 验证脚本
3. **create-monitor-dirs.ps1** - PowerShell 目录创建脚本
4. **create-monitor-dirs.bat** - Batch 目录创建脚本
5. **MONITOR-SETUP-GUIDE.md** - 详细设置指南
6. **QUICK-START.md** - 快速开始指南
7. **src/app.module.NEW.ts** - 更新后的 app.module.ts 参考

## 🚀 执行步骤

### 步骤 1: 运行安装脚本

在您的终端（CMD、PowerShell 或 Git Bash）中执行：

```bash
cd C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-node
node setup-monitor-v2.js
```

这将创建以下结构：

```
src/monitor/
├── dto/
│   ├── create-monitor-event.dto.ts  (470 bytes)
│   └── query-monitor.dto.ts        (271 bytes)
├── entities/
│   └── monitor-event.entity.ts     (297 bytes)
├── monitor.controller.ts            (2045 bytes)
├── monitor.service.ts              (2686 bytes)
└── monitor.module.ts               (258 bytes)
```

### 步骤 2: 验证安装

```bash
node verify-monitor-setup.js
```

这将检查：
- ✓ 所有必需文件是否已创建
- ✓ 文件大小
- ✓ app.module.ts 是否已更新

### 步骤 3: 更新 app.module.ts

#### 方式 A: 手动编辑

在 `src/app.module.ts` 文件顶部添加：

```typescript
import { MonitorModule } from './monitor/monitor.module'
```

在 `@Module` 装饰器的 `imports` 数组中添加：

```typescript
@Module({
  imports: [
    // ... 现有imports
    MonitorModule,  // 添加这行
  ],
  // ...
})
```

#### 方式 B: 复制参考文件

```bash
# Windows CMD
copy src\app.module.NEW.ts src\app.module.ts /Y

# PowerShell
Copy-Item src\app.module.NEW.ts src\app.module.ts -Force
```

### 步骤 4: 验证和运行

```bash
# 代码检查
pnpm run lint

# 构建项目
pnpm run build

# 启动开发服务器
pnpm run start:dev
```

### 步骤 5: 测试 API

在浏览器或使用 curl 测试：

```bash
curl http://localhost:3000/monitor/health
```

预期响应：

```json
{
  "success": true,
  "status": "ok",
  "timestamp": 1234567890
}
```

## 📋 创建的 API 端点

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /monitor/events | 创建单个监控事件 |
| POST | /monitor/events/batch | 批量创建监控事件 |
| GET | /monitor/events | 查询事件列表（支持分页和过滤） |
| GET | /monitor/events/:id | 获取单个事件详情 |
| DELETE | /monitor/events/:id | 删除事件 |
| GET | /monitor/statistics | 获取统计数据 |
| GET | /monitor/health | 健康检查 |

## 🎯 监控事件类型

```typescript
enum EventType {
  ERROR = 'error',          // 错误事件
  PERFORMANCE = 'performance',  // 性能事件
  BEHAVIOR = 'behavior',    // 行为事件
  EXCEPTION = 'exception',  // 异常事件
}
```

## 📊 示例请求

### 创建事件

```bash
curl -X POST http://localhost:3000/monitor/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "error",
    "projectName": "my-project",
    "appId": "app-001",
    "userId": "user-123",
    "timestamp": 1234567890,
    "data": {"message": "Test error"},
    "url": "https://example.com",
    "sessionId": "session-abc"
  }'
```

### 查询事件

```bash
curl "http://localhost:3000/monitor/events?projectName=my-project&page=1&pageSize=10"
```

### 获取统计

```bash
curl "http://localhost:3000/monitor/statistics?projectName=my-project"
```

## ⚙️ 查询参数

- `projectName` - 项目名称
- `appId` - 应用ID
- `userId` - 用户ID
- `eventType` - 事件类型 (error/performance/behavior/exception)
- `startTime` - 开始时间戳
- `endTime` - 结束时间戳
- `page` - 页码（默认: 1）
- `pageSize` - 每页大小（默认: 10）

## ⚠️ 重要提示

1. **内存存储**: 当前实现使用内存存储，重启后数据会丢失
2. **生产环境**: 建议后续集成 MongoDB 持久化存储
3. **验证**: 如需参数验证，安装 `class-validator` 和 `class-transformer`
4. **CORS**: 如前端需要访问，在 `main.ts` 中启用 CORS

## 🐛 故障排除

### 脚本无法运行

确保：
- Node.js 已安装（v18+）
- 在正确的目录中运行
- 有文件写入权限

### 构建失败

```bash
# 清理并重新安装依赖
rm -rf node_modules
pnpm install
pnpm run build
```

### 端口冲突

如果 3000 端口被占用：

```bash
# 方式1: 修改 main.ts 中的端口
# 方式2: 使用环境变量
PORT=3001 pnpm run start:dev
```

## 📚 相关文档

- [QUICK-START.md](./QUICK-START.md) - 快速开始
- [MONITOR-SETUP-GUIDE.md](./MONITOR-SETUP-GUIDE.md) - 详细指南

## ✅ 成功标志

当您完成所有步骤后：

1. ✓ `verify-monitor-setup.js` 显示所有文件检查通过
2. ✓ `pnpm run build` 成功完成
3. ✓ `pnpm run start:dev` 成功启动
4. ✓ `/monitor/health` 返回正确的 JSON 响应

---

**下一步建议**:

1. 集成 MongoDB Schema 定义
2. 添加数据验证（class-validator）
3. 添加单元测试
4. 添加 API 文档（Swagger）
5. 实现真实的数据库查询
6. 添加认证和授权

---

创建时间: ${new Date().toLocaleString('zh-CN')}
工作目录: C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-node
