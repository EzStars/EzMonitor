/**
 * FCP（First Contentful Paint）：
 * 首次内容绘制时间，这个指标用于记录页面首次绘制文本、图片、非空白 Canvas 或 SVG 的时间。
 *
 */

export default function observerFCP() {
  const entryHandler = (list: PerformanceObserverEntryList) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        observer.disconnect();
        const json = entry.toJSON();
        const reportData = {
          ...json,
          type: 'performance',
          subType: entry.name,
          pageUrl: window.location.href,
        };
        console.log('FCP:', reportData);
      }
    }
  };
  const observer = new PerformanceObserver(entryHandler);
  observer.observe({
    type: 'paint',
    buffered: true,
  });
}
