/**
 * LCP (Largest Contentful Paint)
 * Largest Contentful Paint（最大内容绘制）衡量的是页面上最大的可见元素（文字块或图像）变为可见所需的时间。
 * 这是用户感知页面加载完成的重要标志，直接影响到用户感受到的速度。LCP应该尽快发生，理想情况下在2.5秒内。
 *
 * @param metrics
 * @param observers
 */

export function observeLCP(
  metrics: { lcp?: any },
  observers: PerformanceObserver[],
): void {
  try {
    const lcpObserver = new PerformanceObserver(list => {
      const entries = list.getEntries() as PerformanceEntry[];

      entries.forEach(entry => {
        if (entry.entryType === 'largest-contentful-paint') {
          metrics.lcp = {
            name: entry.name,
            startTime: entry.startTime,
            renderTime: (entry as any).renderTime,
            loadTime: (entry as any).loadTime,
            size: (entry as any).size,
            id: (entry as any).id,
            url: (entry as any).url,
          };
          console.log('LCP 数据:', entry);
        }
      });
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    observers.push(lcpObserver);
  } catch (error) {
    console.error('LCP 性能监控初始化失败:', error);
  }
}
