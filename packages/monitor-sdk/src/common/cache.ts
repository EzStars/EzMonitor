import { getConfig } from '../config';
/**
 * 缓存配置接口
 */
export interface CacheConfig {
  enableLocalStorage?: boolean; // 是否启用 LocalStorage 持久化，默认 true
  localStorageKey?: string; // LocalStorage 存储键名，默认 'ez_monitor_cache'
  maxCacheSize?: number; // 最大缓存条数，默认 100
  cacheExpireTime?: number; // 缓存过期时间（毫秒），默认 24小时
}

/**
 * 缓存数据项接口
 */
interface CacheItem {
  data: any;
  timestamp: number; // 数据添加时间
}

/**
 * 持久化缓存结构
 */
interface PersistentCache {
  items: CacheItem[];
  version: string; // 缓存版本号
}

/**
 * 缓存管理类
 */
class CacheManager {
  private cache: any[] = [];
  private config: Required<CacheConfig>;
  private readonly CACHE_VERSION = '1.0.0';
  private saveTimer?: number; // 定期保存的定时器
  private readonly SAVE_INTERVAL = 5000; // 每 5 秒保存一次

  constructor(config: CacheConfig = {}) {
    // 确保 config 是一个对象，即使传入 undefined
    const safeConfig = config || {};

    this.config = {
      enableLocalStorage: safeConfig.enableLocalStorage ?? true,
      localStorageKey: safeConfig.localStorageKey ?? 'ez_monitor_cache',
      maxCacheSize: safeConfig.maxCacheSize ?? 100,
      cacheExpireTime: safeConfig.cacheExpireTime ?? 24 * 60 * 60 * 1000, // 24小时
    };

    // 初始化时从 LocalStorage 恢复数据
    this.restoreFromLocalStorage();

    // 监听页面可见性变化，在页面隐藏时保存数据
    this.setupVisibilityListener();

    // 监听在线状态变化
    this.setupOnlineListener();

    // 启动定期保存
    this.startPeriodicSave();

    // 页面卸载前保存（使用同步方法）
    this.setupUnloadListener();
  }

  /**
   * 获取缓存数据
   */
  getCache(): any[] {
    return this.cache;
  }

  /**
   * 添加数据到缓存
   */
  addCache(data: any): void {
    this.cache.push(data);

    // 检查缓存大小限制
    if (this.cache.length > this.config.maxCacheSize) {
      console.warn(
        `[EzMonitor] 缓存超出最大限制 ${this.config.maxCacheSize}，将清理旧数据`,
      );
      this.cache = this.cache.slice(-this.config.maxCacheSize);
    }

    // 自动持久化到 LocalStorage
    if (this.config.enableLocalStorage) {
      this.saveToLocalStorage();
    }
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.length = 0;

    // 同时清空 LocalStorage
    if (this.config.enableLocalStorage) {
      this.clearLocalStorage();
    }
  }

  /**
   * 获取缓存数量
   */
  getCacheSize(): number {
    return this.cache.length;
  }

