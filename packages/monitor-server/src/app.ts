import Koa from 'koa';
import cors from '@koa/cors';
import logger from 'koa-logger';
import { koaBody } from 'koa-body';
import router from './routes';

const app = new Koa();

// 配置
const PORT = process.env.PORT || 3000;

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

// 启动服务
app.listen(PORT, () => {
  console.log(`🚀 EzMonitor Server 运行在 http://127.0.0.1:${PORT}`);
  console.log(
    `📊 监控数据接收地址: http://127.0.0.1:${PORT}/api/monitor/report`,
  );
});

export default app;
