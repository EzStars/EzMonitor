import { Navigation } from '@/components/navigation';
import { AppProviders } from '@/components/app-providers';
import { AuthGuard } from '@/components/auth-guard';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      <Navigation />
      <AuthGuard>{children}</AuthGuard>
    </AppProviders>
  );
}
