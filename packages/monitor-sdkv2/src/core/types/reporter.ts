/**
 * Reporter 模块类型定义
 */

/**
 * 传输方式类型
 */
export enum TransportType {
  /** sendBeacon API */
  BEACON = 'beacon',
  /** XMLHttpRequest */
  XHR = 'xhr',
  /** Image 请求 */
  IMAGE = 'image',
}

/**
 * 上报数据包装类型
 */
export interface ReportPayload {
  /** 原始数据 */
  data: unknown;
  /** 数据类型 */
  type?: string;
  /** 用户 ID */
  userId?: string;
  /** 会话 ID */
  sessionId?: string;
  /** 应用 ID */
  appId?: string;
  /** 时间戳 */
  timestamp?: number;
  /** 传输方式 */
  sendType?: TransportType;
}

/**
 * 上报响应类型
 */
export interface ReportResponse {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: unknown;
  /** 错误信息 */
  error?: Error;
  /** 使用的传输方式 */
  transportType: TransportType;
}

/**
 * 重试策略配置
 */
export interface RetryStrategy {
  /** 最大重试次数 */
  maxRetries: number;
  /** 初始延迟（毫秒）*/
  initialDelay: number;
  /** 延迟倍数（指数退避）*/
  backoffMultiplier: number;
  /** 最大延迟（毫秒）*/
  maxDelay: number;
}

/**
 * Reporter 配置接口
 */
export interface ReporterConfig {
  /** 上报地址 */
  url: string;
  /** 是否强制使用 XHR */
  forceXHR?: boolean;
  /** 是否启用重试 */
  enableRetry?: boolean;
  /** 重试策略 */
  retryStrategy?: Partial<RetryStrategy>;
  /** 上报前钩子 */
  beforeReport?: (data: unknown) => void | Promise<void>;
  /** 上报成功钩子 */
  onSuccess?: (data: unknown) => void;
  /** 上报失败钩子 */
  onError?: (data: unknown, error: Error) => void;
  /** 上报后钩子（无论成功失败）*/
  afterReport?: (data: unknown) => void;
}

/**
 * 待上报数据项
 */
export interface PendingReportItem {
  /** 数据内容 */
  payload: ReportPayload;
  /** 重试次数 */
  retries: number;
  /** 下次重试时间 */
  nextRetryTime: number;
}

/**
 * Reporter 接口
 */
export interface IReporter {
  /**
   * 初始化 Reporter
   */
  init(): void;

  /**
   * 上报单条数据
   * @param data 数据内容
   * @param type 数据类型
   */
  report(data: unknown, type?: string): Promise<ReportResponse>;

  /**
   * 批量上报数据
   * @param items 数据数组
   */
  reportBatch(items: unknown[]): Promise<ReportResponse>;

  /**
   * 销毁 Reporter，清理资源
   */
  destroy(): void;

  /**
   * 手动触发重试失败的数据
   */
  retryFailed(): Promise<void>;
}
