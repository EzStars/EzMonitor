import type { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { message } from 'antd'
import axios from 'axios'
import {
  ACCESS_TOKEN_STORAGE_KEY,
  AUTH_CURRENT_PROJECT_STORAGE_KEY,
  AUTH_PROJECTS_STORAGE_KEY,
  AUTH_USER_STORAGE_KEY,
} from '../auth/constants'

export interface ApiResponse<T = unknown> {
  code?: number
  message?: string
  data?: T
}

export interface ApiError {
  code: number
  message: string
  details?: unknown
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PaginationResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = globalThis.window?.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)

  if (token) {
    ;(config.headers as Record<string, string>).Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const payload = response.data
    if (payload && typeof payload.code === 'number' && payload.code !== 0 && payload.code !== 200) {
      const error: ApiError = {
        code: payload.code,
        message: payload.message ?? '请求失败',
        details: payload.data,
      }
      message.error(error.message)
      return Promise.reject(error)
    }

    return response
  },
  (error: AxiosError<ApiResponse | unknown>) => {
    const status = error.response?.status ?? -1
    const serverData = error.response?.data as ApiResponse | undefined
    const apiError: ApiError = {
      code: status,
      message: serverData?.message ?? error.message ?? '网络请求失败',
      details: serverData?.data ?? error.response?.data,
    }

    if (status === 401 && globalThis.window) {
      let reason = '会话已失效，请重新登录。'
      if (apiError.message.includes('No accessible project')) {
        reason = '当前账号暂无可访问项目，请联系管理员分配项目权限。'
      }

      globalThis.window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
      globalThis.window.localStorage.removeItem(AUTH_USER_STORAGE_KEY)
      globalThis.window.localStorage.removeItem(AUTH_PROJECTS_STORAGE_KEY)
      globalThis.window.localStorage.removeItem(AUTH_CURRENT_PROJECT_STORAGE_KEY)

      if (!globalThis.window.location.pathname.startsWith('/login')) {
        const next = `${globalThis.window.location.pathname}${globalThis.window.location.search}`
        globalThis.window.location.href = `/login?next=${encodeURIComponent(next)}&reason=${encodeURIComponent(reason)}`
      }
    }

    if (status !== 401) {
      message.error(apiError.message)
    }
    return Promise.reject(apiError)
  },
)

const request = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) => api.get<ApiResponse<T>>(url, config),
  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    api.post<ApiResponse<T>>(url, data, config),
  put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    api.put<ApiResponse<T>>(url, data, config),
  patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    api.patch<ApiResponse<T>>(url, data, config),
  delete: <T = unknown>(url: string, config?: AxiosRequestConfig) => api.delete<ApiResponse<T>>(url, config),
}

export interface MonitorQueryParams extends PaginationParams {
  appId?: string
  startTime?: number
  endTime?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  segmentId?: string
}

export interface MonitorStatsQueryParams {
  appId?: string
  startTime?: number
  endTime?: number
}

export interface RootCauseSummaryQueryParams extends MonitorStatsQueryParams {
  limit?: number
}

export interface AlertRuleQueryParams extends PaginationParams {
  appId?: string
  enabled?: boolean
  metric?: 'error_frequency' | 'error_spread'
}

export interface AlertEventQueryParams extends PaginationParams {
  appId?: string
  status?: 'open' | 'acknowledged' | 'resolved'
  startTime?: number
  endTime?: number
}

export interface LatestAlertQueryParams {
  appId?: string
  limit?: number
}

export const monitorApi = {
  getTracking: <T = unknown>(params?: MonitorQueryParams) =>
    request.get<T>('/api/monitor/tracking', { params }),
  getPerformance: <T = unknown>(params?: MonitorQueryParams) =>
    request.get<T>('/api/monitor/performance', { params }),
  getErrors: <T = unknown>(params?: MonitorQueryParams) =>
    request.get<T>('/api/monitor/error', { params }),
  getReplays: <T = unknown>(params?: MonitorQueryParams) =>
    request.get<T>('/api/monitor/replay', { params }),
  getOverviewStats: <T = unknown>(params?: MonitorStatsQueryParams) =>
    request.get<T>('/api/monitor/stats/overview', { params }),
  getTrackingStats: <T = unknown>(params?: MonitorStatsQueryParams) =>
    request.get<T>('/api/monitor/stats/tracking', { params }),
  getPerformanceStats: <T = unknown>(params?: MonitorStatsQueryParams) =>
    request.get<T>('/api/monitor/stats/performance', { params }),
  getErrorStats: <T = unknown>(params?: MonitorStatsQueryParams) =>
    request.get<T>('/api/monitor/stats/error', { params }),
  getReplayStats: <T = unknown>(params?: MonitorStatsQueryParams) =>
    request.get<T>('/api/monitor/stats/replay', { params }),
  getRootCauseSummary: <T = unknown>(params?: RootCauseSummaryQueryParams) =>
    request.get<T>('/api/monitor/stats/root-cause', { params }),
  getErrorRootCause: <T = unknown>(id: string) =>
    request.get<T>(`/api/monitor/error/${id}/root-cause`),
  getAlertRules: <T = unknown>(params?: AlertRuleQueryParams) =>
    request.get<T>('/api/monitor/alerts/rules', { params }),
  createAlertRule: <T = unknown>(payload: unknown) =>
    request.post<T>('/api/monitor/alerts/rules', payload),
  updateAlertRule: <T = unknown>(id: string, payload: unknown) =>
    request.patch<T>(`/api/monitor/alerts/rules/${id}`, payload),
  deleteAlertRule: <T = unknown>(id: string) =>
    request.delete<T>(`/api/monitor/alerts/rules/${id}`),
  getAlertEvents: <T = unknown>(params?: AlertEventQueryParams) =>
    request.get<T>('/api/monitor/alerts/events', { params }),
  updateAlertEventStatus: <T = unknown>(id: string, status: 'open' | 'acknowledged' | 'resolved') =>
    request.patch<T>(`/api/monitor/alerts/events/${id}/status`, { status }),
  getLatestAlerts: <T = unknown>(params?: LatestAlertQueryParams) =>
    request.get<T>('/api/monitor/events/latest-alerts', { params }),
  postBatch: <T = unknown>(items: unknown[]) =>
    request.post<T>('/api/monitor/batch', { items }),
  postAiAnalyze: <T = unknown>(payload: unknown) =>
    request.post<T>('/api/monitor/ai/analyze', payload),
  getAiStatus: <T = unknown>(params?: { hasClientApiKey?: boolean, apiBaseUrl?: string, model?: string }) =>
    request.get<T>('/api/monitor/ai/status', { params }),
}

export { request }
export default api
