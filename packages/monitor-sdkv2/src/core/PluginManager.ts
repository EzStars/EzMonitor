import {
  IPlugin,
  IPluginManager,
  PluginRegistration,
  PluginStatus,
} from '../types/plugin';
import { SDKConfig } from '../types/config';
import { EventBus } from './EventBus';
import { INTERNAL_EVENTS } from '../types/events';

/**
 * 插件管理器实现
 */
export class PluginManager implements IPluginManager {
  private plugins = new Map<string, PluginRegistration>();
  private eventBus: EventBus;
  private config: SDKConfig;

  constructor(eventBus: EventBus, config: SDKConfig) {
    this.eventBus = eventBus;
    this.config = config;
  }

  register(plugin: IPlugin, config?: Record<string, unknown>): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} already registered`);
    }

    // 检查依赖
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(
            `Plugin ${plugin.name} depends on ${dep}, but it's not registered`,
          );
        }
      }
    }

    plugin.status = PluginStatus.REGISTERED;
    this.plugins.set(plugin.name, { plugin, config });

    this.eventBus.emit(INTERNAL_EVENTS.PLUGIN_REGISTERED, {
      pluginName: plugin.name,
    });

    if (this.config.debug) {
      console.log(`[PluginManager] Plugin ${plugin.name} registered`);
    }
  }

  unregister(name: string): void {
    const registration = this.plugins.get(name);
    if (!registration) {
      console.warn(`[PluginManager] Plugin ${name} not found`);
      return;
    }

    // 检查是否有其他插件依赖此插件
    for (const [, reg] of this.plugins) {
      if (reg.plugin.dependencies?.includes(name)) {
        throw new Error(
          `Cannot unregister ${name}: ${reg.plugin.name} depends on it`,
        );
      }
    }

    // 如果插件正在运行，先停止并销毁
    if (registration.plugin.status !== PluginStatus.REGISTERED) {
      this.destroyPlugin(registration.plugin);
    }

    this.plugins.delete(name);
  }

  get(name: string): PluginRegistration | undefined {
    return this.plugins.get(name);
  }

  getAll(): PluginRegistration[] {
    return Array.from(this.plugins.values());
  }

  async initAll(): Promise<void> {
    // 按依赖顺序初始化
    const sortedPlugins = this.topologicalSort();

    for (const plugin of sortedPlugins) {
      await this.initPlugin(plugin);
    }
  }

  async startAll(): Promise<void> {
    const sortedPlugins = this.topologicalSort();

    for (const plugin of sortedPlugins) {
      await this.startPlugin(plugin);
    }
  }

  async stopAll(): Promise<void> {
    const sortedPlugins = this.topologicalSort().reverse(); // 逆序停止

    for (const plugin of sortedPlugins) {
      await this.stopPlugin(plugin);
    }
  }

  async destroyAll(): Promise<void> {
    const sortedPlugins = this.topologicalSort().reverse(); // 逆序销毁

    for (const plugin of sortedPlugins) {
      await this.destroyPlugin(plugin);
    }

    this.plugins.clear();
  }

  private async initPlugin(plugin: IPlugin): Promise<void> {
    if (plugin.status !== PluginStatus.REGISTERED) return;

    try {
      await plugin.init?.(this.config, this.eventBus);
      plugin.status = PluginStatus.INITIALIZED;
      this.eventBus.emit(INTERNAL_EVENTS.PLUGIN_INITIALIZED, {
        pluginName: plugin.name,
      });

      if (this.config.debug) {
        console.log(`[PluginManager] Plugin ${plugin.name} initialized`);
      }
    } catch (error) {
      plugin.status = PluginStatus.REGISTERED; // 回滚状态
      this.eventBus.emit(INTERNAL_EVENTS.PLUGIN_ERROR, {
        pluginName: plugin.name,
        error: error as Error,
      });
      throw new Error(`Failed to initialize plugin ${plugin.name}: ${error}`);
    }
  }

  private async startPlugin(plugin: IPlugin): Promise<void> {
    if (plugin.status !== PluginStatus.INITIALIZED) return;

    try {
      await plugin.start?.(this.config, this.eventBus);
      plugin.status = PluginStatus.STARTED;
      this.eventBus.emit(INTERNAL_EVENTS.PLUGIN_STARTED, {
        pluginName: plugin.name,
      });

      if (this.config.debug) {
        console.log(`[PluginManager] Plugin ${plugin.name} started`);
      }
    } catch (error) {
      this.eventBus.emit(INTERNAL_EVENTS.PLUGIN_ERROR, {
        pluginName: plugin.name,
        error: error as Error,
      });
      throw new Error(`Failed to start plugin ${plugin.name}: ${error}`);
    }
  }

  private async stopPlugin(plugin: IPlugin): Promise<void> {
    if (plugin.status !== PluginStatus.STARTED) return;

    try {
      await plugin.stop?.();
      plugin.status = PluginStatus.STOPPED;
      this.eventBus.emit(INTERNAL_EVENTS.PLUGIN_STOPPED, {
        pluginName: plugin.name,
      });

      if (this.config.debug) {
        console.log(`[PluginManager] Plugin ${plugin.name} stopped`);
      }
    } catch (error) {
      this.eventBus.emit(INTERNAL_EVENTS.PLUGIN_ERROR, {
        pluginName: plugin.name,
        error: error as Error,
      });
      console.error(`Failed to stop plugin ${plugin.name}:`, error);
    }
  }

  private async destroyPlugin(plugin: IPlugin): Promise<void> {
    try {
      if (plugin.status === PluginStatus.STARTED) {
        await this.stopPlugin(plugin);
      }

      await plugin.destroy?.();
      plugin.status = PluginStatus.DESTROYED;
      this.eventBus.emit(INTERNAL_EVENTS.PLUGIN_DESTROYED, {
        pluginName: plugin.name,
      });

      if (this.config.debug) {
        console.log(`[PluginManager] Plugin ${plugin.name} destroyed`);
      }
    } catch (error) {
      this.eventBus.emit(INTERNAL_EVENTS.PLUGIN_ERROR, {
        pluginName: plugin.name,
        error: error as Error,
      });
      console.error(`Failed to destroy plugin ${plugin.name}:`, error);
    }
  }

  /**
   * 拓扑排序，确保依赖顺序
   */
  private topologicalSort(): IPlugin[] {
    const result: IPlugin[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (pluginName: string) => {
      if (visited.has(pluginName)) return;
      if (visiting.has(pluginName)) {
        throw new Error(`Circular dependency detected involving ${pluginName}`);
      }

      visiting.add(pluginName);

      const registration = this.plugins.get(pluginName);
      if (!registration) return;

      const { plugin } = registration;

      // 先访问依赖
      if (plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          visit(dep);
        }
      }

      visiting.delete(pluginName);
      visited.add(pluginName);
      result.push(plugin);
    };

    for (const [pluginName] of this.plugins) {
      visit(pluginName);
    }

    return result;
  }
}
