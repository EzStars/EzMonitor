'use client';

import { SessionProvider } from 'next-auth/react';
import { MonitorProvider } from '@/components/monitor-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MonitorProvider>{children}</MonitorProvider>
    </SessionProvider>
  );
}
