/**
 * Service Worker for OpenAlex API Request Interception
 * Intercepts requests to https://api.openalex.org and handles caching transparently
 */

const CACHE_NAME = 'openalex-cache-v1';
const OPENALEX_DOMAIN = 'api.openalex.org';

// Install event - set up the service worker
self.addEventListener('install', (event) => {
  console.log('[OpenAlex SW] Installing service worker');
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[OpenAlex SW] Activating service worker');
  event.waitUntil(self.clients.claim()); // Take control immediately
});

// Fetch event - intercept network requests
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only intercept OpenAlex API requests
  if (url.hostname === OPENALEX_DOMAIN) {
    event.respondWith(handleOpenAlexRequest(request));
  }
});

/**
 * Handle OpenAlex API requests with caching
 */
async function handleOpenAlexRequest(request) {
  try {
    const url = new URL(request.url);
    console.log('[OpenAlex SW] Intercepting request:', url.pathname + url.search);

    // Check if we're in development (localhost)
    const isDevelopment = self.location.hostname === 'localhost' ||
                         self.location.hostname === '127.0.0.1' ||
                         self.location.port === '5173';

    if (isDevelopment) {
      // In development, proxy through our Vite middleware
      const proxyUrl = `/api/openalex${url.pathname}${url.search}`;
      console.log('[OpenAlex SW] Proxying to:', proxyUrl);

      const proxyRequest = new Request(proxyUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      return fetch(proxyRequest);
    } else {
      // In production, use Cache API for basic caching
      const cache = await caches.open(CACHE_NAME);

      // Try cache first
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        console.log('[OpenAlex SW] Cache hit for:', url.pathname);
        return cachedResponse;
      }

      // Cache miss - fetch from API
      console.log('[OpenAlex SW] Cache miss, fetching from API:', url.pathname);
      const response = await fetch(request);

      // Cache successful responses
      if (response.ok) {
        cache.put(request, response.clone());
        console.log('[OpenAlex SW] Cached response for:', url.pathname);
      }

      return response;
    }
  } catch (error) {
    console.error('[OpenAlex SW] Error handling request:', error);
    // Fallback to normal fetch
    return fetch(request);
  }
}