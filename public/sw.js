/**
 * Service Worker for Academic Explorer
 * Provides offline caching, background sync, and PWA functionality
 */

const CACHE_NAME = 'academic-explorer-v1';
const DYNAMIC_CACHE_NAME = 'academic-explorer-dynamic-v1';
const API_CACHE_NAME = 'academic-explorer-api-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/index.css',
  '/assets/index.js',
  '/favicon.ico',
  '/favicon.svg',
];

// API endpoints to cache
const API_ENDPOINTS = [
  'https://api.openalex.org/works',
  'https://api.openalex.org/authors',
  'https://api.openalex.org/sources',
  'https://api.openalex.org/institutions',
];

// Network-first strategy for these patterns
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /openalex\.org\/(?:works|authors|sources|institutions)/,
];

// Cache-first strategy for these patterns
const CACHE_FIRST_PATTERNS = [
  /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
  /\/assets\//,
];

// Stale-while-revalidate for these patterns
const STALE_WHILE_REVALIDATE_PATTERNS = [
  /\/$/,
  /\/index\.html$/,
  /\/entity\//,
  /\/search/,
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        // Take control immediately
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        const deletePromises = cacheNames
          .filter(cacheName => 
            cacheName !== CACHE_NAME && 
            cacheName !== DYNAMIC_CACHE_NAME &&
            cacheName !== API_CACHE_NAME
          )
          .map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          });
        
        return Promise.all(deletePromises);
      })
      .then(() => {
        console.log('[SW] Service worker activated and claimed clients');
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-http(s) requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Skip Chrome extensions
  if (request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Determine caching strategy based on URL patterns
  if (shouldUseNetworkFirst(request)) {
    event.respondWith(networkFirstStrategy(request));
  } else if (shouldUseCacheFirst(request)) {
    event.respondWith(cacheFirstStrategy(request));
  } else if (shouldUseStaleWhileRevalidate(request)) {
    event.respondWith(staleWhileRevalidateStrategy(request));
  } else {
    // Default to network first for unknown patterns
    event.respondWith(networkFirstStrategy(request));
  }
});

/**
 * Check if request should use network-first strategy
 */
function shouldUseNetworkFirst(request) {
  const url = request.url;
  return NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url)) ||
         request.method !== 'GET';
}

/**
 * Check if request should use cache-first strategy
 */
function shouldUseCacheFirst(request) {
  const url = request.url;
  return CACHE_FIRST_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Check if request should use stale-while-revalidate strategy
 */
function shouldUseStaleWhileRevalidate(request) {
  const url = request.url;
  return STALE_WHILE_REVALIDATE_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Network-first caching strategy
 * Try network first, fall back to cache
 */
async function networkFirstStrategy(request) {
  const cacheName = isApiRequest(request) ? API_CACHE_NAME : DYNAMIC_CACHE_NAME;
  
  try {
    // Try network first
    const response = await fetch(request);
    
    // Only cache successful responses
    if (response.status === 200) {
      const cache = await caches.open(cacheName);
      // Clone response before caching
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }
    
    // If it's an HTML request and we have no cache, return offline page
    if (request.headers.get('Accept')?.includes('text/html')) {
      return createOfflineResponse(request);
    }
    
    // For other requests, return a generic error response
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This request requires an internet connection' 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Cache-first caching strategy
 * Try cache first, fall back to network
 */
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log('[SW] Serving from cache:', request.url);
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Network and cache failed for:', request.url);
    return new Response('Resource not available offline', { status: 503 });
  }
}

/**
 * Stale-while-revalidate caching strategy
 * Serve from cache immediately, update cache in background
 */
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  // Fetch in background to update cache
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.status === 200) {
        const cache = caches.open(DYNAMIC_CACHE_NAME);
        cache.then(c => c.put(request, response.clone()));
      }
      return response;
    })
    .catch(error => {
      console.log('[SW] Background fetch failed:', error);
      return null;
    });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    console.log('[SW] Serving stale content from cache:', request.url);
    return cachedResponse;
  }
  
  // If no cache, wait for network
  try {
    return await fetchPromise;
  } catch (error) {
    return createOfflineResponse(request);
  }
}

