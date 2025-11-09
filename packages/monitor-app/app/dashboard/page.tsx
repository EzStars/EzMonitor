import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            监控数据看板
          </h1>
          <p className="text-muted-foreground">
            实时查看应用监控数据和关键指标
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总错误数</CardTitle>
              <svg
                className="h-4 w-4 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-red-500">+12.5%</span> 较上周
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                平均响应时间
              </CardTitle>
              <svg
                className="h-4 w-4 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">234ms</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-500">-5.2%</span> 较上周
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
              <svg
                className="h-4 w-4 text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2,345</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-500">+8.1%</span> 较上周
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">页面浏览量</CardTitle>
              <svg
                className="h-4 w-4 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12.3K</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-500">+18.2%</span> 较上周
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Errors */}
          <Card>
            <CardHeader>
              <CardTitle>最近错误</CardTitle>
              <CardDescription>过去 24 小时内捕获的错误</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    type: 'TypeError',
                    message: 'Cannot read property of undefined',
                    count: 23,
                    time: '2分钟前',
                  },
                  {
                    type: 'ReferenceError',
                    message: 'variable is not defined',
                    count: 15,
                    time: '15分钟前',
                  },
                  {
                    type: 'NetworkError',
                    message: 'Failed to fetch resource',
                    count: 8,
                    time: '1小时前',
                  },
                ].map((error, index) => (
                  <div key={index}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            {error.type}
                          </Badge>
                          <span className="text-sm font-medium">
                            {error.message}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          发生 {error.count} 次 · {error.time}
                        </p>
                      </div>
                    </div>
                    {index < 2 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>性能指标</CardTitle>
              <CardDescription>核心 Web Vitals 数据</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    name: 'FCP',
                    value: '1.2s',
                    status: 'good',
                    description: '首次内容绘制',
                  },
                  {
                    name: 'LCP',
                    value: '2.1s',
                    status: 'good',
                    description: '最大内容绘制',
                  },
                  {
                    name: 'FID',
                    value: '45ms',
                    status: 'good',
                    description: '首次输入延迟',
                  },
                  {
                    name: 'CLS',
                    value: '0.05',
                    status: 'good',
                    description: '累积布局偏移',
                  },
                ].map((metric, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {metric.name}
                          </span>
                          <Badge
                            variant={
                              metric.status === 'good'
                                ? 'default'
                                : 'destructive'
                            }
                            className="text-xs"
                          >
                            {metric.status === 'good' ? '良好' : '需优化'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {metric.description}
                        </p>
                      </div>
                      <span className="text-2xl font-bold">{metric.value}</span>
                    </div>
                    {index < 3 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Behavior */}
        <Card>
          <CardHeader>
            <CardTitle>用户行为统计</CardTitle>
            <CardDescription>页面访问和用户操作数据</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  热门页面
                </div>
                <div className="space-y-2">
                  {[
                    { path: '/', views: 1234 },
                    { path: '/dashboard', views: 856 },
                    { path: '/test', views: 432 },
                  ].map((page, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-mono">{page.path}</span>
                      <Badge variant="secondary">{page.views} 次</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  常用功能
                </div>
                <div className="space-y-2">
                  {[
                    { name: '点击按钮', count: 3421 },
                    { name: '表单提交', count: 1256 },
                    { name: '页面切换', count: 987 },
                  ].map((action, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{action.name}</span>
                      <Badge variant="secondary">{action.count} 次</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  设备分布
                </div>
                <div className="space-y-2">
                  {[
                    { device: 'Desktop', percentage: 62 },
                    { device: 'Mobile', percentage: 28 },
                    { device: 'Tablet', percentage: 10 },
                  ].map((stat, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{stat.device}</span>
                      <Badge variant="secondary">{stat.percentage}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
