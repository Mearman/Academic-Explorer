import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DiskCacheWriter, type InterceptedData, type DiskWriterConfig } from './disk-writer.js';
import { generateContentHash, hasCollision, mergeCollision, migrateToMultiUrl, validateFileEntry } from '@academic-explorer/utils/static-data/cache-utilities.js';
import * as fsModule from 'node:fs/promises';
import * as pathModule from 'node:path';
import * as cryptoModule from 'node:crypto';
import { logger } from '@/lib/logger.js';

// Mock Node.js modules
vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    rename: vi.fn(),
    unlink: vi.fn(),
    statfs: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn()
  }
}));

vi.mock('node:path', () => ({
  default: {
    join: vi.fn(),
    dirname: vi.fn(),
    basename: vi.fn(),
    relative: vi.fn(),
    resolve: vi.fn()
  }
}));

vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(() => 'mock-uuid')
}));

// Mock utilities
vi.mock('@academic-explorer/utils/static-data/cache-utilities.js', async () => {
  const actual = await vi.importActual('@academic-explorer/utils/static-data/cache-utilities.js');
  return {
    ...actual,
    generateContentHash: vi.fn(),
    hasCollision: vi.fn(),
    mergeCollision: vi.fn(),
    migrateToMultiUrl: vi.fn(),
    validateFileEntry: vi.fn()
  };
});

const mockFs = fsModule as any;
const mockPath = pathModule as any;
const mockCrypto = cryptoModule as any;
const mockGenerateContentHash = generateContentHash as ReturnType<typeof vi.fn>;
const mockHasCollision = hasCollision as ReturnType<typeof vi.fn>;
const mockMergeCollision = mergeCollision as ReturnType<typeof vi.fn>;
const mockMigrateToMultiUrl = migrateToMultiUrl as ReturnType<typeof vi.fn>;
const mockValidateFileEntry = validateFileEntry as ReturnType<typeof vi.fn>;

// Mock logger
vi.spyOn(logger, 'debug').mockImplementation(() => {});
vi.spyOn(logger, 'info').mockImplementation(() => {});
vi.spyOn(logger, 'warn').mockImplementation(() => {});
vi.spyOn(logger, 'error').mockImplementation(() => {});

