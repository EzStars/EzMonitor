/**
 * SDK 基础配置
 */
export interface SDKConfig {
  /** 应用 ID */
  appId?: string;
  /** 用户 ID */
  userId?: string;
  /** 上报地址 */
  reportUrl?: string;
  /** 项目名称 */
  projectName?: string;
  /** 批量上报大小 */
  batchSize?: number;
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
  /** 自定义配置 */
  [key: string]: any;
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: Required<
  Pick<
    SDKConfig,
    | 'batchSize'
    | 'debug'
    | 'sampleRate'
    | 'maxCacheSize'
    | 'cacheExpireTime'
    | 'enableLocalStorage'
    | 'localStorageKey'
  >
> = {
  batchSize: 10,
  debug: false,
  sampleRate: 1,
  maxCacheSize: 100,
  cacheExpireTime: 24 * 60 * 60 * 1000, // 24小时
  enableLocalStorage: true,
  localStorageKey: 'ezmonitor_v2_cache',
};

/**
 * 配置管理器接口
 */
export interface IConfigManager {
  get<T = any>(key: string): T | undefined;
  set(key: string, value: any): void;
  merge(config: Partial<SDKConfig>): void;
  getAll(): SDKConfig;
  validate(config: SDKConfig): boolean;
}
