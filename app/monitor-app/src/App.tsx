import type { MenuProps, TableColumnsType } from 'antd'

import type { ReactNode } from 'react'
import type { ProjectAccess } from './auth/AuthProvider'
import type { QueryRange } from './contexts/FilterContext'
import type {
  AiAnalysisResult,
  AlertDedupeStrategy,
  AlertEventRecord,
  AlertRuleRecord,
  AlertSeverity,
  CreateAlertRulePayload,
  ErrorRecord,
  ErrorStatsItem,
  PerformanceRecord,
  PerformanceStatsItem,
  ReplayRecord,
  ReplayStatsItem,
  RootCauseSummaryItem,
  TrackingRecord,
  TrackingStatsItem,
} from './services/monitor'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Input,
  InputNumber,
  Layout,
  List,
  Menu,
  message,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import ReactECharts from 'echarts-for-react'
import { Component, useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import ProtectedRoute from './auth/ProtectedRoute'
import { createDefaultRange, FilterProvider, useFilterContext } from './contexts/FilterContext'
import { useAlertStream } from './hooks/useAlertStream'
import { useMonitorQuery } from './hooks/useMonitorQuery'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ReplayPlayer from './ReplayPlayer'
import { monitorService } from './services/monitor'
import {
  average,
  collectLatestRecords,
  formatDateTime,
  formatNumber,
  getRecentDays,
  groupCountsByDay,
  groupValuesByDay,
  percentile,
  safeStringify,
} from './utils/monitor'
import './App.css'

const { Header, Sider, Content } = Layout
const { Title, Text, Paragraph } = Typography

type RouteKey = '/dashboard' | '/tracking' | '/performance' | '/error' | '/replay' | '/alerts' | '/stats' | '/workspace'

const routeMeta: Record<RouteKey, { title: string, description: string }> = {
  '/dashboard': {
    title: '总览仪表板',
    description: '关键指标、近 7 天趋势和最新数据预览。',
  },
  '/tracking': {
    title: '埋点数据展示',
    description: '查看事件列表、分页过滤、详情和事件统计图。',
  },
  '/performance': {
    title: '性能数据展示',
    description: '查看性能指标、趋势和明细列表。',
  },
  '/error': {
    title: '错误日志展示',
    description: '查看错误列表、过滤条件、stack 和上下文信息。',
  },
  '/replay': {
    title: '录屏回放',
    description: '查看回放分段、样本事件和错误联动信息。',
  },
  '/alerts': {
    title: '告警中心',
    description: '管理告警规则、实时查看告警事件并处理状态。',
  },
  '/stats': {
    title: '统计分析页面',
    description: '统一时间范围与应用筛选，查看多维统计分析。',
  },
  '/workspace': {
    title: '用户管理',
    description: '管理项目权限与 AI 分析配置。',
  },
}

function renderEmpty(description: string) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />
}

function getTableLocale(description: string) {
  return { emptyText: renderEmpty(description) }
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean, message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message }
  }

  override render() {
    if (this.state.hasError) {
      return (
        <Alert
          type="error"
          showIcon
          message="页面渲染异常"
          description={this.state.message || '请刷新页面后重试'}
          action={(
            <Button type="primary" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          )}
        />
      )
    }

    return this.props.children
  }
}

const navItems: MenuProps['items'] = (Object.keys(routeMeta) as RouteKey[]).map(path => ({
  key: path,
  label: <NavLink to={path}>{routeMeta[path].title}</NavLink>,
}))

interface AiConfig {
  apiKey: string
  apiBaseUrl: string
  model: string
}

const DEFAULT_AI_CONFIG: AiConfig = {
  apiKey: '',
  apiBaseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
}

const AI_CONFIG_STORAGE_KEY = 'ezmonitor.ai-config'

function readAiConfig(): AiConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_AI_CONFIG
  }

  try {
    const raw = window.localStorage.getItem(AI_CONFIG_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_AI_CONFIG
    }

    const parsed = JSON.parse(raw) as Partial<AiConfig>
    return {
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : DEFAULT_AI_CONFIG.apiKey,
      apiBaseUrl: typeof parsed.apiBaseUrl === 'string' && parsed.apiBaseUrl.trim() ? parsed.apiBaseUrl : DEFAULT_AI_CONFIG.apiBaseUrl,
      model: typeof parsed.model === 'string' && parsed.model.trim() ? parsed.model : DEFAULT_AI_CONFIG.model,
    }
  }
  catch {
    return DEFAULT_AI_CONFIG
  }
}

function useAiConfig() {
  const [config, setConfig] = useState<AiConfig>(() => readAiConfig())

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config))
  }, [config])

  return { config, setConfig, resetConfig: () => setConfig(DEFAULT_AI_CONFIG) }
}

function getAiErrorDisplay(result: AiAnalysisResult): { message: string, description: string } {
  switch (result.errorCode) {
    case 'missing_api_key':
      return {
        message: 'AI 密钥未配置',
        description: result.error ?? '请在前端填写 AI_API_KEY，或在 monitor-node 服务端 .env 中配置 AI_API_KEY。',
      }
    case 'upstream_auth_error':
      return {
        message: '上游模型鉴权失败',
        description: result.error ?? '请检查 AI_API_KEY 是否正确，或对应服务是否允许当前密钥访问。',
      }
    case 'upstream_request_error':
      return {
        message: '上游请求参数错误',
        description: result.error ?? '请检查 API Base URL、模型名与请求参数是否匹配目标模型服务。',
      }
    case 'upstream_timeout':
      return {
        message: '上游模型请求超时',
        description: result.error ?? '请检查网络连通性，或稍后重试。',
      }
    case 'upstream_network_error':
      return {
        message: '无法连接上游模型服务',
        description: result.error ?? '请检查 API Base URL 是否可达，以及服务端网络访问权限。',
      }
    case 'upstream_http_error':
      return {
        message: '上游模型接口异常',
        description: result.error ?? '模型服务返回了非预期状态码，请检查服务状态。',
      }
    default:
      return {
        message: '分析失败',
        description: result.error ?? '请稍后重试。',
      }
  }
}

function toStartTimestamp(value: string) {
  if (!value) {
    return undefined
  }

  return new Date(`${value}T00:00:00`).getTime()
}

function toEndTimestamp(value: string) {
  if (!value) {
    return undefined
  }

  return new Date(`${value}T23:59:59.999`).getTime()
}

function buildTimeParams(appId: string, range: QueryRange) {
  const [start, end] = range
  return {
    appId: appId.trim() || undefined,
    startTime: toStartTimestamp(start),
    endTime: toEndTimestamp(end),
  }
}

function formatRangeSummary(range: QueryRange) {
  const defaultRange = createDefaultRange()
  if (range[0] === defaultRange[0] && range[1] === defaultRange[1]) {
    return '最近 7 天'
  }

  return `${range[0]} 至 ${range[1]}`
}

function isThirdPartySourcePath(path?: string): boolean {
  if (!path) {
    return false
  }

  return path.includes('/node_modules/') || path.includes('\\node_modules\\') || path.includes('.pnpm/') || path.includes('.pnpm\\')
}

function useProjectScopedFilters() {
  const auth = useAuth()
  const filters = useFilterContext()
  const effectiveAppId = auth.currentAppId ?? filters.appId

  const setAppId = useCallback((value: string) => {
    if (auth.currentAppId) {
      return
    }
    filters.setAppId(value)
  }, [auth.currentAppId, filters.setAppId])

  const reset = useCallback(() => {
    filters.setRange(createDefaultRange())
    if (!auth.currentAppId) {
      filters.setAppId('')
    }
  }, [auth.currentAppId, filters.setAppId, filters.setRange])

  useEffect(() => {
    if (auth.currentAppId && filters.appId !== auth.currentAppId) {
      filters.setAppId(auth.currentAppId)
    }
  }, [auth.currentAppId, filters.appId, filters.setAppId])

  return {
    ...filters,
    appId: effectiveAppId,
    setAppId,
    reset,
  }
}

function useUserControlledAppId() {
  const auth = useAuth()
  return !auth.currentAppId
}

