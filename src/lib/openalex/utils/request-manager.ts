/**
 * RequestManager class for handling request deduplication and promise sharing
 * Prevents multiple concurrent requests for the same entity and manages request lifecycle
 */

/**
 * Configuration options for RequestManager
 */
export interface RequestManagerOptions {
  /** Maximum number of concurrent requests allowed */
  maxConcurrentRequests?: number;
  /** Request timeout in milliseconds */
  requestTimeout?: number;
  /** Whether to enable metrics collection */
  enableMetrics?: boolean;
  /** Custom key generator function */
  keyGenerator?: (key: string) => string;
}

/**
 * Statistics about request management
 */
export interface RequestManagerStats {
  /** Current number of active requests */
  activeRequests: number;
  /** Total number of requests made */
  totalRequests: number;
  /** Number of requests that were deduplicated */
  deduplicatedRequests: number;
  /** Number of completed requests */
  completedRequests: number;
  /** Number of failed requests */
  failedRequests: number;
  /** Average request duration in ms */
  averageRequestDuration?: number;
  /** Hit rate for deduplication (0-1) */
  deduplicationHitRate: number;
}

/**
 * Internal tracking information for active requests
 */
interface RequestInfo<T = unknown> {
  /** The promise for this request */
  promise: Promise<T>;
  /** Timestamp when request started */
  startTime: number;
  /** Number of times this request has been requested (for deduplication tracking) */
  referenceCount: number;
  /** Whether this request was cancelled */
  cancelled: boolean;
}

/**
 * Default configuration for RequestManager
 */
const DEFAULT_OPTIONS: Required<RequestManagerOptions> = {
  maxConcurrentRequests: 50,
  requestTimeout: 30000,
  enableMetrics: true,
  keyGenerator: (key: string) => key
};

/**
 * RequestManager handles request deduplication, promise sharing, and request lifecycle management
 * 
 * Features:
 * - Automatic deduplication of concurrent requests for the same key
 * - Promise sharing between multiple requesters
 * - Request cancellation and cleanup
 * - Comprehensive metrics and statistics
 * - Memory management and garbage collection
 * - Configurable concurrency limits
 */
export class RequestManager {
  private readonly options: Required<RequestManagerOptions>;
  private readonly activeRequests = new Map<string, RequestInfo>();
  private readonly stats = {
    totalRequests: 0,
    deduplicatedRequests: 0,
    completedRequests: 0,
    failedRequests: 0,
    totalDuration: 0
  };

