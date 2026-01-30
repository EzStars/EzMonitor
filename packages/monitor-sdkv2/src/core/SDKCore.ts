import type { SDKConfig } from '../types/config'
import type { SystemEvents } from '../types/events'
import type { IPluginManager } from '../types/plugin'
import type { ISDKCore } from './types/core'
import { INTERNAL_EVENTS } from '../types/events'
import { ConfigManager } from './ConfigManager'
import { EventBus } from './EventBus'
import { PluginManager } from './PluginManager'
import { Reporter } from './Reporter'
import { SDKStatus } from './types/core'

/**
 * 生成会话 ID
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * SDK 核心实现
 */
export class SDKCore implements ISDKCore {
  private _status: SDKStatus = SDKStatus.IDLE
  private _sessionId: string
  private _config: SDKConfig
  private _eventBus: EventBus
  private _configManager: ConfigManager
  private _pluginManager: PluginManager
  private _reporter: Reporter

  constructor(initialConfig?: Partial<SDKConfig>) {
    // 生成会话 ID
    this._sessionId = generateSessionId()
    this._eventBus = new EventBus()
    // 创建配置管理器，传入 EventBus
    this._configManager = new ConfigManager(initialConfig, this._eventBus)
    // 获取初始配置并添加 sessionId
    this._config = {} as SDKConfig // 临时初始化
    this.refreshConfig() // 使用统一方法刷新配置
    // 创建插件管理器
    this._pluginManager = new PluginManager(this._eventBus, this._config)
    // 创建 Reporter
    this._reporter = new Reporter(this._config, this._eventBus)

    // 监听配置变更 - 使用 EventBus 而非 DOM 事件
    this.setupConfigListener()
  }

  get status(): SDKStatus {
    return this._status
  }

  get config(): SDKConfig {
    return this._config
  }

  get eventBus(): EventBus {
    return this._eventBus
  }

  get pluginManager(): IPluginManager {
    return this._pluginManager
  }

  get sessionId(): string {
    return this._sessionId
  }

  async init(config?: Partial<SDKConfig>): Promise<void> {
    if (this._status !== SDKStatus.IDLE) {
      throw new Error(`Cannot initialize SDK in status: ${this._status}`)
    }

    // 保存当前配置快照，用于失败时回滚
    const configSnapshot = this._configManager.getAll()
    const previousConfig = { ...this._config }

    this._status = SDKStatus.INITIALIZING

    try {
      // 先验证新配置（合并前）
      if (config) {
        const mergedConfig = { ...configSnapshot, ...config }
        if (!this._configManager.validate(mergedConfig)) {
          throw new Error('Invalid configuration')
        }
        // 验证通过后才合并配置
        this._configManager.merge(config)
        this.refreshConfig() // 使用统一方法刷新配置
      }
      else {
        // 没有新配置，验证当前配置
        if (!this._configManager.validate(this._config)) {
          throw new Error('Invalid configuration')
        }
      }

      // 触发初始化事件
      this._eventBus.emit(INTERNAL_EVENTS.SDK_INIT, { config: this._config })

      // 初始化所有插件
      await this._pluginManager.initAll()

      // 初始化 Reporter
      this._reporter.init()

      this._status = SDKStatus.INITIALIZED

      if (this._config.debug) {
        console.log('[SDKCore] Initialized successfully')
      }
    }
    catch (error) {
      // 初始化失败，回滚所有状态
      this._status = SDKStatus.IDLE

      // 回滚配置到快照状态
      Object.keys(this._configManager.getAll()).forEach((key) => {
        if (configSnapshot[key] !== undefined) {
          this._configManager.set(key, configSnapshot[key])
        }
      })
      this._config = previousConfig

      if (this._config.debug) {
        console.error('[SDKCore] Initialization failed, rolled back:', error)
      }

      throw error
    }
  }

  async start(): Promise<void> {
    if (this._status !== SDKStatus.INITIALIZED) {
      throw new Error(`Cannot start SDK in status: ${this._status}`)
    }

    this._status = SDKStatus.STARTING

    try {
      // 触发启动事件
      this._eventBus.emit(INTERNAL_EVENTS.SDK_START, {})

      // 启动所有插件
      await this._pluginManager.startAll()

      this._status = SDKStatus.STARTED

      if (this._config.debug) {
        console.log('[SDKCore] Started successfully')
      }
    }
    catch (error) {
      this._status = SDKStatus.INITIALIZED
      throw error
    }
  }

  async stop(): Promise<void> {
    if (this._status !== SDKStatus.STARTED) {
      console.warn(`[SDKCore] Cannot stop SDK in status: ${this._status}`)
      return
    }

    this._status = SDKStatus.STOPPING

    try {
      // 触发停止事件
      this._eventBus.emit(INTERNAL_EVENTS.SDK_STOP, {})

      // 停止所有插件
      await this._pluginManager.stopAll()

      this._status = SDKStatus.STOPPED

      if (this._config.debug) {
        console.log('[SDKCore] Stopped successfully')
      }
    }
    catch (error) {
      console.error('[SDKCore] Error during stop:', error)
      this._status = SDKStatus.STARTED // 回滚状态
    }
  }

  async destroy(): Promise<void> {
    if (
      this._status === SDKStatus.DESTROYED
      || this._status === SDKStatus.DESTROYING
    ) {
      return
    }

    const previousStatus = this._status
    this._status = SDKStatus.DESTROYING

    try {
      // 先停止（如果需要）
      if (previousStatus === SDKStatus.STARTED) {
        await this._pluginManager.stopAll()
      }

      // 触发销毁事件
      this._eventBus.emit(INTERNAL_EVENTS.SDK_DESTROY, {})

      // 销毁所有插件
      await this._pluginManager.destroyAll()

      // 销毁 Reporter
      this._reporter.destroy()

      // 清理事件监听器
      this.cleanupConfigListener()

      this._status = SDKStatus.DESTROYED

      if (this._config.debug) {
        console.log('[SDKCore] Destroyed successfully')
      }
    }
    catch (error) {
      console.error('[SDKCore] Error during destroy:', error)
    }
  }

  getStatus(): SDKStatus {
    return this._status
  }

  /**
   * 刷新配置缓存
   * 从 ConfigManager 获取最新配置并添加 sessionId
   */
  private refreshConfig(): void {
    this._config = {
      ...this._configManager.getAll(),
      sessionId: this._sessionId,
    }
  }

  /**
   * 设置配置变更监听器 - 使用 EventBus
   */
  private setupConfigListener(): void {
    this._eventBus.on(INTERNAL_EVENTS.CONFIG_CHANGED, this.handleConfigChange)
  }

  private cleanupConfigListener(): void {
    this._eventBus.off(INTERNAL_EVENTS.CONFIG_CHANGED, this.handleConfigChange)
  }

  private handleConfigChange = (payload: SystemEvents['config:changed']) => {
    const { key, value, oldValue } = payload
    // 更新本地配置缓存
    this.refreshConfig()

    if (this._config.debug) {
      console.log(
        `[SDKCore] Config changed: ${key} = ${value} (was ${oldValue})`,
      )
    }
  }
}
