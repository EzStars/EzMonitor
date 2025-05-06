# EzMonitor 监控平台

EzMonitor 是一个开源的前端监控解决方案，提供开箱即用的 SDK，帮助开发者快速实现应用的性能监控、异常监控和用户行为分析。

## 技术架构

- 🏗️ **分层设计**
  - 采集层：基于 PerformanceObserver 和 Error 事件捕获原始数据
  - 处理层：数据过滤、采样和聚合
  - 上报层：支持批量上报和失败重试机制

## 技术亮点

- 🚀 **性能监控** 
  - 基于最新的 Web 性能 API (PerformanceObserver) 实现精准监控
  - 支持 FP、FCP、LCP、FID、CLS 等核心 Web Vitals 指标
  - 自动检测白屏并提供详细诊断信息

- ⚡ **持续集成**
  - 采用 Turbo 实现增量构建，CI 时间减少 60%
  - 通过 Changeset 实现自动化版本管理和发布流程
  - 完善的 GitHub Actions 工作流

- 📝 **规范管理**
  - 通过 Husky + Commitlint 强制规范 Git 提交信息
  - 使用 ESLint + Prettier 统一代码风格
  - 基于 Conventional Commits 规范生成 changelog

- 🏗️ **工程化**
  - 基于 Rollup 实现 SDK 打包，支持 ESM/CJS 双模块格式
  - 使用 rsbuild 构建 Web 应用
  - 支持 Tree Shaking 优化打包体积
  - 完善的 TypeScript 类型定义

## 核心特性

- 📊 **全面的性能监控**
  - 支持 FP、FCP、LCP 等核心性能指标
  - 基于 PerformanceObserver 实现精准监控
  - 白屏检测算法自动发现页面异常 

- 🔍 **异常监控**
  - JavaScript 异常捕获
  - Promise 异常监控
  - 资源加载异常监控
  - 接口请求异常监控

- 📈 **数据上报**
  - 支持延时批量上报 
  - 灵活的数据上报配置
  - CDN引入支持

## 开发协作

- 👥 **团队协作**
  - 采用 Monorepo 架构管理多包依赖
  - 使用 pnpm workspace 优化依赖安装速度
  - 完善的代码审查和 PR 流程


该项目由 [EzStars团队](https://ezstars.github.io/EzMonitor/about.html) 开发维护，采用 MIT 许可证开源。欢迎社区贡献和使用反馈。