import { Context } from 'koa';
import { v4 as uuidv4 } from 'uuid';
import { performanceStore } from '../cache/performanceStore';
import { broadcastToApp } from './sse';
import { PerformanceData } from '../types/performance';

/**
 * 接收性能数据上报
 */
export const reportPerformance = async (ctx: Context) => {
  try {
    const reportData = ctx.request.body;
    const { userId, sendType, data } = reportData;

    // 获取客户端信息
    const userAgent = ctx.get('user-agent');
    const ip = ctx.ip;

    // 数据验证
    if (!data || !Array.isArray(data) || data.length === 0) {
      ctx.body = {
        code: 400,
        message: '数据格式错误',
      };
      return;
    }

    // 处理性能数据
    const performanceDataList: PerformanceData[] = data
      .filter(item => item.type === 'performance')
      .map(item => ({
        id: uuidv4(),
        appId: item.appId || '123456',
        userId,
        userAgent,
        ip,
        ...item,
      }));

    console.log('📊 接收到性能数据:', performanceDataList);

    if (performanceDataList.length === 0) {
      ctx.body = {
        code: 400,
        message: '没有有效的性能数据',
      };
      return;
    }

    // 批量存储
    const appId = performanceDataList[0].appId;
    performanceStore.addBatch(appId, performanceDataList);

    // 实时推送给前端 (分类推送)
    performanceDataList.forEach(item => {
      broadcastToApp(appId, `performance:${item.subType}`, item);
    });

    // 推送最新的统计数据
    const stats = performanceStore.getStats(appId);
    broadcastToApp(appId, 'performance:stats', stats);

    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        total: performanceDataList.length,
        sendType,
        appId,
      },
    };
  } catch (error: any) {
    console.error('接收性能数据失败:', error);
    ctx.body = {
      code: 500,
      message: error.message || '服务器错误',
    };
  }
};

/**
 * 获取性能数据列表
 */
export const getPerformanceList = async (ctx: Context) => {
  try {
    const { appId, subType, limit, startTime, endTime } = ctx.query;

    if (!appId) {
      ctx.body = {
        code: 400,
        message: '缺少 appId 参数',
      };
      return;
    }

    const list = performanceStore.getList(appId as string, {
      subType: subType as string,
      limit: limit ? Number(limit) : 50,
      startTime: startTime ? Number(startTime) : undefined,
      endTime: endTime ? Number(endTime) : undefined,
    });

    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        total: list.length,
        list,
      },
    };
  } catch (error: any) {
    ctx.body = {
      code: 500,
      message: error.message,
    };
  }
};

/**
 * 获取指定类型的性能数据
 */
export const getPerformanceByType = async (ctx: Context) => {
  try {
    const { appId, subType } = ctx.params;

    if (!appId || !subType) {
      ctx.body = {
        code: 400,
        message: '缺少必要参数',
      };
      return;
    }

    const list = performanceStore.getByType(appId, subType);

    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        subType,
        total: list.length,
        list: list.slice(0, 100), // 最多返回 100 条
      },
    };
  } catch (error: any) {
    ctx.body = {
      code: 500,
      message: error.message,
    };
  }
};

/**
 * 获取性能统计数据
 */
export const getPerformanceStats = async (ctx: Context) => {
  try {
    const { appId, startTime, endTime } = ctx.query;

    if (!appId) {
      ctx.body = {
        code: 400,
        message: '缺少 appId 参数',
      };
      return;
    }

    let stats;

    // 如果指定了时间范围，则计算该范围内的统计数据
    if (startTime && endTime) {
      stats = performanceStore.getStatsByTimeRange(
        appId as string,
        Number(startTime),
        Number(endTime),
      );
    } else {
      stats = performanceStore.getStats(appId as string);
    }

    ctx.body = {
      code: 200,
      message: 'success',
      data: stats,
    };
  } catch (error: any) {
    ctx.body = {
      code: 500,
      message: error.message,
    };
  }
};

/**
 * 获取核心 Web Vitals
 */
export const getWebVitals = async (ctx: Context) => {
  try {
    const { appId } = ctx.query;

    if (!appId) {
      ctx.body = {
        code: 400,
        message: '缺少 appId 参数',
      };
      return;
    }

    const stats = performanceStore.getStats(appId as string);

    // 提取核心 Web Vitals
    const webVitals = {
      fp: stats.fp,
      fcp: stats.fcp,
      lcp: stats.lcp,
      // 根据 Google 标准判断性能等级
      grade: {
        fp: stats.fp < 1000 ? 'good' : stats.fp < 3000 ? 'medium' : 'poor',
        fcp: stats.fcp < 1800 ? 'good' : stats.fcp < 3000 ? 'medium' : 'poor',
        lcp: stats.lcp < 2500 ? 'good' : stats.lcp < 4000 ? 'medium' : 'poor',
      },
    };

    ctx.body = {
      code: 200,
      message: 'success',
      data: webVitals,
    };
  } catch (error: any) {
    ctx.body = {
      code: 500,
      message: error.message,
    };
  }
};

