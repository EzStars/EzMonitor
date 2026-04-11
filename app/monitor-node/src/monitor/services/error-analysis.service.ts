import type { FilterQuery, Model } from 'mongoose'
import type { AlertRule } from '../schemas/alert-rule.schema'
import type { ErrorAnalysis } from '../schemas/error-analysis.schema'
import type { ErrorLog } from '../schemas/error-log.schema'
import type { PerformanceMetric } from '../schemas/performance-metric.schema'
import type { ReplaySegment } from '../schemas/replay-segment.schema'
import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { ErrorAnalysis as ErrorAnalysisEntity } from '../schemas/error-analysis.schema'
import { ErrorLog as ErrorLogEntity } from '../schemas/error-log.schema'
import { PerformanceMetric as PerformanceMetricEntity } from '../schemas/performance-metric.schema'
import { ReplaySegment as ReplaySegmentEntity } from '../schemas/replay-segment.schema'
import { AlertEventService } from './alert-event.service'
import { AlertRuleService } from './alert-rule.service'
import { SseBroadcastService } from './sse-broadcast.service'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

interface ErrorLike {
  _id?: unknown
  appId: string
  timestamp: Date
  errorType?: string
  fingerprint?: string
  sessionId?: string
  message?: string
}

interface AnalysisFinding {
  score: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  summary: string
  findings: string[]
  dedupeKey: string
  suppressSec: number
  metric: 'error_frequency' | 'error_spread'
  ruleId?: string
  ruleName?: string
  windowSec: number
}

type AnalysisSeverity = AnalysisFinding['severity']

interface CorrelatedPerformanceMetric {
  metricType: string
  value: number
  timestamp: string
  url?: string
}

interface CorrelatedReplaySegment {
  segmentId: string
  timestamp: string
  route?: string
  reason?: string
  eventCount: number
  sessionId?: string
}

interface RootCauseContextResult {
  analysisVersion: string
  confidence: number
  rootCauseCategory: string
  rootCauseTitle: string
  context: Record<string, unknown>
}

interface RootCausePickResult {
  category: string
  title: string
  summary: string
  evidence: string[]
}

export interface RootCauseDetail {
  analysisId?: string
  sourceErrorId?: string
  appId: string
  analyzedAt: string
  analysisVersion: string
  score: number
  severity: AnalysisSeverity
  confidence: number
  rootCause: {
    category: string
    title: string
    summary: string
    evidence: string[]
  }
  timeline: {
    errorAt: string
    windowStart: string
    windowEnd: string
  }
  correlations: {
    sameFingerprintCount: number
    spreadSessionCount: number
    performance: CorrelatedPerformanceMetric[]
    replays: CorrelatedReplaySegment[]
  }
  findings: string[]
}

export interface RootCauseSummaryItem {
  category: string
  title: string
  severity: AnalysisSeverity
  count: number
  avgConfidence: number
  lastAnalyzedAt: string
}

@Injectable()
export class ErrorAnalysisService {
  constructor(
    @InjectModel(ErrorAnalysisEntity.name)
    private readonly analysisModel: Model<ErrorAnalysis>,
    @InjectModel(ErrorLogEntity.name)
    private readonly errorModel: Model<ErrorLog>,
    @InjectModel(PerformanceMetricEntity.name)
    private readonly performanceModel: Model<PerformanceMetric>,
    @InjectModel(ReplaySegmentEntity.name)
    private readonly replayModel: Model<ReplaySegment>,
    @Inject(AlertRuleService)
    private readonly alertRuleService: AlertRuleService,
    @Inject(AlertEventService)
    private readonly alertEventService: AlertEventService,
    @Inject(SseBroadcastService)
    private readonly sseBroadcastService: SseBroadcastService,
  ) {}

