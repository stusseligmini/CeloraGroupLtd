/**
 * Firebase Configuration
 * 
 * Client-side Firebase config for authentication
 */

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAnauWfK21qclea_kZM-GqDCHpzombR884',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'celora-7b552.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'celora-7b552',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'celora-7b552.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '505448793868',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:505448793868:web:df0e3f80e669ab47a26b29',
};

// Validate required config
if (typeof window !== 'undefined') {
  const required = ['apiKey', 'authDomain', 'projectId'];
  const missing = required.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);
  
  if (missing.length > 0) {
    console.warn('[Firebase] Missing required config:', missing);
  }
}

