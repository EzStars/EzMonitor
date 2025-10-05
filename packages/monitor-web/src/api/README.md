# API 接口管理模块

这个目录包含了 EzMonitor 前端项目的所有 API 接口管理代码。基于 monitor-sdk 中的数据类型，提供了完整的接口封装。

## 目录结构

```
src/api/
├── index.ts              # 统一导出文件
├── request.ts            # 请求封装
├── types.ts              # 通用类型定义
└── modules/              # API 模块
    ├── error.ts          # 错误监控相关接口
    ├── performance.ts    # 性能监控相关接口
    ├── behavior.ts       # 行为监控相关接口
    ├── exception.ts      # 异常监控相关接口
    ├── project.ts        # 项目管理相关接口
    └── sourcemap.ts      # SourceMap 相关接口
```

## 使用方式

### 1. 基础使用

```typescript
import { api } from '@/api';

// 获取错误列表
const errorList = await api.error.getErrorList({
  pageNum: 1,
  pageSize: 20,
  projectId: 'your-project-id'
});

// 获取性能数据
const performanceData = await api.performance.getPerformanceOverview({
  projectId: 'your-project-id',
  timeRange: '7d'
});
```

### 2. 单独导入模块

```typescript
import { errorApi, performanceApi } from '@/api';

// 使用错误监控 API
const errors = await errorApi.getErrorList(params);

// 使用性能监控 API
const performance = await performanceApi.getPerformanceOverview(params);
```

### 3. 使用底层请求工具

```typescript
import { request } from '@/api';

// GET 请求
const data = await request.get('/custom-endpoint', { params: { id: 1 } });

// POST 请求
const result = await request.post('/custom-endpoint', { name: 'test' });
```

## API 模块说明

### 错误监控 (error.ts)
- 错误列表查询
- 错误详情获取
- 错误统计分析
- SourceMap 解析
- 错误行为轨迹
- 错误状态管理

### 性能监控 (performance.ts)
- 性能数据查询
- 性能指标分析
- Core Web Vitals
- 资源加载分析
- 用户体验指标
- 设备性能分析

### 行为监控 (behavior.ts)
- 用户行为数据
- 页面访问统计
- 用户路径分析
- 热点分析
- 转化漏斗
- 用户画像

### 异常监控 (exception.ts)
- 白屏检测
- 卡顿监控
- 崩溃检测
- 异常影响分析
- 根因分析
- 健康度评分

### 项目管理 (project.ts)
- 项目 CRUD
- 项目统计
- 成员管理
- API 密钥管理
- 项目配置

### SourceMap (sourcemap.ts)
- SourceMap 上传
- 错误位置解析
- 源码查看
- 文件管理
- 配置管理

## 类型定义

所有 API 接口的请求和响应类型都基于 monitor-sdk 中的数据类型定义，确保类型安全和一致性。

### 通用类型
- `ApiResponse<T>`: 统一响应格式
- `PaginationParams`: 分页请求参数
- `PaginationResponse<T>`: 分页响应数据

### SDK 数据类型
- `ErrorDataType`: 错误数据类型
- `PerformanceDataType`: 性能数据类型
- `BehaviorDataType`: 行为数据类型
- `ExceptionDataType`: 异常数据类型

## 错误处理

请求工具自动处理以下情况：
- HTTP 错误状态码
- 业务逻辑错误
- 网络超时
- 认证失败自动跳转

## 环境配置

在 `.env` 文件中配置 API 基础 URL：

```env
REACT_APP_API_BASE_URL=https://api.ezmonitor.com
```

## 开发指南

1. **添加新接口**：在对应模块文件中添加新的接口方法
2. **类型定义**：在 `types.ts` 中添加新的类型定义
3. **导入导出**：在 `index.ts` 中更新导出
4. **测试验证**：确保类型检查通过并测试接口调用

## 注意事项

1. 所有接口调用都是异步的，需要使用 `await` 或 `.then()`
2. 请求会自动添加认证 token（从 localStorage 获取）
3. GET 请求会自动添加时间戳防止缓存
4. 错误会被统一处理并抛出 Error 对象
5. 响应数据会自动提取 `data` 字段

## 示例代码

```typescript
// 组件中使用示例
import React, { useEffect, useState } from 'react';
import { api } from '@/api';
import type { ErrorDataType } from '@/api';

const ErrorList: React.FC = () => {
  const [errors, setErrors] = useState<ErrorDataType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchErrors = async () => {
      setLoading(true);
      try {
        const response = await api.error.getErrorList({
          pageNum: 1,
          pageSize: 20,
          projectId: 'your-project-id',
        });
        setErrors(response.list);
      } catch (error) {
        console.error('获取错误列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchErrors();
  }, []);

  return (
    <div>
      {loading ? (
        <div>加载中...</div>
      ) : (
        <div>
          {errors.map(error => (
            <div key={error.errId}>
              {error.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```
