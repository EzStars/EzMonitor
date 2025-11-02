---
"@ezstars/monitor-sdkv2": patch
---

修复包名和 npm scope 问题

- 将包名从 `@ezmonitor/sdkv2` 改为 `@ezstars/monitor-sdkv2`
- 使用已有的 `@ezstars` scope 避免 npm 发布错误
- 更新相关构建脚本和 CI/CD 配置
