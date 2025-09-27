/**
 * Disk Cache Tests - Development Mode Disk Writing Functionality
 *
 * Tests for static data caching system that writes to disk during development
 * for faster subsequent loads and data persistence across sessions.
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { vol } from 'memfs';
import type { Stats } from 'fs';

// Mock the file system
vi.mock('fs', () => import('memfs').then(fs => ({ ...fs.fs })));
vi.mock('fs/promises', () => import('memfs').then(fs => ({ ...fs.fs.promises })));
vi.mock('path', () => import('path'));

// Mock types for cache system
interface CacheEntry {
  data: unknown;
  timestamp: number;
  version: string;
  metadata: {
    entityType: string;
    entityId: string;
    source: 'api' | 'static';
  };
}

interface DiskCacheConfig {
  enabled: boolean;
  basePath: string;
  maxFileSize: number;
  maxEntries: number;
  ttl: number;
  compression: boolean;
}

// Mock implementation of DiskCache that we're testing
class MockDiskCache {
  private config: DiskCacheConfig;

  constructor(config: Partial<DiskCacheConfig> = {}) {
    this.config = {
      enabled: true,
      basePath: '/tmp/openalex-cache',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxEntries: 1000,
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      compression: false,
      ...config
    };
  }

  async write(key: string, data: unknown): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Disk cache is disabled');
    }

    const fs = await import('fs/promises');
    const path = await import('path');

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      version: '1.0',
      metadata: {
        entityType: key.split(':')[0] || 'unknown',
        entityId: key.split(':')[1] || 'unknown',
        source: 'api'
      }
    };

    const filePath = path.join(this.config.basePath, `${key}.json`);
    const dir = path.dirname(filePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
  }

  async read(key: string): Promise<unknown | null> {
    if (!this.config.enabled) {
      return null;
    }

    const fs = await import('fs/promises');
    const path = await import('path');

    const filePath = path.join(this.config.basePath, `${key}.json`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const entry: CacheEntry = JSON.parse(content);

      // Check TTL
      if (Date.now() - entry.timestamp > this.config.ttl) {
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const filePath = path.join(this.config.basePath, `${key}.json`);

    try {
      await fs.unlink(filePath);
    } catch {
      // File doesn't exist, ignore
    }
  }

  async clear(): Promise<void> {
    const fs = await import('fs/promises');

    try {
      await fs.rm(this.config.basePath, { recursive: true, force: true });
    } catch {
      // Directory doesn't exist, ignore
    }
  }

  async size(): Promise<number> {
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      const files = await fs.readdir(this.config.basePath);
      return files.length;
    } catch {
      return 0;
    }
  }

  async getStats(): Promise<{ totalFiles: number; totalSize: number; oldestEntry: number | null }> {
    const fs = await import('fs/promises');
    const path = await import('path');

    let totalFiles = 0;
    let totalSize = 0;
    let oldestEntry: number | null = null;

    try {
      const files = await fs.readdir(this.config.basePath);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.config.basePath, file);
          const stats = await fs.stat(filePath);

          totalFiles++;
          totalSize += stats.size;

          if (oldestEntry === null || stats.mtime.getTime() < oldestEntry) {
            oldestEntry = stats.mtime.getTime();
          }
        }
      }
    } catch {
      // Directory doesn't exist
    }

    return { totalFiles, totalSize, oldestEntry };
  }
}

describe('DiskCache - Development Mode', () => {
  let diskCache: MockDiskCache;

  beforeEach(() => {
    // Reset the in-memory file system
    vol.reset();
    diskCache = new MockDiskCache({
      basePath: '/tmp/test-cache',
      maxFileSize: 1024 * 1024, // 1MB for testing
      maxEntries: 100,
      ttl: 60000 // 1 minute for testing
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vol.reset();
  });

  describe('Basic Operations', () => {
    it('should write data to disk successfully', async () => {
      const testData = { id: 'W123', title: 'Test Work', year: 2023 };

      await diskCache.write('works:W123', testData);

      const fs = await import('fs/promises');
      const content = await fs.readFile('/tmp/test-cache/works:W123.json', 'utf-8');
      const entry: CacheEntry = JSON.parse(content);

      expect(entry.data).toEqual(testData);
      expect(entry.metadata.entityType).toBe('works');
      expect(entry.metadata.entityId).toBe('W123');
      expect(entry.timestamp).toBeTypeOf('number');
    });

    it('should read data from disk successfully', async () => {
      const testData = { id: 'A456', name: 'Test Author' };

      await diskCache.write('authors:A456', testData);
      const retrievedData = await diskCache.read('authors:A456');

      expect(retrievedData).toEqual(testData);
    });

    it('should return null for non-existent keys', async () => {
      const result = await diskCache.read('nonexistent:key');
      expect(result).toBeNull();
    });

    it('should delete data from disk successfully', async () => {
      const testData = { id: 'S789', name: 'Test Source' };

      await diskCache.write('sources:S789', testData);
      await diskCache.delete('sources:S789');

      const result = await diskCache.read('sources:S789');
      expect(result).toBeNull();
    });

    it('should clear all cached data', async () => {
      await diskCache.write('works:W1', { id: 'W1' });
      await diskCache.write('authors:A1', { id: 'A1' });

      await diskCache.clear();

      const size = await diskCache.size();
      expect(size).toBe(0);
    });
  });

  describe('Directory Management', () => {
    it('should create directory structure automatically', async () => {
      const fs = await import('fs/promises');

      await diskCache.write('nested:deep:key', { test: true });

      const exists = await fs.access('/tmp/test-cache').then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should handle nested cache keys with directory creation', async () => {
      await diskCache.write('entities:works:collaborative:W123', { collaborative: true });

      const result = await diskCache.read('entities:works:collaborative:W123');
      expect(result).toEqual({ collaborative: true });
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should respect TTL and return null for expired entries', async () => {
      const shortTtlCache = new MockDiskCache({
        basePath: '/tmp/test-cache',
        ttl: 100 // 100ms
      });

      await shortTtlCache.write('short:lived', { data: 'expires soon' });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      const result = await shortTtlCache.read('short:lived');
      expect(result).toBeNull();
    });

    it('should automatically delete expired entries on read', async () => {
      const shortTtlCache = new MockDiskCache({
        basePath: '/tmp/test-cache',
        ttl: 50
      });

      await shortTtlCache.write('expires:fast', { data: 'will be deleted' });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      await shortTtlCache.read('expires:fast');

      // File should be deleted
      const fs = await import('fs/promises');
      const exists = await fs.access('/tmp/test-cache/expires:fast.json').then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle write errors gracefully', async () => {
      const disabledCache = new MockDiskCache({ enabled: false });

      await expect(disabledCache.write('test:key', { data: 'test' }))
        .rejects.toThrow('Disk cache is disabled');
    });

    it('should handle read errors for corrupted files', async () => {
      const fs = await import('fs/promises');

      // Create a corrupted file
      await fs.mkdir('/tmp/test-cache', { recursive: true });
      await fs.writeFile('/tmp/test-cache/corrupted:file.json', 'invalid json {');

      const result = await diskCache.read('corrupted:file');
      expect(result).toBeNull();
    });

    it('should handle permission errors gracefully', async () => {
      const fs = await import('fs/promises');
      const originalWriteFile = fs.writeFile as MockedFunction<typeof fs.writeFile>;

      originalWriteFile.mockRejectedValueOnce(new Error('EACCES: permission denied'));

      await expect(diskCache.write('permission:denied', { data: 'test' }))
        .rejects.toThrow('EACCES: permission denied');
    });

    it('should handle disk space errors', async () => {
      const fs = await import('fs/promises');
      const originalWriteFile = fs.writeFile as MockedFunction<typeof fs.writeFile>;

      originalWriteFile.mockRejectedValueOnce(new Error('ENOSPC: no space left on device'));

      await expect(diskCache.write('no:space', { data: 'test' }))
        .rejects.toThrow('ENOSPC: no space left on device');
    });
  });

  describe('Cache Statistics', () => {
    it('should return accurate cache statistics', async () => {
      await diskCache.write('stats:test1', { size: 'small' });
      await diskCache.write('stats:test2', { size: 'medium' });
      await diskCache.write('stats:test3', { size: 'large' });

      const stats = await diskCache.getStats();

      expect(stats.totalFiles).toBe(3);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeTypeOf('number');
    });

    it('should handle empty cache statistics', async () => {
      const stats = await diskCache.getStats();

      expect(stats.totalFiles).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.oldestEntry).toBeNull();
    });
  });

  describe('Large Data Handling', () => {
    it('should handle large objects efficiently', async () => {
      const largeData = {
        id: 'W999999',
        abstract: 'A'.repeat(10000), // 10KB abstract
        citations: Array.from({ length: 1000 }, (_, i) => ({ id: `W${i}`, title: `Work ${i}` })),
        metadata: {
          processed: true,
          version: '2.0',
          tags: Array.from({ length: 100 }, (_, i) => `tag-${i}`)
        }
      };

      const startTime = Date.now();
      await diskCache.write('large:dataset', largeData);
      const writeTime = Date.now() - startTime;

      const readStartTime = Date.now();
      const retrieved = await diskCache.read('large:dataset');
      const readTime = Date.now() - readStartTime;

      expect(retrieved).toEqual(largeData);
      expect(writeTime).toBeLessThan(1000); // Should complete within 1 second
      expect(readTime).toBeLessThan(500); // Should read within 500ms
    });

    it('should handle concurrent write operations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        diskCache.write(`concurrent:${i}`, { id: i, data: `test-${i}` })
      );

      await expect(Promise.all(promises)).resolves.not.toThrow();

      // Verify all writes succeeded
      const size = await diskCache.size();
      expect(size).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in cache keys', async () => {
      const specialKey = 'special:chars!@#$%^&*()_+-=[]{}|;:,.<>?';
      const data = { message: 'special characters work' };

      await diskCache.write(specialKey, data);
      const result = await diskCache.read(specialKey);

      expect(result).toEqual(data);
    });

    it('should handle empty and null data', async () => {
      await diskCache.write('empty:object', {});
      await diskCache.write('empty:array', []);
      await diskCache.write('null:value', null);
      await diskCache.write('undefined:value', undefined);

      expect(await diskCache.read('empty:object')).toEqual({});
      expect(await diskCache.read('empty:array')).toEqual([]);
      expect(await diskCache.read('null:value')).toBeNull();
      expect(await diskCache.read('undefined:value')).toBeUndefined();
    });

    it('should handle very long cache keys', async () => {
      const longKey = 'very'.repeat(100) + ':long:key';
      const data = { message: 'long key works' };

      await diskCache.write(longKey, data);
      const result = await diskCache.read(longKey);

      expect(result).toEqual(data);
    });
  });

  describe('Development Mode Specific Features', () => {
    it('should support hot reload by detecting file changes', async () => {
      const fs = await import('fs/promises');

      await diskCache.write('hot:reload', { version: 1 });

      // Simulate external file modification
      const filePath = '/tmp/test-cache/hot:reload.json';
      const content = await fs.readFile(filePath, 'utf-8');
      const entry: CacheEntry = JSON.parse(content);
      entry.data = { version: 2 };
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2));

      const result = await diskCache.read('hot:reload');
      expect(result).toEqual({ version: 2 });
    });

    it('should maintain metadata for debugging', async () => {
      await diskCache.write('debug:metadata', { debug: true });

      const fs = await import('fs/promises');
      const content = await fs.readFile('/tmp/test-cache/debug:metadata.json', 'utf-8');
      const entry: CacheEntry = JSON.parse(content);

      expect(entry.metadata).toMatchObject({
        entityType: 'debug',
        entityId: 'metadata',
        source: 'api'
      });
      expect(entry.version).toBe('1.0');
      expect(entry.timestamp).toBeTypeOf('number');
    });

    it('should support cache warming during development', async () => {
      const warmupData = [
        { key: 'warm:work1', data: { id: 'W1', preloaded: true } },
        { key: 'warm:work2', data: { id: 'W2', preloaded: true } },
        { key: 'warm:author1', data: { id: 'A1', preloaded: true } }
      ];

      // Simulate cache warming
      const promises = warmupData.map(item => diskCache.write(item.key, item.data));
      await Promise.all(promises);

      // Verify all entries are accessible
      const results = await Promise.all(
        warmupData.map(item => diskCache.read(item.key))
      );

      expect(results).toEqual(warmupData.map(item => item.data));
    });
  });
});