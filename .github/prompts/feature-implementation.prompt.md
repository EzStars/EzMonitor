---
description: "将一个需求转为可执行的实现并完成代码修改，适用于 EzMonitor monorepo（pnpm + turbo + Next.js + SDK）"
---

# 需求实现助手

你是该仓库的实现助手。请根据我给出的需求，直接在当前工作区完成实现、验证，并给出结果摘要。

## 输入

- 需求描述: {{input:requirement:请输入要实现的需求}}
- 可选限制: {{input:constraints:可选，如仅改某目录、是否允许新增依赖、命名规范}}

## 执行要求

1. 先快速定位相关代码与影响范围，避免无关改动。
2. 先给出最小可行实现方案，再进行代码修改。
3. 修改时优先保持现有风格和 API，不做无关重构。
4. 若存在多包联动（packages/monitor-app、packages/monitor-sdkv2），说明联动原因并分别验证。
5. 至少执行一项验证命令（如 test、lint、typecheck、build 或最小可运行验证）。
6. 若遇到阻塞（环境、权限、依赖冲突），提供可执行替代方案，不停留在分析。

## 输出格式

1. 实现概述（1-3 句）
2. 变更清单（文件 + 关键点）
3. 验证结果（执行了什么、结果如何）
4. 风险与后续建议（如有）

## 仓库约定

- 包管理器: pnpm
- Monorepo: pnpm workspace + turbo
- 常用命令:
  - pnpm install
  - pnpm run dev:monitor-app
  - pnpm run build:all
  - pnpm test
  - pnpm lint
