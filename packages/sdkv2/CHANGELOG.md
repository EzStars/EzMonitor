# @ezmonitor/sdkv2

## 0.2.0

### Minor Changes

- [`bcc13b2`](https://github.com/EzStars/EzMonitor/commit/bcc13b2c6ef1ca8b5fcaf3c74e51adbdcef2c257) Thanks [@Ni0duann](https://github.com/Ni0duann)! - 添加插件状态管理和事件系统优化
  - 将插件状态从联合类型重构为枚举类型，提高类型安全性
  - 统一事件常量管理，避免魔法字符串
  - 优化插件生命周期管理和错误处理
  - 添加完整的 TypeScript 类型定义和文档注释

  这些改进提升了 SDK 的可维护性和开发体验，为后续功能扩展提供了更好的基础。

### Patch Changes

- [`bcc13b2`](https://github.com/EzStars/EzMonitor/commit/bcc13b2c6ef1ca8b5fcaf3c74e51adbdcef2c257) Thanks [@Ni0duann](https://github.com/Ni0duann)! - 配置 Changeset 工具以便更好地管理版本发布
  - 添加了 GitHub changelog 生成器
  - 配置了自动化 CI/CD 流程
  - 添加了版本管理脚本
  - 优化了 monorepo 发包流程
