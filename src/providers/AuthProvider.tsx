'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccountInfo,
  AuthenticationResult,
  EventMessage,
  EventType,
} from '@azure/msal-browser';

import {
  getMsalInstance,
  addMsalEventCallback,
  removeMsalEventCallback,
  initializeMsal,
  refreshToken,
  scheduleTokenRefresh,
  cancelTokenRefresh,
  isTokenValid,
  acquireTokenSilentWithRetry,
  setActiveAccount as setMsalActiveAccount,
} from '@/lib/msalClient';
import { b2cPolicies, loginRequest, passwordResetRequest, tokenRequest } from '@/config/azureB2C';
import { setApiAuthToken } from '@/lib/apiClient';
import { trackAuthSuccess, trackAuthFailure, trackEvent, TelemetryEvents, setAuthenticatedUser, clearAuthenticatedUser } from '@/lib/telemetry/appInsights';

export type AuthUser = {
  id: string;
  email: string;
  roles: string[];
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
  signUp: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  triggerPasswordReset: () => Promise<AuthResult>;
  updateUser: (attributes: Record<string, unknown>) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeUserFromClaims(claims: Record<string, any> | undefined): AuthUser | null {
  if (!claims) return null;

  const emails = Array.isArray(claims.emails) ? claims.emails : [];
  const roles = Array.isArray(claims.roles)
    ? claims.roles
    : Array.isArray(claims['extension_Roles'])
    ? claims['extension_Roles']
    : [];

  return {
    id: (claims.oid as string) || (claims.sub as string) || '',
    email: (claims.preferred_username as string) || emails[0] || '',
    roles: roles as string[],
    metadata: claims,
  };
}

async function syncSessionCookie(result: AuthenticationResult | null) {
  if (typeof window === 'undefined' || window.location.protocol === 'chrome-extension:') {
    return;
  }

  if (!result?.accessToken) {
    await fetch('/api/auth/b2c/session', {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => undefined);
    return;
  }

  const payload = {
    accessToken: result.accessToken,
    idToken: result.idToken,
    expiresAt: result.expiresOn ? result.expiresOn.toISOString() : null,
  };

  await fetch('/api/auth/b2c/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  }).catch((error) => {
    console.warn('Failed to persist B2C session cookie:', error);
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const msalInitializedRef = useRef(false);
  const lastSyncedToken = useRef<string | null>(null);
  const isExtensionRuntime = typeof window !== 'undefined' && window.location.protocol === 'chrome-extension:';

  const setSessionFromResult = useCallback(
    async (result: AuthenticationResult | null) => {
      if (!result) {
        setSession(null);
        setApiAuthToken(null);
        if (lastSyncedToken.current !== null) {
          await syncSessionCookie(null);
          lastSyncedToken.current = null;
        }
        return;
      }

      const expiresAt = result.expiresOn ? Math.floor(result.expiresOn.getTime() / 1000) : undefined;
      setSession({ accessToken: result.accessToken, expiresAt });
      setApiAuthToken(result.accessToken);

      if (lastSyncedToken.current !== result.accessToken) {
        await syncSessionCookie(result);
        lastSyncedToken.current = result.accessToken;
      }
    },
    []
  );

  const hydrateFromAccount = useCallback(
    async (account: AccountInfo | null, tokenResult?: AuthenticationResult | null) => {
      if (!account) {
        setUser(null);
        await setSessionFromResult(null);
        return;
      }

      const normalized = normalizeUserFromClaims(account.idTokenClaims as Record<string, any> | undefined);
      setUser(normalized);

      if (tokenResult) {
        await setSessionFromResult(tokenResult);
      }
    },
    [setSessionFromResult]
  );

  const acquireToken = useCallback(
    async (account: AccountInfo | null) => {
      const msal = getMsalInstance();
      const activeAccount = account ?? msal.getActiveAccount();
      if (!activeAccount) {
        await setSessionFromResult(null);
        return;
      }

      try {
        // Use retry logic with automatic token validation
        const result = await acquireTokenSilentWithRetry({
          ...tokenRequest,
          account: activeAccount,
        });
        
        await hydrateFromAccount(activeAccount, result);
        
        // Track token refresh
        trackEvent({
          name: TelemetryEvents.AUTH_TOKEN_REFRESH,
          properties: {
            userId: activeAccount.localAccountId || activeAccount.homeAccountId,
            timestamp: new Date().toISOString(),
          },
        });
        
        // Schedule automatic refresh before token expires
        scheduleTokenRefresh(result.expiresOn, async (refreshedResult) => {
          await setSessionFromResult(refreshedResult);
        });
        
        setError(null);
      } catch (tokenError: any) {
        console.warn('[Auth] Token acquisition failed, clearing session.', tokenError);
        setError(tokenError instanceof Error ? tokenError : new Error('Failed to refresh session'));
        await setSessionFromResult(null);
        cancelTokenRefresh();
      }
    },
    [hydrateFromAccount, setSessionFromResult]
  );

  useEffect(() => {
    if (msalInitializedRef.current) {
      return;
    }
    msalInitializedRef.current = true;

    let isMounted = true;
    const msal = getMsalInstance();

    // Initialize MSAL and handle redirect
    initializeMsal()
      .then(async (result: AuthenticationResult | null) => {
        if (!isMounted) return;
        
        if (result?.account) {
          setMsalActiveAccount(result.account);
          await hydrateFromAccount(result.account, result);
          
          // Schedule automatic token refresh
          if (result.expiresOn) {
            scheduleTokenRefresh(result.expiresOn, async (refreshedResult) => {
              await setSessionFromResult(refreshedResult);
            });
          }
        } else {
          const active = msal.getActiveAccount() || msal.getAllAccounts()[0] || null;
          if (active) {
            setMsalActiveAccount(active);
            await hydrateFromAccount(active);
            await acquireToken(active);
          } else {
            await setSessionFromResult(null);
          }
        }
        setLoading(false);
      })
      .catch((redirectError: Error) => {
        console.error('[Auth] MSAL redirect error:', redirectError);
        setError(redirectError instanceof Error ? redirectError : new Error('Authentication failed'));
        setLoading(false);
      });

    const callbackId = addMsalEventCallback(async (event: EventMessage) => {
      if (!isMounted) return;

      if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
        const payload = event.payload as AuthenticationResult;
        msal.setActiveAccount(payload.account);
        await hydrateFromAccount(payload.account, payload);
        
        // Track successful authentication
        if (payload.account) {
          trackAuthSuccess(payload.account.localAccountId || payload.account.homeAccountId, 'azure-b2c');
          setAuthenticatedUser(payload.account.localAccountId || payload.account.homeAccountId);
        }
        
        setError(null);
        setLoading(false);
      }

      if (event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS && event.payload) {
        const payload = event.payload as AuthenticationResult;
        await setSessionFromResult(payload);
      }

      if (event.eventType === EventType.LOGIN_FAILURE && event.error) {
        const message = event.error.message || '';
        if (passwordResetRequest && message.includes('AADB2C90118')) {
          msal.loginRedirect(passwordResetRequest).catch((err: Error) => {
            console.error('[Auth] Password reset redirect failed', err);
          });
          return;
        }
        
        // Track authentication failure
        trackAuthFailure(message, 'azure-b2c');
        
        setError(event.error);
        setLoading(false);
      }

      if (event.eventType === EventType.LOGOUT_SUCCESS) {
        // Track logout
        trackEvent({
          name: TelemetryEvents.AUTH_LOGOUT,
          properties: {
            timestamp: new Date().toISOString(),
          },
        });
        clearAuthenticatedUser();
        
        await setSessionFromResult(null);
        setUser(null);
        setError(null);
      }
    });

    return () => {
      isMounted = false;
      removeMsalEventCallback(callbackId);
      cancelTokenRefresh();
    };
  }, [acquireToken, hydrateFromAccount, setSessionFromResult]);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      if (isExtensionRuntime) {
        const result = await getMsalInstance().loginPopup(loginRequest);
        if (result?.account) {
          await hydrateFromAccount(result.account, result);
        }
        return {};
      }

      await getMsalInstance().loginRedirect(loginRequest);
      return {};
    } catch (err) {
      const failure = err instanceof Error ? err : new Error('Failed to initiate sign-in');
      setError(failure);
      return { error: failure };
    }
  }, [hydrateFromAccount, isExtensionRuntime]);

  const signUp = useCallback(async () => {
    return signIn();
  }, [signIn]);

  const signOut = useCallback(async () => {
    try {
      // Cancel any scheduled token refreshes
      cancelTokenRefresh();
      
      await syncSessionCookie(null);
      
      if (isExtensionRuntime) {
        await getMsalInstance().logoutPopup({
          authority: b2cPolicies.authorities.signUpSignIn.authority,
        });
      } else {
        await getMsalInstance().logoutRedirect({
          authority: b2cPolicies.authorities.signUpSignIn.authority,
        });
      }
      
      setApiAuthToken(null);
      setUser(null);
      setSession(null);
    } catch (err) {
      console.error('[Auth] Sign-out failed', err);
      throw (err instanceof Error ? err : new Error('Failed to sign out'));
    }
  }, [isExtensionRuntime]);

  const refreshSession = useCallback(async () => {
    await acquireToken(null);
  }, [acquireToken]);

  const triggerPasswordReset = useCallback(async () => {
    if (!passwordResetRequest) {
      const failure = new Error('Password reset policy not configured');
      setError(failure);
      return { error: failure };
    }

    try {
      if (isExtensionRuntime) {
        const resetUrl =
          process.env.NEXT_PUBLIC_AZURE_B2C_REDIRECT_URI ||
          process.env.NEXT_PUBLIC_APP_URL ||
          'https://login.microsoftonline.com/';
        window.open(resetUrl, '_blank', 'noopener,noreferrer');
        return {};
      }

      await getMsalInstance().loginRedirect(passwordResetRequest);
      return {};
    } catch (err) {
      const failure = err instanceof Error ? err : new Error('Failed to initiate password reset');
      setError(failure);
      return { error: failure };
    }
  }, [isExtensionRuntime]);

  const updateUser = useCallback(async (attributes: Record<string, unknown>) => {
    try {
      if (user) {
        setUser({ ...user, metadata: { ...(user.metadata ?? {}), ...attributes } });
      }
      return {};
    } catch (err) {
      const failure = err instanceof Error ? err : new Error('Failed to update user');
      setError(failure);
      return { error: failure };
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
      signOut,
      refreshSession,
      triggerPasswordReset,
      updateUser,
    }),
    [user, session, loading, error, signIn, signUp, signOut, refreshSession, triggerPasswordReset, updateUser]
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

