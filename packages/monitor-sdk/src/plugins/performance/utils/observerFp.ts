/**
 * FP (First Paint)
 * First Paint（首次绘制）标志着浏览器开始在屏幕上渲染任何内容，包括背景颜色改变。
 * 这是用户看到页面开始加载的第一个视觉反馈。尽管FP是一个相对宽泛的指标，但它能快速给出页面开始加载的初步指示。
 */

import { TraceSubTypeEnum, TraceTypeEnum } from '../../../common/enum';
import { lazyReportBatch } from '../../../common/report';
import { PaintType } from '../../../types';

export default function observerPaint() {
  const entryHandler = (list: PerformanceObserverEntryList) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-paint') {
        observer.disconnect();
        const json = entry.toJSON() as PerformanceEntry;
        // 定义 reportData 的类型
        const reportData: PaintType = {
          ...json,
          type: TraceTypeEnum.performance,
          subType: TraceSubTypeEnum.fp,
          pageUrl: window.location.href,
          timestamp: new Date().getTime(),
        };

        // 发送数据 todo;
        lazyReportBatch(reportData);
      }
    }
  };

  // 统计和计算fp的时间
  const observer = new PerformanceObserver(entryHandler);

  // buffered: true 确保观察到所有 paint 事件
  observer.observe({ type: 'paint', buffered: true });
}
