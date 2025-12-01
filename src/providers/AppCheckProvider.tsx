/**
 * Firebase App Check Provider
 * 
 * Initializes App Check with reCAPTCHA Enterprise to protect Firebase resources
 */

'use client';

import { useEffect } from 'react';
import { initializeFirebaseAppCheck } from '@/lib/firebase/appCheck';

export function AppCheckProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize App Check on mount
    initializeFirebaseAppCheck();
  }, []);

  return <>{children}</>;
}
