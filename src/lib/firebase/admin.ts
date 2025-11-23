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
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  
  let adminConfig: any = {
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
  } else {
    // No service account provided - use default credentials (for Firebase emulator or local dev)
    console.warn('[Firebase Admin] FIREBASE_SERVICE_ACCOUNT not set, using default credentials');
  }

  if (!projectId && !serviceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT or NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is required');
  }

  adminApp = initializeApp(adminConfig);
  adminAuth = getAuth(adminApp);

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

