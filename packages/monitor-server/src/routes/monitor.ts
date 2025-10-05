import Router from '@koa/router';
import { reportMonitorData } from '../controllers/monitor';

const router = new Router();

// 接收监控数据上报
router.post('/report', reportMonitorData);

// 获取监控数据列表（可选，用于 Web 端查询）
router.get('/list', async ctx => {
  // TODO: 从数据库查询数据
  ctx.body = {
    code: 200,
    message: 'success',
    data: [],
  };
});

export default router;
