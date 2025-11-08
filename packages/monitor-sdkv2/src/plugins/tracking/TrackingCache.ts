import type {
  TrackingEventData,
  TrackingPageData,
  TrackingUserData,
} from './types';

export type TrackingData =
  | TrackingEventData
  | TrackingPageData
  | TrackingUserData;

/**
 * 埋点事件缓存管理器
 * 负责事件的本地缓存、批量处理和离线存储
 */
export class TrackingCache {
  private cache: TrackingData[] = [];
  private readonly maxSize: number;
  private readonly storageKey = 'ezmonitor_tracking_cache';

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    this.loadFromStorage();
  }

  /**
   * 添加事件到缓存
   */
  add(data: TrackingData): void {
    this.cache.push(data);

    // 超出最大缓存数量时，移除最旧的事件
    if (this.cache.length > this.maxSize) {
      this.cache.shift();
    }

    this.saveToStorage();
  }

  /**
   * 批量添加事件到缓存
   */
  addBatch(dataList: TrackingData[]): void {
    this.cache.push(...dataList);

    // 超出最大缓存数量时，移除最旧的事件
    if (this.cache.length > this.maxSize) {
      this.cache.splice(0, this.cache.length - this.maxSize);
    }

    this.saveToStorage();
  }

  /**
   * 获取指定数量的事件
   */
  take(count: number): TrackingData[] {
    const items = this.cache.splice(0, count);
    this.saveToStorage();
    return items;
  }

  /**
   * 获取所有缓存的事件
   */
  takeAll(): TrackingData[] {
    const items = [...this.cache];
    this.cache = [];
    this.saveToStorage();
    return items;
  }

  /**
   * 获取缓存中事件的数量
   */
  size(): number {
    return this.cache.length;
  }

  /**
   * 检查缓存是否为空
   */
  isEmpty(): boolean {
    return this.cache.length === 0;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache = [];
    this.saveToStorage();
  }

  /**
   * 从本地存储加载缓存
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        if (Array.isArray(data)) {
          this.cache = data.slice(-this.maxSize); // 只保留最新的数据
        }
      }
    } catch (error) {
      console.warn('[TrackingCache] Failed to load from storage:', error);
    }
  }

  /**
   * 保存缓存到本地存储
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.cache));
    } catch (error) {
      console.warn('[TrackingCache] Failed to save to storage:', error);
    }
  }
}
