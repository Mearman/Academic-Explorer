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
interface ParsedOpenAlexUrl {
  isQuery: boolean;
  entityId?: string;
}

function parseOpenAlexUrl(url: string): ParsedOpenAlexUrl | null {
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
interface ServiceWorkerGlobalScope {
  addEventListener: (
    type: string,
    listener: (event: ExtendableEvent | FetchEvent) => void,
  ) => void;
  skipWaiting: () => void;
  clients: { claim: () => Promise<void> };
  location: { hostname: string; port: string };
}

// Extend global self with Workbox manifest placeholder
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Workbox precache manifest injection point
// Workbox will replace this array with the actual precache manifest
const precacheManifest = self.__WB_MANIFEST;

const sw = self;

// Service worker initialized with precache manifest
// Note: precacheManifest contains the list of files to cache

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
  // Service worker installation starting - activating immediately
  sw.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
sw.addEventListener("activate", (event) => {
  // Service worker activation starting - claiming all clients
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
 * Check if we're in development environment
 */
function isDevelopmentEnvironment(): boolean {
  return (
    sw.location.hostname === "localhost" ||
    sw.location.hostname === "127.0.0.1" ||
    sw.location.port === "5173"
  );
}

/**
 * Handle development proxy requests
 */
async function handleDevelopmentRequest({
  request,
  url,
}: {
  request: Request;
  url: URL;
}): Promise<Response> {
  const proxyUrl = `/api/openalex${url.pathname}${url.search}`;
  // In development, proxy OpenAlex API requests to local development server

  const proxyRequest = new Request(proxyUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  return fetch(proxyRequest);
}

/**
 * Try to serve static data file
 */
async function tryStaticFile(url: URL): Promise<Response | null> {
  const staticPath = `/data/openalex${url.pathname}.json`;
  try {
    // Attempt to fetch pre-generated static JSON file for this OpenAlex endpoint
    const staticResponse = await fetch(staticPath);
    if (staticResponse.ok) {
      // Static file found and served successfully
      return staticResponse;
    }
  } catch (error) {
    // Static file not available or failed to load
  }
  return null;
}

/**
 * Try to get cached response
 */
async function tryCache({
  request,
  url,
}: {
  request: Request;
  url: URL;
}): Promise<Response | null> {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    // Found cached response for this OpenAlex API request
    return cachedResponse;
  }
  return null;
}

/**
 * Validate and cache response if valid
 */
async function validateAndCacheResponse({
  request,
  response,
  url,
}: {
  request: Request;
  response: Response;
  url: URL;
}): Promise<Response> {
  if (!response.ok) return response;

  try {
    const responseClone = response.clone();
    const data = await responseClone.json();

    const parsedUrl = parseOpenAlexUrl(request.url);
    if (parsedUrl && !isValidOpenAlexResponse({ data, parsedUrl })) {
      console.warn("[OpenAlex SW] Invalid response structure, not caching:", {
        url: request.url,
        expectedFormat: parsedUrl.entityId ? "entity" : "query result",
        isEntity: !!parsedUrl.entityId,
      });
      return response;
    }

    // Cache valid response
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
    // Successfully cached validated OpenAlex response
  } catch (error) {
    console.warn(
      "[OpenAlex SW] Failed to validate response, not caching:",
      error,
    );
  }

  return response;
}

/**
 * Validate OpenAlex response structure
 */
function isValidOpenAlexResponse({
  data,
  parsedUrl,
}: {
  data: unknown;
  parsedUrl: ParsedOpenAlexUrl;
}): boolean {
  const isEntity = !!parsedUrl.entityId;
  return isEntity
    ? isValidOpenAlexEntity(data)
    : isValidOpenAlexQueryResult(data);
}

/**
 * Handle OpenAlex API requests with caching
 */
async function handleOpenAlexRequest(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    // Intercepting OpenAlex API request for caching and optimization

    if (isDevelopmentEnvironment()) {
      return handleDevelopmentRequest({ request, url });
    }

    // Try static file first
    const staticResponse = await tryStaticFile(url);
    if (staticResponse) return staticResponse;

    // Try cache
    const cachedResponse = await tryCache({ request, url });
    if (cachedResponse) return cachedResponse;

    // Fetch from API
    // No cached response available, fetching from live OpenAlex API
    const response = await fetch(request);

    return validateAndCacheResponse({ request, response, url });
  } catch (error) {
    // Error in service worker, falling back to direct network request
    // Fallback to normal fetch
    return fetch(request);
  }
}
