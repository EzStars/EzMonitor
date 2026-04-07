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
import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import {
  MonitorBatchItemType,
} from '../dto'
import { ErrorLog } from '../schemas/error-log.schema'
import { PerformanceMetric } from '../schemas/performance-metric.schema'
import { ReplaySegment } from '../schemas/replay-segment.schema'
import { TrackingEvent } from '../schemas/tracking-event.schema'
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
    private readonly sourceMapService: SourceMapService = new SourceMapService(),
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

    return this.errorModel.create({
      ...dto,
      timestamp: new Date(dto.timestamp),
      frames: symbolication.frames ?? dto.frames,
      symbolicationStatus: symbolication.status,
      symbolicationReason: symbolication.reason,
    })
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

  async queryTracking(query: TrackingQueryDto): Promise<PaginatedResult<TrackingEvent>> {
    return this.queryCollection(this.trackingModel, query)
  }

  async queryPerformance(
    query: PerformanceQueryDto,
  ): Promise<PaginatedResult<PerformanceMetric>> {
    return this.queryCollection(this.performanceModel, query)
  }

  async queryErrors(query: ErrorQueryDto): Promise<PaginatedResult<ErrorLog>> {
    return this.queryCollection(this.errorModel, query)
  }

  async queryReplay(query: ReplayQueryDto): Promise<PaginatedResult<ReplaySegment>> {
    const filter = this.buildTimeAppFilter(query)
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

  async getStatsOverview(query: StatsQueryDto): Promise<OverviewStats> {
    const filter = this.buildTimeAppFilter(query)
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

  async getTrackingStats(query: StatsQueryDto): Promise<TrackingStatsItem[]> {
    const rows = await this.trackingModel.aggregate<{
      _id: string | null
      count: number
    }>([
      { $match: this.buildTimeAppFilter(query) },
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

  async getPerformanceStats(query: StatsQueryDto): Promise<PerformanceStatsItem[]> {
    const rows = await this.performanceModel.aggregate<{
      _id: string | null
      count: number
      avgValue: number
      minValue: number
      maxValue: number
      values: number[]
    }>([
      { $match: this.buildTimeAppFilter(query) },
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

  async getErrorStats(query: StatsQueryDto): Promise<ErrorStatsItem[]> {
    const rows = await this.errorModel.aggregate<{ _id: string | null, count: number }>([
      { $match: this.buildTimeAppFilter(query) },
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

  async getReplayStats(query: StatsQueryDto): Promise<ReplayStatsItem[]> {
    const rows = await this.replayModel.aggregate<{
      _id: string | null
      count: number
    }>([
      { $match: this.buildTimeAppFilter(query) },
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
  ): Promise<PaginatedResult<T>> {
    const filter = this.buildTimeAppFilter(query)
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

  private buildTimeAppFilter(query: StatsQueryDto | TrackingQueryDto | PerformanceQueryDto | ErrorQueryDto | ReplayQueryDto) {
    const filter: Record<string, unknown> = {}

    if (query.appId) {
      filter.appId = query.appId
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
}