  async handleErrorRecord(errorRecord: ErrorLike): Promise<void> {
    const now = errorRecord.timestamp ?? new Date()
    const findings = await this.evaluateAll(errorRecord)
    const uniqueFindings = this.uniqueFindings(findings)

    const analysisScore = uniqueFindings.length > 0
      ? Math.max(...uniqueFindings.map(item => item.score))
      : 0

    const rootCauseContext = await this.buildRootCauseContext(
      errorRecord,
      uniqueFindings,
      analysisScore,
      now,
    )

    const analysis = await this.analysisModel.create({
      appId: errorRecord.appId,
      sourceErrorId: this.toStringId(errorRecord._id),
      errorType: errorRecord.errorType,
      fingerprint: errorRecord.fingerprint,
      score: analysisScore,
      severity: this.scoreToSeverity(analysisScore),
      rootCauseCategory: rootCauseContext.rootCauseCategory,
      rootCauseTitle: rootCauseContext.rootCauseTitle,
      confidence: rootCauseContext.confidence,
      analysisVersion: rootCauseContext.analysisVersion,
      findings: uniqueFindings.flatMap(item => item.findings),
      context: rootCauseContext.context,
      analyzedAt: now,
    })

    const analysisId = this.toStringId((analysis as { _id?: unknown })._id)

    for (const finding of uniqueFindings) {
      const duplicated = await this.alertEventService.hasRecentDuplicate(
        finding.dedupeKey,
        finding.suppressSec,
      )

      if (duplicated) {
        await this.alertEventService.incrementSuppressionHits(finding.dedupeKey)
        continue
      }

      const created = await this.alertEventService.createEvent({
        ruleId: finding.ruleId,
        ruleName: finding.ruleName ?? 'built_in',
        appId: errorRecord.appId,
        metric: finding.metric,
        severity: finding.severity,
        score: finding.score,
        summary: finding.summary,
        findings: finding.findings,
        context: {
          errorType: errorRecord.errorType,
          fingerprint: errorRecord.fingerprint,
          sessionId: errorRecord.sessionId,
          rootCauseId: analysisId,
          rootCauseSummary: {
            category: rootCauseContext.rootCauseCategory,
            title: rootCauseContext.rootCauseTitle,
            confidence: rootCauseContext.confidence,
          },
        },
        sourceErrorId: this.toStringId(errorRecord._id),
        dedupeKey: finding.dedupeKey,
      })

      this.sseBroadcastService.emitAlert(created)
    }
  }

  async getRootCauseByErrorId(errorId: string): Promise<RootCauseDetail | null> {
    const normalizedId = errorId.trim()
    if (!normalizedId) {
      return null
    }

    const analysis = await this.analysisModel
      .findOne({ sourceErrorId: normalizedId })
      .sort({ analyzedAt: -1 })
      .lean()
      .exec()

    if (!analysis) {
      return null
    }

    return this.toRootCauseDetail(analysis as ErrorAnalysis & { _id?: unknown })
  }

  async getRootCauseSummary(query: {
    appId?: string
    startTime?: Date
    endTime?: Date
    limit?: number
  }): Promise<RootCauseSummaryItem[]> {
    const match: FilterQuery<ErrorAnalysis> = {}
    if (query.appId) {
      match.appId = query.appId
    }

    if (query.startTime || query.endTime) {
      match.analyzedAt = {}
      if (query.startTime) {
        match.analyzedAt.$gte = query.startTime
      }
      if (query.endTime) {
        match.analyzedAt.$lte = query.endTime
      }
    }

    const limit = this.clamp(query.limit ?? 8, 1, 20)
    const rows = await this.analysisModel.aggregate<{
      _id: {
        category: string
        title: string
        severity: AnalysisSeverity
      }
      count: number
      avgConfidence: number
      lastAnalyzedAt: Date
    }>([
      { $match: match },
      {
        $project: {
          category: {
            $ifNull: ['$rootCauseCategory', { $ifNull: ['$context.rootCause.category', 'unknown'] }],
          },
          title: {
            $ifNull: ['$rootCauseTitle', { $ifNull: ['$context.rootCause.title', '未知根因'] }],
          },
          severity: { $ifNull: ['$severity', 'low'] },
          confidence: {
            $ifNull: ['$confidence', { $ifNull: ['$context.rootCause.confidence', 0] }],
          },
          analyzedAt: 1,
        },
      },
      {
        $group: {
          _id: {
            category: '$category',
            title: '$title',
            severity: '$severity',
          },
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidence' },
          lastAnalyzedAt: { $max: '$analyzedAt' },
        },
      },
      {
        $sort: {
          count: -1,
          avgConfidence: -1,
        },
      },
      { $limit: limit },
    ])

    return rows.map(row => ({
      category: row._id.category,
      title: row._id.title,
      severity: row._id.severity,
      count: row.count,
      avgConfidence: Number(row.avgConfidence.toFixed(2)),
      lastAnalyzedAt: row.lastAnalyzedAt.toISOString(),
    }))
  }

