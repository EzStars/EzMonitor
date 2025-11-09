/**
 * 测试 Reporter 功能
 */
const { createSDK, TrackingPlugin } = require('./dist/index.cjs.js');

// 模拟服务器端点
const mockServer = {
  data: [],
  handler: null,
};

// 启动简单的 HTTP 服务器监听上报
if (typeof require !== 'undefined') {
  try {
    const http = require('http');
    const server = http.createServer((req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            mockServer.data.push(data);
            console.log(
              '📥 [Mock Server] Received data:',
              data.type || 'unknown',
            );

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            console.error('❌ [Mock Server] Parse error:', error);
            res.writeHead(400);
            res.end();
          }
        });
      } else {
        res.writeHead(200);
        res.end();
      }
    });

    server.listen(3001, () => {
      console.log('🚀 Mock server started at http://localhost:3001\n');
      runTests();
    });

    mockServer.handler = server;
  } catch (error) {
    console.log('⚠️  HTTP module not available, skipping server tests');
    runTests();
  }
}

async function runTests() {
  console.log('🧪 开始测试 Reporter 功能...\n');

  // 测试 1: 基本上报功能
  console.log('✅ 测试 1: 基本上报功能');
  try {
    const sdk = createSDK({
      appId: 'test-app',
      reportUrl: 'http://localhost:3001/report',
      debug: true,
      enableRetry: false, // 先关闭重试，方便测试
    });

    // 注册 TrackingPlugin
    const trackingPlugin = new TrackingPlugin({
      enableBatch: false, // 关闭批量，立即上报
    });
    sdk.use(trackingPlugin);

    await sdk.init();
    await sdk.start();

    // 触发一个埋点事件
    trackingPlugin.track('test_event', {
      action: 'click',
      target: 'button',
    });

    // 等待上报完成
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('  ✓ 基本上报测试完成\n');
    await sdk.destroy();
  } catch (error) {
    console.error('  ✗ 失败:', error.message);
  }

  // 测试 2: 批量上报
  console.log('✅ 测试 2: 批量上报');
  try {
    const sdk = createSDK({
      appId: 'test-app',
      reportUrl: 'http://localhost:3001/report',
      debug: true,
      batchSize: 3,
    });

    const trackingPlugin = new TrackingPlugin({
      enableBatch: true,
      batchSize: 3,
    });
    sdk.use(trackingPlugin);

    await sdk.init();
    await sdk.start();

    // 触发多个事件
    trackingPlugin.track('event_1', { value: 1 });
    trackingPlugin.track('event_2', { value: 2 });
    trackingPlugin.track('event_3', { value: 3 }); // 达到阈值，应该触发批量上报

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('  ✓ 批量上报测试完成\n');
    await sdk.destroy();
  } catch (error) {
    console.error('  ✗ 失败:', error.message);
  }

  // 测试 3: 生命周期钩子
  console.log('✅ 测试 3: 生命周期钩子');
  try {
    let beforeCalled = false;
    let successCalled = false;
    let afterCalled = false;

    const sdk = createSDK({
      appId: 'test-app',
      reportUrl: 'http://localhost:3001/report',
      debug: false,
      beforeReport: data => {
        console.log('  ✓ beforeReport 钩子被调用');
        beforeCalled = true;
      },
      onReportSuccess: data => {
        console.log('  ✓ onReportSuccess 钩子被调用');
        successCalled = true;
      },
      afterReport: data => {
        console.log('  ✓ afterReport 钩子被调用');
        afterCalled = true;
      },
    });

    const trackingPlugin = new TrackingPlugin({
      enableBatch: false,
    });
    sdk.use(trackingPlugin);

    await sdk.init();
    await sdk.start();

    trackingPlugin.track('hook_test', { test: true });

    await new Promise(resolve => setTimeout(resolve, 1000));

    if (beforeCalled && successCalled && afterCalled) {
      console.log('  ✓ 所有钩子正常调用\n');
    } else {
      console.log('  ✗ 某些钩子未被调用');
    }

    await sdk.destroy();
  } catch (error) {
    console.error('  ✗ 失败:', error.message);
  }

  // 测试 4: 传输方式选择
  console.log('✅ 测试 4: 传输方式选择');
  try {
    // 小数据 - 应该使用 beacon
    console.log('  测试小数据传输 (应使用 beacon):');
    const sdk1 = createSDK({
      appId: 'test',
      reportUrl: 'http://localhost:3001/report',
      debug: true,
    });

    const plugin1 = new TrackingPlugin({ enableBatch: false });
    sdk1.use(plugin1);
    await sdk1.init();
    await sdk1.start();

    plugin1.track('small_data', { size: 'small' });
    await new Promise(resolve => setTimeout(resolve, 500));
    await sdk1.destroy();

    // 强制使用 XHR
    console.log('\n  测试强制 XHR:');
    const sdk2 = createSDK({
      appId: 'test',
      reportUrl: 'http://localhost:3001/report',
      forceXHR: true,
      debug: true,
    });

    const plugin2 = new TrackingPlugin({ enableBatch: false });
    sdk2.use(plugin2);
    await sdk2.init();
    await sdk2.start();

    plugin2.track('force_xhr', { mode: 'xhr' });
    await new Promise(resolve => setTimeout(resolve, 500));
    await sdk2.destroy();

    console.log('\n  ✓ 传输方式选择测试完成\n');
  } catch (error) {
    console.error('  ✗ 失败:', error.message);
  }

  // 测试 5: 重试机制
  console.log('✅ 测试 5: 重试机制');
  try {
    const sdk = createSDK({
      appId: 'test-app',
      reportUrl: 'http://localhost:9999/report', // 故意使用错误地址
      debug: true,
      enableRetry: true,
      retryStrategy: {
        maxRetries: 2,
        initialDelay: 500,
        backoffMultiplier: 2,
      },
      onReportError: (data, error) => {
        console.log('  ✓ onReportError 钩子被调用:', error.message);
      },
    });

    const trackingPlugin = new TrackingPlugin({ enableBatch: false });
    sdk.use(trackingPlugin);

    await sdk.init();
    await sdk.start();

    trackingPlugin.track('retry_test', { willFail: true });

    // 等待重试
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('  ✓ 重试机制测试完成\n');
    await sdk.destroy();
  } catch (error) {
    console.error('  ✗ 失败:', error.message);
  }

  // 测试总结
  console.log('\n✨ Reporter 功能测试完成！');
  console.log(`📊 Mock 服务器共接收到 ${mockServer.data.length} 次上报`);

  if (mockServer.data.length > 0) {
    console.log('\n接收到的数据示例:');
    console.log(JSON.stringify(mockServer.data[0], null, 2));
  }

  // 关闭服务器
  if (mockServer.handler) {
    mockServer.handler.close(() => {
      console.log('\n🔚 Mock 服务器已关闭');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}
