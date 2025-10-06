/**
 * GitHub Pages Cache Tests - Production Mode Reading Functionality
 *
 * Tests for static data caching system that reads from GitHub Pages
 * in production for pre-built static cache files.
 */

import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';

// Mock fetch for network requests
const mockFetch = vi.fn() as MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock types for GitHub Pages cache system
interface StaticCacheManifest {
  version: string;
  generated: string;
  entities: Record<string, {
    files: string[];
    lastModified: string;
    totalEntries: number;
  }>;
  baseUrl: string;
}

interface StaticCacheEntry {
  data: unknown;
  metadata: {
    entityType: string;
    entityId: string;
    lastUpdated: string;
    source: 'static';
  };
}

interface GitHubPagesCacheConfig {
  enabled: boolean;
  baseUrl: string;
  manifestPath: string;
  timeout: number;
  retryAttempts: number;
  fallbackToApi: boolean;
}

// Mock implementation of GitHubPagesCache that we're testing
class MockGitHubPagesCache {
  private config: GitHubPagesCacheConfig;
  private manifest: StaticCacheManifest | null = null;

  constructor(config: Partial<GitHubPagesCacheConfig> = {}) {
    this.config = {
      enabled: true,
      baseUrl: 'https://user.github.io/academic-explorer',
      manifestPath: '/static-cache/manifest.json',
      timeout: 10000,
      retryAttempts: 3,
      fallbackToApi: true,
      ...config
    };
  }

  async loadManifest(): Promise<StaticCacheManifest> {
    if (!this.config.enabled) {
      throw new Error('GitHub Pages cache is disabled');
    }

    if (this.manifest) {
      return this.manifest;
    }

    const manifestUrl = `${this.config.baseUrl}${this.config.manifestPath}`;
    const response = await this.fetchWithRetry(manifestUrl);

    if (!response.ok) {
      throw new Error(`Failed to load manifest: ${response.status} ${response.statusText}`);
    }

    this.manifest = await response.json() as StaticCacheManifest;
    return this.manifest;
  }

  async read(key: string): Promise<unknown | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const manifest = await this.loadManifest();
      const [entityType, entityId] = key.split(':');

      if (!manifest.entities[entityType]) {
        return null;
      }

      const filePattern = this.getFilePattern(entityId);

      // Prefer exact filename matches or simple includes
      let matchingFile = manifest.entities[entityType].files.find(
        file => file.includes(filePattern)
      );

      // If no simple include match found, attempt to match ranged filenames like "000-999.json"
      if (!matchingFile) {
        const idNum = Number(entityId.replace(/^[^0-9]+/, ''));
        for (const file of manifest.entities[entityType].files) {
          const rangeMatch = file.match(/(\d+)-(\d+)\.json$/);
          if (rangeMatch) {
            const start = Number(rangeMatch[1]);
            const end = Number(rangeMatch[2]);
            if (!Number.isNaN(idNum) && idNum >= start && idNum <= end) {
              matchingFile = file;
              break;
            }
          }
        }
      }

      if (!matchingFile) {
        return null;
      }

  const fileUrl = `${this.config.baseUrl}/static-cache/${entityType}/${matchingFile}`;
      const response = await this.fetchWithRetry(fileUrl);

      if (!response.ok) {
        return null;
      }

