/**
 * Caching layer for OpenAlex API responses
 * Integrates with IndexedDB for persistent storage
 */

import type { ApiResponse } from '../types';

// Lazy import db to avoid initialization issues in tests
let db: any = null;
async function getDb() {
  if (!db) {
    try {
      const dbModule = await import('@/lib/db');
      db = dbModule.db;
    } catch (error) {
      // In test environment, db might not be available
      console.warn('Database not available:', error);
      db = {
        cacheSearchResults: () => Promise.resolve(),
        getSearchResults: () => Promise.resolve(null),
      };
    }
  }
  return db;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  useMemory?: boolean; // Use in-memory cache
  useIndexedDB?: boolean; // Use IndexedDB
  namespace?: string; // Cache namespace
}

export class CacheManager {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private options: Required<CacheOptions>;
  
  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl || 24 * 60 * 60 * 1000, // 24 hours default
      useMemory: options.useMemory !== false,
      useIndexedDB: options.useIndexedDB !== false,
      namespace: options.namespace || 'openalex',
    };
  }

  // Generate cache key from endpoint and params
  private getCacheKey(endpoint: string, params: Record<string, unknown> = {}): string {
    // Handle null/undefined params
    const safeParams = params || {};
    const sortedParams = Object.keys(safeParams)
      .sort()
      .reduce((acc, key) => {
        acc[key] = safeParams[key];
        return acc;
      }, {} as Record<string, unknown>);
    
    return `${this.options.namespace}:${endpoint}:${JSON.stringify(sortedParams)}`;
  }

  // Check if cache entry is still valid
  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.options.ttl;
  }

  // Get from cache
  async get<T>(endpoint: string, params: Record<string, unknown> = {}): Promise<T | null> {
    const key = this.getCacheKey(endpoint, params);
    
    // Try memory cache first
    if (this.options.useMemory) {
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && this.isValid(memoryEntry)) {
        return memoryEntry.data as T;
      }
      // Remove expired entry from memory
      if (memoryEntry) {
        this.memoryCache.delete(key);
      }
    }
    
    // Try IndexedDB
    if (this.options.useIndexedDB) {
      try {
        const database = await getDb();
        const cached = await database.getSearchResults(key, params, this.options.ttl);
        if (cached && cached.results) {
          // Also store in memory cache for faster access
          if (this.options.useMemory) {
            this.memoryCache.set(key, {
              data: cached,
              timestamp: cached.timestamp,
            });
          }
          return cached as unknown as T;
        }
      } catch (error) {
        console.error('Failed to get from IndexedDB cache:', error);
      }
    }
    
    return null;
  }

  // Set in cache
  async set<T>(
    endpoint: string,
    params: Record<string, unknown>,
    data: T
  ): Promise<void> {
    const key = this.getCacheKey(endpoint, params);
    const timestamp = Date.now();
    
    // Store in memory cache
    if (this.options.useMemory) {
      this.memoryCache.set(key, { data, timestamp });
      
      // Implement LRU eviction if cache gets too large
      if (this.memoryCache.size > 100) {
        const firstKey = this.memoryCache.keys().next().value;
        if (firstKey) {
          this.memoryCache.delete(firstKey);
        }
      }
    }
    
    // Store in IndexedDB
    if (this.options.useIndexedDB && isApiResponse(data)) {
      try {
        const database = await getDb();
        await database.cacheSearchResults(
          key,
          data.results,
          data.meta.count,
          params
        );
      } catch (error) {
        console.error('Failed to store in IndexedDB cache:', error);
      }
    }
  }

  // Delete from cache
  async delete(endpoint: string, params: Record<string, unknown> = {}): Promise<void> {
    const key = this.getCacheKey(endpoint, params);
    
    // Remove from memory cache
    if (this.options.useMemory) {
      this.memoryCache.delete(key);
    }
    
    // Note: IndexedDB deletion would need to be implemented in db.ts
    // For now, entries will expire based on TTL
  }

  // Clear all cache
  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();
    
    // Clear IndexedDB cache
    if (this.options.useIndexedDB) {
      try {
        const database = await getDb();
        await database.cleanOldSearchResults(0); // Remove all
      } catch (error) {
        console.error('Failed to clear IndexedDB cache:', error);
      }
    }
  }

  // Get cache statistics
  getStats(): CacheStats {
    let memorySize = 0;
    let memoryEntries = 0;
    let validEntries = 0;
    
    this.memoryCache.forEach(entry => {
      memoryEntries++;
      if (this.isValid(entry)) {
        validEntries++;
      }
      // Rough estimate of memory size
      memorySize += JSON.stringify(entry.data).length;
    });
    
    return {
      memoryEntries,
      validEntries,
      memorySize,
      hitRate: this.calculateHitRate(),
    };
  }

  // Track cache hits/misses for metrics
  private hits = 0;
  private misses = 0;

  recordHit(): void {
    this.hits++;
  }

  recordMiss(): void {
    this.misses++;
  }

  private calculateHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }
}

