import { TraceSubTypeEnum, TraceTypeEnum } from '../../../common/enum';
import { lazyReportBatch } from '../../../common/report';
import { PaintType } from '../../../types';
/**
 * FCP（First Contentful Paint）：
 * 首次内容绘制时间，这个指标用于记录页面首次绘制文本、图片、非空白 Canvas 或 SVG 的时间。
 *
 */
export default function observerFCP() {
  // 定义回调函数，当性能观察器触发时执行
  const entryHandler = (list: PerformanceObserverEntryList) => {
    // 遍历性能观察器条目列表
    for (const entry of list.getEntries()) {
      // 如果条目名称为 'first-contentful-paint'
      if (entry.name === 'first-contentful-paint') {
        // 断开观察器
        observer.disconnect();
        // 将条目转换为JSON对象
        const json = entry.toJSON();
        // 定义报告数据对象
        const reportData: PaintType = {
          ...json,
          // 数据类型
          type: TraceTypeEnum.performance,
          // 一级类型
          subType: TraceSubTypeEnum.fcp,
          // 页面URL
          pageUrl: window.location.href,
          // 时间戳
          timestamp: new Date().getTime(),
        };
        // 发送数据 todo;
        // 延迟批量报告数据
        lazyReportBatch(reportData);
      }
    }
  };

  // 统计和计算fcp的时间
  // 创建性能观察器，并传入回调函数
  const observer = new PerformanceObserver(entryHandler);
  // buffered: true 确保观察到所有paint事件
  // 开始观察性能条目，类型为 'paint'，并启用缓冲
  observer.observe({ type: 'paint', buffered: true });
}
