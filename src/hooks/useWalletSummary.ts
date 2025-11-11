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
      const response = await api.get<{ success: boolean; summary: WalletSummary }>('/wallet/summary', {
        headers: user.id ? { 'X-User-Id': user.id } : undefined,
      });

      if (response?.summary) {
        setState({ summary: response.summary, loading: false, error: null });
      } else {
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

