import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuthContext } from '@/providers/AuthProvider';
import { AppShell } from '@/components/layout/AppShell';
import { WalletOverview } from '@/components/WalletOverview';
import { NotificationPanel } from '@/components/NotificationPanel';

function useAppUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://app.celora.azure';
  }
  const runtime = (window as typeof window & { __CELORA_APP_URL__?: string }).__CELORA_APP_URL__;
  return runtime || 'https://app.celora.azure';
}

function ExtensionLoading() {
  return (
    <div className="cel-loading">
      <div className="cel-loading__spinner" />
      <p className="cel-loading__label">Syncing…</p>
    </div>
  );
}

function ExtensionContent() {
  const { user, loading } = useAuthContext();
  const appUrl = useAppUrl();

  const openApp = () => {
    window.open(appUrl, '_blank', 'noopener,noreferrer');
  };

  const subtitle = user ? 'Quick glance at your wallet' : 'Sign in with your Celora account';

  return (
    <AppShell
      variant="extension"
      title="Celora"
      subtitle={subtitle}
      actions={
        <button type="button" className="cel-button cel-button--ghost" onClick={openApp}>
          Open app
        </button>
      }
    >
      {loading ? (
        <ExtensionLoading />
      ) : (
        <div className="cel-grid">
          <WalletOverview />
          <NotificationPanel limit={3} showFooter={false} />
        </div>
      )}
    </AppShell>
  );
}

function ExtensionApp() {
  return (
    <AuthProvider>
      <ExtensionContent />
    </AuthProvider>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<ExtensionApp />);
}

