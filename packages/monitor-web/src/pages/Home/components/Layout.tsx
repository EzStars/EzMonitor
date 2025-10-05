import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  BugOutlined,
  DashboardOutlined,
  UserOutlined,
  MonitorOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Breadcrumb, Layout, Menu, theme, Avatar, Dropdown, Space } from 'antd';
import styles from './Layout.module.css';

const { Header, Content, Sider } = Layout;

// 菜单配置
const menuItems: MenuProps['items'] = [
  {
    key: '/',
    icon: <HomeOutlined />,
    label: '首页',
  },
  {
    key: '/error',
    icon: <BugOutlined />,
    label: '错误监控',
  },
  {
    key: '/performance',
    icon: <DashboardOutlined />,
    label: '性能监控',
  },
  {
    key: '/behavior',
    icon: <UserOutlined />,
    label: '行为监控',
  },
];

// 用户下拉菜单
const userMenuItems: MenuProps['items'] = [
  {
    key: 'profile',
    label: '个人设置',
  },
  {
    key: 'logout',
    label: '退出登录',
  },
];

// 面包屑映射
const breadcrumbMap: Record<string, string> = {
  '/': '首页',
  '/error': '错误监控',
  '/performance': '性能监控',
  '/behavior': '行为监控',
};

const EzMonitorLayout: React.FC = () => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  // 处理用户菜单点击
  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      // 处理退出登录逻辑
      console.log('退出登录');
    } else if (key === 'profile') {
      // 处理个人设置逻辑
      console.log('个人设置');
    }
  };

  // 生成面包屑项
  const getBreadcrumbItems = () => {
    const breadcrumbItems = [
      {
        title: (
          <span>
            <HomeOutlined style={{ marginRight: 4 }} />
            首页
          </span>
        ),
      },
    ];

    if (location.pathname !== '/') {
      breadcrumbItems.push({
        title: <span>{breadcrumbMap[location.pathname] || '未知页面'}</span>,
      });
    }

    return breadcrumbItems;
  };

  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <div className={styles.logo}>
          <MonitorOutlined className={styles.logoIcon} />
          EzMonitor
        </div>
        <div style={{ flex: 1 }} />
        <Space size="middle">
          <Dropdown
            menu={{
              items: userMenuItems,
              onClick: handleUserMenuClick,
            }}
            placement="bottomRight"
          >
            <Space style={{ cursor: 'pointer', color: 'white' }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>管理员</span>
            </Space>
          </Dropdown>
        </Space>
      </Header>
      <Layout>
        <Sider
          width={220}
          collapsedWidth={80}
          style={{ background: colorBgContainer }}
          className={styles.sider}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            className={styles.siderMenu}
            items={menuItems}
            onClick={handleMenuClick}
          />
        </Sider>
        <Layout
          className={`${styles.mainContent} ${collapsed ? styles.collapsed : ''}`}
        >
          <Breadcrumb
            items={getBreadcrumbItems()}
            className={styles.breadcrumb}
          />
          <div className={styles.contentWrapper}>
            <Content className={styles.content}>
              <Outlet />
            </Content>
          </div>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default EzMonitorLayout;
