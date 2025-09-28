/**
 * Cache Integration Tests - Cache Tier Fallbacks and Coordination
 *
 * Tests for the multi-tier caching system coordination including:
 * - Memory cache (L1)
 * - Local storage cache (L2)
 * - IndexedDB cache (L3)
 * - Disk cache (Development, L4)
 * - GitHub Pages cache (Production, L4)
 * - OpenAlex API (Ultimate fallback)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock various cache implementations
const mockMemoryCache = {
  get: vi.fn(),
  set: vi.fn(),
  has: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  size: 0
};

const mockLocalStorageCache = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

const mockIndexedDBCache = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  count: vi.fn()
};

const mockDiskCache = {
  read: vi.fn(),
  write: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn()
};

const mockGitHubPagesCache = {
  read: vi.fn(),
  readBatch: vi.fn(),
  isAvailable: vi.fn()
};

const mockApiClient = {
  get: vi.fn(),
  getById: vi.fn()
};

// Mock environment detection
const mockEnvironment = {
  isDevelopment: vi.fn(() => false),
  isProduction: vi.fn(() => true),
  isTest: vi.fn(() => false)
};

// Types for cache system
interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
  source: 'memory' | 'localStorage' | 'indexedDB' | 'disk' | 'githubPages' | 'api';
  metadata: {
    entityType: string;
    entityId: string;
    version: string;
  };
}

interface CacheConfig {
  memory: {
    enabled: boolean;
    maxSize: number;
    ttl: number;
  };
  localStorage: {
    enabled: boolean;
    maxSize: number;
    ttl: number;
  };
  indexedDB: {
    enabled: boolean;
    maxSize: number;
    ttl: number;
  };
  disk: {
    enabled: boolean;
    basePath: string;
    ttl: number;
  };
  githubPages: {
    enabled: boolean;
    baseUrl: string;
    fallbackToApi: boolean;
  };
  api: {
    enabled: boolean;
    baseUrl: string;
    rateLimit: number;
  };
}

// Mock integrated cache system
class MockIntegratedCache {
  private config: CacheConfig;
  private stats = {
    hits: { memory: 0, localStorage: 0, indexedDB: 0, disk: 0, githubPages: 0 },
    misses: { memory: 0, localStorage: 0, indexedDB: 0, disk: 0, githubPages: 0, api: 0 },
    writes: { memory: 0, localStorage: 0, indexedDB: 0, disk: 0 },
    errors: { memory: 0, localStorage: 0, indexedDB: 0, disk: 0, githubPages: 0, api: 0 }
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      memory: { enabled: true, maxSize: 100, ttl: 5 * 60 * 1000 },
      localStorage: { enabled: true, maxSize: 50, ttl: 30 * 60 * 1000 },
      indexedDB: { enabled: true, maxSize: 1000, ttl: 24 * 60 * 60 * 1000 },
      disk: { enabled: mockEnvironment.isDevelopment(), basePath: '/tmp/cache', ttl: 7 * 24 * 60 * 60 * 1000 },
      githubPages: { enabled: mockEnvironment.isProduction(), baseUrl: 'https://site.github.io', fallbackToApi: true },
      api: { enabled: true, baseUrl: 'https://api.openalex.org', rateLimit: 10 },
      ...config
    };
  }

  async get(key: string): Promise<unknown | null> {
    const [entityType, entityId] = key.split(':');

    // L1: Memory cache
    if (this.config.memory.enabled) {
      try {
        if (mockMemoryCache.has(key)) {
          const entry = mockMemoryCache.get(key) as CacheEntry;
          if (this.isValidEntry(entry)) {
            this.stats.hits.memory++;
            return entry.data;
          }
        }
        this.stats.misses.memory++;
      } catch {
        this.stats.errors.memory++;
      }
    }

    // L2: Local Storage cache
    if (this.config.localStorage.enabled) {
      try {
        const stored = mockLocalStorageCache.getItem(`cache:${key}`);
        if (stored) {
          const entry: CacheEntry = JSON.parse(stored);
          if (this.isValidEntry(entry)) {
            this.stats.hits.localStorage++;
            // Promote to memory cache
            await this.setMemoryCache(key, entry);
            return entry.data;
          }
        }
        this.stats.misses.localStorage++;
      } catch {
        this.stats.errors.localStorage++;
      }
    }

    // L3: IndexedDB cache
    if (this.config.indexedDB.enabled) {
      try {
        const entry = await mockIndexedDBCache.get(key) as CacheEntry | undefined;
        if (entry && this.isValidEntry(entry)) {
          this.stats.hits.indexedDB++;
          // Promote to higher cache tiers
          await this.setLocalStorageCache(key, entry);
          await this.setMemoryCache(key, entry);
          return entry.data;
        }
        this.stats.misses.indexedDB++;
      } catch {
        this.stats.errors.indexedDB++;
      }
    }

    // L4a: Disk cache (Development)
    if (this.config.disk.enabled && mockEnvironment.isDevelopment()) {
      try {
        const data = await mockDiskCache.read(key);
        if (data !== null) {
          this.stats.hits.disk++;
          const entry: CacheEntry = {
            data,
            timestamp: Date.now(),
            ttl: this.config.disk.ttl,
            source: 'disk',
            metadata: { entityType, entityId, version: '1.0' }
          };
          // Promote to all higher tiers
          await this.populateHigherTiers(key, entry);
          return data;
        }
        this.stats.misses.disk++;
      } catch {
        this.stats.errors.disk++;
      }
    }

    // L4b: GitHub Pages cache (Production)
    if (this.config.githubPages.enabled && mockEnvironment.isProduction()) {
      try {
        const data = await mockGitHubPagesCache.read(key);
        if (data !== null) {
          this.stats.hits.githubPages++;
          const entry: CacheEntry = {
            data,
            timestamp: Date.now(),
            ttl: this.config.indexedDB.ttl, // Use IndexedDB TTL for static data
            source: 'githubPages',
            metadata: { entityType, entityId, version: '1.0' }
          };
          // Promote to all higher tiers except disk (production mode)
          await this.populateHigherTiers(key, entry, { excludeDisk: true });
          return data;
        }
        this.stats.misses.githubPages++;
      } catch {
        this.stats.errors.githubPages++;
      }
    }

    // L5: OpenAlex API (Ultimate fallback)
    if (this.config.api.enabled) {
      try {
        const data = await this.fetchFromApi(entityType, entityId);
        if (data !== null) {
          const entry: CacheEntry = {
            data,
            timestamp: Date.now(),
            ttl: this.config.memory.ttl,
            source: 'api',
            metadata: { entityType, entityId, version: '1.0' }
          };
          // Populate all cache tiers
          await this.populateAllTiers(key, entry);
          return data;
        }
        this.stats.misses.api++;
      } catch {
        this.stats.errors.api++;
      }
    }

    return null;
  }

  async getBatch(keys: string[]): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>();
    const missingKeys: string[] = [];

    // Try to get as many as possible from cache tiers
    for (const key of keys) {
      const cached = await this.getFromCacheTiers(key);
      if (cached !== null) {
        results.set(key, cached);
      } else {
        missingKeys.push(key);
      }
    }

    // Batch fetch missing keys from static sources
    if (missingKeys.length > 0) {
      const batchResults = await this.batchFetchMissing(missingKeys);
      for (const [key, value] of batchResults) {
        results.set(key, value);
      }
    }

    return results;
  }

  async set(key: string, data: unknown, options: { ttl?: number; source?: string } = {}): Promise<void> {
    const [entityType, entityId] = key.split(':');
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: options.ttl || this.config.memory.ttl,
      source: (options.source as any) || 'api',
      metadata: { entityType, entityId, version: '1.0' }
    };

    await this.populateAllTiers(key, entry);
  }

  async invalidate(key: string): Promise<void> {
    // Remove from all cache tiers
    if (this.config.memory.enabled) {
      mockMemoryCache.delete(key);
    }

    if (this.config.localStorage.enabled) {
      mockLocalStorageCache.removeItem(`cache:${key}`);
    }

    if (this.config.indexedDB.enabled) {
      await mockIndexedDBCache.delete(key);
    }

    if (this.config.disk.enabled) {
      await mockDiskCache.delete(key);
    }
  }

  async clear(): Promise<void> {
    // Clear all cache tiers
    if (this.config.memory.enabled) {
      mockMemoryCache.clear();
    }

    if (this.config.localStorage.enabled) {
      mockLocalStorageCache.clear();
    }

    if (this.config.indexedDB.enabled) {
      await mockIndexedDBCache.clear();
    }

    if (this.config.disk.enabled) {
      await mockDiskCache.clear();
    }
  }

  getStats() {
    return { ...this.stats };
  }

  private isValidEntry(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private async getFromCacheTiers(key: string): Promise<unknown | null> {
    // Try cache tiers without API fallback
    const originalApiEnabled = this.config.api.enabled;
    this.config.api.enabled = false;

    const result = await this.get(key);

    this.config.api.enabled = originalApiEnabled;
    return result;
  }

  private async batchFetchMissing(keys: string[]): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>();

    // Try GitHub Pages batch first (Production)
    if (this.config.githubPages.enabled && mockEnvironment.isProduction()) {
      try {
        const batchResults = await mockGitHubPagesCache.readBatch(keys);
        for (const [key, value] of batchResults) {
          results.set(key, value);

          // Cache the result
          const [entityType, entityId] = key.split(':');
          const entry: CacheEntry = {
            data: value,
            timestamp: Date.now(),
            ttl: this.config.indexedDB.ttl,
            source: 'githubPages',
            metadata: { entityType, entityId, version: '1.0' }
          };
          await this.populateHigherTiers(key, entry, { excludeDisk: true });
        }
      } catch {
        this.stats.errors.githubPages++;
      }
    }

    // Fetch remaining keys from API
    const stillMissing = keys.filter(key => !results.has(key));
    for (const key of stillMissing) {
      const [entityType, entityId] = key.split(':');
      try {
        const data = await this.fetchFromApi(entityType, entityId);
        if (data !== null) {
          results.set(key, data);

          const entry: CacheEntry = {
            data,
            timestamp: Date.now(),
            ttl: this.config.memory.ttl,
            source: 'api',
            metadata: { entityType, entityId, version: '1.0' }
          };
          await this.populateAllTiers(key, entry);
        }
      } catch {
        this.stats.errors.api++;
      }
    }

    return results;
  }

  private async fetchFromApi(entityType: string, entityId: string): Promise<unknown | null> {
    if (entityType === 'works') {
      return mockApiClient.getById('works', entityId);
    } else if (entityType === 'authors') {
      return mockApiClient.getById('authors', entityId);
    }
    return mockApiClient.get(`${entityType}/${entityId}`);
  }

  private async setMemoryCache(key: string, entry: CacheEntry): Promise<void> {
    if (this.config.memory.enabled) {
      try {
        mockMemoryCache.set(key, entry);
        this.stats.writes.memory++;
      } catch {
        this.stats.errors.memory++;
      }
    }
  }

  private async setLocalStorageCache(key: string, entry: CacheEntry): Promise<void> {
    if (this.config.localStorage.enabled) {
      try {
        mockLocalStorageCache.setItem(`cache:${key}`, JSON.stringify(entry));
        this.stats.writes.localStorage++;
      } catch {
        this.stats.errors.localStorage++;
      }
    }
  }

  private async setIndexedDBCache(key: string, entry: CacheEntry): Promise<void> {
    if (this.config.indexedDB.enabled) {
      try {
        await mockIndexedDBCache.put(key, entry);
        this.stats.writes.indexedDB++;
      } catch {
        this.stats.errors.indexedDB++;
      }
    }
  }

  private async setDiskCache(key: string, entry: CacheEntry): Promise<void> {
    if (this.config.disk.enabled && mockEnvironment.isDevelopment()) {
      try {
        await mockDiskCache.write(key, entry.data);
        this.stats.writes.disk++;
      } catch {
        this.stats.errors.disk++;
      }
    }
  }

  private async populateHigherTiers(key: string, entry: CacheEntry, options: { excludeDisk?: boolean } = {}): Promise<void> {
    await this.setMemoryCache(key, entry);
    await this.setLocalStorageCache(key, entry);
    await this.setIndexedDBCache(key, entry);

    if (!options.excludeDisk) {
      await this.setDiskCache(key, entry);
    }
  }

  private async populateAllTiers(key: string, entry: CacheEntry): Promise<void> {
    await this.populateHigherTiers(key, entry);
  }
}

describe('Cache Integration - Multi-tier Coordination', () => {
  let integratedCache: MockIntegratedCache;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset all mock implementations
    Object.values(mockMemoryCache).forEach(mock => {
      if (typeof mock === 'function') mock.mockReset();
    });
    Object.values(mockLocalStorageCache).forEach(mock => {
      if (typeof mock === 'function') mock.mockReset();
    });
    Object.values(mockIndexedDBCache).forEach(mock => {
      if (typeof mock === 'function') mock.mockReset();
    });
    Object.values(mockDiskCache).forEach(mock => {
      if (typeof mock === 'function') mock.mockReset();
    });
    Object.values(mockGitHubPagesCache).forEach(mock => {
      if (typeof mock === 'function') mock.mockReset();
    });
    Object.values(mockApiClient).forEach(mock => {
      if (typeof mock === 'function') mock.mockReset();
    });

    integratedCache = new MockIntegratedCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Cache Tier Fallback Chain', () => {
    it('should check cache tiers in correct order and return from first hit', async () => {
      const testData = { id: 'W123', title: 'Cached Work' };

      // Setup: Memory cache miss, localStorage hit
      mockMemoryCache.has.mockReturnValue(false);
      mockLocalStorageCache.getItem.mockReturnValue(JSON.stringify({
        data: testData,
        timestamp: Date.now(),
        ttl: 30 * 60 * 1000,
        source: 'localStorage',
        metadata: { entityType: 'works', entityId: 'W123', version: '1.0' }
      }));

      const result = await integratedCache.get('works:W123');

      expect(result).toEqual(testData);
      expect(mockMemoryCache.has).toHaveBeenCalledWith('works:W123');
      expect(mockLocalStorageCache.getItem).toHaveBeenCalledWith('cache:works:W123');
      expect(mockIndexedDBCache.get).not.toHaveBeenCalled(); // Should stop at localStorage
    });

    it('should promote data to higher cache tiers on cache hit', async () => {
      const testData = { id: 'A456', name: 'Cached Author' };
      const entry = {
        data: testData,
        timestamp: Date.now(),
        ttl: 24 * 60 * 60 * 1000,
        source: 'indexedDB',
        metadata: { entityType: 'authors', entityId: 'A456', version: '1.0' }
      };

      // Setup: Memory and localStorage miss, IndexedDB hit
      mockMemoryCache.has.mockReturnValue(false);
      mockLocalStorageCache.getItem.mockReturnValue(null);
      mockIndexedDBCache.get.mockResolvedValue(entry);

      const result = await integratedCache.get('authors:A456');

      expect(result).toEqual(testData);
      expect(mockMemoryCache.set).toHaveBeenCalledWith('authors:A456', expect.any(Object));
      expect(mockLocalStorageCache.setItem).toHaveBeenCalledWith('cache:authors:A456', expect.any(String));
    });

    it('should fall back to API when all cache tiers miss', async () => {
      const testData = { id: 'S789', name: 'API Source' };

      // Setup: All cache tiers miss
      mockMemoryCache.has.mockReturnValue(false);
      mockLocalStorageCache.getItem.mockReturnValue(null);
      mockIndexedDBCache.get.mockResolvedValue(undefined);
      mockDiskCache.read.mockResolvedValue(null);
      mockGitHubPagesCache.read.mockResolvedValue(null);
      mockApiClient.getById.mockResolvedValue(testData);

      const result = await integratedCache.get('sources:S789');

      expect(result).toEqual(testData);
      expect(mockApiClient.getById).toHaveBeenCalledWith('sources', 'S789');

      // Should populate all cache tiers with API data
      expect(mockMemoryCache.set).toHaveBeenCalled();
      expect(mockLocalStorageCache.setItem).toHaveBeenCalled();
      expect(mockIndexedDBCache.put).toHaveBeenCalled();
    });
  });

  describe('Environment-Specific Cache Behavior', () => {
    it('should use disk cache in development environment', async () => {
      mockEnvironment.isDevelopment.mockReturnValue(true);
      mockEnvironment.isProduction.mockReturnValue(false);

      const developmentCache = new MockIntegratedCache();
      const testData = { id: 'W111', title: 'Dev Work' };

      // Setup: All higher tiers miss, disk cache hit
      mockMemoryCache.has.mockReturnValue(false);
      mockLocalStorageCache.getItem.mockReturnValue(null);
      mockIndexedDBCache.get.mockResolvedValue(undefined);
      mockDiskCache.read.mockResolvedValue(testData);

      const result = await developmentCache.get('works:W111');

      expect(result).toEqual(testData);
      expect(mockDiskCache.read).toHaveBeenCalledWith('works:W111');
      expect(mockGitHubPagesCache.read).not.toHaveBeenCalled();
    });

    it('should use GitHub Pages cache in production environment', async () => {
      mockEnvironment.isDevelopment.mockReturnValue(false);
      mockEnvironment.isProduction.mockReturnValue(true);

      const productionCache = new MockIntegratedCache();
      const testData = { id: 'W222', title: 'Prod Work' };

      // Setup: All higher tiers miss, GitHub Pages hit
      mockMemoryCache.has.mockReturnValue(false);
      mockLocalStorageCache.getItem.mockReturnValue(null);
      mockIndexedDBCache.get.mockResolvedValue(undefined);
      mockGitHubPagesCache.read.mockResolvedValue(testData);

      const result = await productionCache.get('works:W222');

      expect(result).toEqual(testData);
      expect(mockGitHubPagesCache.read).toHaveBeenCalledWith('works:W222');
      expect(mockDiskCache.read).not.toHaveBeenCalled();
    });
  });

  describe('TTL and Expiration Handling', () => {
    it('should skip expired entries and continue to next tier', async () => {
      const expiredEntry = {
        data: { id: 'W333', title: 'Expired Work' },
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
        ttl: 60 * 60 * 1000, // 1 hour TTL
        source: 'localStorage',
        metadata: { entityType: 'works', entityId: 'W333', version: '1.0' }
      };

      const freshData = { id: 'W333', title: 'Fresh Work' };

      // Setup: Memory miss, expired localStorage, IndexedDB miss, API hit
      mockMemoryCache.has.mockReturnValue(false);
      mockLocalStorageCache.getItem.mockReturnValue(JSON.stringify(expiredEntry));
      mockIndexedDBCache.get.mockResolvedValue(undefined);
      mockApiClient.getById.mockResolvedValue(freshData);

      const result = await integratedCache.get('works:W333');

      expect(result).toEqual(freshData);
      expect(mockApiClient.getById).toHaveBeenCalled();
    });

    it('should respect different TTLs for different cache tiers', async () => {
      const shortTtlCache = new MockIntegratedCache({
        memory: { enabled: true, maxSize: 100, ttl: 1000 }, // 1 second
        localStorage: { enabled: true, maxSize: 50, ttl: 5000 }, // 5 seconds
        indexedDB: { enabled: true, maxSize: 1000, ttl: 10000 } // 10 seconds
      });

      const testData = { id: 'T123', name: 'TTL Test' };
      await shortTtlCache.set('test:T123', testData);

      // Wait for memory cache to expire but localStorage to remain valid
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Memory should be expired, but localStorage should still be valid
      const result = await shortTtlCache.get('test:T123');
      expect(result).toEqual(testData);
    });
  });

  describe('Batch Operations', () => {
    it('should efficiently handle batch requests with mixed cache hits and misses', async () => {
      const keys = ['works:W001', 'works:W002', 'works:W003', 'works:W004'];
      const cachedData = [
        { id: 'W001', title: 'Cached Work 1' },
        { id: 'W002', title: 'Cached Work 2' }
      ];
      const apiData = [
        { id: 'W003', title: 'API Work 3' },
        { id: 'W004', title: 'API Work 4' }
      ];

      // Setup: First two in memory cache, last two require API
      mockMemoryCache.has
        .mockReturnValueOnce(true)  // W001 hit
        .mockReturnValueOnce(true)  // W002 hit
        .mockReturnValueOnce(false) // W003 miss
        .mockReturnValueOnce(false); // W004 miss

      mockMemoryCache.get
        .mockReturnValueOnce({ data: cachedData[0], timestamp: Date.now(), ttl: 5 * 60 * 1000 })
        .mockReturnValueOnce({ data: cachedData[1], timestamp: Date.now(), ttl: 5 * 60 * 1000 });

      mockLocalStorageCache.getItem.mockReturnValue(null);
      mockIndexedDBCache.get.mockResolvedValue(undefined);
      mockGitHubPagesCache.readBatch.mockResolvedValue(new Map());

      mockApiClient.getById
        .mockResolvedValueOnce(apiData[0])
        .mockResolvedValueOnce(apiData[1]);

      const results = await integratedCache.getBatch(keys);

      expect(results.size).toBe(4);
      expect(results.get('works:W001')).toEqual(cachedData[0]);
      expect(results.get('works:W002')).toEqual(cachedData[1]);
      expect(results.get('works:W003')).toEqual(apiData[0]);
      expect(results.get('works:W004')).toEqual(apiData[1]);
    });

    it('should use GitHub Pages batch reading for production efficiency', async () => {
      mockEnvironment.isProduction.mockReturnValue(true);

      const keys = ['authors:A001', 'authors:A002', 'authors:A003'];
      const batchData = new Map([
        ['authors:A001', { id: 'A001', name: 'Author 1' }],
        ['authors:A002', { id: 'A002', name: 'Author 2' }]
      ]);

      // Setup: Cache misses, GitHub Pages batch hit for some
      mockMemoryCache.has.mockReturnValue(false);
      mockLocalStorageCache.getItem.mockReturnValue(null);
      mockIndexedDBCache.get.mockResolvedValue(undefined);
      mockGitHubPagesCache.readBatch.mockResolvedValue(batchData);
      mockApiClient.getById.mockResolvedValue({ id: 'A003', name: 'Author 3' });

      const results = await integratedCache.getBatch(keys);

      expect(results.size).toBe(3);
      expect(mockGitHubPagesCache.readBatch).toHaveBeenCalledWith(keys);
      expect(mockApiClient.getById).toHaveBeenCalledTimes(1); // Only for A003
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should continue to next tier when a cache tier fails', async () => {
      const testData = { id: 'E123', title: 'Error Test' };

      // Setup: Memory throws error, localStorage succeeds
      mockMemoryCache.has.mockImplementation(() => {
        throw new Error('Memory cache error');
      });
      mockLocalStorageCache.getItem.mockReturnValue(JSON.stringify({
        data: testData,
        timestamp: Date.now(),
        ttl: 30 * 60 * 1000,
        source: 'localStorage',
        metadata: { entityType: 'works', entityId: 'E123', version: '1.0' }
      }));

      const result = await integratedCache.get('works:E123');

      expect(result).toEqual(testData);

      const stats = integratedCache.getStats();
      expect(stats.errors.memory).toBe(1);
      expect(stats.hits.localStorage).toBe(1);
    });

    it('should handle partial failures in batch operations gracefully', async () => {
      const keys = ['works:W001', 'works:W002'];

      // Setup: First key succeeds, second key fails
      mockMemoryCache.has.mockReturnValue(false);
      mockLocalStorageCache.getItem.mockReturnValue(null);
      mockIndexedDBCache.get.mockResolvedValue(undefined);
      mockGitHubPagesCache.readBatch.mockResolvedValue(new Map());

      mockApiClient.getById
        .mockResolvedValueOnce({ id: 'W001', title: 'Success Work' })
        .mockRejectedValueOnce(new Error('API error'));

      const results = await integratedCache.getBatch(keys);

      expect(results.size).toBe(1);
      expect(results.get('works:W001')).toEqual({ id: 'W001', title: 'Success Work' });
      expect(results.has('works:W002')).toBe(false);
    });

    it('should track and report error statistics across all tiers', async () => {
      // Simulate errors in multiple tiers
      mockMemoryCache.has.mockImplementation(() => {
        throw new Error('Memory error');
      });
      mockLocalStorageCache.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      mockIndexedDBCache.get.mockRejectedValue(new Error('IndexedDB error'));
      mockDiskCache.read.mockRejectedValue(new Error('Disk error'));
      mockApiClient.getById.mockRejectedValue(new Error('API error'));

      const result = await integratedCache.get('works:ERROR');

      expect(result).toBeNull();

      const stats = integratedCache.getStats();
      expect(stats.errors.memory).toBeGreaterThan(0);
      expect(stats.errors.localStorage).toBeGreaterThan(0);
      expect(stats.errors.indexedDB).toBeGreaterThan(0);
      expect(stats.errors.api).toBeGreaterThan(0);
    });
  });

  describe('Cache Statistics and Monitoring', () => {
    it('should track hit/miss ratios across all cache tiers', async () => {
      // Simulate various cache scenarios
      await integratedCache.get('memory:hit'); // Memory hit
      await integratedCache.get('localStorage:hit'); // localStorage hit
      await integratedCache.get('indexedDB:hit'); // IndexedDB hit
      await integratedCache.get('api:miss'); // Complete miss, API hit

      const stats = integratedCache.getStats();

      expect(stats.hits.memory + stats.hits.localStorage + stats.hits.indexedDB).toBeGreaterThan(0);
      expect(stats.misses.memory + stats.misses.localStorage + stats.misses.indexedDB).toBeGreaterThan(0);
    });

    it('should track write operations across cache tiers', async () => {
      const testData = { id: 'WRITE', title: 'Write Test' };

      await integratedCache.set('test:WRITE', testData);

      const stats = integratedCache.getStats();
      expect(stats.writes.memory).toBeGreaterThan(0);
      expect(stats.writes.localStorage).toBeGreaterThan(0);
      expect(stats.writes.indexedDB).toBeGreaterThan(0);
    });
  });

  describe('Cache Invalidation and Cleanup', () => {
    it('should invalidate data across all cache tiers', async () => {
      await integratedCache.invalidate('test:INVALIDATE');

      expect(mockMemoryCache.delete).toHaveBeenCalledWith('test:INVALIDATE');
      expect(mockLocalStorageCache.removeItem).toHaveBeenCalledWith('cache:test:INVALIDATE');
      expect(mockIndexedDBCache.delete).toHaveBeenCalledWith('test:INVALIDATE');
      expect(mockDiskCache.delete).toHaveBeenCalledWith('test:INVALIDATE');
    });

    it('should clear all cache tiers simultaneously', async () => {
      await integratedCache.clear();

      expect(mockMemoryCache.clear).toHaveBeenCalled();
      expect(mockLocalStorageCache.clear).toHaveBeenCalled();
      expect(mockIndexedDBCache.clear).toHaveBeenCalled();
      expect(mockDiskCache.clear).toHaveBeenCalled();
    });
  });
});