import type { AxiosResponse } from 'axios'
import type { ApiResponse, MonitorQueryParams, MonitorStatsQueryParams } from './api'
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
  getOverviewStats: (params?: MonitorStatsQueryParams) =>
    unwrap(monitorApi.getOverviewStats<OverviewStats>(params)),
  getTrackingStats: (params?: MonitorStatsQueryParams) =>
    unwrap(monitorApi.getTrackingStats<TrackingStatsItem[]>(params)),
  getPerformanceStats: (params?: MonitorStatsQueryParams) =>
    unwrap(monitorApi.getPerformanceStats<PerformanceStatsItem[]>(params)),
  getErrorStats: (params?: MonitorStatsQueryParams) =>
    unwrap(monitorApi.getErrorStats<ErrorStatsItem[]>(params)),
}
