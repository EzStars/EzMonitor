# Monitor Node - 查询 API 实现指南

## 第一步：创建目录结构

请在命令行中运行以下命令（使用 cmd 或 PowerShell）：

```batch
cd C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-node
node create-dirs.js
```

这将创建以下目录：
- src/monitor/dto
- src/monitor/interfaces  
- src/monitor/services
- src/monitor/controllers
- src/monitor/entities

## 第二步：安装依赖

```batch
cd C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-node
pnpm add class-validator class-transformer
```

## 第三步：创建文件

目录创建完成后，我将为你创建以下文件：

### DTO 文件 (src/monitor/dto/)
1. query.dto.ts - 查询参数验证
2. index.ts - 导出

### Interfaces 文件 (src/monitor/interfaces/)
1. query-result.interface.ts - 查询结果接口
2. index.ts - 导出

### Service 文件 (src/monitor/services/)
1. monitor.service.ts - 核心服务（包含所有查询逻辑）

### Controller 文件 (src/monitor/controllers/)
1. monitor.controller.ts - REST API 控制器

### Module 文件
1. monitor.module.ts - NestJS 模块定义

## 第四步：更新主模块

在 src/app.module.ts 中导入 MonitorModule

## 完成后的 API 端点

- GET /api/monitor/tracking - 查询埋点数据
- GET /api/monitor/performance - 查询性能数据
- GET /api/monitor/error - 查询错误日志
- GET /api/monitor/stats/overview - 总览统计
- GET /api/monitor/stats/tracking - 埋点统计
- GET /api/monitor/stats/performance - 性能统计
- GET /api/monitor/stats/error - 错误统计

---

**请先运行上述命令创建目录并安装依赖，然后告诉我可以继续创建文件了。**
