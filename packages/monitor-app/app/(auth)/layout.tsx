import type { Metadata } from 'next';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: '登录 - EzMonitor',
  description: '登录 EzMonitor 监控平台',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-900 via-slate-900 to-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.2),transparent_35%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.15),transparent_35%)] pointer-events-none" />
      <main className="relative mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16 lg:px-12">
        {children}
      </main>
    </div>
  );
}
