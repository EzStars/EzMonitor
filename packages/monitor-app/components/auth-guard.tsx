'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const showToast = status === 'unauthenticated';

  useEffect(() => {
    if (!showToast) return;

    const redirect = pathname || '/dashboard';
    const timer = setTimeout(() => {
      router.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
    }, 2000);

    return () => clearTimeout(timer);
  }, [showToast, pathname, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        准备登录状态...
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="relative min-h-[40vh] bg-background">
        {showToast && (
          <div className="fixed inset-x-0 top-6 z-50 flex justify-center px-4">
            <div className="rounded-full bg-slate-900 text-white px-4 py-2 shadow-lg">
              需要登录后访问，正在跳转...
            </div>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
