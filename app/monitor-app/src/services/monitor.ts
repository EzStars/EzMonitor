import type { AxiosResponse } from 'axios'
import type {
  AlertEventQueryParams,
  AlertRuleQueryParams,
  ApiResponse,
  LatestAlertQueryParams,
  MonitorQueryParams,
  MonitorStatsQueryParams,
  RootCauseSummaryQueryParams,
} from './api'
import { monitorApi } from './api'

export interface MonitorListResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface OverviewStats {
  tracking: number
  performance: number
  error: number
  replay: number
  total: number
}

export interface TrackingStatsItem {
  eventName: string
  count: number
}

export interface PerformanceStatsItem {
  metricType: string
  count: number
  avgValue: number
  minValue: number
  maxValue: number
  p95Value: number
}

export interface ErrorStatsItem {
  errorType: string
  count: number
}

export interface ReplayStatsItem {
  route: string
  count: number
}

export interface TrackingRecord {
  _id?: string
  appId: string
  timestamp: string | number | Date
  eventName: string
  properties?: Record<string, unknown>
  context?: Record<string, unknown>
  userId?: string
  createdAt?: string | number | Date
  updatedAt?: string | number | Date
}

export interface PerformanceRecord {
  _id?: string
  appId: string
  timestamp: string | number | Date
  metricType: string
  value: number
  url?: string
  extra?: Record<string, unknown>
  context?: Record<string, unknown>
  createdAt?: string | number | Date
  updatedAt?: string | number | Date
}

export interface ErrorRecord {
  frames?: Array<{
    file?: string
    line?: number
    column?: number
    functionName?: string
    raw?: string
    originalFile?: string
    originalLine?: number
    originalColumn?: number
    originalFunctionName?: string
  }>
  _id?: string
  appId: string
  timestamp: string | number | Date
  errorType?: string
  message: string
  stack?: string
  url?: string
  userAgent?: string
  release?: string
  appVersion?: string
  symbolicationStatus?: 'symbolicated' | 'partial' | 'failed' | 'skipped'
  symbolicationReason?: string
  createdAt?: string | number | Date
  updatedAt?: string | number | Date
  detail?: Record<string, unknown>
}

export interface ReplayRecord {
  _id?: string
  appId: string
  timestamp: string | number | Date
  mode?: 'native' | 'rrweb'
  segmentId: string
  startedAt: string | number | Date
  endedAt: string | number | Date
  eventCount: number
  route?: string
  reason?: string
  sample?: Array<Record<string, unknown>>
  rrwebEvents?: Array<Record<string, unknown>>
  context?: Record<string, unknown>
  userId?: string
  sessionId?: string
  createdAt?: string | number | Date
  updatedAt?: string | number | Date
}

export interface RootCauseDetail {
  analysisId?: string
  sourceErrorId?: string
  appId: string
  analyzedAt: string
  analysisVersion: string
  score: number
  severity: AlertSeverity
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
    performance: Array<{
      metricType: string
      value: number
      timestamp: string
      url?: string
    }>
    replays: Array<{
      segmentId: string
      timestamp: string
      route?: string
      reason?: string
      eventCount: number
      sessionId?: string
    }>
  }
  findings: string[]
}

export interface RootCauseSummaryItem {
  category: string
  title: string
  severity: AlertSeverity
  count: number
  avgConfidence: number
  lastAnalyzedAt: string
}

export type AlertMetric = 'error_frequency' | 'error_spread'
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'
export type AlertEventStatus = 'open' | 'acknowledged' | 'resolved'
export type AlertDedupeStrategy = 'by_rule' | 'by_error_type' | 'by_fingerprint' | 'by_rule_and_fingerprint'

export interface AlertRuleRecord {
  _id?: string
  name: string
  appId?: string
  metric: AlertMetric
  windowSec: number
  suppressSec?: number
  dedupeStrategy?: AlertDedupeStrategy
  threshold: number
  severity: AlertSeverity
  enabled: boolean
  errorType?: string
  fingerprint?: string
  createdAt?: string | number | Date
  updatedAt?: string | number | Date
}

