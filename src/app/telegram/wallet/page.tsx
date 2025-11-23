/**
 * Telegram Mini App - Wallet Overview
 */

'use client';

import { useEffect } from 'react';
import { showBackButton, hideMainButton, haptic } from '@/lib/telegram/webapp';
import { useRouter } from 'next/navigation';
import { useWalletSummary } from '@/hooks/useWalletSummary';
import { formatCurrency } from '@/lib/ui/formatters';

export default function TelegramWalletPage() {
  const router = useRouter();
  const { summary, loading, refresh } = useWalletSummary();
  
  useEffect(() => {
    showBackButton(() => {
      router.push('/telegram');
    });
    hideMainButton();
  }, [router]);
  
  const handleRefresh = () => {
    haptic('impact', 'light');
    refresh();
  };
  
  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Wallets</h1>
        <button 
          onClick={handleRefresh}
          className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm border border-slate-700"
        >
          🔄 Refresh
        </button>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading wallets...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {summary?.holdings && summary.holdings.length > 0 ? (
            summary.holdings.map((holding) => (
              <div 
                key={holding.id}
                className="bg-slate-800 rounded-xl p-6 border border-slate-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{holding.label}</h3>
                    <p className="text-sm text-gray-400">{holding.currency}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {formatCurrency(holding.balance, holding.currency)}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => {
                      haptic('impact');
                      router.push('/telegram/wallet/send');
                    }}
                    className="bg-cyan-600 hover:bg-cyan-700 py-2 rounded-lg text-sm font-medium transition"
                  >
                    📤 Send
                  </button>
                  <button 
                    onClick={() => {
                      haptic('impact');
                      router.push('/telegram/wallet/receive');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-sm font-medium transition"
                  >
                    📥 Receive
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-slate-800 rounded-xl p-12 text-center border border-slate-700">
              <p className="text-gray-400 mb-4">No wallets found</p>
              <p className="text-sm text-gray-500">Create a wallet in the Celora app</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

















