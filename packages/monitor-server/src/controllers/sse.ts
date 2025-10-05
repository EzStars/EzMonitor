import { Context } from 'koa';
import { PassThrough } from 'stream';

// 存储所有 SSE 连接
const sseClients = new Map<string, Map<string, PassThrough>>();

/**
 * 建立 SSE 连接
 */
export const connectSSE = async (ctx: Context) => {
  const { appId } = ctx.query;

  if (!appId) {
    ctx.status = 400;
    ctx.body = { error: '缺少 appId 参数' };
    return;
  }

  // 设置 SSE 响应头
  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
  });

  // 创建流
  const stream = new PassThrough();
  ctx.body = stream;

  // 生成客户端 ID
  const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // 存储客户端连接
  if (!sseClients.has(appId as string)) {
    sseClients.set(appId as string, new Map());
  }
  sseClients.get(appId as string)!.set(clientId, stream);

  console.log(`✅ SSE 客户端连接: ${clientId}, appId: ${appId}`);
  console.log(`📊 当前连接数: ${getConnectionCount(appId as string)}`);

  // 发送连接成功消息
  sendToClient(stream, 'connected', {
    clientId,
    appId,
    message: '连接成功',
    timestamp: Date.now(),
  });

  // 定期发送心跳，保持连接活跃
  const heartbeat = setInterval(() => {
    sendToClient(stream, 'heartbeat', { timestamp: Date.now() });
  }, 30000); // 每30秒发送一次心跳

  // 监听客户端断开连接
  ctx.req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.get(appId as string)?.delete(clientId);
    console.log(`❌ SSE 客户端断开: ${clientId}`);
    console.log(`📊 当前连接数: ${getConnectionCount(appId as string)}`);
  });

  ctx.req.on('error', error => {
    console.error(`⚠️  SSE 连接错误: ${clientId}`, error);
    clearInterval(heartbeat);
    sseClients.get(appId as string)?.delete(clientId);
  });
};

/**
 * 向单个客户端发送消息
 */
function sendToClient(stream: PassThrough, event: string, data: any) {
  try {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    stream.write(message);
  } catch (error) {
    console.error('发送 SSE 消息失败:', error);
  }
}

/**
 * 向指定 appId 的所有客户端广播消息
 */
export function broadcastToApp(appId: string, event: string, data: any) {
  const clients = sseClients.get(appId);
  if (!clients || clients.size === 0) {
    return;
  }

  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  clients.forEach((stream, clientId) => {
    try {
      stream.write(message);
    } catch (error) {
      console.error(`发送消息到客户端 ${clientId} 失败:`, error);
      clients.delete(clientId);
    }
  });
}

/**
 * 广播给所有客户端
 */
export function broadcastToAll(event: string, data: any) {
  sseClients.forEach(clients => {
    clients.forEach(stream => {
      try {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        stream.write(message);
      } catch (error) {
        console.error('广播消息失败:', error);
      }
    });
  });
}

/**
 * 获取指定 appId 的连接数
 */
function getConnectionCount(appId: string): number {
  return sseClients.get(appId)?.size || 0;
}

/**
 * 获取所有连接数
 */
export function getTotalConnectionCount(): number {
  let total = 0;
  sseClients.forEach(clients => {
    total += clients.size;
  });
  return total;
}

/**
 * 获取连接统计信息
 */
export const getSSEStats = async (ctx: Context) => {
  const stats: Record<string, any> = {};

  sseClients.forEach((clients, appId) => {
    stats[appId] = {
      connections: clients.size,
      clientIds: Array.from(clients.keys()),
    };
  });

  ctx.body = {
    code: 200,
    message: 'success',
    data: {
      totalConnections: getTotalConnectionCount(),
      apps: stats,
    },
  };
};
