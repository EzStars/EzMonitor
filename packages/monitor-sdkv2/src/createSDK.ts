import { SDKCore } from './core/SDKCore';
import { SDKConfig } from './types/config';
import { IPlugin } from './types/plugin';
import { SDKStatus } from './core/types/core';

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
    use: (plugin: IPlugin, pluginConfig?: Record<string, unknown>) => {
      // 检查 SDK 状态，只允许在 IDLE 或 INITIALIZED 状态下注册插件
      const status = core.getStatus();
      if (
        status !== SDKStatus.IDLE &&
        status !== SDKStatus.INITIALIZED &&
        status !== SDKStatus.STOPPED
      ) {
        throw new Error(
          `Cannot register plugin in SDK status: ${status}. ` +
            `Plugins must be registered before SDK is started.`,
        );
      }

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
