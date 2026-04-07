import type { MenuProps, TableColumnsType } from 'antd'

import type { ReactNode } from 'react'
import type {
  ErrorRecord,
  ErrorStatsItem,
  PerformanceRecord,
  PerformanceStatsItem,
  ReplayRecord,
  ReplayStatsItem,
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
  Layout,
  List,
  Menu,
  Row,
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
import { Component, useEffect, useMemo, useState } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useMonitorQuery } from './hooks/useMonitorQuery'
import {

  monitorService,

} from './services/monitor'
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

type RouteKey = '/dashboard' | '/tracking' | '/performance' | '/error' | '/replay' | '/demo' | '/stats'

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
  '/demo': {
    title: '采集演示',
    description: '可开关触发 PV/UV/回放/错误联动上报，验证端到端链路。',
  },
  '/stats': {
    title: '统计分析页面',
    description: '统一时间范围与应用筛选，查看多维统计分析。',
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

type QueryRange = [string, string]

function createDefaultRange(days = 7): QueryRange {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  start.setDate(end.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)
  return [formatDateInput(start), formatDateInput(end)]
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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

function isThirdPartySourcePath(path?: string): boolean {
  if (!path) {
    return false
  }

  return path.includes('/node_modules/') || path.includes('\\node_modules\\') || path.includes('.pnpm/') || path.includes('.pnpm\\')
}

function useCommonFilters() {
  const [appId, setAppId] = useState('')
  const [range, setRange] = useState<QueryRange>(createDefaultRange())

  return {
    appId,
    setAppId,
    range,
    setRange,
    reset: () => {
      setAppId('')
      setRange(createDefaultRange())
    },
  }
}

function ShellLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const selectedKey
    = (Object.keys(routeMeta) as RouteKey[]).find(path => location.pathname.startsWith(path)) ?? '/dashboard'
  const current = routeMeta[selectedKey]

  return (
    <Layout className="app-shell">
      <Sider width={252} breakpoint="lg" collapsedWidth={0} className="app-sider">
        <div className="brand">
          <Title level={4}>EzMonitor</Title>
          <Text type="secondary">监控控制台</Text>
        </div>
        <Menu mode="inline" selectedKeys={[selectedKey]} items={navItems} onClick={({ key }) => navigate(key)} />
      </Sider>

      <Layout className="app-main">
        <Header className="app-header">
          <Space direction="vertical" size={2}>
            <Text type="secondary">当前页面</Text>
            <Title level={3}>{current.title}</Title>
          </Space>
          <Space wrap>
            {(Object.keys(routeMeta) as RouteKey[]).map(path => (
              <Button key={path} type={selectedKey === path ? 'primary' : 'default'} onClick={() => navigate(path)}>
                {routeMeta[path].title}
              </Button>
            ))}
          </Space>
        </Header>

        <Content className="app-content">
          <AppErrorBoundary>
            <Outlet />
          </AppErrorBoundary>
        </Content>
      </Layout>
    </Layout>
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
  onAppIdChange,
  range,
  onRangeChange,
  onReset,
  onRefresh,
  loading,
  extra,
}: {
  appId: string
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
  items: Array<{ title: string, value: string | number | null | undefined, suffix?: ReactNode, tooltip?: string }>
}) {
  return (
    <Row gutter={[16, 16]}>
      {items.map(item => (
        <Col xs={24} sm={12} lg={6} key={item.title}>
          <Card className="metric-card">
            <Statistic title={item.title} value={item.value ?? undefined} suffix={item.suffix} />
            {item.tooltip ? <Text type="secondary">{item.tooltip}</Text> : null}
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
  const filters = useCommonFilters()
  const timeParams = useMemo(() => buildTimeParams(filters.appId, filters.range), [filters.appId, filters.range])
  const listParams = useMemo(
    () => ({ ...timeParams, page: 1, pageSize: 100, sortBy: 'timestamp', sortOrder: 'desc' as const }),
    [timeParams],
  )
  const statsKey = useMemo(() => queryKey(timeParams), [timeParams])
  const listKey = useMemo(() => queryKey(listParams), [listParams])

  const overview = useMonitorQuery(() => monitorService.getOverviewStats(timeParams), statsKey)
  const tracking = useMonitorQuery(() => monitorService.getTracking(listParams), listKey)
  const performance = useMonitorQuery(() => monitorService.getPerformance(listParams), listKey)
  const errors = useMonitorQuery(() => monitorService.getErrors(listParams), listKey)
  const replay = useMonitorQuery(() => monitorService.getReplays(listParams), listKey)

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
      title: '合计',
      value: overview.data?.total ?? 0,
      tooltip: '四类数据总数',
    },
  ]

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {overview.error || tracking.error || performance.error || errors.error || replay.error
        ? (
            <Alert
              type="warning"
              showIcon
              message="部分请求失败"
              description={overview.error ?? tracking.error ?? performance.error ?? errors.error ?? replay.error}
            />
          )
        : null}

      <FilterBar
        appId={filters.appId}
        onAppIdChange={filters.setAppId}
        range={filters.range}
        onRangeChange={filters.setRange}
        onReset={filters.reset}
        onRefresh={() => {
          void Promise.allSettled([overview.refresh(), tracking.refresh(), performance.refresh(), errors.refresh(), replay.refresh()])
        }}
        loading={overview.loading || tracking.loading || performance.loading || errors.loading || replay.loading}
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
  const filters = useCommonFilters()
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
        extra={<Input allowClear placeholder="过滤当前页事件/属性" value={keyword} onChange={e => setKeyword(e.target.value)} className="filter-input" />}
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
  const filters = useCommonFilters()
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
        onAppIdChange={filters.setAppId}
        range={filters.range}
        onRangeChange={filters.setRange}
        onReset={() => {
          filters.reset()
          setPage(1)
          setPageSize(10)
        }}
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
  const filters = useCommonFilters()
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<ErrorRecord | null>(null)
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

  const listQuery = useMonitorQuery(() => monitorService.getErrors(listParams), listKey)
  const statsQuery = useMonitorQuery(() => monitorService.getErrorStats(timeParams), statsKey)
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
        <Button type="link" onClick={() => setSelected(record)}>
          详情
        </Button>
      ),
      width: 100,
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

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {listQuery.error || statsQuery.error
        ? (
            <Alert type="warning" showIcon message="部分请求失败" description={listQuery.error ?? statsQuery.error} />
          )
        : null}

      <FilterBar
        appId={filters.appId}
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
        extra={<Input allowClear placeholder="过滤当前页错误消息/类型" value={keyword} onChange={e => setKeyword(e.target.value)} className="filter-input" />}
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

      <DetailDrawer
        open={selected !== null}
        title={selected?.message ?? '错误详情'}
        subtitle={selected ? formatDateTime(selected.timestamp) : undefined}
        onClose={() => setSelected(null)}
        items={[
          { label: 'appId', value: selected?.appId ?? '-' },
          { label: '错误类型', value: selected?.errorType ?? '-' },
          { label: 'release', value: selected?.release ?? '-' },
          { label: '定位状态', value: selected?.symbolicationStatus ?? 'skipped' },
          { label: '定位原因', value: selected?.symbolicationReason ?? '-' },
          { label: 'URL', value: selected?.url ?? '-' },
          { label: 'User-Agent', value: selected?.userAgent ?? '-' },
          {
            label: '回放 segment',
            value: selectedReplaySegmentId
              ? (
                  <Button type="link" onClick={() => navigate(`/replay?segmentId=${encodeURIComponent(selectedReplaySegmentId)}`)}>
                    {selectedReplaySegmentId}
                  </Button>
                )
              : '-',
          },
        ]}
        sections={[
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
  const filters = useCommonFilters()
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
          <Input
            allowClear
            placeholder="按 segmentId / route / reason 过滤"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            className="filter-input"
          />
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

function DemoPage() {
  const [enablePv, setEnablePv] = useState(true)
  const [enableUv, setEnableUv] = useState(true)
  const [enableReplay, setEnableReplay] = useState(true)
  const [maskSensitive, setMaskSensitive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  const appId = 'monitor-app-demo'

  const submitDemoBatch = async (includeError = false) => {
    setLoading(true)
    setResult('')
    try {
      const now = Date.now()
      const route = `${window.location.pathname}${window.location.search}${window.location.hash}`
      const visitorId = `demo-${Math.random().toString(16).slice(2, 10)}`
      const segmentId = `demo-segment-${now}`

      const items: Array<Record<string, unknown>> = []

      if (enablePv) {
        items.push({
          type: 'tracking',
          appId,
          timestamp: now,
          eventName: 'page_view',
          properties: {
            page: route,
            source: 'demo_page',
          },
          context: {
            page: route,
          },
        })
      }

      if (enableUv) {
        items.push({
          type: 'tracking',
          appId,
          timestamp: now,
          eventName: 'uv_visit',
          properties: {
            visitorId,
            day: new Date(now).toISOString().slice(0, 10),
          },
          context: {
            page: route,
            visitorId,
          },
        })
      }

      if (enableReplay) {
        items.push({
          type: 'replay',
          appId,
          timestamp: now,
          segmentId,
          startedAt: now - 5000,
          endedAt: now,
          eventCount: 3,
          route,
          reason: includeError ? 'error_js' : 'manual_demo',
          sample: [
            { type: 'click', at: now - 3000, data: { target: 'button#demo-send', x: 123, y: 45 } },
            {
              type: 'input',
              at: now - 2000,
              data: {
                target: 'input#demo-sensitive',
                value: maskSensitive ? '[MASKED]' : 'token-demo-123',
                valueLength: 14,
              },
            },
            { type: 'route', at: now - 1000, data: { route } },
          ],
          context: {
            page: route,
            privacy: {
              maskSensitive,
            },
          },
        })
      }

      items.push({
        type: 'performance',
        appId,
        timestamp: now,
        metricType: 'performance_ttfb',
        value: 180,
        url: window.location.href,
        context: {
          from: 'demo_page',
        },
      })

      if (includeError) {
        items.push({
          type: 'error',
          appId,
          timestamp: now,
          errorType: 'error_js',
          message: 'Demo error from monitor-app',
          stack: 'Error: Demo error from monitor-app\n    at DemoPage (App.tsx:1:1)',
          url: window.location.href,
          detail: {
            source: 'demo_page',
            replay: enableReplay
              ? {
                  segmentId,
                  route,
                  eventCount: 3,
                }
              : undefined,
          },
        })
      }

      const response = await monitorService.sendBatch(items)
      setResult(`写入成功：total=${response.summary.total}，tracking=${response.summary.tracking}，performance=${response.summary.performance}，error=${response.summary.error}，replay=${response.summary.replay}`)
    }
    catch (error) {
      setResult(`写入失败：${error instanceof Error ? error.message : String(error)}`)
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <Space direction="vertical" size={16} className="page-stack">
      <SectionCard title="SDK 采集演示开关" description="用于快速验证 PV/UV、录屏回放与错误联动链路。">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space>
            <Text>启用 PV</Text>
            <Switch checked={enablePv} onChange={setEnablePv} />
          </Space>
          <Space>
            <Text>启用 UV</Text>
            <Switch checked={enableUv} onChange={setEnableUv} />
          </Space>
          <Space>
            <Text>启用 Replay 分段</Text>
            <Switch checked={enableReplay} onChange={setEnableReplay} />
          </Space>
          <Space>
            <Text>敏感字段脱敏</Text>
            <Switch checked={maskSensitive} onChange={setMaskSensitive} />
          </Space>
          <Space>
            <Button loading={loading} type="primary" id="demo-send" onClick={() => void submitDemoBatch(false)}>
              发送基础样例
            </Button>
            <Button loading={loading} danger onClick={() => void submitDemoBatch(true)}>
              发送错误 + 回放联动
            </Button>
          </Space>
        </Space>
      </SectionCard>

      <SectionCard title="说明" description="错误样例会把 replay.segmentId 写入 error.detail.replay，随后可在错误页直接跳转到回放页定位。">
        <pre className="detail-pre">
          {safeStringify({
            appId,
            enablePv,
            enableUv,
            enableReplay,
            maskSensitive,
          })}
        </pre>
      </SectionCard>

      {result
        ? (
            <Alert
              type={result.startsWith('写入成功') ? 'success' : 'error'}
              message={result.startsWith('写入成功') ? '上报结果' : '上报失败'}
              description={result}
            />
          )
        : null}
    </Space>
  )
}

function StatsPage() {
  const filters = useCommonFilters()
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
        onAppIdChange={filters.setAppId}
        range={filters.range}
        onRangeChange={filters.setRange}
        onReset={filters.reset}
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
    <Routes>
      <Route path="/" element={<ShellLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="tracking" element={<TrackingPage />} />
        <Route path="performance" element={<PerformancePage />} />
        <Route path="error" element={<ErrorPage />} />
        <Route path="replay" element={<ReplayPage />} />
        <Route path="demo" element={<DemoPage />} />
        <Route path="stats" element={<StatsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
