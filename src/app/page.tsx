'use client';

import { AppShell } from '@/components/layout/AppShell';
import { WalletOverview } from '@/components/WalletOverview';
import { NotificationPanel } from '@/components/NotificationPanel';
import { useAuthContext } from '@/providers/AuthProvider';

function LoadingState() {
  return (
    <div className="cel-loading">
      <div className="cel-loading__spinner" />
      <p className="cel-loading__label">Loading your account…</p>
    </div>
  );
}

export default function HomePage() {
  const { user, loading } = useAuthContext();
  const subtitle = user ? 'Wallet & Security Hub' : 'Sign in with your Celora account';

  return (
    <AppShell title="Celora" subtitle={subtitle} variant="pwa">
      {loading ? (
        <LoadingState />
      ) : (
        <div className="cel-grid">
          <WalletOverview />
          <NotificationPanel />
        </div>
      )}
    </AppShell>
  );
}

