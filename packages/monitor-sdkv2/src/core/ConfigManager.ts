import type { IConfigManager, SDKConfig } from '../types/config'
import type { EventBus } from './EventBus'
import { DEFAULT_CONFIG } from '../types/config'
import { INTERNAL_EVENTS } from '../types/events'

/**
 * 配置管理器实现
 */
export class ConfigManager implements IConfigManager {
  private config: SDKConfig = {}
  private eventBus?: EventBus

  constructor(initialConfig?: Partial<SDKConfig>, eventBus?: EventBus) {
    this.config = { ...DEFAULT_CONFIG, ...initialConfig }
    this.eventBus = eventBus
  }

  get<T = unknown>(key: string): T | undefined {
    return this.config[key] as T
  }

  set(key: string, value: unknown): void {
    const oldValue = this.config[key]
    this.config[key] = value

    // 触发配置变更事件 - 使用内部 EventBus 而非 DOM 事件
    if (this.eventBus) {
      this.eventBus.emit(INTERNAL_EVENTS.CONFIG_CHANGED, {
        key,
        value,
        oldValue,
      })
    }
  }

  merge(config: Partial<SDKConfig>): void {
    Object.keys(config).forEach((key) => {
      this.set(key, config[key])
    })
  }

  getAll(): SDKConfig {
    return { ...this.config }
  }

  validate(config: SDKConfig): boolean {
    // 验证 appId
    if (config.appId && typeof config.appId !== 'string') {
      console.error('[ConfigManager] appId must be string')
      return false
    }

    // 验证 reportUrl
    if (config.reportUrl) {
      if (typeof config.reportUrl !== 'string') {
        console.error('[ConfigManager] reportUrl must be string')
        return false
      }
      // 验证 URL 格式
      try {
        new URL(config.reportUrl)
      }
      catch {
        console.error('[ConfigManager] reportUrl must be a valid URL')
        return false
      }
    }

    // 验证 userId
    if (config.userId && typeof config.userId !== 'string') {
      console.error('[ConfigManager] userId must be string')
      return false
    }

    // 验证 projectName
    if (config.projectName && typeof config.projectName !== 'string') {
      console.error('[ConfigManager] projectName must be string')
      return false
    }

    // 验证 采样率
    if (
      config.sampleRate !== undefined
      && (typeof config.sampleRate !== 'number'
        || config.sampleRate < 0
        || config.sampleRate > 1)
    ) {
      console.error('[ConfigManager] sampleRate must be between 0 and 1')
      return false
    }

    // 验证 批量上报大小
    if (
      config.batchSize !== undefined
      && (typeof config.batchSize !== 'number' || config.batchSize <= 0)
    ) {
      console.error('[ConfigManager] batchSize must be positive number')
      return false
    }

    // 验证 批量上报间隔
    if (
      config.batchInterval !== undefined
      && (typeof config.batchInterval !== 'number' || config.batchInterval <= 0)
    ) {
      console.error('[ConfigManager] batchInterval must be positive number')
      return false
    }

    // 验证 最大缓存大小
    if (
      config.maxCacheSize !== undefined
      && (typeof config.maxCacheSize !== 'number' || config.maxCacheSize <= 0)
    ) {
      console.error('[ConfigManager] maxCacheSize must be positive number')
      return false
    }

    // 验证 缓存过期时间
    if (
      config.cacheExpireTime !== undefined
      && (typeof config.cacheExpireTime !== 'number'
        || config.cacheExpireTime <= 0)
    ) {
      console.error('[ConfigManager] cacheExpireTime must be positive number')
      return false
    }

    // 验证 debug 标志
    if (config.debug !== undefined && typeof config.debug !== 'boolean') {
      console.error('[ConfigManager] debug must be boolean')
      return false
    }

    // 验证 enableLocalStorage 标志
    if (
      config.enableLocalStorage !== undefined
      && typeof config.enableLocalStorage !== 'boolean'
    ) {
      console.error('[ConfigManager] enableLocalStorage must be boolean')
      return false
    }

    // 验证 localStorageKey
    if (config.localStorageKey && typeof config.localStorageKey !== 'string') {
      console.error('[ConfigManager] localStorageKey must be string')
      return false
    }

    return true
  }
}