/**
 * Check if request is to API endpoint
 */
function isApiRequest(request) {
  const url = request.url;
  return API_ENDPOINTS.some(endpoint => url.startsWith(endpoint)) ||
         url.includes('/api/') ||
         url.includes('openalex.org');
}

/**
 * Create offline response for HTML requests
 */
function createOfflineResponse(request) {
  const offlineHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Academic Explorer - Offline</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f3f4f6;
        }
        .offline-container {
          text-align: center;
          max-width: 400px;
          padding: 2rem;
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        .offline-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        .offline-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }
        .offline-message {
          color: #6b7280;
          margin-bottom: 2rem;
        }
        .retry-button {
          background-color: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.375rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .retry-button:hover {
          background-color: #2563eb;
        }
        .offline-status {
          margin-top: 1rem;
          padding: 0.75rem;
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 0.375rem;
          color: #991b1b;
          font-size: 0.875rem;
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="offline-icon">🌐</div>
        <h1 class="offline-title">You're Offline</h1>
        <p class="offline-message">
          This page is not available offline. Please check your internet connection and try again.
        </p>
        <button class="retry-button" onclick="window.location.reload()">
          Try Again
        </button>
        <div class="offline-status">
          <strong>Offline Mode:</strong> Some features are available offline. 
          Your actions will be synchronized when you reconnect.
        </div>
      </div>

      <script>
        // Check for connection every few seconds
        setInterval(() => {
          if (navigator.onLine) {
            window.location.reload();
          }
        }, 3000);

        // Listen for online event
        window.addEventListener('online', () => {
          window.location.reload();
        });
      </script>
    </body>
    </html>
  `;

  return new Response(offlineHtml, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
}

/**
 * Background sync event
 */
self.addEventListener('sync', event => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'background-sync-queue') {
    event.waitUntil(processOfflineQueue());
  }
});

/**
 * Process offline queue during background sync
 */
async function processOfflineQueue() {
  try {
    console.log('[SW] Processing offline queue');
    
    // This would typically read from IndexedDB and process queued requests
    // For now, just notify the client to process the queue
    const clients = await self.clients.matchAll();
    
    clients.forEach(client => {
      client.postMessage({
        type: 'PROCESS_OFFLINE_QUEUE',
        timestamp: Date.now()
      });
    });
    
  } catch (error) {
    console.error('[SW] Failed to process offline queue:', error);
  }
}

/**
 * Push event for notifications
 */
self.addEventListener('push', event => {
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();
    const title = data.title || 'Academic Explorer';
    const options = {
      body: data.body || 'You have new updates',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || 'general',
      data: data.data || {},
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('[SW] Failed to show notification:', error);
  }
});

/**
 * Notification click event
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  event.waitUntil(
    self.clients.matchAll().then(clients => {
      // Try to focus existing client
      const client = clients.find(c => c.visibilityState === 'visible');
      
      if (client) {
        client.focus();
        client.postMessage({
          type: 'NOTIFICATION_CLICK',
          action,
          data
        });
      } else {
        // Open new window
        self.clients.openWindow('/');
      }
    })
  );
});

/**
 * Message event from client
 */
self.addEventListener('message', event => {
  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({
        version: CACHE_NAME,
        timestamp: Date.now()
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'CACHE_URLS':
      if (data && data.urls) {
        cacheUrls(data.urls).then(() => {
          event.ports[0].postMessage({ success: true });
        });
      }
      break;
  }
});

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  const deletePromises = cacheNames.map(name => caches.delete(name));
  return Promise.all(deletePromises);
}

/**
 * Cache specific URLs
 */
async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  return cache.addAll(urls);
}

/**
 * Periodic background sync (if supported)
 */
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', event => {
    if (event.tag === 'periodic-background-sync') {
      event.waitUntil(processOfflineQueue());
    }
  });
}

console.log('[SW] Service worker script loaded');