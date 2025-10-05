import React from 'react';
import { Card, Button, Space, Typography, Alert, Table } from 'antd';
import { BugOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const ErrorPage: React.FC = () => {
  const triggerError = () => {
    throw new Error('这是一个测试错误');
  };

  const triggerPromiseError = () => {
    Promise.reject(new Error('这是一个 Promise 错误'));
  };

  // 模拟错误数据
  const errorData = [
    {
      key: '1',
      time: '2025-01-02 10:30:25',
      type: 'JavaScript Error',
      message: 'Cannot read property of undefined',
      url: '/dashboard',
      count: 5,
    },
    {
      key: '2',
      time: '2025-01-02 09:15:10',
      type: 'Network Error',
      message: 'Failed to load resource',
      url: '/api/data',
      count: 3,
    },
    {
      key: '3',
      time: '2025-01-02 08:45:33',
      type: 'Promise Rejection',
      message: 'Unhandled promise rejection',
      url: '/user/profile',
      count: 2,
    },
  ];

  const columns = [
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
    },
    {
      title: '错误类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Space>
          <BugOutlined style={{ color: '#ff4d4f' }} />
          {type}
        </Space>
      ),
    },
    {
      title: '错误信息',
      dataIndex: 'message',
      key: 'message',
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
    },
    {
      title: '发生次数',
      dataIndex: 'count',
      key: 'count',
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <BugOutlined style={{ marginRight: '8px', color: '#ff4d4f' }} />
        错误监控
      </Title>

      <Alert
        message="错误监控说明"
        description="实时监控前端应用中的 JavaScript 错误、Promise 异常、资源加载错误等，帮助快速定位和解决问题。"
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      {/* 测试按钮 */}
      <Card title="错误测试" style={{ marginBottom: '24px' }}>
        <Paragraph>
          点击下面的按钮可以触发不同类型的错误，用于测试错误监控功能：
        </Paragraph>
        <Space wrap>
          <Button
            type="primary"
            danger
            icon={<ExclamationCircleOutlined />}
            onClick={triggerError}
          >
            触发 JavaScript 错误
          </Button>
          <Button
            danger
            icon={<ExclamationCircleOutlined />}
            onClick={triggerPromiseError}
          >
            触发 Promise 错误
          </Button>
        </Space>
      </Card>

      {/* 错误列表 */}
      <Card title="最近错误记录">
        <Table
          columns={columns}
          dataSource={errorData}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default ErrorPage;
