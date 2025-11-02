import { SDKCore } from './core/SDKCore';
import { SDKConfig } from './types/config';
import { IPlugin } from './types/plugin';

/**
 * 创建 SDK 实例的工厂函数
 */
export default function createSDK(config?: Partial<SDKConfig>) {
  const core = new SDKCore(config);

  const sdk = {
    // 核心方法
    init: (additionalConfig?: Partial<SDKConfig>) =>
      core.init(additionalConfig),
    start: () => core.start(),
    stop: () => core.stop(),
    destroy: () => core.destroy(),

    // 插件管理
    use: (plugin: IPlugin, pluginConfig?: Record<string, any>) => {
      core.pluginManager.register(plugin, pluginConfig);
      return sdk; // 支持链式调用
    },

    // 获取核心对象
    getCore: () => core,
    getEventBus: () => core.eventBus,
    getConfig: () => core.config,
    getStatus: () => core.getStatus(),
    getSessionId: () => core.sessionId,
  };

  return sdk;
}
