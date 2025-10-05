import React from 'react';
import { Card, Row, Col, Statistic, Typography, Space } from 'antd';
import {
  BugOutlined,
  DashboardOutlined,
  UserOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const Home: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={2}>欢迎使用 EzMonitor 监控平台</Title>
        <Paragraph style={{ fontSize: '16px', color: '#666' }}>
          实时监控您的前端应用性能、错误和用户行为，提供全方位的监控解决方案
        </Paragraph>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日错误数"
              value={23}
              prefix={<BugOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="页面加载时间"
              value={1.2}
              precision={2}
              suffix="s"
              prefix={<DashboardOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日访问用户"
              value={1234}
              prefix={<UserOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="系统可用性"
              value={99.9}
              precision={1}
              suffix="%"
              prefix={<CheckCircleOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 功能介绍卡片 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <BugOutlined style={{ color: '#ff4d4f' }} />
                错误监控
              </Space>
            }
            hoverable
          >
            <Paragraph>
              实时捕获和监控 JavaScript 错误、Promise 异常、资源加载错误等，
              支持 React、Vue 等主流框架的错误边界处理。
            </Paragraph>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <DashboardOutlined style={{ color: '#1890ff' }} />
                性能监控
              </Space>
            }
            hoverable
          >
            <Paragraph>
              监控页面加载性能、资源加载时间、用户交互性能指标，
              提供详细的性能分析报告和优化建议。
            </Paragraph>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <UserOutlined style={{ color: '#52c41a' }} />
                行为监控
              </Space>
            }
            hoverable
          >
            <Paragraph>
              记录用户操作行为、页面访问路径、点击热力图，
              支持错误录屏回放，帮助快速定位问题。
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Home;
