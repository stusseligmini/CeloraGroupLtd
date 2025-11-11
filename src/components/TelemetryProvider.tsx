'use client';

/**
 * Telemetry Provider Component
 * 
 * Initializes Application Insights and provides React context
 */

import { useEffect } from 'react';
import { initializeAppInsights } from '@/lib/telemetry/appInsights';

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  // Initialize Application Insights on mount
  useEffect(() => {
    const appInsights = initializeAppInsights();
    
    if (appInsights) {
      console.log('[TelemetryProvider] Application Insights initialized');
    }
  }, []);

  return <>{children}</>;
}
