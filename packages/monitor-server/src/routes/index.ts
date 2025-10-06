import Router from '@koa/router';
import monitorRouter from './monitor';
import { koaSwagger } from 'koa2-swagger-ui';
import swaggerJsdoc from 'swagger-jsdoc';

const router = new Router();

// Swagger 配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EzMonitor API',
      version: '1.0.0',
      description: 'EzMonitor 监控系统 API 文档',
    },
    servers: [
      {
        url: 'http://localhost:3001',
      },
    ],
  },
  apis: ['./src/routes/**/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions) as Record<string, unknown>;

// Swagger UI 路由
router.get(
  '/api-docs',
  koaSwagger({
    routePrefix: false,
    swaggerOptions: {
      spec: swaggerSpec,
    },
  }),
);

/**
 * @openapi
 * /health:
 *   get:
 *     summary: 健康检查
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 服务正常
 */
router.get('/health', ctx => {
  ctx.body = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'EzMonitor Server',
  };
});

// ✅ 挂载监控路由 - 直接挂载到 /monitor
router.use('/monitor', monitorRouter.routes(), monitorRouter.allowedMethods());

// ✅ 同时支持 /api/monitor (可选)
router.use(
  '/api/monitor',
  monitorRouter.routes(),
  monitorRouter.allowedMethods(),
);

export default router;
