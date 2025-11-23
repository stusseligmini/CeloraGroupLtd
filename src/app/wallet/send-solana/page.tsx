'use client';

import { AppShell } from '@/components/layout/AppShell';
import { SendSolana } from '@/components/solana/SendSolana';

export default function SendSolanaPage() {
  return (
    <AppShell title="Send SOL" subtitle="Send SOL with instant confirmation">
      <div className="container mx-auto py-8 px-4">
        <SendSolana />
      </div>
    </AppShell>
  );
}

