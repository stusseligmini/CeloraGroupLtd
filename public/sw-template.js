/**
 * Service Worker Template for Workbox
 * 
 * Production-ready service worker with Workbox precaching and runtime caching
 */

// Import Workbox libraries
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js');

// Check if Workbox loaded successfully
if (workbox) {
  console.log('[SW] Workbox loaded successfully');
  
  // Configure Workbox
  workbox.setConfig({
    debug: false, // Set to true for debugging
  });
  
  // Precache and route (will be populated by workbox-cli)
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);
  
  // Clean up old precaches
  workbox.precaching.cleanupOutdatedCaches();
  
  // =====================================================================
  // Runtime Caching Strategies
  // =====================================================================
  
  // Cache API responses with NetworkFirst strategy
  // Exclude sensitive endpoints (auth, wallet, payments)
  workbox.routing.registerRoute(
    ({ url }) => {
      const path = url.pathname;
      // Only cache safe, public API endpoints
      if (!path.startsWith('/api/')) return false;
      
      // Exclude sensitive endpoints
      const excludePaths = [
        '/api/auth/',
        '/api/wallet/',
        '/api/payment-requests/',
        '/api/telegram/',
        '/api/cards/',
        '/api/multisig/',
      ];
      
      return !excludePaths.some(exclude => path.startsWith(exclude));
    },
    new workbox.strategies.NetworkFirst({
      cacheName: 'celora-api-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        // Respect Cache-Control: no-store
        {
          cacheWillUpdate: async ({ response }) => {
            const cacheControl = response.headers.get('Cache-Control');
            if (cacheControl && cacheControl.includes('no-store')) {
              return null; // Don't cache
            }
            return response;
          },
        },
      ],
      networkTimeoutSeconds: 10,
    })
  );
  
  // Cache images with CacheFirst strategy
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'celora-images-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    })
  );
  
  // Cache fonts with CacheFirst strategy
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'font',
    new workbox.strategies.CacheFirst({
      cacheName: 'celora-fonts-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        }),
      ],
    })
  );
  
  // Cache CSS/JS with StaleWhileRevalidate
  workbox.routing.registerRoute(
    ({ request }) => 
      request.destination === 'style' || 
      request.destination === 'script',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'celora-static-resources',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        }),
      ],
    })
  );
  
  // Cache Google Fonts stylesheets with StaleWhileRevalidate
  workbox.routing.registerRoute(
    ({ url }) => url.origin === 'https://fonts.googleapis.com',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'google-fonts-stylesheets',
    })
  );
  
  // Cache Google Fonts webfonts with CacheFirst
  workbox.routing.registerRoute(
    ({ url }) => url.origin === 'https://fonts.gstatic.com',
    new workbox.strategies.CacheFirst({
      cacheName: 'google-fonts-webfonts',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );
  
  // Removed legacy Azure-specific caching (B2C, Application Insights)
  
  // =====================================================================
  // Offline Fallback
  // =====================================================================
  
  // Set up navigation fallback
  const FALLBACK_HTML_URL = '/offline';
  const FALLBACK_IMAGE_URL = '/images/offline-image.svg';
  
  // Catch navigation requests and serve offline page if network fails
  workbox.routing.setDefaultHandler(
    new workbox.strategies.NetworkFirst({
      cacheName: 'celora-pages-cache',
    })
  );
  
  // Offline fallback for navigation requests
  workbox.routing.setCatchHandler(async ({ request }) => {
    // Only handle navigation requests with offline page
    if (request.destination === 'document') {
      return caches.match(FALLBACK_HTML_URL) || Response.error();
    }
    
    // Fallback for images
    if (request.destination === 'image') {
      return caches.match(FALLBACK_IMAGE_URL) || Response.error();
    }
    
    return Response.error();
  });
  
  // =====================================================================
  // Background Sync
  // =====================================================================
  
  // Queue failed POST requests for background sync
  const bgSyncPlugin = new workbox.backgroundSync.BackgroundSyncPlugin('celora-queue', {
    maxRetentionTime: 24 * 60, // Retry for up to 24 hours (in minutes)
  });
  
  // Register background sync for API POST requests (exclude auth/sensitive endpoints)
  workbox.routing.registerRoute(
    ({ url, request }) => {
      const path = url.pathname;
      if (!path.startsWith('/api/')) return false;
      if (!['POST', 'PUT', 'PATCH'].includes(request.method)) return false;
      
      // Exclude sensitive mutations
      const excludePaths = [
        '/api/auth/',
        '/api/wallet/vault',
        '/api/cards/authorize',
        '/api/payment-requests/',
      ];
      
      return !excludePaths.some(exclude => path.startsWith(exclude));
    },
    new workbox.strategies.NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );
  
  // =====================================================================
  // Message Handling
  // =====================================================================
  
  // Listen for skip waiting message
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });
  
  // Notify clients when cache is updated
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      clients.claim().then(() => {
        return clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'CACHE_UPDATED',
              version: '1.0.0',
            });
          });
        });
      })
    );
  });
  
  // Notify clients when offline mode is ready
  self.addEventListener('install', (event) => {
    event.waitUntil(
      self.skipWaiting().then(() => {
        return clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'OFFLINE_READY',
            });
          });
        });
      })
    );
  });
  
  // =====================================================================
  // Update Check
  // =====================================================================
  
  // Check for updates every hour
  setInterval(() => {
    self.registration.update();
  }, 60 * 60 * 1000);
  
  console.log('[SW] Service Worker initialized with Workbox');
  
} else {
  console.error('[SW] Workbox failed to load');
}