/**
 * 获取慢请求列表
 */
export const getSlowRequests = async (ctx: Context) => {
  try {
    const { appId, threshold = 1000 } = ctx.query;

    if (!appId) {
      ctx.body = {
        code: 400,
        message: '缺少 appId 参数',
      };
      return;
    }

    const fetchList = performanceStore.getByType(appId as string, 'fetch');
    const xhrList = performanceStore.getByType(appId as string, 'xhr');

    const allRequests = [...fetchList, ...xhrList] as any[];

    // 筛选慢请求
    const slowRequests = allRequests
      .filter(item => item.duration > Number(threshold))
      .sort((a, b) => b.duration - a.duration) // 按耗时降序
      .slice(0, 50); // 最多返回 50 条

    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        threshold: Number(threshold),
        total: slowRequests.length,
        list: slowRequests,
      },
    };
  } catch (error: any) {
    ctx.body = {
      code: 500,
      message: error.message,
    };
  }
};

/**
 * 获取错误请求列表
 */
export const getErrorRequests = async (ctx: Context) => {
  try {
    const { appId } = ctx.query;

    if (!appId) {
      ctx.body = {
        code: 400,
        message: '缺少 appId 参数',
      };
      return;
    }

    const fetchList = performanceStore.getByType(appId as string, 'fetch');
    const xhrList = performanceStore.getByType(appId as string, 'xhr');

    const allRequests = [...fetchList, ...xhrList] as any[];

    // 筛选错误请求 (4xx, 5xx)
    const errorRequests = allRequests
      .filter(item => item.status >= 400)
      .sort((a, b) => b.timestamp - a.timestamp) // 按时间降序
      .slice(0, 50);

    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        total: errorRequests.length,
        list: errorRequests,
      },
    };
  } catch (error: any) {
    ctx.body = {
      code: 500,
      message: error.message,
    };
  }
};

/**
 * 获取资源加载统计
 */
export const getResourceStats = async (ctx: Context) => {
  try {
    const { appId } = ctx.query;

    if (!appId) {
      ctx.body = {
        code: 400,
        message: '缺少 appId 参数',
      };
      return;
    }

    const resourceList = performanceStore.getByType(
      appId as string,
      'resource',
    ) as any[];

    // 按类型分组统计
    const typeStats = resourceList.reduce(
      (acc, item) => {
        const type = item.initiatorType || 'other';
        if (!acc[type]) {
          acc[type] = {
            count: 0,
            totalDuration: 0,
            totalSize: 0,
          };
        }
        acc[type].count++;
        acc[type].totalDuration += item.duration;
        acc[type].totalSize += item.transferSize || 0;
        return acc;
      },
      {} as Record<string, any>,
    );

    // 计算平均值
    Object.keys(typeStats).forEach(type => {
      typeStats[type].avgDuration = Math.round(
        typeStats[type].totalDuration / typeStats[type].count,
      );
      typeStats[type].avgSize = Math.round(
        typeStats[type].totalSize / typeStats[type].count,
      );
    });

    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        total: resourceList.length,
        typeStats,
      },
    };
  } catch (error: any) {
    ctx.body = {
      code: 500,
      message: error.message,
    };
  }
};

/**
 * 清空性能数据
 */
export const clearPerformanceData = async (ctx: Context) => {
  try {
    const { appId } = ctx.request.body;

    if (appId) {
      performanceStore.clear(appId);
      ctx.body = {
        code: 200,
        message: `已清空 appId ${appId} 的性能数据`,
      };
    } else {
      performanceStore.clearAll();
      ctx.body = {
        code: 200,
        message: '已清空所有性能数据',
      };
    }
  } catch (error: any) {
    ctx.body = {
      code: 500,
      message: error.message,
    };
  }
};

/**
 * 获取存储信息
 */
export const getStorageInfo = async (ctx: Context) => {
  try {
    const { appId } = ctx.query;

    const size = appId
      ? performanceStore.getSize(appId as string)
      : performanceStore.getSize();

    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        appId: appId || 'all',
        size,
        maxSize: 2000,
        usage: `${((size / 2000) * 100).toFixed(2)}%`,
      },
    };
  } catch (error: any) {
    ctx.body = {
      code: 500,
      message: error.message,
    };
  }
};