function ShellLayout() {
  const auth = useAuth()
  const filters = useProjectScopedFilters()
  const location = useLocation()
  const navigate = useNavigate()
  const hasProjects = auth.projects.length > 0
  const selectedKey
    = (Object.keys(routeMeta) as RouteKey[]).find(path => location.pathname.startsWith(path)) ?? '/dashboard'
  const current = routeMeta[selectedKey]

  return (
    <Layout className="app-shell">
      <Sider width={252} breakpoint="lg" collapsedWidth={0} className="app-sider">
        <div className="brand">
          <span className="brand-badge">Monitor</span>
          <Title level={4}>EzMonitor</Title>
          <Text type="secondary">监控控制台</Text>
        </div>
        <Menu className="app-nav-menu" mode="inline" selectedKeys={[selectedKey]} items={navItems} onClick={({ key }) => navigate(key)} />
      </Sider>

      <Layout className="app-main">
        <Header className="app-header">
          <Space direction="vertical" size={2} className="page-heading">
            <Text type="secondary">当前页面</Text>
            <Title level={3}>{current.title}</Title>
          </Space>
          <Space wrap className="header-tools">
            <Select
              value={auth.currentProjectId ?? undefined}
              options={auth.projects.map(project => ({
                label: `${project.name} (${project.appId})`,
                value: project.id,
              }))}
              onChange={value => auth.switchProject(value)}
              className="project-switch"
              style={{ minWidth: 240 }}
              disabled={!hasProjects}
              placeholder="选择项目"
            />
            {auth.projectAccessStatus === 'syncing'
              ? <Tag color="processing">正在同步项目权限</Tag>
              : !hasProjects
                  ? <Tag color="warning">当前账号暂无可访问项目</Tag>
                  : <Tag color="success">项目权限已就绪</Tag>}
            <Text type="secondary">{auth.user?.email}</Text>
            <Button onClick={() => {
              auth.logout()
              navigate('/login', { replace: true })
            }}
            >
              退出登录
            </Button>
            <div className="header-quick-nav">
              {(Object.keys(routeMeta) as RouteKey[]).map(path => (
                <Button key={path} type={selectedKey === path ? 'primary' : 'default'} onClick={() => navigate(path)}>
                  {routeMeta[path].title}
                </Button>
              ))}
            </div>
          </Space>
        </Header>

        <Content className="app-content">
          <div className="page-shell">
            <Card bordered={false} className="page-hero">
              <Space direction="vertical" size={10} className="page-hero-copy">
                <Text type="secondary" className="page-path">{selectedKey.replace('/', '') || 'dashboard'}</Text>
                <Title level={2}>{current.title}</Title>
                <Paragraph type="secondary">{current.description}</Paragraph>
                <Space wrap size={8} className="page-hero-meta">
                  <Tag className="page-hero-tag" color="green">
                    项目：
                    {auth.currentProject?.name ?? '未选择'}
                  </Tag>
                  <Tag className="page-hero-tag" color="blue">
                    appId：
                    {filters.appId.trim() || '全部应用'}
                  </Tag>
                  <Tag className="page-hero-tag" color="gold">
                    时间范围：
                    {formatRangeSummary(filters.range)}
                  </Tag>
                </Space>
              </Space>
              <Space wrap size={8} className="page-hero-actions">
                <Button onClick={filters.reset}>重置筛选</Button>
                <Button type="primary" onClick={() => window.location.reload()}>刷新当前页</Button>
              </Space>
            </Card>

            <AppErrorBoundary>
              {!hasProjects
                ? (
                    <Alert
                      type="warning"
                      showIcon
                      message="当前账号暂无项目权限"
                      description="请联系管理员将你的账号加入目标项目，或使用注册时自动创建项目的账号登录。权限同步后刷新页面即可恢复数据展示。"
                      action={(
                        <Button type="primary" onClick={() => window.location.reload()}>
                          刷新权限
                        </Button>
                      )}
                    />
                  )
                : <Outlet />}
            </AppErrorBoundary>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

function UserManagementPage() {
  const auth = useAuth()
  const { config: aiConfig, setConfig: setAiConfig, resetConfig: resetAiConfig } = useAiConfig()
  const [joinProjectId, setJoinProjectId] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [aiDraft, setAiDraft] = useState<AiConfig>(aiConfig)

  useEffect(() => {
    setAiDraft(aiConfig)
  }, [aiConfig])

  const hasAiChanges
    = aiDraft.apiKey !== aiConfig.apiKey
      || aiDraft.apiBaseUrl !== aiConfig.apiBaseUrl
      || aiDraft.model !== aiConfig.model

  const handleJoinProject = async () => {
    setJoinError(null)
    setJoining(true)
    try {
      await auth.joinProjectById(joinProjectId)
      setJoinProjectId('')
    }
    catch (error) {
      setJoinError(error instanceof Error ? error.message : '添加项目权限失败')
    }
    finally {
      setJoining(false)
    }
  }

  const projectColumns: TableColumnsType<ProjectAccess> = [
    {
      title: '项目名称',
      dataIndex: 'name',
      render: (value: string, record: ProjectAccess) => (
        <Space>
          <Text>{value}</Text>
          {record.id === auth.currentProjectId ? <Tag color="blue">当前项目</Tag> : null}
        </Space>
      ),
    },
    {
      title: 'appId',
      dataIndex: 'appId',
    },
    {
      title: '角色',
      dataIndex: 'role',
      render: (role: ProjectAccess['role']) => (
        <Tag color={role === 'owner' ? 'gold' : role === 'admin' ? 'purple' : 'default'}>{role}</Tag>
      ),
      width: 120,
    },
    {
      title: 'projectId',
      dataIndex: 'id',
      ellipsis: true,
      width: 280,
    },
  ]

  const handleSaveAiConfig = () => {
    const nextConfig: AiConfig = {
      apiKey: aiDraft.apiKey.trim(),
      apiBaseUrl: aiDraft.apiBaseUrl.trim() || DEFAULT_AI_CONFIG.apiBaseUrl,
      model: aiDraft.model.trim() || DEFAULT_AI_CONFIG.model,
    }
    setAiConfig(nextConfig)
    message.success('AI 配置已保存到当前浏览器')
  }

  const handleResetAiConfig = () => {
    resetAiConfig()
    message.success('AI 配置已恢复默认值')
  }

  return (
    <Space direction="vertical" size={16} className="page-stack">
      <SectionCard title="账户信息" description="当前登录用户与项目权限状态。">
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="邮箱">{auth.user?.email ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="用户名">{auth.user?.name ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="当前项目">{auth.currentProject ? `${auth.currentProject.name} (${auth.currentProject.appId})` : '-'}</Descriptions.Item>
          <Descriptions.Item label="权限状态">
            {auth.projectAccessStatus === 'syncing'
              ? <Tag color="processing">syncing</Tag>
              : auth.projectAccessStatus === 'ready'
                ? <Tag color="success">ready</Tag>
                : <Tag color="warning">none</Tag>}
          </Descriptions.Item>
        </Descriptions>
      </SectionCard>

      <SectionCard title="项目权限管理" description="按 projectId 或 appId 添加当前账号到目标项目（默认 viewer）。">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap>
            <Input
              placeholder="例如：69e2683c8e27d8554d41ed7a 或 monitor-test-app"
              value={joinProjectId}
              onChange={event => setJoinProjectId(event.target.value)}
              disabled={joining}
              style={{ width: 380, maxWidth: '100%' }}
            />
            <Button type="primary" loading={joining} onClick={() => void handleJoinProject()}>
              添加项目权限
            </Button>
          </Space>
          {joinError ? <Alert type="error" showIcon message={joinError} /> : null}
          <Table<ProjectAccess>
            rowKey={record => record.id}
            pagination={false}
            dataSource={auth.projects}
            columns={projectColumns}
            locale={getTableLocale('当前账号暂无可访问项目')}
            scroll={{ x: 860 }}
          />
        </Space>
      </SectionCard>

      <SectionCard title="AI 配置" description="用于错误详情中的 AI 根因分析。配置仅保存在当前浏览器。">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Input.Password
            value={aiDraft.apiKey}
            placeholder="输入 AI Token（如 OpenAI API Key）"
            onChange={event => setAiDraft(prev => ({ ...prev, apiKey: event.target.value }))}
          />
          <Input
            value={aiDraft.apiBaseUrl}
            placeholder="API Base URL，例如 https://api.openai.com/v1"
            onChange={event => setAiDraft(prev => ({ ...prev, apiBaseUrl: event.target.value }))}
          />
          <Input
            value={aiDraft.model}
            placeholder="模型名，例如 gpt-4o-mini"
            onChange={event => setAiDraft(prev => ({ ...prev, model: event.target.value }))}
          />
          <Space>
            <Button type="primary" onClick={handleSaveAiConfig} disabled={!hasAiChanges}>
              保存 AI 配置
            </Button>
            <Button onClick={handleResetAiConfig}>恢复默认</Button>
          </Space>
        </Space>
      </SectionCard>
    </Space>
  )
}

function SectionCard({
  title,
  description,
  extra,
  children,
  className = '',
}: {
  title: string
  description?: string
  extra?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={`section-card ${className}`.trim()} title={title} extra={extra}>
      {description ? <Paragraph className="section-description">{description}</Paragraph> : null}
      {children}
    </Card>
  )
}

function SectionStatus({
  loading,
  error,
  hasData,
  emptyDescription = '暂无数据',
  children,
}: {
  loading: boolean
  error?: string | null
  hasData: boolean
  emptyDescription?: string
  children: ReactNode
}) {
  if (loading) {
    return <Spin />
  }

  if (error && !hasData) {
    return <Alert showIcon type="error" message="加载失败" description={error} />
  }

  if (!hasData) {
    return <Empty description={emptyDescription} />
  }

  return <>{children}</>
}

function FilterBar({
  appId,
  appIdDisabled = false,
  onAppIdChange,
  range,
  onRangeChange,
  onReset,
  onRefresh,
  loading,
  extra,
}: {
  appId: string
  appIdDisabled?: boolean
  onAppIdChange: (value: string) => void
  range: QueryRange
  onRangeChange: (value: QueryRange) => void
  onReset: () => void
  onRefresh: () => void
  loading?: boolean
  extra?: ReactNode
}) {
  return (
    <Card className="filter-card">
      <Space wrap size={12} className="filter-toolbar">
        <Input
          allowClear
          placeholder="按 appId 过滤"
          value={appId}
          disabled={appIdDisabled}
          onChange={event => onAppIdChange(event.target.value)}
          className="filter-input"
        />
        <Input
          type="date"
          value={range[0]}
          onChange={event => onRangeChange([event.target.value, range[1]])}
          className="filter-date"
        />
        <Text type="secondary">至</Text>
        <Input
          type="date"
          value={range[1]}
          onChange={event => onRangeChange([range[0], event.target.value])}
          className="filter-date"
        />
        {extra}
        <Button onClick={onReset}>重置</Button>
        <Button type="primary" onClick={onRefresh} loading={loading}>
          刷新
        </Button>
      </Space>
    </Card>
  )
}

function MetricGrid({
  items,
}: {
  items: Array<{ title: string, value: string | number | null | undefined, suffix?: ReactNode, tooltip?: string, action?: ReactNode }>
}) {
  return (
    <Row gutter={[16, 16]}>
      {items.map(item => (
        <Col xs={24} sm={12} lg={6} key={item.title}>
          <Card className="metric-card">
            <Statistic title={item.title} value={item.value ?? undefined} suffix={item.suffix} />
            {item.tooltip ? <Text type="secondary">{item.tooltip}</Text> : null}
            {item.action ? <div style={{ marginTop: 8 }}>{item.action}</div> : null}
          </Card>
        </Col>
      ))}
    </Row>
  )
}

function DetailDrawer({
  open,
  title,
  subtitle,
  items,
  sections,
  onClose,
}: {
  open: boolean
  title: string
  subtitle?: string
  items: Array<{ label: string, value: ReactNode }>
  sections?: Array<{ title: string, content: ReactNode }>
  onClose: () => void
}) {
  return (
    <Drawer open={open} title={title} width={720} onClose={onClose} destroyOnClose>
      {subtitle ? <Paragraph type="secondary">{subtitle}</Paragraph> : null}
      <Descriptions bordered column={1} size="small" className="detail-descriptions">
        {items.map(item => (
          <Descriptions.Item label={item.label} key={item.label}>
            {item.value}
          </Descriptions.Item>
        ))}
      </Descriptions>
      {sections?.map(section => (
        <Card key={section.title} className="detail-section" title={section.title}>
          {section.content}
        </Card>
      ))}
    </Drawer>
  )
}

function queryKey(value: unknown) {
  return JSON.stringify(value)
}

type CoreMetricType = 'fp' | 'fcp' | 'lcp' | 'cls' | 'inp' | 'ttfb'

const coreMetricOrder: CoreMetricType[] = ['fp', 'fcp', 'lcp', 'cls', 'inp', 'ttfb']

const coreMetricMeta: Record<CoreMetricType, { label: string, good: number, poor: number, unit: string }> = {
  fp: { label: 'FP', good: 1800, poor: 3000, unit: 'ms' },
  fcp: { label: 'FCP', good: 1800, poor: 3000, unit: 'ms' },
  lcp: { label: 'LCP', good: 2500, poor: 4000, unit: 'ms' },
  cls: { label: 'CLS', good: 0.1, poor: 0.25, unit: '' },
  inp: { label: 'INP', good: 200, poor: 500, unit: 'ms' },
  ttfb: { label: 'TTFB', good: 800, poor: 1800, unit: 'ms' },
}

function normalizePerformanceMetricType(metricType: string): CoreMetricType | null {
  const lower = metricType.trim().toLowerCase()
  const normalized = lower.startsWith('performance_') ? lower.slice('performance_'.length) : lower

  switch (normalized) {
    case 'fp':
    case 'first-paint':
      return 'fp'
    case 'fcp':
    case 'first-contentful-paint':
      return 'fcp'
    case 'lcp':
    case 'largest-contentful-paint':
      return 'lcp'
    case 'cls':
    case 'cumulative-layout-shift':
      return 'cls'
    case 'inp':
    case 'interaction-to-next-paint':
      return 'inp'
    case 'ttfb':
    case 'time-to-first-byte':
      return 'ttfb'
    default:
      return null
  }
}

function getCoreMetricHealth(metric: CoreMetricType, value: number) {
  const { good, poor } = coreMetricMeta[metric]
  if (value <= good) {
    return { label: '良好', color: 'success' as const }
  }

  if (value <= poor) {
    return { label: '需改进', color: 'warning' as const }
  }

  return { label: '较差', color: 'error' as const }
}

function formatCoreMetricValue(metric: CoreMetricType, value: number) {
  if (!Number.isFinite(value)) {
    return '-'
  }

  if (metric === 'cls') {
    return value.toFixed(3)
  }

  const unit = coreMetricMeta[metric].unit
  return unit ? `${formatNumber(value)} ${unit}` : formatNumber(value)
}

function buildCategoryTrend<T extends { timestamp: string | number | Date }>(
  records: T[],
  getCount: (record: T) => number,
) {
  const days = getRecentDays(7)
  const counts = groupCountsByDay(records, record => record.timestamp, getCount)

  return {
    labels: days.map(item => item.label),
    values: days.map(item => counts.get(item.key) ?? 0),
  }
}

function DashboardPage() {
  const filters = useProjectScopedFilters()
  const canEditAppId = useUserControlledAppId()
  const navigate = useNavigate()
  const timeParams = useMemo(() => buildTimeParams(filters.appId, filters.range), [filters.appId, filters.range])
  const listParams = useMemo(
    () => ({ ...timeParams, page: 1, pageSize: 100, sortBy: 'timestamp', sortOrder: 'desc' as const }),
    [timeParams],
  )
  const statsKey = useMemo(() => queryKey(timeParams), [timeParams])
  const listKey = useMemo(() => queryKey(listParams), [listParams])

  const overview = useMonitorQuery(() => monitorService.getOverviewStats(timeParams), statsKey)
  const trackingStats = useMonitorQuery(() => monitorService.getTrackingStats(timeParams), statsKey)
  const tracking = useMonitorQuery(() => monitorService.getTracking(listParams), listKey)
  const performance = useMonitorQuery(() => monitorService.getPerformance(listParams), listKey)
  const errors = useMonitorQuery(() => monitorService.getErrors(listParams), listKey)
  const replay = useMonitorQuery(() => monitorService.getReplays(listParams), listKey)

  const getTrackingEventCount = (eventName: string) => {
    return trackingStats.data?.find(item => item.eventName === eventName)?.count ?? 0
  }

  const gotoTrackingWithFilter = (eventName: string) => {
    const params = new URLSearchParams()
    params.set('keyword', eventName)
    if (filters.appId.trim()) {
      params.set('appId', filters.appId.trim())
    }
    params.set('start', filters.range[0])
    params.set('end', filters.range[1])
    navigate(`/tracking?${params.toString()}`)
  }

  const latestPreview = useMemo(
    () =>
      collectLatestRecords(
        tracking.data?.items ?? [],
        performance.data?.items ?? [],
        errors.data?.items ?? [],
        replay.data?.items ?? [],
      ).slice(0, 8),
    [errors.data?.items, performance.data?.items, replay.data?.items, tracking.data?.items],
  )
  const trend = useMemo(() => {
    const trackingTrend = buildCategoryTrend(tracking.data?.items ?? [], () => 1)
    const performanceTrend = buildCategoryTrend(performance.data?.items ?? [], () => 1)
    const errorTrend = buildCategoryTrend(errors.data?.items ?? [], () => 1)
    const replayTrend = buildCategoryTrend(replay.data?.items ?? [], () => 1)

    return {
      labels: trackingTrend.labels,
      tracking: trackingTrend.values,
      performance: performanceTrend.values,
      error: errorTrend.values,
      replay: replayTrend.values,
      total: trackingTrend.values.map((value, index) => value + performanceTrend.values[index] + errorTrend.values[index] + replayTrend.values[index]),
    }
  }, [errors.data?.items, performance.data?.items, replay.data?.items, tracking.data?.items])

  const trendOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { data: ['埋点', '性能', '错误', '回放', '总计'] },
      grid: { left: 10, right: 12, top: 28, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: trend.labels },
      yAxis: { type: 'value' },
      series: [
        { name: '埋点', type: 'line', smooth: true, data: trend.tracking },
        { name: '性能', type: 'line', smooth: true, data: trend.performance },
        { name: '错误', type: 'line', smooth: true, data: trend.error },
        { name: '回放', type: 'line', smooth: true, data: trend.replay },
        { name: '总计', type: 'line', smooth: true, data: trend.total },
      ],
    }),
    [trend],
  )

  const metricItems = [
    {
      title: '埋点总数',
      value: overview.data?.tracking ?? 0,
      tooltip: '当前筛选范围内的埋点事件数量',
    },
    {
      title: '性能指标',
      value: overview.data?.performance ?? 0,
      tooltip: '当前筛选范围内的性能数据数量',
    },
    {
      title: '错误日志',
      value: overview.data?.error ?? 0,
      tooltip: '当前筛选范围内的错误日志数量',
    },
    {
      title: '录屏回放',
      value: overview.data?.replay ?? 0,
      tooltip: '当前筛选范围内的回放分段数量',
    },
    {
      title: 'PV (page_view)',
      value: getTrackingEventCount('page_view'),
      tooltip: '当前筛选范围内的页面访问次数',
      action: (
        <Button type="link" size="small" onClick={() => gotoTrackingWithFilter('page_view')}>
          一键筛选
        </Button>
      ),
    },
    {
      title: 'UV (uv_visit)',
      value: getTrackingEventCount('uv_visit'),
      tooltip: '当前筛选范围内的独立访客事件数',
      action: (
        <Button type="link" size="small" onClick={() => gotoTrackingWithFilter('uv_visit')}>
          一键筛选
        </Button>
      ),
    },
    {
      title: '合计',
      value: overview.data?.total ?? 0,
      tooltip: '四类数据总数',
    },
  ]

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {overview.error || trackingStats.error || tracking.error || performance.error || errors.error || replay.error
        ? (
            <Alert
              type="warning"
              showIcon
              message="部分请求失败"
              description={overview.error ?? trackingStats.error ?? tracking.error ?? performance.error ?? errors.error ?? replay.error}
            />
          )
        : null}

      <FilterBar
        appId={filters.appId}
        appIdDisabled={!canEditAppId}
        onAppIdChange={filters.setAppId}
        range={filters.range}
        onRangeChange={filters.setRange}
        onReset={filters.reset}
        extra={!canEditAppId ? <Tag color="blue">当前由项目绑定 appId</Tag> : undefined}
        onRefresh={() => {
          void Promise.allSettled([overview.refresh(), trackingStats.refresh(), tracking.refresh(), performance.refresh(), errors.refresh(), replay.refresh()])
        }}
        loading={overview.loading || trackingStats.loading || tracking.loading || performance.loading || errors.loading || replay.loading}
      />

      <MetricGrid items={metricItems} />

      <SectionCard title="近 7 天趋势图" description="展示埋点、性能、错误和总量变化。">
        <SectionStatus
          loading={tracking.loading || performance.loading || errors.loading || replay.loading}
          error={tracking.error ?? performance.error ?? errors.error ?? replay.error}
          hasData={
            (tracking.data?.items.length ?? 0) > 0
            || (performance.data?.items.length ?? 0) > 0
            || (errors.data?.items.length ?? 0) > 0
            || (replay.data?.items.length ?? 0) > 0
          }
          emptyDescription="当前筛选条件下暂无趋势数据"
        >
          <ReactECharts option={trendOption} style={{ height: 360 }} />
        </SectionStatus>
      </SectionCard>

      <SectionCard title="最新数据预览" description="按时间倒序展示最新的四类数据。">
        {latestPreview.length === 0
          ? (
              <Empty />
            )
          : (
              <List
                dataSource={latestPreview}
                renderItem={(item) => {
                  const typeLabel
                    = item.type === 'tracking' ? '埋点' : item.type === 'performance' ? '性能' : item.type === 'replay' ? '回放' : '错误'
                  const title
                    = item.type === 'tracking'
                      ? item.eventName
                      : item.type === 'performance'
                        ? `${item.metricType}：${formatNumber(item.value)}`
                        : item.type === 'replay'
                          ? `${item.segmentId} · ${item.eventCount} events`
                          : item.message
                  const extra
                    = item.type === 'tracking'
                      ? item.userId ?? item.appId
                      : item.type === 'performance'
                        ? item.url ?? item.appId
                        : item.type === 'replay'
                          ? item.route ?? item.appId
                          : item.errorType ?? item.appId

                  return (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Tag color={item.type === 'error' ? 'red' : item.type === 'performance' ? 'blue' : item.type === 'replay' ? 'gold' : 'green'}>{typeLabel}</Tag>}
                        title={title}
                        description={`${formatDateTime(item.timestamp)} · ${extra}`}
                      />
                    </List.Item>
                  )
                }}
              />
            )}
      </SectionCard>
    </Space>
  )
}

