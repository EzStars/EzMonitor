import type { Model } from 'mongoose'
import type {
  CreateErrorLogDto,
  CreatePerformanceMetricDto,
  CreateReplaySegmentDto,
  CreateTrackingEventDto,
  ErrorQueryDto,
  MonitorBatchItemDto,
  PerformanceQueryDto,
  ReplayQueryDto,
  StatsQueryDto,
  TrackingQueryDto,
} from '../dto'
import type { RootCauseDetail, RootCauseSummaryItem } from './error-analysis.service'
import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import {
  MonitorBatchItemType,
} from '../dto'
import { ErrorLog } from '../schemas/error-log.schema'
import { PerformanceMetric } from '../schemas/performance-metric.schema'
import { ReplaySegment } from '../schemas/replay-segment.schema'
import { TrackingEvent } from '../schemas/tracking-event.schema'
import { ErrorAnalysisService } from './error-analysis.service'
import { SourceMapService } from './sourcemap.service'

interface WriteSummary {
  tracking: number
  performance: number
  error: number
  replay: number
  total: number
}

interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface OverviewStats {
  tracking: number
  performance: number
  error: number
  replay: number
  total: number
}

interface TrackingStatsItem {
  eventName: string
  count: number
}

interface PerformanceStatsItem {
  metricType: string
  count: number
  avgValue: number
  minValue: number
  maxValue: number
  p95Value: number
}

interface ErrorStatsItem {
  errorType: string
  count: number
}

interface ReplayStatsItem {
  route: string
  count: number
}

@Injectable()
export class MonitorService {
  constructor(
    @InjectModel(TrackingEvent.name)
    private readonly trackingModel: Model<TrackingEvent>,
    @InjectModel(PerformanceMetric.name)
    private readonly performanceModel: Model<PerformanceMetric>,
    @InjectModel(ErrorLog.name)
    private readonly errorModel: Model<ErrorLog>,
    @InjectModel(ReplaySegment.name)
    private readonly replayModel: Model<ReplaySegment>,
    @Inject(SourceMapService)
    private readonly sourceMapService: SourceMapService,
    @Inject(ErrorAnalysisService)
    private readonly errorAnalysisService?: ErrorAnalysisService,
  ) {}

  async createTracking(dto: CreateTrackingEventDto) {
    return this.trackingModel.create({
      ...dto,
      timestamp: new Date(dto.timestamp),
    })
  }

  async createPerformance(dto: CreatePerformanceMetricDto) {
    return this.performanceModel.create({
      ...dto,
      timestamp: new Date(dto.timestamp),
    })
  }

  async createError(dto: CreateErrorLogDto) {
    const symbolication = await this.sourceMapService.symbolicateError({
      appId: dto.appId,
      release: dto.release,
      stack: dto.stack,
      frames: dto.frames,
    })

    const created = await this.errorModel.create({
      ...dto,
      timestamp: new Date(dto.timestamp),
      frames: symbolication.frames ?? dto.frames,
      symbolicationStatus: symbolication.status,
      symbolicationReason: symbolication.reason,
    })

    this.triggerErrorAnalysis(created)
    return created
  }

  async createReplay(dto: CreateReplaySegmentDto) {
    return this.replayModel.create({
      ...dto,
      mode: dto.mode ?? 'native',
      timestamp: new Date(dto.timestamp),
      startedAt: new Date(dto.startedAt),
      endedAt: new Date(dto.endedAt),
    })
  }

