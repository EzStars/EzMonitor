/**
 * 上报队列配置
 */
export interface ReportQueueConfig {
  /** 最大缓存数量 */
  maxSize: number;
  /** 批量上报阈值 */
  batchSize: number;
  /** localStorage 存储键名 */
  storageKey: string;
  /** 是否启用持久化 */
  enablePersistence: boolean;
  /** 可选：过期毫秒数，加载时裁剪过期项 */
  expireMs?: number;
}

/**
 * 队列项
 */
export interface ReportQueueItem {
  /** 上报数据 */
  data: unknown;
  /** 数据类型 */
  type?: string;
  /** 入队时间戳 */
  timestamp: number;
}

/**
 * 上报队列管理器
 *
 * 功能特性：
 * - 统一缓存：所有插件的上报数据统一缓存管理
 * - 批量聚合：达到阈值或定时触发批量上报
 * - 离线持久化：数据持久化到 localStorage，页面刷新不丢失
 * - 容量控制：超过最大容量时自动丢弃最旧数据（FIFO）
 * - 数据恢复：启动时自动从 localStorage 恢复数据
 */
export class ReportQueue {
  private queue: ReportQueueItem[] = [];
  private config: ReportQueueConfig;

  constructor(config: ReportQueueConfig) {
    this.config = config;

    // 从本地存储恢复数据
    if (this.config.enablePersistence) {
      this.loadFromStorage();
    }
  }

  /**
   * 添加数据到队列
   * @param data 上报数据
   * @param type 数据类型
   * @returns 是否达到批量阈值，需要立即上报
   */
  add(data: unknown, type?: string): boolean {
    // 容量控制：超过最大容量时移除最旧的数据
    if (this.queue.length >= this.config.maxSize) {
      this.queue.shift();
      console.warn(
        `[ReportQueue] Queue is full (${this.config.maxSize}), dropping oldest item`,
      );
    }

    // 添加到队列
    this.queue.push({
      data,
      type,
      timestamp: Date.now(),
    });

    // 持久化
    if (this.config.enablePersistence) {
      this.saveToStorage();
    }

    // 检查是否达到批量阈值
    return this.queue.length >= this.config.batchSize;
  }

  /**
   * 批量添加数据到队列
   * @param items 数据项列表
   * @returns 是否达到批量阈值
   */
  addBatch(items: ReportQueueItem[]): boolean {
    // 容量控制
    if (this.queue.length + items.length > this.config.maxSize) {
      const overflow = this.queue.length + items.length - this.config.maxSize;
      this.queue.splice(0, overflow);
      console.warn(
        `[ReportQueue] Queue overflow, dropped ${overflow} oldest items`,
      );
    }

    this.queue.push(...items);

    if (this.config.enablePersistence) {
      this.saveToStorage();
    }

    return this.queue.length >= this.config.batchSize;
  }

  /**
   * 取出指定数量的数据
   * @param count 数量
   * @returns 数据项列表
   */
  take(count: number): ReportQueueItem[] {
    const items = this.queue.splice(0, count);

    if (this.config.enablePersistence) {
      this.saveToStorage();
    }

    return items;
  }

  /**
   * 取出所有数据并清空队列
   * @returns 所有数据项
   */
  flush(): ReportQueueItem[] {
    const items = [...this.queue];
    this.queue = [];

    if (this.config.enablePersistence) {
      this.saveToStorage();
    }

    return items;
  }

  /**
   * 获取队列大小
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * 检查队列是否为空
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];

    if (this.config.enablePersistence) {
      this.saveToStorage();
    }
  }

  /**
   * 获取队列中的所有数据（不移除）
   */
  peek(): ReportQueueItem[] {
    return [...this.queue];
  }

  /**
   * 保存到 localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = JSON.stringify(this.queue);
      localStorage.setItem(this.config.storageKey, data);
    } catch (error) {
      // localStorage 可能已满或被禁用
      console.warn('[ReportQueue] Failed to save to storage:', error);

      // 尝试清理一半数据后重试
      if (this.queue.length > 10) {
        this.queue.splice(0, Math.floor(this.queue.length / 2));
        try {
          localStorage.setItem(
            this.config.storageKey,
            JSON.stringify(this.queue),
          );
        } catch (retryError) {
          console.error(
            '[ReportQueue] Failed to save even after cleanup:',
            retryError,
          );
        }
      }
    }
  }

  /**
   * 从 localStorage 加载
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const data = JSON.parse(stored);

        // 验证数据格式
        if (Array.isArray(data)) {
          let items = data as ReportQueueItem[];

          // 过期裁剪
          if (
            typeof this.config.expireMs === 'number' &&
            this.config.expireMs > 0
          ) {
            const cutoff = Date.now() - this.config.expireMs;
            items = items.filter(
              item =>
                typeof item?.timestamp === 'number' && item.timestamp >= cutoff,
            );
          }

          // 只保留最新的数据，不超过最大容量
          this.queue = items.slice(-this.config.maxSize);

          console.log(
            `[ReportQueue] Loaded ${this.queue.length} items from storage`,
          );
        }
      }
    } catch (error) {
      console.warn('[ReportQueue] Failed to load from storage:', error);

      // 清除损坏的数据
      try {
        localStorage.removeItem(this.config.storageKey);
      } catch (removeError) {
        // ignore
      }
    }
  }

  /**
   * 获取队列统计信息
   */
  getStats(): {
    size: number;
    oldestTimestamp?: number;
    newestTimestamp?: number;
    types: Record<string, number>;
  } {
    const stats = {
      size: this.queue.length,
      oldestTimestamp: this.queue[0]?.timestamp,
      newestTimestamp: this.queue[this.queue.length - 1]?.timestamp,
      types: {} as Record<string, number>,
    };

    // 统计各类型数据数量
    this.queue.forEach(item => {
      const type = item.type || 'unknown';
      stats.types[type] = (stats.types[type] || 0) + 1;
    });

    return stats;
  }
}
