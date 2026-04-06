export type PerformanceMetricName
  = | 'fp'
    | 'fcp'
    | 'ttfb'
    | 'lcp'
    | 'cls'
    | 'inp'

export interface PerformancePluginConfig {
  observePaint?: boolean
  observeNavigation?: boolean
  observeLCP?: boolean
  observeCLS?: boolean
  observeINP?: boolean
  flushOnHidden?: boolean
  metricFilter?: (metricType: PerformanceMetricName, payload: Record<string, unknown>) => boolean
}
