import Router from '@koa/router';
import monitorRouter from './monitor';

const router = new Router();

// 健康检查
router.get('/health', ctx => {
  ctx.body = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'EzMonitor Server',
  };
});

// 挂载监控路由
router.use(
  '/api/monitor',
  monitorRouter.routes(),
  monitorRouter.allowedMethods(),
);

export default router;
