import type { IPlugin, PluginStatus } from '../../types/plugin';
import type { SDKConfig } from '../../types/config';
import type { EventBus } from '../../core/EventBus';
import type { PluginContext } from '../../core/PluginContext';

/**
 * 示例插件：演示 PluginContext 的 reporter 与 logger 用法
 */
export class ExamplePlugin implements IPlugin {
  readonly name = 'example';
  readonly version = '1.0.0';
  status: PluginStatus = 'registered' as PluginStatus;

  private ctx?: PluginContext;
  private timer?: number;

  async init(
    _config: SDKConfig,
    _eventBus: EventBus,
    ctx?: PluginContext,
  ): Promise<void> {
    this.ctx = ctx;
    this.status = 'initialized' as PluginStatus;
  }

  async start(
    _config?: SDKConfig,
    _eventBus?: EventBus,
    ctx?: PluginContext,
  ): Promise<void> {
    if (ctx) this.ctx = ctx;
    this.status = 'started' as PluginStatus;
    this.ctx?.logger.info('[ExamplePlugin] started');
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.status = 'stopped' as PluginStatus;
  }

  async destroy(): Promise<void> {
    await this.stop();
    this.status = 'destroyed' as PluginStatus;
  }

  /**
   * 对外方法：发送一次示例上报
   */
  ping(extra?: Record<string, unknown>) {
    const payload = {
      kind: 'example-ping',
      time: Date.now(),
      ...(extra || {}),
    };
    this.ctx?.reporter.report('example', payload);
    this.ctx?.logger.debug('[ExamplePlugin] ping', payload);
  }
}

export default ExamplePlugin;
