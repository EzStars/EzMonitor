/**
 * FCP（First Contentful Paint）：
 * 首次内容绘制时间，这个指标用于记录页面首次绘制文本、图片、非空白 Canvas 或 SVG 的时间。
 *
 * FP (First Paint)
 * First Paint（首次绘制）标志着浏览器开始在屏幕上渲染任何内容，包括背景颜色改变。
 * 这是用户看到页面开始加载的第一个视觉反馈。尽管FP是一个相对宽泛的指标，但它能快速给出页面开始加载的初步指示。
 *
 * @param metrics
 * @param observers
 */

export function observePaint(
  metrics: { fcp?: any; fp?: any },
  observers: PerformanceObserver[],
): void {
  try {
    const paintObserver = new PerformanceObserver(list => {
      const entries = list.getEntries() as PerformanceEntry[];

      entries.forEach(entry => {
        if (entry.entryType === 'paint') {
          if (entry.name === 'first-contentful-paint') {
            metrics.fcp = entry.startTime;
          } else if (entry.name === 'first-paint') {
            metrics.fp = entry.startTime;
          }
        }
      });
    });

    paintObserver.observe({ type: 'paint', buffered: true });
    observers.push(paintObserver);
  } catch (error) {
    console.error('FCP&FP 性能监控初始化失败:', error);
  }
}
