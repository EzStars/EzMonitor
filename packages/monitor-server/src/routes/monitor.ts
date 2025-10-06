import Router from '@koa/router';
import { reportMonitorData } from '../controllers/monitor';
import {
  getPerformanceList,
  getPerformanceStats,
  getWebVitals,
  getSlowRequests,
  getErrorRequests,
  getResourceStats,
  clearPerformanceData,
  getStorageInfo,
} from '../controllers/performance';
import { connectSSE, getSSEStats } from '../controllers/sse';

// ✅ 不要添加 prefix，因为在 index.ts 中已经添加了
const router = new Router();

/**
 * @openapi
 * /monitor:
 *   post:
 *     summary: 数据上报
 *     tags: [Monitor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               sendType:
 *                 type: string
 *               data:
 *                 type: array
 *     responses:
 *       200:
 *         description: 上报成功
 */
router.post('/', reportMonitorData); // ✅ 使用根路径 /

/**
 * @openapi
 * /monitor/stream:
 *   get:
 *     summary: SSE 连接
 *     tags: [Monitor]
 *     parameters:
 *       - in: query
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 连接成功
 */
router.get('/stream', connectSSE);

/**
 * @openapi
 * /monitor/sse-stats:
 *   get:
 *     summary: SSE 连接统计
 *     tags: [Monitor]
 *     responses:
 *       200:
 *         description: 统计信息
 */
router.get('/sse-stats', getSSEStats);

/**
 * @openapi
 * /monitor/performance/list:
 *   get:
 *     summary: 获取性能数据列表
 *     tags: [Performance]
 *     parameters:
 *       - in: query
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: subType
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 性能数据列表
 */
router.get('/performance/list', getPerformanceList);

/**
 * @openapi
 * /monitor/performance/stats:
 *   get:
 *     summary: 获取性能统计
 *     tags: [Performance]
 *     parameters:
 *       - in: query
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 性能统计数据
 */
router.get('/performance/stats', getPerformanceStats);

/**
 * @openapi
 * /monitor/performance/webvitals:
 *   get:
 *     summary: 获取核心 Web Vitals
 *     tags: [Performance]
 *     parameters:
 *       - in: query
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Web Vitals 数据
 */
router.get('/performance/webvitals', getWebVitals);

/**
 * @openapi
 * /monitor/performance/slow-requests:
 *   get:
 *     summary: 获取慢请求列表
 *     tags: [Performance]
 *     parameters:
 *       - in: query
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           default: 1000
 *     responses:
 *       200:
 *         description: 慢请求列表
 */
router.get('/performance/slow-requests', getSlowRequests);

/**
 * @openapi
 * /monitor/performance/error-requests:
 *   get:
 *     summary: 获取错误请求列表
 *     tags: [Performance]
 *     parameters:
 *       - in: query
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 错误请求列表
 */
router.get('/performance/error-requests', getErrorRequests);

/**
 * @openapi
 * /monitor/performance/resource-stats:
 *   get:
 *     summary: 获取资源加载统计
 *     tags: [Performance]
 *     parameters:
 *       - in: query
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 资源统计信息
 */
router.get('/performance/resource-stats', getResourceStats);

/**
 * @openapi
 * /monitor/storage-info:
 *   get:
 *     summary: 获取存储信息
 *     tags: [Monitor]
 *     parameters:
 *       - in: query
 *         name: appId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 存储信息
 */
router.get('/storage-info', getStorageInfo);

/**
 * @openapi
 * /monitor/clear:
 *   post:
 *     summary: 清空数据
 *     tags: [Monitor]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               appId:
 *                 type: string
 *     responses:
 *       200:
 *         description: 清空成功
 */
router.post('/clear', clearPerformanceData);

export default router;
