import Koa from 'koa';
import cors from '@koa/cors';
import logger from 'koa-logger';
import { koaBody } from 'koa-body';
import router from './routes';

const app = new Koa();

// 配置
const PORT = process.env.PORT || 3001;

// 中间件
app.use(logger());
app.use(
  cors({
    origin: '*', // 生产环境建议配置具体的域名
    credentials: true,
  }),
);
app.use(
  koaBody({
    jsonLimit: '10mb',
    formLimit: '10mb',
    textLimit: '10mb',
  }),
);

// 路由
app.use(router.routes());
app.use(router.allowedMethods());

// 错误处理
app.on('error', (err, ctx) => {
  console.error('服务器错误:', err);
});

// 优雅关闭
const server = app.listen(PORT, () => {
  console.log(`🚀 EzMonitor Server 运行在 http://127.0.0.1:${PORT}`);
  console.log(
    `📊 监控数据接收地址: http://127.0.0.1:${PORT}/api/monitor/report\n` +
      `📖 API文档地址: http://127.0.0.1:${PORT}/api-docs`,
  );
});

// 处理进程退出
const gracefulShutdown = () => {
  console.log('\n正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });

  // 如果10秒后还没关闭，强制退出
  setTimeout(() => {
    console.error('⚠️  强制关闭服务器');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;
