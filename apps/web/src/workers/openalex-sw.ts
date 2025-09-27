/**
 * Service Worker for OpenAlex API Request Interception
 * Intercepts requests to https://api.openalex.org and handles caching transparently
 */

const CACHE_NAME = 'openalex-cache-v1';
const OPENALEX_DOMAIN = 'api.openalex.org';

// Cast self for service worker functionality
const sw = self as any; // eslint-disable-line @typescript-eslint/no-explicit-any

// Install event - set up the service worker
sw.addEventListener('install', (_event) => {
  // eslint-disable-next-line no-console -- Service worker logging
  console.log('[OpenAlex SW] Installing service worker');
  sw.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
sw.addEventListener('activate', (event) => {
  // eslint-disable-next-line no-console -- Service worker logging
  console.log('[OpenAlex SW] Activating service worker');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Service worker event typing
  (event as any).waitUntil(sw.clients.claim()); // Take control immediately
});

// Fetch event - intercept network requests
sw.addEventListener('fetch', (event) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Service worker event typing
  const { request } = (event as any);
  const url = new URL(request.url);

  // Only intercept OpenAlex API requests
  if (url.hostname === OPENALEX_DOMAIN) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Service worker event typing
    (event as any).respondWith(handleOpenAlexRequest(request));
  }
});

/**
 * Handle OpenAlex API requests with caching
 */
async function handleOpenAlexRequest(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    // eslint-disable-next-line no-console -- Service worker logging
    console.log('[OpenAlex SW] Intercepting request:', url.pathname + url.search);

    // Check if we're in development (localhost)
    const isDevelopment = sw.location.hostname === 'localhost' ||
                         sw.location.hostname === '127.0.0.1' ||
                         sw.location.port === '5173';

    if (isDevelopment) {
      // In development, proxy through our Vite middleware
      const proxyUrl = `/api/openalex${url.pathname}${url.search}`;
      // eslint-disable-next-line no-console -- Service worker logging
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
      // eslint-disable-next-line no-console -- Service worker logging
      console.log('[OpenAlex SW] Trying static file:', staticPath);
      const staticResponse = await fetch(staticPath);
      if (staticResponse.ok) {
        // eslint-disable-next-line no-console -- Service worker logging
        console.log('[OpenAlex SW] Static file hit:', staticPath);
        return staticResponse;
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- Service worker logging
      console.log('[OpenAlex SW] Static file miss:', staticPath, error);
    }

    // Fallback to Cache API for basic caching
    const cache = await caches.open(CACHE_NAME);

    // Try cache next
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      // eslint-disable-next-line no-console -- Service worker logging
      console.log('[OpenAlex SW] Cache hit for:', url.pathname);
      return cachedResponse;
    }

    // Cache miss - fetch from API
    // eslint-disable-next-line no-console -- Service worker logging
    console.log('[OpenAlex SW] Cache miss, fetching from API:', url.pathname);
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      await cache.put(request, response.clone());
      // eslint-disable-next-line no-console -- Service worker logging
      console.log('[OpenAlex SW] Cached response for:', url.pathname);
    }

    return response;
  } catch (error) {
    // eslint-disable-next-line no-console -- Service worker logging
    console.error('[OpenAlex SW] Error handling request:', error);
    // Fallback to normal fetch
    return fetch(request);
  }
}