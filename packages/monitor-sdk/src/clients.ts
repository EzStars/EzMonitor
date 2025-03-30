import { WebClient } from './types';

export class Client {
  private eventBus = new EventBus();
  private plugins = new PlugunManager(this.eventBus);

  private initCorePlugins() {
    // 内置核心插件
    this.plugins.register(CoreErrorPlugin);
  }
  constructor() {
    this.initCorePlugins();
  }

  public readonly interface: WebClient = (
    action: 'on' | 'emit',
    type: string,
    handler?: any,
  ) => {
    if (action === 'on') {
      this.eventBus.subscribe(type, handler);
    } else if (action === 'emit') {
      this.eventBus.dispatch(type, handler);
    }
  };
}
