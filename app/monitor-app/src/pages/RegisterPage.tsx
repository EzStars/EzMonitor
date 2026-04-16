import type { FormProps } from 'antd'
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

const { Title, Text } = Typography

interface RegisterFormValues {
  name?: string
  email: string
  password: string
  projectName: string
  appId: string
}

export default function RegisterPage() {
  const { token, register } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  const onFinish: FormProps<RegisterFormValues>['onFinish'] = async (values) => {
    setError(null)
    setLoading(true)
    try {
      await register({
        name: values.name?.trim() || undefined,
        email: values.email.trim(),
        password: values.password,
        projectName: values.projectName.trim(),
        appId: values.appId.trim(),
      })
      navigate('/dashboard', { replace: true })
    }
    catch (err) {
      const message = err instanceof Error ? err.message : '注册失败'
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
            <Title level={3}>注册 EzMonitor</Title>
            <Text type="secondary">注册时创建你的第一个项目，后续所有监控数据将按项目隔离。</Text>
          </Space>

          {error ? <Alert type="error" showIcon message={error} /> : null}

          <Form<RegisterFormValues> layout="vertical" onFinish={onFinish} autoComplete="off">
            <Form.Item label="姓名" name="name">
              <Input placeholder="可选" />
            </Form.Item>

            <Form.Item label="邮箱" name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}>
              <Input placeholder="you@example.com" />
            </Form.Item>

            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 8, message: '密码至少 8 位' },
                {
                  validator: (_, value: string | undefined) => {
                    if (!value) {
                      return Promise.resolve()
                    }
                    const valid = /[A-Z]/i.test(value) && /\d/.test(value)
                    return valid ? Promise.resolve() : Promise.reject(new Error('密码需同时包含字母和数字'))
                  },
                },
              ]}
            >
              <Input.Password placeholder="至少 8 位，包含字母和数字" />
            </Form.Item>

            <Form.Item label="项目名称" name="projectName" rules={[{ required: true, message: '请输入项目名称' }]}>
              <Input placeholder="例如：官网生产环境" />
            </Form.Item>

            <Form.Item
              label="appId"
              name="appId"
              rules={[
                { required: true, message: '请输入 appId' },
                { pattern: /^[\w-]+$/i, message: '仅支持字母、数字、下划线和中划线' },
              ]}
            >
              <Input placeholder="例如：web-prod" />
            </Form.Item>

            <Button type="primary" htmlType="submit" loading={loading} block>
              注册并进入控制台
            </Button>
          </Form>

          <Text type="secondary">
            已有账号？
            {' '}
            <Link to="/login">去登录</Link>
          </Text>
        </Space>
      </Card>
    </div>
  )
}