  constructor(options: RequestManagerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Deduplicate a request by key, sharing promises between concurrent requests
   * 
   * @param key - Unique identifier for the request
   * @param executor - Function that executes the actual request
   * @returns Promise that resolves with the request result
   */
  async deduplicate<T>(key: string, executor: () => Promise<T>): Promise<T> {
    const normalizedKey = this.options.keyGenerator(key);
    
    // Increment total requests for metrics
    this.stats.totalRequests++;
    
    // Check if we already have an active request for this key
    const existingRequest = this.activeRequests.get(normalizedKey);
    if (existingRequest && !existingRequest.cancelled) {
      // Increment deduplication counter and reference count
      this.stats.deduplicatedRequests++;
      existingRequest.referenceCount++;
      
      console.debug(`[RequestManager] Deduplicating request for key: ${normalizedKey}`);
      
      // Return the existing promise
      return existingRequest.promise as Promise<T>;
    }

    // Check concurrency limits
    if (this.activeRequests.size >= this.options.maxConcurrentRequests) {
      console.warn(`[RequestManager] Max concurrent requests (${this.options.maxConcurrentRequests}) reached`);
      // For now, we'll still execute the request but log a warning
      // In a more sophisticated implementation, we might queue the request
    }

    console.debug(`[RequestManager] Starting new request for key: ${normalizedKey}`);

    // Create a new request
    const startTime = Date.now();
    const requestPromise = this.executeWithCleanup(normalizedKey, executor, startTime);
    
    // Store request info
    const requestInfo: RequestInfo<T> = {
      promise: requestPromise,
      startTime,
      referenceCount: 1,
      cancelled: false
    };
    
    this.activeRequests.set(normalizedKey, requestInfo);
    
    return requestPromise;
  }

  /**
   * Execute a request with automatic cleanup on completion or failure
   */
  private async executeWithCleanup<T>(
    key: string, 
    executor: () => Promise<T>, 
    startTime: number
  ): Promise<T> {
    try {
      // Execute the request with timeout if configured
      const result = await this.executeWithTimeout(executor);
      
      // Update success metrics based on reference count
      const requestInfo = this.activeRequests.get(key);
      const referenceCount = requestInfo?.referenceCount || 1;
      this.stats.completedRequests += referenceCount;
      this.updateDurationMetrics(startTime);
      
      console.debug(`[RequestManager] Request completed successfully for key: ${key}`);
      
      return result;
    } catch (error) {
      // Update failure metrics based on reference count
      const requestInfo = this.activeRequests.get(key);
      const referenceCount = requestInfo?.referenceCount || 1;
      this.stats.failedRequests += referenceCount;
      this.updateDurationMetrics(startTime);
      
      console.debug(`[RequestManager] Request failed for key: ${key}:`, error);
      
      throw error;
    } finally {
      // Always clean up the request from active requests
      this.cleanupRequest(key);
    }
  }

  /**
   * Execute request with optional timeout
   */
  private async executeWithTimeout<T>(executor: () => Promise<T>): Promise<T> {
    if (this.options.requestTimeout <= 0) {
      return executor();
    }

    return Promise.race([
      executor(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${this.options.requestTimeout}ms`));
        }, this.options.requestTimeout);
      })
    ]);
  }

  /**
   * Update duration metrics
   */
  private updateDurationMetrics(startTime: number): void {
    if (this.options.enableMetrics) {
      const duration = Date.now() - startTime;
      this.stats.totalDuration += duration;
    }
  }

  /**
   * Clean up a completed or failed request
   */
  private cleanupRequest(key: string): void {
    this.activeRequests.delete(key);
    console.debug(`[RequestManager] Cleaned up request for key: ${key}`);
  }

  /**
   * Check if there's an active request for the given key
   */
  hasActiveRequest(key: string): boolean {
    const normalizedKey = this.options.keyGenerator(key);
    const request = this.activeRequests.get(normalizedKey);
    return !!(request && !request.cancelled);
  }

  /**
   * Cancel a specific request by key
   */
  cancel(key: string): void {
    const normalizedKey = this.options.keyGenerator(key);
    const request = this.activeRequests.get(normalizedKey);
    
    if (request) {
      request.cancelled = true;
      this.cleanupRequest(normalizedKey);
      console.debug(`[RequestManager] Cancelled request for key: ${normalizedKey}`);
    }
  }

  /**
   * Cancel all active requests
   */
  cancelAll(): void {
    const keys = Array.from(this.activeRequests.keys());
    for (const key of keys) {
      this.cancel(key);
    }
    console.debug(`[RequestManager] Cancelled all ${keys.length} active requests`);
  }

  /**
   * Clear all requests and reset statistics
   */
  clear(): void {
    this.activeRequests.clear();
    this.stats.totalRequests = 0;
    this.stats.deduplicatedRequests = 0;
    this.stats.completedRequests = 0;
    this.stats.failedRequests = 0;
    this.stats.totalDuration = 0;
    console.debug('[RequestManager] Cleared all requests and statistics');
  }

  /**
   * Get current statistics about request management
   */
  getStats(): RequestManagerStats {
    const activeRequests = this.activeRequests.size;
    const totalRequests = this.stats.totalRequests;
    const deduplicatedRequests = this.stats.deduplicatedRequests;
    const completedRequests = this.stats.completedRequests;
    const failedRequests = this.stats.failedRequests;
    
    const averageRequestDuration = this.options.enableMetrics && completedRequests > 0
      ? this.stats.totalDuration / completedRequests
      : undefined;
    
    const deduplicationHitRate = totalRequests > 0
      ? deduplicatedRequests / totalRequests
      : 0;

    return {
      activeRequests,
      totalRequests,
      deduplicatedRequests,
      completedRequests,
      failedRequests,
      averageRequestDuration,
      deduplicationHitRate
    };
  }

  /**
   * Get detailed information about active requests (for debugging)
   */
  getActiveRequestsInfo(): Array<{
    key: string;
    startTime: number;
    duration: number;
    referenceCount: number;
    cancelled: boolean;
  }> {
    const now = Date.now();
    return Array.from(this.activeRequests.entries()).map(([key, info]) => ({
      key,
      startTime: info.startTime,
      duration: now - info.startTime,
      referenceCount: info.referenceCount,
      cancelled: info.cancelled
    }));
  }

  /**
   * Force cleanup of stale requests (requests that have been running too long)
   */
  cleanupStaleRequests(maxAgeMs: number = 60000): number {
    const now = Date.now();
    const staleKeys: string[] = [];
    
    for (const [key, info] of this.activeRequests.entries()) {
      if (now - info.startTime > maxAgeMs) {
        staleKeys.push(key);
      }
    }
    
    for (const key of staleKeys) {
      console.warn(`[RequestManager] Cleaning up stale request: ${key}`);
      this.cancel(key);
    }
    
    return staleKeys.length;
  }

  /**
   * Create a key for entity requests (utility method)
   */
  static createEntityKey(entityType: string, entityId: string, params?: Record<string, unknown>): string {
    const baseKey = `entity:${entityType}:${entityId}`;
    
    if (params && Object.keys(params).length > 0) {
      // Sort params for consistent key generation
      const sortedParams = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
          acc[key] = params[key];
          return acc;
        }, {} as Record<string, unknown>);
      
      return `${baseKey}:${JSON.stringify(sortedParams)}`;
    }
    
    return baseKey;
  }

  /**
   * Create a key for search requests (utility method)
   */
  static createSearchKey(endpoint: string, params: Record<string, unknown>): string {
    // Sort params for consistent key generation
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, unknown>);
    
    return `search:${endpoint}:${JSON.stringify(sortedParams)}`;
  }
}