/**
 * Monitor 模块自动化设置脚本
 *
 * 用法：node setup-monitor-module.js
 *
 * 此脚本将：
 * 1. 创建必要的目录结构
 * 2. 创建所有 TypeScript 文件
 * 3. 提示安装依赖
 */

const fs = require('node:fs')
const path = require('node:path')
const process = require('node:process')

// 文件内容定义
const files = {
  'src/monitor/dto/query.dto.ts': `import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator'
import { Type } from 'class-transformer'

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * 基础查询 DTO
 */
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

/**
 * 埋点数据查询 DTO
 */
export class TrackingQueryDto extends QueryDto {
  @IsOptional()
  @IsString()
  eventType?: string

  @IsOptional()
  @IsString()
  eventName?: string
}

/**
 * 性能数据查询 DTO
 */
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

/**
 * 错误日志查询 DTO
 */
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

/**
 * 统计查询 DTO (不需要分页)
 */
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
`,

  'src/monitor/dto/index.ts': `export * from './query.dto'
`,

  'src/monitor/interfaces/query-result.interface.ts': `/**
 * 分页查询结果接口
 */
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 统计结果接口
 */
export interface StatsOverview {
  totalTracking: number
  totalPerformance: number
  totalErrors: number
  totalUsers: number
}

/**
 * 埋点统计（按事件类型聚合）
 */
export interface TrackingStats {
  eventType: string
  eventName: string
  count: number
}

/**
 * 性能统计
 */
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

/**
 * 错误统计（按类型聚合）
 */
export interface ErrorStats {
  errorType: string
  level: string
  count: number
  lastOccurred: number
}
`,

  'src/monitor/interfaces/index.ts': `export * from './query-result.interface'
`,

  'src/monitor/services/monitor.service.ts': `import { Injectable } from '@nestjs/common'
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
`,

  'src/monitor/controllers/monitor.controller.ts': `import { Controller, Get, Query, ValidationPipe } from '@nestjs/common'
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
`,

  'src/monitor/monitor.module.ts': `import { Module } from '@nestjs/common'
import { MonitorController } from './controllers/monitor.controller'
import { MonitorService } from './services/monitor.service'

@Module({
  controllers: [MonitorController],
  providers: [MonitorService],
  exports: [MonitorService],
})
export class MonitorModule {}
`,
}

// 创建文件函数
function createFile(filePath, content) {
  const fullPath = path.join(__dirname, filePath)
  const dir = path.dirname(fullPath)

  // 确保目录存在
  fs.mkdirSync(dir, { recursive: true })

  // 写入文件
  fs.writeFileSync(fullPath, content, 'utf8')
  console.log(`✓ Created: ${filePath}`)
}

// 主函数
function main() {
  console.log('=== Monitor 模块设置 ===\n')

  console.log('1. 创建文件...\n')
  Object.entries(files).forEach(([filePath, content]) => {
    try {
      createFile(filePath, content)
    }
    catch (error) {
      console.error(`✗ Failed to create ${filePath}:`, error.message)
    }
  })

  console.log('\n2. 文件创建完成！\n')

  console.log('3. 下一步操作：')
  console.log('   a) 安装依赖：pnpm add class-validator class-transformer')
  console.log('   b) 更新 src/app.module.ts，导入 MonitorModule')
  console.log('   c) 等待 Schema 创建完成后，实现真实的数据库查询\n')

  console.log('=== 设置完成 ===')
}

// 执行
try {
  main()
}
catch (error) {
  console.error('Error:', error)
  process.exit(1)
}
