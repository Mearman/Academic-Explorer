/**
 * Service Worker for OpenAlex API Request Interception
 * Intercepts requests to https://api.openalex.org and handles caching transparently
 */

const CACHE_NAME = 'openalex-cache-v1';
const OPENALEX_DOMAIN = 'api.openalex.org';

// Cast self for service worker functionality
const sw = self as any;

// Install event - set up the service worker
sw.addEventListener('install', (_event) => {
  console.log('[OpenAlex SW] Installing service worker');
  sw.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
sw.addEventListener('activate', (event) => {
  console.log('[OpenAlex SW] Activating service worker');
  (event as any).waitUntil(sw.clients.claim()); // Take control immediately
});

// Fetch event - intercept network requests
sw.addEventListener('fetch', (event) => {
  const { request } = (event as any);
  const url = new URL(request.url);

  // Only intercept OpenAlex API requests
  if (url.hostname === OPENALEX_DOMAIN) {
    (event as any).respondWith(handleOpenAlexRequest(request));
  }
});

/**
 * Handle OpenAlex API requests with caching
 */
async function handleOpenAlexRequest(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    console.log('[OpenAlex SW] Intercepting request:', url.pathname + url.search);

    // Check if we're in development (localhost)
    const isDevelopment = sw.location.hostname === 'localhost' ||
                         sw.location.hostname === '127.0.0.1' ||
                         sw.location.port === '5173';

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
    }

    // In production, try static data first
    const staticPath = `/data/openalex${url.pathname}.json`;
    try {
      console.log('[OpenAlex SW] Trying static file:', staticPath);
      const staticResponse = await fetch(staticPath);
      if (staticResponse.ok) {
        console.log('[OpenAlex SW] Static file hit:', staticPath);
        return staticResponse;
      }
    } catch (error) {
      console.log('[OpenAlex SW] Static file miss:', staticPath, error);
    }

    // Fallback to Cache API for basic caching
    const cache = await caches.open(CACHE_NAME);

    // Try cache next
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
      await cache.put(request, response.clone());
      console.log('[OpenAlex SW] Cached response for:', url.pathname);
    }

    return response;
  } catch (error) {
    console.error('[OpenAlex SW] Error handling request:', error);
    // Fallback to normal fetch
    return fetch(request);
  }
}