      const entry: StaticCacheEntry = await response.json();
      return entry.data;
    } catch {
      return null;
    }
  }

  async readBatch(keys: string[]): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>();

    if (!this.config.enabled) {
      return results;
    }

    try {
      const manifest = await this.loadManifest();

      // Group keys by entity type for efficient batch loading
      const keysByType = new Map<string, string[]>();
      for (const key of keys) {
        const [entityType] = key.split(':');
        if (!keysByType.has(entityType)) {
          keysByType.set(entityType, []);
        }
        keysByType.get(entityType)!.push(key);
      }

      // Process each entity type
      for (const [entityType, entityKeys] of keysByType) {
        if (!manifest.entities[entityType]) {
          continue;
        }

        const batchResults = await this.readEntityTypeBatch(entityType, entityKeys);
        for (const [key, value] of batchResults) {
          results.set(key, value);
        }
      }
    } catch {
      // Return empty results on error
    }

    return results;
  }

  private async readEntityTypeBatch(entityType: string, keys: string[]): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>();

    // Attempt to load batch file if available
    const batchUrl = `${this.config.baseUrl}/static-cache/${entityType}/batch.json`;

    try {
      const response = await this.fetchWithRetry(batchUrl);
      if (response.ok) {
        const batchData: Record<string, StaticCacheEntry> = await response.json();

        for (const key of keys) {
          const [, entityId] = key.split(':');
          if (batchData[entityId]) {
            results.set(key, batchData[entityId].data);
          }
        }

        return results;
      }
    } catch {
      // Fall back to individual file loading
    }

    // Load individual files
    const promises = keys.map(async (key) => {
      const data = await this.read(key);
      if (data !== null) {
        results.set(key, data);
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  private async fetchWithRetry(url: string): Promise<Response> {
    let lastError: Error | null = null;
    // DEBUG: show configured retryAttempts for visibility
    // eslint-disable-next-line no-console
    console.debug('[DEBUG] fetchWithRetry configured retryAttempts=', this.config.retryAttempts, 'for url=', url);

    // Interpret retryAttempts as "number of retries" so total attempts = retries + 1
    const totalAttempts = Math.max(1, this.config.retryAttempts + 1);

    for (let attempt = 0; attempt < totalAttempts; attempt++) {
      let timeoutId: any;
      try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'max-age=3600' // Cache for 1 hour
          }
        });

        clearTimeout(timeoutId);

        // Treat falsy responses as errors (some mocks may return undefined)
        if (!response) {
          const noResErr = new Error('No response from fetch');
          if (!lastError) lastError = noResErr;
          // If we have more attempts left, continue and retry
          if (attempt < totalAttempts - 1) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff (0 -> 1s)
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          break; // fall through to throw
        }

        return response;
      } catch (error) {
        // Preserve the first error so tests that assert the original failure see it
        const err = error instanceof Error ? error : new Error('Unknown error');
        if (!lastError) lastError = err;
        if (timeoutId) clearTimeout(timeoutId);

        // Retry if attempts remain
        if (attempt < totalAttempts - 1) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff (0 -> 1s)
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  private getFilePattern(entityId: string): string {
    // Create a pattern to match the file containing this entity
    // e.g., "A123" might be in "A100-A199.json" or "A123.json"
    return entityId;
  }

  async getManifest(): Promise<StaticCacheManifest | null> {
    return this.manifest;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      await this.loadManifest();
      return true;
    } catch {
      return false;
    }
  }

  async getStats(): Promise<{
    isEnabled: boolean;
    manifestLoaded: boolean;
    totalEntityTypes: number;
    totalFiles: number;
    lastGenerated: string | null;
  }> {
    const stats = {
      isEnabled: this.config.enabled,
      manifestLoaded: this.manifest !== null,
      totalEntityTypes: 0,
      totalFiles: 0,
      lastGenerated: null as string | null
    };

    if (this.manifest) {
      stats.totalEntityTypes = Object.keys(this.manifest.entities).length;
      stats.totalFiles = Object.values(this.manifest.entities)
        .reduce((sum, entity) => sum + entity.files.length, 0);
      stats.lastGenerated = this.manifest.generated;
    }

    return stats;
  }
}

