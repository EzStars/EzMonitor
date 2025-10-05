import type { Context } from 'koa';
import type { MonitorReportData } from '../types';

/**
 * 接收监控数据上报
 */
export const reportMonitorData = async (ctx: Context) => {
  try {
    const body = ctx.request.body as MonitorReportData;
    const { userId, data, sendType } = body;

    // 数据验证
    if (!data || !Array.isArray(data)) {
      ctx.status = 400;
      ctx.body = {
        code: 400,
        message: '数据格式错误',
      };
      return;
    }

    // 打印接收到的数据（开发调试）
    console.log('📊 接收到监控数据:', {
      userId,
      dataCount: data.length,
      sendType,
      timestamp: new Date().toISOString(),
    });

    // 处理每条数据
    data.forEach((item, index) => {
      console.log(`  [${index + 1}] 类型: ${item.type}/${item.subType}`, {
        time: new Date(item.time).toLocaleString('zh-CN'),
        pageUrl: item.pageUrl,
      });

      // TODO: 根据数据类型分类处理
      switch (item.type) {
        case 'error':
          // 错误数据处理：存储到数据库、发送告警等
          handleErrorData(item);
          break;
        case 'performance':
          // 性能数据处理
          handlePerformanceData(item);
          break;
        case 'behavior':
          // 行为数据处理
          handleBehaviorData(item);
          break;
        default:
          console.log('  未知数据类型:', item.type);
      }
    });

    // TODO: 批量存储到数据库
    // await saveToDatabase(userId, data);

    // 返回成功响应
    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        received: data.length,
      },
    };
  } catch (error) {
    console.error('处理监控数据失败:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: '服务器错误',
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
};

/**
 * 处理错误数据
 */
function handleErrorData(data: any) {
  console.log('    🐛 错误信息:', data.message || data.errorMessage);
  // TODO: 存储错误数据、发送告警通知等
}

/**
 * 处理性能数据
 */
function handlePerformanceData(data: any) {
  console.log('    ⚡ 性能指标:', data.subType);
  // TODO: 存储性能数据、计算统计指标等
}

/**
 * 处理行为数据
 */
function handleBehaviorData(data: any) {
  console.log('    👤 用户行为:', data.subType);
  // TODO: 存储行为数据、分析用户路径等
}
