'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { WalletOverview } from '@/components/WalletOverview';
import { NotificationPanel } from '@/components/NotificationPanel';
import { useAuth } from '@/hooks/useAuth';

function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="cel-loading">
        <div className="cel-loading__spinner" />
        <p className="cel-loading__label">Loading your account…</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Redirect to signin if not authenticated
    if (!isLoading && !user) {
      router.push('/signin');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <DashboardShell>
        <LoadingState />
      </DashboardShell>
    );
  }

  if (!user) {
    return null; // Redirecting to signin
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Welcome back to Celora</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WalletOverview />
          <NotificationPanel />
        </div>
      </div>
    </DashboardShell>
  );
}

