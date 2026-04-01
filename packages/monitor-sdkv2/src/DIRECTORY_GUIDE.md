# monitor-sdkv2 src 目录边界

## 目标

将“入口、工厂、核心、插件、类型”职责分离，避免文件职责混杂。

## 目录职责

- `core/`
  - SDK 运行时核心实现（生命周期、事件总线、插件管理、上报队列与传输）。
  - 不放业务插件实现。

- `factory/`
  - SDK 实例工厂层。
  - 当前仅包含 `createSDK.ts`，用于组装 `SDKCore` 并暴露链式 API。

- `plugins/`
  - 插件实现与插件私有类型。
  - 插件应聚焦采集与业务语义，不重复实现队列/重试/缓存。

- `types/`
  - 跨层共享类型与事件契约。
  - 不包含具体运行时逻辑。

- `index.ts`
  - 包主入口（全量导出）。

- `createSDK.ts`
  - 兼容入口（仅 re-export），避免历史 import 断裂。

## 边界规则

- 插件层只通过 `PluginContext` 或事件与核心交互。
- 插件不得直接操作 Reporter 内部队列实现。
- 新增对外 API 优先放在 `factory/` 或 `types/`，避免散落到 `core/` 内部文件。
- 新增插件先在 `plugins/<name>/` 自洽，再通过入口文件显式导出。
