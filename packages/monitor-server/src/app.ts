import Koa from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import performanceRoutes from './routes/performance';

const app = new Koa();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(bodyParser());

// 日志中间件
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

// 路由
app.use(performanceRoutes.routes());
app.use(performanceRoutes.allowedMethods());

// 健康检查
app.use(async ctx => {
  if (ctx.path === '/health') {
    ctx.body = { status: 'ok', timestamp: Date.now() };
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log('\n🚀 EzMonitor 性能监控服务启动成功!\n');
  console.log(`📊 HTTP 服务: http://127.0.0.1:${PORT}`);
  console.log(
    `� SSE 连接: http://127.0.0.1:${PORT}/api/performance/stream?appId=123456`,
  );
  console.log(`� 数据上报: http://127.0.0.1:${PORT}/api/performance/report`);
  console.log(`💚 健康检查: http://127.0.0.1:${PORT}/health\n`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('\n正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  process.exit(0);
});
