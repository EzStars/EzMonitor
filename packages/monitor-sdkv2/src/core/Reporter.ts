import { EventBus } from './EventBus';
import { SDKConfig } from '../types/config';
import { INTERNAL_EVENTS } from '../types/events';
import { TransportType } from './types/reporter';
import { ReportQueue, type ReportQueueItem } from './ReportQueue';
import type {
  IReporter,
  ReporterConfig,
  ReportPayload,
  ReportResponse,
  PendingReportItem,
  RetryStrategy,
} from './types/reporter';

/**
 * 默认重试策略
 */
const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  maxRetries: 3,
  initialDelay: 1000, // 1秒
  backoffMultiplier: 2, // 指数退避
  maxDelay: 30000, // 最大30秒
};

/**
 * Reporter 核心实现
 * 负责数据上报、传输策略选择、失败重试
 */
export class Reporter implements IReporter {
  private config: SDKConfig;
  private eventBus: EventBus;
  private reporterConfig: ReporterConfig;
  private retryStrategy: RetryStrategy;

  // 统一缓存队列（用于批量上报和离线缓存）
  private reportQueue?: ReportQueue;

  // 失败重试队列
  private failedQueue: PendingReportItem[] = [];

  // 定时器
  private batchTimer?: number;
  private retryTimer?: number;

  private isOnline: boolean = true;

  // 保存原始的 XHR 方法，避免被拦截器影响
  private originalXHROpen = XMLHttpRequest.prototype.open;
  private originalXHRSend = XMLHttpRequest.prototype.send;

  constructor(config: SDKConfig, eventBus: EventBus) {
    this.config = config;
    this.eventBus = eventBus;

    // 构建 Reporter 配置
    this.reporterConfig = {
      url: config.reportUrl || '',
      forceXHR: config.forceXHR || false,
      enableRetry: config.enableRetry !== false, // 默认启用
      beforeReport: config.beforeReport,
      onSuccess: config.onReportSuccess,
      onError: config.onReportError,
      afterReport: config.afterReport,
    };

    // 合并重试策略
    this.retryStrategy = {
      ...DEFAULT_RETRY_STRATEGY,
      ...config.retryStrategy,
    };

    // 初始化上报队列（如果启用批量或离线缓存）
    if (config.enableBatch || config.enableOfflineCache) {
      this.reportQueue = new ReportQueue({
        maxSize: config.maxCacheSize || 1000,
        batchSize: config.batchSize || 50,
        storageKey: `${config.appId || 'ezmonitor'}_report_queue`,
        enablePersistence: config.enableOfflineCache !== false,
      });
    }
  }

  /**
   * 初始化 Reporter
   */
  init(): void {
    // 监听上报事件
    this.setupEventListeners();

    // 监听网络状态
    this.setupNetworkListeners();

    // 启动批量上报定时器
    if (this.config.enableBatch && this.reportQueue) {
      this.startBatchTimer();
    }

    // 处理离线期间缓存的数据
    if (this.config.enableOfflineCache && this.reportQueue) {
      this.processOfflineCache();
    }

    // 启动重试定时器
    this.startRetryTimer();

    if (this.config.debug) {
      console.log('[Reporter] Initialized successfully');
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听单条数据上报
    this.eventBus.on(INTERNAL_EVENTS.REPORT_DATA, async payload => {
      try {
        // 如果启用批量上报，数据进入队列
        if (this.config.enableBatch && this.reportQueue) {
          const shouldFlush = this.reportQueue.add(payload.data, payload.type);

          // 达到批量阈值，立即上报
          if (shouldFlush) {
            await this.flushQueue();
          }
        } else {
          // 立即上报
          await this.report(payload.data, payload.type);
        }
      } catch (error) {
        console.error('[Reporter] Failed to report data:', error);
      }
    });

    // 监听批量数据上报（直接上报，不进队列）
    this.eventBus.on(INTERNAL_EVENTS.REPORT_BATCH, async payload => {
      try {
        await this.reportBatch(payload.items);
      } catch (error) {
        console.error('[Reporter] Failed to report batch:', error);
      }
    });
  }

  /**
   * 设置网络状态监听
   */
  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    // 监听网络恢复
    window.addEventListener('online', () => {
      this.isOnline = true;
      if (this.config.debug) {
        console.log('[Reporter] Network online, retrying failed reports...');
      }
      this.retryFailed();
    });

    // 监听网络断开
    window.addEventListener('offline', () => {
      this.isOnline = false;
      if (this.config.debug) {
        console.log('[Reporter] Network offline');
      }
    });

    // 初始化网络状态
    this.isOnline = navigator.onLine;
  }

  /**
   * 启动重试定时器
   */
  private startRetryTimer(): void {
    if (typeof window === 'undefined') return;

    // 每5秒检查一次失败队列
    this.retryTimer = window.setInterval(() => {
      if (this.failedQueue.length > 0 && this.isOnline) {
        this.processRetryQueue();
      }
    }, 5000);
  }

