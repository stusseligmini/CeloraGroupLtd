/**
 * Firebase Configuration
 * 
 * Client-side Firebase config for authentication
 */

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '', // e.g. celora-7b552.appspot.com
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

// Validate required config
if (typeof window !== 'undefined') {
  const required: (keyof typeof firebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missing = required.filter(key => !firebaseConfig[key]);

  if (missing.length > 0) {
    console.warn('[Firebase] Missing required client config keys:', missing);
  } else {
    console.info('[Firebase] Client config loaded', {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      measurement: firebaseConfig.measurementId ? 'enabled' : 'disabled',
    });
  }
}

