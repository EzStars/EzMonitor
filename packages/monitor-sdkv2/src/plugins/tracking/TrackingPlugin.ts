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
import { TrackingCache, type TrackingData } from './TrackingCache';
import { INTERNAL_EVENTS } from '../../types/events';

/**
 * 自定义埋点插件
 *
 * 功能特性：
 * - 事件埋点：track() 方法用于自定义事件埋点
 * - 页面埋点：trackPage() 方法用于页面访问埋点
 * - 用户埋点：trackUser() 方法用于用户行为埋点
 * - 自动上下文收集：自动收集页面、设备、网络等上下文信息
 * - 批量上报：支持自动批量上报以优化性能
 * - 离线缓存：支持离线存储，网络恢复时自动上报
 * - 自动页面追踪：可选的自动页面访问追踪
 * - 数据过滤：支持自定义事件过滤器
 * - 数据处理：支持自定义数据处理器
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
  private cache: TrackingCache;
  private batchTimer?: number;
  private currentUserId?: string;

  constructor(config: Partial<TrackingPluginConfig> = {}) {
    // 设置默认配置
    this.pluginConfig = {
      enableBatch: false,
      batchInterval: 10000, // 10秒
      batchSize: 50,
      autoTrackPage: true,
      enableOfflineCache: true,
      offlineCacheSize: 1000,
      dataProcessor: data => data, // 默认不处理
      eventFilter: () => true, // 默认不过滤
      ...config,
    };

    this.contextCollector = new ContextCollector();
    this.cache = new TrackingCache(this.pluginConfig.offlineCacheSize);
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

    // 设置批量上报定时器
    if (this.pluginConfig.enableBatch) {
      this.setupBatchTimer();
    }

    this.status = 'initialized' as PluginStatus;
  }

  /**
   * 启动插件
   */
  async start(): Promise<void> {
    // 处理离线缓存中的数据
    if (this.pluginConfig.enableOfflineCache && !this.cache.isEmpty()) {
      this.flushCache();
    }

    this.status = 'started' as PluginStatus;
  }

  /**
   * 停止插件
   */
  async stop(): Promise<void> {
    // 清除批量上报定时器
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = undefined;
    }

    // 将剩余数据保存到缓存
    this.flushCache();

    this.status = 'stopped' as PluginStatus;
  }

  /**
   * 销毁插件
   */
  async destroy(): Promise<void> {
    this.stop();
    this.cache.clear();
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
    console.log('Tracking event data:', eventData);
    this.processAndReport(eventData);
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
    console.log('Tracking page data:', pageData);
    this.processAndReport(pageData);
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
    console.log('Tracking user data:', userData);

    this.processAndReport(userData);
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
   * 立即上报所有缓存的事件
   */
  flush(): void {
    this.flushCache();
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
   * 处理和上报数据
   */
  private processAndReport(data: TrackingData): void {
    // 应用自定义数据处理器
    const processedData = this.pluginConfig.dataProcessor(data);

    if (this.pluginConfig.enableBatch) {
      // 添加到缓存，等待批量上报
      this.cache.add(processedData);

      // 如果缓存达到阈值，立即上报
      if (this.cache.size() >= this.pluginConfig.batchSize) {
        this.flushCache();
      }
    } else {
      // 立即上报
      this.reportSingle(processedData);
    }
  }

  /**
   * 上报单个事件
   */
  private reportSingle(data: TrackingData): void {
    this.eventBus.emit(INTERNAL_EVENTS.TRACKING_EVENT, {
      eventName:
        'eventName' in data
          ? data.eventName
          : 'page' in data
            ? 'page_view'
            : 'user_identify',
      properties: data.properties,
      context: 'context' in data ? data.context : undefined,
    });

    this.eventBus.emit(INTERNAL_EVENTS.REPORT_DATA, {
      type: 'tracking',
      data,
    });
  }

  /**
   * 批量上报缓存中的事件
   */
  private flushCache(): void {
    const events = this.cache.takeAll();
    if (events.length === 0) return;

    this.eventBus.emit(INTERNAL_EVENTS.TRACKING_BATCH, { events });
    this.eventBus.emit(INTERNAL_EVENTS.REPORT_BATCH, { items: events });
  }

  /**
   * 设置批量上报定时器
   */
  private setupBatchTimer(): void {
    this.batchTimer = setInterval(() => {
      if (!this.cache.isEmpty()) {
        this.flushCache();
      }
    }, this.pluginConfig.batchInterval) as unknown as number;
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