function TrackingPage() {
  const filters = useProjectScopedFilters()
  const canEditAppId = useUserControlledAppId()
  const [searchParams] = useSearchParams()
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<TrackingRecord | null>(null)
  const timeParams = useMemo(() => buildTimeParams(filters.appId, filters.range), [filters.appId, filters.range])
  const listParams = useMemo(
    () => ({ ...timeParams, page, pageSize, sortBy: 'timestamp', sortOrder: 'desc' as const }),
    [page, pageSize, timeParams],
  )
  const statsKey = useMemo(() => queryKey(timeParams), [timeParams])
  const listKey = useMemo(() => queryKey(listParams), [listParams])

  useEffect(() => {
    setPage(1)
  }, [timeParams])

  useEffect(() => {
    const keywordFromQuery = searchParams.get('keyword')?.trim()
    if (keywordFromQuery) {
      setKeyword(keywordFromQuery)
    }

    const appIdFromQuery = searchParams.get('appId')?.trim()
    if (appIdFromQuery) {
      filters.setAppId(appIdFromQuery)
    }

    const start = searchParams.get('start')
    const end = searchParams.get('end')
    if (start && end) {
      filters.setRange([start, end])
    }
  }, [searchParams])

  const listQuery = useMonitorQuery(() => monitorService.getTracking(listParams), listKey)
  const statsQuery = useMonitorQuery(() => monitorService.getTrackingStats(timeParams), statsKey)
  const items = listQuery.data?.items ?? []
  const visibleItems = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    if (!normalized) {
      return items
    }

    return items.filter((item) => {
      const searchTarget = [item.eventName, item.appId, item.userId, safeStringify(item.properties)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return searchTarget.includes(normalized)
    })
  }, [items, keyword])

  const chartOption = useMemo(() => {
    const stats = [...(statsQuery.data ?? [])].sort((a, b) => b.count - a.count).slice(0, 10)
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 12, right: 12, top: 28, bottom: 12, containLabel: true },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: stats.map(item => item.eventName).reverse() },
      series: [
        {
          type: 'bar',
          data: stats.map(item => item.count).reverse(),
          itemStyle: { color: '#1677ff' },
        },
      ],
    }
  }, [statsQuery.data])

  const columns: TableColumnsType<TrackingRecord> = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      render: (value: TrackingRecord['timestamp']) => formatDateTime(value),
      width: 180,
    },
    {
      title: '事件',
      dataIndex: 'eventName',
      render: (value: string) => <Tag color="blue">{value}</Tag>,
      width: 180,
    },
    {
      title: 'appId',
      dataIndex: 'appId',
      width: 140,
    },
    {
      title: '用户',
      dataIndex: 'userId',
      render: (value: string | undefined) => value ?? '-',
      width: 140,
    },
    {
      title: '属性',
      render: (_, record) => {
        const keys = Object.keys(record.properties ?? {})
        return keys.length > 0 ? keys.slice(0, 3).join('、') : '-'
      },
    },
    {
      title: '操作',
      render: (_, record) => (
        <Button type="link" onClick={() => setSelected(record)}>
          详情
        </Button>
      ),
      width: 100,
    },
  ]

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {listQuery.error || statsQuery.error
        ? (
            <Alert type="warning" showIcon message="部分请求失败" description={listQuery.error ?? statsQuery.error} />
          )
        : null}

      <FilterBar
        appId={filters.appId}
        appIdDisabled={!canEditAppId}
        onAppIdChange={filters.setAppId}
        range={filters.range}
        onRangeChange={filters.setRange}
        onReset={() => {
          filters.reset()
          setKeyword('')
          setPage(1)
          setPageSize(10)
        }}
        onRefresh={() => {
          void Promise.allSettled([listQuery.refresh(), statsQuery.refresh()])
        }}
        loading={listQuery.loading || statsQuery.loading}
        extra={(
          <Space wrap size={8}>
            {!canEditAppId ? <Tag color="blue">当前由项目绑定 appId</Tag> : null}
            <Input allowClear placeholder="过滤当前页事件/属性" value={keyword} onChange={e => setKeyword(e.target.value)} className="filter-input" />
          </Space>
        )}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <SectionCard title="事件统计图" description="按事件名称统计当前筛选范围的事件数量。">
            <SectionStatus
              loading={statsQuery.loading}
              error={statsQuery.error}
              hasData={(statsQuery.data?.length ?? 0) > 0}
              emptyDescription="当前筛选条件下暂无埋点统计"
            >
              <ReactECharts option={chartOption} style={{ height: 360 }} />
            </SectionStatus>
          </SectionCard>
        </Col>
        <Col xs={24} lg={14}>
          <SectionCard title="埋点列表" description="支持分页、时间/appId 过滤和当前页关键字筛选。">
            <Table<TrackingRecord>
              rowKey={record => record._id ?? `${record.appId}-${record.timestamp}-${record.eventName}`}
              loading={listQuery.loading}
              dataSource={visibleItems}
              columns={columns}
              locale={getTableLocale(
                listQuery.error ?? (keyword.trim() ? '当前页没有匹配结果' : '暂无埋点数据'),
              )}
              pagination={{
                current: page,
                pageSize,
                total: listQuery.data?.total ?? 0,
                showSizeChanger: true,
              }}
              onChange={(pagination) => {
                setPage(pagination.current ?? 1)
                setPageSize(pagination.pageSize ?? 10)
              }}
              scroll={{ x: 920 }}
            />
          </SectionCard>
        </Col>
      </Row>

      <DetailDrawer
        open={selected !== null}
        title={selected?.eventName ?? '埋点详情'}
        subtitle={selected ? formatDateTime(selected.timestamp) : undefined}
        onClose={() => setSelected(null)}
        items={[
          { label: 'appId', value: selected?.appId ?? '-' },
          { label: '用户', value: selected?.userId ?? '-' },
          { label: '事件', value: selected?.eventName ?? '-' },
          { label: '属性数量', value: Object.keys(selected?.properties ?? {}).length },
          { label: '上下文数量', value: Object.keys(selected?.context ?? {}).length },
        ]}
        sections={[
          {
            title: 'properties',
            content: <pre className="detail-pre">{safeStringify(selected?.properties ?? {})}</pre>,
          },
          {
            title: 'context',
            content: <pre className="detail-pre">{safeStringify(selected?.context ?? {})}</pre>,
          },
        ]}
      />
    </Space>
  )
}

