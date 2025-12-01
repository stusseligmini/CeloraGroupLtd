/**
 * Firebase Admin SDK
 * 
 * Server-side Firebase Admin for token verification
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;

/**
 * Get or initialize Firebase Admin app
 */
export function getFirebaseAdmin(): { app: App; auth: Auth } {
  if (adminApp && adminAuth) {
    return { app: adminApp, auth: adminAuth };
  }

  // Check if already initialized
  const existingApp = getApps()[0];
  if (existingApp) {
    adminApp = existingApp;
    adminAuth = getAuth(adminApp);
    return { app: adminApp, auth: adminAuth };
  }

  // Initialize with service account or use default credentials
  // Prefer explicit service account object or decomposed env vars
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT; // JSON string if provided
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  
  const adminConfig: any = {
    projectId,
  };

  if (serviceAccount) {
    let serviceAccountJson;
    try {
      serviceAccountJson = JSON.parse(serviceAccount);
      adminConfig.credential = cert(serviceAccountJson);
    } catch {
      // If not JSON, try as path to file
      try {
        const serviceAccountPath = serviceAccount;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        serviceAccountJson = require(serviceAccountPath);
        adminConfig.credential = cert(serviceAccountJson);
      } catch (error) {
        // If service account fails, try using default credentials (for local development with Firebase CLI)
        console.warn('[Firebase Admin] Failed to load service account, trying default credentials:', error);
      }
    }
  } else if (clientEmail && privateKeyRaw && projectId) {
    // Normalize escaped newlines
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
    try {
      adminConfig.credential = cert({
        projectId,
        clientEmail,
        privateKey,
      });
    } catch (e) {
      console.error('[Firebase Admin] Failed to build credential from env vars:', e);
    }
  } else {
    console.warn('[Firebase Admin] No service account JSON or decomposed key env vars found; falling back to default credentials');
  }

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID) is required for Firebase Admin initialization');
  }

  adminApp = initializeApp(adminConfig);
  adminAuth = getAuth(adminApp);

  console.info('[Firebase Admin] Initialized', {
    projectId,
    credentialType: adminConfig.credential ? 'service-account' : 'default',
  });

  return { app: adminApp, auth: adminAuth };
}

/**
 * Verify Firebase ID token
 */
export async function verifyIdToken(idToken: string) {
  try {
    const { auth } = getFirebaseAdmin();
    return await auth.verifyIdToken(idToken);
  } catch (error) {
    // Log error but don't expose details in production
    console.error('[Firebase Admin] Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

