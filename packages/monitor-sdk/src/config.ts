import { ConfigType } from './types';

const config: ConfigType = {
  url: 'http://127.0.0.1:3001/monitor', // 上报地址
  projectName: 'monitor', // 项目名称
  appId: '123456', // 项目id
  userId: '123456', // 用户id
  isAjax: false, // 是否开启ajax上报
  batchSize: 5, // 批量上报大小
  containerElements: ['html', 'body', '#app', '#root'], // 容器元素
  skeletonElements: [], // 骨架屏元素
  enableLocalStorage: true, // 是否启用 LocalStorage 持久化
  localStorageKey: 'ez_monitor_cache', // LocalStorage 存储键名
  maxCacheSize: 100, // 最大缓存条数
  cacheExpireTime: 24 * 60 * 60 * 1000, // 缓存过期时间（毫秒）
};

export function setConfig(options: ConfigType = config) {
  for (const key in options) {
    if (options[key]) {
      config[key] = options[key];
    }
  }
}

export function getConfig() {
  return config;
}