  private async evaluateAll(errorRecord: ErrorLike): Promise<AnalysisFinding[]> {
    const [builtIn, custom] = await Promise.all([
      this.evaluateBuiltIn(errorRecord),
      this.evaluateCustomRules(errorRecord),
    ])

    return [...builtIn, ...custom]
  }

  private async evaluateBuiltIn(errorRecord: ErrorLike): Promise<AnalysisFinding[]> {
    const now = errorRecord.timestamp ?? new Date()
    const result: AnalysisFinding[] = []

    const sameFingerprintCount = await this.errorModel.countDocuments({
      appId: errorRecord.appId,
      fingerprint: errorRecord.fingerprint,
      timestamp: {
        $gte: new Date(now.getTime() - 5 * 60 * 1000),
      },
    }).exec()

    if (errorRecord.fingerprint && sameFingerprintCount >= 3) {
      result.push({
        metric: 'error_frequency',
        score: 90,
        severity: 'high',
        summary: '同类错误在短时间内高频出现',
        findings: [`fingerprint=${errorRecord.fingerprint}`, `5分钟内发生 ${sameFingerprintCount} 次`],
        dedupeKey: `builtin:freq:${errorRecord.appId}:${errorRecord.fingerprint}`,
        suppressSec: 300,
        ruleName: 'builtin_error_frequency',
        windowSec: 300,
      })
    }

    if (errorRecord.errorType) {
      const sessionCount = await this.errorModel.distinct('sessionId', {
        appId: errorRecord.appId,
        errorType: errorRecord.errorType,
        timestamp: {
          $gte: new Date(now.getTime() - 10 * 60 * 1000),
        },
      }).then(items => items.filter(Boolean).length)

      if (sessionCount >= 5) {
        result.push({
          metric: 'error_spread',
          score: 82,
          severity: 'high',
          summary: '错误在多个会话中扩散',
          findings: [`errorType=${errorRecord.errorType}`, `10分钟内影响 ${sessionCount} 个会话`],
          dedupeKey: `builtin:spread:${errorRecord.appId}:${errorRecord.errorType}`,
          suppressSec: 600,
          ruleName: 'builtin_error_spread',
          windowSec: 600,
        })
      }
    }

    const performanceSpike = await this.performanceModel.countDocuments({
      appId: errorRecord.appId,
      metricType: {
        $in: ['performance_lcp', 'performance_inp', 'performance_long_task'],
      },
      value: { $gte: 2000 },
      timestamp: {
        $gte: new Date(now.getTime() - 60 * 1000),
        $lte: now,
      },
    }).exec()

    if (performanceSpike >= 3) {
      result.push({
        metric: 'error_frequency',
        score: 70,
        severity: 'medium',
        summary: '错误前存在性能尖峰信号',
        findings: [`最近1分钟检测到 ${performanceSpike} 条高耗时性能指标`],
        dedupeKey: `builtin:perf:${errorRecord.appId}:${errorRecord.errorType ?? 'unknown'}`,
        suppressSec: 60,
        ruleName: 'builtin_perf_correlation',
        windowSec: 60,
      })
    }

    return result
  }

  private async evaluateCustomRules(errorRecord: ErrorLike): Promise<AnalysisFinding[]> {
    const rules = await this.alertRuleService.getEnabledRules(errorRecord.appId)
    const now = errorRecord.timestamp ?? new Date()
    const findings: AnalysisFinding[] = []

    for (const rule of rules) {
      const matched = await this.evaluateRule(rule, errorRecord, now)
      if (matched) {
        findings.push(matched)
      }
    }

    return findings
  }

