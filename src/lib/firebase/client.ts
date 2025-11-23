/**
 * Firebase Client
 * Initializes Firebase app for extension and web
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/config/firebase';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Initialize Firebase only on client side
if (typeof window !== 'undefined') {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  auth = getAuth(app);
  db = getFirestore(app);
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
