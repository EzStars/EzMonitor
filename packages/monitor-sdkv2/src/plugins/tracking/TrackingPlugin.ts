import type { IPlugin, PluginStatus } from '../../types/plugin';
import type { SDKConfig } from '../../types/config';
import type { EventBus } from '../../core/EventBus';
import type {
  TrackingPluginConfig,
  TrackingEventData,
  TrackingPageData,
  TrackingUserData,
  TrackingContext,
} from './types';
import { ContextCollector } from './ContextCollector';
import { INTERNAL_EVENTS } from '../../types/events';

/**
 * 自定义埋点插件
 *
 * 功能特性：
 * - 事件埋点：track() 方法用于自定义事件埋点
 * - 页面埋点：trackPage() 方法用于页面访问埋点
 * - 用户埋点：trackUser() 方法用于用户行为埋点
 * - 自动上下文收集：自动收集页面、设备、网络等上下文信息
 * - 自动页面追踪：可选的自动页面访问追踪
 * - 数据过滤：支持自定义事件过滤器
 * - 数据处理：支持自定义数据处理器
 *
 * 注意：批量上报、离线缓存等功能已统一移至 Reporter 层处理
 */
export class TrackingPlugin implements IPlugin {
  readonly name = 'tracking';
  readonly version = '1.0.0';
  readonly description = 'Custom tracking plugin for user behavior analytics';
  readonly dependencies: string[] = [];

  status: PluginStatus = 'registered' as PluginStatus;

  private config!: SDKConfig;
  private eventBus!: EventBus;
  private pluginConfig: Required<TrackingPluginConfig>;
  private contextCollector: ContextCollector;
  private currentUserId?: string;

  constructor(config: Partial<TrackingPluginConfig> = {}) {
    // 设置默认配置
    this.pluginConfig = {
      autoTrackPage: true,
      dataProcessor: data => data, // 默认不处理
      eventFilter: () => true, // 默认不过滤
      ...config,
    };

    this.contextCollector = new ContextCollector();
  }

  /**
   * 初始化插件
   */
  async init(config: SDKConfig, eventBus: EventBus): Promise<void> {
    this.config = config;
    this.eventBus = eventBus;

    // 监听页面变化事件（如果启用自动页面追踪）
    if (this.pluginConfig.autoTrackPage) {
      this.setupAutoPageTracking();
    }

    this.status = 'initialized' as PluginStatus;
  }

  /**
   * 启动插件
   */
  async start(): Promise<void> {
    this.status = 'started' as PluginStatus;
  }

  /**
   * 停止插件
   */
  async stop(): Promise<void> {
    this.status = 'stopped' as PluginStatus;
  }

  /**
   * 销毁插件
   */
  async destroy(): Promise<void> {
    this.status = 'destroyed' as PluginStatus;
  }

  /**
   * 自定义事件埋点
   * @param eventName 事件名称
   * @param properties 事件属性
   * @param customContext 自定义上下文
   */
  track(
    eventName: string,
    properties?: Record<string, any>,
    customContext?: Record<string, any>,
  ): void {
    // 应用事件过滤器
    if (!this.pluginConfig.eventFilter(eventName, properties)) {
      return;
    }

    const context = this.buildContext(customContext);
    const eventData: TrackingEventData = {
      eventName,
      properties,
      context,
      timestamp: Date.now(),
      sessionId: this.config.sessionId,
      userId: this.currentUserId,
      appId: this.config.appId,
    };

    // 应用自定义数据处理器
    const processedData = this.pluginConfig.dataProcessor(eventData);

    if (this.config.debug) {
      console.log('[TrackingPlugin] Tracking event:', processedData);
    }

    // 触发事件，由 Reporter 统一处理上报
    this.eventBus.emit(INTERNAL_EVENTS.TRACKING_EVENT, {
      eventName: processedData.eventName,
      properties: processedData.properties,
      context: processedData.context,
    });

    this.eventBus.emit(INTERNAL_EVENTS.REPORT_DATA, {
      type: 'tracking',
      data: processedData,
    });
  }

  /**
   * 页面访问埋点
   * @param page 页面名称或路径
   * @param properties 页面属性
   * @param customContext 自定义上下文
   */
  trackPage(
    page: string,
    properties?: Record<string, any>,
    customContext?: Record<string, any>,
  ): void {
    const context = this.buildContext(customContext);
    const pageData: TrackingPageData = {
      page,
      properties,
      context,
      timestamp: Date.now(),
      sessionId: this.config.sessionId,
      userId: this.currentUserId,
      appId: this.config.appId,
    };

    // 应用自定义数据处理器
    const processedData = this.pluginConfig.dataProcessor(pageData);

    if (this.config.debug) {
      console.log('[TrackingPlugin] Tracking page:', processedData);
    }

    // 触发事件
    this.eventBus.emit(INTERNAL_EVENTS.TRACKING_PAGE, {
      page: processedData.page,
      properties: processedData.properties,
      context: processedData.context,
    });

    this.eventBus.emit(INTERNAL_EVENTS.REPORT_DATA, {
      type: 'tracking',
      data: processedData,
    });
  }

  /**
   * 用户埋点
   * @param userId 用户ID
   * @param properties 用户属性
   */
  trackUser(userId: string, properties?: Record<string, any>): void {
    this.currentUserId = userId;

    const userData: TrackingUserData = {
      userId,
      properties,
      timestamp: Date.now(),
      sessionId: this.config.sessionId,
      appId: this.config.appId,
    };

    // 应用自定义数据处理器
    const processedData = this.pluginConfig.dataProcessor(userData);

    if (this.config.debug) {
      console.log('[TrackingPlugin] Tracking user:', processedData);
    }

    // 触发事件
    this.eventBus.emit(INTERNAL_EVENTS.TRACKING_USER, {
      userId: processedData.userId,
      properties: processedData.properties,
    });

    this.eventBus.emit(INTERNAL_EVENTS.REPORT_DATA, {
      type: 'tracking',
      data: processedData,
    });
  }

  /**
   * 设置自定义上下文
   * @param context 上下文数据
   */
  setContext(context: Record<string, any>): void {
    this.contextCollector.setCustomContext(context);
  }

  /**
   * 移除自定义上下文
   * @param key 上下文键名
   */
  removeContext(key: string): void {
    this.contextCollector.removeCustomContext(key);
  }

  /**
   * 清空自定义上下文
   */
  clearContext(): void {
    this.contextCollector.clearCustomContext();
  }

  /**
   * 构建完整的上下文信息
   */
  private buildContext(customContext?: Record<string, any>): TrackingContext {
    const context = this.contextCollector.collect();

    if (customContext) {
      context.custom = { ...context.custom, ...customContext };
    }

    return context;
  }

  /**
   * 设置自动页面追踪
   */
  private setupAutoPageTracking(): void {
    if (typeof window === 'undefined') return;

    // 监听页面加载
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.trackPage(window.location.pathname);
      });
    } else {
      this.trackPage(window.location.pathname);
    }

    // 监听 pushState 和 replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      setTimeout(() => this.trackPage(window.location.pathname), 0);
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      setTimeout(() => this.trackPage(window.location.pathname), 0);
    };

    // 监听 popstate 事件
    window.addEventListener('popstate', () => {
      setTimeout(() => this.trackPage(window.location.pathname), 0);
    });

    // 监听 hashchange 事件
    window.addEventListener('hashchange', () => {
      this.trackPage(window.location.pathname + window.location.hash);
    });
  }
}