  private async evaluateRule(
    rule: AlertRule,
    errorRecord: ErrorLike,
    now: Date,
  ): Promise<AnalysisFinding | null> {
    const since = new Date(now.getTime() - rule.windowSec * 1000)

    if (rule.metric === 'error_frequency') {
      const filter: Record<string, unknown> = {
        appId: errorRecord.appId,
        timestamp: { $gte: since, $lte: now },
      }

      if (rule.fingerprint) {
        filter.fingerprint = rule.fingerprint
      }
      else if (errorRecord.fingerprint) {
        filter.fingerprint = errorRecord.fingerprint
      }

      if (rule.errorType) {
        filter.errorType = rule.errorType
      }

      const count = await this.errorModel.countDocuments(filter).exec()
      if (count < rule.threshold) {
        return null
      }

      return {
        metric: 'error_frequency',
        score: this.severityToScore(rule.severity),
        severity: rule.severity,
        summary: `${rule.name} 告警触发`,
        findings: [`窗口 ${rule.windowSec}s 内命中 ${count} 次，阈值 ${rule.threshold}`],
        dedupeKey: this.buildCustomRuleDedupeKey(rule, errorRecord),
        suppressSec: rule.suppressSec ?? rule.windowSec,
        ruleId: this.getRuleId(rule),
        ruleName: rule.name,
        windowSec: rule.windowSec,
      }
    }

    if (rule.metric === 'error_spread') {
      const filter: Record<string, unknown> = {
        appId: errorRecord.appId,
        timestamp: { $gte: since, $lte: now },
      }

      if (rule.errorType) {
        filter.errorType = rule.errorType
      }
      else if (errorRecord.errorType) {
        filter.errorType = errorRecord.errorType
      }

      const sessionCount = await this.errorModel
        .distinct('sessionId', filter)
        .then(items => items.filter(Boolean).length)

      if (sessionCount < rule.threshold) {
        return null
      }

      return {
        metric: 'error_spread',
        score: this.severityToScore(rule.severity),
        severity: rule.severity,
        summary: `${rule.name} 告警触发`,
        findings: [`窗口 ${rule.windowSec}s 内影响 ${sessionCount} 个会话，阈值 ${rule.threshold}`],
        dedupeKey: this.buildCustomRuleDedupeKey(rule, errorRecord),
        suppressSec: rule.suppressSec ?? rule.windowSec,
        ruleId: this.getRuleId(rule),
        ruleName: rule.name,
        windowSec: rule.windowSec,
      }
    }

    return null
  }

  private uniqueFindings(findings: AnalysisFinding[]): AnalysisFinding[] {
    const seen = new Set<string>()
    const result: AnalysisFinding[] = []

    for (const finding of findings) {
      if (seen.has(finding.dedupeKey)) {
        continue
      }

      seen.add(finding.dedupeKey)
      result.push(finding)
    }

    return result
  }

  private async buildRootCauseContext(
    errorRecord: ErrorLike,
    findings: AnalysisFinding[],
    analysisScore: number,
    now: Date,
  ): Promise<RootCauseContextResult> {
    const sameFingerprintCount = await this.getSameFingerprintCount(errorRecord, now)
    const spreadSessionCount = await this.getSpreadSessionCount(errorRecord, now)
    const performance = await this.getCorrelatedPerformance(errorRecord, now)
    const replays = await this.getCorrelatedReplays(errorRecord, now)

    const rootCause = this.pickRootCause(
      findings,
      sameFingerprintCount,
      spreadSessionCount,
      performance.length,
    )
    const confidence = this.calculateConfidence(
      analysisScore,
      findings.length,
      performance.length,
      replays.length,
      sameFingerprintCount,
      spreadSessionCount,
    )
    const analysisVersion = 'root-cause-v1'
    const windowStart = new Date(now.getTime() - 10 * 60 * 1000)

    return {
      analysisVersion,
      confidence,
      rootCauseCategory: rootCause.category,
      rootCauseTitle: rootCause.title,
      context: {
        message: errorRecord.message,
        analysisVersion,
        rootCause: {
          category: rootCause.category,
          title: rootCause.title,
          summary: rootCause.summary,
          confidence,
          evidence: rootCause.evidence,
          scoreBreakdown: {
            analysisScore,
            sameFingerprintCount,
            spreadSessionCount,
            performanceCorrelationCount: performance.length,
            replayCorrelationCount: replays.length,
          },
        },
        timeline: {
          errorAt: now.toISOString(),
          windowStart: windowStart.toISOString(),
          windowEnd: now.toISOString(),
        },
        correlations: {
          sameFingerprintCount,
          spreadSessionCount,
          performance,
          replays,
        },
      },
    }
  }

