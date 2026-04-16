import type { FormProps } from 'antd'
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

const { Title, Text } = Typography

interface LoginFormValues {
  email: string
  password: string
}

function getNextPath(search: string): string {
  const params = new URLSearchParams(search)
  const next = params.get('next')
  if (!next) {
    return '/dashboard'
  }

  if (!next.startsWith('/')) {
    return '/dashboard'
  }

  return next
}

export default function LoginPage() {
  const { token, login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  const onFinish: FormProps<LoginFormValues>['onFinish'] = async (values) => {
    setError(null)
    setLoading(true)
    try {
      await login({
        email: values.email,
        password: values.password,
      })
      navigate(getNextPath(location.search), { replace: true })
    }
    catch (err) {
      const message = err instanceof Error ? err.message : '登录失败'
      setError(message)
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Space direction="vertical" size={4}>
            <Title level={3}>登录 EzMonitor</Title>
            <Text type="secondary">登录后可按项目查看监控数据，避免跨项目数据泄漏。</Text>
          </Space>

          {error ? <Alert type="error" showIcon message={error} /> : null}

          <Form<LoginFormValues> layout="vertical" onFinish={onFinish} autoComplete="off">
            <Form.Item label="邮箱" name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}>
              <Input placeholder="you@example.com" />
            </Form.Item>

            <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password placeholder="请输入密码" />
            </Form.Item>

            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form>

          <Text type="secondary">
            还没有账号？
            {' '}
            <Link to="/register">去注册</Link>
          </Text>
        </Space>
      </Card>
    </div>
  )
}
