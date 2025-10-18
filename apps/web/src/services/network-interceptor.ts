/**
 * Network request interceptor service
 * Globally monitors all HTTP requests and updates network activity store
 */

import { logger } from "@academic-explorer/utils/logger";
import { useNetworkActivityStore } from "@/stores/network-activity-store";
import type { NetworkRequest } from "@/stores/network-activity-store";

interface RequestContext {
  id: string;
  startTime: number;
  url: string;
  method: string;
  entityType: NetworkRequest["entityType"];
  category: NetworkRequest["category"];
}

/**
 * Global network interceptor for monitoring all HTTP requests
 */
export class NetworkInterceptor {
  private static instance: NetworkInterceptor | null = null;
  private originalFetch: typeof fetch;
  private originalXhrOpen: typeof XMLHttpRequest.prototype.open;
  private originalXhrSend: typeof XMLHttpRequest.prototype.send;
  private isInitialized = false;
  private activeRequests = new Map<string, RequestContext>();
  private xhrDataMap = new WeakMap<
    XMLHttpRequest,
    {
      url: string;
      method: string;
      entityType: NetworkRequest["entityType"];
      category: NetworkRequest["category"];
      requestId?: string;
    }
  >();

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== "undefined" && typeof window.fetch === "function") {
      this.originalFetch = window.fetch.bind(window);
      this.originalXhrOpen = XMLHttpRequest.prototype.open.bind(
        XMLHttpRequest.prototype,
      );
      this.originalXhrSend = XMLHttpRequest.prototype.send.bind(
        XMLHttpRequest.prototype,
      );
    } else {
      // Fallback for Node.js environment (tests)
      this.originalFetch = (() =>
        Promise.reject(
          new Error("fetch not available in Node.js"),
        )) satisfies typeof fetch;
      this.originalXhrOpen = function (
        _method: string,
        _url: string | URL,
        _async?: boolean,
        _user?: string | null,
        _password?: string | null,
      ): void {
        // No-op for Node.js environment
      } satisfies typeof XMLHttpRequest.prototype.open;
      this.originalXhrSend = function (
        _body?: Document | XMLHttpRequestBodyInit | null,
      ): void {
        // No-op for Node.js environment
      } satisfies typeof XMLHttpRequest.prototype.send;
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): NetworkInterceptor {
    NetworkInterceptor.instance ??= new NetworkInterceptor();
    return NetworkInterceptor.instance;
  }

  /**
   * Initialize global request interception
   */
  initialize(): void {
    if (this.isInitialized) {
      logger.warn(
        "api",
        "Network interceptor already initialized",
        {},
        "NetworkInterceptor",
      );
      return;
    }

    // Only initialize in browser environment
    if (typeof window !== "undefined" && typeof window.fetch === "function") {
      this.interceptFetch();
      this.interceptXHR();
      this.isInitialized = true;
      logger.debug(
        "api",
        "Network interceptor initialized",
        {},
        "NetworkInterceptor",
      );
    } else {
      logger.warn(
        "api",
        "Network interceptor skipped - not in browser environment",
        {},
        "NetworkInterceptor",
      );
    }
  }

  /**
   * Cleanup and restore original methods
   */
  cleanup(): void {
    if (!this.isInitialized) return;

    window.fetch = this.originalFetch;
    XMLHttpRequest.prototype.open = this.originalXhrOpen;
    XMLHttpRequest.prototype.send = this.originalXhrSend;

    this.activeRequests.clear();
    this.isInitialized = false;

    logger.debug(
      "api",
      "Network interceptor cleaned up",
      {},
      "NetworkInterceptor",
    );
  }

  /**
   * Intercept fetch requests
   */
  private interceptFetch(): void {
    window.fetch = (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const method = init?.method ?? "GET";

      const requestInfo = this.createRequestInfo({
        url,
        method,
        headers: init?.headers,
      });
      const store = useNetworkActivityStore.getState();

      const requestId = store.addRequest({
        entityType: this.detectRequestType(url),
        category: this.detectRequestCategory({ url, headers: init?.headers }),
        url,
        method,
        status: "pending",
      });

      this.activeRequests.set(requestId, {
        id: requestId,
        startTime: Date.now(),
        url,
        method,
        entityType: requestInfo.entityType,
        category: requestInfo.category,
      });

      return this.originalFetch(input, init)
        .then((response) => {
          try {
            // Calculate response size if possible
            const contentLength = response.headers.get("content-length");
            const size = contentLength
              ? parseInt(contentLength, 10)
              : undefined;

            store.completeRequest(requestId, response.status, size);

            logger.debug(
              "api",
              "Fetch request completed",
              {
                requestId,
                url,
                status: response.status,
                size,
              },
              "NetworkInterceptor",
            );
          } catch (error) {
            logger.warn(
              "api",
              "Error processing fetch response",
              {
                requestId,
                error: error instanceof Error ? error.message : String(error),
              },
              "NetworkInterceptor",
            );
          }

          this.activeRequests.delete(requestId);
          return response;
        })
        .catch((error: unknown) => {
          store.failRequest(
            requestId,
            error instanceof Error ? error.message : String(error),
          );

          logger.error(
            "api",
            "Fetch request failed",
            {
              requestId,
              url,
              error: error instanceof Error ? error.message : String(error),
            },
            "NetworkInterceptor",
          );

          this.activeRequests.delete(requestId);
          throw error;
        });
    };
  }

  /**
   * Intercept XMLHttpRequest
   */
  private interceptXHR(): void {
    const originalOpen = this.originalXhrOpen;
    const originalSend = this.originalXhrSend;
    const createRequestInfo = this.createRequestInfo.bind(this);
    const { activeRequests, xhrDataMap } = this;

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async?: boolean,
      user?: string | null,
      password?: string | null,
    ) {
      const urlString = typeof url === "string" ? url : url.toString();
      const requestInfo = createRequestInfo({ url: urlString, method });

      // Store request info using WeakMap for type safety
      xhrDataMap.set(this, {
        url: urlString,
        method,
        entityType: requestInfo.entityType,
        category: requestInfo.category,
      });

      originalOpen.call(this, method, url, async ?? true, user, password);
    };

    XMLHttpRequest.prototype.send = function (
      body?: Document | XMLHttpRequestBodyInit | null,
    ) {
      // Access request data from WeakMap for type safety
      const requestData = xhrDataMap.get(this);

      if (requestData) {
        const store = useNetworkActivityStore.getState();
        const requestId = store.addRequest({
          entityType: requestData.entityType,
          category: requestData.category,
          url: requestData.url,
          method: requestData.method,
          status: "pending",
        });

        activeRequests.set(requestId, {
          id: requestId,
          startTime: Date.now(),
          url: requestData.url,
          method: requestData.method,
          entityType: requestData.entityType,
          category: requestData.category,
        });

        // Store request ID in WeakMap for completion tracking
        const updatedData = { ...requestData, requestId };
        xhrDataMap.set(this, updatedData);

        // Override readystatechange handler
        const originalReadyStateChange = this.onreadystatechange;
        this.onreadystatechange = function (event) {
          if (this.readyState === 4) {
            // Request completed
            // Access request data from WeakMap for type safety
            const xhrData = xhrDataMap.get(this);
            const finalRequestId = xhrData?.requestId;
            if (finalRequestId) {
              if (this.status >= 200 && this.status < 300) {
                // Calculate response size
                const responseSize = this.responseText
                  ? this.responseText.length
                  : 0;
                store.completeRequest(
                  finalRequestId,
                  this.status,
                  responseSize,
                );

                logger.debug(
                  "api",
                  "XHR request completed",
                  {
                    requestId: finalRequestId,
                    url: xhrData.url || "unknown",
                    status: this.status,
                    size: responseSize,
                  },
                  "NetworkInterceptor",
                );
              } else {
                store.failRequest(
                  finalRequestId,
                  this.statusText || "Request failed",
                  this.status,
                );

                logger.error(
                  "api",
                  "XHR request failed",
                  {
                    requestId: finalRequestId,
                    url: xhrData.url || "unknown",
                    status: this.status,
                    statusText: this.statusText,
                  },
                  "NetworkInterceptor",
                );
              }

              activeRequests.delete(finalRequestId);
            }
          }

          // Call original handler
          if (originalReadyStateChange) {
            originalReadyStateChange.call(this, event);
          }
        };
      }

      originalSend.call(this, body);
    };
  }

  /**
   * Create request info with type and category detection
   */
  private createRequestInfo({
    url,
    method: _method,
    headers,
  }: {
    url: string;
    method: string;
    headers?: HeadersInit;
  }): {
    entityType: NetworkRequest["entityType"];
    category: NetworkRequest["category"];
  } {
    return {
      entityType: this.detectRequestType(url),
      category: this.detectRequestCategory({ url, headers }),
    };
  }

  /**
   * Detect request type based on URL
   */
  private detectRequestType(url: string): NetworkRequest["entityType"] {
    if (url.includes("openalex.org") || url.includes("/api/")) {
      return "api";
    }
    if (url.includes("cache") || url.includes("IndexedDB")) {
      return "cache";
    }
    if (url.includes("worker") || url.includes(".worker.")) {
      return "worker";
    }
    return "resource";
  }

  /**
   * Detect request category (foreground vs background)
   */
  private detectRequestCategory({
    url,
    headers,
  }: {
    url: string;
    headers?: HeadersInit;
  }): NetworkRequest["category"] {
    // Check for worker User-Agent first
    if (headers) {
      const userAgent = this.getHeaderValue({ headers, key: "User-Agent" });
      if (userAgent?.includes("data-fetching-worker")) {
        return "background";
      }
    }

    // Consider API requests as foreground by default
    // Background requests are typically cache operations or worker communications
    if (url.includes("cache") || url.includes("worker")) {
      return "background";
    }
    return "foreground";
  }

  /**
   * Get header value from HeadersInit (Headers, Record, or array)
   */
  private getHeaderValue({
    headers,
    key,
  }: {
    headers: HeadersInit;
    key: string;
  }): string | null {
    if (headers instanceof Headers) {
      return headers.get(key);
    }
    if (Array.isArray(headers)) {
      const found = headers.find(
        ([k]) => k.toLowerCase() === key.toLowerCase(),
      );
      return found ? found[1] : null;
    }
    if (typeof headers === "object") {
      const record = headers;
      return record[key] || null;
    }
    return null;
  }

  /**
   * Track cache operation (called externally by cache services)
   */
  trackCacheOperation(
    operation: "read" | "write" | "delete",
    key: string,
    hit: boolean,
    size?: number,
  ): void {
    const store = useNetworkActivityStore.getState();

    const requestId = store.addRequest({
      entityType: "cache",
      category: "background",
      url: `cache://${operation}/${key}`,
      method: operation.toUpperCase(),
      status: hit ? "cached" : "success",
      metadata: {
        fromCache: hit,
      },
    });

    // Complete immediately for cache operations
    store.completeRequest(requestId, 200, size);

    logger.debug(
      "cache",
      "Cache operation tracked",
      {
        requestId,
        operation,
        key,
        hit,
        size,
      },
      "NetworkInterceptor",
    );
  }

  /**
   * Track worker operation (called externally by worker services)
   */
  trackWorkerOperation(
    operation: string,
    data?: unknown,
    entityType?: string,
    entityId?: string,
  ): string {
    const store = useNetworkActivityStore.getState();

    const requestId = store.addRequest({
      entityType: "worker",
      category: "background",
      url: `worker://${operation}`,
      method: "POST",
      status: "pending",
      ...(entityType && {
        metadata: {
          entityType,
          ...(entityId && { entityId }),
        },
      }),
    });

    logger.debug(
      "api",
      "Worker operation started",
      {
        requestId,
        operation,
        entityType,
        entityId,
      },
      "NetworkInterceptor",
    );

    return requestId;
  }

  /**
   * Track request deduplication
   */
  trackDeduplication({
    url,
    entityId,
  }: {
    url: string;
    entityId?: string;
  }): void {
    const store = useNetworkActivityStore.getState();

    store.addRequest({
      entityType: "api",
      category: "foreground",
      url,
      method: "GET",
      status: "deduplicated",
      metadata: {
        deduplicated: true,
        ...(entityId && { entityId }),
      },
    });

    logger.debug(
      "cache",
      "Request deduplication tracked",
      {
        url,
        entityId,
      },
      "NetworkInterceptor",
    );
  }

  /**
   * Get current statistics
   */
  getStats(): {
    activeRequests: number;
    totalTracked: number;
    isInitialized: boolean;
  } {
    return {
      activeRequests: this.activeRequests.size,
      totalTracked: this.activeRequests.size,
      isInitialized: this.isInitialized,
    };
  }
}

/**
 * Global instance for easy access
 */
export const networkInterceptor = NetworkInterceptor.getInstance();

/**
 * Helper functions for external services
 */
export const trackCacheOperation = (
  operation: "read" | "write" | "delete",
  key: string,
  hit: boolean,
  size?: number,
) => {
  networkInterceptor.trackCacheOperation(operation, key, hit, size);
};

export const trackWorkerOperation = (
  operation: string,
  data?: unknown,
  entityType?: string,
  entityId?: string,
) =>
  networkInterceptor.trackWorkerOperation(
    operation,
    data,
    entityType,
    entityId,
  );

export const trackDeduplication = ({
  url,
  entityId,
}: {
  url: string;
  entityId?: string;
}) => {
  networkInterceptor.trackDeduplication({ url, entityId });
};

/**
 * Initialize network monitoring (call this in app initialization)
 */
export const initializeNetworkMonitoring = () => {
  networkInterceptor.initialize();
};

/**
 * Cleanup network monitoring (call this in app cleanup)
 */
export const cleanupNetworkMonitoring = () => {
  networkInterceptor.cleanup();
};
