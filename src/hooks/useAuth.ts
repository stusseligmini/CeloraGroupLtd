'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AuthSession, AuthUser, useAuthContext } from '../providers/AuthProvider';

interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
}

interface UseAuthReturn extends AuthState {
  signIn: () => Promise<{ success: boolean; error?: string }>;
  signUp: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  triggerPasswordReset: () => Promise<{ success: boolean; error?: string }>;
  updateUser: (attributes: Record<string, unknown>) => Promise<boolean>;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshSession,
    triggerPasswordReset,
    updateUser,
  } = useAuthContext();

  const wrappedSignIn = useCallback(async () => {
    const result = await signIn();

    if (!result.error) {
      return { success: true };
    }

    return { success: false, error: result.error.message };
  }, [signIn]);

  const wrappedSignUp = useCallback(async () => {
    const result = await signUp();

    if (!result.error) {
      return { success: true };
    }

    return { success: false, error: result.error.message };
  }, [signUp]);

  const wrappedSignOut = useCallback(async () => {
    try {
      await signOut();
      router.push('/');
      router.refresh();
      return true;
    } catch (err) {
      console.error('Sign out failed:', err);
      return false;
    }
  }, [router, signOut]);

  const wrappedRefresh = useCallback(async () => {
    try {
      await refreshSession();
      return true;
    } catch (err) {
      console.error('Session refresh failed:', err);
      return false;
    }
  }, [refreshSession]);

  const wrappedPasswordReset = useCallback(async () => {
    const result = await triggerPasswordReset();
    if (!result.error) {
      return { success: true };
    }
    return { success: false, error: result.error.message };
  }, [triggerPasswordReset]);

  const wrappedUpdateUser = useCallback(async (attributes: Record<string, unknown>) => {
    const result = await updateUser(attributes);
    return !result.error;
  }, [updateUser]);

  const state = useMemo<AuthState>(
    () => ({
      user,
      session,
      isLoading: loading,
      isAuthenticated: Boolean(user),
      error,
    }),
    [error, loading, session, user]
  );

  return {
    ...state,
    signIn: wrappedSignIn,
    signUp: wrappedSignUp,
    signOut: wrappedSignOut,
    refreshSession: wrappedRefresh,
    triggerPasswordReset: wrappedPasswordReset,
    updateUser: wrappedUpdateUser,
  };
}