// Cache entry structure
interface CacheEntry {
  data: unknown;
  timestamp: number;
}

// Cache statistics
interface CacheStats {
  memoryEntries: number;
  validEntries: number;
  memorySize: number;
  hitRate: number;
}

// Type guard for API response
function isApiResponse(data: unknown): data is ApiResponse<unknown> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'meta' in data &&
    'results' in data
  );
}

// Decorator for caching method results
export function cached(options: CacheOptions = {}) {
  const cache = new CacheManager(options);
  
  return function (
    target: unknown,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: unknown[]) {
      // Create cache key from method name and arguments
      const endpoint = `${(target as Record<string, unknown>).constructor.name}.${propertyName}`;
      const params = args.length > 0 ? args[0] : {};
      
      // Try to get from cache
      const cached = await cache.get(endpoint, params as Record<string, unknown>);
      if (cached) {
        cache.recordHit();
        return cached;
      }
      
      // Call original method
      cache.recordMiss();
      const result = await originalMethod.apply(this, args);
      
      // Store in cache
      await cache.set(endpoint, params as Record<string, unknown>, result);
      
      return result;
    };
    
    return descriptor;
  };
}

// Request deduplication to prevent duplicate parallel requests
export class RequestDeduplicator {
  private pending: Map<string, Promise<unknown>> = new Map();
  
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Check if request is already pending
    const pending = this.pending.get(key);
    if (pending) {
      return pending as Promise<T>;
    }
    
    // Create new request
    const promise = requestFn().finally(() => {
      this.pending.delete(key);
    });
    
    this.pending.set(key, promise);
    return promise;
  }
  
  clear(): void {
    this.pending.clear();
  }
}

// Batch request queue for optimising API calls
export class BatchQueue<T, R> {
  private queue: Array<{ item: T; resolve: (result: R) => void; reject: (error: unknown) => void }> = [];
  private timer: NodeJS.Timeout | null = null;
  
  constructor(
    private batchProcessor: (items: T[]) => Promise<R[]>,
    private batchSize = 50,
    private batchDelay = 100
  ) {}
  
  async add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject });
      
      if (this.queue.length >= this.batchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.batchDelay);
      }
    });
  }
  
  private async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0, this.batchSize);
    const items = batch.map(b => b.item);
    
    try {
      const results = await this.batchProcessor(items);
      batch.forEach((b, i) => b.resolve(results[i]));
    } catch (error) {
      batch.forEach(b => b.reject(error));
    }
    
    // Process remaining items
    if (this.queue.length > 0) {
      this.flush();
    }
  }
  
  async flushAll(): Promise<void> {
    while (this.queue.length > 0) {
      await this.flush();
    }
  }
  
  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.queue = [];
  }
}

// Export singleton instances for convenience
export const defaultCache = new CacheManager();
export const requestDeduplicator = new RequestDeduplicator();