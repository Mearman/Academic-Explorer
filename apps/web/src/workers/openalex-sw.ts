/**
 * Service Worker for OpenAlex API Request Interception
 * Intercepts requests to https://api.openalex.org and handles caching transparently
 */

const CACHE_NAME = "openalex-cache-v1";
const OPENALEX_DOMAIN = "api.openalex.org";

/**
 * Validate that data appears to be a valid OpenAlex entity
 */
function isValidOpenAlexEntity(data: unknown): boolean {
  if (!data || typeof data !== "object") {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // OpenAlex entities should have id and display_name
  return typeof obj.id === "string" && typeof obj.display_name === "string";
}

/**
 * Validate that data appears to be a valid OpenAlex query result
 */
function isValidOpenAlexQueryResult(data: unknown): boolean {
  if (!data || typeof data !== "object") {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // OpenAlex query results should have results array and meta object
  return Array.isArray(obj.results) && typeof obj.meta === "object";
}

/**
 * Parse OpenAlex URL into structured information
 */
function parseOpenAlexUrl(
  url: string,
): { isQuery: boolean; entityId?: string } | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname !== "api.openalex.org") {
      return null;
    }

    const pathSegments = urlObj.pathname.split("/").filter(Boolean);
    const hasQuery = urlObj.searchParams.toString().length > 0;

    // Check if it's an entity request (has entity ID in path)
    const entityId = pathSegments.length === 2 ? pathSegments[1] : undefined;

    return {
      isQuery: hasQuery || pathSegments.length === 1,
      entityId,
    };
  } catch {
    return null;
  }
}

// Cast self for service worker functionality
const sw = self as unknown as {
  addEventListener: (
    type: string,
    listener: (event: ExtendableEvent | FetchEvent) => void,
  ) => void;
  skipWaiting: () => void;
  clients: { claim: () => Promise<void> };
  location: { hostname: string; port: string };
  // Workbox injection point
  __WB_MANIFEST: unknown[];
};

// Workbox precache manifest injection point (required by injectManifest but not used)
// This must be exactly "self.__WB_MANIFEST" for Workbox to find and replace it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(self as any).__WB_MANIFEST = [];

// Service worker event types
interface ExtendableEvent extends Event {
  waitUntil: (promise: Promise<unknown>) => void;
}

interface FetchEvent extends ExtendableEvent {
  request: Request;
  respondWith: (response: Promise<Response> | Response) => void;
}

// Install event - set up the service worker
sw.addEventListener("install", (_event) => {
  console.log("[OpenAlex SW] Installing service worker");
  sw.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
sw.addEventListener("activate", (event) => {
  console.log("[OpenAlex SW] Activating service worker");
  (event as ExtendableEvent).waitUntil(sw.clients.claim()); // Take control immediately
});

// Fetch event - intercept network requests
sw.addEventListener("fetch", (event) => {
  const fetchEvent = event as FetchEvent;
  const { request } = fetchEvent;
  const url = new URL(request.url);

  // Only intercept OpenAlex API requests
  if (url.hostname === OPENALEX_DOMAIN) {
    fetchEvent.respondWith(handleOpenAlexRequest(request));
  }
});

/**
 * Handle OpenAlex API requests with caching
 */
async function handleOpenAlexRequest(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    console.log(
      "[OpenAlex SW] Intercepting request:",
      url.pathname + url.search,
    );

    // Check if we're in development (localhost)
    const isDevelopment =
      sw.location.hostname === "localhost" ||
      sw.location.hostname === "127.0.0.1" ||
      sw.location.port === "5173";

    if (isDevelopment) {
      // In development, proxy through our Vite middleware
      const proxyUrl = `/api/openalex${url.pathname}${url.search}`;
      console.log("[OpenAlex SW] Proxying to:", proxyUrl);

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
      console.log("[OpenAlex SW] Trying static file:", staticPath);
      const staticResponse = await fetch(staticPath);
      if (staticResponse.ok) {
        console.log("[OpenAlex SW] Static file hit:", staticPath);
        return staticResponse;
      }
    } catch (error) {
      console.log("[OpenAlex SW] Static file miss:", staticPath, error);
    }

    // Fallback to Cache API for basic caching
    const cache = await caches.open(CACHE_NAME);

    // Try cache next
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log("[OpenAlex SW] Cache hit for:", url.pathname);
      return cachedResponse;
    }

    // Cache miss - fetch from API
    console.log("[OpenAlex SW] Cache miss, fetching from API:", url.pathname);
    const response = await fetch(request);

    // Cache successful responses with validation
    if (response.ok) {
      try {
        // Clone the response for validation
        const responseClone = response.clone();
        const data = await responseClone.json();

        // Validate OpenAlex response structure
        const parsedUrl = parseOpenAlexUrl(request.url);
        if (parsedUrl) {
          const isEntity = !!parsedUrl.entityId;
          const isValid = isEntity
            ? isValidOpenAlexEntity(data)
            : isValidOpenAlexQueryResult(data);

          if (!isValid) {
            console.warn(
              "[OpenAlex SW] Invalid OpenAlex response structure detected, not caching:",
              {
                url: request.url,
                expectedFormat: isEntity ? "entity" : "query result",
                isEntity,
              },
            );
            return response; // Return response without caching
          }
        }

        // Validation passed, cache the response
        await cache.put(request, response.clone());
        console.log(
          "[OpenAlex SW] Cached validated response for:",
          url.pathname,
        );
      } catch (error) {
        console.warn(
          "[OpenAlex SW] Failed to validate response, not caching:",
          error,
        );
        // Return response without caching if validation fails
      }
    }

    return response;
  } catch (error) {
    console.error("[OpenAlex SW] Error handling request:", error);
    // Fallback to normal fetch
    return fetch(request);
  }
}
