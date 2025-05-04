import { TraceSubTypeEnum, TraceTypeEnum } from '../../../common/enum';
import { lazyReportBatch } from '../../../common/report';
import { PaintType } from '../../../types';
/**
 * LCP (Largest Contentful Paint)
 * Largest Contentful Paint（最大内容绘制）衡量的是页面上最大的可见元素（文字块或图像）变为可见所需的时间。
 * 这是用户感知页面加载完成的重要标志，直接影响到用户感受到的速度。LCP应该尽快发生，理想情况下在2.5秒内。
 */
export default function observerLCP() {
  const entryHandler = (list: PerformanceObserverEntryList) => {
    if (observer) {
      observer.disconnect();
    }
    for (const entry of list.getEntries()) {
      const json = entry.toJSON();
      const reportData: PaintType = {
        ...json,
        type: TraceTypeEnum.performance,
        subType: TraceSubTypeEnum.lcp,
        pageUrl: window.location.href,
        timestamp: new Date().getTime(),
      };
      // 发送数据 todo;
      lazyReportBatch(reportData);
    }
  };
  // 统计和计算lcp的时间
  const observer = new PerformanceObserver(entryHandler);
  // buffered: true 确保观察到所有paint事件
  observer.observe({ type: 'largest-contentful-paint', buffered: true });
}
