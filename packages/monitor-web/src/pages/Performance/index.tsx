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

const { Title } = Typography;

const PerformancePage: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const appId = '123456'; // 这里使用默认appId，实际应该从配置或上下文获取

  // 获取初始数据
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 获取性能数据列表
      const listResponse = await getPerformanceList({
        appId,
        limit: 50,
      });
      setPerformanceData(listResponse.list || []);

      // 获取统计数据
      const statsResponse = await getPerformanceStats({ appId });
      setStats(statsResponse);

      message.success('数据加载成功');
    } catch (error) {
      console.error('获取性能数据失败:', error);
      message.error('数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 建立SSE连接
  const connectSSE = () => {
    if (eventSourceRef.current) {
      return;
    }

    const url = `${API_BASE_URL}/api/monitor/stream?appId=${appId}`;
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
      message.success('实时监控已连接');
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
        const data = JSON.parse(event.data);
        console.log(`📊 收到 ${type.toUpperCase()} 数据:`, data);

        // 添加到数据列表
        setPerformanceData(prev => {
          const newData = [data, ...prev];
          // 保持最多 100 条记录
          return newData.slice(0, 100);
        });

        // 显示通知
        message.info(`收到新的 ${type.toUpperCase()} 性能数据`);
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

  // 详细数据表格列
  const detailColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: number) =>
        new Date(timestamp).toLocaleString('zh-CN'),
    },
    {
      title: '类型',
      dataIndex: 'subType',
      key: 'subType',
      render: (type: string) => <Tag color="blue">{type.toUpperCase()}</Tag>,
    },
    {
      title: '值',
      dataIndex: 'duration',
      key: 'duration',
      render: (_: any, record: any) =>
        formatTime(record.duration || record.startTime || 0),
    },
    {
      title: '页面URL',
      dataIndex: 'pageUrl',
      key: 'pageUrl',
      ellipsis: true,
    },
    {
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <DashboardOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
        性能监控
        {connected && (
          <Tag
            icon={<SyncOutlined spin />}
            color="success"
            style={{ marginLeft: '16px' }}
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
        style={{ marginBottom: '24px' }}
      />

      {/* 核心性能指标 */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="FCP (首次内容绘制)"
              value={stats?.fcp?.avg ? (stats.fcp.avg / 1000).toFixed(2) : 0}
              precision={2}
              suffix="s"
              prefix={<ThunderboltOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
              采样数: {stats?.fcp?.count || 0}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="LCP (最大内容绘制)"
              value={stats?.lcp?.avg ? (stats.lcp.avg / 1000).toFixed(2) : 0}
              precision={2}
              suffix="s"
              prefix={<ClockCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
              采样数: {stats?.lcp?.count || 0}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Load (页面加载)"
              value={stats?.load?.avg ? (stats.load.avg / 1000).toFixed(2) : 0}
              precision={2}
              suffix="s"
              prefix={<DashboardOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
              采样数: {stats?.load?.count || 0}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总数据量"
              value={performanceData.length}
              prefix={<ApiOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
              <Button size="small" onClick={fetchInitialData} loading={loading}>
                刷新数据
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 性能指标概览 */}
      <Card title="Web Vitals 性能指标" style={{ marginBottom: '24px' }}>
        {performanceMetrics.length > 0 ? (
          <Table
            columns={columns}
            dataSource={performanceMetrics}
            pagination={false}
            loading={loading}
          />
        ) : (
          <Empty description="暂无性能数据" />
        )}
      </Card>

      {/* 详细数据列表 */}
      <Card
        title="性能数据详情"
        extra={
          <span style={{ fontSize: '14px', color: '#888' }}>
            最近 {performanceData.length} 条记录
          </span>
        }
      >
        {performanceData.length > 0 ? (
          <Table
            columns={detailColumns}
            dataSource={performanceData}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: total => `共 ${total} 条记录`,
            }}
            loading={loading}
            rowKey="id"
            scroll={{ x: 800 }}
          />
        ) : (
          <Empty
            description={
              <span>
                暂无数据
                <br />
                <span style={{ fontSize: '12px', color: '#888' }}>
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
