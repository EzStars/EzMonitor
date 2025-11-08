import { createSDK } from '@ezstars/monitor-sdkv2';

// 创建一个全局的 SDK 实例
// 这里的配置应该是你的应用的默认配置
export const sdk = createSDK({
  appId: 'monitor-web',
  apiUrl: 'http://localhost:8080/report', // 指向你的 monitor-server 地址
  // 其他全局配置...
});

// 你可以在这里预注册一些核心插件
// 方式1: 使用 use 方法（推荐，支持链式调用）
// import { PerformancePlugin, ErrorPlugin } from '@ezstars/monitor-sdkv2';
// sdk.use(new PerformancePlugin()).use(new ErrorPlugin());

// 方式2: 通过 getCore() 访问 pluginManager
// sdk.getCore().pluginManager.register(new PerformancePlugin());
// sdk.getCore().pluginManager.register(new ErrorPlugin());

// 在应用启动时初始化 SDK
// 这是一个示例，实际应该在你的应用入口（如 index.tsx）中调用
export const initializeGlobalSDK = async () => {
  if (sdk.getStatus() === 'idle') {
    try {
      await sdk.init();
      await sdk.start();
      console.log('Global SDK initialized and started.');
    } catch (error) {
      console.error('Failed to initialize Global SDK:', error);
    }
  }
};
