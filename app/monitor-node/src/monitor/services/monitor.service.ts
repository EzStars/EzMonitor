import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import {
  CreateErrorLogDto,
  CreatePerformanceMetricDto,
  CreateTrackingEventDto,
  MonitorBatchItemDto,
  MonitorBatchItemType,
  ErrorQueryDto,
  PerformanceQueryDto,
  StatsQueryDto,
  TrackingQueryDto,
} from '../dto'
import { ErrorLog } from '../schemas/error-log.schema'
import { PerformanceMetric } from '../schemas/performance-metric.schema'
import { TrackingEvent } from '../schemas/tracking-event.schema'

type WriteSummary = {
  tracking: number
  performance: number
  error: number
  total: number
}

type PaginatedResult<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type OverviewStats = {
  tracking: number
  performance: number
  error: number
  total: number
}

type TrackingStatsItem = {
  eventName: string
  count: number
}

type PerformanceStatsItem = {
  metricType: string
  count: number
  avgValue: number
  minValue: number
  maxValue: number
  p95Value: number
}

type ErrorStatsItem = {
  errorType: string
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
    return this.errorModel.create({
      ...dto,
      timestamp: new Date(dto.timestamp),
    })
  }

  async createBatch(items: MonitorBatchItemDto[]) {
    const tracking: Promise<unknown>[] = []
    const performance: Promise<unknown>[] = []
    const error: Promise<unknown>[] = []

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
        error.push(
          this.errorModel.create({
            appId: item.appId,
            timestamp: new Date(item.timestamp),
            errorType: item.errorType,
            message: item.message,
            stack: item.stack,
            url: item.url,
            userAgent: item.userAgent,
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

    return {
      tracking: trackingResult,
      performance: performanceResult,
      error: errorResult,
      summary: this.buildSummary(trackingResult.length, performanceResult.length, errorResult.length),
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

  async getStatsOverview(query: StatsQueryDto): Promise<OverviewStats> {
    const filter = this.buildTimeAppFilter(query)
    const [tracking, performance, error] = await Promise.all([
      this.trackingModel.countDocuments(filter),
      this.performanceModel.countDocuments(filter),
      this.errorModel.countDocuments(filter),
    ])

    return {
      tracking,
      performance,
      error,
      total: tracking + performance + error,
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

    return rows.map((row) => ({
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
    const rows = await this.errorModel.aggregate<{ _id: string | null; count: number }>([
      { $match: this.buildTimeAppFilter(query) },
      {
        $group: {
          _id: { $ifNull: ['$errorType', 'unknown'] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
    ])

    return rows.map((row) => ({
      errorType: row._id ?? 'unknown',
      count: row.count,
    }))
  }

  private buildSummary(tracking: number, performance: number, error: number): WriteSummary {
    return {
      tracking,
      performance,
      error,
      total: tracking + performance + error,
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

  private buildTimeAppFilter(query: StatsQueryDto | TrackingQueryDto | PerformanceQueryDto | ErrorQueryDto) {
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
