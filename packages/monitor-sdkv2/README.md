# @ezstars/monitor-sdkv2

轻量、模块化、可扩展的前端监控 SDK v2。内核围绕“事件总线 + 插件体系 + 上报层（批量/重试/传输）”设计，支持按需替换或扩展各层能力。

## 架构概览

- 核心组件
  - EventBus 与 TypedEventBus：事件通信与类型安全封装
  - PluginManager + PluginContext：插件生命周期与受限能力注入
  - Reporter：编排三件套
    - TransportAdapter（Beacon/XHR/Image，可扩展）
    - RetryScheduler（指数退避、网络上下线）
    - BatchBuffer（批量缓冲、离线持久化）

## 快速开始

构建本包：

```bash
pnpm install
pnpm -C packages/monitor-sdkv2 build
```

初始化 SDK：

```ts
import { createSDK, TrackingPlugin } from '@ezstars/monitor-sdkv2'

const sdk = createSDK({
  appId: 'demo-app',
  reportUrl: 'https://your-endpoint/report',
  enableRetry: true,
  batchSize: 20,
  batchInterval: 10_000,
})

// 使用插件（支持链式）
sdk
  .use(new TrackingPlugin({ autoTrackPage: true }))
  .init()
  .then(() => sdk.start())
```

## 插件开发（推荐）

插件的 `init/start` 支持接受第三参 `PluginContext`：

```ts
import type { EventBus, IPlugin, PluginContext, PluginStatus, SDKConfig } from '@ezstars/monitor-sdkv2'

export class MyPlugin implements IPlugin {
  name = 'my'
  version = '1.0.0'
  status = 'registered' as PluginStatus
  private ctx?: PluginContext

  async init(config: SDKConfig, eventBus: EventBus, ctx?: PluginContext) {
    this.ctx = ctx
  }

  async start(_c?: SDKConfig, _b?: EventBus, ctx?: PluginContext) {
    if (ctx)
      this.ctx = ctx
    // 类型安全事件与上报
    this.ctx?.events.emit('tracking:event', {
      eventName: 'plugin_started',
      properties: { from: 'MyPlugin' },
      context: {},
    })
    this.ctx?.reporter.report('custom', { hello: 'world' })
  }
}
```

## 自定义传输适配器

实现 `TransportAdapter` 并在 Reporter 中注册，即可扩展新的传输方式：

```ts
import type { TransportAdapter } from '@ezstars/monitor-sdkv2'
import { TransportType } from '@ezstars/monitor-sdkv2'

class FetchTransport implements TransportAdapter {
  readonly type = TransportType.XHR // 也可扩展自定义 type
  isSupported() { return typeof fetch === 'function' }
  async send(url: string, data: string) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: data })
    if (!r.ok)
      throw new Error(`HTTP ${r.status}`)
    return r.text()
  }
}
```

## 配置热更新

对以下配置的变更将实时生效：`reportUrl`、`forceXHR`、`enableRetry`、`retryStrategy`、`beforeReport/onReportSuccess/onReportError/afterReport`。

## 自定义传输策略

可通过 `transportStrategy` 配置项自定义不同载荷选择何种传输方式：

```ts
import type { TransportStrategy } from '@ezstars/monitor-sdkv2'
import { TransportType } from '@ezstars/monitor-sdkv2'

class MyStrategy implements TransportStrategy {
  select(payload, env) {
    const sizeKB = new Blob([JSON.stringify(payload)]).size / 1024
    if (env.supportBeacon && sizeKB < 128)
      return TransportType.BEACON
    if (sizeKB < 1)
      return TransportType.IMAGE
    return TransportType.XHR
  }
}

createSDK({
  appId: 'demo',
  reportUrl: '/collect',
  transportStrategy: new MyStrategy(),
})
```

## 许可证

MIT
