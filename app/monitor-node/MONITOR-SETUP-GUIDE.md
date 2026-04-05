# Monitor 模块设置指南

## 📋 概述

本指南将帮助您为 monitor-node 项目创建完整的 Monitor 模块代码结构。

## 🚀 快速开始

### 方式 1：使用 Node.js 脚本（推荐）

在项目根目录执行：

```bash
cd C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-node
node setup-monitor-v2.js
```

这个脚本将自动：
- 创建所需的目录结构
- 创建所有 TypeScript 文件
- 显示创建的文件列表

### 方式 2：使用 PowerShell 脚本

```powershell
cd C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-node
.\create-monitor-dirs.ps1
```

### 方式 3：使用 Batch 脚本

```cmd
cd C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-node
create-monitor-dirs.bat
```

### 方式 4：手动创建

如果上述脚本都不工作，可以手动创建目录：

```cmd
cd C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-node
mkdir src\monitor
mkdir src\monitor\dto
mkdir src\monitor\entities
```

然后运行 `node setup-monitor-v2.js` 来创建所有文件。

## 📁 创建的目录结构

```
src/monitor/
├── dto/
│   ├── create-monitor-event.dto.ts  # 创建事件DTO
│   └── query-monitor.dto.ts         # 查询参数DTO
├── entities/
│   └── monitor-event.entity.ts      # 监控事件实体
├── monitor.controller.ts             # 控制器
├── monitor.service.ts                # 服务
└── monitor.module.ts                 # 模块定义
```

## 📝 创建的文件列表

1. **DTOs**:
   - `create-monitor-event.dto.ts` - 定义事件类型枚举和创建事件DTO
   - `query-monitor.dto.ts` - 定义查询参数DTO

2. **Entities**:
   - `monitor-event.entity.ts` - 监控事件实体类

3. **服务与控制器**:
   - `monitor.service.ts` - 业务逻辑服务（内存存储）
   - `monitor.controller.ts` - REST API 端点
   - `monitor.module.ts` - NestJS 模块定义

## 🔧 下一步操作

### 1. 更新 app.module.ts

将 MonitorModule 导入到主模块中：

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { MonitorModule } from './monitor/monitor.module'  // 添加这行

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),
    MonitorModule,  // 添加这行
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### 2. 安装依赖（如果需要）

```bash
pnpm install
```

### 3. 代码检查

```bash
pnpm run lint
```

### 4. 构建项目

```bash
pnpm run build
```

### 5. 启动开发服务器

```bash
pnpm run start:dev
```

## 🌐 API 端点

创建完成后，以下端点将可用：

- `POST /monitor/events` - 创建单个事件
- `POST /monitor/events/batch` - 批量创建事件
- `GET /monitor/events` - 查询事件列表（支持分页和过滤）
- `GET /monitor/events/:id` - 获取单个事件详情
- `DELETE /monitor/events/:id` - 删除事件
- `GET /monitor/statistics` - 获取统计数据
- `GET /monitor/health` - 健康检查

## 🧪 测试 API

使用以下命令测试健康检查端点：

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

## 📚 功能特性

### EventType 枚举

- `ERROR` - 错误事件
- `PERFORMANCE` - 性能事件
- `BEHAVIOR` - 行为事件
- `EXCEPTION` - 异常事件

### 查询功能

支持以下查询参数：
- `projectName` - 项目名称
- `appId` - 应用ID
- `userId` - 用户ID
- `eventType` - 事件类型
- `startTime` - 开始时间（时间戳）
- `endTime` - 结束时间（时间戳）
- `page` - 页码
- `pageSize` - 每页大小

### 统计功能

- 按事件类型统计
- 按项目统计
- 总数统计

## ⚠️ 注意事项

1. **内存存储**：当前实现使用内存数组存储数据，重启后数据会丢失。生产环境应该集成 MongoDB。

2. **无验证**：DTO 类当前没有使用 `class-validator` 装饰器。如需验证，请安装：
   ```bash
   pnpm add class-validator class-transformer
   ```
   然后添加验证装饰器。

3. **CORS**：如果前端需要访问API，请在 `main.ts` 中启用 CORS。

## 🔍 故障排除

### 脚本无法执行

如果 PowerShell 脚本无法执行，可能需要修改执行策略：

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### 端口被占用

如果 3000 端口被占用，修改 `main.ts` 中的端口或使用环境变量：

```bash
PORT=3001 pnpm run start:dev
```

### 文件已存在

如果文件已存在，脚本会覆盖它们。请确保备份重要数据。

## ✅ 验证

运行以下命令验证一切正常：

```bash
# 1. 检查目录结构
dir src\monitor /s /b

# 2. 检查文件内容
type src\monitor\monitor.module.ts

# 3. 编译检查
pnpm run build

# 4. 启动服务
pnpm run start:dev
```

## 📞 需要帮助？

如果遇到问题，请检查：
1. Node.js 版本 >= 18
2. pnpm 已安装
3. 所有依赖已安装
4. MongoDB 已配置（如果使用）

---

创建日期：$(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
