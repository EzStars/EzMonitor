import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { message } from 'antd'

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
  const token = globalThis.window?.localStorage.getItem('token')

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

    message.error(apiError.message)
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
}

export interface MonitorStatsQueryParams {
  appId?: string
  startTime?: number
  endTime?: number
}

export const monitorApi = {
  getTracking: <T = unknown>(params?: MonitorQueryParams) =>
    request.get<T>('/api/monitor/tracking', { params }),
  getPerformance: <T = unknown>(params?: MonitorQueryParams) =>
    request.get<T>('/api/monitor/performance', { params }),
  getErrors: <T = unknown>(params?: MonitorQueryParams) =>
    request.get<T>('/api/monitor/error', { params }),
  getOverviewStats: <T = unknown>(params?: MonitorStatsQueryParams) =>
    request.get<T>('/api/monitor/stats/overview', { params }),
  getTrackingStats: <T = unknown>(params?: MonitorStatsQueryParams) =>
    request.get<T>('/api/monitor/stats/tracking', { params }),
  getPerformanceStats: <T = unknown>(params?: MonitorStatsQueryParams) =>
    request.get<T>('/api/monitor/stats/performance', { params }),
  getErrorStats: <T = unknown>(params?: MonitorStatsQueryParams) =>
    request.get<T>('/api/monitor/stats/error', { params }),
}

export { request }
export default api
