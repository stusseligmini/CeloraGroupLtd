/**
 * Telegram Mini App - Main Dashboard
 */

'use client';

import { useEffect, useState } from 'react';
import { getTelegramUser, showBackButton, hideBackButton } from '@/lib/telegram/webapp';
import { useWalletSummary } from '@/hooks/useWalletSummary';
import { formatCurrency } from '@/lib/ui/formatters';
import { useRouter } from 'next/navigation';

export default function TelegramDashboard() {
  const router = useRouter();
  const { summary, loading } = useWalletSummary();
  const [telegramUser, setTelegramUser] = useState<any>(null);
  
  useEffect(() => {
    const user = getTelegramUser();
    setTelegramUser(user);
    hideBackButton(); // No back button on main page
  }, []);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white p-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">
          Welcome, {telegramUser?.first_name || 'User'}!
        </h1>
        <p className="text-gray-400">Your Celora Wallet</p>
      </div>
      
      {/* Total Balance Card */}
      <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl p-6 mb-6 shadow-xl">
        <p className="text-cyan-100 text-sm mb-2">Total Balance</p>
        <h2 className="text-4xl font-bold mb-4">
          {formatCurrency(summary?.totalBalance || 0, summary?.currency || 'USD')}
        </h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-cyan-100">{summary?.holdings.length || 0} wallets</span>
          <button 
            onClick={() => router.push('/telegram/wallet')}
            className="bg-white/20 px-4 py-1 rounded-full hover:bg-white/30 transition"
          >
            View Details →
          </button>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button 
          onClick={() => router.push('/telegram/wallet/send')}
          className="bg-slate-800 hover:bg-slate-700 rounded-xl p-6 transition border border-slate-700"
        >
          <div className="text-3xl mb-2">📤</div>
          <div className="font-semibold">Send</div>
          <div className="text-sm text-gray-400">Transfer crypto</div>
        </button>
        
        <button 
          onClick={() => router.push('/telegram/wallet/receive')}
          className="bg-slate-800 hover:bg-slate-700 rounded-xl p-6 transition border border-slate-700"
        >
          <div className="text-3xl mb-2">📥</div>
          <div className="font-semibold">Receive</div>
          <div className="text-sm text-gray-400">Get QR code</div>
        </button>
        
        <button 
          onClick={() => router.push('/telegram/cards')}
          className="bg-slate-800 hover:bg-slate-700 rounded-xl p-6 transition border border-slate-700"
        >
          <div className="text-3xl mb-2">💳</div>
          <div className="font-semibold">Cards</div>
          <div className="text-sm text-gray-400">Virtual cards</div>
        </button>
        
        <button 
          onClick={() => router.push('/telegram/settings')}
          className="bg-slate-800 hover:bg-slate-700 rounded-xl p-6 transition border border-slate-700"
        >
          <div className="text-3xl mb-2">⚙️</div>
          <div className="font-semibold">Settings</div>
          <div className="text-sm text-gray-400">Preferences</div>
        </button>
      </div>
      
      {/* Recent Holdings */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="font-semibold mb-4 flex items-center justify-between">
          <span>Your Wallets</span>
          <span className="text-sm text-gray-400">{summary?.holdings.length || 0}</span>
        </h3>
        
        {summary?.holdings && summary.holdings.length > 0 ? (
          <div className="space-y-3">
            {summary.holdings.slice(0, 3).map((holding) => (
              <div 
                key={holding.id}
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition cursor-pointer"
                onClick={() => router.push('/telegram/wallet')}
              >
                <div>
                  <div className="font-medium">{holding.label}</div>
                  <div className="text-sm text-gray-400">{holding.currency}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(holding.balance, holding.currency)}</div>
                </div>
              </div>
            ))}
            
            {summary.holdings.length > 3 && (
              <button 
                onClick={() => router.push('/telegram/wallet')}
                className="w-full text-center text-sm text-cyan-400 hover:text-cyan-300 py-2"
              >
                View all {summary.holdings.length} wallets →
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No wallets yet</p>
            <p className="text-sm mt-2">Create a wallet in the main Celora app</p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="text-center mt-8 text-sm text-gray-500">
        <p>Celora Telegram Mini App</p>
        <p className="text-xs mt-1">Secure crypto wallet in your pocket</p>
      </div>
    </div>
  );
}

















