'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar } from './ui/avatar';

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
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = useMemo(() => {
    const name = session?.user?.name?.trim();
    if (name) return name;

    const email = session?.user?.email?.trim();
    if (email) {
      const [local] = email.split('@');
      if (local) return local;
    }

    return '用户';
  }, [session?.user?.email, session?.user?.name]);

  const initial = useMemo(() => {
    const first = displayName.charAt(0);
    return first ? first.toUpperCase() : 'U';
  }, [displayName]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 relative z-50">
      <div className="pl-25">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-linear-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Ez</span>
            </div>
            <span className="font-bold text-xl">EzMonitor</span>
          </Link>

          {/* Navigation Links + User Menu */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {navigation.map(item => {
                if (item.href === '/login' && session?.user) return null;

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

            {session?.user ? (
              <div className="relative" ref={menuRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 px-2 pr-3 gap-2"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen(prev => !prev)}
                >
                  <Avatar
                    src={session.user.image ?? undefined}
                    alt={displayName}
                    fallback={initial}
                    className="size-9"
                  />
                  <div className="flex flex-col items-start leading-tight text-left max-w-[140px]">
                    <span className="text-sm font-medium truncate">
                      {displayName}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {session.user.email ?? '已登录'}
                    </span>
                  </div>
                </Button>

                {menuOpen ? (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-lg border bg-popover shadow-md"
                    role="menu"
                  >
                    <div className="px-3 py-2">
                      <div className="text-sm font-medium truncate">
                        {displayName}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {session.user.email ?? '已登录'}
                      </div>
                    </div>
                    <Separator />
                    <Button
                      variant="ghost"
                      className="w-full justify-start rounded-none px-3 py-2 text-sm"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        signOut({ redirect: false });
                      }}
                    >
                      退出登录
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}
