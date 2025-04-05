import { ResourceData } from '../types';

// 导出一个名为observeResourceLoading的函数，用于监控页面资源加载情况
export function observeResourceLoading(
  metrics: { resources?: ResourceData[] },
  observers: PerformanceObserver[],
  onResourceData?: (resourceData: ResourceData) => void,
): void {
  // 用于存储已经处理过的资源名称
  const processedResources = new Set<string>();

  // 检查浏览器是否支持 PerformanceObserver
  if ('PerformanceObserver' in window) {
    try {
      // 创建一个新的 PerformanceObserver 实例
      const resourceObserver = new PerformanceObserver(list => {
        // 获取性能条目列表
        const entries = list.getEntries() as PerformanceResourceTiming[];

        // 如果 metrics.resources 不存在，初始化一个空数组
        if (!metrics.resources) {
          metrics.resources = [];
        }

        // 遍历性能条目列表
        entries.forEach(entry => {
          const resourceName = entry.name;
          // 检查该资源是否已经处理过
          if (!processedResources.has(resourceName)) {
            // 提取资源的关键性能数据
            const resourceData: ResourceData = {
              name: resourceName,
              startTime: entry.startTime,
              requestStart: entry.requestStart,
              responseEnd: entry.responseEnd,
              duration: entry.duration,
              initiatorType: entry.initiatorType,
            };

            // 将资源数据添加到 metrics.resources 数组中
            metrics.resources!.push(resourceData);

            // 打印资源的性能数据到控制台
            console.log(`${resourceData.name}资源数据加载`, resourceData);

            // 如果提供了回调函数，则调用它
            if (onResourceData) {
              onResourceData(resourceData);
            }

            // 将该资源名称添加到已处理集合中
            processedResources.add(resourceName);
          }
        });
      });

      // 开始观察 "resource" 类型的性能条目，buffered 为 true 表示包括之前已经发生的条目
      resourceObserver.observe({ type: 'resource', buffered: true });

      // 将资源观察者添加到 observers 数组中
      observers.push(resourceObserver);
    } catch (error) {
      // 捕获并打印资源性能监控初始化失败的错误信息
      console.error('资源性能监控初始化失败:', error);
    }
  } else {
    // 若浏览器不支持 PerformanceObserver，打印提示信息
    console.log('浏览器不支持 PerformanceObserver');
  }
}