  /**
   * 上报单条数据
   */
  async report(data: unknown, type?: string): Promise<ReportResponse> {
    // 构建上报数据包
    const payload: ReportPayload = {
      data,
      type,
      userId: this.config.userId,
      sessionId: this.config.sessionId,
      appId: this.config.appId,
      timestamp: Date.now(),
    };

    // 调用生命周期钩子
    if (this.reporterConfig.beforeReport) {
      try {
        await this.reporterConfig.beforeReport(payload.data);
      } catch (error) {
        console.error('[Reporter] beforeReport hook error:', error);
      }
    }

    try {
      const response = await this.send(payload);

      // 成功回调
      if (response.success && this.reporterConfig.onSuccess) {
        this.reporterConfig.onSuccess(payload.data);
      }

      // 触发成功事件
      this.eventBus.emit(INTERNAL_EVENTS.REPORT_SUCCESS, {
        data: payload.data,
      });

      return response;
    } catch (error) {
      // 失败处理
      const reportError = error as Error;

      // 失败回调
      if (this.reporterConfig.onError) {
        this.reporterConfig.onError(payload.data, reportError);
      }

      // 触发失败事件
      this.eventBus.emit(INTERNAL_EVENTS.REPORT_ERROR, {
        data: payload.data,
        error: reportError,
      });

      // 如果启用重试，加入失败队列
      if (this.reporterConfig.enableRetry && this.isOnline) {
        this.addToRetryQueue(payload);
      }

      throw error;
    } finally {
      // 最终回调
      if (this.reporterConfig.afterReport) {
        this.reporterConfig.afterReport(payload.data);
      }
    }
  }

  /**
   * 批量上报数据
   */
  async reportBatch(items: unknown[]): Promise<ReportResponse> {
    if (!items || items.length === 0) {
      return {
        success: true,
        transportType: 'beacon' as TransportType,
      };
    }

    // 将批量数据作为一个整体上报
    return this.report(items, 'batch');
  }

  /**
   * 发送数据
   */
  private async send(payload: ReportPayload): Promise<ReportResponse> {
    // 选择传输方式
    const transportType = this.selectTransportType(payload);
    payload.sendType = transportType;

    const jsonData = JSON.stringify(payload);

    if (this.config.debug) {
      console.log(
        `[Reporter] Sending data via ${transportType}:`,
        payload.data,
      );
    }

    try {
      let response: unknown;

      switch (transportType) {
        case TransportType.BEACON:
          response = await this.sendViaBeacon(jsonData);
          break;
        case TransportType.XHR:
          response = await this.sendViaXHR(jsonData);
          break;
        case TransportType.IMAGE:
          response = await this.sendViaImage(jsonData);
          break;
        default:
          throw new Error(`Unknown transport type: ${transportType}`);
      }

      return {
        success: true,
        data: response,
        transportType,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        transportType,
      };
    }
  }

  /**
   * 选择传输方式
   */
  private selectTransportType(payload: ReportPayload): TransportType {
    // 如果强制使用 XHR
    if (this.reporterConfig.forceXHR) {
      return TransportType.XHR;
    }

    // 计算数据大小（KB）
    const dataSize = this.getDataSize(payload);

    // 选择策略：
    // 1. sendBeacon: < 60KB，适合页面卸载时使用
    // 2. XHR: 大数据或需要完全控制
    // 3. Image: < 2KB，兜底方案
    if (this.isSupportBeacon() && dataSize < 60) {
      return TransportType.BEACON;
    } else if (dataSize < 2 && !this.isSupportBeacon()) {
      return TransportType.IMAGE;
    } else {
      return TransportType.XHR;
    }
  }

  /**
   * 使用 sendBeacon 发送
   */
  private async sendViaBeacon(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
        reject(new Error('sendBeacon not supported'));
        return;
      }

      const blob = new Blob([data], { type: 'application/json' });
      const result = navigator.sendBeacon(this.reporterConfig.url, blob);

