# 查询 API 实现 - 快速开始

## 问题说明

由于当前环境的 PowerShell 配置问题，自动化工具无法直接运行命令。

## 解决方案

### 方案一：使用自动化脚本（推荐）

在命令行（cmd 或 PowerShell）中运行：

```batch
cd C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-node
node setup-monitor-module.js
pnpm add class-validator class-transformer
```

这将：
- ✅ 创建所有必要的目录
- ✅ 创建所有 TypeScript 文件（DTO、Service、Controller、Module）
- ✅ 安装必要的验证依赖

### 方案二：手动创建（如果方案一失败）

参考 `IMPLEMENTATION-GUIDE.md` 中的详细步骤。

## 脚本创建的文件

### 目录结构
```
src/monitor/
├── dto/
│   ├── query.dto.ts          # 查询参数 DTO
│   └── index.ts
├── interfaces/
│   ├── query-result.interface.ts  # 查询结果接口
│   └── index.ts
├── services/
│   └── monitor.service.ts    # 查询服务实现
├── controllers/
│   └── monitor.controller.ts # REST API 控制器
└── monitor.module.ts          # NestJS 模块
```

### API 端点

运行脚本后，将创建以下 API 端点：

- `GET /api/monitor/tracking` - 查询埋点数据
- `GET /api/monitor/performance` - 查询性能数据
- `GET /api/monitor/error` - 查询错误日志
- `GET /api/monitor/stats/overview` - 总览统计
- `GET /api/monitor/stats/tracking` - 埋点统计
- `GET /api/monitor/stats/performance` - 性能统计
- `GET /api/monitor/stats/error` - 错误统计

### 查询参数示例

```
GET /api/monitor/tracking?page=1&pageSize=20&appId=myapp&startTime=1234567890&endTime=1234567999&eventType=click&sortBy=timestamp&sortOrder=desc
```

## 完成设置后

### 1. 更新 App Module

编辑 `src/app.module.ts`，添加：

```typescript
import { MonitorModule } from './monitor/monitor.module'

@Module({
  imports: [MonitorModule],
  // ...
})
```

### 2. 启动开发服务器

```batch
pnpm run start:dev
```

### 3. 测试 API

```batch
curl http://localhost:3000/api/monitor/stats/overview
```

## 注意事项

⚠️ **当前状态：部分完成**

- ✅ API 结构已定义
- ✅ DTO 验证已配置
- ✅ 控制器端点已创建
- ⏳ Service 实现使用 Mock 数据（TODO 标记）
- ⏳ 等待 Schema 创建完成后实现真实数据库查询

**依赖任务**: todo-node-3 (Schema 定义)

## 下一步

1. 运行上述脚本完成文件创建
2. 完成 Schema 定义（todo-node-3）
3. 实现 Service 中的真实数据库查询逻辑
4. 添加单元测试和集成测试
