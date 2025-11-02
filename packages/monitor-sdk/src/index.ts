import { setConfig } from './config';
import { ConfigType } from './types';
import Behavior, { getBehaviour } from './plugins/behavior';
import Exception from './plugins/exception';
import Performance from './plugins/performance';
import Error from './plugins/error';
import exceptionInit from './plugins/exception';
import { unzipRecordscreen } from './common/utils';
import { initCache, getCacheManager } from './common/cache';
import { initReportSystem, lazyReportBatch } from './common/report';

function init(options?: ConfigType) {
  // 如果没有传入配置，使用默认配置
  if (!options) {
    options = {} as ConfigType;
  }

  setConfig(options);

  // 初始化缓存管理器，只传入存在的配置项
  const cacheConfig: any = {};
  if (options.enableLocalStorage !== undefined) {
    cacheConfig.enableLocalStorage = options.enableLocalStorage;
  }
  if (options.localStorageKey !== undefined) {
    cacheConfig.localStorageKey = options.localStorageKey;
  }
  if (options.maxCacheSize !== undefined) {
    cacheConfig.maxCacheSize = options.maxCacheSize;
  }
  if (options.cacheExpireTime !== undefined) {
    cacheConfig.cacheExpireTime = options.cacheExpireTime;
  }

  initCache(Object.keys(cacheConfig).length > 0 ? cacheConfig : undefined);

  // 初始化上报系统（支持离线数据恢复）
  initReportSystem();

  window.$SDK = {};
}

export default {
  init,
  Performance,
  Error,
  Behavior,
  Exception,
  unzipRecordscreen,
  getBehaviour,
  exceptionInit,
  getCacheManager, // 导出缓存管理器，供高级用户使用
  lazyReportBatch, // 导出上报方法，供调试和测试使用
};
