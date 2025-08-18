/**
 * Caching layer for OpenAlex API responses
 * Integrates with IndexedDB for persistent storage
 */

import type { ApiResponse } from '../types';

// Lazy import db to avoid initialization issues in tests
let db: unknown = null;
// Type guard for database object
function isDbObject(obj: unknown): obj is {
  cacheSearchResults: (key: string, results: unknown[], count: number, params: Record<string, unknown>) => Promise<void>;
  getSearchResults: (key: string, params: Record<string, unknown>, ttl: number) => Promise<{ results: unknown[]; timestamp: number } | null>;
  cleanOldSearchResults: (ageInMs: number) => Promise<void>;
} {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'cacheSearchResults' in obj &&
    'getSearchResults' in obj &&
    'cleanOldSearchResults' in obj
  );
}

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
        cleanOldSearchResults: () => Promise.resolve(),
      };
    }
  }
  return isDbObject(db) ? db : {
    cacheSearchResults: () => Promise.resolve(),
    getSearchResults: () => Promise.resolve(null),
    cleanOldSearchResults: () => Promise.resolve(),
  };
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  useMemory?: boolean; // Use in-memory cache
  useLocalStorage?: boolean; // Use localStorage
  useIndexedDB?: boolean; // Use IndexedDB
  namespace?: string; // Cache namespace
  localStorageLimit?: number; // Max size for localStorage in bytes
}

export class CacheManager {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private options: Required<CacheOptions>;
  
  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl || 24 * 60 * 60 * 1000, // 24 hours default
      useMemory: options.useMemory !== false,
      useLocalStorage: options.useLocalStorage !== false,
      useIndexedDB: options.useIndexedDB !== false,
      namespace: options.namespace || 'openalex',
      localStorageLimit: options.localStorageLimit || 5 * 1024 * 1024, // 5MB default
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

  // localStorage helpers
  private getLocalStorageKey(key: string): string {
    return `${this.options.namespace}:${key}`;
  }

  private getFromLocalStorage(key: string): CacheEntry | null {
    if (!this.options.useLocalStorage) return null;
    
    try {
      const lsKey = this.getLocalStorageKey(key);
      const stored = localStorage.getItem(lsKey);
      if (!stored) return null;
      
      const entry: CacheEntry = JSON.parse(stored);
      return this.isValid(entry) ? entry : null;
    } catch (error) {
      console.warn('localStorage get error:', error);
      return null;
    }
  }

  private setToLocalStorage(key: string, entry: CacheEntry): boolean {
    if (!this.options.useLocalStorage) return false;
    
    try {
      const lsKey = this.getLocalStorageKey(key);
      const serialized = JSON.stringify(entry);
      
      // Check if this would exceed localStorage limit
      const currentSize = this.getLocalStorageSize();
      const newEntrySize = serialized.length + lsKey.length;
      
      if (currentSize + newEntrySize > this.options.localStorageLimit) {
        // Try to make space by removing old entries
        if (!this.evictOldLocalStorageEntries(newEntrySize)) {
          return false; // Still no space, store in IndexedDB instead
        }
      }
      
      localStorage.setItem(lsKey, serialized);
      return true;
    } catch (error) {
      console.warn('localStorage set error:', error);
      return false;
    }
  }

  private getLocalStorageSize(): number {
    let totalSize = 0;
    const prefix = `${this.options.namespace}:`;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    }
    
