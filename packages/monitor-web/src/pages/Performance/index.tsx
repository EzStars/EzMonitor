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
} from 'antd';
import {
  DashboardOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  ApiOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { getPerformanceList, getPerformanceStats } from '../../api/performance';
import { API_BASE_URL } from '../../api';
import type {
  PerformanceData,
  PerformanceStats,
} from '../../types/performance';
import styles from './index.module.scss';

const { Title } = Typography;

const PerformancePage: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const appId = '123456';

  // 📊 监听 performanceData 变化
  useEffect(() => {
    console.log('📊 performanceData 已更新:', performanceData);
    console.log('📈 当前数据条数:', performanceData.length);
  }, [performanceData]);

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

      const statsResponse = await getPerformanceStats({ appId });
      console.log('📈 统计数据:', statsResponse);
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
      message.success('实时监控已连接');
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
    const performanceTypes = [
      'fcp',
      'lcp',
      'load',
      'fetch',
      'xhr',
      'resource',
      'long-task',
    ];

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
              value={stats?.fcp?.avg ? (stats.fcp.avg / 1000).toFixed(2) : 0}
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
              采样数: {stats?.fcp?.count || 0}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="LCP (最大内容绘制)"
              value={stats?.lcp?.avg ? (stats.lcp.avg / 1000).toFixed(2) : 0}
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
              采样数: {stats?.lcp?.count || 0}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="Load (页面加载)"
              value={stats?.load?.avg ? (stats.load.avg / 1000).toFixed(2) : 0}
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
              采样数: {stats?.load?.count || 0}
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

      {/* 详细数据列表 */}
      <Card
        title="性能数据详情"
        className={styles.detailCard}
        extra={
          <span className={styles.extra}>
            最近 {performanceData.length} 条记录
          </span>
        }
      >
        {performanceData.length > 0 ? (
          <Table
            columns={detailColumns}
            dataSource={performanceData}
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
                暂无数据
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
