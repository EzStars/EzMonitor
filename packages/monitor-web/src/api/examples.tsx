/**
 * API 使用示例
 * 展示如何在 React 组件中使用 API 接口
 */

import React, { useEffect, useState } from 'react';
import { api } from './index';
import type { ErrorDataType } from './index';

// 示例1: 错误监控数据获取
export const ErrorMonitorExample: React.FC = () => {
  const [errors, setErrors] = useState<ErrorDataType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchErrorData = async () => {
      setLoading(true);
      try {
        // 获取错误列表
        const errorResponse = await api.error.getErrorList({
          pageNum: 1,
          pageSize: 20,
          projectId: 'your-project-id',
          errorType: 'js',
        });
        setErrors(errorResponse.list);

        // 获取错误统计
        const errorStats = await api.error.getErrorStats({
          projectId: 'your-project-id',
          timeRange: '7d',
        });
        console.log('错误统计:', errorStats);
      } catch (error) {
        console.error('获取错误数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchErrorData();
  }, []);

  return (
    <div>
      <h2>错误监控示例</h2>
      {loading ? (
        <div>加载中...</div>
      ) : (
        <div>
          {errors.map(error => (
            <div
              key={error.errId}
              style={{
                border: '1px solid #ccc',
                margin: '10px',
                padding: '10px',
              }}
            >
              <p>
                <strong>错误ID:</strong> {error.errId}
              </p>
              <p>
                <strong>错误信息:</strong>{' '}
                {typeof error.message === 'string' ? error.message : '未知错误'}
              </p>
              <p>
                <strong>页面URL:</strong> {error.pageUrl}
              </p>
              <p>
                <strong>时间:</strong>{' '}
                {new Date(error.timestamp).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 示例2: 性能监控数据获取
export const PerformanceMonitorExample: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      setLoading(true);
      try {
        // 获取性能概览
        const overview = await api.performance.getPerformanceOverview({
          projectId: 'your-project-id',
          timeRange: '7d',
        });
        setPerformanceData(overview);

        // 获取 Core Web Vitals
        const coreWebVitals = await api.performance.getCoreWebVitals({
          projectId: 'your-project-id',
          timeRange: '7d',
        });
        console.log('Core Web Vitals:', coreWebVitals);
      } catch (error) {
        console.error('获取性能数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, []);

  return (
    <div>
      <h2>性能监控示例</h2>
      {loading ? (
        <div>加载中...</div>
      ) : performanceData ? (
        <div>
          <h3>页面性能指标</h3>
          <p>FCP: {performanceData.pageMetrics.fcp}ms</p>
          <p>LCP: {performanceData.pageMetrics.lcp}ms</p>
          <p>FID: {performanceData.pageMetrics.fid}ms</p>
          <p>CLS: {performanceData.pageMetrics.cls}</p>

          <h3>资源加载</h3>
          <p>总资源数: {performanceData.resourceMetrics.totalResources}</p>
          <p>失败资源数: {performanceData.resourceMetrics.failedResources}</p>
          <p>平均加载时间: {performanceData.resourceMetrics.avgLoadTime}ms</p>
        </div>
      ) : null}
    </div>
  );
};

// 示例3: 用户行为数据获取
export const BehaviorMonitorExample: React.FC = () => {
  const [behaviorData, setBehaviorData] = useState<any>(null);

  useEffect(() => {
    const fetchBehaviorData = async () => {
      try {
        // 获取行为概览
        const overview = await api.behavior.getBehaviorOverview({
          projectId: 'your-project-id',
          timeRange: '7d',
        });
        setBehaviorData(overview);

        // 获取页面统计
        const pageStats = await api.behavior.getPageStats({
          projectId: 'your-project-id',
          timeRange: '7d',
        });
        console.log('页面统计:', pageStats);

        // 获取用户会话详情（需要具体的用户ID和会话ID）
        // const session = await api.behavior.getUserSession({
        //   userId: 'user-123',
        //   sessionId: 'session-456',
        // });
        // setUserSession(session);
      } catch (error) {
        console.error('获取行为数据失败:', error);
      }
    };

    fetchBehaviorData();
  }, []);

  return (
    <div>
      <h2>行为监控示例</h2>
      {behaviorData ? (
        <div>
          <h3>概览统计</h3>
          <p>总用户数: {behaviorData.totalUsers}</p>
          <p>总会话数: {behaviorData.totalSessions}</p>
          <p>平均会话时长: {behaviorData.avgSessionDuration}分钟</p>
          <p>跳出率: {(behaviorData.bounceRate * 100).toFixed(2)}%</p>

          <h3>热门页面</h3>
          {behaviorData.topPages.map((page: any, index: number) => (
            <div key={index}>
              <p>
                {page.pageUrl} - PV: {page.pv}, UV: {page.uv}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div>加载中...</div>
      )}
    </div>
  );
};

// 示例4: 项目管理
export const ProjectManagementExample: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // 获取项目列表
        const projectList = await api.project.getProjectList();
        setProjects(projectList);

        if (projectList.length > 0) {
          // 获取第一个项目的详情
          const projectDetail = await api.project.getProjectDetail(
            projectList[0].id,
          );
          setSelectedProject(projectDetail);

          // 获取项目仪表板数据
          const dashboard = await api.project.getProjectDashboard(
            projectList[0].id,
            '7d',
          );
          console.log('项目仪表板:', dashboard);
        }
      } catch (error) {
        console.error('获取项目数据失败:', error);
      }
    };

    fetchProjects();
  }, []);

  const handleCreateProject = async () => {
    try {
      const newProject = await api.project.createProject({
        name: '新项目',
        description: '这是一个测试项目',
        settings: {
          errorMonitoring: true,
          performanceMonitoring: true,
          behaviorMonitoring: true,
          exceptionMonitoring: true,
        },
      });
      console.log('创建的项目:', newProject);

      // 重新获取项目列表
      const updatedProjects = await api.project.getProjectList();
      setProjects(updatedProjects);
    } catch (error) {
      console.error('创建项目失败:', error);
    }
  };

  return (
    <div>
      <h2>项目管理示例</h2>
      <button onClick={handleCreateProject}>创建新项目</button>

      <h3>项目列表</h3>
      {projects.map(project => (
        <div
          key={project.id}
          style={{ border: '1px solid #ddd', margin: '10px', padding: '10px' }}
        >
          <h4>{project.name}</h4>
          <p>App ID: {project.appId}</p>
          <p>状态: {project.status}</p>
          <p>成员数: {project.memberCount}</p>
        </div>
      ))}

      {selectedProject && (
        <div>
          <h3>选中项目详情</h3>
          <p>项目名称: {selectedProject.name}</p>
          <p>描述: {selectedProject.description}</p>
          <p>
            创建时间: {new Date(selectedProject.createdAt).toLocaleString()}
          </p>
          <h4>监控设置</h4>
          <p>
            错误监控:{' '}
            {selectedProject.settings.errorMonitoring ? '开启' : '关闭'}
          </p>
          <p>
            性能监控:{' '}
            {selectedProject.settings.performanceMonitoring ? '开启' : '关闭'}
          </p>
          <p>
            行为监控:{' '}
            {selectedProject.settings.behaviorMonitoring ? '开启' : '关闭'}
          </p>
        </div>
      )}
    </div>
  );
};

// 示例5: SourceMap 管理
export const SourceMapExample: React.FC = () => {
  const [sourceMapList, setSourceMapList] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  useEffect(() => {
    const fetchSourceMaps = async () => {
      try {
        const response = await api.sourceMap.getSourceMapList(
          'your-project-id',
          {
            page: 1,
            pageSize: 10,
          },
        );
        setSourceMapList(response.list);
      } catch (error) {
        console.error('获取 SourceMap 列表失败:', error);
      }
    };

    fetchSourceMaps();
  }, []);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadProgress('上传中...');

    try {
      const formData = new FormData();
      formData.append('sourcemap', file);

      const result = await api.sourceMap.uploadSourceMap(
        'your-project-id',
        formData,
      );
      console.log('上传成功:', result);
      setUploadProgress('上传成功');

      // 重新获取列表
      const response = await api.sourceMap.getSourceMapList('your-project-id');
      setSourceMapList(response.list);
    } catch (error) {
      console.error('上传失败:', error);
      setUploadProgress('上传失败');
    }
  };

  const handleResolveError = async () => {
    try {
      const result = await api.sourceMap.resolveSourceMap({
        projectId: 'your-project-id',
        filename: 'main.js',
        line: 1,
        column: 100,
      });
      console.log('解析结果:', result);
    } catch (error) {
      console.error('解析失败:', error);
    }
  };

  return (
    <div>
      <h2>SourceMap 管理示例</h2>

      <div>
        <h3>上传 SourceMap</h3>
        <input type="file" accept=".map" onChange={handleFileUpload} />
        {uploadProgress && <p>{uploadProgress}</p>}
      </div>

      <div>
        <h3>SourceMap 列表</h3>
        {sourceMapList.map(file => (
          <div
            key={file.fileId}
            style={{ border: '1px solid #eee', margin: '5px', padding: '10px' }}
          >
            <p>文件名: {file.filename}</p>
            <p>大小: {(file.size / 1024).toFixed(2)} KB</p>
            <p>上传时间: {new Date(file.uploadTime).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div>
        <h3>错误位置解析</h3>
        <button onClick={handleResolveError}>解析示例错误位置</button>
      </div>
    </div>
  );
};

// 综合示例组件
export const ApiExamples: React.FC = () => {
  const [activeTab, setActiveTab] = useState('error');

  const tabs = [
    { key: 'error', label: '错误监控', component: ErrorMonitorExample },
    {
      key: 'performance',
      label: '性能监控',
      component: PerformanceMonitorExample,
    },
    { key: 'behavior', label: '行为监控', component: BehaviorMonitorExample },
    { key: 'project', label: '项目管理', component: ProjectManagementExample },
    { key: 'sourcemap', label: 'SourceMap', component: SourceMapExample },
  ];

  const ActiveComponent =
    tabs.find(tab => tab.key === activeTab)?.component || ErrorMonitorExample;

  return (
    <div style={{ padding: '20px' }}>
      <h1>EzMonitor API 使用示例</h1>

      <div style={{ marginBottom: '20px' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              margin: '0 5px',
              padding: '8px 16px',
              backgroundColor: activeTab === tab.key ? '#1890ff' : '#f0f0f0',
              color: activeTab === tab.key ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        <ActiveComponent />
      </div>
    </div>
  );
};

export default ApiExamples;
