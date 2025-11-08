import { ISDKCore, SDKStatus } from './types/core';
import { SDKConfig } from '../types/config';
import { EventBus } from './EventBus';
import { ConfigManager } from './ConfigManager';
import { PluginManager } from './PluginManager';
import { IPluginManager } from '../types/plugin';
import { DOM_EVENTS, INTERNAL_EVENTS } from '../types/events';

/**
 * 生成会话 ID
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * SDK 核心实现
 */
export class SDKCore implements ISDKCore {
  private _status: SDKStatus = SDKStatus.IDLE;
  private _sessionId: string;
  private _config: SDKConfig;
  private _eventBus: EventBus;
  private _configManager: ConfigManager;
  private _pluginManager: PluginManager;

  constructor(initialConfig?: Partial<SDKConfig>) {
    // 生成会话 ID
    this._sessionId = generateSessionId();
    this._eventBus = new EventBus();
    // 创建配置管理器
    this._configManager = new ConfigManager(initialConfig);
    // 获取初始配置并添加 sessionId
    this._config = {
      ...this._configManager.getAll(),
      sessionId: this._sessionId,
    };
    // 创建插件管理器
    this._pluginManager = new PluginManager(this._eventBus, this._config);

    // 监听配置变更
    this.setupConfigListener();
  }

  get status(): SDKStatus {
    return this._status;
  }

  get config(): SDKConfig {
    return this._config;
  }

  get eventBus(): EventBus {
    return this._eventBus;
  }

  get pluginManager(): IPluginManager {
    return this._pluginManager;
  }

  get sessionId(): string {
    return this._sessionId;
  }

  async init(config?: Partial<SDKConfig>): Promise<void> {
    if (this._status !== SDKStatus.IDLE) {
      throw new Error(`Cannot initialize SDK in status: ${this._status}`);
    }

    this._status = SDKStatus.INITIALIZING;

    try {
      // 合并配置
      if (config) {
        this._configManager.merge(config);
        this._config = {
          ...this._configManager.getAll(),
          sessionId: this._sessionId,
        };
      }

      // 验证配置
      if (!this._configManager.validate(this._config)) {
        throw new Error('Invalid configuration');
      }

      // 触发初始化事件
      this._eventBus.emit(INTERNAL_EVENTS.SDK_INIT, { config: this._config });

      // 初始化所有插件
      await this._pluginManager.initAll();

      this._status = SDKStatus.INITIALIZED;

      if (this._config.debug) {
        console.log('[SDKCore] Initialized successfully');
      }
    } catch (error) {
      this._status = SDKStatus.IDLE;
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this._status !== SDKStatus.INITIALIZED) {
      throw new Error(`Cannot start SDK in status: ${this._status}`);
    }

    this._status = SDKStatus.STARTING;

    try {
      // 触发启动事件
      this._eventBus.emit(INTERNAL_EVENTS.SDK_START, {});

      // 启动所有插件
      await this._pluginManager.startAll();

      this._status = SDKStatus.STARTED;

      if (this._config.debug) {
        console.log('[SDKCore] Started successfully');
      }
    } catch (error) {
      this._status = SDKStatus.INITIALIZED;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this._status !== SDKStatus.STARTED) {
      console.warn(`[SDKCore] Cannot stop SDK in status: ${this._status}`);
      return;
    }

    this._status = SDKStatus.STOPPING;

    try {
      // 触发停止事件
      this._eventBus.emit(INTERNAL_EVENTS.SDK_STOP, {});

      // 停止所有插件
      await this._pluginManager.stopAll();

      this._status = SDKStatus.STOPPED;

      if (this._config.debug) {
        console.log('[SDKCore] Stopped successfully');
      }
    } catch (error) {
      console.error('[SDKCore] Error during stop:', error);
      this._status = SDKStatus.STARTED; // 回滚状态
    }
  }

  async destroy(): Promise<void> {
    if (
      this._status === SDKStatus.DESTROYED ||
      this._status === SDKStatus.DESTROYING
    ) {
      return;
    }

    const previousStatus = this._status;
    this._status = SDKStatus.DESTROYING;

    try {
      // 先停止（如果需要）
      if (previousStatus === SDKStatus.STARTED) {
        await this._pluginManager.stopAll();
      }

      // 触发销毁事件
      this._eventBus.emit(INTERNAL_EVENTS.SDK_DESTROY, {});

      // 销毁所有插件
      await this._pluginManager.destroyAll();

      // 清理事件监听器
      this.cleanupConfigListener();

      this._status = SDKStatus.DESTROYED;

      if (this._config.debug) {
        console.log('[SDKCore] Destroyed successfully');
      }
    } catch (error) {
      console.error('[SDKCore] Error during destroy:', error);
    }
  }

  getStatus(): SDKStatus {
    return this._status;
  }
  /**
   * 设置配置变更监听器
   */
  private setupConfigListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener(
        DOM_EVENTS.CONFIG_CHANGED,
        this.handleConfigChange as EventListener,
      );
    }
  }

  private cleanupConfigListener(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener(
        DOM_EVENTS.CONFIG_CHANGED,
        this.handleConfigChange as EventListener,
      );
    }
  }

  private handleConfigChange = (event: Event) => {
    const customEvent = event as CustomEvent;
    const { key, value, oldValue } = customEvent.detail;
    this._config = {
      ...this._configManager.getAll(),
      sessionId: this._sessionId,
    };
    this._eventBus.emit(INTERNAL_EVENTS.CONFIG_CHANGED, {
      key,
      value,
      oldValue,
    });
  };
}