  private async getSameFingerprintCount(errorRecord: ErrorLike, now: Date): Promise<number> {
    if (!errorRecord.fingerprint) {
      return 0
    }

    return this.errorModel.countDocuments({
      appId: errorRecord.appId,
      fingerprint: errorRecord.fingerprint,
      timestamp: {
        $gte: new Date(now.getTime() - 5 * 60 * 1000),
        $lte: now,
      },
    }).exec()
  }

  private async getSpreadSessionCount(errorRecord: ErrorLike, now: Date): Promise<number> {
    if (!errorRecord.errorType) {
      return 0
    }

    const sessions = await this.errorModel.distinct('sessionId', {
      appId: errorRecord.appId,
      errorType: errorRecord.errorType,
      timestamp: {
        $gte: new Date(now.getTime() - 10 * 60 * 1000),
        $lte: now,
      },
    })

    return sessions.filter(Boolean).length
  }

  private async getCorrelatedPerformance(errorRecord: ErrorLike, now: Date): Promise<CorrelatedPerformanceMetric[]> {
    const metrics = await this.performanceModel
      .find({
        appId: errorRecord.appId,
        timestamp: {
          $gte: new Date(now.getTime() - 2 * 60 * 1000),
          $lte: now,
        },
      })
      .sort({ timestamp: -1 })
      .limit(5)
      .lean()
      .exec()

    return metrics.map((metric) => {
      const timestamp = metric.timestamp instanceof Date
        ? metric.timestamp.toISOString()
        : new Date(metric.timestamp).toISOString()

      return {
        metricType: metric.metricType,
        value: metric.value,
        timestamp,
        url: metric.url,
      }
    })
  }

  private async getCorrelatedReplays(errorRecord: ErrorLike, now: Date): Promise<CorrelatedReplaySegment[]> {
    const baseFilter: Record<string, unknown> = {
      appId: errorRecord.appId,
      timestamp: {
        $gte: new Date(now.getTime() - 5 * 60 * 1000),
        $lte: new Date(now.getTime() + 30 * 1000),
      },
    }

    let records = await this.replayModel
      .find({
        ...baseFilter,
        ...(errorRecord.sessionId ? { sessionId: errorRecord.sessionId } : {}),
      })
      .sort({ timestamp: -1 })
      .limit(3)
      .lean()
      .exec()

    if (records.length === 0) {
      records = await this.replayModel
        .find(baseFilter)
        .sort({ timestamp: -1 })
        .limit(3)
        .lean()
        .exec()
    }

    return records.map((record) => {
      const timestamp = record.timestamp instanceof Date
        ? record.timestamp.toISOString()
        : new Date(record.timestamp).toISOString()

      return {
        segmentId: record.segmentId,
        timestamp,
        route: record.route,
        reason: record.reason,
        eventCount: record.eventCount,
        sessionId: record.sessionId,
      }
    })
  }

