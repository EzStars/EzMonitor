import { Navigation } from '@/components/navigation';
import { AppProviders } from '@/components/app-providers';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      <Navigation />
      {children}
    </AppProviders>
  );
}
