/**
 * 性能监控 WebSocket 事件定义
 */
export const PerformanceEvents = {
  // 客户端订阅
  SUBSCRIBE: 'performance:subscribe',
  UNSUBSCRIBE: 'performance:unsubscribe',

  // 服务端推送 - 按类型推送
  FP: 'performance:fp', // First Paint
  FCP: 'performance:fcp', // First Contentful Paint
  LCP: 'performance:lcp', // Largest Contentful Paint
  LOAD: 'performance:load', // 页面加载完成
  FETCH: 'performance:fetch', // Fetch 请求
  XHR: 'performance:xhr', // XHR 请求
  RESOURCE: 'performance:resource', // 资源加载

  // 统计数据推送
  STATS: 'performance:stats', // 实时统计数据
  SLOW_REQUEST: 'performance:slow-request', // 慢请求告警
  ERROR_REQUEST: 'performance:error-request', // 错误请求告警
};
