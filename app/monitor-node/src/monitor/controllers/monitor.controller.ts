import * as process from 'node:process'
import { BadRequestException, Body, Controller, Get, Headers, Inject, Post, Query, UnauthorizedException } from '@nestjs/common'
import {
  validateCreateErrorLogDto,
  validateCreateMonitorBatchDto,
  validateCreatePerformanceMetricDto,
  validateCreateTrackingEventDto,
  validateErrorQueryDto,
  validatePerformanceQueryDto,
  validateStatsQueryDto,
  validateTrackingQueryDto,
  validateUploadSourceMapDto,
} from '../dto/validation'
import { MonitorService } from '../services/monitor.service'
import { SourceMapService } from '../services/sourcemap.service'

@Controller('api/monitor')
export class MonitorController {
  constructor(
    @Inject(MonitorService) private readonly monitorService: MonitorService,
    @Inject(SourceMapService) private readonly sourceMapService: SourceMapService,
  ) {}

  @Get('tracking')
  async queryTracking(@Query() query: unknown): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateTrackingQueryDto, query, 'Invalid tracking query')
    const data = await this.monitorService.queryTracking(dto)
    return this.buildSuccessResponse(data)
  }

  @Get('performance')
  async queryPerformance(@Query() query: unknown): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validatePerformanceQueryDto, query, 'Invalid performance query')
    const data = await this.monitorService.queryPerformance(dto)
    return this.buildSuccessResponse(data)
  }

  @Get('error')
  async queryError(@Query() query: unknown): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateErrorQueryDto, query, 'Invalid error query')
    const data = await this.monitorService.queryErrors(dto)
    return this.buildSuccessResponse(data)
  }

  @Get('stats/overview')
  async getStatsOverview(@Query() query: unknown): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateStatsQueryDto, query, 'Invalid stats query')
    const data = await this.monitorService.getStatsOverview(dto)
    return this.buildSuccessResponse(data)
  }

  @Get('stats/tracking')
  async getTrackingStats(@Query() query: unknown): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateStatsQueryDto, query, 'Invalid stats query')
    const data = await this.monitorService.getTrackingStats(dto)
    return this.buildSuccessResponse(data)
  }

  @Get('stats/performance')
  async getPerformanceStats(@Query() query: unknown): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateStatsQueryDto, query, 'Invalid stats query')
    const data = await this.monitorService.getPerformanceStats(dto)
    return this.buildSuccessResponse(data)
  }

  @Get('stats/error')
  async getErrorStats(@Query() query: unknown): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateStatsQueryDto, query, 'Invalid stats query')
    const data = await this.monitorService.getErrorStats(dto)
    return this.buildSuccessResponse(data)
  }

  @Post('tracking')
  async createTracking(@Body() body: unknown): Promise<{
    success: true
    writtenCount: number
    summary: {
      tracking: number
      performance: number
      error: number
      total: number
    }
    data: unknown
  }> {
    const dto = this.parseDto(validateCreateTrackingEventDto, body, 'Invalid tracking payload')
    const result = await this.monitorService.createTracking(dto)
    return {
      success: true,
      writtenCount: 1,
      summary: {
        tracking: 1,
        performance: 0,
        error: 0,
        total: 1,
      },
      data: result,
    }
  }

  @Post('performance')
  async createPerformance(@Body() body: unknown): Promise<{
    success: true
    writtenCount: number
    summary: {
      tracking: number
      performance: number
      error: number
      total: number
    }
    data: unknown
  }> {
    const dto = this.parseDto(validateCreatePerformanceMetricDto, body, 'Invalid performance payload')
    const result = await this.monitorService.createPerformance(dto)
    return {
      success: true,
      writtenCount: 1,
      summary: {
        tracking: 0,
        performance: 1,
        error: 0,
        total: 1,
      },
      data: result,
    }
  }

  @Post('error')
  async createError(@Body() body: unknown): Promise<{
    success: true
    writtenCount: number
    summary: {
      tracking: number
      performance: number
      error: number
      total: number
    }
    data: unknown
  }> {
    const dto = this.parseDto(validateCreateErrorLogDto, body, 'Invalid error payload')
    const result = await this.monitorService.createError(dto)
    return {
      success: true,
      writtenCount: 1,
      summary: {
        tracking: 0,
        performance: 0,
        error: 1,
        total: 1,
      },
      data: result,
    }
  }

  @Post('batch')
  async createBatch(@Body() body: unknown): Promise<{
    success: true
    writtenCount: number
    summary: {
      tracking: number
      performance: number
      error: number
      total: number
    }
    data: {
      tracking: number
      performance: number
      error: number
    }
  }> {
    const dto = this.parseDto(validateCreateMonitorBatchDto, body, 'Invalid batch payload')
    const result = await this.monitorService.createBatch(dto.items)
    return {
      success: true,
      writtenCount: result.summary.total,
      summary: result.summary,
      data: {
        tracking: result.tracking.length,
        performance: result.performance.length,
        error: result.error.length,
      },
    }
  }

  @Post('sourcemap')
  async uploadSourceMap(
    @Headers('x-monitor-upload-key') uploadKey: string | undefined,
    @Body() body: unknown,
  ): Promise<{ success: true, data: { key: string, mapPath: string } }> {
    this.assertUploadAuthorized(uploadKey)

    const dto = this.parseDto(validateUploadSourceMapDto, body, 'Invalid sourcemap payload')
    if (dto.map.length > 5 * 1024 * 1024) {
      throw new BadRequestException('SourceMap is too large')
    }

    const result = await this.sourceMapService.saveSourceMap(dto)
    return this.buildSuccessResponse(result)
  }

  private buildSuccessResponse<T>(data: T): { success: true, data: T } {
    return {
      success: true,
      data,
    }
  }

  private parseDto<T>(parser: (value: unknown) => T, value: unknown, message: string): T {
    try {
      return parser(value)
    }
    catch {
      throw new BadRequestException(message)
    }
  }

  private assertUploadAuthorized(uploadKey: string | undefined): void {
    const expectedKey = process.env.MONITOR_SOURCEMAP_UPLOAD_KEY
    if (!expectedKey) {
      throw new UnauthorizedException('SourceMap upload key is not configured')
    }

    if (!uploadKey || uploadKey !== expectedKey) {
      throw new UnauthorizedException('Invalid SourceMap upload key')
    }
  }
}
