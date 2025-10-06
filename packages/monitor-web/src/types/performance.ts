/**
 * 性能监控数据类型定义
 */

/**
 * 性能监控基础数据结构
 */
export interface BasePerformanceData {
  id: string;
  appId: string;
  userId: string;
  type: 'performance';
  timestamp: number;
  pageUrl: string;
  userAgent?: string;
  ip?: string;
}

/**
 * FP (First Paint) - 首次绘制
 */
export interface FPData extends BasePerformanceData {
  subType: 'fp';
  startTime: number;
  duration: number;
}

/**
 * FCP (First Contentful Paint) - 首次内容绘制
 */
export interface FCPData extends BasePerformanceData {
  subType: 'fcp';
  startTime: number;
  duration: number;
}

/**
 * LCP (Largest Contentful Paint) - 最大内容绘制
 */
export interface LCPData extends BasePerformanceData {
  subType: 'lcp';
  startTime: number;
  duration: number;
  size: number;
  element?: string;
}

/**
 * Load - 页面完全加载
 */
export interface LoadData extends BasePerformanceData {
  subType: 'load';
  startTime: number;
  duration: number;
  dns?: number;
  tcp?: number;
  ssl?: number;
  ttfb?: number;
  trans?: number;
  domParse?: number;
  res?: number;
}

/**
 * Fetch 请求
 */
export interface FetchData extends BasePerformanceData {
  subType: 'fetch';
  name: string;
  method: string;
  duration: number;
  startTime: number;
  status: number;
  statusText?: string;
  params?: string;
  response?: string;
}

/**
 * XHR 请求
 */
export interface XHRData extends BasePerformanceData {
  subType: 'xhr';
  name: string;
  method: string;
  duration: number;
  startTime: number;
  status: number;
  statusText?: string;
  params?: string;
  response?: string;
}

/**
 * 资源加载
 */
export interface ResourceData extends BasePerformanceData {
  subType: 'resource';
  name: string;
  duration: number;
  startTime: number;
  resourceType: string;
  size?: number;
  protocol?: string;
}

/**
 * 长任务
 */
export interface LongTaskData extends BasePerformanceData {
  subType: 'long-task';
  duration: number;
  startTime: number;
  attribution?: string;
}

/**
 * 所有性能数据类型的联合类型
 */
export type PerformanceData =
  | FPData
  | FCPData
  | LCPData
  | LoadData
  | FetchData
  | XHRData
  | ResourceData
  | LongTaskData;

/**
 * 性能统计数据
 */
export interface PerformanceStats {
  total: number;
  fp?: {
    count: number;
    avg: number;
    min: number;
    max: number;
  };
  fcp?: {
    count: number;
    avg: number;
    min: number;
    max: number;
  };
  lcp?: {
    count: number;
    avg: number;
    min: number;
    max: number;
  };
  load?: {
    count: number;
    avg: number;
    min: number;
    max: number;
  };
  fetch?: {
    count: number;
    avg: number;
    min: number;
    max: number;
    successRate: number;
  };
  xhr?: {
    count: number;
    avg: number;
    min: number;
    max: number;
    successRate: number;
  };
  resource?: {
    count: number;
    avg: number;
    min: number;
    max: number;
    totalSize: number;
  };
  'long-task'?: {
    count: number;
    avg: number;
    min: number;
    max: number;
  };
}

/**
 * 获取性能列表的查询参数
 */
export interface GetPerformanceListParams {
  appId: string;
  subType?: string;
  limit?: number;
  startTime?: number;
  endTime?: number;
}

/**
 * 获取性能列表的响应数据
 */
export interface GetPerformanceListResponse {
  total: number;
  list: PerformanceData[];
}

/**
 * 获取性能统计的查询参数
 */
export interface GetPerformanceStatsParams {
  appId: string;
  startTime?: number;
  endTime?: number;
}

/**
 * 获取性能趋势的查询参数
 */
export interface GetPerformanceTrendParams {
  appId: string;
  subType: string;
  interval?: number;
  startTime?: number;
  endTime?: number;
}

/**
 * 性能趋势数据点
 */
export interface PerformanceTrendPoint {
  timestamp: number;
  avg: number;
  min: number;
  max: number;
  count: number;
}

/**
 * 获取性能趋势的响应数据
 */
export interface GetPerformanceTrendResponse {
  subType: string;
  data: PerformanceTrendPoint[];
}
