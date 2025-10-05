import { PerformanceData, PerformanceStats } from '../types/performance';

class PerformanceStore {
  // 存储性能数据，按 appId 分类
  private data: Map<string, PerformanceData[]> = new Map();

  // 每个 appId 最多保存的数据条数
  private readonly MAX_RECORDS = 2000;

  /**
   * 添加性能数据
   */
  add(appId: string, data: PerformanceData) {
    if (!this.data.has(appId)) {
      this.data.set(appId, []);
    }

    const list = this.data.get(appId)!;
    list.unshift(data); // 新数据插入头部

    // 限制数据量，删除最旧的数据
    if (list.length > this.MAX_RECORDS) {
      list.pop();
    }
  }

  /**
   * 批量添加性能数据
   */
  addBatch(appId: string, dataList: PerformanceData[]) {
    dataList.forEach(data => this.add(appId, data));
  }

  /**
   * 获取性能数据列表
   */
  getList(
    appId: string,
    options?: {
      subType?: string; // 过滤类型
      limit?: number; // 限制数量
      startTime?: number; // 开始时间
      endTime?: number; // 结束时间
    },
  ): PerformanceData[] {
    const list = this.data.get(appId) || [];

    let filteredList = list;

    // 按类型过滤
    if (options?.subType) {
      filteredList = filteredList.filter(
        item => item.subType === options.subType,
      );
    }

    // 按时间范围过滤
    if (options?.startTime || options?.endTime) {
      filteredList = filteredList.filter(item => {
        if (options.startTime && item.timestamp < options.startTime) {
          return false;
        }
        if (options.endTime && item.timestamp > options.endTime) {
          return false;
        }
        return true;
      });
    }

    // 限制数量
    const limit = options?.limit || 50;
    return filteredList.slice(0, limit);
  }

  /**
   * 获取指定类型的数据
   */
  getByType(appId: string, subType: string): PerformanceData[] {
    const list = this.data.get(appId) || [];
    return list.filter(item => item.subType === subType);
  }

  /**
   * 计算性能统计数据
   */
  getStats(appId: string): PerformanceStats {
    const list = this.data.get(appId) || [];

    // 辅助函数：计算平均值
    const avg = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sum = arr.reduce((acc, val) => acc + val, 0);
      return Math.round(sum / arr.length);
    };

    // FP 数据
    const fpList = list.filter(item => item.subType === 'fp') as any[];
    const fp = avg(fpList.map(item => item.duration));

    // FCP 数据
    const fcpList = list.filter(item => item.subType === 'fcp') as any[];
    const fcp = avg(fcpList.map(item => item.duration));

    // LCP 数据
    const lcpList = list.filter(item => item.subType === 'lcp') as any[];
    const lcp = avg(lcpList.map(item => item.duration));

    // Load 数据
    const loadList = list.filter(item => item.subType === 'load') as any[];
    const loadTime = avg(loadList.map(item => item.duration));
    const dnsTime = avg(loadList.map(item => item.dns || 0));
    const tcpTime = avg(loadList.map(item => item.tcp || 0));
    const ttfbTime = avg(loadList.map(item => item.ttfb || 0));

    // Fetch 数据
    const fetchList = list.filter(item => item.subType === 'fetch') as any[];
    const avgFetchTime = avg(fetchList.map(item => item.duration));
    const fetchErrorCount = fetchList.filter(item => item.status >= 400).length;

    // XHR 数据
    const xhrList = list.filter(item => item.subType === 'xhr') as any[];
    const avgXhrTime = avg(xhrList.map(item => item.duration));
    const xhrErrorCount = xhrList.filter(item => item.status >= 400).length;

    // 慢请求统计 (>1s)
    const slowRequestCount = [...fetchList, ...xhrList].filter(
      item => item.duration > 1000,
    ).length;

    // 资源加载数据
    const resourceList = list.filter(
      item => item.subType === 'resource',
    ) as any[];
    const avgResourceTime = avg(resourceList.map(item => item.duration));
    const slowResourceCount = resourceList.filter(
      item => item.duration > 500,
    ).length;

    // 资源类型分布
    const resourceTypeCount = {
      script: resourceList.filter(item => item.initiatorType === 'script')
        .length,
      link: resourceList.filter(item => item.initiatorType === 'link').length,
      img: resourceList.filter(item => item.initiatorType === 'img').length,
      css: resourceList.filter(item => item.initiatorType === 'css').length,
      fetch: resourceList.filter(item => item.initiatorType === 'fetch').length,
      xmlhttprequest: resourceList.filter(
        item => item.initiatorType === 'xmlhttprequest',
      ).length,
      other: resourceList.filter(
        item =>
          !['script', 'link', 'img', 'css', 'fetch', 'xmlhttprequest'].includes(
            item.initiatorType,
          ),
      ).length,
    };

    return {
      fp,
      fcp,
      lcp,
      loadTime,
      dnsTime,
      tcpTime,
      ttfbTime,
      fetchCount: fetchList.length,
      xhrCount: xhrList.length,
      avgFetchTime,
      avgXhrTime,
      slowRequestCount,
      errorRequestCount: fetchErrorCount + xhrErrorCount,
      resourceCount: resourceList.length,
      avgResourceTime,
      slowResourceCount,
      resourceTypeCount,
    };
  }

  /**
   * 获取指定时间范围的统计数据
   */
  getStatsByTimeRange(
    appId: string,
    startTime: number,
    endTime: number,
  ): PerformanceStats {
    const list = this.data.get(appId) || [];

    // 过滤时间范围
    const filteredList = list.filter(
      item => item.timestamp >= startTime && item.timestamp <= endTime,
    );

    // 临时创建一个 store 计算统计数据
    const tempStore = new PerformanceStore();
    tempStore.data.set(appId, filteredList);

    return tempStore.getStats(appId);
  }

  /**
   * 清空指定 appId 的数据
   */
  clear(appId: string) {
    this.data.delete(appId);
  }

  /**
   * 清空所有数据
   */
  clearAll() {
    this.data.clear();
  }

  /**
   * 获取当前存储的数据量
   */
  getSize(appId?: string): number {
    if (appId) {
      return this.data.get(appId)?.length || 0;
    }

    let total = 0;
    this.data.forEach(list => {
      total += list.length;
    });
    return total;
  }
}

// 导出单例
export const performanceStore = new PerformanceStore();