  /**
   * 保存数据到 LocalStorage
   */
  private saveToLocalStorage(): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    try {
      const cacheItems: CacheItem[] = this.cache.map(data => ({
        data,
        timestamp: Date.now(),
      }));

      const persistentCache: PersistentCache = {
        items: cacheItems,
        version: this.CACHE_VERSION,
      };

      localStorage.setItem(
        this.config.localStorageKey,
        JSON.stringify(persistentCache),
      );
    } catch (error) {
      console.warn('[EzMonitor] 保存到 LocalStorage 失败:', error);
      // 如果存储失败（可能是空间不足），尝试清理过期数据
      this.clearExpiredCache();
    }
  }

  /**
   * 从 LocalStorage 恢复数据
   */
  private restoreFromLocalStorage(): void {
    if (!this.isLocalStorageAvailable() || !this.config.enableLocalStorage) {
      return;
    }

    try {
      const stored = localStorage.getItem(this.config.localStorageKey);
      if (!stored) {
        return;
      }

      const persistentCache: PersistentCache = JSON.parse(stored);

      // 检查版本兼容性
      if (persistentCache.version !== this.CACHE_VERSION) {
        console.warn(
          `[EzMonitor] 缓存版本不匹配，清空旧缓存。期望: ${this.CACHE_VERSION}，实际: ${persistentCache.version}`,
        );
        this.clearLocalStorage();
        return;
      }

      // 过滤过期数据
      const now = Date.now();
      const validItems = persistentCache.items.filter(
        item => now - item.timestamp < this.config.cacheExpireTime,
      );

      if (validItems.length > 0) {
        this.cache = validItems.map(item => item.data);
        console.log(
          `[EzMonitor] 从 LocalStorage 恢复 ${validItems.length} 条离线数据`,
        );
      }

      // 如果有过期数据被过滤，更新 LocalStorage
      if (validItems.length < persistentCache.items.length) {
        this.saveToLocalStorage();
      }
    } catch (error) {
      console.warn('[EzMonitor] 从 LocalStorage 恢复数据失败:', error);
      this.clearLocalStorage();
    }
  }

  /**
   * 清空 LocalStorage 中的缓存
   */
  private clearLocalStorage(): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    try {
      localStorage.removeItem(this.config.localStorageKey);
    } catch (error) {
      console.warn('[EzMonitor] 清空 LocalStorage 失败:', error);
    }
  }

  /**
   * 清理过期缓存
   */
  private clearExpiredCache(): void {
    const now = Date.now();
    const stored = localStorage.getItem(this.config.localStorageKey);

    if (!stored) {
      return;
    }

    try {
      const persistentCache: PersistentCache = JSON.parse(stored);
      const validItems = persistentCache.items.filter(
        item => now - item.timestamp < this.config.cacheExpireTime,
      );

      if (validItems.length > 0) {
        persistentCache.items = validItems;
        localStorage.setItem(
          this.config.localStorageKey,
          JSON.stringify(persistentCache),
        );
      } else {
        this.clearLocalStorage();
      }
    } catch (error) {
      console.warn('[EzMonitor] 清理过期缓存失败:', error);
    }
  }

  /**
   * 检查 LocalStorage 是否可用
   */
  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__ez_monitor_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 监听页面可见性变化
   */
  private setupVisibilityListener(): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.config.enableLocalStorage) {
        // 页面隐藏时保存数据
        this.saveToLocalStorage();
      }
    });

    // 页面卸载前保存数据
    window.addEventListener('beforeunload', () => {
      if (this.config.enableLocalStorage) {
        this.saveToLocalStorage();
      }
    });
  }

  /**
   * 监听在线状态变化
   */
  private setupOnlineListener(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', () => {
      console.log('[EzMonitor] 网络已恢复，准备上报离线数据');
      // 网络恢复时，可以触发数据上报
      // 这里通过事件通知，具体上报逻辑在 report.ts 中处理
      window.dispatchEvent(new CustomEvent('ez-monitor-online'));
    });

    window.addEventListener('offline', () => {
      console.log('[EzMonitor] 网络已断开，数据将暂存到本地');
      // ✅ 网络断开时立即保存数据到 LocalStorage
      if (this.config.enableLocalStorage && this.cache.length > 0) {
        this.saveToLocalStorage();
        console.log(
          `[EzMonitor] 已保存 ${this.cache.length} 条数据到 LocalStorage`,
        );
      }
    });
  }

  /**
   * 启动定期保存机制
   */
  private startPeriodicSave(): void {
    if (!this.config.enableLocalStorage) {
      return;
    }

    // 清除旧的定时器
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }

    // ✅ 每 5 秒自动保存一次
    this.saveTimer = window.setInterval(() => {
      if (this.cache.length > 0) {
        this.saveToLocalStorage();
      }
    }, this.SAVE_INTERVAL);
  }

  /**
   * 页面卸载时保存数据（同步方式，更可靠）
   */
  private setupUnloadListener(): void {
    if (typeof window === 'undefined' || !this.config.enableLocalStorage) {
      return;
    }

    // ✅ 使用 pagehide 事件（比 beforeunload 更可靠，支持现代浏览器）
    window.addEventListener('pagehide', () => {
      if (this.cache.length > 0) {
        // 使用同步方式保存（注意：在 unload 阶段，异步操作可能被取消）
        try {
          const cacheItems: CacheItem[] = this.cache.map(data => ({
            data,
            timestamp: Date.now(),
          }));

          const persistentCache: PersistentCache = {
            items: cacheItems,
            version: this.CACHE_VERSION,
          };

          // 使用同步存储（注意：在 unload 阶段，异步操作可能被取消）
          localStorage.setItem(
            this.config.localStorageKey,
            JSON.stringify(persistentCache),
          );
        } catch (error) {
          console.warn('[EzMonitor] 页面卸载时保存失败:', error);
        }
      }
    });
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };

    // 如果配置了启用 LocalStorage，重新启动定期保存
    if (config.enableLocalStorage !== undefined) {
      if (config.enableLocalStorage) {
        this.startPeriodicSave();
      } else if (this.saveTimer) {
        clearInterval(this.saveTimer);
        this.saveTimer = undefined;
      }
    }
  }

  /**
   * 手动保存到 LocalStorage（供外部调用）
   */
  public save(): void {
    if (this.config.enableLocalStorage && this.cache.length > 0) {
      this.saveToLocalStorage();
    }
  }

  /**
   * 清理资源（停止定时器）
   */
  public destroy(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = undefined;
    }
  }
}

// 创建全局缓存管理实例
let cacheManager: CacheManager;

/**
 * 初始化缓存管理器
 */
export function initCache(config?: CacheConfig): void {
  cacheManager = new CacheManager(config);
}

/**
 * 获取缓存管理器实例
 */
export function getCacheManager(): CacheManager {
  if (!cacheManager) {
    // 如果没有初始化，使用默认配置创建实例
    // 确保从全局配置中获取，如果全局配置也没有，使用默认值
    let globalConfig;
    try {
      globalConfig = getConfig();
    } catch (error) {
      console.warn('[EzMonitor] 获取配置失败，使用默认配置', error);
      globalConfig = {};
    }

    // 确保 globalConfig 是一个对象
    if (!globalConfig || typeof globalConfig !== 'object') {
      globalConfig = {};
    }

    cacheManager = new CacheManager({
      enableLocalStorage: globalConfig.enableLocalStorage ?? true,
      localStorageKey: globalConfig.localStorageKey ?? 'ez_monitor_cache',
      maxCacheSize: globalConfig.maxCacheSize ?? 100,
      cacheExpireTime: globalConfig.cacheExpireTime ?? 24 * 60 * 60 * 1000,
    });
  }
  return cacheManager;
}

// 兼容旧接口
export function getCache(): any[] {
  return getCacheManager().getCache();
}

export function addCache(data: any): void {
  getCacheManager().addCache(data);
}

export function clearCache(): void {
  getCacheManager().clearCache();
}

/**
 * 手动保存缓存到 LocalStorage
 */
export function saveCache(): void {
  getCacheManager().save();
}
