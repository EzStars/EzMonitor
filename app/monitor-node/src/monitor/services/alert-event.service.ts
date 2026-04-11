import type { FilterQuery, Model } from 'mongoose'
import type {
  AlertEventQueryDto,
  AlertEventStatus,
  AlertMetric,
  AlertSeverity,
} from '../dto/alert.dto'

import type { AlertEvent } from '../schemas/alert-event.schema'
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { AlertEvent as AlertEventEntity } from '../schemas/alert-event.schema'

interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface CreateAlertEventInput {
  ruleId?: string
  ruleName: string
  appId?: string
  metric: AlertMetric
  severity: AlertSeverity
  score: number
  summary: string
  findings: string[]
  context?: Record<string, unknown>
  sourceErrorId?: string
  dedupeKey?: string
  suppressionHits?: number
  triggeredAt?: Date
  status?: AlertEventStatus
}

@Injectable()
export class AlertEventService {
  constructor(
    @InjectModel(AlertEventEntity.name)
    private readonly alertEventModel: Model<AlertEvent>,
  ) {}

  async createEvent(input: CreateAlertEventInput): Promise<AlertEvent> {
    return this.alertEventModel.create({
      ...input,
      suppressionHits: input.suppressionHits ?? 0,
      triggeredAt: input.triggeredAt ?? new Date(),
      status: input.status ?? 'open',
    })
  }

  async incrementSuppressionHits(dedupeKey: string): Promise<number> {
    const trimmedKey = dedupeKey.trim()
    if (!trimmedKey) {
      return 0
    }

    const updated = await this.alertEventModel
      .findOneAndUpdate(
        { dedupeKey: trimmedKey },
        { $inc: { suppressionHits: 1 } },
        {
          new: true,
          sort: { triggeredAt: -1 },
        },
      )
      .lean()
      .exec()

    if (!updated || typeof updated.suppressionHits !== 'number') {
      return 0
    }

    return updated.suppressionHits
  }

  async listEvents(query: AlertEventQueryDto): Promise<PaginatedResult<AlertEvent>> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const filter = this.buildFilter(query)

    const [total, items] = await Promise.all([
      this.alertEventModel.countDocuments(filter).exec(),
      this.alertEventModel
        .find(filter)
        .sort({ triggeredAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean()
        .exec(),
    ])

    return {
      items: items as AlertEvent[],
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    }
  }

  async listEventsForAppIds(appIds: string[], query: AlertEventQueryDto): Promise<PaginatedResult<AlertEvent>> {
    const normalized = [...new Set(appIds.map(item => item.trim()).filter(Boolean))]
    if (!normalized.length) {
      return {
        items: [],
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        total: 0,
        totalPages: 0,
      }
    }

    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const filter = this.buildFilter(query)
    const existingAppId = typeof filter.appId === 'string' ? filter.appId : undefined
    if (existingAppId && !normalized.includes(existingAppId)) {
      return {
        items: [],
        page,
        pageSize,
        total: 0,
        totalPages: 0,
      }
    }
    if (!existingAppId) {
      filter.appId = { $in: normalized }
    }

    const [total, items] = await Promise.all([
      this.alertEventModel.countDocuments(filter).exec(),
      this.alertEventModel
        .find(filter)
        .sort({ triggeredAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean()
        .exec(),
    ])

    return {
      items: items as AlertEvent[],
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    }
  }

  async getLatestAlerts(appId?: string, limit = 20): Promise<AlertEvent[]> {
    const filter: FilterQuery<AlertEvent> = {}
    if (appId) {
      filter.appId = appId
    }

    const clampedLimit = Math.max(1, Math.min(limit, 100))
    const items = await this.alertEventModel
      .find(filter)
      .sort({ triggeredAt: -1 })
      .limit(clampedLimit)
      .lean()
      .exec()

    return items as AlertEvent[]
  }

  async getLatestAlertsForAppIds(appIds: string[], appId?: string, limit = 20): Promise<AlertEvent[]> {
    const normalized = [...new Set(appIds.map(item => item.trim()).filter(Boolean))]
    if (!normalized.length) {
      return []
    }

    const filter: FilterQuery<AlertEvent> = {}
    if (appId) {
      if (!normalized.includes(appId)) {
        return []
      }
      filter.appId = appId
    }
    else {
      filter.appId = { $in: normalized }
    }

    const clampedLimit = Math.max(1, Math.min(limit, 100))
    const items = await this.alertEventModel
      .find(filter)
      .sort({ triggeredAt: -1 })
      .limit(clampedLimit)
      .lean()
      .exec()

    return items as AlertEvent[]
  }

  async updateStatus(id: string, status: AlertEventStatus): Promise<AlertEvent> {
    const updated = await this.alertEventModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .lean()
      .exec()

    if (!updated) {
      throw new NotFoundException(`Alert event not found: ${id}`)
    }

    return updated as AlertEvent
  }

  async getEventById(id: string): Promise<AlertEvent | null> {
    const event = await this.alertEventModel.findById(id).lean().exec()
    return event as AlertEvent | null
  }

  async hasRecentDuplicate(dedupeKey: string, suppressSec: number): Promise<boolean> {
    const since = new Date(Date.now() - suppressSec * 1000)
    const count = await this.alertEventModel
      .countDocuments({
        dedupeKey,
        triggeredAt: { $gte: since },
      })
      .exec()

    return count > 0
  }

  private buildFilter(query: AlertEventQueryDto): FilterQuery<AlertEvent> {
    const filter: FilterQuery<AlertEvent> = {}

    if (query.appId) {
      filter.appId = query.appId
    }

    if (query.status) {
      filter.status = query.status
    }

    if (query.startTime || query.endTime) {
      filter.triggeredAt = {}
      if (query.startTime) {
        filter.triggeredAt.$gte = query.startTime
      }
      if (query.endTime) {
        filter.triggeredAt.$lte = query.endTime
      }
    }

    return filter
  }
}
