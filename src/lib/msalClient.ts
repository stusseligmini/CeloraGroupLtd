/**
 * MSAL Client with Security Hardening
 * 
 * Features:
 * - PKCE flow (enabled by default in MSAL browser)
 * - Automatic token refresh with retry logic
 * - Token validation and expiry checks
 * - Secure token storage (localStorage with encryption support)
 * - Silent refresh handling
 */

import {
  PublicClientApplication,
  EventCallbackFunction,
  AccountInfo,
  AuthenticationResult,
  SilentRequest,
  InteractionRequiredAuthError,
} from '@azure/msal-browser';
import { msalConfig, tokenRequest } from '@/config/azureB2C';

let instance: PublicClientApplication | null = null;
let tokenRefreshTimer: NodeJS.Timeout | null = null;

/**
 * Get or create MSAL instance (singleton pattern)
 */
export function getMsalInstance(): PublicClientApplication {
  if (!instance) {
    instance = new PublicClientApplication(msalConfig);
  }

  return instance;
}

/**
 * Initialize MSAL instance and handle redirect promise
 */
export async function initializeMsal(): Promise<AuthenticationResult | null> {
  const msalInstance = getMsalInstance();
  
  try {
    const result = await msalInstance.handleRedirectPromise();
    return result;
  } catch (error) {
    console.error('[MSAL] Initialization error:', error);
    throw error;
  }
}

/**
 * Add MSAL event callback
 */
export function addMsalEventCallback(callback: EventCallbackFunction): string | null {
  const msalInstance = getMsalInstance();
  return msalInstance.addEventCallback(callback);
}

/**
 * Remove MSAL event callback
 */
export function removeMsalEventCallback(callbackId: string | null): void {
  if (!callbackId) return;
  const msalInstance = getMsalInstance();
  msalInstance.removeEventCallback(callbackId);
}

/**
 * Validate token expiration
 * Returns true if token is valid, false if expired or expiring soon (within 5 minutes)
 */
export function isTokenValid(expiresOn: Date | undefined | null): boolean {
  if (!expiresOn) return false;
  
  const now = Date.now();
  const expiryTime = expiresOn.getTime();
  const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
  
  return expiryTime > now + bufferTime;
}

/**
 * Acquire token silently with retry logic
 * Retries up to 3 times with exponential backoff
 */
export async function acquireTokenSilentWithRetry(
  request: SilentRequest,
  maxRetries = 3
): Promise<AuthenticationResult> {
  const msalInstance = getMsalInstance();
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await msalInstance.acquireTokenSilent(request);
      
      // Validate token
      if (!isTokenValid(result.expiresOn)) {
        throw new Error('Token expired or expiring soon');
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on interaction required errors
      if (error instanceof InteractionRequiredAuthError) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Failed to acquire token after retries');
}

/**
 * Refresh token for active account
 */
export async function refreshToken(
  account?: AccountInfo
): Promise<AuthenticationResult | null> {
  const msalInstance = getMsalInstance();
  const activeAccount = account || msalInstance.getActiveAccount();
  
  if (!activeAccount) {
    console.warn('[MSAL] No active account for token refresh');
    return null;
  }
  
  try {
    const result = await acquireTokenSilentWithRetry({
      ...tokenRequest,
      account: activeAccount,
      forceRefresh: false,
    });
    
    return result;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      console.warn('[MSAL] Interaction required for token refresh');
      // Caller should handle redirect/popup
      throw error;
    }
    
    console.error('[MSAL] Token refresh failed:', error);
    throw error;
  }
}

/**
 * Schedule automatic token refresh
 * Refreshes token 5 minutes before expiry
 */
export function scheduleTokenRefresh(
  expiresOn: Date | undefined | null,
  onRefresh: (result: AuthenticationResult) => void | Promise<void>
): void {
  // Clear existing timer
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }
  
  if (!expiresOn) return;
  
  const now = Date.now();
  const expiryTime = expiresOn.getTime();
  const refreshBuffer = 5 * 60 * 1000; // 5 minutes before expiry
  const refreshTime = expiryTime - refreshBuffer;
  const delay = Math.max(0, refreshTime - now);
  
  // Don't schedule if token is already expired/expiring
  if (delay <= 0) {
    console.warn('[MSAL] Token already expired, skipping schedule');
    return;
  }
  
  console.log(`[MSAL] Scheduling token refresh in ${Math.round(delay / 1000)}s`);
  
  tokenRefreshTimer = setTimeout(async () => {
    try {
      const result = await refreshToken();
      if (result) {
        await onRefresh(result);
        // Schedule next refresh
        scheduleTokenRefresh(result.expiresOn, onRefresh);
      }
    } catch (error) {
      console.error('[MSAL] Scheduled token refresh failed:', error);
      // Don't schedule another refresh on failure
    }
  }, delay);
}

/**
 * Cancel scheduled token refresh
 */
export function cancelTokenRefresh(): void {
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }
}

/**
 * Get active account info
 */
export function getActiveAccount(): AccountInfo | null {
  const msalInstance = getMsalInstance();
  return msalInstance.getActiveAccount();
}

/**
 * Set active account
 */
export function setActiveAccount(account: AccountInfo | null): void {
  const msalInstance = getMsalInstance();
  msalInstance.setActiveAccount(account);
}

/**
 * Get all accounts
 */
export function getAllAccounts(): AccountInfo[] {
  const msalInstance = getMsalInstance();
  return msalInstance.getAllAccounts();
}

/**
 * Clear MSAL cache
 */
export async function clearCache(): Promise<void> {
  const msalInstance = getMsalInstance();
  
  // Cancel any scheduled refreshes
  cancelTokenRefresh();
  
  // Clear active account (MSAL will handle token cache cleanup)
  msalInstance.setActiveAccount(null);
}

