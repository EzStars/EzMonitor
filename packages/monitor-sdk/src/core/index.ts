import { setConfig, getConfig } from './config/config';
import type { ConfigType, Plugin, PluginContext } from '../types';

class MonitorSDK {
  private isInitialized: boolean = false;
  private plugins: Plugin[] = [];
  private static instance: MonitorSDK | null = null;

  private constructor() {
    // 私有构造函数确保单例模式
  }

  /**
   * 获取 SDK 单例实例
   */
  public static getInstance(): MonitorSDK {
    if (!MonitorSDK.instance) {
      MonitorSDK.instance = new MonitorSDK();
    }
    return MonitorSDK.instance;
  }

  /**
   * 初始化 SDK
   * @param config 配置对象
   */
  public init(config?: Partial<ConfigType>): void {
    if (this.isInitialized) {
      console.warn('MonitorSDK has already been initialized');
      return;
    }

    // 合并配置
    if (config) {
      setConfig(config);
    }

    // 初始化所有已注册的插件
    this.initializePlugins();

    this.isInitialized = true;
    console.log('MonitorSDK initialized successfully');
  }

  /**
   * 注册插件
   * @param plugin 插件实例
   */
  public use(plugin: Plugin): MonitorSDK {
    if (!plugin || typeof plugin.install !== 'function') {
      console.error('Invalid plugin: must have an install method');
      return this;
    }

    // 检查插件是否已注册
    if (this.plugins.some(p => p.name === plugin.name)) {
      console.warn(`Plugin ${plugin.name} has already been registered`);
      return this;
    }

    this.plugins.push(plugin);

    // 如果 SDK 已经初始化，立即初始化插件
    if (this.isInitialized) {
      this.initializePlugin(plugin);
    }

    return this;
  }

  /**
   * 获取当前配置
   */
  public getConfig(): ConfigType {
    return getConfig();
  }

  /**
   * 更新配置
   * @param config 新的配置项
   */
  public setConfig(config: Partial<ConfigType>): void {
    setConfig(config);
    // 通知所有插件配置已更新
    this.notifyConfigUpdate();
  }

  /**
   * 获取已注册的插件列表
   */
  public getPlugins(): Plugin[] {
    return [...this.plugins];
  }

  /**
   * 销毁 SDK
   */
  public destroy(): void {
    // 销毁所有插件
    this.plugins.forEach(plugin => {
      if (plugin.destroy && typeof plugin.destroy === 'function') {
        try {
          plugin.destroy();
        } catch (error) {
          console.error(`Error destroying plugin ${plugin.name}:`, error);
        }
      }
    });

    this.plugins = [];
    this.isInitialized = false;
    MonitorSDK.instance = null;
  }

  /**
   * 初始化所有插件
   */
  private initializePlugins(): void {
    this.plugins.forEach(plugin => {
      this.initializePlugin(plugin);
    });
  }

  /**
   * 初始化单个插件
   * @param plugin 插件实例
   */
  private initializePlugin(plugin: Plugin): void {
    try {
      const context: PluginContext = {
        config: getConfig(),
        sdk: this,
      };
      plugin.install(context);
      console.log(`Plugin ${plugin.name} installed successfully`);
    } catch (error) {
      console.error(`Error installing plugin ${plugin.name}:`, error);
    }
  }

  /**
   * 通知所有插件配置已更新
   */
  private notifyConfigUpdate(): void {
    this.plugins.forEach(plugin => {
      if (
        plugin.onConfigUpdate &&
        typeof plugin.onConfigUpdate === 'function'
      ) {
        try {
          plugin.onConfigUpdate(getConfig());
        } catch (error) {
          console.error(
            `Error notifying config update to plugin ${plugin.name}:`,
            error,
          );
        }
      }
    });
  }
}

// 导出单例实例
export default MonitorSDK.getInstance();
export { MonitorSDK };