function PerformancePage() {
  const filters = useProjectScopedFilters()
  const canEditAppId = useUserControlledAppId()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<PerformanceRecord | null>(null)
  const timeParams = useMemo(() => buildTimeParams(filters.appId, filters.range), [filters.appId, filters.range])
  const chartParams = useMemo(
    // 后端当前限制 pageSize <= 100，这里固定取 100 条用于趋势图，避免 400 校验失败。
    () => ({ ...timeParams, page: 1, pageSize: 100, sortBy: 'timestamp', sortOrder: 'desc' as const }),
    [timeParams],
  )
  const listParams = useMemo(
    () => ({ ...timeParams, page, pageSize, sortBy: 'timestamp', sortOrder: 'desc' as const }),
    [page, pageSize, timeParams],
  )
  const statsKey = useMemo(() => queryKey(timeParams), [timeParams])
  const chartKey = useMemo(() => queryKey(chartParams), [chartParams])
  const listKey = useMemo(() => queryKey(listParams), [listParams])

  useEffect(() => {
    setPage(1)
  }, [timeParams])

  const listQuery = useMonitorQuery(() => monitorService.getPerformance(listParams), listKey)
  const chartQuery = useMonitorQuery(() => monitorService.getPerformance(chartParams), chartKey)
  const statsQuery = useMonitorQuery(() => monitorService.getPerformanceStats(timeParams), statsKey)
  const items = listQuery.data?.items ?? []
  const chartItems = chartQuery.data?.items ?? []

  const trend = useMemo(() => {
    const days = getRecentDays(7)
    const valuesByDay = groupValuesByDay(chartItems, item => item.timestamp, item => item.value)
    const avgSeries = days.map(day => average(valuesByDay.get(day.key) ?? []))
    const p95Series = days.map(day => percentile(valuesByDay.get(day.key) ?? [], 95))

    return {
      labels: days.map(day => day.label),
      avgSeries,
      p95Series,
    }
  }, [chartItems])

  const coreStatsMap = useMemo(() => {
    const map = new Map<CoreMetricType, PerformanceStatsItem>()
    for (const item of statsQuery.data ?? []) {
      const coreMetric = normalizePerformanceMetricType(item.metricType)
      if (coreMetric) {
        map.set(coreMetric, item)
      }
    }
    return map
  }, [statsQuery.data])

  const coreMetricRows = useMemo(() => {
    return coreMetricOrder.map((metric) => {
      const metricRecords = chartItems.filter(item => normalizePerformanceMetricType(item.metricType) === metric)
      const metricValues = metricRecords.map(item => item.value)
      const stats = coreStatsMap.get(metric)
      const latest = metricRecords.length ? metricRecords[0].value : Number.NaN
      const p75 = metricValues.length ? percentile(metricValues, 75) : Number.NaN
      const p95 = stats?.p95Value ?? (metricValues.length ? percentile(metricValues, 95) : Number.NaN)
      const sampleCount = stats?.count ?? metricValues.length
      const health = sampleCount > 0 && Number.isFinite(p75) ? getCoreMetricHealth(metric, p75) : null

      return {
        key: metric,
        metric,
        label: coreMetricMeta[metric].label,
        latest,
        p75,
        p95,
        sampleCount,
        health,
      }
    })
  }, [chartItems, coreStatsMap])

  const chartOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { data: ['平均值', 'P95'] },
      grid: { left: 12, right: 12, top: 30, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: trend.labels },
      yAxis: { type: 'value' },
      series: [
        { name: '平均值', type: 'line', smooth: true, data: trend.avgSeries },
        { name: 'P95', type: 'line', smooth: true, data: trend.p95Series },
      ],
    }),
    [trend],
  )

  const columns: TableColumnsType<PerformanceRecord> = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      render: (value: PerformanceRecord['timestamp']) => formatDateTime(value),
      width: 180,
    },
    {
      title: '指标',
      dataIndex: 'metricType',
      render: (value: string) => <Tag color="geekblue">{value}</Tag>,
      width: 180,
    },
    {
      title: '数值',
      dataIndex: 'value',
      render: (value: number) => formatNumber(value),
      width: 120,
    },
    {
      title: 'URL',
      dataIndex: 'url',
      render: (value: string | undefined) => value ?? '-',
    },
    {
      title: '操作',
      render: (_, record) => (
        <Button type="link" onClick={() => setSelected(record)}>
          详情
        </Button>
      ),
      width: 100,
    },
  ]

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {listQuery.error || statsQuery.error
        ? (
            <Alert type="warning" showIcon message="部分请求失败" description={listQuery.error ?? statsQuery.error} />
          )
        : null}

      <FilterBar
        appId={filters.appId}
        appIdDisabled={!canEditAppId}
        onAppIdChange={filters.setAppId}
        range={filters.range}
        onRangeChange={filters.setRange}
        onReset={() => {
          filters.reset()
          setPage(1)
          setPageSize(10)
        }}
        extra={!canEditAppId ? <Tag color="blue">当前由项目绑定 appId</Tag> : undefined}
        onRefresh={() => {
          void Promise.allSettled([listQuery.refresh(), chartQuery.refresh(), statsQuery.refresh()])
        }}
        loading={listQuery.loading || chartQuery.loading || statsQuery.loading}
      />

      <SectionCard
        title="Core Web Vitals 概览"
        description="按 FP/FCP/LCP/CLS/INP/TTFB 展示最新值、P75、P95 与健康状态（状态基于 P75）。"
      >
        <SectionStatus
          loading={chartQuery.loading || statsQuery.loading}
          error={chartQuery.error ?? statsQuery.error}
          hasData={coreMetricRows.some(item => item.sampleCount > 0)}
          emptyDescription="当前筛选条件下暂无 Core Web Vitals 数据"
        >
          <Table<(typeof coreMetricRows)[number]>
            rowKey="key"
            pagination={false}
            size="small"
            dataSource={coreMetricRows}
            locale={getTableLocale('暂无 Core Web Vitals 指标')}
            columns={[
              { title: '指标', dataIndex: 'label', width: 120 },
              {
                title: '最新值',
                dataIndex: 'latest',
                render: (value: number, record) => formatCoreMetricValue(record.metric, value),
                width: 160,
              },
              {
                title: 'P75',
                dataIndex: 'p75',
                render: (value: number, record) => formatCoreMetricValue(record.metric, value),
                width: 160,
              },
              {
                title: 'P95',
                dataIndex: 'p95',
                render: (value: number, record) => formatCoreMetricValue(record.metric, value),
                width: 160,
              },
              { title: '样本数', dataIndex: 'sampleCount', width: 120 },
              {
                title: '健康状态',
                dataIndex: 'health',
                render: (value: (typeof coreMetricRows)[number]['health']) =>
                  value ? <Tag color={value.color}>{value.label}</Tag> : <Tag>无数据</Tag>,
                width: 120,
              },
            ]}
            scroll={{ x: 840 }}
          />
        </SectionStatus>
      </SectionCard>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <SectionCard title="趋势图" description="展示平均值与 P95 的 7 天变化。">
            <SectionStatus
              loading={chartQuery.loading}
              error={chartQuery.error}
              hasData={chartItems.length > 0}
              emptyDescription="当前筛选条件下暂无性能数据"
            >
              <ReactECharts option={chartOption} style={{ height: 360 }} />
            </SectionStatus>
          </SectionCard>
        </Col>
        <Col xs={24} lg={14}>
          <SectionCard title="性能列表" description="支持分页过滤和详情查看。">
            <Table<PerformanceRecord>
              rowKey={record => record._id ?? `${record.appId}-${record.timestamp}-${record.metricType}`}
              loading={listQuery.loading}
              dataSource={items}
              columns={columns}
              locale={getTableLocale(listQuery.error ?? '暂无性能数据')}
              pagination={{
                current: page,
                pageSize,
                total: listQuery.data?.total ?? 0,
                showSizeChanger: true,
              }}
              onChange={(pagination) => {
                setPage(pagination.current ?? 1)
                setPageSize(pagination.pageSize ?? 10)
              }}
              scroll={{ x: 920 }}
            />
          </SectionCard>
        </Col>
      </Row>

      <SectionCard title="性能指标统计" description="按指标类型汇总的统计结果。">
        <SectionStatus
          loading={statsQuery.loading}
          error={statsQuery.error}
          hasData={(statsQuery.data?.length ?? 0) > 0}
          emptyDescription="当前筛选条件下暂无性能统计"
        >
          <Tabs
            items={[
              {
                key: 'table',
                label: '统计表',
                children: (
                  <Table<PerformanceStatsItem>
                    rowKey={record => record.metricType}
                    pagination={false}
                    dataSource={statsQuery.data ?? []}
                    locale={getTableLocale('暂无性能统计')}
                    columns={[
                      { title: '指标', dataIndex: 'metricType' },
                      { title: '次数', dataIndex: 'count' },
                      { title: '平均值', dataIndex: 'avgValue', render: (value: number) => formatNumber(value) },
                      { title: '最小值', dataIndex: 'minValue', render: (value: number) => formatNumber(value) },
                      { title: '最大值', dataIndex: 'maxValue', render: (value: number) => formatNumber(value) },
                      { title: 'P95', dataIndex: 'p95Value', render: (value: number) => formatNumber(value) },
                    ]}
                  />
                ),
              },
            ]}
          />
        </SectionStatus>
      </SectionCard>

      <DetailDrawer
        open={selected !== null}
        title={selected?.metricType ?? '性能详情'}
        subtitle={selected ? formatDateTime(selected.timestamp) : undefined}
        onClose={() => setSelected(null)}
        items={[
          { label: 'appId', value: selected?.appId ?? '-' },
          { label: '指标类型', value: selected?.metricType ?? '-' },
          { label: '数值', value: selected ? formatNumber(selected.value) : '-' },
          { label: 'URL', value: selected?.url ?? '-' },
          { label: '上下文数量', value: Object.keys(selected?.context ?? {}).length },
        ]}
        sections={[
          {
            title: 'extra',
            content: <pre className="detail-pre">{safeStringify(selected?.extra ?? {})}</pre>,
          },
          {
            title: 'context',
            content: <pre className="detail-pre">{safeStringify(selected?.context ?? {})}</pre>,
          },
        ]}
      />
    </Space>
  )
}

