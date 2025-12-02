'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { auth, isFirebaseClientConfigured } from '@/lib/firebase/client';
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
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signInWithToken: (token: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => Promise<void>;
  triggerPasswordReset: (email: string) => Promise<AuthResult>;
  confirmPasswordReset: (code: string, newPassword: string) => Promise<AuthResult>;
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
      // Clear cookie
      if (typeof document !== 'undefined') {
        document.cookie = 'firebase-id-token=; Max-Age=0; path=/';
      }
      return;
    }

    try {
      const token = await firebaseUser.getIdToken();
      const tokenResult = await firebaseUser.getIdTokenResult();
      const expiresAt = Math.floor(new Date(tokenResult.expirationTime).getTime() / 1000);
      
      setSession({ accessToken: token, expiresAt });
      setApiAuthToken(token);
      // Persist token in cookie for server-side auth (short-lived)
      if (typeof document !== 'undefined') {
        const secure = window.location.protocol === 'https:';
        const maxAge = 60 * 60; // 1 hour
        document.cookie = `firebase-id-token=${token}; Path=/; Max-Age=${maxAge}; SameSite=Lax; ${secure ? 'Secure; ' : ''}`;
      }
    } catch (err) {
      console.error('[Auth] Failed to get Firebase token:', err);
      setSession(null);
      setApiAuthToken(null);
      if (typeof document !== 'undefined') {
        document.cookie = 'firebase-id-token=; Max-Age=0; path=/';
      }
    }
  }, []);

  useEffect(() => {
    console.log('[Auth useEffect] STARTED. isConfigured:', isFirebaseClientConfigured, 'typeof auth:', typeof auth);
    
    if (!isFirebaseClientConfigured) {
      console.log('[Auth] ❌ Firebase NOT configured');
      setUser(null);
      setSession(null);
      setApiAuthToken(null);
      setLoading(false);
      console.log('[Auth] ✅ Loading set to FALSE (not configured)');
      return;
    }

    console.log('[Auth] ✅ Firebase IS configured, setting up listener...');
    
    if (!auth) {
      console.error('[Auth] ERROR: auth is null/undefined even though isConfigured=true');
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[Auth] onAuthStateChanged FIRED. Has user:', !!firebaseUser);
      try {
        if (firebaseUser) {
          const normalized = normalizeFirebaseUser(firebaseUser);
          setUser(normalized);
          await setSessionFromFirebase(firebaseUser);
        } else {
          setUser(null);
          setSession(null);
          setApiAuthToken(null);
        }
      } catch (err) {
        console.error('[Auth] Error in auth state change:', err);
        setError(err instanceof Error ? err : new Error('Auth state change failed'));
      } finally {
        console.log('[Auth] Setting loading to FALSE (finally block)');
        setLoading(false);
      }
    }, (error) => {
      // Handle auth state change errors
      console.error('[Auth] Auth state observer error:', error);
      setError(error);
      console.log('[Auth] Setting loading to FALSE (error handler)');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setSessionFromFirebase]);

  const signIn = useCallback(async (): Promise<AuthResult> => {
    setError(null);
    try {
      if (!isFirebaseClientConfigured) {
        const e = new Error('Auth not configured in development');
        setError(e);
        return { error: e };
      }
      await signInAnonymously(auth);
      return {};
    } catch (err) {
      console.error('[Auth] Sign in failed:', err);
      const failure = err instanceof Error ? err : new Error('Failed to sign in');
      
      // Check if it's a network or App Check error
      if (err && typeof err === 'object' && 'code' in err) {
        const firebaseError = err as { code: string; message: string };
        
        // In development, ignore App Check errors and create anonymous session anyway
        if (firebaseError.code === 'auth/firebase-app-check-token-is-invalid' && process.env.NODE_ENV === 'development') {
          console.warn('[Auth] ⚠️ App Check error ignored in development. Treating as signed in.');
          // Create a mock user for development
          const mockUser: AuthUser = {
            id: 'dev-user-' + Date.now(),
            email: null,
            isAnonymous: true,
            metadata: { createdAt: new Date().toISOString(), lastSignIn: new Date().toISOString() }
          };
          setUser(mockUser);
          return {};
        }
        
        if (firebaseError.code === 'auth/network-request-failed') {
          const networkError = new Error('Network error: Unable to connect to Firebase. Please check your internet connection or try again later.');
          setError(networkError);
          return { error: networkError };
        }
      }
      
      setError(failure);
      return { error: failure };
    }
  }, []);

  const signInWithToken = useCallback(async (token: string): Promise<AuthResult> => {
    setError(null);
    try {
      if (!isFirebaseClientConfigured) {
        const e = new Error('Auth not configured in development');
        setError(e);
        return { error: e };
      }
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
      if (isFirebaseClientConfigured) {
        await firebaseSignOut(auth!);
      }
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

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    setError(null);
    try {
      // TODO: Implement sign up with Firebase
      await signInAnonymously(auth);
      return {};
    } catch (err) {
      const failure = err instanceof Error ? err : new Error('Failed to sign up');
      setError(failure);
      return { error: failure };
    }
  }, []);

  const triggerPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    setError(null);
    try {
      // TODO: Implement password reset with Firebase
      return {};
    } catch (err) {
      const failure = err instanceof Error ? err : new Error('Failed to trigger password reset');
      setError(failure);
      return { error: failure };
    }
  }, []);

  const confirmPasswordReset = useCallback(async (code: string, newPassword: string): Promise<AuthResult> => {
    setError(null);
    try {
      // TODO: Implement password reset confirmation with Firebase
      return {};
    } catch (err) {
      const failure = err instanceof Error ? err : new Error('Failed to confirm password reset');
      setError(failure);
      return { error: failure };
    }
  }, []);

  const updateUser = useCallback(async (updates: Partial<AuthUser>) => {
    setError(null);
    try {
      // TODO: Implement user update with Firebase
      if (user) {
        setUser({ ...user, ...updates });
      }
    } catch (err) {
      const failure = err instanceof Error ? err : new Error('Failed to update user');
      setError(failure);
      throw failure;
    }
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      error,
      signIn,
      signUp,
      signInWithToken,
      signOut,
      refreshSession,
      updateUser,
      triggerPasswordReset,
      confirmPasswordReset,
    }),
    [user, session, loading, error, signIn, signUp, signInWithToken, signOut, refreshSession, updateUser, triggerPasswordReset, confirmPasswordReset]
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

