/**
 * LCP (Largest Contentful Paint)
 * Largest Contentful Paint（最大内容绘制）衡量的是页面上最大的可见元素（文字块或图像）变为可见所需的时间。
 * 这是用户感知页面加载完成的重要标志，直接影响到用户感受到的速度。LCP应该尽快发生，理想情况下在2.5秒内。
 */

export default function observeLCP() {
  const entryHandler = (list: PerformanceObserverEntryList) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'largest-contentful-paint') {
        observer.disconnect();
        const json = entry.toJSON();
        const reportData = {
          ...json,
          type: 'performance',
          subType: entry.name,
          pageUrl: window.location.href,
        };
        console.log('LCP:', reportData);
      }
    }
  };
  const observer = new PerformanceObserver(entryHandler);
  observer.observe({
    type: 'largest-contentful-paint',
    buffered: true,
  });
}
