'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const [loading, setLoading] = useState(false);

  const handleGitHub = async () => {
    setLoading(true);
    await signIn('github', { callbackUrl: redirect });
    setLoading(false);
  };

  return (
    <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="flex flex-col justify-center space-y-6 text-white">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          实时监控 · GitHub 登录
        </div>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          连接你的监控数据
        </h1>
        <p className="text-lg text-slate-200/80">
          使用 GitHub 一键登录，进入 EzMonitor 查看实时错误、性能与行为数据。
        </p>
        <div className="flex flex-wrap gap-3 text-sm text-slate-200/70">
          <span className="rounded-full bg-white/10 px-3 py-1">安全 OAuth</span>
          <span className="rounded-full bg-white/10 px-3 py-1">快速接入</span>
          <span className="rounded-full bg-white/10 px-3 py-1">暗色友好</span>
        </div>
      </div>

      <Card className="border-white/10 bg-white/5 text-white shadow-2xl shadow-indigo-500/20">
        <CardHeader>
          <CardTitle>登录 EzMonitor</CardTitle>
          <CardDescription className="text-slate-200/80">
            使用 GitHub 账号登录，登录后将自动跳转到仪表盘。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button
            size="lg"
            className="w-full bg-linear-to-r from-indigo-500 to-emerald-400 text-white shadow-lg shadow-indigo-500/30 hover:opacity-90"
            onClick={handleGitHub}
            disabled={loading}
          >
            {loading ? '正在跳转 GitHub...' : 'Continue with GitHub'}
          </Button>

          <Separator className="bg-white/10" />

          <div className="space-y-2 text-sm text-slate-200/80">
            <p>登录代表你同意我们的隐私与监控数据处理策略。</p>
            <p className="text-xs text-slate-200/60">
              我们仅在授权后读取公开邮箱用于账号识别，不会提交代码权限。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
