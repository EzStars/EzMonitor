# 📦 发布指南

本项目使用 [Changesets](https://github.com/changesets/changesets) 管理版本控制和包发布。

## 🚀 快速开始

### 1. 添加变更记录

当你完成了 SDK v2 的功能或修复时，需要添加变更记录：

```bash
pnpm changeset:add
```

系统会提示你：
- 选择要更新的包（当前只管理 `@ezmonitor/sdkv2`）
- 选择变更类型（major/minor/patch）
- 填写变更描述

> **注意**: 目前 Changeset 只管理 `@ezmonitor/sdkv2` 包的版本发布，其他包会被忽略。

### 2. 提交变更

```bash
git add .
pnpm commit  # 使用 commitizen 规范提交
```

### 3. 推送到仓库

```bash
git push origin your-branch
```

## 🔄 发布流程

### 自动发布（推荐）

1. 合并 PR 到 `main` 分支
2. GitHub Actions 会自动：
   - 检测是否有待发布的变更
   - 创建 Release PR
   - 更新版本号和 CHANGELOG
3. 合并 Release PR 后自动发布到 npm

### 手动发布

```bash
# 1. 更新版本号
pnpm changeset:version

# 2. 构建所有包
pnpm build:all

# 3. 发布到 npm
pnpm changeset:publish
```

## 📋 变更类型说明

| 类型 | 说明 | 示例 |
|------|------|------|
| **patch** | Bug 修复，向后兼容 | 修复函数错误、文档更新 |
| **minor** | 新功能，向后兼容 | 添加新 API、新插件 |
| **major** | 重大更新，可能破坏向后兼容 | API 重构、移除废弃功能 |

## 🎯 最佳实践

### 变更描述规范

```markdown
---
"@ezstars/monitor-sdk": minor
"@ezmonitor/sdkv2": patch
---

添加性能监控插件

- 新增 PerformancePlugin 支持 Web Vitals 监控
- 优化错误捕获机制
- 修复 TypeScript 类型定义问题
```

### 提交信息规范

使用 [Conventional Commits](https://conventionalcommits.org/) 规范：

```bash
feat(sdk): 添加性能监控插件
fix(core): 修复插件管理器内存泄漏
docs: 更新 API 文档
chore: 更新依赖包版本
```

### 版本策略

- **预发布版本**: `0.x.x` 用于测试和早期反馈
- **稳定版本**: `1.x.x` 正式发布版本
- **长期支持**: 主要版本提供 LTS 支持

## 🛠 常用命令

```bash
# 查看变更状态
pnpm changeset:status

# 查看即将发布的版本
pnpm changeset status --verbose

# 手动创建 changeset
pnpm changeset add

# 删除所有 changeset（谨慎使用）
rm -rf .changeset/*.md

# 预览版本变更
pnpm changeset version --dry-run
```

## 🔍 故障排除

### 1. 发布失败

```bash
# 检查是否有构建错误
pnpm build:all

# 检查 npm 权限
npm whoami
```

### 2. 版本冲突

```bash
# 重置到最新状态
git fetch origin
git reset --hard origin/main

# 重新添加变更
pnpm changeset:add
```

### 3. 包依赖问题

```bash
# 清理并重新安装
pnpm clean:all
pnpm install

# 检查依赖关系
pnpm list --depth=0
```

## 📚 相关文档

- [Changesets 官方文档](https://github.com/changesets/changesets)
- [语义化版本规范](https://semver.org/lang/zh-CN/)
- [Conventional Commits](https://conventionalcommits.org/)
- [pnpm Workspace](https://pnpm.io/workspaces)
