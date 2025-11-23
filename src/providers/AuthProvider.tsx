'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { auth } from '@/lib/firebase/client';
import { 
  signInAnonymously, 
  signInWithCustomToken,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { setApiAuthToken } from '@/lib/apiClient';

export type AuthUser = {
  id: string;
  email: string | null;
  isAnonymous: boolean;
  username?: string | null;
  metadata?: Record<string, unknown>;
};

export type AuthSession = {
  accessToken: string;
  expiresAt?: number;
};

export type AuthResult = { error?: Error };

export interface AuthContextValue {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  error: Error | null;
  signIn: () => Promise<AuthResult>;
  signInWithToken: (token: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeFirebaseUser(firebaseUser: FirebaseUser | null): AuthUser | null {
  if (!firebaseUser) return null;

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    isAnonymous: firebaseUser.isAnonymous,
    metadata: {
      createdAt: firebaseUser.metadata.creationTime,
      lastSignIn: firebaseUser.metadata.lastSignInTime,
    },
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const setSessionFromFirebase = useCallback(async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      setSession(null);
      setApiAuthToken(null);
      return;
    }

    try {
      const token = await firebaseUser.getIdToken();
      const tokenResult = await firebaseUser.getIdTokenResult();
      const expiresAt = Math.floor(new Date(tokenResult.expirationTime).getTime() / 1000);
      
      setSession({ accessToken: token, expiresAt });
      setApiAuthToken(token);
    } catch (err) {
      console.error('[Auth] Failed to get Firebase token:', err);
      setSession(null);
      setApiAuthToken(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const normalized = normalizeFirebaseUser(firebaseUser);
        setUser(normalized);
        await setSessionFromFirebase(firebaseUser);
      } else {
        setUser(null);
        setSession(null);
        setApiAuthToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setSessionFromFirebase]);

  const signIn = useCallback(async (): Promise<AuthResult> => {
    setError(null);
    try {
      await signInAnonymously(auth);
      return {};
    } catch (err) {
      const failure = err instanceof Error ? err : new Error('Failed to sign in');
      setError(failure);
      return { error: failure };
    }
  }, []);

  const signInWithToken = useCallback(async (token: string): Promise<AuthResult> => {
    setError(null);
    try {
      await signInWithCustomToken(auth, token);
      return {};
    } catch (err) {
      const failure = err instanceof Error ? err : new Error('Failed to sign in with token');
      setError(failure);
      return { error: failure };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setApiAuthToken(null);
      setUser(null);
      setSession(null);
    } catch (err) {
      console.error('[Auth] Sign-out failed', err);
      throw err instanceof Error ? err : new Error('Failed to sign out');
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (auth.currentUser) {
      await setSessionFromFirebase(auth.currentUser);
    }
  }, [setSessionFromFirebase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      error,
      signIn,
      signInWithToken,
      signOut,
      refreshSession,
    }),
    [user, session, loading, error, signIn, signInWithToken, signOut, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}

