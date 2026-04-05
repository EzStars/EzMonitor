# 文件内容准备 - Monitor 查询 API

由于 PowerShell 环境限制，无法自动创建目录。请手动执行以下步骤：

## 手动操作步骤

### 1. 创建目录
在 `C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-node\src` 下创建：
- monitor\dto
- monitor\interfaces
- monitor\services
- monitor\controllers
- monitor\entities

### 2. 安装依赖
```
cd C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-node
pnpm add class-validator class-transformer
```

### 3. 文件列表

创建目录后，我将为你创建以下文件：

#### src/monitor/dto/query.dto.ts
```typescript
import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator'
import { Type } from 'class-transformer'

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20

  @IsOptional()
  @IsString()
  appId?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  startTime?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  endTime?: number

  @IsOptional()
  @IsString()
  sortBy?: string = 'timestamp'

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC
}

export class TrackingQueryDto extends QueryDto {
  @IsOptional()
  @IsString()
  eventType?: string

  @IsOptional()
  @IsString()
  eventName?: string
}

export class PerformanceQueryDto extends QueryDto {
  @IsOptional()
  @IsString()
  metricType?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minDuration?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxDuration?: number
}

export class ErrorQueryDto extends QueryDto {
  @IsOptional()
  @IsString()
  errorType?: string

  @IsOptional()
  @IsString()
  level?: string

  @IsOptional()
  @IsString()
  message?: string
}

export class StatsQueryDto {
  @IsOptional()
  @IsString()
  appId?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  startTime?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  endTime?: number
}
```

#### src/monitor/dto/index.ts
```typescript
export * from './query.dto'
```

#### src/monitor/interfaces/query-result.interface.ts
```typescript
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface StatsOverview {
  totalTracking: number
  totalPerformance: number
  totalErrors: number
  totalUsers: number
}

export interface TrackingStats {
  eventType: string
  eventName: string
  count: number
}

export interface PerformanceStats {
  metricType: string
  avgDuration: number
  p50: number
  p95: number
  p99: number
  minDuration: number
  maxDuration: number
  count: number
}

export interface ErrorStats {
  errorType: string
  level: string
  count: number
  lastOccurred: number
}
```

#### src/monitor/interfaces/index.ts
```typescript
export * from './query-result.interface'
```

#### src/monitor/services/monitor.service.ts
```typescript
import { Injectable } from '@nestjs/common'
import {
  TrackingQueryDto,
  PerformanceQueryDto,
  ErrorQueryDto,
  StatsQueryDto,
} from '../dto'
import type {
  PaginatedResult,
  StatsOverview,
  TrackingStats,
  PerformanceStats,
  ErrorStats,
} from '../interfaces'

@Injectable()
export class MonitorService {
  // TODO: 注入 Mongoose Models 当 Schema 创建完成后
  // constructor(
  //   @InjectModel('Tracking') private trackingModel: Model<TrackingDocument>,
  //   @InjectModel('Performance') private performanceModel: Model<PerformanceDocument>,
  //   @InjectModel('Error') private errorModel: Model<ErrorDocument>,
  // ) {}

  /**
   * 查询埋点数据
   */
  async queryTracking(query: TrackingQueryDto): Promise<PaginatedResult<any>> {
    // TODO: 实现真实的数据库查询
    // const { page = 1, pageSize = 20, appId, startTime, endTime, eventType, eventName, sortBy, sortOrder } = query
    
    // Mock 数据
    return {
      data: [],
      total: 0,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      totalPages: 0,
    }
  }

  /**
   * 查询性能数据
   */
  async queryPerformance(query: PerformanceQueryDto): Promise<PaginatedResult<any>> {
    // TODO: 实现真实的数据库查询
    return {
      data: [],
      total: 0,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      totalPages: 0,
    }
  }

  /**
   * 查询错误日志
   */
  async queryErrors(query: ErrorQueryDto): Promise<PaginatedResult<any>> {
    // TODO: 实现真实的数据库查询
    return {
      data: [],
      total: 0,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      totalPages: 0,
    }
  }

  /**
   * 获取总览统计
   */
  async getStatsOverview(query: StatsQueryDto): Promise<StatsOverview> {
    // TODO: 实现真实的聚合查询
    return {
      totalTracking: 0,
      totalPerformance: 0,
      totalErrors: 0,
      totalUsers: 0,
    }
  }

  /**
   * 获取埋点统计（按事件类型聚合）
   */
  async getTrackingStats(query: StatsQueryDto): Promise<TrackingStats[]> {
    // TODO: 实现真实的聚合查询
    return []
  }

  /**
   * 获取性能统计
   */
  async getPerformanceStats(query: StatsQueryDto): Promise<PerformanceStats[]> {
    // TODO: 实现真实的聚合查询
    return []
  }

  /**
   * 获取错误统计（按类型聚合）
   */
  async getErrorStats(query: StatsQueryDto): Promise<ErrorStats[]> {
    // TODO: 实现真实的聚合查询
    return []
  }
}
```

#### src/monitor/controllers/monitor.controller.ts
```typescript
import { Controller, Get, Query, ValidationPipe } from '@nestjs/common'
import { MonitorService } from '../services/monitor.service'
import {
  TrackingQueryDto,
  PerformanceQueryDto,
  ErrorQueryDto,
  StatsQueryDto,
} from '../dto'

@Controller('api/monitor')
export class MonitorController {
  constructor(private readonly monitorService: MonitorService) {}

  @Get('tracking')
  async queryTracking(@Query(ValidationPipe) query: TrackingQueryDto) {
    return this.monitorService.queryTracking(query)
  }

  @Get('performance')
  async queryPerformance(@Query(ValidationPipe) query: PerformanceQueryDto) {
    return this.monitorService.queryPerformance(query)
  }

  @Get('error')
  async queryErrors(@Query(ValidationPipe) query: ErrorQueryDto) {
    return this.monitorService.queryErrors(query)
  }

  @Get('stats/overview')
  async getStatsOverview(@Query(ValidationPipe) query: StatsQueryDto) {
    return this.monitorService.getStatsOverview(query)
  }

  @Get('stats/tracking')
  async getTrackingStats(@Query(ValidationPipe) query: StatsQueryDto) {
    return this.monitorService.getTrackingStats(query)
  }

  @Get('stats/performance')
  async getPerformanceStats(@Query(ValidationPipe) query: StatsQueryDto) {
    return this.monitorService.getPerformanceStats(query)
  }

  @Get('stats/error')
  async getErrorStats(@Query(ValidationPipe) query: StatsQueryDto) {
    return this.monitorService.getErrorStats(query)
  }
}
```

#### src/monitor/monitor.module.ts
```typescript
import { Module } from '@nestjs/common'
import { MonitorController } from './controllers/monitor.controller'
import { MonitorService } from './services/monitor.service'

@Module({
  controllers: [MonitorController],
  providers: [MonitorService],
  exports: [MonitorService],
})
export class MonitorModule {}
```

### 4. 更新 src/app.module.ts

在 imports 数组中添加 MonitorModule：

```typescript
import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { MonitorModule } from './monitor/monitor.module'

@Module({
  imports: [MonitorModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

---

## 完成后的效果

所有 API 接口已定义，包括：
- ✅ DTO 验证（分页、过滤、排序参数）
- ✅ 接口定义（PaginatedResult, Stats 等）
- ✅ 控制器（7 个 GET 端点）
- ✅ Service 层（带 TODO 标记，等待 Schema）

**状态：blocked**
- 原因：等待 Schema 创建完成后才能实现真实的数据库查询
- 建议：先创建 todo-node-3 (Schema 定义)，然后再完成此任务的数据库实现部分