      if (result) {
        resolve('Beacon sent successfully');
      } else {
        reject(new Error('Beacon send failed'));
      }
    });
  }

  /**
   * 使用 XHR 发送
   */
  private async sendViaXHR(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // 使用原始方法，避免被拦截器影响
      this.originalXHROpen.call(xhr, 'POST', this.reporterConfig.url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText);
        } else {
          reject(new Error(`XHR request failed with status: ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('XHR request failed'));
      };

      xhr.ontimeout = () => {
        reject(new Error('XHR request timeout'));
      };

      // 设置超时时间
      xhr.timeout = 30000; // 30秒

      this.originalXHRSend.call(xhr, data);
    });
  }

  /**
   * 使用 Image 发送
   */
  private async sendViaImage(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        resolve('Image loaded successfully');
      };

      img.onerror = () => {
        reject(new Error('Image load failed'));
      };

      // 通过 URL 参数传递数据
      const encodedData = encodeURIComponent(data);
      img.src = `${this.reporterConfig.url}?data=${encodedData}`;

      // 设置超时
      setTimeout(() => {
        reject(new Error('Image request timeout'));
      }, 10000);
    });
  }

  /**
   * 添加到重试队列
   */
  private addToRetryQueue(payload: ReportPayload): void {
    const item: PendingReportItem = {
      payload,
      retries: 0,
      nextRetryTime: Date.now() + this.retryStrategy.initialDelay,
    };

    this.failedQueue.push(item);

    if (this.config.debug) {
      console.log(
        `[Reporter] Added to retry queue, total: ${this.failedQueue.length}`,
      );
    }
  }

  /**
   * 处理重试队列
   */
  private async processRetryQueue(): Promise<void> {
    const now = Date.now();
    const itemsToRetry: PendingReportItem[] = [];

    // 找出需要重试的项
    for (let i = this.failedQueue.length - 1; i >= 0; i--) {
      const item = this.failedQueue[i];

      if (item.nextRetryTime <= now) {
        itemsToRetry.push(item);
        this.failedQueue.splice(i, 1);
      }
    }

    // 逐个重试
    for (const item of itemsToRetry) {
      try {
        await this.send(item.payload);

        if (this.config.debug) {
          console.log('[Reporter] Retry succeeded');
        }
      } catch (error) {
        // 重试失败，检查是否还能继续重试
        item.retries++;

        if (item.retries < this.retryStrategy.maxRetries) {
          // 计算下次重试延迟（指数退避）
          const delay = Math.min(
            this.retryStrategy.initialDelay *
              Math.pow(this.retryStrategy.backoffMultiplier, item.retries),
            this.retryStrategy.maxDelay,
          );

          item.nextRetryTime = Date.now() + delay;
          this.failedQueue.push(item);

          if (this.config.debug) {
            console.log(
              `[Reporter] Retry failed, will retry in ${delay}ms (${item.retries}/${this.retryStrategy.maxRetries})`,
            );
          }
        } else {
          if (this.config.debug) {
            console.error(
              '[Reporter] Max retries reached, data lost:',
              item.payload.data,
            );
          }
        }
      }
    }
  }

  /**
   * 手动重试所有失败的数据
   */
  async retryFailed(): Promise<void> {
    if (this.failedQueue.length === 0) return;

    // 立即重试所有失败的数据
    for (const item of this.failedQueue) {
      item.nextRetryTime = Date.now();
    }

    await this.processRetryQueue();
  }

  /**
   * 启动批量上报定时器
   */
  private startBatchTimer(): void {
    if (typeof window === 'undefined') return;

    this.batchTimer = window.setInterval(() => {
      if (this.reportQueue && !this.reportQueue.isEmpty()) {
        this.flushQueue().catch(error => {
          console.error('[Reporter] Failed to flush queue:', error);
        });
      }
    }, this.config.batchInterval || 10000);

    if (this.config.debug) {
      console.log(
        `[Reporter] Batch timer started with interval: ${this.config.batchInterval}ms`,
      );
    }
  }

  /**
   * 批量上报队列中的数据
   */
  private async flushQueue(): Promise<void> {
    if (!this.reportQueue) return;

    const items = this.reportQueue.flush();
    if (items.length === 0) return;

    if (this.config.debug) {
      console.log(`[Reporter] Flushing ${items.length} items from queue`);
    }

    // 提取数据并批量上报
    const dataList = items.map(item => item.data);
    await this.sendBatch(dataList);
  }

  /**
   * 批量发送数据
   */
  private async sendBatch(dataList: unknown[]): Promise<void> {
    if (dataList.length === 0) return;

    // 将批量数据作为一个整体上报
    try {
      await this.report(dataList, 'batch');
    } catch (error) {
      console.error('[Reporter] Failed to send batch:', error);
    }
  }

  /**
   * 处理离线期间缓存的数据
   */
  private async processOfflineCache(): Promise<void> {
    if (!this.reportQueue || this.reportQueue.isEmpty()) return;

    if (this.config.debug) {
      const stats = this.reportQueue.getStats();
      console.log(
        `[Reporter] Processing offline cache: ${stats.size} items`,
        stats,
      );
    }

    // 立即上报缓存的数据
    await this.flushQueue();
  }

  /**
   * 销毁 Reporter
   */
  destroy(): void {
    // 清除批量上报定时器
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = undefined;
    }

    // 清除重试定时器
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = undefined;
    }

    // 尝试上报剩余的队列数据
    if (this.reportQueue && !this.reportQueue.isEmpty()) {
      this.flushQueue().catch(error => {
        console.error('[Reporter] Failed to flush remaining queue:', error);
      });
    }

    // 尝试上报剩余的重试数据
    if (this.failedQueue.length > 0 && this.isOnline) {
      this.retryFailed().catch(error => {
        console.error('[Reporter] Failed to send remaining data:', error);
      });
    }

    // 清空队列
    this.failedQueue = [];

    if (this.config.debug) {
      console.log('[Reporter] Destroyed');
    }
  }

  /**
   * 检查是否支持 sendBeacon
   */
  private isSupportBeacon(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      'sendBeacon' in navigator &&
      typeof navigator.sendBeacon === 'function'
    );
  }

  /**
   * 计算数据大小（KB）
   */
  private getDataSize(data: unknown): number {
    const str = JSON.stringify(data);
    // 计算字节数（UTF-8 编码）
    const bytes = new Blob([str]).size;
    // 转换为 KB
    return bytes / 1024;
  }
}