export interface AlertEventRecord {
  _id?: string
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
  suppressionHits?: number
  status: AlertEventStatus
  triggeredAt: string | number | Date
  createdAt?: string | number | Date
  updatedAt?: string | number | Date
}

export interface CreateAlertRulePayload {
  name: string
  appId?: string
  metric: AlertMetric
  windowSec: number
  suppressSec?: number
  dedupeStrategy?: AlertDedupeStrategy
  threshold: number
  severity: AlertSeverity
  enabled?: boolean
  errorType?: string
  fingerprint?: string
}

export interface UpdateAlertRulePayload {
  name?: string
  metric?: AlertMetric
  windowSec?: number
  suppressSec?: number
  dedupeStrategy?: AlertDedupeStrategy
  threshold?: number
  severity?: AlertSeverity
  enabled?: boolean
  errorType?: string
  fingerprint?: string
}

async function unwrap<T>(promise: Promise<AxiosResponse<ApiResponse<T>>>): Promise<T> {
  const response = await promise
  return response.data.data as T
}

export const monitorService = {
  getTracking: (params?: MonitorQueryParams) =>
    unwrap(monitorApi.getTracking<MonitorListResult<TrackingRecord>>(params)),
  getPerformance: (params?: MonitorQueryParams) =>
    unwrap(monitorApi.getPerformance<MonitorListResult<PerformanceRecord>>(params)),
  getErrors: (params?: MonitorQueryParams) =>
    unwrap(monitorApi.getErrors<MonitorListResult<ErrorRecord>>(params)),
  getReplays: (params?: MonitorQueryParams) =>
    unwrap(monitorApi.getReplays<MonitorListResult<ReplayRecord>>(params)),
  getOverviewStats: (params?: MonitorStatsQueryParams) =>
    unwrap(monitorApi.getOverviewStats<OverviewStats>(params)),
  getTrackingStats: (params?: MonitorStatsQueryParams) =>
    unwrap(monitorApi.getTrackingStats<TrackingStatsItem[]>(params)),
  getPerformanceStats: (params?: MonitorStatsQueryParams) =>
    unwrap(monitorApi.getPerformanceStats<PerformanceStatsItem[]>(params)),
  getErrorStats: (params?: MonitorStatsQueryParams) =>
    unwrap(monitorApi.getErrorStats<ErrorStatsItem[]>(params)),
  getReplayStats: (params?: MonitorStatsQueryParams) =>
    unwrap(monitorApi.getReplayStats<ReplayStatsItem[]>(params)),
  getRootCauseSummary: (params?: RootCauseSummaryQueryParams) =>
    unwrap(monitorApi.getRootCauseSummary<RootCauseSummaryItem[]>(params)),
  getErrorRootCause: (id: string) =>
    unwrap(monitorApi.getErrorRootCause<RootCauseDetail | null>(id)),
  getAlertRules: (params?: AlertRuleQueryParams) =>
    unwrap(monitorApi.getAlertRules<MonitorListResult<AlertRuleRecord>>(params)),
  createAlertRule: (payload: CreateAlertRulePayload) =>
    unwrap(monitorApi.createAlertRule<AlertRuleRecord>(payload)),
  updateAlertRule: (id: string, payload: UpdateAlertRulePayload) =>
    unwrap(monitorApi.updateAlertRule<AlertRuleRecord>(id, payload)),
  deleteAlertRule: (id: string) =>
    unwrap(monitorApi.deleteAlertRule<{ id: string }>(id)),
  getAlertEvents: (params?: AlertEventQueryParams) =>
    unwrap(monitorApi.getAlertEvents<MonitorListResult<AlertEventRecord>>(params)),
  updateAlertEventStatus: (id: string, status: AlertEventStatus) =>
    unwrap(monitorApi.updateAlertEventStatus<AlertEventRecord>(id, status)),
  getLatestAlerts: (params?: LatestAlertQueryParams) =>
    unwrap(monitorApi.getLatestAlerts<AlertEventRecord[]>(params)),
}
