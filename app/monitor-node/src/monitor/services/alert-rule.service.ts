import type { FilterQuery, Model } from 'mongoose'
import type {
  AlertMetric,
  AlertRuleQueryDto,
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
} from '../dto/alert.dto'
import type { AlertRule } from '../schemas/alert-rule.schema'
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { AlertRule as AlertRuleEntity } from '../schemas/alert-rule.schema'

interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

@Injectable()
export class AlertRuleService {
  constructor(
    @InjectModel(AlertRuleEntity.name)
    private readonly alertRuleModel: Model<AlertRule>,
  ) {}

  async createRule(dto: CreateAlertRuleDto): Promise<AlertRule> {
    return this.alertRuleModel.create({
      ...dto,
      enabled: dto.enabled ?? true,
      suppressSec: dto.suppressSec ?? 300,
      dedupeStrategy: dto.dedupeStrategy ?? 'by_rule',
    })
  }

  async listRules(query: AlertRuleQueryDto): Promise<PaginatedResult<AlertRule>> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const filter = this.buildFilter(query)

    const [total, items] = await Promise.all([
      this.alertRuleModel.countDocuments(filter).exec(),
      this.alertRuleModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean()
        .exec(),
    ])

    return {
      items: items as AlertRule[],
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    }
  }

  async listRulesForAppIds(appIds: string[], query: AlertRuleQueryDto): Promise<PaginatedResult<AlertRule>> {
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
      this.alertRuleModel.countDocuments(filter).exec(),
      this.alertRuleModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean()
        .exec(),
    ])

    return {
      items: items as AlertRule[],
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    }
  }

  async updateRule(id: string, dto: UpdateAlertRuleDto): Promise<AlertRule> {
    const updated = await this.alertRuleModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean()
      .exec()

    if (!updated) {
      throw new NotFoundException(`Alert rule not found: ${id}`)
    }

    return updated as AlertRule
  }

  async deleteRule(id: string): Promise<{ id: string }> {
    const deleted = await this.alertRuleModel.findByIdAndDelete(id).lean().exec()
    if (!deleted) {
      throw new NotFoundException(`Alert rule not found: ${id}`)
    }

    return { id }
  }

  async getRuleById(id: string): Promise<AlertRule | null> {
    const rule = await this.alertRuleModel.findById(id).lean().exec()
    return rule as AlertRule | null
  }

  async getEnabledRules(appId?: string): Promise<AlertRule[]> {
    const appFilter = appId
      ? [{ appId }, { appId: { $exists: false } }, { appId: '' }]
      : [{ appId: { $exists: false } }, { appId: '' }]

    const query: FilterQuery<AlertRule> = {
      enabled: true,
      $or: appFilter,
    }

    return this.alertRuleModel.find(query).lean().exec() as Promise<AlertRule[]>
  }

  private buildFilter(query: AlertRuleQueryDto): FilterQuery<AlertRule> {
    const filter: FilterQuery<AlertRule> = {}

    if (query.appId) {
      filter.appId = query.appId
    }
    if (typeof query.enabled === 'boolean') {
      filter.enabled = query.enabled
    }
    if (query.metric) {
      filter.metric = query.metric as AlertMetric
    }

    return filter
  }
}
