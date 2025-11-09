import type { RetryStrategy } from '../core/types/reporter';

/**
 * SDK 基础配置
 */
export interface SDKConfig {
  /** 应用 ID */
  appId?: string;
  /** 用户 ID */
  userId?: string;
  /** 会话 ID（只读，由 SDK 自动生成）*/
  sessionId?: string;
  /** 上报地址 */
  reportUrl?: string;
  /** 项目名称 */
  projectName?: string;
  /** 批量上报大小 */
  batchSize?: number;
  /** 批量上报间隔（毫秒）*/
  batchInterval?: number;
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 采样率 0-1 */
  sampleRate?: number;
  /** 最大缓存大小 */
  maxCacheSize?: number;
  /** 缓存过期时间（毫秒）*/
  cacheExpireTime?: number;
  /** 是否启用本地存储 */
  enableLocalStorage?: boolean;
  /** 本地存储键名 */
  localStorageKey?: string;

  /** === Reporter 相关配置 === */
  /** 是否启用批量上报（默认 true）*/
  enableBatch?: boolean;
  /** 是否启用离线缓存（默认 true）*/
  enableOfflineCache?: boolean;
  /** 是否强制使用 XHR 上报 */
  forceXHR?: boolean;
  /** 是否启用上报重试 */
  enableRetry?: boolean;
  /** 重试策略配置 */
  retryStrategy?: Partial<RetryStrategy>;
  /** 上报前钩子 */
  beforeReport?: (data: unknown) => void | Promise<void>;
  /** 上报成功钩子 */
  onReportSuccess?: (data: unknown) => void;
  /** 上报失败钩子 */
  onReportError?: (data: unknown, error: Error) => void;
  /** 上报后钩子（无论成功失败）*/
  afterReport?: (data: unknown) => void;

  /** 自定义配置 */
  customConfig?: Record<string, unknown>;
  /** 索引签名，允许动态属性 */
  [key: string]: unknown;
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: Required<
  Pick<
    SDKConfig,
    | 'batchSize'
    | 'batchInterval'
    | 'debug'
    | 'sampleRate'
    | 'maxCacheSize'
    | 'cacheExpireTime'
    | 'enableLocalStorage'
    | 'localStorageKey'
    | 'enableBatch'
    | 'enableOfflineCache'
  >
> = {
  batchSize: 50,
  batchInterval: 10000, // 10秒
  debug: false,
  sampleRate: 1,
  maxCacheSize: 1000,
  cacheExpireTime: 24 * 60 * 60 * 1000, // 24小时
  enableLocalStorage: true,
  localStorageKey: 'ezmonitor_v2_cache',
  enableBatch: true,
  enableOfflineCache: true,
};

/**
 * 配置管理器接口
 */
export interface IConfigManager {
  get<T = unknown>(key: string): T | undefined;
  set(key: string, value: unknown): void;
  merge(config: Partial<SDKConfig>): void;
  getAll(): SDKConfig;
  validate(config: SDKConfig): boolean;
}
