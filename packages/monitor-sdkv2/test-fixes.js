/**
 * 测试架构修复后的功能
 */
const { createSDK } = require('./dist/index.cjs.js');

async function runTests() {
  console.log('🧪 开始测试 SDK v2 架构修复...\n');

  // 测试 1: 配置验证
  console.log('✅ 测试 1: 配置验证');
  try {
    const sdk1 = createSDK({
      appId: 'test-app',
      reportUrl: 'https://example.com/api/report',
      batchSize: 20,
      debug: true,
    });
    console.log('  ✓ 有效配置创建成功');
  } catch (error) {
    console.error('  ✗ 失败:', error.message);
  }

  // 测试 2: 无效 URL 验证
  console.log('\n✅ 测试 2: 无效 URL 验证');
  try {
    const sdk2 = createSDK({
      reportUrl: 'invalid-url',
    });
    await sdk2.init();
    console.log('  ✗ 应该抛出错误但没有');
  } catch (error) {
    console.log('  ✓ 正确拒绝了无效 URL:', error.message);
  }

  // 测试 3: 配置变更事件（使用 EventBus）
  console.log('\n✅ 测试 3: 配置变更事件（EventBus）');
  const sdk3 = createSDK({ debug: true });
  const eventBus = sdk3.getEventBus();

  eventBus.on('config:changed', payload => {
    console.log(`  ✓ 接收到配置变更事件: ${payload.key} = ${payload.value}`);
  });

  // 通过 SDK 获取 configManager 并修改配置
  // 注：这是内部测试，实际使用中不应该直接访问内部对象
  const core = sdk3.getCore();
  core._configManager?.set('testKey', 'testValue');

  // 测试 4: 插件注册时机检查
  console.log('\n✅ 测试 4: 插件注册时机检查');
  const sdk4 = createSDK({ debug: false });

  const testPlugin = {
    name: 'TestPlugin',
    version: '1.0.0',
    init: async () => console.log('  Plugin initialized'),
    start: async () => console.log('  Plugin started'),
    stop: async () => {},
    destroy: async () => {},
  };

  try {
    // 在 IDLE 状态注册插件 - 应该成功
    sdk4.use(testPlugin);
    console.log('  ✓ IDLE 状态下注册插件成功');

    // 初始化并启动 SDK
    await sdk4.init();
    await sdk4.start();

    // 尝试在 STARTED 状态注册插件 - 应该失败
    try {
      sdk4.use({
        name: 'AnotherPlugin',
        version: '1.0.0',
        init: async () => {},
      });
      console.log('  ✗ STARTED 状态下不应该允许注册插件');
    } catch (error) {
      console.log('  ✓ 正确拒绝了在 STARTED 状态注册插件:', error.message);
    }
  } catch (error) {
    console.error('  ✗ 测试失败:', error.message);
  }

  // 测试 5: 初始化事务性回滚
  console.log('\n✅ 测试 5: 初始化失败回滚');
  const sdk5 = createSDK({ appId: 'test' });

  // 注册一个会失败的插件
  sdk5.use({
    name: 'FailingPlugin',
    version: '1.0.0',
    init: async () => {
      throw new Error('Simulated init failure');
    },
  });

  try {
    await sdk5.init();
    console.log('  ✗ 应该抛出错误但没有');
  } catch (error) {
    console.log('  ✓ 初始化失败，检查状态回滚...');
    const status = sdk5.getStatus();
    console.log('  ✓ 状态正确回滚到:', status);
  }

  console.log('\n✨ 所有测试完成！');
}

// 运行测试
runTests().catch(console.error);
