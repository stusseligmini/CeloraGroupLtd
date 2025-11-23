'use client';

import { AppShell } from '@/components/layout/AppShell';
import { SolanaWalletDashboard } from '@/components/solana/SolanaWalletDashboard';
import { useAuthContext } from '@/providers/AuthProvider';

export default function WalletPage() {
  const { user } = useAuthContext();

  return (
    <AppShell title="Wallet" subtitle={user ? "Your Solana wallet dashboard" : "Sign in to view your wallet"}>
      <div className="container mx-auto py-8 px-4">
        <SolanaWalletDashboard />
      </div>
    </AppShell>
  );
}

