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

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Initialize Firebase only on client side
if (typeof window !== 'undefined') {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    
    auth = getAuth(app);
    db = getFirestore(app);

    // Initialize App Check with reCAPTCHA Enterprise
    // This protects Firebase backend resources (Firestore, Functions, Storage) from abuse
    const siteKey = recaptchaConfig.v3.siteKey;
    if (siteKey) {
      try {
        initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(siteKey),
          isTokenAutoRefreshEnabled: true, // Auto-refresh tokens before expiry
        });
        console.log('✅ Firebase App Check initialized');
      } catch (error) {
        console.warn('App Check initialization failed:', error);
      }
    }

    // Use emulator in development if available (prevents network errors)
    if (process.env.NODE_ENV === 'development') {
      const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
      if (useEmulator) {
        try {
          connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
          connectFirestoreEmulator(db, 'localhost', 8080);
        } catch (err) {
          // Emulator already connected or not available
          console.log('[Firebase] Emulator connection skipped');
        }
      }
    }
  } catch (error) {
    console.error('[Firebase] Initialization error:', error);
    // Re-throw to prevent silent failures
    throw error;
  }
}

/**
 * Sign in anonymously (for Telegram users without account)
 */
export async function signInAnonymous() {
  try {
    const userCredential = await signInAnonymously(auth);
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
    const userCredential = await signInWithCustomToken(auth, customToken);
    return userCredential.user;
  } catch (error) {
    console.error('Custom token sign-in failed:', error);
    throw error;
  }
}

export { app, auth, db };
