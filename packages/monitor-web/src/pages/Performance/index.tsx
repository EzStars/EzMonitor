import React, { useEffect, useState } from 'react';
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
} from 'antd';
import {
  DashboardOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const PerformancePage: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<any>(null);

  useEffect(() => {
    // 获取性能数据
    if (window.performance) {
      const perfData = {
        navigation: performance.getEntriesByType('navigation')[0],
        memory: (performance as any).memory,
      };
      setPerformanceData(perfData);
    }
  }, []);

  const triggerSlowOperation = () => {
    const start = Date.now();
    // 模拟耗时操作
    let result = 0;
    for (let i = 0; i < 100000000; i++) {
      result += i;
    }
    const end = Date.now();
    alert(`操作耗时: ${end - start}ms`);
  };

  // 模拟性能数据
  const performanceMetrics = [
    {
      key: '1',
      metric: 'FCP (首次内容绘制)',
      value: '1.2s',
      score: 85,
      status: 'good',
    },
    {
      key: '2',
      metric: 'LCP (最大内容绘制)',
      value: '2.1s',
      score: 92,
      status: 'good',
    },
    {
      key: '3',
      metric: 'FID (首次输入延迟)',
      value: '45ms',
      score: 78,
      status: 'needs-improvement',
    },
    {
      key: '4',
      metric: 'CLS (累积布局偏移)',
      value: '0.08',
      score: 88,
      status: 'good',
    },
  ];

  const columns = [
    {
      title: '性能指标',
      dataIndex: 'metric',
      key: 'metric',
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
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
            status={record.status === 'good' ? 'success' : 'active'}
            style={{ width: '100px' }}
          />
          <span>{score}</span>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <DashboardOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
        性能监控
      </Title>

      <Alert
        message="性能监控说明"
        description="监控页面加载性能、资源加载时间、用户交互性能指标，提供详细的性能分析报告。"
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      {/* 核心性能指标 */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="页面加载时间"
              value={1.23}
              precision={2}
              suffix="s"
              prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="首屏渲染时间"
              value={0.89}
              precision={2}
              suffix="s"
              prefix={<ThunderboltOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="资源加载时间"
              value={2.45}
              precision={2}
              suffix="s"
              prefix={<DashboardOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="性能得分"
              value={87}
              suffix="/100"
              prefix={<ThunderboltOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 性能测试 */}
      <Card title="性能测试" style={{ marginBottom: '24px' }}>
        <Paragraph>
          点击下面的按钮可以触发不同的性能测试，用于测试性能监控功能：
        </Paragraph>
        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          onClick={triggerSlowOperation}
        >
          触发慢操作测试
        </Button>
      </Card>

      {/* 性能指标详情 */}
      <Card title="Web Vitals 性能指标">
        <Table
          columns={columns}
          dataSource={performanceMetrics}
          pagination={false}
        />
      </Card>

      {performanceData && (
        <div style={{ marginTop: '30px' }}>
          <h3>当前页面性能数据</h3>
          <pre
            style={{
              backgroundColor: '#f5f5f5',
              padding: '15px',
              borderRadius: '4px',
              overflow: 'auto',
            }}
          >
            {JSON.stringify(performanceData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default PerformancePage;
