'use client';

import { AppShell } from '@/components/layout/AppShell';
import { TransactionHistory } from '@/components/solana/TransactionHistory';

export default function TransactionHistoryPage() {
  return (
    <AppShell title="Transaction History" subtitle="View your Solana transaction history">
      <div className="container mx-auto py-8 px-4">
        <TransactionHistory />
      </div>
    </AppShell>
  );
}