  async createBatch(items: MonitorBatchItemDto[]) {
    const tracking: Promise<unknown>[] = []
    const performance: Promise<unknown>[] = []
    const error: Promise<unknown>[] = []
    const replaySegments: Promise<unknown>[] = []

    for (const item of items) {
      if (item.type === MonitorBatchItemType.TRACKING) {
        tracking.push(
          this.trackingModel.create({
            appId: item.appId,
            timestamp: new Date(item.timestamp),
            eventName: item.eventName,
            properties: item.properties,
            context: item.context,
            userId: item.userId,
          }),
        )
        continue
      }

      if (item.type === MonitorBatchItemType.PERFORMANCE) {
        performance.push(
          this.performanceModel.create({
            appId: item.appId,
            timestamp: new Date(item.timestamp),
            metricType: item.metricType,
            value: item.value,
            url: item.url,
            extra: item.extra,
            context: item.context,
          }),
        )
        continue
      }

      if (item.type === MonitorBatchItemType.ERROR) {
        const symbolication = await this.sourceMapService.symbolicateError({
          appId: item.appId,
          release: item.release,
          stack: item.stack,
          frames: item.frames,
        })

        error.push(
          this.errorModel.create({
            appId: item.appId,
            timestamp: new Date(item.timestamp),
            errorType: item.errorType,
            message: item.message,
            stack: item.stack,
            url: item.url,
            userAgent: item.userAgent,
            sessionId: item.sessionId,
            userId: item.userId,
            appVersion: item.appVersion,
            release: item.release,
            environment: item.environment,
            fingerprint: item.fingerprint,
            traceId: item.traceId,
            detail: item.detail,
            frames: symbolication.frames ?? item.frames,
            symbolicationStatus: symbolication.status,
            symbolicationReason: symbolication.reason,
          }),
        )
        continue
      }

      if (item.type === MonitorBatchItemType.REPLAY) {
        replaySegments.push(
          this.replayModel.create({
            appId: item.appId,
            timestamp: new Date(item.timestamp),
            mode: item.mode ?? 'native',
            segmentId: item.segmentId,
            startedAt: item.startedAt ? new Date(item.startedAt) : new Date(item.timestamp),
            endedAt: item.endedAt ? new Date(item.endedAt) : new Date(item.timestamp),
            eventCount: item.eventCount,
            route: item.route,
            reason: item.reason,
            sample: item.sample,
            rrwebEvents: item.rrwebEvents,
            context: item.context,
            userId: item.userId,
            sessionId: item.sessionId,
          }),
        )
        continue
      }

      throw new BadRequestException(`Unsupported batch type: ${item.type}`)
    }

    const [trackingResult, performanceResult, errorResult] = await Promise.all([
      Promise.all(tracking),
      Promise.all(performance),
      Promise.all(error),
    ])
    const replayResult = await Promise.all(replaySegments)

    for (const item of errorResult) {
      this.triggerErrorAnalysis(item)
    }

    return {
      tracking: trackingResult,
      performance: performanceResult,
      error: errorResult,
      replay: replayResult,
      summary: this.buildSummary(
        trackingResult.length,
        performanceResult.length,
        errorResult.length,
        replayResult.length,
      ),
    }
  }

  async queryTracking(query: TrackingQueryDto, allowedAppIds?: string[]): Promise<PaginatedResult<TrackingEvent>> {
    return this.queryCollection(this.trackingModel, query, allowedAppIds)
  }

  async queryPerformance(
    query: PerformanceQueryDto,
    allowedAppIds?: string[],
  ): Promise<PaginatedResult<PerformanceMetric>> {
    return this.queryCollection(this.performanceModel, query, allowedAppIds)
  }

  async queryErrors(query: ErrorQueryDto, allowedAppIds?: string[]): Promise<PaginatedResult<ErrorLog>> {
    return this.queryCollection(this.errorModel, query, allowedAppIds)
  }

  async queryReplay(query: ReplayQueryDto, allowedAppIds?: string[]): Promise<PaginatedResult<ReplaySegment>> {
    const filter = this.buildTimeAppFilter(query, allowedAppIds)
    if (query.segmentId) {
      filter.segmentId = query.segmentId
    }

    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const sortDirection: 1 | -1 = query.sortOrder === 'asc' ? 1 : -1

    const [total, items] = await Promise.all([
      this.replayModel.countDocuments(filter).exec(),
      this.replayModel
        .find(filter)
        .sort({ [query.sortBy ?? 'timestamp']: sortDirection })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean()
        .exec(),
    ])

    return {
      items: items as ReplaySegment[],
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    }
  }

