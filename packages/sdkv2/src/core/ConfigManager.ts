import { SDKConfig, DEFAULT_CONFIG, IConfigManager } from '../types/config';
import { DOM_EVENTS } from '../types/events';

/**
 * 配置管理器实现
 */
export class ConfigManager implements IConfigManager {
  private config: SDKConfig = {};

  constructor(initialConfig?: Partial<SDKConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...initialConfig };
  }

  get<T = any>(key: string): T | undefined {
    return this.config[key] as T;
  }

  set(key: string, value: any): void {
    const oldValue = this.config[key];
    this.config[key] = value;

    // 触发配置变更事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(DOM_EVENTS.CONFIG_CHANGED, {
          detail: { key, value, oldValue },
        }),
      );
    }
  }

  merge(config: Partial<SDKConfig>): void {
    Object.keys(config).forEach(key => {
      this.set(key, config[key]);
    });
  }

  getAll(): SDKConfig {
    return { ...this.config };
  }

  validate(config: SDKConfig): boolean {
    // 基础验证
    if (config.appId && typeof config.appId !== 'string') {
      console.error('[ConfigManager] appId must be string');
      return false;
    }

    if (
      config.sampleRate !== undefined &&
      (config.sampleRate < 0 || config.sampleRate > 1)
    ) {
      console.error('[ConfigManager] sampleRate must be between 0 and 1');
      return false;
    }

    if (config.batchSize !== undefined && config.batchSize <= 0) {
      console.error('[ConfigManager] batchSize must be positive');
      return false;
    }

    return true;
  }
}
