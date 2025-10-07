import React, { useEffect, useState, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Typography,
  Alert,
  Progress,
  Table,
  Empty,
  Tag,
  message,
  Tabs,
} from 'antd';
import {
  DashboardOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  ApiOutlined,
  SyncOutlined,
  FireOutlined,
  RocketOutlined,
  CloudOutlined,
  LinkOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';
import { getPerformanceList, getPerformanceStats } from '../../api/performance';
import { API_BASE_URL } from '../../api';
import type {
  PerformanceData,
  PerformanceStats,
} from '../../types/performance';
import styles from './index.module.scss';

import Ezmonitor from '@ezstars/monitor-sdk';

Ezmonitor.init();
Ezmonitor.Performance();

const { Title } = Typography;
const PerformancePage: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  // 统计数据
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const eventSourceRef = useRef<EventSource | null>(null);
  const appId = '123456';

  // 获取初始数据
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const listResponse = await getPerformanceList({
        appId,
        limit: 50,
      });

      const rawData = listResponse.list || [];
      console.log('✅ API 返回原始数据:', rawData);

      // 🔧 展平 resource 类型的数据
      const flattenedData = flattenPerformanceData(rawData);
      console.log('✅ 展平后的数据:', flattenedData);
      console.log('📊 数据条数:', flattenedData.length);

      setPerformanceData(flattenedData);

      // 获取统计数据
      const statsResponse = await getPerformanceStats({ appId });
      console.log('📈 统计数据原始响应:', statsResponse);

      // 🔧 检查数据结构并打印详细信息
      console.log('📊 FCP 统计:', statsResponse?.fcp);
      console.log('📊 LCP 统计:', statsResponse?.lcp);
      console.log('📊 Load 统计:', statsResponse?.load);

      setStats(statsResponse);
    } catch (error) {
      console.error('❌ 获取性能数据失败:', error);
      message.error('数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 🔧 展平性能数据，处理 resource 类型的嵌套结构
  const flattenPerformanceData = (data: any[]): PerformanceData[] => {
    const flattened: PerformanceData[] = [];

    data.forEach(item => {
      if (item.subType === 'resource' && item.resourceList) {
        // resource 类型：展开 resourceList
        item.resourceList.forEach((resource: any) => {
          flattened.push({
            ...resource,
            id:
              resource.id ||
              `${item.id}_${resource.name}_${resource.timestamp}`,
            appId: item.appId,
            userId: item.userId,
            userAgent: item.userAgent,
            ip: item.ip,
          });
        });
      } else {
        // 其他类型：直接添加
        flattened.push(item);
      }
    });

    return flattened;
  };

  // 建立SSE连接
  const connectSSE = () => {
    if (eventSourceRef.current) {
      console.log('⚠️  SSE 连接已存在');
      return;
    }

    const url = `${API_BASE_URL}/api/monitor/stream?appId=${appId}`;
    console.log('🔌 正在连接 SSE:', url);

    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log('✅ SSE 连接已建立');
      setConnected(true);
    };

    eventSource.onerror = error => {
      console.error('❌ SSE 连接错误:', error);
      setConnected(false);
      eventSource.close();
      eventSourceRef.current = null;
      message.error('实时监控连接断开');
    };

    // 监听连接成功事件
    eventSource.addEventListener('connected', event => {
      const data = JSON.parse(event.data);
      console.log('🎉 SSE 连接成功:', data);
    });

    // 监听心跳事件
    eventSource.addEventListener('heartbeat', event => {
      const data = JSON.parse(event.data);
      console.log('💓 心跳:', new Date(data.timestamp).toLocaleTimeString());
    });

    // 监听性能数据事件
    const performanceTypes = ['fcp', 'lcp', 'load', 'fetch', 'xhr', 'resource'];

    performanceTypes.forEach(type => {
      eventSource.addEventListener(`performance:${type}`, event => {
        const rawData = JSON.parse(event.data);
        console.log(`📊 收到 ${type.toUpperCase()} 原始数据:`, rawData);

        // 🔧 处理 resource 类型的嵌套数据
        let newItems: PerformanceData[] = [];

        if (type === 'resource' && rawData.resourceList) {
          // resource 类型：展开 resourceList
          newItems = rawData.resourceList.map((resource: any) => ({
            ...resource,
            id:
              resource.id ||
              `${rawData.id}_${resource.name}_${resource.timestamp}`,
            appId: rawData.appId,
            userId: rawData.userId,
            userAgent: rawData.userAgent,
            ip: rawData.ip,
          }));
          console.log(`📦 展开 ${newItems.length} 个资源:`, newItems);
        } else {
          // 其他类型：直接使用
          newItems = [rawData];
        }

        // 添加到数据列表
        setPerformanceData(prev => {
          const newData = [...newItems, ...prev].slice(0, 100);
          console.log(`🔄 更新后的数据列表 (${type}):`, newData.length, '条');
          return newData;
        });

        const count = newItems.length;
        message.info(
          type === 'resource'
            ? `收到 ${count} 个新资源加载数据`
            : `收到新的 ${type.toUpperCase()} 性能数据`,
        );
      });
    });

    eventSourceRef.current = eventSource;
  };

  // 断开SSE连接
  const disconnectSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnected(false);
      message.info('已断开实时监控');
    }
  };

  useEffect(() => {
    // 获取初始数据
    fetchInitialData();

    // 建立SSE连接
    connectSSE();

    // 清理函数
    return () => {
      disconnectSSE();
    };
  }, []);

  // 格式化时间
  const formatTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // 获取性能分数和状态
  const getScoreAndStatus = (type: string, value: number) => {
    const thresholds: any = {
      fcp: { good: 1800, needsImprovement: 3000 },
      lcp: { good: 2500, needsImprovement: 4000 },
      fid: { good: 100, needsImprovement: 300 },
      cls: { good: 0.1, needsImprovement: 0.25 },
      load: { good: 3000, needsImprovement: 5000 },
    };

    // 获取性能指标阈值
    const threshold = thresholds[type] || {
      good: 1000,
      needsImprovement: 3000,
    };
    if (value <= threshold.good) {
      return { score: 90, status: 'good' };
    } else if (value <= threshold.needsImprovement) {
      return { score: 70, status: 'needs-improvement' };
    }
    return { score: 40, status: 'poor' };
  };

  // 计算平均性能指标
  const getAverageMetrics = () => {
    const metrics: any = {
      fcp: [],
      lcp: [],
      fid: [],
      cls: [],
      load: [],
    };

    performanceData.forEach(item => {
      const key = item.subType;
      if (metrics[key] !== undefined) {
        const value = item.duration || item.startTime || 0;
        metrics[key].push(value);
      }
    });

    return Object.entries(metrics).map(([key, values]: [string, any]) => {
      const avg =
        values.length > 0
          ? values.reduce((a: number, b: number) => a + b, 0) / values.length
          : 0;
      return { type: key, value: avg, count: values.length };
    });
  };

  const performanceMetrics = getAverageMetrics().map((metric, index) => {
    const labels: any = {
      fcp: 'FCP (首次内容绘制)',
      lcp: 'LCP (最大内容绘制)',
      fid: 'FID (首次输入延迟)',
      cls: 'CLS (累积布局偏移)',
      load: 'Load (页面加载)',
    };

    const { score, status } = getScoreAndStatus(metric.type, metric.value);

    return {
      key: String(index + 1),
      metric: labels[metric.type] || metric.type,
      value: formatTime(metric.value),
      count: metric.count,
      score,
      status,
    };
  });

  const columns = [
    {
      title: '性能指标',
      dataIndex: 'metric',
      key: 'metric',
    },
    {
      title: '平均值',
      dataIndex: 'value',
      key: 'value',
    },
    {
      title: '采样数',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>{count}</Tag>
      ),
    },
    {
      title: '得分',
      dataIndex: 'score',
      key: 'score',
      render: (score: number, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Progress
            percent={score}
            size="small"
            status={
              record.status === 'good'
                ? 'success'
                : record.status === 'needs-improvement'
                  ? 'normal'
                  : 'exception'
            }
            style={{ width: '100px' }}
          />
          <span>{score}</span>
        </div>
      ),
    },
  ];

  // 详细数据表格列 - 根据类型动态显示
  const detailColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp: number) =>
        new Date(timestamp).toLocaleString('zh-CN'),
    },
    {
      title: '类型',
      dataIndex: 'subType',
      key: 'subType',
      width: 120,
      render: (type: string) => <Tag color="blue">{type?.toUpperCase()}</Tag>,
    },
    {
      title: '名称/URL',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (name: string, record: any) => {
        // resource 类型显示资源名称
        if (record.subType === 'resource') {
          const fileName = name?.split('/').pop() || name;
          return <span title={name}>{fileName || '-'}</span>;
        }
        // 其他类型显示页面 URL
        return (
          <span title={record.pageUrl}>{record.pageUrl || name || '-'}</span>
        );
      },
    },
    {
      title: '资源类型',
      dataIndex: 'sourceType',
      key: 'sourceType',
      width: 100,
      render: (type: string, record: any) => {
        if (record.subType === 'resource' && type) {
          const colorMap: Record<string, string> = {
            script: 'orange',
            css: 'purple',
            img: 'green',
            fetch: 'blue',
            xmlhttprequest: 'cyan',
            link: 'geekblue',
          };
          return <Tag color={colorMap[type] || 'default'}>{type}</Tag>;
        }
        return '-';
      },
    },
    {
      title: '大小',
      dataIndex: 'transferSize',
      key: 'transferSize',
      width: 100,
      render: (size: number, record: any) => {
        if (record.subType === 'resource' && size) {
          return `${(size / 1024).toFixed(2)} KB`;
        }
        return '-';
      },
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: number, record: any) => {
        const value = duration || record.startTime || 0;
        return formatTime(value);
      },
    },
    {
      title: 'DNS',
      dataIndex: 'dns',
      key: 'dns',
      width: 80,
      render: (dns: number, record: any) => {
        if (record.subType === 'resource' && dns !== undefined) {
          return `${dns.toFixed(0)}ms`;
        }
        return '-';
      },
    },
    {
      title: 'TCP',
      dataIndex: 'tcp',
      key: 'tcp',
      width: 80,
      render: (tcp: number, record: any) => {
        if (record.subType === 'resource' && tcp !== undefined) {
          return `${tcp.toFixed(0)}ms`;
        }
        return '-';
      },
    },
    {
      title: 'TTFB',
      dataIndex: 'ttfb',
      key: 'ttfb',
      width: 100,
      render: (ttfb: number, record: any) => {
        if (record.subType === 'resource' && ttfb !== undefined) {
          return formatTime(ttfb);
        }
        return '-';
      },
    },
  ];

  // 使用本地计算的统计数据（如果 API 返回的数据为空）
  const displayStats = stats;

  console.log('📊 显示的统计数据:', stats);

  // 根据 Tab 筛选数据
  const getFilteredData = () => {
    if (activeTab === 'all') {
      return performanceData;
    }
    return performanceData.filter(item => item.subType === activeTab);
  };

  const filteredData = getFilteredData();

  // 统计每个类型的数据量
  const getTabCounts = () => {
    const counts: Record<string, number> = {
      all: performanceData.length,
      fcp: 0,
      lcp: 0,
      load: 0,
      fetch: 0,
      xhr: 0,
      resource: 0,
    };

    performanceData.forEach(item => {
      if (counts[item.subType] !== undefined) {
        counts[item.subType]++;
      }
    });

    return counts;
  };

  const tabCounts = getTabCounts();

  // Tab 配置
  const tabItems = [
    {
      key: 'all',
      label: (
        <span>
          <DashboardOutlined />
          全部 ({tabCounts.all})
        </span>
      ),
    },
    {
      key: 'fcp',
      label: (
        <span>
          <ThunderboltOutlined style={{ color: '#1890ff' }} />
          FCP ({tabCounts.fcp})
        </span>
      ),
    },
    {
      key: 'lcp',
      label: (
        <span>
          <FireOutlined style={{ color: '#52c41a' }} />
          LCP ({tabCounts.lcp})
        </span>
      ),
    },
    {
      key: 'load',
      label: (
        <span>
          <RocketOutlined style={{ color: '#722ed1' }} />
          Load ({tabCounts.load})
        </span>
      ),
    },
    {
      key: 'fetch',
      label: (
        <span>
          <CloudOutlined style={{ color: '#13c2c2' }} />
          Fetch ({tabCounts.fetch})
        </span>
      ),
    },
    {
      key: 'xhr',
      label: (
        <span>
          <LinkOutlined style={{ color: '#eb2f96' }} />
          XHR ({tabCounts.xhr})
        </span>
      ),
    },
    {
      key: 'resource',
      label: (
        <span>
          <ApiOutlined style={{ color: '#fa8c16' }} />
          Resource ({tabCounts.resource})
        </span>
      ),
    },
  ];

  // 根据不同类型返回不同的列配置
  const getColumnsForType = (type: string) => {
    const baseColumns = [
      {
        title: '时间',
        dataIndex: 'timestamp',
        key: 'timestamp',
        width: 180,
        render: (timestamp: number) =>
          new Date(timestamp).toLocaleString('zh-CN'),
      },
      {
        title: '类型',
        dataIndex: 'subType',
        key: 'subType',
        width: 120,
        render: (subType: string) => (
          <Tag color="blue">{subType?.toUpperCase()}</Tag>
        ),
      },
    ];

    // Resource 类型专用列
    if (type === 'resource') {
      return [
        ...baseColumns,
        {
          title: '资源名称',
          dataIndex: 'name',
          key: 'name',
          ellipsis: true,
          render: (name: string) => {
            const fileName = name?.split('/').pop() || name;
            return <span title={name}>{fileName || '-'}</span>;
          },
        },
        {
          title: '资源类型',
          dataIndex: 'sourceType',
          key: 'sourceType',
          width: 100,
          render: (sourceType: string) => {
            const colorMap: Record<string, string> = {
              script: 'orange',
              css: 'purple',
              img: 'green',
              fetch: 'blue',
              xmlhttprequest: 'cyan',
              link: 'geekblue',
            };
            return (
              <Tag color={colorMap[sourceType] || 'default'}>{sourceType}</Tag>
            );
          },
        },
        {
          title: '大小',
          dataIndex: 'transferSize',
          key: 'transferSize',
          width: 120,
          render: (size: number) =>
            size ? `${(size / 1024).toFixed(2)} KB` : '-',
        },
        {
          title: '耗时',
          dataIndex: 'duration',
          key: 'duration',
          width: 100,
          render: (duration: number) => formatTime(duration || 0),
        },
        {
          title: 'DNS',
          dataIndex: 'dns',
          key: 'dns',
          width: 80,
          render: (dns: number) =>
            dns !== undefined ? `${dns.toFixed(0)}ms` : '-',
        },
        {
          title: 'TCP',
          dataIndex: 'tcp',
          key: 'tcp',
          width: 80,
          render: (tcp: number) =>
            tcp !== undefined ? `${tcp.toFixed(0)}ms` : '-',
        },
        {
          title: 'TTFB',
          dataIndex: 'ttfb',
          key: 'ttfb',
          width: 100,
          render: (ttfb: number) =>
            ttfb !== undefined ? formatTime(ttfb) : '-',
        },
      ];
    }

    // Fetch/XHR 类型专用列
    if (type === 'fetch' || type === 'xhr') {
      return [
        ...baseColumns,
        {
          title: 'URL',
          dataIndex: 'url',
          key: 'url',
          ellipsis: true,
          render: (url: string, record: any) => {
            // 优先使用 url 字段，fallback 到 name
            const displayUrl = url || record.name || '-';
            return <span title={displayUrl}>{displayUrl}</span>;
          },
        },
        {
          title: '请求方法',
          dataIndex: 'method',
          key: 'method',
          width: 100,
          render: (method: string) => {
            const colorMap: Record<string, string> = {
              GET: 'blue',
              POST: 'green',
              PUT: 'orange',
              DELETE: 'red',
              PATCH: 'purple',
            };
            return (
              <Tag color={colorMap[method] || 'default'}>{method || '-'}</Tag>
            );
          },
        },
        {
          title: '状态码',
          dataIndex: 'status',
          key: 'status',
          width: 100,
          render: (status: number, record: any) => {
            // 兼容 status 和 responseStatus 字段
            const statusCode = status || record.responseStatus;
            if (!statusCode) return '-';

            const color =
              statusCode >= 200 && statusCode < 300 ? 'success' : 'error';
            return <Tag color={color}>{statusCode}</Tag>;
          },
        },
        {
          title: '请求结果',
          dataIndex: 'success',
          key: 'success',
          width: 100,
          render: (success: boolean) => {
            if (success === undefined || success === null) return '-';
            return success ? (
              <Tag color="success">成功</Tag>
            ) : (
              <Tag color="error">失败</Tag>
            );
          },
        },
        {
          title: '耗时',
          dataIndex: 'duration',
          key: 'duration',
          width: 120,
          render: (duration: number) => {
            const value = duration || 0;
            const color =
              value > 1000 ? 'error' : value > 500 ? 'warning' : 'success';
            return <Tag color={color}>{formatTime(value)}</Tag>;
          },
        },
        {
          title: '开始时间',
          dataIndex: 'startTime',
          key: 'startTime',
          width: 120,
          render: (time: number) => formatTime(time || 0),
        },
        {
          title: '结束时间',
          dataIndex: 'endTime',
          key: 'endTime',
          width: 120,
          render: (time: number) => formatTime(time || 0),
        },
      ];
    }

    // FCP/LCP/Load 类型专用列
    if (['fcp', 'lcp', 'load'].includes(type)) {
      return [
        ...baseColumns,
        {
          title: '页面URL',
          dataIndex: 'pageUrl',
          key: 'pageUrl',
          ellipsis: true,
          render: (url: string) => <span title={url}>{url || '-'}</span>,
        },
        {
          title: '用户ID',
          dataIndex: 'userId',
          key: 'userId',
          width: 150,
          render: (userId: string) => <Tag color="blue">{userId || '-'}</Tag>,
        },
        {
          title: '耗时',
          dataIndex: 'duration',
          key: 'duration',
          width: 120,
          render: (duration: number) => {
            const value = duration || 0;
            let color = 'success';
            if (type === 'fcp' && value > 1800) color = 'error';
            else if (type === 'fcp' && value > 1000) color = 'warning';
            else if (type === 'lcp' && value > 4000) color = 'error';
            else if (type === 'lcp' && value > 2500) color = 'warning';
            else if (type === 'load' && value > 5000) color = 'error';
            else if (type === 'load' && value > 3000) color = 'warning';

            return <Tag color={color}>{formatTime(value)}</Tag>;
          },
        },
        {
          title: '评级',
          key: 'rating',
          width: 150,
          render: (_: any, record: PerformanceData) => {
            const duration = record.duration || 0;
            let rating = 'good';
            let color = 'success';
            let text = '良好';

            if (type === 'fcp') {
              if (duration > 1800) {
                rating = 'poor';
                color = 'error';
                text = '差';
              } else if (duration > 1000) {
                rating = 'needs-improvement';
                color = 'warning';
                text = '需改进';
              }
            } else if (type === 'lcp') {
              if (duration > 4000) {
                rating = 'poor';
                color = 'error';
                text = '差';
              } else if (duration > 2500) {
                rating = 'needs-improvement';
                color = 'warning';
                text = '需改进';
              }
            } else if (type === 'load') {
              if (duration > 5000) {
                rating = 'poor';
                color = 'error';
                text = '差';
              } else if (duration > 3000) {
                rating = 'needs-improvement';
                color = 'warning';
                text = '需改进';
              }
            }

            return <Tag color={color}>{text}</Tag>;
          },
        },
        {
          title: 'IP地址',
          dataIndex: 'ip',
          key: 'ip',
          width: 150,
          render: (ip: string) => ip?.replace('::ffff:', '') || '-',
        },
        {
          title: '浏览器',
          dataIndex: 'userAgent',
          key: 'userAgent',
          width: 200,
          ellipsis: true,
          render: (ua: string) => {
            if (!ua) return '-';

            // 解析浏览器信息
            let browser = 'Unknown';
            if (ua.includes('Chrome')) browser = 'Chrome';
            else if (ua.includes('Safari')) browser = 'Safari';
            else if (ua.includes('Firefox')) browser = 'Firefox';
            else if (ua.includes('Edge')) browser = 'Edge';

            return (
              <span title={ua}>
                <Tag color="geekblue">{browser}</Tag>
              </span>
            );
          },
        },
      ];
    }

    // 默认列（全部）
    return [
      ...baseColumns,
      {
        title: '名称/URL',
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
        render: (name: string, record: any) => {
          if (record.subType === 'resource') {
            const fileName = name?.split('/').pop() || name;
            return <span title={name}>{fileName || '-'}</span>;
          }
          // Fetch/XHR 显示 url 字段
          if (record.subType === 'fetch' || record.subType === 'xhr') {
            const url = record.url || name;
            return <span title={url}>{url || '-'}</span>;
          }
          return (
            <span title={record.pageUrl}>{record.pageUrl || name || '-'}</span>
          );
        },
      },
      {
        title: '耗时',
        dataIndex: 'duration',
        key: 'duration',
        width: 120,
        render: (duration: number, record: any) => {
          const value = duration || record.startTime || 0;
          return formatTime(value);
        },
      },
    ];
  };

  return (
    <div className={styles.container}>
      <Title level={2} className={styles.title}>
        <DashboardOutlined className={styles.icon} />
        性能监控
        {connected && (
          <Tag
            icon={<SyncOutlined spin />}
            color="success"
            className={styles.connectedTag}
          >
            实时监控中
          </Tag>
        )}
      </Title>

      <Alert
        message="性能监控说明"
        description="实时监控页面加载性能、资源加载时间、用户交互性能指标，提供详细的性能分析报告。"
        type="info"
        showIcon
        className={styles.alert}
      />

      {/* 核心性能指标 */}
      <Row gutter={[24, 24]} className={styles.metricsRow}>
        <Col xs={24} sm={12} lg={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="FCP (首次内容绘制)"
              value={
                displayStats?.fcp?.avg
                  ? (displayStats.fcp.avg / 1000).toFixed(2)
                  : 0
              }
              precision={2}
              suffix="s"
              prefix={
                <ThunderboltOutlined
                  className={`${styles.statIcon} ${styles.fcp}`}
                />
              }
              valueStyle={{ color: '#1890ff' }}
            />
            <div className={styles.statMeta}>
              采样数: {displayStats?.fcp?.count || 0}
              {displayStats?.fcp?.p95 && (
                <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
                  P95: {(displayStats.fcp.p95 / 1000).toFixed(2)}s
                </span>
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="LCP (最大内容绘制)"
              value={
                displayStats?.lcp?.avg
                  ? (displayStats.lcp.avg / 1000).toFixed(2)
                  : 0
              }
              precision={2}
              suffix="s"
              prefix={
                <ClockCircleOutlined
                  className={`${styles.statIcon} ${styles.lcp}`}
                />
              }
              valueStyle={{ color: '#52c41a' }}
            />
            <div className={styles.statMeta}>
              采样数: {displayStats?.lcp?.count || 0}
              {displayStats?.lcp?.p95 && (
                <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
                  P95: {(displayStats.lcp.p95 / 1000).toFixed(2)}s
                </span>
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="Load (页面加载)"
              value={
                displayStats?.load?.avg
                  ? (displayStats.load.avg / 1000).toFixed(2)
                  : 0
              }
              precision={2}
              suffix="s"
              prefix={
                <DashboardOutlined
                  className={`${styles.statIcon} ${styles.load}`}
                />
              }
              valueStyle={{ color: '#722ed1' }}
            />
            <div className={styles.statMeta}>
              采样数: {displayStats?.load?.count || 0}
              {displayStats?.load?.p95 && (
                <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
                  P95: {(displayStats.load.p95 / 1000).toFixed(2)}s
                </span>
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="总数据量"
              value={performanceData.length}
              prefix={
                <ApiOutlined className={`${styles.statIcon} ${styles.total}`} />
              }
              valueStyle={{ color: '#fa8c16' }}
            />
            <div className={styles.statMeta}>
              <Button size="small" onClick={fetchInitialData} loading={loading}>
                刷新数据
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Tab 筛选的详细数据列表 */}
      <Card className={styles.detailCard}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          tabBarExtraContent={
            <span style={{ color: '#999', fontSize: 14 }}>
              共 {filteredData.length} 条记录
            </span>
          }
        />

        {filteredData.length > 0 ? (
          <Table
            columns={getColumnsForType(activeTab)}
            dataSource={filteredData}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: total => `共 ${total} 条记录`,
            }}
            loading={loading}
            rowKey="id"
            scroll={{ x: 1200 }}
          />
        ) : (
          <Empty
            className={styles.emptyState}
            description={
              <span>
                暂无 {activeTab === 'all' ? '' : activeTab.toUpperCase()} 数据
                <br />
                <span className={styles.emptyText}>
                  {loading ? '正在加载...' : '请等待SDK上报数据或点击刷新按钮'}
                </span>
              </span>
            }
          >
            {!loading && (
              <Button type="primary" onClick={fetchInitialData}>
                刷新数据
              </Button>
            )}
          </Empty>
        )}
      </Card>
    </div>
  );
};

export default PerformancePage;
