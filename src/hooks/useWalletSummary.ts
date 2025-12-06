'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/apiClient';
import { WalletSummary } from '@/types/api';
import { useAuthContext } from '@/providers/AuthProvider';

interface WalletSummaryState {
  summary: WalletSummary | null;
  loading: boolean;
  error: string | null;
}

export function useWalletSummary() {
  const { user, session } = useAuthContext();
  const [state, setState] = useState<WalletSummaryState>({
    summary: null,
    loading: false,
    error: null,
  });

  const fetchSummary = useCallback(async () => {
    if (!user || !session?.accessToken) {
      setState((prev) => ({ ...prev, summary: null, error: null, loading: false }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // API returns successResponse(payload), which wraps data under { success: true, data: {...} }
      // successResponse() returns data directly, not wrapped
      const response = await api.get<WalletSummary>('/wallet/summary', {
        headers: user.id ? { 'X-User-Id': user.id } : undefined,
      });

      // successResponse() returns the validated data directly
      if (response && typeof response === 'object') {
        // Normalize to ensure holdings is always an array
        const safeSummary: WalletSummary = {
          totalBalance: response.totalBalance ?? 0,
          currency: response.currency ?? 'USD',
          holdings: Array.isArray((response as any).holdings) ? (response as any).holdings : [],
          lastUpdated: (response as any).lastUpdated ?? new Date().toISOString(),
        };

        setState({ summary: safeSummary, loading: false, error: null });
      } else {
        console.error('Invalid wallet summary response:', response);
        throw new Error('Invalid wallet summary response');
      }
    } catch (error) {
      console.error('Failed to load wallet summary', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load wallet summary',
      }));
    }
  }, [session?.accessToken, user]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary: state.summary,
    loading: state.loading,
    error: state.error,
    refresh: fetchSummary,
  };
}