    return totalSize;
  }

  private evictOldLocalStorageEntries(spaceNeeded: number): boolean {
    const prefix = `${this.options.namespace}:`;
    const entries: { key: string; timestamp: number; size: number }[] = [];
    
    // Collect all our cache entries with timestamps
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const entry: CacheEntry = JSON.parse(value);
            entries.push({
              key,
              timestamp: entry.timestamp,
              size: key.length + value.length
            });
          } catch {
            // Invalid entry, remove it
            localStorage.removeItem(key);
          }
        }
      }
    }
    
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove entries until we have enough space
    let freedSpace = 0;
    for (const entry of entries) {
      localStorage.removeItem(entry.key);
      freedSpace += entry.size;
      
      if (freedSpace >= spaceNeeded) {
        return true;
      }
    }
    
    return freedSpace >= spaceNeeded;
  }

  // Get from cache using optimal hierarchy: Memory -> localStorage -> IndexedDB
  async get<T>(endpoint: string, params: Record<string, unknown> = {}): Promise<T | null> {
    const key = this.getCacheKey(endpoint, params);
    
    // 1. Try memory cache first (fastest)
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
    
    // 2. Try localStorage (fast, synchronous)
    if (this.options.useLocalStorage) {
      const localEntry = this.getFromLocalStorage(key);
      if (localEntry) {
        // Also store in memory cache for even faster next access
        if (this.options.useMemory) {
          this.memoryCache.set(key, localEntry);
        }
        return localEntry.data as T;
      }
    }
    
    // 3. Try IndexedDB (slower, high capacity)
    if (this.options.useIndexedDB) {
      try {
        const database = await getDb();
        const cached = await database.getSearchResults(key, params, this.options.ttl);
        if (cached && cached.results) {
          const entry: CacheEntry = {
            data: cached,
            timestamp: cached.timestamp,
          };
          
          // Promote to faster storage layers
          if (this.options.useMemory) {
            this.memoryCache.set(key, entry);
          }
          if (this.options.useLocalStorage) {
            this.setToLocalStorage(key, entry);
          }
          
          return cached as unknown as T;
        }
      } catch (error) {
        console.error('Failed to get from IndexedDB cache:', error);
      }
    }
    
    return null;
  }

  // Set in cache using intelligent storage strategy
  async set<T>(
    endpoint: string,
    params: Record<string, unknown>,
    data: T
  ): Promise<void> {
    const key = this.getCacheKey(endpoint, params);
    const timestamp = Date.now();
    const entry: CacheEntry = { data, timestamp };
    
    // Always store in memory cache (fastest)
    if (this.options.useMemory) {
      this.memoryCache.set(key, entry);
      
      // Implement LRU eviction if cache gets too large
      if (this.memoryCache.size > 100) {
        const firstKey = this.memoryCache.keys().next().value;
        if (firstKey) {
          this.memoryCache.delete(firstKey);
        }
      }
    }
    
    // Try localStorage first (fast, moderate capacity)
    let storedInLocalStorage = false;
    if (this.options.useLocalStorage) {
      storedInLocalStorage = this.setToLocalStorage(key, entry);
    }
    
    // If localStorage failed/full or disabled, use IndexedDB (high capacity)
    if (!storedInLocalStorage && this.options.useIndexedDB && isApiResponse(data)) {
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
    
    // For non-API response data that couldn't fit in localStorage, try IndexedDB anyway
    if (!storedInLocalStorage && this.options.useIndexedDB && !isApiResponse(data)) {
      // For non-API data, we need a different storage approach in IndexedDB
      // This could be enhanced to handle individual entities, etc.
      console.debug('Non-API response data too large for localStorage, consider IndexedDB enhancement');
    }
  }

  // Delete from cache across all layers
  async delete(endpoint: string, params: Record<string, unknown> = {}): Promise<void> {
    const key = this.getCacheKey(endpoint, params);
    
    // Remove from memory cache
    if (this.options.useMemory) {
      this.memoryCache.delete(key);
    }
    
    // Remove from localStorage
    if (this.options.useLocalStorage) {
      const lsKey = this.getLocalStorageKey(key);
      localStorage.removeItem(lsKey);
    }
    
    // Note: IndexedDB deletion would need to be implemented in db.ts
    // For now, entries will expire based on TTL
  }

  // Clear all cache across all layers
  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();
    
    // Clear localStorage cache
    if (this.options.useLocalStorage) {
      const prefix = `${this.options.namespace}:`;
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
    
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

  // Get cache statistics across all layers
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
    
    // Get localStorage stats
    const localStorageSize = this.getLocalStorageSize();
    let localStorageEntries = 0;
    
    if (this.options.useLocalStorage) {
      const prefix = `${this.options.namespace}:`;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          localStorageEntries++;
        }
      }
    }
    
    return {
      memoryEntries,
      validEntries,
      memorySize,
      localStorageEntries,
      localStorageSize,
      localStorageLimit: this.options.localStorageLimit,
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

// Cache statistics across all layers
interface CacheStats {
  memoryEntries: number;
  validEntries: number;
  memorySize: number;
  localStorageEntries: number;
  localStorageSize: number;
  localStorageLimit: number;
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