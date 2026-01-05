import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Navigation } from '@/components/navigation';
import { AppProviders } from '@/components/app-providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'EzMonitor - 前端监控平台',
  description: '全方位的前端监控解决方案，实时捕获错误、性能监控、用户行为追踪',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col bg-background text-foreground antialiased`}
      >
        <AppProviders>
          <Navigation />
          <main className="flex flex-1 min-h-0 flex-col overflow-auto">
            {children}
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
