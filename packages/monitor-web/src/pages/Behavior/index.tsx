import React, { useState } from 'react';
import {
  Card,
  Button,
  Input,
  Typography,
  Alert,
  Table,
  Tag,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  UserOutlined,
  CiOutlined,
  EyeOutlined,
  HistoryOutlined,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const BehaviorPage: React.FC = () => {
  const [clickCount, setClickCount] = useState(0);
  const [inputValue, setInputValue] = useState('');

  const handleClick = () => {
    setClickCount(prev => prev + 1);
    console.log(`按钮被点击了 ${clickCount + 1} 次`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    console.log('输入值变化:', e.target.value);
  };

  // 模拟用户行为数据
  const behaviorData = [
    {
      key: '1',
      time: '2025-01-02 10:30:25',
      action: 'click',
      element: 'button.submit',
      page: '/dashboard',
      userId: 'user_001',
    },
    {
      key: '2',
      time: '2025-01-02 10:28:15',
      action: 'input',
      element: 'input.search',
      page: '/search',
      userId: 'user_002',
    },
    {
      key: '3',
      time: '2025-01-02 10:25:30',
      action: 'scroll',
      element: 'div.content',
      page: '/article',
      userId: 'user_001',
    },
    {
      key: '4',
      time: '2025-01-02 10:22:10',
      action: 'navigate',
      element: 'a.nav-link',
      page: '/home',
      userId: 'user_003',
    },
  ];

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      click: 'blue',
      input: 'green',
      scroll: 'orange',
      navigate: 'purple',
    };
    return colors[action] || 'default';
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
    },
    {
      title: '行为类型',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => (
        <Tag color={getActionColor(action)}>{action.toUpperCase()}</Tag>
      ),
    },
    {
      title: '元素',
      dataIndex: 'element',
      key: 'element',
      render: (element: string) => (
        <code
          style={{
            background: '#f5f5f5',
            padding: '2px 4px',
            borderRadius: '2px',
          }}
        >
          {element}
        </code>
      ),
    },
    {
      title: '页面',
      dataIndex: 'page',
      key: 'page',
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
        <UserOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
        行为监控
      </Title>

      <Alert
        message="行为监控说明"
        description="记录用户操作行为、页面访问路径、点击热力图，支持错误录屏回放，帮助分析用户使用习惯。"
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      {/* 行为统计 */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日点击次数"
              value={1234}
              prefix={<CiOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="页面浏览量"
              value={567}
              prefix={<EyeOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均停留时间"
              value={3.5}
              precision={1}
              suffix="分钟"
              prefix={<HistoryOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃用户数"
              value={89}
              prefix={<UserOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 行为测试 */}
      <Card title="行为测试" style={{ marginBottom: '24px' }}>
        <Paragraph>下面的交互元素可以帮您测试行为监控功能：</Paragraph>
        <div
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Button type="primary" icon={<CiOutlined />} onClick={handleClick}>
            点击测试 (点击次数: {clickCount})
          </Button>
          <Input
            placeholder="输入测试"
            value={inputValue}
            onChange={handleInputChange}
            style={{ width: '200px' }}
          />
        </div>
      </Card>

      {/* 用户行为记录 */}
      <Card title="最近用户行为记录">
        <Table
          columns={columns}
          dataSource={behaviorData}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default BehaviorPage;
