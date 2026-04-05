export class CreatePerformanceMetricDto {
  appId: string
  timestamp: Date
  metricType: string
  value: number
  url?: string
  extra?: Record<string, unknown>
  context?: Record<string, unknown>
}