  async getStatsOverview(query: StatsQueryDto, allowedAppIds?: string[]): Promise<OverviewStats> {
    const filter = this.buildTimeAppFilter(query, allowedAppIds)
    const [tracking, performance, error, replay] = await Promise.all([
      this.trackingModel.countDocuments(filter),
      this.performanceModel.countDocuments(filter),
      this.errorModel.countDocuments(filter),
      this.replayModel.countDocuments(filter),
    ])

    return {
      tracking,
      performance,
      error,
      replay,
      total: tracking + performance + error + replay,
    }
  }

  async getTrackingStats(query: StatsQueryDto, allowedAppIds?: string[]): Promise<TrackingStatsItem[]> {
    const rows = await this.trackingModel.aggregate<{
      _id: string | null
      count: number
    }>([
      { $match: this.buildTimeAppFilter(query, allowedAppIds) },
      {
        $group: {
          _id: { $ifNull: ['$eventName', 'unknown'] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
    ])

    return rows.map(row => ({
      eventName: row._id ?? 'unknown',
      count: row.count,
    }))
  }

  async getPerformanceStats(query: StatsQueryDto, allowedAppIds?: string[]): Promise<PerformanceStatsItem[]> {
    const rows = await this.performanceModel.aggregate<{
      _id: string | null
      count: number
      avgValue: number
      minValue: number
      maxValue: number
      values: number[]
    }>([
      { $match: this.buildTimeAppFilter(query, allowedAppIds) },
      {
        $group: {
          _id: { $ifNull: ['$metricType', 'unknown'] },
          count: { $sum: 1 },
          avgValue: { $avg: '$value' },
          minValue: { $min: '$value' },
          maxValue: { $max: '$value' },
          values: { $push: '$value' },
        },
      },
      { $sort: { count: -1, _id: 1 } },
    ])

    return rows.map((row) => {
      const values = [...row.values].sort((a, b) => a - b)
      return {
        metricType: row._id ?? 'unknown',
        count: row.count,
        avgValue: row.avgValue,
        minValue: row.minValue,
        maxValue: row.maxValue,
        p95Value: this.calculatePercentile(values, 95),
      }
    })
  }

  async getErrorStats(query: StatsQueryDto, allowedAppIds?: string[]): Promise<ErrorStatsItem[]> {
    const rows = await this.errorModel.aggregate<{ _id: string | null, count: number }>([
      { $match: this.buildTimeAppFilter(query, allowedAppIds) },
      {
        $group: {
          _id: { $ifNull: ['$errorType', 'unknown'] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
    ])

    return rows.map(row => ({
      errorType: row._id ?? 'unknown',
      count: row.count,
    }))
  }

  async getReplayStats(query: StatsQueryDto, allowedAppIds?: string[]): Promise<ReplayStatsItem[]> {
    const rows = await this.replayModel.aggregate<{
      _id: string | null
      count: number
    }>([
      { $match: this.buildTimeAppFilter(query, allowedAppIds) },
      {
        $group: {
          _id: { $ifNull: ['$route', 'unknown'] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
    ])

    return rows.map(row => ({
      route: row._id ?? 'unknown',
      count: row.count,
    }))
  }

  async getErrorRootCause(errorId: string, allowedAppIds?: string[]): Promise<RootCauseDetail | null> {
    if (!this.errorAnalysisService) {
      return null
    }

    const allowed = this.normalizeAllowedAppIds(allowedAppIds)
    if (allowed.length > 0) {
      const errorRecord = await this.errorModel.findById(errorId).select({ appId: 1 }).lean().exec()
      if (!errorRecord) {
        return null
      }

      if (!allowed.includes(errorRecord.appId)) {
        throw new UnauthorizedException('Requested error is not accessible')
      }
    }

    return this.errorAnalysisService.getRootCauseByErrorId(errorId)
  }

  async getRootCauseSummary(
    query: StatsQueryDto & { limit?: number },
    allowedAppIds?: string[],
  ): Promise<RootCauseSummaryItem[]> {
    if (!this.errorAnalysisService) {
      return []
    }

    const appScope = this.resolveAppScope(query.appId, allowedAppIds)
    return this.errorAnalysisService.getRootCauseSummary({
      appId: appScope.appId,
      appIds: appScope.appIds,
      startTime: query.startTime,
      endTime: query.endTime,
      limit: query.limit,
    })
  }

  private buildSummary(tracking: number, performance: number, error: number, replay: number): WriteSummary {
    return {
      tracking,
      performance,
      error,
      replay,
      total: tracking + performance + error + replay,
    }
  }

  private async queryCollection<
    T extends {
      timestamp: Date
      appId: string
    },
  >(
    model: Model<T>,
    query: TrackingQueryDto | PerformanceQueryDto | ErrorQueryDto,
    allowedAppIds?: string[],
  ): Promise<PaginatedResult<T>> {
    const filter = this.buildTimeAppFilter(query, allowedAppIds)
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const sortDirection: 1 | -1 = query.sortOrder === 'asc' ? 1 : -1

    const [total, items] = await Promise.all([
      model.countDocuments(filter).exec(),
      model
        .find(filter)
        .sort({ [query.sortBy ?? 'timestamp']: sortDirection })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean()
        .exec(),
    ])

    return {
      items: items as T[],
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    }
  }

  private buildTimeAppFilter(
    query: StatsQueryDto | TrackingQueryDto | PerformanceQueryDto | ErrorQueryDto | ReplayQueryDto,
    allowedAppIds?: string[],
  ) {
    const filter: Record<string, unknown> = {}

    const appScope = this.resolveAppScope(query.appId, allowedAppIds)
    if (appScope.appId) {
      filter.appId = appScope.appId
    }
    else if (appScope.appIds?.length) {
      filter.appId = { $in: appScope.appIds }
    }

    if (query.startTime || query.endTime) {
      const timestampFilter: Record<string, Date> = {}
      if (query.startTime) {
        timestampFilter.$gte = query.startTime
      }
      if (query.endTime) {
        timestampFilter.$lte = query.endTime
      }
      filter.timestamp = timestampFilter
    }

    return filter
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) {
      return 0
    }

    const rank = Math.ceil((percentile / 100) * values.length) - 1
    const index = Math.min(Math.max(rank, 0), values.length - 1)
    return values[index]
  }

  private triggerErrorAnalysis(record: unknown): void {
    if (!this.errorAnalysisService || !record || typeof record !== 'object') {
      return
    }

    const errorRecord = record as {
      _id?: unknown
      appId: string
      timestamp: Date
      errorType?: string
      fingerprint?: string
      sessionId?: string
      message?: string
    }

    void this.errorAnalysisService.handleErrorRecord(errorRecord).catch((error: unknown) => {
      console.error('[monitor-node] error analysis failed', error)
    })
  }

  private resolveAppScope(
    requestedAppId?: string,
    allowedAppIds?: string[],
  ): { appId?: string, appIds?: string[] } {
    const requested = requestedAppId?.trim()
    const allowed = this.normalizeAllowedAppIds(allowedAppIds)
    if (!allowed.length) {
      return requested ? { appId: requested } : {}
    }

    if (requested) {
      if (!allowed.includes(requested)) {
        throw new UnauthorizedException('Requested appId is not accessible')
      }

      return { appId: requested }
    }

    return { appIds: allowed }
  }

  private normalizeAllowedAppIds(allowedAppIds?: string[]): string[] {
    if (!allowedAppIds?.length) {
      return []
    }

    return [...new Set(allowedAppIds.map(item => item.trim()).filter(Boolean))]
  }
}
