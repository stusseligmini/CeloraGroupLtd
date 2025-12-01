'use client';

import { useEffect, useState } from 'react';
import { Workbox } from 'workbox-window';
import { logger } from '@/lib/logger';

export default function ServiceWorkerRegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [workbox, setWorkbox] = useState<Workbox | null>(null);

  useEffect(() => {
    // Disable service worker in development to avoid errors
    if (process.env.NODE_ENV === 'development') {
      return;
    }
    
    // Only register in secure contexts (HTTPS or localhost)
    const isSecureContext = window.location.protocol === 'https:' || 
                          window.location.hostname === 'localhost';
    
    if ('serviceWorker' in navigator && isSecureContext) {
      registerServiceWorkerWithWorkbox();
    }
    
    return () => {
      // Clean up handled by Workbox
    };
  }, []);
  
  const registerServiceWorkerWithWorkbox = async () => {
    try {
      // Initialize Workbox
      const wb = new Workbox('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      
      setWorkbox(wb);
      
      // Listen for waiting service worker
      wb.addEventListener('waiting', () => {
        setUpdateAvailable(true);
      });
      
      // Listen for controlling service worker change
      wb.addEventListener('controlling', () => {
        window.location.reload();
      });
      
      // Listen for successful activation
      wb.addEventListener('activated', (event: any) => {
        if (!event.isUpdate) {
          setOfflineReady(true);
          setTimeout(() => setOfflineReady(false), 5000);
        }
      });
      
      // Register the service worker
      const reg = await wb.register();
      setRegistration(reg || null);
      
      // Check for updates every 60 seconds
      setInterval(() => {
        wb.update();
      }, 60 * 1000);
      
    } catch (error) {
      logger.error('Service worker registration failed', error instanceof Error ? error : undefined);
    }
  };
  
  const updateServiceWorker = () => {
    if (!workbox) return;
    
    // Tell the waiting service worker to activate
    workbox.messageSkipWaiting();
    setUpdateAvailable(false);
  };
  
  if (!updateAvailable && !offlineReady) {
    return null; // Don't render anything if no notifications
  }
  
  return (
    <div className="fixed bottom-4 left-4 z-40 animate-fade-in">
      {updateAvailable && (
        <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg mb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <span>Update available!</span>
            </div>
            <button 
              onClick={updateServiceWorker}
              className="ml-4 px-2 py-1 bg-white text-blue-600 rounded hover:bg-blue-100 text-sm font-medium"
            >
              Update now
            </button>
          </div>
        </div>
      )}
      
      {offlineReady && (
        <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>App ready for offline use!</span>
          </div>
        </div>
      )}
    </div>
  );
}
