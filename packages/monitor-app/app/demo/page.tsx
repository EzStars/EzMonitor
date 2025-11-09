'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function TestPage() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 50));
  };

  // 错误测试函数
  const triggerJSError = () => {
    addLog('触发 JS 错误');
    throw new Error('这是一个测试 JS 错误');
  };

  const triggerPromiseError = () => {
    addLog('触发 Promise 错误');
    Promise.reject(new Error('这是一个测试 Promise 错误'));
  };

  const triggerResourceError = () => {
    addLog('触发资源加载错误');
    const img = document.createElement('img');
    img.src = 'https://non-existent-url.example.com/image.jpg';
    document.body.appendChild(img);
  };

  // 性能测试函数
  const triggerSlowOperation = () => {
    addLog('触发慢操作（模拟性能问题）');
    const start = Date.now();
    // 模拟耗时操作
    let sum = 0;
    for (let i = 0; i < 100000000; i++) {
      sum += i;
    }
    const duration = Date.now() - start;
    addLog(`慢操作完成，耗时: ${duration}ms`);
  };

  // 用户行为测试
  const trackCustomEvent = () => {
    addLog('发送自定义埋点事件');
    // TODO: 集成 SDK 后调用 trackEvent
    console.log('Custom Event: button_click', { timestamp: Date.now() });
  };

  const trackPageView = () => {
    addLog('发送页面浏览事件');
    // TODO: 集成 SDK 后调用 trackPage
    console.log('Page View: /test', { timestamp: Date.now() });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">SDK 测试页面</h1>
            <Badge variant="secondary">开发环境</Badge>
          </div>
          <p className="text-muted-foreground">
            在这里测试 EzMonitor SDK 的各项功能
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Test Controls */}
          <div className="space-y-6">
            {/* Error Tests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-red-500"
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
                  错误监控测试
                </CardTitle>
                <CardDescription>
                  触发各种类型的错误来测试监控能力
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={triggerJSError}
                  variant="destructive"
                  className="w-full"
                >
                  触发 JS 错误
                </Button>
                <Button
                  onClick={triggerPromiseError}
                  variant="destructive"
                  className="w-full"
                >
                  触发 Promise 错误
                </Button>
                <Button
                  onClick={triggerResourceError}
                  variant="destructive"
                  className="w-full"
                >
                  触发资源加载错误
                </Button>
              </CardContent>
            </Card>

            {/* Performance Tests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-blue-500"
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
                  性能监控测试
                </CardTitle>
                <CardDescription>模拟性能问题来测试性能监控</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={triggerSlowOperation}
                  variant="outline"
                  className="w-full"
                >
                  触发慢操作（阻塞主线程）
                </Button>
                <Button
                  onClick={() => {
                    addLog('模拟大量 DOM 操作');
                    for (let i = 0; i < 1000; i++) {
                      const div = document.createElement('div');
                      div.textContent = `Element ${i}`;
                      document.body.appendChild(div);
                      document.body.removeChild(div);
                    }
                    addLog('DOM 操作完成');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  大量 DOM 操作
                </Button>
              </CardContent>
            </Card>

            {/* User Behavior Tests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-purple-500"
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
                  用户行为追踪测试
                </CardTitle>
                <CardDescription>测试自定义埋点和行为追踪</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={trackCustomEvent} className="w-full">
                  发送自定义事件
                </Button>
                <Button
                  onClick={trackPageView}
                  variant="outline"
                  className="w-full"
                >
                  发送页面浏览事件
                </Button>
                <Button
                  onClick={() => {
                    addLog('模拟表单提交');
                    console.log('Form Submit Event', {
                      formId: 'test-form',
                      timestamp: Date.now(),
                    });
                  }}
                  variant="outline"
                  className="w-full"
                >
                  模拟表单提交
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Event Log */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>事件日志</CardTitle>
                    <CardDescription>实时显示 SDK 捕获的事件</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLogs([])}
                  >
                    清空日志
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-950 dark:bg-slate-900 rounded-lg p-4 h-[600px] overflow-y-auto font-mono text-sm">
                  {logs.length === 0 ? (
                    <div className="text-slate-500 text-center py-8">
                      暂无日志，开始测试以查看事件...
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {logs.map((log, index) => (
                        <div
                          key={index}
                          className="text-green-400 hover:bg-slate-800 px-2 py-1 rounded"
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SDK Integration Guide */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>SDK 集成指南</CardTitle>
            <CardDescription>如何在此页面集成 EzMonitor SDK</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. 安装 SDK</h4>
                <div className="bg-slate-950 dark:bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-400">
                  pnpm add @ezstars/monitor-sdkv2
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">2. 初始化 SDK</h4>
                <div className="bg-slate-950 dark:bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-400">
                  <pre>{`import { createSDK } from '@ezstars/monitor-sdkv2';

const sdk = createSDK({
  appId: 'monitor-app-test',
  reportUrl: 'http://localhost:8080/report',
  debug: true,
});

await sdk.init();
await sdk.start();`}</pre>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">3. 使用插件</h4>
                <div className="bg-slate-950 dark:bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-400">
                  <pre>{`import { ErrorPlugin, PerformancePlugin, TrackingPlugin } from '@ezstars/monitor-sdkv2';

sdk.use(new ErrorPlugin());
sdk.use(new PerformancePlugin());
sdk.use(new TrackingPlugin());`}</pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
