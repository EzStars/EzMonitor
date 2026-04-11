export const ALERT_METRICS = ['error_frequency', 'error_spread'] as const
export type AlertMetric = (typeof ALERT_METRICS)[number]

export const ALERT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number]

export const ALERT_EVENT_STATUSES = ['open', 'acknowledged', 'resolved'] as const
export type AlertEventStatus = (typeof ALERT_EVENT_STATUSES)[number]

export const DEDUPE_STRATEGIES = [
  'by_rule',
  'by_error_type',
  'by_fingerprint',
  'by_rule_and_fingerprint',
] as const
export type DedupeStrategy = (typeof DEDUPE_STRATEGIES)[number]

export interface CreateAlertRuleDto {
  name: string
  appId?: string
  metric: AlertMetric
  windowSec: number
  suppressSec?: number
  dedupeStrategy?: DedupeStrategy
  threshold: number
  severity: AlertSeverity
  enabled?: boolean
  errorType?: string
  fingerprint?: string
}

export interface UpdateAlertRuleDto {
  name?: string
  metric?: AlertMetric
  windowSec?: number
  suppressSec?: number
  dedupeStrategy?: DedupeStrategy
  threshold?: number
  severity?: AlertSeverity
  enabled?: boolean
  errorType?: string
  fingerprint?: string
}

export interface AlertRuleQueryDto {
  appId?: string
  enabled?: boolean
  metric?: AlertMetric
  page?: number
  pageSize?: number
}

export interface AlertEventQueryDto {
  appId?: string
  status?: AlertEventStatus
  startTime?: Date
  endTime?: Date
  page?: number
  pageSize?: number
}

export interface UpdateAlertEventStatusDto {
  status: AlertEventStatus
}

export interface AlertStreamQueryDto {
  appId?: string
  limit?: number
}
