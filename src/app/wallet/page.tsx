'use client';

import { DashboardShell } from '@/components/layout/DashboardShell';
import { SolanaWalletDashboard } from '@/components/solana/SolanaWalletDashboard';
import { useAuthContext } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function WalletPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/splash');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="cel-loading">
            <div className="cel-loading__spinner"></div>
            <span className="cel-loading__label">Loading...</span>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold heading-gradient mb-2">Wallet</h1>
          <p className="text-gray-400">Your Solana wallet dashboard</p>
        </div>
        <SolanaWalletDashboard />
      </div>
    </DashboardShell>
  );
}

