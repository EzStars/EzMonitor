import type { AuthTokenPayload } from '../../auth'
import * as process from 'node:process'
import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Post, Query, UnauthorizedException } from '@nestjs/common'
import { AuthRequired, AuthService, CurrentUser, ProjectApiKeyOptional } from '../../auth'
import {
  validateCreateErrorLogDto,
  validateCreateMonitorBatchDto,
  validateCreatePerformanceMetricDto,
  validateCreateReplaySegmentDto,
  validateCreateTrackingEventDto,
  validateErrorQueryDto,
  validatePerformanceQueryDto,
  validateReplayQueryDto,
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
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get('tracking')
  @AuthRequired()
  async queryTracking(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: unknown,
  ): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateTrackingQueryDto, query, 'Invalid tracking query')
    const allowedAppIds = await this.getAllowedAppIds(user.sub, dto.appId)
    const data = await this.monitorService.queryTracking(dto, allowedAppIds)
    return this.buildSuccessResponse(data)
  }

  @Get('performance')
  @AuthRequired()
  async queryPerformance(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: unknown,
  ): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validatePerformanceQueryDto, query, 'Invalid performance query')
    const allowedAppIds = await this.getAllowedAppIds(user.sub, dto.appId)
    const data = await this.monitorService.queryPerformance(dto, allowedAppIds)
    return this.buildSuccessResponse(data)
  }

  @Get('error')
  @AuthRequired()
  async queryError(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: unknown,
  ): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateErrorQueryDto, query, 'Invalid error query')
    const allowedAppIds = await this.getAllowedAppIds(user.sub, dto.appId)
    const data = await this.monitorService.queryErrors(dto, allowedAppIds)
    return this.buildSuccessResponse(data)
  }

  @Get('replay')
  @AuthRequired()
  async queryReplay(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: unknown,
  ): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateReplayQueryDto, query, 'Invalid replay query')
    const allowedAppIds = await this.getAllowedAppIds(user.sub, dto.appId)
    const data = await this.monitorService.queryReplay(dto, allowedAppIds)
    return this.buildSuccessResponse(data)
  }

  @Get('stats/overview')
  @AuthRequired()
  async getStatsOverview(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: unknown,
  ): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateStatsQueryDto, query, 'Invalid stats query')
    const allowedAppIds = await this.getAllowedAppIds(user.sub, dto.appId)
    const data = await this.monitorService.getStatsOverview(dto, allowedAppIds)
    return this.buildSuccessResponse(data)
  }

  @Get('stats/tracking')
  @AuthRequired()
  async getTrackingStats(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: unknown,
  ): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateStatsQueryDto, query, 'Invalid stats query')
    const allowedAppIds = await this.getAllowedAppIds(user.sub, dto.appId)
    const data = await this.monitorService.getTrackingStats(dto, allowedAppIds)
    return this.buildSuccessResponse(data)
  }

  @Get('stats/performance')
  @AuthRequired()
  async getPerformanceStats(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: unknown,
  ): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateStatsQueryDto, query, 'Invalid stats query')
    const allowedAppIds = await this.getAllowedAppIds(user.sub, dto.appId)
    const data = await this.monitorService.getPerformanceStats(dto, allowedAppIds)
    return this.buildSuccessResponse(data)
  }

  @Get('stats/error')
  @AuthRequired()
  async getErrorStats(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: unknown,
  ): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateStatsQueryDto, query, 'Invalid stats query')
    const allowedAppIds = await this.getAllowedAppIds(user.sub, dto.appId)
    const data = await this.monitorService.getErrorStats(dto, allowedAppIds)
    return this.buildSuccessResponse(data)
  }

  @Get('stats/replay')
  @AuthRequired()
  async getReplayStats(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: unknown,
  ): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateStatsQueryDto, query, 'Invalid stats query')
    const allowedAppIds = await this.getAllowedAppIds(user.sub, dto.appId)
    const data = await this.monitorService.getReplayStats(dto, allowedAppIds)
    return this.buildSuccessResponse(data)
  }

  @Get('stats/root-cause')
  @AuthRequired()
  async getRootCauseSummary(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: unknown,
  ): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateStatsQueryDto, query, 'Invalid stats query')
    const limit = this.parseOptionalLimit(query)
    const allowedAppIds = await this.getAllowedAppIds(user.sub, dto.appId)
    const data = await this.monitorService.getRootCauseSummary({
      ...dto,
      limit,
    }, allowedAppIds)
    return this.buildSuccessResponse(data)
  }

  @Get('error/:id/root-cause')
  @AuthRequired()
  async getErrorRootCause(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
  ): Promise<{ success: true, data: unknown }> {
    if (!id.trim()) {
      throw new BadRequestException('Error id is required')
    }

    const allowedAppIds = await this.getAllowedAppIds(user.sub)
    const data = await this.monitorService.getErrorRootCause(id, allowedAppIds)
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

  @Post('replay')
  async createReplay(@Body() body: unknown): Promise<{
    success: true
    writtenCount: number
    summary: {
      tracking: number
      performance: number
      error: number
      replay: number
      total: number
    }
    data: unknown
  }> {
    const dto = this.parseDto(validateCreateReplaySegmentDto, body, 'Invalid replay payload')
    const result = await this.monitorService.createReplay(dto)
    return {
      success: true,
      writtenCount: 1,
      summary: {
        tracking: 0,
        performance: 0,
        error: 0,
        replay: 1,
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
      replay: number
      total: number
    }
    data: {
      tracking: number
      performance: number
      error: number
      replay: number
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
        replay: result.replay.length,
      },
    }
  }

  @Post('sourcemap')
  @ProjectApiKeyOptional()
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

  private parseOptionalLimit(value: unknown): number | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined
    }

    const record = value as Record<string, unknown>
    const raw = record.limit
    if (raw === undefined) {
      return undefined
    }

    const parsed = Number(raw)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
      throw new BadRequestException('limit must be an integer between 1 and 20')
    }

    return parsed
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

  private async getAllowedAppIds(userId: string, requestedAppId?: string): Promise<string[]> {
    return this.authService.getReadableAppIds(userId, requestedAppId)
  }
}
