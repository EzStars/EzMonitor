import type { ConfigType } from './index';
import type { MonitorSDK } from '../core';

/**
 * 插件上下文
 */
export interface PluginContext {
  config: ConfigType;
  sdk: MonitorSDK;
}

/**
 * 插件接口
 */
export interface Plugin {
  /** 插件名称 */
  name: string;

  /**
   * 插件安装方法
   * @param context 插件上下文
   */
  install(context: PluginContext): void;

  /**
   * 配置更新回调（可选）
   * @param config 新的配置对象
   */
  onConfigUpdate?(config: ConfigType): void;

  /**
   * 插件销毁方法（可选）
   */
  destroy?(): void;
}