  private pickRootCause(
    findings: AnalysisFinding[],
    sameFingerprintCount: number,
    spreadSessionCount: number,
    performanceCorrelationCount: number,
  ): RootCausePickResult {
    if (findings.length > 0) {
      const top = [...findings].sort((a, b) => b.score - a.score)[0]
      const summary = top.summary
      const evidence = top.findings.length > 0 ? top.findings : ['命中告警规则但未返回细分证据']

      if (summary.includes('性能')) {
        return {
          category: 'performance_regression',
          title: '性能回归触发异常',
          summary,
          evidence,
        }
      }

      if (summary.includes('扩散') || top.metric === 'error_spread') {
        return {
          category: 'error_spread',
          title: '错误扩散',
          summary,
          evidence,
        }
      }

      if (summary.includes('高频') || top.metric === 'error_frequency') {
        return {
          category: 'error_frequency',
          title: '高频错误',
          summary,
          evidence,
        }
      }

      return {
        category: 'custom_rule',
        title: top.ruleName ? `规则触发：${top.ruleName}` : '自定义规则触发',
        summary,
        evidence,
      }
    }

    if (performanceCorrelationCount > 0) {
      return {
        category: 'performance_regression',
        title: '疑似性能回归',
        summary: '错误发生前存在高密度性能样本，疑似性能回归触发。',
        evidence: ['近期性能样本与错误时间窗口重叠'],
      }
    }

    if (spreadSessionCount >= 2) {
      return {
        category: 'error_spread',
        title: '疑似错误扩散',
        summary: '同类型错误在多个会话中短时间内重复出现。',
        evidence: [`会话扩散数 ${spreadSessionCount}`],
      }
    }

    if (sameFingerprintCount >= 2) {
      return {
        category: 'error_frequency',
        title: '疑似高频错误',
        summary: '同错误指纹在短时间内多次出现。',
        evidence: [`指纹重复次数 ${sameFingerprintCount}`],
      }
    }

    return {
      category: 'unknown',
      title: '未知根因',
      summary: '当前证据不足，建议结合回放与业务日志进一步定位。',
      evidence: ['缺少可判定证据'],
    }
  }

  private calculateConfidence(
    analysisScore: number,
    findingCount: number,
    performanceCount: number,
    replayCount: number,
    sameFingerprintCount: number,
    spreadSessionCount: number,
  ): number {
    const base = analysisScore > 0 ? analysisScore : 35
    const extra
      = (findingCount > 0 ? 8 : 0)
        + (performanceCount > 0 ? 8 : 0)
        + (replayCount > 0 ? 6 : 0)
        + (sameFingerprintCount >= 3 ? 7 : 0)
        + (spreadSessionCount >= 5 ? 7 : 0)

    return this.clamp(Math.round(base * 0.72 + extra), 25, 99)
  }

  private toRootCauseDetail(analysis: ErrorAnalysis & { _id?: unknown }): RootCauseDetail {
    const context = isRecord(analysis.context) ? analysis.context : {}
    const rootCause = isRecord(context.rootCause) ? context.rootCause : {}
    const correlations = isRecord(context.correlations) ? context.correlations : {}
    const timeline = isRecord(context.timeline) ? context.timeline : {}

    const category = this.asString(analysis.rootCauseCategory)
      ?? this.asString(rootCause.category)
      ?? 'unknown'
    const title = this.asString(analysis.rootCauseTitle)
      ?? this.asString(rootCause.title)
      ?? '未知根因'
    const summary = this.asString(rootCause.summary) ?? '暂无根因摘要'
    const confidence = this.clamp(
      this.asNumber(analysis.confidence)
      ?? this.asNumber(rootCause.confidence)
      ?? analysis.score,
      0,
      100,
    )

    const evidence = Array.isArray(rootCause.evidence)
      ? rootCause.evidence.filter(item => typeof item === 'string')
      : []

    const performanceRaw = Array.isArray(correlations.performance) ? correlations.performance : []
    const performance = performanceRaw
      .filter(isRecord)
      .map(item => ({
        metricType: this.asString(item.metricType) ?? 'unknown',
        value: this.asNumber(item.value) ?? 0,
        timestamp: this.asString(item.timestamp) ?? this.toIsoString(analysis.analyzedAt),
        url: this.asString(item.url),
      }))

    const replayRaw = Array.isArray(correlations.replays) ? correlations.replays : []
    const replays = replayRaw
      .filter(isRecord)
      .map(item => ({
        segmentId: this.asString(item.segmentId) ?? '-',
        timestamp: this.asString(item.timestamp) ?? this.toIsoString(analysis.analyzedAt),
        route: this.asString(item.route),
        reason: this.asString(item.reason),
        eventCount: this.asNumber(item.eventCount) ?? 0,
        sessionId: this.asString(item.sessionId),
      }))

    const findings = Array.isArray(analysis.findings)
      ? analysis.findings.filter(item => typeof item === 'string')
      : []

    return {
      analysisId: this.toStringId(analysis._id),
      sourceErrorId: this.toStringId(analysis.sourceErrorId),
      appId: analysis.appId,
      analyzedAt: this.toIsoString(analysis.analyzedAt),
      analysisVersion: this.asString(analysis.analysisVersion)
        ?? this.asString(context.analysisVersion)
        ?? 'root-cause-v1',
      score: analysis.score,
      severity: analysis.severity,
      confidence,
      rootCause: {
        category,
        title,
        summary,
        evidence,
      },
      timeline: {
        errorAt: this.asString(timeline.errorAt) ?? this.toIsoString(analysis.analyzedAt),
        windowStart: this.asString(timeline.windowStart) ?? this.toIsoString(analysis.analyzedAt),
        windowEnd: this.asString(timeline.windowEnd) ?? this.toIsoString(analysis.analyzedAt),
      },
      correlations: {
        sameFingerprintCount: this.asNumber(correlations.sameFingerprintCount) ?? 0,
        spreadSessionCount: this.asNumber(correlations.spreadSessionCount) ?? 0,
        performance,
        replays,
      },
      findings,
    }
  }

