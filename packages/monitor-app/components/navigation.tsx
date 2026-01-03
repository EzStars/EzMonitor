'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: '产品介绍', href: '/' },
  { name: '监控数据', href: '/dashboard' },
  { name: 'demo展示', href: '/demo' },
  { name: '登录', href: '/login' },
  {
    name: '文档',
    href: 'https://ezstars.github.io/EzMonitor/',
    external: true,
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 relative z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-linear-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Ez</span>
            </div>
            <span className="font-bold text-xl">EzMonitor</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {navigation.map(item => {
              const isActive = pathname === item.href;

              if (item.external) {
                return (
                  <Button key={item.name} asChild variant="ghost">
                    <Link
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.name}
                    </Link>
                  </Button>
                );
              }

              return (
                <Button
                  key={item.name}
                  asChild
                  variant={isActive ? 'default' : 'ghost'}
                >
                  <Link href={item.href}>{item.name}</Link>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