function ErrorPage() {
  const filters = useProjectScopedFilters()
  const canEditAppId = useUserControlledAppId()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { config: aiConfig } = useAiConfig()
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<ErrorRecord | null>(null)
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const timeParams = useMemo(() => buildTimeParams(filters.appId, filters.range), [filters.appId, filters.range])
  const listParams = useMemo(
    () => ({ ...timeParams, page, pageSize, sortBy: 'timestamp', sortOrder: 'desc' as const }),
    [page, pageSize, timeParams],
  )
  const statsKey = useMemo(() => queryKey(timeParams), [timeParams])
  const listKey = useMemo(() => queryKey(listParams), [listParams])
  const rootCauseSummaryKey = useMemo(() => `${statsKey}:root-cause-summary`, [statsKey])

  useEffect(() => {
    setPage(1)
  }, [timeParams])

  const handleAiAnalyze = async (record: ErrorRecord) => {
    setAiLoading(true)
    setAiResult(null)
    try {
      const result = await monitorService.analyzeError({
        message: record.message,
        errorType: record.errorType,
        stack: record.stack,
        url: record.url,
        frames: record.frames,
        apiKey: aiConfig.apiKey,
        apiBaseUrl: aiConfig.apiBaseUrl,
        model: aiConfig.model,
      })
      setAiResult(result)
    }
    catch (err) {
      setAiResult({
        available: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
    finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    const appIdFromQuery = searchParams.get('appId')?.trim()
    if (appIdFromQuery) {
      filters.setAppId(appIdFromQuery)
    }

    const start = searchParams.get('start')
    const end = searchParams.get('end')
    if (start && end) {
      filters.setRange([start, end])
    }
  }, [searchParams])

  const listQuery = useMonitorQuery(() => monitorService.getErrors(listParams), listKey)
  const statsQuery = useMonitorQuery(() => monitorService.getErrorStats(timeParams), statsKey)
  const rootCauseSummaryQuery = useMonitorQuery(
    () => monitorService.getRootCauseSummary({ ...timeParams, limit: 6 }),
    rootCauseSummaryKey,
  )
  const items = listQuery.data?.items ?? []
  const visibleItems = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    if (!normalized) {
      return items
    }

    return items.filter(item =>
      [item.errorType, item.message, item.appId, item.url].filter(Boolean).join(' ').toLowerCase().includes(normalized),
    )
  }, [items, keyword])

  const chartOption = useMemo(() => {
    const stats = [...(statsQuery.data ?? [])].sort((a, b) => b.count - a.count)
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          data: stats.map(item => ({ name: item.errorType ?? 'unknown', value: item.count })),
        },
      ],
    }
  }, [statsQuery.data])

  const columns: TableColumnsType<ErrorRecord> = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      render: (value: ErrorRecord['timestamp']) => formatDateTime(value),
      width: 180,
    },
    {
      title: '类型',
      dataIndex: 'errorType',
      render: (value: string | undefined) => <Tag color="red">{value ?? 'unknown'}</Tag>,
      width: 160,
    },
    {
      title: '定位',
      dataIndex: 'symbolicationStatus',
      render: (value: ErrorRecord['symbolicationStatus']) => {
        const status = value ?? 'skipped'
        const color = status === 'symbolicated'
          ? 'green'
          : status === 'partial'
            ? 'gold'
            : status === 'failed'
              ? 'red'
              : 'default'

        return <Tag color={color}>{status}</Tag>
      },
      width: 140,
    },
    {
      title: '消息',
      dataIndex: 'message',
      ellipsis: true,
    },
    {
      title: 'URL',
      dataIndex: 'url',
      render: (value: string | undefined) => value ?? '-',
      width: 220,
    },
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => setSelected(record)}>
            详情
          </Button>
          <Button
            type="link"
            onClick={() => {
              setSelected(record)
              void handleAiAnalyze(record)
            }}
          >
            AI 分析
          </Button>
        </Space>
      ),
      width: 160,
    },
  ]

  const selectedContext = useMemo(
    () =>
      selected
        ? {
            appId: selected.appId,
            errorType: selected.errorType ?? 'unknown',
            url: selected.url ?? '-',
            userAgent: selected.userAgent ?? '-',
            release: selected.release ?? '-',
            symbolicationStatus: selected.symbolicationStatus ?? 'skipped',
            symbolicationReason: selected.symbolicationReason ?? '-',
            timestamp: formatDateTime(selected.timestamp),
          }
        : {},
    [selected],
  )

  const selectedMappedFrames = useMemo(() => {
    if (!selected?.frames) {
      return []
    }

    return selected.frames
      .filter(frame => frame.originalFile && typeof frame.originalLine === 'number')
      .sort((a, b) => {
        const aThirdParty = isThirdPartySourcePath(a.originalFile)
        const bThirdParty = isThirdPartySourcePath(b.originalFile)

        if (aThirdParty === bThirdParty) {
          return 0
        }

        return aThirdParty ? 1 : -1
      })
  }, [selected])

  const selectedPrimaryMappedFrame = useMemo(() => {
    if (selectedMappedFrames.length === 0) {
      return null
    }

    return selectedMappedFrames[0]
  }, [selectedMappedFrames])

  const selectedReplaySegmentId = useMemo(() => {
    const replay = selected?.detail && typeof selected.detail === 'object'
      ? (selected.detail as { replay?: { segmentId?: unknown } }).replay
      : undefined

    return typeof replay?.segmentId === 'string' ? replay.segmentId : undefined
  }, [selected])

  const selectedReplayContext = useMemo(() => {
    const replay = selected?.detail && typeof selected.detail === 'object'
      ? (selected.detail as { replay?: Record<string, unknown> }).replay
      : undefined

    return replay ?? null
  }, [selected])

  const selectedErrorId = selected?._id ?? ''
  const rootCauseDetailKey = useMemo(
    () => (selectedErrorId ? `root-cause:${selectedErrorId}` : 'root-cause:none'),
    [selectedErrorId],
  )
  const rootCauseDetailQuery = useMonitorQuery(
    () => (selectedErrorId ? monitorService.getErrorRootCause(selectedErrorId) : Promise.resolve(null)),
    rootCauseDetailKey,
  )
  const rootCauseSummaryRows = rootCauseSummaryQuery.data ?? []
  const selectedRootCause = rootCauseDetailQuery.data
  const selectedRootCauseReplaySegmentId = selectedRootCause?.correlations.replays?.[0]?.segmentId

  const rootCauseCategoryLabels: Record<string, string> = {
    custom_rule: '自定义规则',
    error_frequency: '高频错误',
    error_spread: '错误扩散',
    performance_regression: '性能回归',
    unknown: '未知',
  }

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {listQuery.error || statsQuery.error
        ? (
            <Alert type="warning" showIcon message="部分请求失败" description={listQuery.error ?? statsQuery.error} />
          )
        : null}

      <FilterBar
        appId={filters.appId}
        appIdDisabled={!canEditAppId}
        onAppIdChange={filters.setAppId}
        range={filters.range}
        onRangeChange={filters.setRange}
        onReset={() => {
          filters.reset()
          setKeyword('')
          setPage(1)
          setPageSize(10)
        }}
        onRefresh={() => {
          void Promise.allSettled([listQuery.refresh(), statsQuery.refresh(), rootCauseSummaryQuery.refresh()])
        }}
        loading={listQuery.loading || statsQuery.loading || rootCauseSummaryQuery.loading}
        extra={(
          <Space wrap size={8}>
            {!canEditAppId ? <Tag color="blue">当前由项目绑定 appId</Tag> : null}
            <Input allowClear placeholder="过滤当前页错误消息/类型" value={keyword} onChange={e => setKeyword(e.target.value)} className="filter-input" />
          </Space>
        )}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <SectionCard title="错误统计图" description="按错误类型统计当前筛选范围的错误数量。">
            <SectionStatus
              loading={statsQuery.loading}
              error={statsQuery.error}
              hasData={(statsQuery.data?.length ?? 0) > 0}
              emptyDescription="当前筛选条件下暂无错误统计"
            >
              <ReactECharts option={chartOption} style={{ height: 360 }} />
            </SectionStatus>
          </SectionCard>
        </Col>
        <Col xs={24} lg={14}>
          <SectionCard title="错误列表" description="支持分页、过滤和 stack/context 详情查看。">
            <Table<ErrorRecord>
              rowKey={record => record._id ?? `${record.appId}-${record.timestamp}-${record.message}`}
              loading={listQuery.loading}
              dataSource={visibleItems}
              columns={columns}
              locale={getTableLocale(
                listQuery.error ?? (keyword.trim() ? '当前页没有匹配结果' : '暂无错误数据'),
              )}
              pagination={{
                current: page,
                pageSize,
                total: listQuery.data?.total ?? 0,
                showSizeChanger: true,
              }}
              onChange={(pagination) => {
                setPage(pagination.current ?? 1)
                setPageSize(pagination.pageSize ?? 10)
              }}
              scroll={{ x: 920 }}
            />
          </SectionCard>
        </Col>
      </Row>

      <SectionCard title="根因聚类摘要（Top）" description="按当前筛选窗口聚合错误根因，快速定位主要问题来源。">
        <SectionStatus
          loading={rootCauseSummaryQuery.loading}
          error={rootCauseSummaryQuery.error}
          hasData={rootCauseSummaryRows.length > 0}
          emptyDescription="当前筛选窗口暂无可用根因聚类数据"
        >
          <Table<RootCauseSummaryItem>
            rowKey={record => `${record.category}-${record.count}-${record.lastAnalyzedAt}`}
            size="small"
            pagination={false}
            dataSource={rootCauseSummaryRows}
            columns={[
              {
                title: '根因类别',
                dataIndex: 'category',
                width: 180,
                render: (category: RootCauseSummaryItem['category']) => (
                  <Tag color="geekblue">{rootCauseCategoryLabels[category] ?? category}</Tag>
                ),
              },
              {
                title: '根因标题',
                dataIndex: 'title',
                width: 280,
                render: (value: string) => value || '-',
              },
              {
                title: '严重级别',
                dataIndex: 'severity',
                width: 120,
                render: (value: AlertSeverity) => <Tag color={value === 'critical' ? 'red' : value === 'high' ? 'volcano' : value === 'medium' ? 'gold' : 'blue'}>{value}</Tag>,
              },
              {
                title: '平均置信度',
                dataIndex: 'avgConfidence',
                width: 140,
                render: (value: number) => `${formatNumber(value)}%`,
              },
              {
                title: '样本数',
                dataIndex: 'count',
                width: 110,
                render: (count: number) => formatNumber(count),
              },
              {
                title: '最近分析',
                dataIndex: 'lastAnalyzedAt',
                width: 200,
                render: (value: string) => formatDateTime(value),
              },
            ]}
            scroll={{ x: 980 }}
          />
        </SectionStatus>
      </SectionCard>

      <DetailDrawer
        open={selected !== null}
        title={selected?.message ?? '错误详情'}
        subtitle={selected ? formatDateTime(selected.timestamp) : undefined}
        onClose={() => {
          setSelected(null)
          setAiResult(null)
        }}
        items={[
          { label: 'appId', value: selected?.appId ?? '-' },
          { label: '错误类型', value: selected?.errorType ?? '-' },
          {
            label: '根因类别',
            value: selectedRootCause
              ? <Tag color="geekblue">{rootCauseCategoryLabels[selectedRootCause.rootCause.category] ?? selectedRootCause.rootCause.category}</Tag>
              : '-',
          },
          {
            label: '根因置信度',
            value: selectedRootCause ? `${formatNumber(selectedRootCause.confidence)}%` : '-',
          },
          { label: 'release', value: selected?.release ?? '-' },
          { label: '定位状态', value: selected?.symbolicationStatus ?? 'skipped' },
          { label: '定位原因', value: selected?.symbolicationReason ?? '-' },
          { label: 'URL', value: selected?.url ?? '-' },
          { label: 'User-Agent', value: selected?.userAgent ?? '-' },
          {
            label: '根因回放 segment',
            value: selectedRootCauseReplaySegmentId
              ? (
                  <Button
                    type="link"
                    onClick={() => {
                      const params = new URLSearchParams()
                      if (selected?.appId) {
                        params.set('appId', selected.appId)
                      }
                      params.set('start', filters.range[0])
                      params.set('end', filters.range[1])
                      params.set('segmentId', selectedRootCauseReplaySegmentId)
                      navigate(`/replay?${params.toString()}`)
                    }}
                  >
                    {selectedRootCauseReplaySegmentId}
                  </Button>
                )
              : '-',
          },
          {
            label: '回放 segment',
            value: selectedReplaySegmentId
              ? (
                  <Button
                    type="link"
                    onClick={() => {
                      const params = new URLSearchParams()
                      if (selected?.appId) {
                        params.set('appId', selected.appId)
                      }
                      params.set('start', filters.range[0])
                      params.set('end', filters.range[1])
                      params.set('segmentId', selectedReplaySegmentId)
                      navigate(`/replay?${params.toString()}`)
                    }}
                  >
                    {selectedReplaySegmentId}
                  </Button>
                )
              : '-',
          },
        ]}
        sections={[
          {
            title: 'AI 智能分析',
            content: (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Button
                    type="primary"
                    loading={aiLoading}
                    onClick={() => selected && void handleAiAnalyze(selected)}
                  >
                    {aiResult ? '重新分析' : 'AI 分析此错误'}
                  </Button>
                  {aiResult && !aiLoading && (
                    <Tag color={aiResult.available ? 'blue' : 'orange'}>
                      {aiResult.available ? `模型: ${aiResult.model ?? '-'}` : '未配置'}
                    </Tag>
                  )}
                </Space>
                {aiLoading && <Spin tip="AI 正在分析中..." />}
                {!aiLoading && aiResult && (
                  aiResult.error
                    ? <Alert type="warning" showIcon message={getAiErrorDisplay(aiResult).message} description={getAiErrorDisplay(aiResult).description} />
                    : (
                        <pre className="detail-pre" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {aiResult.analysis ?? '-'}
                        </pre>
                      )
                )}
                {!aiLoading && !aiResult && (
                  <Text type="secondary">点击「AI 分析此错误」，AI 将根据错误信息和源码定位帧给出根因分析和修复建议。</Text>
                )}
              </Space>
            ),
          },
          {
            title: 'root cause analysis',
            content: rootCauseDetailQuery.loading
              ? <Spin size="small" />
              : rootCauseDetailQuery.error
                ? <Alert type="warning" showIcon message="根因分析加载失败" description={rootCauseDetailQuery.error} />
                : selectedRootCause
                  ? <pre className="detail-pre">{safeStringify(selectedRootCause)}</pre>
                  : <pre className="detail-pre">-</pre>,
          },
          {
            title: 'stack',
            content: <pre className="detail-pre">{selected?.stack ?? '-'}</pre>,
          },
          {
            title: 'context',
            content: <pre className="detail-pre">{safeStringify(selectedContext)}</pre>,
          },
          {
            title: 'replay',
            content: selectedReplayContext
              ? <pre className="detail-pre">{safeStringify(selectedReplayContext)}</pre>
              : <pre className="detail-pre">-</pre>,
          },
          {
            title: 'recommended frame (business-first)',
            content: selectedPrimaryMappedFrame
              ? (
                  <pre className="detail-pre">
                    {safeStringify({
                      source: `${selectedPrimaryMappedFrame.originalFile}:${selectedPrimaryMappedFrame.originalLine}:${selectedPrimaryMappedFrame.originalColumn ?? 0}`,
                      originalFunctionName: selectedPrimaryMappedFrame.originalFunctionName,
                      bundled: `${selectedPrimaryMappedFrame.file ?? '-'}:${selectedPrimaryMappedFrame.line ?? 0}:${selectedPrimaryMappedFrame.column ?? 0}`,
                    })}
                  </pre>
                )
              : <pre className="detail-pre">-</pre>,
          },
          {
            title: 'sourcemap (mapped frames, business-first)',
            content: selectedMappedFrames.length > 0
              ? (
                  <pre className="detail-pre">
                    {safeStringify(
                      selectedMappedFrames.map(frame => ({
                        source: `${frame.originalFile}:${frame.originalLine}:${frame.originalColumn ?? 0}`,
                        originalFunctionName: frame.originalFunctionName,
                        bundled: `${frame.file ?? '-'}:${frame.line ?? 0}:${frame.column ?? 0}`,
                      })),
                    )}
                  </pre>
                )
              : <pre className="detail-pre">-</pre>,
          },
        ]}
      />
    </Space>
  )
}

