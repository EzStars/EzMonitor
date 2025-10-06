import Koa from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import router from './routes';

const app = new Koa();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());

// ✅ 修改 bodyParser 配置，支持 text/plain
app.use(
  bodyParser({
    enableTypes: ['json', 'form', 'text'], // 添加 text 类型支持
    extendTypes: {
      text: ['text/plain'], // 将 text/plain 也当作 JSON 处理
    },
    textLimit: '10mb', // 增加限制，防止大数据被截断
    jsonLimit: '10mb',
  }),
);

// 添加自定义中间件处理 text/plain
app.use(async (ctx, next) => {
  // 如果是 text/plain 且是 POST 请求，尝试解析为 JSON
  if (
    ctx.request.type === 'text/plain' &&
    ctx.method === 'POST' &&
    typeof ctx.request.body === 'string'
  ) {
    try {
      ctx.request.body = JSON.parse(ctx.request.body);
    } catch (error) {
      console.error('❌ 解析 text/plain 失败:', error);
    }
  }
  await next();
});

// 日志中间件
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

// 挂载主路由
app.use(router.routes());
app.use(router.allowedMethods());

// 启动服务器
app.listen(PORT, () => {
  console.log('\n🚀 EzMonitor 监控服务启动成功!\n');
  console.log(`📊 HTTP 服务: http://127.0.0.1:${PORT}`);
  console.log(`📡 数据上报: http://127.0.0.1:${PORT}/monitor`);
  console.log(
    `📈 SSE 连接: http://127.0.0.1:${PORT}/monitor/stream?appId=123456`,
  );
  console.log(`📖 API 文档: http://127.0.0.1:${PORT}/api-docs`);
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