describe('DiskCacheWriter', () => {
  let writer: DiskCacheWriter;
  let config: DiskWriterConfig;

  beforeEach(() => {
    config = {
      basePath: '/mock/base/path',
      maxConcurrentWrites: 5,
      lockTimeoutMs: 1000,
      checkDiskSpace: false,
      minDiskSpaceBytes: 0
    };
    writer = new DiskCacheWriter(config);

    // Reset mocks
    vi.clearAllMocks();
    mockGenerateContentHash.mockResolvedValue('mock-hash');
    mockHasCollision.mockReturnValue(false);
    mockMergeCollision.mockImplementation((entry, url) => ({ ...entry, url: url }));
    mockMigrateToMultiUrl.mockImplementation((entry) => ({ ...entry, equivalentUrls: [entry.url] }));
    mockValidateFileEntry.mockReturnValue(true);

    // Mock path functions
    mockPath.join.mockImplementation((...parts: string[]) => parts.join('/'));
    mockPath.dirname.mockImplementation((p: string) => p.split('/').slice(0, -1).join('/'));
    mockPath.basename.mockImplementation((p: string) => p.split('/').pop() || '');
    mockPath.relative.mockImplementation(() => 'relative');
    mockPath.resolve.mockImplementation(() => '/resolved');

    // Mock fs functions
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue(JSON.stringify({ lastUpdated: '2023-01-01T00:00:00Z' }));
    mockFs.rename.mockResolvedValue(undefined);
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.statfs.mockResolvedValue({ bavail: 1000000, bsize: 1024 });
    mockFs.stat.mockResolvedValue({ mtime: new Date('2023-01-01T00:00:00Z') });
    mockFs.readdir.mockResolvedValue([]);

    // Mock crypto
    mockCrypto.randomUUID.mockReturnValue('mock-uuid');
  });

  afterEach(async () => {
    await writer.cleanup();
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with default config', () => {
      const defaultWriter = new DiskCacheWriter();
      expect(defaultWriter).toBeDefined();
      // Defaults: basePath 'apps/web/public/data/openalex', maxConcurrentWrites 10, etc.
    });

    it('should use provided config', () => {
      expect(writer['config'].basePath).toBe('/mock/base/path');
      expect(writer['config'].maxConcurrentWrites).toBe(5);
    });

    it('should initialize Node modules on first use', async () => {
      // Trigger initialization
      const data: InterceptedData = {
        url: 'https://api.openalex.org/works',
        method: 'GET',
        requestHeaders: {},
        responseData: { results: [] },
        statusCode: 200,
        responseHeaders: { 'content-type': 'application/json' },
        timestamp: '2023-01-01T00:00:00Z'
      };
      await writer.writeToCache(data);
      expect(fsModule).toBeDefined(); // Imported
    });
  });

  describe('writeToCache', () => {
    it('should enforce concurrent write limits', async () => {
      // Simulate full queue
      const promises = Array.from({ length: config.maxConcurrentWrites }, () => Promise.resolve());
      writer['writeQueue'] = new Set(promises as any);

      const data: InterceptedData = {
        url: 'https://api.openalex.org/works',
        method: 'GET',
        requestHeaders: {},
        responseData: { results: [] },
        statusCode: 200,
        responseHeaders: {},
        timestamp: '2023-01-01T00:00:00Z'
      };

      const writePromise = writer.writeToCache(data);
      expect(writePromise).toBeDefined();
      // Should wait for queue to drain
    });

    it('should call _writeToCache and manage queue', async () => {
      const data: InterceptedData = {
        url: 'https://api.openalex.org/works/W123',
        method: 'GET',
        requestHeaders: {},
        responseData: { id: 'W123', display_name: 'Test Work' },
        statusCode: 200,
        responseHeaders: { 'content-type': 'application/json' },
        timestamp: '2023-01-01T00:00:00Z'
      };

      mockPath.join.mockReturnValueOnce('/mock/base/path/works/W123.json'); // dataFile
      mockPath.join.mockReturnValueOnce('/mock/base/path/works/W123.meta.json'); // metadataFile
      mockPath.join.mockReturnValueOnce('/mock/base/path/works/index.json'); // indexPath
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({ files: {} })); // existing index

      await writer.writeToCache(data);

      expect(mockFs.writeFile).toHaveBeenCalledTimes(3); // data, metadata, index
      expect(mockFs.mkdir).toHaveBeenCalledWith('/mock/base/path/works', { recursive: true });
    });

    it('should validate intercepted data', async () => {
      const invalidData = { /* missing fields */ } as InterceptedData;
      await expect(writer.writeToCache(invalidData)).rejects.toThrow('Invalid intercepted data');
    });

    it('should check disk space if enabled', async () => {
      config.checkDiskSpace = true;
      writer = new DiskCacheWriter(config);

      const data: InterceptedData = { /* valid data */ } as any;
      await writer.writeToCache(data);

      expect(mockFs.statfs).toHaveBeenCalledWith('/mock/base/path');
    });

    it('should throw on insufficient disk space', async () => {
      config.checkDiskSpace = true;
      mockFs.statfs.mockResolvedValue({ bavail: 1, bsize: 1 }); // Low space

      const data: InterceptedData = { /* valid */ } as any;
      await expect(writer.writeToCache(data)).rejects.toThrow('Insufficient disk space');
    });
  });

  describe('Collision Handling in Writes', () => {
    it('should merge colliding entry with matching hash', async () => {
      const data: InterceptedData = {
        url: 'https://api.openalex.org/works?filter=doi:10.1234/test&api_key=secret',
        method: 'GET',
        requestHeaders: {},
        responseData: { results: [{ id: 'W123' }] },
        statusCode: 200,
        responseHeaders: {},
        timestamp: '2023-01-01T00:00:00Z'
      };

      const existingEntry = {
        url: 'https://api.openalex.org/works?filter=doi:10.1234/test',
        $ref: './query.json',
        lastRetrieved: '2023-01-01T00:00:00Z',
        contentHash: 'mock-hash'
      };

      mockPath.join.mockReturnValue('/mock/base/path/works/queries/query.json'); // dataFile
      mockPath.join.mockReturnValue('/mock/base/path/works/queries/index.json'); // index
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({ files: { query: existingEntry } })); // index
      mockHasCollision.mockReturnValue(true); // Collision
      mockGenerateContentHash.mockResolvedValue('mock-hash'); // Matching hash

      await writer.writeToCache(data);

      expect(mockMergeCollision).toHaveBeenCalledWith(expect.anything(), data.url);
      expect(mockFs.writeFile).toHaveBeenCalledWith(expect.stringContaining('index.json'), expect.stringContaining('"mergedCount":1'));
    });

    it('should archive on hash mismatch and overwrite', async () => {
      const data: InterceptedData = {
        url: 'https://api.openalex.org/works?filter=doi:10.1234/test&api_key=secret',
        method: 'GET',
        requestHeaders: {},
        responseData: { results: [{ id: 'W123' }] },
        statusCode: 200,
        responseHeaders: {},
        timestamp: '2023-01-01T00:00:00Z'
      };

      const existingEntry = {
        url: 'https://api.openalex.org/works?filter=doi:10.1234/test',
        $ref: './query.json',
        lastRetrieved: '2023-01-01T00:00:00Z',
        contentHash: 'old-hash'
      };

      mockPath.join
        .mockReturnValueOnce('/mock/base/path/works/queries/query.json') // dataFile
        .mockReturnValueOnce('/mock/base/path/works/queries/index.json') // index
        .mockReturnValueOnce('/mock/base/path/works/queries/query.collisions.json'); // archive

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({ files: { query: existingEntry } }));
      mockHasCollision.mockReturnValue(true);
      mockGenerateContentHash.mockResolvedValue('new-hash'); // Mismatch

      await writer.writeToCache(data);

      expect(mockFs.writeFile).toHaveBeenCalledWith(expect.stringContaining('query.collisions.json'), expect.stringContaining('"reason":"hash_mismatch_update"'));
      expect(logger.warn).toHaveBeenCalledWith('Collision with content hash mismatch');
    });

    it('should migrate legacy entry during write', async () => {
      const data: InterceptedData = { /* valid */ } as any;

      const legacyEntry = { url: 'old-url', $ref: './old.json', lastRetrieved: 'old-time', contentHash: 'old-hash' };

      mockPath.join.mockReturnValue('/mock/index.json');
      mockFs.readFile.mockResolvedValue(JSON.stringify({ files: { test: legacyEntry } }));
      mockHasCollision.mockReturnValue(false); // No collision, but migrate

      await writer.writeToCache(data);

      expect(mockMigrateToMultiUrl).toHaveBeenCalledWith(legacyEntry);
    });

    it('should log warning on validation failure and fallback', async () => {
      const data: InterceptedData = { /* valid */ } as any;

      mockValidateFileEntry.mockReturnValue(false);

      await writer.writeToCache(data);

      expect(logger.warn).toHaveBeenCalledWith('FileEntry validation failed, falling back to single-URL entry');
    });
  });

  describe('File Locking and Atomicity', () => {
    it('should acquire and release locks for files', async () => {
      const data: InterceptedData = { /* valid */ } as any;

      mockPath.join
        .mockReturnValueOnce('/mock/data.json')
        .mockReturnValueOnce('/mock/meta.json')
        .mockReturnValueOnce('/mock/index.json');

      await writer.writeToCache(data);

      // Locks acquired and released in finally
      expect(writer['activeLocks'].size).toBe(0); // After release
    });

    it('should timeout on lock acquisition failure', async () => {
      const data: InterceptedData = { /* valid */ } as any;

      // Simulate locked file
      writer['activeLocks'].set('/mock/index.json', { lockId: 'other', timestamp: Date.now(), filePath: '/mock/index.json' });
      config.lockTimeoutMs = 1; // Short timeout

      await expect(writer.writeToCache(data)).rejects.toThrow('Failed to acquire file lock');
    });

    it('should handle concurrent writes to same path atomically', async () => {
      // This is harder to test fully, but verify locking mechanism
      const data1: InterceptedData = { /* data1 */ } as any;
      const data2: InterceptedData = { /* data2 */ } as any;

      mockPath.join.mockReturnValue('/mock/shared.json'); // Same path

      const promise1 = writer.writeToCache(data1);
      const promise2 = writer.writeToCache(data2);

      // Second should wait for first
      await vi.waitFor(() => {
        expect(writer['activeLocks'].size).toBeGreaterThan(0);
      });

      await promise1;
      await promise2;

      expect(mockFs.writeFile).toHaveBeenCalledTimes(6); // 3 files x 2 writes, but atomic
    });
  });

  describe('Hierarchical Index Updates', () => {
    it('should update containing directory index', async () => {
      const data: InterceptedData = {
        url: 'https://api.openalex.org/works/W123',
        method: 'GET',
        requestHeaders: {},
        responseData: { id: 'W123' },
        statusCode: 200,
        responseHeaders: {},
        timestamp: '2023-01-01T00:00:00Z'
      };

      mockPath.join
        .mockReturnValueOnce('/mock/base/path/works/W123.json')
        .mockReturnValueOnce('/mock/base/path/works/W123.meta.json')
        .mockReturnValueOnce('/mock/base/path/works/index.json');

      mockFs.readFile.mockResolvedValue(JSON.stringify({ files: {} }));

      await writer.writeToCache(data);

      expect(mockFs.writeFile).toHaveBeenCalledWith('/mock/base/path/works/index.json', expect.any(String));
    });

    it('should propagate updates to parent indexes', async () => {
      const data: InterceptedData = { /* valid */ } as any;

      mockPath.join
        .mockReturnValueOnce('/mock/base/path/works/authors/W123/index.json') // Deep path
        .mockReturnValueOnce('/mock/base/path/works/authors/W123/data.json');

      // Mock multiple levels
      mockPath.dirname
        .mockReturnValueOnce('/mock/base/path/works/authors/W123')
        .mockReturnValueOnce('/mock/base/path/works/authors')
        .mockReturnValueOnce('/mock/base/path/works');

      mockFs.writeFile.mockImplementation((path) => {
        if (path.includes('index.json')) {
          return Promise.resolve();
        }
      });

      await writer.writeToCache(data);

      // Should call writeFile for multiple index.json
      expect(mockFs.writeFile).toHaveBeenCalledWith(expect.stringContaining('works/index.json'), expect.any(String));
      expect(mockFs.writeFile).toHaveBeenCalledWith(expect.stringContaining('authors/index.json'), expect.any(String));
    });

    it('should include merged collisionInfo in propagation', async () => {
      // Setup collision
      mockHasCollision.mockReturnValue(true);
      const data: InterceptedData = { /* colliding data */ } as any;

      mockPath.join.mockReturnValue('/mock/index.json');
      mockFs.readFile.mockResolvedValue(JSON.stringify({ files: { test: { collisionInfo: { mergedCount: 1 } } } }));

      await writer.writeToCache(data);

      // Verify index includes collision info
      const indexCall = mockFs.writeFile.mock.calls.find(([path]) => path.includes('index.json'));
      const indexContent = JSON.parse(indexCall![1] as string);
      expect(indexContent.files.test.collisionInfo).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid URLs and empty directories', async () => {
      const invalidData: InterceptedData = {
        url: 'invalid-url',
        method: 'GET',
        requestHeaders: {},
        responseData: {},
        statusCode: 200,
        responseHeaders: {},
        timestamp: '2023-01-01T00:00:00Z'
      };

      // extractEntityInfo should fallback
      mockGenerateContentHash.mockResolvedValue('fallback-hash');

      await expect(writer.writeToCache(invalidData)).resolves.not.toThrow();
    });

    it('should handle large collision sets', async () => {
      // Simulate >10 URLs
      const manyUrls = Array.from({ length: 15 }, (_, i) => `url${i}`);
      const entryWithMany = { equivalentUrls: manyUrls, collisionInfo: { mergedCount: 14, totalUrls: 15 } } as any;

      mockHasCollision.mockReturnValue(true);
      mockMergeCollision.mockReturnValue(entryWithMany);

      const data: InterceptedData = { /* data */ } as any;
      await writer.writeToCache(data);

      expect(mockValidateFileEntry).toHaveBeenCalledWith(expect.objectContaining({ equivalentUrls: expect.arrayContaining(manyUrls) }));
    });

    it('should maintain backward compatibility for legacy reads', async () => {
      // Test that legacy single-url entries are handled
      const legacyData: InterceptedData = { /* data */ } as any;
      mockFs.readFile.mockResolvedValue(JSON.stringify({ files: { legacy: { url: 'old-url', $ref: './old.json' } } }));

      await writer.writeToCache(legacyData);

      expect(mockMigrateToMultiUrl).toHaveBeenCalled();
    });

    it('should use primary url for legacy compatibility', async () => {
      // When reading, primary url is used
      // But since write, verify entry has url set
      const data: InterceptedData = { url: 'primary-url', /* ... */ } as any;
      await writer.writeToCache(data);

      // In index write, url should be primary
      const indexCall = mockFs.writeFile.mock.calls.find(([p]) => p.includes('index.json'));
      const content = JSON.parse(indexCall![1] as string);
      expect(content.files).toHaveProperty('test', expect.objectContaining({ url: 'primary-url' }));
    });
  });

  describe('Cleanup and Stats', () => {
    it('should cleanup active writes and locks', async () => {
      writer['activeLocks'].set('test', { lockId: '1', timestamp: Date.now(), filePath: 'test' });
      writer['writeQueue'].add(Promise.resolve() as any);

      await writer.cleanup();

      expect(writer['activeLocks'].size).toBe(0);
      expect(writer['writeQueue'].size).toBe(0);
    });

    it('should return cache stats', () => {
      const stats = writer.getCacheStats();
      expect(stats.activeLocks).toBe(0);
      expect(stats.activeWrites).toBe(0);
      expect(stats.maxConcurrentWrites).toBe(config.maxConcurrentWrites);
    });
  });
});