function ReplayPage() {
  const filters = useProjectScopedFilters()
  const canEditAppId = useUserControlledAppId()
  const [searchParams, setSearchParams] = useSearchParams()
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<ReplayRecord | null>(null)
  const segmentId = searchParams.get('segmentId') ?? ''
  const timeParams = useMemo(() => buildTimeParams(filters.appId, filters.range), [filters.appId, filters.range])
  const listParams = useMemo(
    () => ({ ...timeParams, page, pageSize, sortBy: 'timestamp', sortOrder: 'desc' as const, segmentId: segmentId.trim() || undefined }),
    [page, pageSize, segmentId, timeParams],
  )
  const statsKey = useMemo(() => queryKey(timeParams), [timeParams])
  const listKey = useMemo(() => queryKey(listParams), [listParams])

  useEffect(() => {
    setPage(1)
  }, [timeParams, segmentId])

  useEffect(() => {
    const appIdFromQuery = searchParams.get('appId')?.trim()
    if (appIdFromQuery) {
      filters.setAppId(appIdFromQuery)
    }

    const start = searchParams.get('start')
    const end = searchParams.get('end')
    if (start && end) {
      filters.setRange([start, end])
    }
  }, [searchParams])

  const listQuery = useMonitorQuery(() => monitorService.getReplays(listParams), listKey)
  const statsQuery = useMonitorQuery(() => monitorService.getReplayStats(timeParams), statsKey)
  const items = listQuery.data?.items ?? []
  const visibleItems = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    if (!normalized) {
      return items
    }

    return items.filter((item) => {
      const searchTarget = [item.segmentId, item.route, item.reason, item.userId, safeStringify(item.sample)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return searchTarget.includes(normalized)
    })
  }, [items, keyword])

  const chartOption = useMemo(() => {
    const stats = [...(statsQuery.data ?? [])].sort((a, b) => b.count - a.count).slice(0, 10)
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 12, right: 12, top: 28, bottom: 12, containLabel: true },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: stats.map(item => item.route).reverse() },
      series: [
        {
          type: 'bar',
          data: stats.map(item => item.count).reverse(),
          itemStyle: { color: '#f59e0b' },
        },
      ],
    }
  }, [statsQuery.data])

  const columns: TableColumnsType<ReplayRecord> = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      render: (value: ReplayRecord['timestamp']) => formatDateTime(value),
      width: 180,
    },
    {
      title: 'segmentId',
      dataIndex: 'segmentId',
      render: (value: string) => <Tag color="gold">{value}</Tag>,
      width: 220,
    },
    {
      title: '路由',
      dataIndex: 'route',
      render: (value: string | undefined) => value ?? '-',
      width: 200,
    },
    {
      title: '事件数',
      dataIndex: 'eventCount',
      width: 100,
    },
    {
      title: '原因',
      dataIndex: 'reason',
      render: (value: string | undefined) => value ?? '-',
      width: 160,
    },
    {
      title: '操作',
      render: (_, record) => (
        <Button type="link" onClick={() => setSelected(record)}>
          详情
        </Button>
      ),
      width: 100,
    },
  ]

  const selectedSample = selected?.sample ?? []
  const selectedRrwebEvents = useMemo(() => {
    if (Array.isArray(selected?.rrwebEvents) && selected.rrwebEvents.length > 0) {
      return selected.rrwebEvents
    }

    if (Array.isArray(selected?.sample) && selected.sample.length > 0) {
      const unpacked = selected.sample
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return null
          }

          const wrapper = item as { type?: unknown, at?: unknown, data?: unknown }
          if (wrapper.type === 'rrweb' && wrapper.data && typeof wrapper.data === 'object') {
            const event = wrapper.data as Record<string, unknown>
            if (typeof event.timestamp !== 'number' && typeof wrapper.at === 'number') {
              return { ...event, timestamp: wrapper.at }
            }
            return event
          }

          const direct = item as Record<string, unknown>
          if (typeof direct.timestamp === 'number' && typeof direct.type === 'number') {
            return item as Record<string, unknown>
          }

          return null
        })
        .filter((item): item is Record<string, unknown> => item !== null)

      if (unpacked.length > 0) {
        return unpacked
      }
    }

    return []
  }, [selected])
  const selectedContext = selected?.context ?? {}

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {listQuery.error || statsQuery.error
        ? (
            <Alert type="warning" showIcon message="部分请求失败" description={listQuery.error ?? statsQuery.error} />
          )
        : null}

      <FilterBar
        appId={filters.appId}
        appIdDisabled={!canEditAppId}
        onAppIdChange={filters.setAppId}
        range={filters.range}
        onRangeChange={filters.setRange}
        onReset={() => {
          filters.reset()
          setKeyword('')
          setPage(1)
          setPageSize(10)
          setSearchParams({})
        }}
        onRefresh={() => {
          void Promise.allSettled([listQuery.refresh(), statsQuery.refresh()])
        }}
        loading={listQuery.loading || statsQuery.loading}
        extra={(
          <Space wrap size={8}>
            {!canEditAppId ? <Tag color="blue">当前由项目绑定 appId</Tag> : null}
            <Input
              allowClear
              placeholder="按 segmentId / route / reason 过滤"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className="filter-input"
            />
          </Space>
        )}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <SectionCard title="回放路由分布" description="按路由统计回放分段数量。">
            <SectionStatus
              loading={statsQuery.loading}
              error={statsQuery.error}
              hasData={(statsQuery.data?.length ?? 0) > 0}
              emptyDescription="当前筛选条件下暂无回放统计"
            >
              <ReactECharts option={chartOption} style={{ height: 360 }} />
            </SectionStatus>
          </SectionCard>
        </Col>
        <Col xs={24} lg={14}>
          <SectionCard title="回放分段列表" description="支持时间/appId/segmentId 过滤和 sample 详情查看。">
            <Table<ReplayRecord>
              rowKey={record => record._id ?? record.segmentId}
              loading={listQuery.loading}
              dataSource={visibleItems}
              columns={columns}
              locale={getTableLocale(
                listQuery.error ?? (keyword.trim() ? '当前页没有匹配结果' : '暂无回放数据'),
              )}
              pagination={{
                current: page,
                pageSize,
                total: listQuery.data?.total ?? 0,
                showSizeChanger: true,
              }}
              onChange={(pagination) => {
                setPage(pagination.current ?? 1)
                setPageSize(pagination.pageSize ?? 10)
              }}
              scroll={{ x: 980 }}
            />
          </SectionCard>
        </Col>
      </Row>

      <DetailDrawer
        open={selected !== null}
        title={selected?.segmentId ?? '回放详情'}
        subtitle={selected ? formatDateTime(selected.timestamp) : undefined}
        onClose={() => setSelected(null)}
        items={[
          { label: 'appId', value: selected?.appId ?? '-' },
          { label: 'segmentId', value: selected?.segmentId ?? '-' },
          { label: '路由', value: selected?.route ?? '-' },
          { label: '回放模式', value: selected?.mode ?? 'native' },
          { label: '事件数', value: selected?.eventCount ?? 0 },
          { label: '原因', value: selected?.reason ?? '-' },
          {
            label: '错误联动',
            value: typeof selectedContext?.replay === 'object' ? '已挂载' : '-',
          },
        ]}
        sections={[
          {
            title: 'context',
            content: <pre className="detail-pre">{safeStringify(selectedContext)}</pre>,
          },
          {
            title: 'rrweb player',
            content: <ReplayPlayer events={selectedRrwebEvents} />,
          },
          {
            title: 'sample events',
            content: selectedSample.length > 0
              ? <pre className="detail-pre">{safeStringify(selectedSample)}</pre>
              : <pre className="detail-pre">-</pre>,
          },
        ]}
      />
    </Space>
  )
}