  private scoreToSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 90) {
      return 'critical'
    }
    if (score >= 75) {
      return 'high'
    }
    if (score >= 60) {
      return 'medium'
    }
    return 'low'
  }

  private severityToScore(severity: 'low' | 'medium' | 'high' | 'critical'): number {
    if (severity === 'critical') {
      return 95
    }
    if (severity === 'high') {
      return 82
    }
    if (severity === 'medium') {
      return 70
    }
    return 55
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined
  }

  private asNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined
  }

  private toIsoString(value: unknown): string {
    const date = value instanceof Date
      ? value
      : new Date(typeof value === 'string' || typeof value === 'number' ? value : Date.now())

    if (Number.isNaN(date.getTime())) {
      return new Date().toISOString()
    }

    return date.toISOString()
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
  }

  private toStringId(value: unknown): string | undefined {
    if (typeof value === 'string' && value.length > 0) {
      return value
    }

    if (value && typeof value === 'object' && typeof (value as { toString: () => string }).toString === 'function') {
      return (value as { toString: () => string }).toString()
    }

    return undefined
  }

  private getRuleId(rule: AlertRule): string | undefined {
    const doc = rule as unknown as { _id?: unknown }
    return this.toStringId(doc._id)
  }

  private buildCustomRuleDedupeKey(rule: AlertRule, errorRecord: ErrorLike): string {
    const ruleIdOrName = this.getRuleId(rule) ?? this.normalizeKeyPart(rule.name)
    const strategy = rule.dedupeStrategy ?? 'by_rule'

    if (strategy === 'by_error_type') {
      const errorType = this.normalizeKeyPart(rule.errorType ?? errorRecord.errorType)
      return `dedupe:error_type:${errorRecord.appId}:${errorType}`
    }

    if (strategy === 'by_fingerprint') {
      const fingerprint = this.normalizeKeyPart(rule.fingerprint ?? errorRecord.fingerprint)
      return `dedupe:fingerprint:${errorRecord.appId}:${fingerprint}`
    }

    if (strategy === 'by_rule_and_fingerprint') {
      const fingerprint = this.normalizeKeyPart(rule.fingerprint ?? errorRecord.fingerprint)
      return `rule:${ruleIdOrName}:fingerprint:${fingerprint}`
    }

    return `rule:${ruleIdOrName}`
  }

  private normalizeKeyPart(value?: string): string {
    if (!value) {
      return 'unknown'
    }

    const normalized = value.trim()
    if (!normalized) {
      return 'unknown'
    }

    return normalized.replace(/\s+/g, '_')
  }
}
