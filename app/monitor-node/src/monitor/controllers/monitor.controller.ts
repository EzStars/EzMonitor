import { BadRequestException, Body, Controller, Get, Query, Post } from '@nestjs/common'
import {
  validateCreateErrorLogDto,
  validateCreateMonitorBatchDto,
  validateCreatePerformanceMetricDto,
  validateCreateTrackingEventDto,
  validateErrorQueryDto,
  validatePerformanceQueryDto,
  validateStatsQueryDto,
  validateTrackingQueryDto,
} from '../dto/validation'
import { MonitorService } from '../services/monitor.service'

@Controller('api/monitor')
export class MonitorController {
  constructor(private readonly monitorService: MonitorService) {}

  @Get('tracking')
  async queryTracking(@Query() query: unknown) {
    const dto = this.parseDto(validateTrackingQueryDto, query, 'Invalid tracking query')
    const data = await this.monitorService.queryTracking(dto)
    return this.buildSuccessResponse(data)
  }

  @Get('performance')
  async queryPerformance(@Query() query: unknown) {
    const dto = this.parseDto(validatePerformanceQueryDto, query, 'Invalid performance query')
    const data = await this.monitorService.queryPerformance(dto)
    return this.buildSuccessResponse(data)
  }

  @Get('error')
  async queryError(@Query() query: unknown) {
    const dto = this.parseDto(validateErrorQueryDto, query, 'Invalid error query')
    const data = await this.monitorService.queryErrors(dto)
    return this.buildSuccessResponse(data)
  }

  @Get('stats/overview')
  async getStatsOverview(@Query() query: unknown) {
    const dto = this.parseDto(validateStatsQueryDto, query, 'Invalid stats query')
    const data = await this.monitorService.getStatsOverview(dto)
    return this.buildSuccessResponse(data)
  }

  @Get('stats/tracking')
  async getTrackingStats(@Query() query: unknown) {
    const dto = this.parseDto(validateStatsQueryDto, query, 'Invalid stats query')
    const data = await this.monitorService.getTrackingStats(dto)
    return this.buildSuccessResponse(data)
  }

  @Get('stats/performance')
  async getPerformanceStats(@Query() query: unknown) {
    const dto = this.parseDto(validateStatsQueryDto, query, 'Invalid stats query')
    const data = await this.monitorService.getPerformanceStats(dto)
    return this.buildSuccessResponse(data)
  }

  @Get('stats/error')
  async getErrorStats(@Query() query: unknown) {
    const dto = this.parseDto(validateStatsQueryDto, query, 'Invalid stats query')
    const data = await this.monitorService.getErrorStats(dto)
    return this.buildSuccessResponse(data)
  }

  @Post('tracking')
  async createTracking(@Body() body: unknown) {
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
  async createPerformance(@Body() body: unknown) {
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
  async createError(@Body() body: unknown) {
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
  async createBatch(@Body() body: unknown) {
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

  private buildSuccessResponse<T>(data: T) {
    return {
      success: true,
      data,
    }
  }

  private parseDto<T>(parser: (value: unknown) => T, value: unknown, message: string): T {
    try {
      return parser(value)
    } catch {
      throw new BadRequestException(message)
    }
  }
}
