/**
 * Firebase Client
 * Initializes Firebase app for extension and web
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, signInAnonymously, signInWithCustomToken, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { firebaseConfig } from '@/config/firebase';
import { recaptchaConfig } from '@/config/recaptcha';

let appInternal: FirebaseApp | null = null;
let authInternal: Auth | null = null;
let dbInternal: Firestore | null = null;

export const firebaseClientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

export const isFirebaseClientConfigured = Object.values(firebaseClientConfig).every(v => typeof v === 'string' && v.length > 0);

// Initialize Firebase only on client side
if (typeof window !== 'undefined') {
  console.log('🔥 [Firebase Client] TOP OF MODULE - Initializing... isConfigured:', isFirebaseClientConfigured);
  console.log('🔥 [Firebase Client] Config values:', firebaseClientConfig);
  try {
    if (!isFirebaseClientConfigured) {
      console.warn('[Firebase] ❌ Client config missing; skipping Firebase init in development.');
      console.log('[Firebase] Config check:', firebaseClientConfig);
    } else {
      console.log('[Firebase] ✅ Config valid, initializing Firebase app...');
      if (getApps().length === 0) {
        appInternal = initializeApp(firebaseConfig);
        console.log('[Firebase] ✅ App initialized');
      } else {
        appInternal = getApps()[0];
        console.log('[Firebase] ✅ Using existing app');
      }

      authInternal = getAuth(appInternal);
      dbInternal = getFirestore(appInternal);
      console.log('[Firebase] ✅ Auth and Firestore initialized');
    }

    // Initialize App Check with debug token in development, reCAPTCHA in production
    if (appInternal) {
      try {
        if (process.env.NODE_ENV === 'development') {
          // Use debug token provider for local development
          // @ts-ignore - initializeAppCheck accepts debug token provider
          (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
          console.log('🔧 App Check: Using debug mode for development');
        }
        
        const siteKey = recaptchaConfig.v3.siteKey;
        if (siteKey || process.env.NODE_ENV === 'development') {
          initializeAppCheck(appInternal, {
            provider: new ReCaptchaEnterpriseProvider(siteKey),
            isTokenAutoRefreshEnabled: true,
          });
          console.log('✅ Firebase App Check initialized');
        }
      } catch (error) {
        console.warn('⚠️ App Check initialization failed:', error);
      }
    }

    // Use emulator in development if available (prevents network errors)
    if (process.env.NODE_ENV === 'development' && isFirebaseClientConfigured && appInternal && authInternal && dbInternal) {
      const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
      if (useEmulator) {
        try {
          connectAuthEmulator(authInternal, 'http://localhost:9099', { disableWarnings: true });
          connectFirestoreEmulator(dbInternal, 'localhost', 8080);
        } catch (err) {
          // Emulator already connected or not available
          console.log('[Firebase] Emulator connection skipped');
        }
      }
    }
  } catch (error) {
    console.error('[Firebase] Initialization error:', error);
    // Do not rethrow in development; allow app to render a friendly banner
    if (process.env.NODE_ENV !== 'development') {
      throw error;
    }
  }
}

/**
 * Sign in anonymously (for Telegram users without account)
 */
export async function signInAnonymous() {
  try {
    if (!authInternal) throw new Error('FIREBASE_CLIENT_NOT_CONFIGURED');
    const userCredential = await signInAnonymously(authInternal);
    return userCredential.user;
  } catch (error) {
    console.error('Anonymous sign-in failed:', error);
    throw error;
  }
}

/**
 * Sign in with custom token (for Telegram ID → Firebase mapping)
 */
export async function signInWithTelegramToken(customToken: string) {
  try {
    if (!authInternal) throw new Error('FIREBASE_CLIENT_NOT_CONFIGURED');
    const userCredential = await signInWithCustomToken(authInternal, customToken);
    return userCredential.user;
  } catch (error) {
    console.error('Custom token sign-in failed:', error);
    throw error;
  }
}
// Export non-null types to satisfy consumers; in development when not configured,
// these will be null at runtime so callers should guard using isFirebaseClientConfigured.
export const app = appInternal as unknown as FirebaseApp;
export const auth = authInternal as unknown as Auth;
export const db = dbInternal as unknown as Firestore;
