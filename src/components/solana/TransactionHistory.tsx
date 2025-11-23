'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuthContext } from '@/providers/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';

interface Transaction {
  signature: string;
  timestamp: number;
  type: 'deposit' | 'withdrawal' | 'win' | 'loss' | 'transfer' | 'unknown';
  label: string;
  amount: number;
  counterparty?: string | null;
  isCasinoTx: boolean;
  fee: number;
  source?: string;
  nativeTransfers?: Array<{
    from: string;
    to: string;
    amount: number;
  }>;
  tokenTransfers?: Array<{
    from: string;
    to: string;
    amount: number;
    mint: string;
    symbol?: string;
  }>;
}

type FilterType = 'all' | 'deposits' | 'withdrawals' | 'wins' | 'casino';

export function TransactionHistory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [beforeSignature, setBeforeSignature] = useState<string | undefined>(undefined);

  // Get wallet address from URL or fetch from API
  useEffect(() => {
    const address = searchParams.get('address');
    if (address) {
      setWalletAddress(address);
    } else {
      // Fetch user's Solana wallet address
      fetchWalletAddress();
    }
  }, [searchParams]);

  // Fetch wallet address
  const fetchWalletAddress = useCallback(async () => {
    if (!user) {
      setError('Please sign in to view transaction history');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/wallet/list?blockchain=solana&limit=1', {
        headers: {
          'X-User-Id': user.id,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch wallet');
      }

      const data = await response.json();
      const wallets = data.data?.wallets || data.wallets || [];
      const solanaWallet = wallets.find((w: any) => w.isDefault && w.blockchain === 'solana') ||
                          wallets.find((w: any) => w.blockchain === 'solana');

      if (!solanaWallet) {
        setError('No Solana wallet found. Please create one first.');
        setLoading(false);
        return;
      }

      setWalletAddress(solanaWallet.address);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch wallet');
      setLoading(false);
    }
  }, [user]);

  // Fetch transactions
  const fetchTransactions = useCallback(async (before?: string, append: boolean = false) => {
    if (!walletAddress) return;

    try {
      setLoadingMore(true);
      const beforeParam = before ? `&before=${before}` : '';
      const response = await fetch(`/api/solana/history?address=${walletAddress}&limit=50${beforeParam}`);

      if (!response.ok) {
        throw new Error('Failed to fetch transaction history');
      }

      const data = await response.json();
      const txs = data.data?.transactions || [];

      if (append) {
        setTransactions(prev => [...prev, ...txs]);
      } else {
        setTransactions(txs);
      }

      // Check if there are more transactions
      setHasMore(txs.length === 50);
      if (txs.length > 0) {
        setBeforeSignature(txs[txs.length - 1].signature);
      }

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transaction history');
      console.error('Error fetching transactions', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [walletAddress]);

  // Initial fetch
  useEffect(() => {
    if (walletAddress) {
      setLoading(true);
      fetchTransactions();
    }
  }, [walletAddress, fetchTransactions]);

  // Filter transactions
  useEffect(() => {
    let filtered = [...transactions];

    switch (filter) {
      case 'deposits':
        filtered = transactions.filter(tx => 
          tx.type === 'deposit' || (tx.type === 'withdrawal' && tx.isCasinoTx)
        );
        break;
      case 'withdrawals':
        filtered = transactions.filter(tx => 
          tx.type === 'withdrawal' && !tx.isCasinoTx
        );
        break;
      case 'wins':
        filtered = transactions.filter(tx => tx.type === 'win');
        break;
      case 'casino':
        filtered = transactions.filter(tx => tx.isCasinoTx);
        break;
      case 'all':
      default:
        filtered = transactions;
        break;
    }

    setFilteredTransactions(filtered);
  }, [transactions, filter]);

  // Format balance
  const formatBalance = (amount: number) => {
    if (amount === 0) return '0.00';
    if (amount < 0.01) return amount.toFixed(6);
    if (amount < 1) return amount.toFixed(4);
    return amount.toFixed(2);
  };

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Format full date/time
  const formatFullDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get transaction icon
  const getTransactionIcon = (tx: Transaction) => {
    if (tx.type === 'win') return '🎉';
    if (tx.type === 'deposit' && tx.isCasinoTx) return '🎰';
    if (tx.type === 'withdrawal' && tx.isCasinoTx) return '💸';
    if (tx.type === 'deposit' || tx.type === 'transfer') return '↑';
    return '↓';
  };

  // Get transaction color
  const getTransactionColor = (tx: Transaction) => {
    if (tx.type === 'win') return 'text-green-600';
    if (tx.type === 'deposit' || tx.type === 'transfer') return 'text-blue-600';
    if (tx.type === 'loss') return 'text-red-600';
    return 'text-gray-600';
  };

  // Get transaction bg color
  const getTransactionBgColor = (tx: Transaction) => {
    if (tx.type === 'win') return 'bg-green-100';
    if (tx.type === 'deposit' && tx.isCasinoTx) return 'bg-purple-100';
    if (tx.type === 'deposit' || tx.type === 'transfer') return 'bg-blue-100';
    if (tx.type === 'loss') return 'bg-red-100';
    return 'bg-gray-100';
  };

  // Load more transactions
  const handleLoadMore = () => {
    if (hasMore && beforeSignature && !loadingMore) {
      fetchTransactions(beforeSignature, true);
    }
  };

  // Open transaction in Solscan
  const openInSolscan = (signature: string) => {
    window.open(`https://solscan.io/tx/${signature}`, '_blank');
  };

  // Copy address to clipboard
  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    // Could show toast notification here
  };

  if (loading) {
    return (
      <Card className="max-w-6xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading transaction history...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-6xl mx-auto">
        <CardContent className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            {error.includes('No Solana wallet') && (
              <Button
                onClick={() => router.push('/wallet/create-solana')}
                className="mt-4"
              >
                Create Solana Wallet
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!walletAddress) {
    return (
      <Card className="max-w-6xl mx-auto">
        <CardContent className="p-8 text-center">
          <p className="text-gray-600 mb-4">No wallet address found.</p>
          <Button onClick={() => router.push('/wallet')}>
            Go to Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filter Tabs */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="deposits">Deposits</TabsTrigger>
              <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
              <TabsTrigger value="wins">Wins</TabsTrigger>
              <TabsTrigger value="casino">Casino</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardContent className="p-0">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-2">No transactions found</p>
              <p className="text-gray-400 text-sm">
                {filter === 'all' 
                  ? 'Start using your wallet to see transactions here'
                  : `No ${filter} transactions found`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.signature}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setExpandedTx(expandedTx === tx.signature ? null : tx.signature)}
                >
                  <div className="flex items-center justify-between">
                    {/* Left: Icon and Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${getTransactionBgColor(tx)}`}>
                        {getTransactionIcon(tx)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{tx.label}</p>
                          {tx.isCasinoTx && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                              🎰 Casino
                            </span>
                          )}
                          {tx.type === 'win' && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              Win
                            </span>
                          )}
                          {tx.type === 'loss' && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                              Loss
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-gray-500">{formatDate(tx.timestamp)}</p>
                          {tx.source && (
                            <>
                              <span className="text-gray-300">•</span>
                              <p className="text-sm text-gray-500">{tx.source}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount and Action */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`font-bold text-lg ${getTransactionColor(tx)}`}>
                          {tx.type === 'deposit' || tx.type === 'win' || tx.type === 'transfer' ? '+' : '-'}
                          {formatBalance(Math.abs(tx.amount))} SOL
                        </p>
                        <p className="text-xs text-gray-500">Fee: {formatBalance(tx.fee)} SOL</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openInSolscan(tx.signature);
                        }}
                      >
                        View
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedTx === tx.signature && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Date & Time</p>
                          <p className="font-medium">{formatFullDate(tx.timestamp)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Transaction Fee</p>
                          <p className="font-medium">{formatBalance(tx.fee)} SOL</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Signature</p>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-xs break-all">{tx.signature.slice(0, 20)}...</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyAddress(tx.signature);
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                        {tx.counterparty && (
                          <div>
                            <p className="text-gray-500">Counterparty</p>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-xs break-all">
                                {tx.counterparty.slice(0, 8)}...{tx.counterparty.slice(-8)}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyAddress(tx.counterparty!);
                                }}
                              >
                                Copy
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {tx.nativeTransfers && tx.nativeTransfers.length > 0 && (
                        <div>
                          <p className="text-gray-500 text-sm mb-2">Native Transfers</p>
                          <div className="space-y-2">
                            {tx.nativeTransfers.map((transfer, idx) => (
                              <div key={idx} className="bg-gray-50 p-2 rounded text-xs">
                                <p className="font-mono">{formatBalance(transfer.amount)} SOL</p>
                                <p className="text-gray-500">
                                  {transfer.from.slice(0, 8)}... → {transfer.to.slice(0, 8)}...
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {tx.tokenTransfers && tx.tokenTransfers.length > 0 && (
                        <div>
                          <p className="text-gray-500 text-sm mb-2">Token Transfers</p>
                          <div className="space-y-2">
                            {tx.tokenTransfers.map((transfer, idx) => (
                              <div key={idx} className="bg-gray-50 p-2 rounded text-xs">
                                <p className="font-medium">
                                  {transfer.symbol || 'Unknown'}: {transfer.amount}
                                </p>
                                <p className="text-gray-500 font-mono text-xs">
                                  {transfer.mint.slice(0, 8)}...
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openInSolscan(tx.signature);
                          }}
                        >
                          View on Solscan
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyAddress(tx.signature);
                          }}
                        >
                          Copy Signature
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && filteredTransactions.length > 0 && (
            <div className="p-4 border-t border-gray-200 text-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

