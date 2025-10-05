import { ConfigType } from '../types';

const config: ConfigType = {
  url: 'http://127.0.0.1:3000/monitor', // 上报地址
  projectName: 'monitor', // 项目名称
  appId: '123456', // 项目id
  userId: '123456', // 用户id
  isAjax: false, // 是否开启ajax上报
  batchSize: 5, // 批量上报大小
  containerElements: ['html', 'body', '#app', '#root'], // 容器元素
  skeletonElements: [], // 骨架屏元素
  // SourceMap 默认配置
  enableSourceMap: false, // 默认关闭 SourceMap 解析
  sourceMapTimeout: 3000, // 3秒超时
  sourceMapCacheSize: 50, // 缓存50个 SourceMap 文件
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
