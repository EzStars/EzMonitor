import type { Model } from 'mongoose'
import type { AlertRule } from '../schemas/alert-rule.schema'
import type { ErrorAnalysis } from '../schemas/error-analysis.schema'
import type { ErrorLog } from '../schemas/error-log.schema'
import type { PerformanceMetric } from '../schemas/performance-metric.schema'
import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { ErrorAnalysis as ErrorAnalysisEntity } from '../schemas/error-analysis.schema'
import { ErrorLog as ErrorLogEntity } from '../schemas/error-log.schema'
import { PerformanceMetric as PerformanceMetricEntity } from '../schemas/performance-metric.schema'
import { AlertEventService } from './alert-event.service'
import { AlertRuleService } from './alert-rule.service'
import { SseBroadcastService } from './sse-broadcast.service'

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

@Injectable()
export class ErrorAnalysisService {
  constructor(
    @InjectModel(ErrorAnalysisEntity.name)
    private readonly analysisModel: Model<ErrorAnalysis>,
    @InjectModel(ErrorLogEntity.name)
    private readonly errorModel: Model<ErrorLog>,
    @InjectModel(PerformanceMetricEntity.name)
    private readonly performanceModel: Model<PerformanceMetric>,
    @Inject(AlertRuleService)
    private readonly alertRuleService: AlertRuleService,
    @Inject(AlertEventService)
    private readonly alertEventService: AlertEventService,
    @Inject(SseBroadcastService)
    private readonly sseBroadcastService: SseBroadcastService,
  ) {}

  async handleErrorRecord(errorRecord: ErrorLike): Promise<void> {
    const findings = await this.evaluateAll(errorRecord)
    const uniqueFindings = this.uniqueFindings(findings)

    const analysisScore = uniqueFindings.length > 0
      ? Math.max(...uniqueFindings.map(item => item.score))
      : 0

    await this.analysisModel.create({
      appId: errorRecord.appId,
      sourceErrorId: this.toStringId(errorRecord._id),
      errorType: errorRecord.errorType,
      fingerprint: errorRecord.fingerprint,
      score: analysisScore,
      severity: this.scoreToSeverity(analysisScore),
      findings: uniqueFindings.flatMap(item => item.findings),
      context: {
        message: errorRecord.message,
      },
      analyzedAt: new Date(),
    })

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
        },
        sourceErrorId: this.toStringId(errorRecord._id),
        dedupeKey: finding.dedupeKey,
      })

      this.sseBroadcastService.emitAlert(created)
    }
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
