/**
 * FP (First Paint)
 * First Paint（首次绘制）标志着浏览器开始在屏幕上渲染任何内容，包括背景颜色改变。
 * 这是用户看到页面开始加载的第一个视觉反馈。尽管FP是一个相对宽泛的指标，但它能快速给出页面开始加载的初步指示。
 */

export default function observePaint() {
  const entryHandler = (list: PerformanceObserverEntryList) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-paint') {
        observer.disconnect();
        const json = entry.toJSON();
        const reportData = {
          ...json,
          type: 'performance',
          subType: entry.name,
          pageUrl: window.location.href,
        };
        console.log('FP:', reportData);
      }
    }
  };
  const observer = new PerformanceObserver(entryHandler);
  observer.observe({
    type: 'paint',
    buffered: true,
  });
}
