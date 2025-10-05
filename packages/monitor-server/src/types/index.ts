/**
 * 监控数据上报接口类型
 */
export interface MonitorReportData {
  userId: string;
  sendType: 'batch' | 'single';
  data: MonitorDataItem[];
}

/**
 * 监控数据项
 */
export interface MonitorDataItem {
  type: 'error' | 'performance' | 'behavior' | 'exception';
  subType: string;
  time: number;
  pageUrl: string;
  userId?: string;
  uuid?: string;
  apikey?: string;
  sdkVersion?: string;
  [key: string]: any;
}

/**
 * API 响应格式
 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}