describe('GitHubPagesCache - Production Mode', () => {
  let githubCache: MockGitHubPagesCache;
  let mockManifest: StaticCacheManifest;

  beforeEach(() => {
    vi.clearAllMocks();

    mockManifest = {
      version: '1.0.0',
      generated: '2024-01-01T00:00:00.000Z',
      baseUrl: 'https://user.github.io/academic-explorer',
      entities: {
        works: {
          files: ['W000-W999.json', 'W1000-W1999.json', 'batch.json'],
          lastModified: '2024-01-01T00:00:00.000Z',
          totalEntries: 1500
        },
        authors: {
          files: ['A000-A499.json', 'A500-A999.json', 'batch.json'],
          lastModified: '2024-01-01T00:00:00.000Z',
          totalEntries: 800
        },
        sources: {
          files: ['S000-S199.json', 'batch.json'],
          lastModified: '2024-01-01T00:00:00.000Z',
          totalEntries: 150
        }
      }
    };

    githubCache = new MockGitHubPagesCache({
      baseUrl: 'https://test.github.io/academic-explorer',
      timeout: 5000,
      retryAttempts: 2
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Manifest Loading', () => {
    it('should load manifest successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      } as Response);

      const manifest = await githubCache.loadManifest();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.github.io/academic-explorer/static-cache/manifest.json',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/json'
          })
        })
      );
      expect(manifest).toEqual(mockManifest);
    });

    it('should cache manifest after first load', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      } as Response);

      await githubCache.loadManifest();
      await githubCache.loadManifest(); // Second call

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle manifest load failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      await expect(githubCache.loadManifest())
        .rejects.toThrow('Failed to load manifest: 404 Not Found');
    });

    it('should handle network errors during manifest load', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(githubCache.loadManifest())
        .rejects.toThrow('Network error');
    });
  });

  describe('Single Entity Reading', () => {
    beforeEach(() => {
      // Mock manifest load
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      } as Response));
    });

    it('should read entity data successfully', async () => {
      const testData = { id: 'W123', title: 'Test Work', year: 2023 };
      const staticEntry: StaticCacheEntry = {
        data: testData,
        metadata: {
          entityType: 'works',
          entityId: 'W123',
          lastUpdated: '2024-01-01T00:00:00.000Z',
          source: 'static'
        }
      };

      // Mock file load
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(staticEntry)
      } as Response));

      const result = await githubCache.read('works:W123');

      expect(result).toEqual(testData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/static-cache/works/'),
        expect.any(Object)
      );
    });

    it('should return null for non-existent entities', async () => {
      const result = await githubCache.read('nonexistent:entity');

      expect(result).toBeNull();
    });

    it('should handle file load failures gracefully', async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        status: 404
      } as Response));

      const result = await githubCache.read('works:W999');

      expect(result).toBeNull();
    });
  });

  describe('Batch Reading', () => {
    beforeEach(() => {
      // Mock manifest load
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      } as Response));
    });

    it('should read multiple entities efficiently using batch files', async () => {
      const batchData = {
        W123: {
          data: { id: 'W123', title: 'Work 1' },
          metadata: { entityType: 'works', entityId: 'W123', lastUpdated: '2024-01-01', source: 'static' as const }
        },
        W124: {
          data: { id: 'W124', title: 'Work 2' },
          metadata: { entityType: 'works', entityId: 'W124', lastUpdated: '2024-01-01', source: 'static' as const }
        }
      };

      // Mock batch file load
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(batchData)
      } as Response));

      const results = await githubCache.readBatch(['works:W123', 'works:W124']);

      expect(results.size).toBe(2);
      expect(results.get('works:W123')).toEqual({ id: 'W123', title: 'Work 1' });
      expect(results.get('works:W124')).toEqual({ id: 'W124', title: 'Work 2' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.github.io/academic-explorer/static-cache/works/batch.json',
        expect.any(Object)
      );
    });

    it('should fall back to individual files when batch fails', async () => {
      // Mock batch file failure
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        status: 404
      } as Response));

      // Mock individual file success
      const entry1: StaticCacheEntry = {
        data: { id: 'A123', name: 'Author 1' },
        metadata: { entityType: 'authors', entityId: 'A123', lastUpdated: '2024-01-01', source: 'static' }
      };

      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(entry1)
      } as Response));

      const results = await githubCache.readBatch(['authors:A123']);

      expect(results.size).toBe(1);
      expect(results.get('authors:A123')).toEqual({ id: 'A123', name: 'Author 1' });
    });

    it('should handle mixed entity types in batch requests', async () => {
      // Mock different batch files for different entity types
      const worksBatch = {
        W123: {
          data: { id: 'W123', title: 'Work 1' },
          metadata: { entityType: 'works', entityId: 'W123', lastUpdated: '2024-01-01', source: 'static' as const }
        }
      };

      const authorsBatch = {
        A456: {
          data: { id: 'A456', name: 'Author 1' },
          metadata: { entityType: 'authors', entityId: 'A456', lastUpdated: '2024-01-01', source: 'static' as const }
        }
      };

      mockFetch
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(worksBatch)
        } as Response))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(authorsBatch)
        } as Response));

      const results = await githubCache.readBatch(['works:W123', 'authors:A456']);

      expect(results.size).toBe(2);
      expect(results.get('works:W123')).toEqual({ id: 'W123', title: 'Work 1' });
      expect(results.get('authors:A456')).toEqual({ id: 'A456', name: 'Author 1' });
    });
  });

  describe('Error Handling and Retries', () => {
    it('should retry failed requests with exponential backoff', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockManifest)
        } as Response);

      const startTime = Date.now();
      const manifest = await githubCache.loadManifest();
      const duration = Date.now() - startTime;

      expect(manifest).toEqual(mockManifest);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(duration).toBeGreaterThan(1000); // Should include retry delays
    });

    it('should fail after maximum retry attempts', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      await expect(githubCache.loadManifest())
        .rejects.toThrow('Network error');

      expect(mockFetch).toHaveBeenCalledTimes(2); // config.retryAttempts = 2
    });

    it('should handle timeout errors', async () => {
      const timeoutCache = new MockGitHubPagesCache({ timeout: 100 });

      mockFetch.mockImplementationOnce(() => new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(mockManifest)
        } as Response), 200);
      }));

      await expect(timeoutCache.loadManifest())
        .rejects.toThrow();
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Invalid JSON'))
      } as Response);

      await expect(githubCache.loadManifest())
        .rejects.toThrow('Invalid JSON');
    });
  });

  describe('Configuration and State', () => {
    it('should respect disabled configuration', async () => {
      const disabledCache = new MockGitHubPagesCache({ enabled: false });

      await expect(disabledCache.loadManifest())
        .rejects.toThrow('GitHub Pages cache is disabled');

      const result = await disabledCache.read('works:W123');
      expect(result).toBeNull();
    });

    it('should check availability correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      } as Response);

      const available = await githubCache.isAvailable();
      expect(available).toBe(true);
    });

    it('should report unavailable when manifest fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const available = await githubCache.isAvailable();
      expect(available).toBe(false);
    });

    it('should provide accurate statistics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      } as Response);

      await githubCache.loadManifest();
      const stats = await githubCache.getStats();

      expect(stats).toEqual({
        isEnabled: true,
        manifestLoaded: true,
        totalEntityTypes: 3,
        totalFiles: 8, // 3 + 3 + 2 from mockManifest
        lastGenerated: '2024-01-01T00:00:00.000Z'
      });
    });
  });

  describe('Production Optimizations', () => {
    it('should use appropriate cache headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest)
      } as Response);

      await githubCache.loadManifest();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Cache-Control': 'max-age=3600'
          })
        })
      );
    });

    it('should handle large batch operations efficiently', async () => {
      const largeBatch = Array.from({ length: 100 }, (_, i) => `works:W${i}`);

      // Mock batch response with all entries
      const batchData: Record<string, any> = {};
      largeBatch.forEach((key, i) => {
        const id = key.split(':')[1];
        batchData[id] = {
          data: { id, title: `Work ${i}` },
          metadata: { entityType: 'works', entityId: id, lastUpdated: '2024-01-01', source: 'static' }
        };
      });

      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(batchData)
      } as Response));

      const startTime = Date.now();
      const results = await githubCache.readBatch(largeBatch);
      const duration = Date.now() - startTime;

      expect(results.size).toBe(100);
      expect(duration).toBeLessThan(1000); // Should be fast with batch loading
      expect(mockFetch).toHaveBeenCalledTimes(2); // Manifest + batch file
    });

    it('should handle CDN edge cases gracefully', async () => {
      // Simulate CDN returning stale data
      const staleManifest = {
        ...mockManifest,
        generated: '2023-01-01T00:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(staleManifest)
      } as Response);

      const manifest = await githubCache.loadManifest();
      expect(manifest.generated).toBe('2023-01-01T00:00:00.000Z');
    });
  });
});
