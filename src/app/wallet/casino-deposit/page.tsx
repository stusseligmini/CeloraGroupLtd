'use client';

import { AppShell } from '@/components/layout/AppShell';
import { CasinoDeposit } from '@/components/solana/CasinoDeposit';

export default function CasinoDepositPage() {
  return (
    <AppShell title="Casino Deposit" subtitle="One-click deposits to verified casinos">
      <div className="container mx-auto py-8 px-4">
        <CasinoDeposit />
      </div>
    </AppShell>
  );
}

