import { Context } from 'koa';
import { v4 as uuidv4 } from 'uuid';
import { performanceStore } from '../cache/performanceStore';
import { broadcastToApp } from './sse';

/**
 * 统一接收所有监控数据上报
 */
export const reportMonitorData = async (ctx: Context) => {
  try {
    const body = ctx.request.body;

    // ✅ 打印原始请求数据，方便调试
    console.log('\n📥 收到上报请求:');
    console.log('  Headers:', ctx.headers);
    console.log('  Body:', JSON.stringify(body, null, 2));
    console.log('  Body Type:', typeof body);
    console.log('  Is Array:', Array.isArray(body));

    // 提取数据
    const { userId, data, sendType } = body || {};

    // 获取客户端信息
    const userAgent = ctx.get('user-agent');
    const ip = ctx.ip;

    // ✅ 更详细的数据验证
    if (!body) {
      console.log('❌ body 为空');
      ctx.status = 400;
      ctx.body = {
        code: 400,
        message: '请求体为空',
      };
      return;
    }

    if (!data) {
      console.log('❌ data 字段不存在');
      ctx.status = 400;
      ctx.body = {
        code: 400,
        message: '缺少 data 字段',
        receivedBody: body,
      };
      return;
    }

    if (!Array.isArray(data)) {
      console.log('❌ data 不是数组:', typeof data);
      ctx.status = 400;
      ctx.body = {
        code: 400,
        message: 'data 必须是数组',
        receivedData: data,
        dataType: typeof data,
      };
      return;
    }

    if (data.length === 0) {
      console.log('❌ data 数组为空');
      ctx.status = 400;
      ctx.body = {
        code: 400,
        message: 'data 数组为空',
      };
      return;
    }

    console.log('✅ 数据验证通过');
    console.log('  userId:', userId);
    console.log('  sendType:', sendType);
    console.log('  data.length:', data.length);

    // 统计处理结果
    const results = {
      performance: 0,
      error: 0,
      behavior: 0,
      exception: 0,
      total: data.length,
      processed: [] as any[],
    };

    // 处理每条数据
    data.forEach((item, index) => {
      try {
        console.log(`\n  处理数据 [${index + 1}/${data.length}]:`, {
          type: item.type,
          subType: item.subType,
        });

        const baseData = {
          id: uuidv4(),
          appId: item.appId || '123456',
          userId: userId || 'unknown',
          userAgent,
          ip,
          timestamp: item.timestamp || Date.now(),
          ...item,
        };

        const appId = baseData.appId;

        // 根据类型分发处理
        switch (item.type) {
          case 'performance':
            handlePerformanceData(appId, baseData);
            results.performance++;
            break;

          case 'error':
            handleErrorData(appId, baseData);
            results.error++;
            break;

          case 'behavior':
            handleBehaviorData(appId, baseData);
            results.behavior++;
            break;

          case 'exception':
            handleExceptionData(appId, baseData);
            results.exception++;
            break;

          default:
            console.log('    ⚠️  未知的数据类型:', item.type);
        }

        results.processed.push({
          type: item.type,
          subType: item.subType,
          status: 'success',
        });
      } catch (error) {
        console.error(`    ❌ 处理数据失败 [${index + 1}]:`, error);
        results.processed.push({
          type: item.type,
          subType: item.subType,
          status: 'failed',
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    });

    // 如果有性能数据，推送最新统计
    if (results.performance > 0) {
      const appId = data[0]?.appId || '123456';
      const stats = performanceStore.getStats(appId);
      broadcastToApp(appId, 'performance:stats', stats);
      console.log('  📊 已推送统计数据');
    }

    console.log('\n✅ 数据处理完成:', results);

    // 返回成功响应
    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        ...results,
        sendType,
      },
    };
  } catch (error) {
    console.error('\n❌ 处理监控数据失败:', error);
    console.error('  错误堆栈:', error instanceof Error ? error.stack : '无');

    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: '服务器错误',
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
};

/**
 * 处理性能数据
 */
function handlePerformanceData(appId: string, data: any) {
  console.log('    ⚡ 性能指标:', data.subType);

  try {
    // 存储到 performanceStore
    performanceStore.add(appId, data);

    // 通过 SSE 实时推送
    broadcastToApp(appId, `performance:${data.subType}`, data);

    // 检测慢请求并告警
    if (
      (data.subType === 'fetch' || data.subType === 'xhr') &&
      data.duration > 1000
    ) {
      console.log('    ⚠️  检测到慢请求:', data.name, `${data.duration}ms`);
      broadcastToApp(appId, 'performance:slow-request', {
        type: 'slow-request',
        message: `检测到慢请求: ${data.name}`,
        duration: data.duration,
        data: data,
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    console.error('    ❌ 处理性能数据失败:', error);
    throw error;
  }
}

/**
 * 处理错误数据
 */
function handleErrorData(appId: string, data: any) {
  console.log('    🐛 错误信息:', data.message || data.errorMessage);

  try {
    // 通过 SSE 实时推送
    broadcastToApp(appId, `error:${data.subType}`, data);

    // 发送错误告警
    broadcastToApp(appId, 'error:alert', {
      type: 'error',
      subType: data.subType,
      message: `${data.subType}: ${data.message || data.errorMessage}`,
      data: data,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('    ❌ 处理错误数据失败:', error);
    throw error;
  }
}

/**
 * 处理行为数据
 */
function handleBehaviorData(appId: string, data: any) {
  console.log('    👤 用户行为:', data.subType);

  try {
    // 通过 SSE 实时推送
    broadcastToApp(appId, `behavior:${data.subType}`, data);
  } catch (error) {
    console.error('    ❌ 处理行为数据失败:', error);
    throw error;
  }
}

/**
 * 处理异常数据
 */
function handleExceptionData(appId: string, data: any) {
  console.log('    ⚠️  异常类型:', data.subType);

  try {
    // 通过 SSE 实时推送
    broadcastToApp(appId, `exception:${data.subType}`, data);

    // 严重异常告警
    if (data.subType === 'crash') {
      broadcastToApp(appId, 'exception:critical', {
        type: 'crash',
        message: '检测到页面崩溃',
        data: data,
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    console.error('    ❌ 处理异常数据失败:', error);
    throw error;
  }
}
