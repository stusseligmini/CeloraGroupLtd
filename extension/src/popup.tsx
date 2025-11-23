import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuthContext } from '@/providers/AuthProvider';
import { AppShell } from '@/components/layout/AppShell';
import { WalletOverview } from '@/components/WalletOverview';
import { NotificationPanel } from '@/components/NotificationPanel';
import { CardManagement } from '@/components/CardManagement';

function useAppUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://celora.vercel.app';
  }
  const runtime = (window as typeof window & { __CELORA_APP_URL__?: string }).__CELORA_APP_URL__;
  return runtime || 'https://celora.vercel.app';
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
  const [activeTab, setActiveTab] = useState<'wallet' | 'cards' | 'notifications'>('wallet');

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
        <>
          {/* Tab Navigation */}
          {user && (
            <div className="flex gap-2 mb-4 border-b border-gray-200 pb-2">
              <button
                onClick={() => setActiveTab('wallet')}
                className={`px-3 py-1 text-sm rounded ${activeTab === 'wallet' ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                💰 Wallet
              </button>
              <button
                onClick={() => setActiveTab('cards')}
                className={`px-3 py-1 text-sm rounded ${activeTab === 'cards' ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                💳 Cards
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`px-3 py-1 text-sm rounded ${activeTab === 'notifications' ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                🔔 Alerts
              </button>
            </div>
          )}
          
          {/* Tab Content */}
          <div className="cel-grid">
            {activeTab === 'wallet' && <WalletOverview />}
            {activeTab === 'cards' && user && <CardManagement />}
            {activeTab === 'notifications' && <NotificationPanel limit={5} showFooter={false} />}
          </div>
        </>
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

