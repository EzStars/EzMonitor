# @ezmonitor/sdkv2

轻量、模块化、支持 tree-shaking 的 EzMonitor SDK v2 骨架。

## 特性

- TypeScript
- 支持 ESM/CJS 输出
- tree-shaking 友好（exports 可单独引用，package.json 中设置 sideEffects=false）
- 简单的 EventBus 与 PluginManager

## 快速开始

安装依赖并构建：

```bash
pnpm install
pnpm --filter ./packages/sdkv2 build
```

在项目中使用：

```ts
import { createSDK } from '@ezmonitor/sdkv2';

const sdk = createSDK({ appId: 'app' });

sdk.register({
  name: 'example',
  init(bus) {
    bus.on('test', (p) => console.log('got', p));
  }
});

sdk.init();

sdk.bus.emit('test', { a: 1 });
```