function AlertsPage() {
  const filters = useProjectScopedFilters()
  const canEditAppId = useUserControlledAppId()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'acknowledged' | 'resolved'>('all')
  const [operationResult, setOperationResult] = useState('')

  const [ruleName, setRuleName] = useState('')
  const [ruleMetric, setRuleMetric] = useState<'error_frequency' | 'error_spread'>('error_frequency')
  const [ruleWindowSec, setRuleWindowSec] = useState(300)
  const [ruleSuppressSec, setRuleSuppressSec] = useState(300)
  const [ruleDedupeStrategy, setRuleDedupeStrategy] = useState<AlertDedupeStrategy>('by_rule')
  const [ruleThreshold, setRuleThreshold] = useState(3)
  const [ruleSeverity, setRuleSeverity] = useState<AlertSeverity>('high')
  const [ruleEnabled, setRuleEnabled] = useState(true)
  const [creatingRule, setCreatingRule] = useState(false)
  const [updatingRule, setUpdatingRule] = useState(false)

  const [editingRule, setEditingRule] = useState<AlertRuleRecord | null>(null)
  const [editRuleName, setEditRuleName] = useState('')
  const [editRuleMetric, setEditRuleMetric] = useState<'error_frequency' | 'error_spread'>('error_frequency')
  const [editRuleWindowSec, setEditRuleWindowSec] = useState(300)
  const [editRuleSuppressSec, setEditRuleSuppressSec] = useState(300)
  const [editRuleDedupeStrategy, setEditRuleDedupeStrategy] = useState<AlertDedupeStrategy>('by_rule')
  const [editRuleThreshold, setEditRuleThreshold] = useState(3)
  const [editRuleSeverity, setEditRuleSeverity] = useState<AlertSeverity>('high')
  const [editRuleEnabled, setEditRuleEnabled] = useState(true)

  const timeParams = useMemo(() => buildTimeParams(filters.appId, filters.range), [filters.appId, filters.range])

  const rulesParams = useMemo(() => ({
    appId: filters.appId.trim() || undefined,
    page: 1,
    pageSize: 100,
  }), [filters.appId])
  const rulesKey = useMemo(() => queryKey(rulesParams), [rulesParams])

  const eventsParams = useMemo(() => ({
    appId: timeParams.appId,
    startTime: timeParams.startTime,
    endTime: timeParams.endTime,
    status: statusFilter === 'all' ? undefined : statusFilter,
    page,
    pageSize,
  }), [timeParams, statusFilter, page, pageSize])
  const eventsKey = useMemo(() => queryKey(eventsParams), [eventsParams])

  const trendParams = useMemo(() => ({
    appId: timeParams.appId,
    startTime: timeParams.startTime,
    endTime: timeParams.endTime,
    page: 1,
    pageSize: 500,
  }), [timeParams])
  const trendKey = useMemo(() => queryKey({ ...trendParams, trend: true }), [trendParams])

  const rulesQuery = useMonitorQuery(() => monitorService.getAlertRules(rulesParams), rulesKey)
  const eventsQuery = useMonitorQuery(() => monitorService.getAlertEvents(eventsParams), eventsKey)
  const trendQuery = useMonitorQuery(() => monitorService.getAlertEvents(trendParams), trendKey)
  const stream = useAlertStream(timeParams.appId, 20)

  const ruleRows = rulesQuery.data?.items ?? []
  const eventRows = eventsQuery.data?.items ?? []
  const trendRows = trendQuery.data?.items ?? []

  const streamSuppressionHits = useMemo(
    () => stream.alerts.reduce((sum, item) => sum + (item.suppressionHits ?? 0), 0),
    [stream.alerts],
  )

  const eventSuppressionSummary = useMemo(() => {
    const totalHits = eventRows.reduce((sum, item) => sum + (item.suppressionHits ?? 0), 0)
    const affectedEvents = eventRows.filter(item => (item.suppressionHits ?? 0) > 0).length

    return {
      affectedEvents,
      avgHitsPerEvent: eventRows.length > 0 ? Number((totalHits / eventRows.length).toFixed(2)) : 0,
      totalHits,
    }
  }, [eventRows])

  const metricOptions = [
    { label: '错误频率', value: 'error_frequency' },
    { label: '错误扩散', value: 'error_spread' },
  ]
  const dedupeOptions: Array<{ label: string, value: AlertDedupeStrategy }> = [
    { label: '按规则', value: 'by_rule' },
    { label: '按错误类型', value: 'by_error_type' },
    { label: '按错误指纹', value: 'by_fingerprint' },
    { label: '规则 + 指纹', value: 'by_rule_and_fingerprint' },
  ]
  const severityOptions = [
    { label: 'low', value: 'low' },
    { label: 'medium', value: 'medium' },
    { label: 'high', value: 'high' },
    { label: 'critical', value: 'critical' },
  ]
  const severityLabels: Record<AlertSeverity, string> = {
    critical: '严重',
    high: '高',
    low: '低',
    medium: '中',
  }
  const severityColors: Record<AlertSeverity, string> = {
    critical: '#cf1322',
    high: '#fa541c',
    low: '#1677ff',
    medium: '#faad14',
  }
  const dedupeLabels: Record<AlertDedupeStrategy, string> = {
    by_error_type: '按错误类型',
    by_fingerprint: '按错误指纹',
    by_rule: '按规则',
    by_rule_and_fingerprint: '规则 + 指纹',
  }

  const dayAxis = useMemo(() => {
    if (typeof timeParams.startTime !== 'number' || typeof timeParams.endTime !== 'number') {
      return getRecentDays(7)
    }

    const start = new Date(timeParams.startTime)
    const end = new Date(timeParams.endTime)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.getTime() > end.getTime()) {
      return getRecentDays(7)
    }

    const cursor = new Date(start)
    cursor.setHours(0, 0, 0, 0)

    const boundary = new Date(end)
    boundary.setHours(0, 0, 0, 0)

    const result: Array<{ key: string, label: string }> = []
    while (cursor.getTime() <= boundary.getTime()) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
      result.push({
        key,
        label: `${cursor.getMonth() + 1}/${cursor.getDate()}`,
      })
      cursor.setDate(cursor.getDate() + 1)
    }

    return result.length > 0 ? result : getRecentDays(7)
  }, [timeParams.endTime, timeParams.startTime])

  const trendOption = useMemo(() => {
    const severityOrder: AlertSeverity[] = ['critical', 'high', 'medium', 'low']
    const series = severityOrder.map((severity) => {
      const counts = groupCountsByDay(
        trendRows.filter(item => item.severity === severity),
        item => item.triggeredAt,
      )

      return {
        name: severityLabels[severity],
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        itemStyle: { color: severityColors[severity] },
        data: dayAxis.map(day => counts.get(day.key) ?? 0),
      }
    })

    return {
      tooltip: { trigger: 'axis' },
      legend: {
        top: 0,
        data: series.map(item => item.name),
      },
      grid: { left: 12, right: 12, top: 48, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category',
        data: dayAxis.map(day => day.label),
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
      },
      series,
    }
  }, [dayAxis, severityColors, severityLabels, trendRows])

  const createRule = async () => {
    const trimmed = ruleName.trim()
    if (!trimmed) {
      setOperationResult('规则名称不能为空')
      return
    }

    setCreatingRule(true)
    setOperationResult('')

    const payload: CreateAlertRulePayload = {
      name: trimmed,
      appId: filters.appId.trim() || undefined,
      metric: ruleMetric,
      windowSec: Math.max(30, Math.round(ruleWindowSec)),
      suppressSec: Math.max(30, Math.round(ruleSuppressSec)),
      dedupeStrategy: ruleDedupeStrategy,
      threshold: Math.max(1, Math.round(ruleThreshold)),
      severity: ruleSeverity,
      enabled: ruleEnabled,
    }

    try {
      await monitorService.createAlertRule(payload)
      setRuleName('')
      setRuleWindowSec(300)
      setRuleSuppressSec(300)
      setRuleDedupeStrategy('by_rule')
      setRuleThreshold(3)
      setRuleSeverity('high')
      setRuleEnabled(true)
      setOperationResult('规则创建成功')
      await rulesQuery.refresh()
    }
    catch (error) {
      setOperationResult(`规则创建失败：${error instanceof Error ? error.message : String(error)}`)
    }
    finally {
      setCreatingRule(false)
    }
  }

  const openEditRule = (rule: AlertRuleRecord) => {
    setEditingRule(rule)
    setEditRuleName(rule.name)
    setEditRuleMetric(rule.metric)
    setEditRuleWindowSec(rule.windowSec)
    setEditRuleSuppressSec(rule.suppressSec ?? 300)
    setEditRuleDedupeStrategy(rule.dedupeStrategy ?? 'by_rule')
    setEditRuleThreshold(rule.threshold)
    setEditRuleSeverity(rule.severity)
    setEditRuleEnabled(rule.enabled)
  }

  const closeEditRule = () => {
    setEditingRule(null)
    setUpdatingRule(false)
  }

  const saveRuleEdit = async () => {
    if (!editingRule?._id) {
      return
    }

    const trimmed = editRuleName.trim()
    if (!trimmed) {
      setOperationResult('规则名称不能为空')
      return
    }

    setUpdatingRule(true)

    try {
      await monitorService.updateAlertRule(editingRule._id, {
        dedupeStrategy: editRuleDedupeStrategy,
        enabled: editRuleEnabled,
        metric: editRuleMetric,
        name: trimmed,
        severity: editRuleSeverity,
        suppressSec: Math.max(30, Math.round(editRuleSuppressSec)),
        threshold: Math.max(1, Math.round(editRuleThreshold)),
        windowSec: Math.max(30, Math.round(editRuleWindowSec)),
      })
      setOperationResult(`规则 ${trimmed} 更新成功`)
      closeEditRule()
      await rulesQuery.refresh()
    }
    catch (error) {
      setOperationResult(`规则更新失败：${error instanceof Error ? error.message : String(error)}`)
    }
    finally {
      setUpdatingRule(false)
    }
  }

  const toggleRuleEnabled = async (rule: AlertRuleRecord, enabled: boolean) => {
    if (!rule._id) {
      return
    }

    try {
      await monitorService.updateAlertRule(rule._id, { enabled })
      setOperationResult(`规则 ${rule.name} 已${enabled ? '启用' : '停用'}`)
      await rulesQuery.refresh()
    }
    catch (error) {
      setOperationResult(`规则更新失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const deleteRule = async (rule: AlertRuleRecord) => {
    if (!rule._id) {
      return
    }

    try {
      await monitorService.deleteAlertRule(rule._id)
      setOperationResult(`规则 ${rule.name} 已删除`)
      await rulesQuery.refresh()
    }
    catch (error) {
      setOperationResult(`规则删除失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const updateEventStatus = async (record: AlertEventRecord, status: 'acknowledged' | 'resolved') => {
    if (!record._id) {
      return
    }

    try {
      await monitorService.updateAlertEventStatus(record._id, status)
      setOperationResult(`事件状态已更新为 ${status}`)
      await eventsQuery.refresh()
    }
    catch (error) {
      setOperationResult(`事件状态更新失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const ruleColumns: TableColumnsType<AlertRuleRecord> = [
    {
      title: '规则名称',
      dataIndex: 'name',
      width: 220,
    },
    {
      title: '类型',
      dataIndex: 'metric',
      width: 150,
      render: (value: string) => value === 'error_spread' ? '扩散告警' : '频率告警',
    },
    {
      title: '窗口(s)',
      dataIndex: 'windowSec',
      width: 100,
    },
    {
      title: '抑制(s)',
      dataIndex: 'suppressSec',
      width: 100,
      render: (value: number | undefined) => value ?? '-',
    },
    {
      title: '去重策略',
      dataIndex: 'dedupeStrategy',
      width: 140,
      render: (value: AlertDedupeStrategy | undefined) => dedupeLabels[value ?? 'by_rule'],
    },
    {
      title: '阈值',
      dataIndex: 'threshold',
      width: 90,
    },
    {
      title: '级别',
      dataIndex: 'severity',
      width: 110,
      render: (value: AlertSeverity) => <Tag color={value === 'critical' ? 'red' : value === 'high' ? 'volcano' : value === 'medium' ? 'gold' : 'blue'}>{value}</Tag>,
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 90,
      render: (value: boolean, record: AlertRuleRecord) => (
        <Switch checked={value} onChange={checked => void toggleRuleEnabled(record, checked)} />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: unknown, record: AlertRuleRecord) => (
        <Space size={4}>
          <Button type="link" onClick={() => openEditRule(record)}>
            编辑
          </Button>
          <Button danger type="link" onClick={() => void deleteRule(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  const eventColumns: TableColumnsType<AlertEventRecord> = [
    {
      title: '触发时间',
      dataIndex: 'triggeredAt',
      width: 180,
      render: (value: string | number | Date) => formatDateTime(value),
    },
    {
      title: '规则',
      dataIndex: 'ruleName',
      width: 160,
      ellipsis: true,
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      ellipsis: true,
    },
    {
      title: '得分',
      dataIndex: 'score',
      width: 90,
    },
    {
      title: '级别',
      dataIndex: 'severity',
      width: 110,
      render: (value: AlertSeverity) => <Tag color={value === 'critical' ? 'red' : value === 'high' ? 'volcano' : value === 'medium' ? 'gold' : 'blue'}>{value}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: '抑制命中',
      dataIndex: 'suppressionHits',
      width: 120,
      render: (value: number | undefined) => {
        const hits = value ?? 0
        return hits > 0 ? <Tag color="cyan">{hits}</Tag> : <Text type="secondary">0</Text>
      },
    },
    {
      title: '处理',
      key: 'action',
      width: 170,
      render: (_: unknown, record: AlertEventRecord) => (
        <Space size={4}>
          <Button size="small" onClick={() => void updateEventStatus(record, 'acknowledged')}>
            已确认
          </Button>
          <Button size="small" type="primary" onClick={() => void updateEventStatus(record, 'resolved')}>
            已解决
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Space direction="vertical" size={16} className="page-stack">
      <Alert
        type={stream.status === 'connected' ? 'success' : 'warning'}
        showIcon
        message={stream.status === 'connected' ? '实时告警流已连接' : '告警流降级为轮询'}
        description={`实时面板当前展示 ${stream.alerts.length} 条最新告警，累计抑制命中 ${streamSuppressionHits} 次。`}
      />

      {operationResult
        ? (
            <Alert
              type={operationResult.includes('失败') ? 'error' : 'success'}
              showIcon
              message="操作结果"
              description={operationResult}
            />
          )
        : null}

      {rulesQuery.error || eventsQuery.error || trendQuery.error
        ? (
            <Alert
              type="warning"
              showIcon
              message="部分请求失败"
              description={rulesQuery.error ?? eventsQuery.error ?? trendQuery.error}
            />
          )
        : null}

      <FilterBar
        appId={filters.appId}
        appIdDisabled={!canEditAppId}
        onAppIdChange={filters.setAppId}
        range={filters.range}
        onRangeChange={filters.setRange}
        onReset={filters.reset}
        extra={!canEditAppId ? <Tag color="blue">当前由项目绑定 appId</Tag> : undefined}
        onRefresh={() => {
          void Promise.allSettled([rulesQuery.refresh(), eventsQuery.refresh(), trendQuery.refresh()])
        }}
        loading={rulesQuery.loading || eventsQuery.loading || trendQuery.loading || creatingRule || updatingRule}
      />

      <SectionCard title="实时告警流" description="展示最近接收的告警事件，支持 SSE 自动订阅与降级轮询。">
        <List
          bordered
          dataSource={stream.alerts}
          locale={{ emptyText: renderEmpty('暂未接收到实时告警') }}
          renderItem={item => (
            <List.Item>
              <Space direction="vertical" size={2}>
                <Space>
                  <Tag color="red">{item.severity}</Tag>
                  <Text strong>{item.ruleName}</Text>
                  {(item.suppressionHits ?? 0) > 0
                    ? (
                        <Tag color="cyan">
                          抑制 +
                          {item.suppressionHits}
                        </Tag>
                      )
                    : null}
                  <Text type="secondary">{formatDateTime(item.triggeredAt)}</Text>
                </Space>
                <Text>{item.summary}</Text>
              </Space>
            </List.Item>
          )}
        />
      </SectionCard>

      <SectionCard title="告警趋势（按天）" description="按当前筛选条件统计每日告警，并按严重级别拆分。">
        <SectionStatus
          loading={trendQuery.loading}
          error={trendQuery.error}
          hasData={trendRows.length > 0}
          emptyDescription="当前筛选条件下暂无趋势数据"
        >
          <ReactECharts option={trendOption} style={{ height: 320 }} />
        </SectionStatus>
      </SectionCard>

      <SectionCard title="创建告警规则" description="支持评估窗口、抑制窗口与去重策略配置。">
        <Space wrap>
          <Input
            value={ruleName}
            placeholder="规则名称"
            onChange={event => setRuleName(event.target.value)}
            style={{ width: 200 }}
          />
          <Select
            value={ruleMetric}
            onChange={value => setRuleMetric(value as 'error_frequency' | 'error_spread')}
            options={metricOptions}
            style={{ width: 140 }}
          />
          <InputNumber min={30} max={86400} value={ruleWindowSec} onChange={value => setRuleWindowSec(Number(value ?? 300))} addonAfter="s" />
          <InputNumber min={30} max={86400} value={ruleSuppressSec} onChange={value => setRuleSuppressSec(Number(value ?? 300))} addonBefore="抑制" addonAfter="s" />
          <Select
            value={ruleDedupeStrategy}
            onChange={value => setRuleDedupeStrategy(value as AlertDedupeStrategy)}
            options={dedupeOptions}
            style={{ width: 170 }}
          />
          <InputNumber min={1} max={100000} value={ruleThreshold} onChange={value => setRuleThreshold(Number(value ?? 3))} addonBefore="阈值" />
          <Select
            value={ruleSeverity}
            onChange={value => setRuleSeverity(value as AlertSeverity)}
            options={severityOptions}
            style={{ width: 120 }}
          />
          <Space>
            <Text>启用</Text>
            <Switch checked={ruleEnabled} onChange={setRuleEnabled} />
          </Space>
          <Button type="primary" loading={creatingRule} onClick={() => void createRule()}>
            新建规则
          </Button>
        </Space>
      </SectionCard>

      <SectionCard title="规则列表" description="支持启停、编辑、删除，并展示抑制窗口与去重策略。">
        <Table<AlertRuleRecord>
          rowKey={record => record._id ?? `${record.name}-${record.metric}`}
          loading={rulesQuery.loading}
          columns={ruleColumns}
          dataSource={ruleRows}
          locale={getTableLocale('暂无告警规则')}
          pagination={false}
        />
      </SectionCard>

      <SectionCard title="告警事件历史" description="按时间窗口查询触发记录并更新处理状态。">
        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic title="抑制命中总数（当前页）" value={eventSuppressionSummary.totalHits} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic title="发生抑制的事件数" value={eventSuppressionSummary.affectedEvents} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic title="单事件平均抑制命中" value={eventSuppressionSummary.avgHitsPerEvent} />
            </Card>
          </Col>
        </Row>

        <Space style={{ marginBottom: 12 }}>
          <Text>状态筛选</Text>
          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value)
              setPage(1)
            }}
            options={[
              { label: '全部', value: 'all' },
              { label: 'open', value: 'open' },
              { label: 'acknowledged', value: 'acknowledged' },
              { label: 'resolved', value: 'resolved' },
            ]}
            style={{ width: 160 }}
          />
        </Space>

        <Table<AlertEventRecord>
          rowKey={record => record._id ?? `${record.ruleName}-${record.triggeredAt}`}
          loading={eventsQuery.loading}
          columns={eventColumns}
          dataSource={eventRows}
          locale={getTableLocale('暂无告警事件')}
          pagination={{
            current: page,
            pageSize,
            total: eventsQuery.data?.total ?? 0,
            showSizeChanger: true,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage)
              setPageSize(nextPageSize)
            },
          }}
        />
      </SectionCard>

      <Modal
        open={Boolean(editingRule)}
        title={editingRule ? `编辑规则：${editingRule.name}` : '编辑规则'}
        okText="保存"
        cancelText="取消"
        confirmLoading={updatingRule}
        destroyOnClose
        onCancel={closeEditRule}
        onOk={() => {
          void saveRuleEdit()
        }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Input
            value={editRuleName}
            placeholder="规则名称"
            onChange={event => setEditRuleName(event.target.value)}
          />
          <Select
            value={editRuleMetric}
            options={metricOptions}
            onChange={value => setEditRuleMetric(value as 'error_frequency' | 'error_spread')}
          />
          <InputNumber
            min={30}
            max={86400}
            value={editRuleWindowSec}
            onChange={value => setEditRuleWindowSec(Number(value ?? 300))}
            addonBefore="窗口"
            addonAfter="s"
            style={{ width: '100%' }}
          />
          <InputNumber
            min={30}
            max={86400}
            value={editRuleSuppressSec}
            onChange={value => setEditRuleSuppressSec(Number(value ?? 300))}
            addonBefore="抑制"
            addonAfter="s"
            style={{ width: '100%' }}
          />
          <Select
            value={editRuleDedupeStrategy}
            options={dedupeOptions}
            onChange={value => setEditRuleDedupeStrategy(value as AlertDedupeStrategy)}
          />
          <InputNumber
            min={1}
            max={100000}
            value={editRuleThreshold}
            onChange={value => setEditRuleThreshold(Number(value ?? 3))}
            addonBefore="阈值"
            style={{ width: '100%' }}
          />
          <Select
            value={editRuleSeverity}
            options={severityOptions}
            onChange={value => setEditRuleSeverity(value as AlertSeverity)}
          />
          <Space>
            <Text>启用</Text>
            <Switch checked={editRuleEnabled} onChange={setEditRuleEnabled} />
          </Space>
        </Space>
      </Modal>
    </Space>
  )
}

function StatsPage() {
  const filters = useProjectScopedFilters()
  const canEditAppId = useUserControlledAppId()
  const timeParams = useMemo(() => buildTimeParams(filters.appId, filters.range), [filters.appId, filters.range])
  const statsKey = useMemo(() => queryKey(timeParams), [timeParams])

  const overview = useMonitorQuery(() => monitorService.getOverviewStats(timeParams), statsKey)
  const trackingStats = useMonitorQuery(() => monitorService.getTrackingStats(timeParams), statsKey)
  const performanceStats = useMonitorQuery(() => monitorService.getPerformanceStats(timeParams), statsKey)
  const errorStats = useMonitorQuery(() => monitorService.getErrorStats(timeParams), statsKey)
  const replayStats = useMonitorQuery(() => monitorService.getReplayStats(timeParams), statsKey)

  const trackingOption = useMemo(() => {
    const stats = [...(trackingStats.data ?? [])].sort((a, b) => b.count - a.count).slice(0, 8)
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 12, right: 12, top: 28, bottom: 8, containLabel: true },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: stats.map(item => item.eventName).reverse() },
      series: [{ type: 'bar', data: stats.map(item => item.count).reverse() }],
    }
  }, [trackingStats.data])

  const performanceOption = useMemo(() => {
    const stats = [...(performanceStats.data ?? [])].sort((a, b) => b.count - a.count).slice(0, 8)
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['平均值', 'P95', '最大值'] },
      grid: { left: 12, right: 12, top: 30, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: stats.map(item => item.metricType) },
      yAxis: { type: 'value' },
      series: [
        { name: '平均值', type: 'bar', data: stats.map(item => item.avgValue) },
        { name: 'P95', type: 'bar', data: stats.map(item => item.p95Value) },
        { name: '最大值', type: 'bar', data: stats.map(item => item.maxValue) },
      ],
    }
  }, [performanceStats.data])

  const errorOption = useMemo(() => {
    const stats = [...(errorStats.data ?? [])].sort((a, b) => b.count - a.count)
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [
        {
          type: 'pie',
          radius: ['35%', '70%'],
          data: stats.map(item => ({ name: item.errorType, value: item.count })),
        },
      ],
    }
  }, [errorStats.data])

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {overview.error || trackingStats.error || performanceStats.error || errorStats.error || replayStats.error
        ? (
            <Alert
              type="warning"
              showIcon
              message="部分请求失败"
              description={overview.error ?? trackingStats.error ?? performanceStats.error ?? errorStats.error ?? replayStats.error}
            />
          )
        : null}

      <FilterBar
        appId={filters.appId}
        appIdDisabled={!canEditAppId}
        onAppIdChange={filters.setAppId}
        range={filters.range}
        onRangeChange={filters.setRange}
        onReset={filters.reset}
        extra={!canEditAppId ? <Tag color="blue">当前由项目绑定 appId</Tag> : undefined}
        onRefresh={() => {
          void Promise.allSettled([overview.refresh(), trackingStats.refresh(), performanceStats.refresh(), errorStats.refresh(), replayStats.refresh()])
        }}
        loading={overview.loading || trackingStats.loading || performanceStats.loading || errorStats.loading || replayStats.loading}
      />

      <MetricGrid
        items={[
          { title: '总量', value: overview.data?.total ?? 0 },
          { title: '埋点', value: overview.data?.tracking ?? 0 },
          { title: '性能', value: overview.data?.performance ?? 0 },
          { title: '错误', value: overview.data?.error ?? 0 },
          { title: '回放', value: overview.data?.replay ?? 0 },
        ]}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <SectionCard title="埋点分析" description="按事件名称聚合后的统计图。">
            <SectionStatus
              loading={trackingStats.loading}
              error={trackingStats.error}
              hasData={(trackingStats.data?.length ?? 0) > 0}
              emptyDescription="当前筛选条件下暂无埋点统计"
            >
              <ReactECharts option={trackingOption} style={{ height: 360 }} />
            </SectionStatus>
          </SectionCard>
        </Col>
        <Col xs={24} lg={8}>
          <SectionCard title="性能分析" description="按指标类型展示 avg / p95 / max。">
            <SectionStatus
              loading={performanceStats.loading}
              error={performanceStats.error}
              hasData={(performanceStats.data?.length ?? 0) > 0}
              emptyDescription="当前筛选条件下暂无性能统计"
            >
              <ReactECharts option={performanceOption} style={{ height: 360 }} />
            </SectionStatus>
          </SectionCard>
        </Col>
        <Col xs={24} lg={8}>
          <SectionCard title="错误分析" description="按错误类型展示分布。">
            <SectionStatus
              loading={errorStats.loading}
              error={errorStats.error}
              hasData={(errorStats.data?.length ?? 0) > 0}
              emptyDescription="当前筛选条件下暂无错误统计"
            >
              <ReactECharts option={errorOption} style={{ height: 360 }} />
            </SectionStatus>
          </SectionCard>
        </Col>
      </Row>

      <SectionCard title="统计明细" description="查看各项统计表格。">
        <Tabs
          items={[
            {
              key: 'tracking',
              label: '埋点',
              children: (
                <Table<TrackingStatsItem>
                  rowKey={record => record.eventName}
                  pagination={false}
                  dataSource={trackingStats.data ?? []}
                  locale={getTableLocale('暂无埋点统计')}
                  columns={[
                    { title: '事件名称', dataIndex: 'eventName' },
                    { title: '数量', dataIndex: 'count' },
                  ]}
                />
              ),
            },
            {
              key: 'performance',
              label: '性能',
              children: (
                <Table<PerformanceStatsItem>
                  rowKey={record => record.metricType}
                  pagination={false}
                  dataSource={performanceStats.data ?? []}
                  locale={getTableLocale('暂无性能统计')}
                  columns={[
                    { title: '指标类型', dataIndex: 'metricType' },
                    { title: '数量', dataIndex: 'count' },
                    { title: '平均值', dataIndex: 'avgValue', render: (value: number) => formatNumber(value) },
                    { title: 'P95', dataIndex: 'p95Value', render: (value: number) => formatNumber(value) },
                    { title: '最大值', dataIndex: 'maxValue', render: (value: number) => formatNumber(value) },
                  ]}
                />
              ),
            },
            {
              key: 'error',
              label: '错误',
              children: (
                <Table<ErrorStatsItem>
                  rowKey={record => record.errorType ?? 'unknown'}
                  pagination={false}
                  dataSource={errorStats.data ?? []}
                  locale={getTableLocale('暂无错误统计')}
                  columns={[
                    { title: '错误类型', dataIndex: 'errorType', render: (value: string | undefined) => value ?? 'unknown' },
                    { title: '数量', dataIndex: 'count' },
                  ]}
                />
              ),
            },
            {
              key: 'replay',
              label: '回放',
              children: (
                <Table<ReplayStatsItem>
                  rowKey={record => record.route}
                  pagination={false}
                  dataSource={replayStats.data ?? []}
                  locale={getTableLocale('暂无回放统计')}
                  columns={[
                    { title: '路由', dataIndex: 'route' },
                    { title: '数量', dataIndex: 'count' },
                  ]}
                />
              ),
            },
          ]}
        />
      </SectionCard>
    </Space>
  )
}

function App() {
  return (
    <FilterProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<ShellLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="tracking" element={<TrackingPage />} />
            <Route path="performance" element={<PerformancePage />} />
            <Route path="error" element={<ErrorPage />} />
            <Route path="replay" element={<ReplayPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="workspace" element={<UserManagementPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </FilterProvider>
  )
}

export default App
