import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { openalexCachePlugin, type OpenAlexCachePluginOptions } from './openalex-cache.js';
import { readFile, writeFile, mkdir, rm, access } from 'node:fs/promises';
import { mkdtemp, join } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as pathModule from 'node:path';
import { execSync } from 'child_process';
import * as fs from 'fs';
import {
  generateContentHash,
  parseOpenAlexUrl,
  getCacheFilePath,
  hasCollision,
  mergeCollision,
  reconstructPossibleCollisions,
  migrateToMultiUrl,
  validateFileEntry,
  type DirectoryIndex,
  type FileEntry
} from '../../packages/utils/src/static-data/cache-utilities.js';

// Mock Node.js modules for controlled testing
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  rm: vi.fn(),
  access: vi.fn()
}));

vi.mock('node:path', () => ({
  join: vi.fn(),
  dirname: vi.fn(),
  basename: vi.fn(),
  relative: vi.fn(),
  resolve: vi.fn()
}));

vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

// Mock cache utilities
vi.mock('../../packages/utils/src/static-data/cache-utilities.js', async () => {
  const actual = await vi.importActual('../../packages/utils/src/static-data/cache-utilities.js');
  return {
    ...actual,
    generateContentHash: vi.fn(),
    parseOpenAlexUrl: vi.fn(),
    getCacheFilePath: vi.fn(),
    hasCollision: vi.fn(),
    mergeCollision: vi.fn(),
    reconstructPossibleCollisions: vi.fn(),
    migrateToMultiUrl: vi.fn(),
    validateFileEntry: vi.fn()
  };
});

const mockReadFile = readFile as ReturnType<typeof vi.fn>;
const mockWriteFile = writeFile as ReturnType<typeof vi.fn>;
const mockMkdir = mkdir as ReturnType<typeof vi.fn>;
const mockRm = rm as ReturnType<typeof vi.fn>;
const mockAccess = access as ReturnType<typeof vi.fn>;
const mockPathJoin = pathModule.join as ReturnType<typeof vi.fn>;
const mockExecSync = execSync as ReturnType<typeof vi.fn>;
const mockGenerateContentHash = generateContentHash as ReturnType<typeof vi.fn>;
const mockParseOpenAlexUrl = parseOpenAlexUrl as ReturnType<typeof vi.fn>;
const mockGetCacheFilePath = getCacheFilePath as ReturnType<typeof vi.fn>;
const mockHasCollision = hasCollision as ReturnType<typeof vi.fn>;
const mockMergeCollision = mergeCollision as ReturnType<typeof vi.fn>;
const mockReconstructPossibleCollisions = reconstructPossibleCollisions as ReturnType<typeof vi.fn>;
const mockMigrateToMultiUrl = migrateToMultiUrl as ReturnType<typeof vi.fn>;
const mockValidateFileEntry = validateFileEntry as ReturnType<typeof vi.fn>;

// Mock Vite types for plugin testing
const mockServer = {
  middlewares: {
    use: vi.fn()
  }
} as any;

const mockConfig = {
  command: 'serve',
  root: '/mock/root'
} as any;

describe('OpenAlex Cache Plugin Integration Tests', () => {
  let tempDir: string;
  let staticDataDir: string;
  let plugin: ReturnType<typeof openalexCachePlugin>;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await mkdtemp(join(tmpdir(), 'openalex-cache-test-'));
    staticDataDir = join(tempDir, 'public/data/openalex');

    // Setup mocks
    vi.clearAllMocks();
    mockGenerateContentHash.mockResolvedValue('mock-hash');
    mockParseOpenAlexUrl.mockImplementation((url: string) => ({
      pathSegments: url.includes('?') ? ['works'] : ['works', 'W123'],
      isQuery: url.includes('?'),
      queryString: url.includes('?') ? '?filter=doi:10.1234/test' : '',
      entityType: 'works'
    }));
    mockGetCacheFilePath.mockImplementation((url: string) => join(staticDataDir, 'works', url.includes('?') ? 'queries/filter_doi_10_1234_test.json' : 'W123.json'));
    mockHasCollision.mockReturnValue(false);
    mockMergeCollision.mockImplementation((entry: FileEntry, url: string) => ({ ...entry, equivalentUrls: [...(entry.equivalentUrls || [entry.url]), url] }));
    mockReconstructPossibleCollisions.mockImplementation((filename: string, type: string) => [
      `https://api.openalex.org/${type}?filter=doi:10.1234/test`,
      `https://api.openalex.org/${type}?filter=doi:10.1234/test&api_key=dummy`,
      `https://api.openalex.org/${type}?filter=doi:10.1234/test&mailto=test@example.com`
    ]);
    mockMigrateToMultiUrl.mockImplementation((entry: FileEntry) => ({
      ...entry,
      equivalentUrls: [entry.url],
      urlTimestamps: { [entry.url]: entry.lastRetrieved },
      collisionInfo: { mergedCount: 0, totalUrls: 1 }
    }));
    mockValidateFileEntry.mockReturnValue(true);

    mockPathJoin.mockImplementation((...parts: string[]) => parts.join('/'));
    mockExecSync.mockReturnValue('test@example.com');

    mockReadFile.mockImplementation(async (path: string) => {
      if (path.includes('index.json')) {
        return JSON.stringify({ lastUpdated: '2023-01-01T00:00:00Z', files: {}, directories: {} });
      }
      if (path.includes('.json') && !path.includes('index.json')) {
        return JSON.stringify({ id: 'W123', display_name: 'Test Work' });
      }
      throw new Error('File not found');
    });

    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockRm.mockResolvedValue(undefined);
    mockAccess.mockResolvedValue(undefined);

    // Initialize plugin
    plugin = openalexCachePlugin({ staticDataPath: join(tempDir, 'public/data/openalex'), verbose: true, dryRun: false });
    await plugin.configResolved(mockConfig);
  });

  afterEach(async () => {
    if (tempDir) {
      await mockRm(tempDir, { recursive: true });
    }
  });

  describe('Index Reconstruction', () => {
    it('should scan mock directory with legacy files and migrate entries', async () => {
      // Setup mock directory with legacy file
      const legacyFilePath = join(staticDataDir, 'works', 'legacy-query.json');
      mockReadFile.mockImplementation(async (path: string) => {
        if (path === legacyFilePath) {
          // Legacy format: wrapped with retrieved_at, no multi-URL fields
          return JSON.stringify({
            retrieved_at: '2023-01-01T00:00:00Z',
            contentHash: 'legacy-hash',
            results: [{ id: 'W456' }]
          });
        }
        return super.mockReadFile(path); // Default
      });

      mockPathJoin.mockReturnValueOnce(legacyFilePath); // For readdir simulation

      // Mock readdir to include legacy file
      const mockReaddir = vi.fn().mockResolvedValue(['legacy-query.json', 'index.json']);
      // Override for integration, but since plugin uses fs directly, mock globally

      // Trigger index update by simulating a cache save
      const mockSaveToCache = vi.spyOn(plugin, 'saveToCache' as any).mockImplementation(async () => {
        // Simulate calling updateDirectoryIndexes
        const updateSpy = vi.spyOn(plugin, 'updateDirectoryIndexes' as any);
        await updateSpy(join(staticDataDir, 'works', 'queries', 'new.json'), 'https://api.openalex.org/works?filter=new', 'new', '2023-01-02T00:00:00Z', 'new-hash');
      });

      // Simulate a request that triggers caching
      const mockReq = { url: '/api/openalex/works?filter=doi:10.1234/test' } as any;
      const mockRes = { setHeader: vi.fn(), end: vi.fn(), statusCode: 200 } as any;
      const mockNext = vi.fn();

      await plugin.configureServer!(mockServer);
      mockServer.middlewares.use.mock.calls[0][1](mockReq, mockRes, mockNext);

      // Verify migration occurred
      expect(mockMigrateToMultiUrl).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalledWith(expect.stringContaining('index.json'), expect.stringContaining('equivalentUrls'));
    });

    it('should scan mock directory with multi-URL files and preserve collisions', async () => {
      // Setup multi-URL file
      const multiFilePath = join(staticDataDir, 'works', 'multi-query.json');
      mockReadFile.mockImplementation(async (path: string) => {
        if (path === multiFilePath) {
          return JSON.stringify({
            id: 'W789',
            display_name: 'Multi Work',
            // Raw data, but index will have multi entry
          });
        }
        if (path.includes('index.json')) {
          return JSON.stringify({
            lastUpdated: '2023-01-01T00:00:00Z',
            files: {
              'multi-query': {
                url: 'https://api.openalex.org/works?filter=doi:10.1234/test',
                $ref: './multi-query.json',
                lastRetrieved: '2023-01-01T00:00:00Z',
                contentHash: 'multi-hash',
                equivalentUrls: ['https://api.openalex.org/works?filter=doi:10.1234/test', 'https://api.openalex.org/works?api_key=secret&filter=doi:10.1234/test'],
                collisionInfo: { mergedCount: 1, totalUrls: 2 }
              }
            }
          });
        }
        throw new Error('File not found');
      });

      // Trigger reconstruction via update
      const mockUpdate = vi.spyOn(plugin, 'updateDirectoryIndexWithAggregation' as any).mockImplementation(async () => {
        // Simulate scanning
        const readdirSpy = vi.spyOn(fs, 'readdirSync').mockReturnValue(['multi-query.json', 'index.json']);
        const statSpy = vi.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false, mtime: new Date() });
        // Call internal logic
      });

      await plugin['updateDirectoryIndexWithAggregation'](staticDataDir, 'https://api.openalex.org/works', 'multi-query', '2023-01-02T00:00:00Z', 'updated-hash');

      expect(mockValidateFileEntry).toHaveBeenCalled();
      expect(mockReconstructPossibleCollisions).toHaveBeenCalledWith('multi-query', 'works');
      // Index should preserve collisionInfo
      expect(mockWriteFile).toHaveBeenCalledWith(expect.stringContaining('index.json'), expect.stringContaining('"mergedCount":1'));
    });

    it('should infer collisions from filename during reconstruction', async () => {
      const queryFilename = 'filter=doi:10.1234/test';
      mockReaddir.mockResolvedValue([` ${queryFilename}.json`]);

      await plugin['updateDirectoryIndexWithAggregation'](join(staticDataDir, 'works/queries'), 'https://api.openalex.org/works', `${queryFilename}.json`, '2023-01-02T00:00:00Z', 'hash');

      expect(mockReconstructPossibleCollisions).toHaveBeenCalledWith(queryFilename, 'works');
      expect(mockHasCollision).toHaveBeenCalledTimes(3); // For each possible URL
      expect(mockMergeCollision).toHaveBeenCalled();
    });
  });

  describe('Dry-Run Mode', () => {
    beforeEach(() => {
      plugin = openalexCachePlugin({ dryRun: true, verbose: true });
    });

    it('should log preview of migrations without writing files', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Setup legacy file for migration preview
      mockReadFile.mockResolvedValueOnce(JSON.stringify({ retrieved_at: 'old' })); // Legacy

      await plugin['updateDirectoryIndexWithAggregation'](staticDataDir, 'https://api.openalex.org/works', 'legacy.json', '2023-01-02T00:00:00Z', 'hash');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[DRY-RUN] Would update directory index'));
      expect(mockWriteFile).not.toHaveBeenCalled(); // No writes
      expect(mockMigrateToMultiUrl).toHaveBeenCalled(); // Still processes for preview
    });

    it('should log preview of detected collisions without merging', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockHasCollision.mockReturnValue(true); // Simulate collision

      await plugin['updateDirectoryIndexWithAggregation'](staticDataDir, 'https://api.openalex.org/works?api_key=secret', 'collision.json', '2023-01-02T00:00:00Z', 'hash');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('collisions detected'));
      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(mockMergeCollision).toHaveBeenCalled(); // Processes but no write
    });
  });

  describe('Aggregation Across Subdirectories', () => {
    it('should merge collisionInfo from subdirectories into parent index', async () => {
      // Setup child dir with collisions
      const childIndexPath = join(staticDataDir, 'works/subdir/index.json');
      mockReadFile.mockImplementation(async (path: string) => {
        if (path === childIndexPath) {
          return JSON.stringify({
            lastUpdated: '2023-01-02T00:00:00Z',
            aggregatedCollisions: { totalMerged: 2, lastCollision: '2023-01-02T10:00:00Z', totalWithCollisions: 1 }
          });
        }
        if (path.includes('index.json')) {
          return JSON.stringify({ lastUpdated: '2023-01-01T00:00:00Z', files: { test: { collisionInfo: { mergedCount: 1 } } } });
        }
        return JSON.stringify({ results: [] });
      });

      // Mock directories structure
      const mockReaddirChild = vi.fn().mockResolvedValue(['index.json', 'file.json']);
      // Assume plugin scans

      await plugin['aggregateFromChildren'](join(staticDataDir, 'works/subdir'));

      // Trigger parent update
      await plugin['updateDirectoryIndexWithAggregation'](join(staticDataDir, 'works'), 'https://api.openalex.org/works', 'agg.json', '2023-01-03T00:00:00Z', 'hash', {
        lastUpdated: '2023-01-02T00:00:00Z',
        aggregatedCollisions: { totalMerged: 2, lastCollision: '2023-01-02T10:00:00Z', totalWithCollisions: 1 }
      });

      // Verify merged totals
      const writeCall = mockWriteFile.mock.calls.find(([p]) => p.includes('works/index.json'));
      const indexContent: DirectoryIndex = JSON.parse(writeCall![1] as string);
      expect(indexContent.aggregatedCollisions!.totalMerged).toBe(3); // 1 local + 2 child
      expect(indexContent.aggregatedCollisions!.totalWithCollisions).toBe(2); // Assuming local has 1
      expect(indexContent.aggregatedCollisions!.lastCollision).toBe('2023-01-02T10:00:00Z'); // Max
    });

    it('should validate root index summaries after aggregation', async () => {
      // Setup multiple levels
      mockReadFile.mockImplementation(async (path: string) => {
        if (path.includes('root/index.json')) {
          return JSON.stringify({ aggregatedCollisions: { totalMerged: 5, totalWithCollisions: 3 } });
        }
        if (path.includes('child/index.json')) {
          return JSON.stringify({ aggregatedCollisions: { totalMerged: 3, totalWithCollisions: 2 } });
        }
        return JSON.stringify({ files: {}, directories: {} });
      });

      // Trigger root update
      await plugin['updateRootIndex']();

      const rootWrite = mockWriteFile.mock.calls.find(([p]) => p.includes('root/index.json'));
      const rootIndex: DirectoryIndex = JSON.parse(rootWrite![1] as string);

      expect(rootIndex.aggregatedCollisions!.totalMerged).toBeGreaterThan(0);
      expect(rootIndex.directories).toHaveProperty('works'); // Includes subdirs
      expect(validateFileEntry).toHaveBeenCalled(); // Validates entries
    });

    it('should aggregate timestamps as max lastUpdated from children', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({
        lastUpdated: '2023-01-01T00:00:00Z',
        directories: { sub: { $ref: './sub', lastModified: '2023-01-03T00:00:00Z' } }
      }));

      const agg = await plugin['aggregateFromChildren'](staticDataDir);
      expect(agg.lastUpdated).toBe('2023-01-03T00:00:00Z'); // Max from child
    });
  });

  describe('Temporary Directory and FS Mocking', () => {
    it('should use temporary directories for isolated testing', async () => {
      expect(staticDataDir).toContain('openalex-cache-test-');
      expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining(staticDataDir), { recursive: true });
    });

    it('should mock fs operations without affecting real filesystem', async () => {
      // All operations mocked, no real writes
      await plugin['saveToCache'](join(staticDataDir, 'test.json'), 'https://api.openalex.org/works', { results: [] });

      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockMkdir).toHaveBeenCalled();
      // But no real fs changes
    });

    it('should cleanup temporary directories after tests', async () => {
      await afterEach(); // Simulate
      expect(mockRm).toHaveBeenCalledWith(tempDir, { recursive: true });
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid URLs and skip non-OpenAlex paths', async () => {
      const nonOpenAlexReq = { url: '/api/other' } as any;
      const mockRes = { end: vi.fn() } as any;
      const mockNext = vi.fn();

      await plugin.configureServer!(mockServer);
      mockServer.middlewares.use.mock.calls[1][1](nonOpenAlexReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockGetCacheFilePath).not.toHaveBeenCalled();
    });

    it('should handle empty directories without errors', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT')); // Empty dir, no index

      await plugin['updateDirectoryIndexWithAggregation'](staticDataDir, 'https://api.openalex.org/works', undefined, undefined, undefined);

      expect(mockWriteFile).toHaveBeenCalledWith(expect.stringContaining('index.json'), expect.stringContaining('lastUpdated'));
      // Creates empty index
    });

    it('should handle large collision sets in aggregation', async () => {
      // Simulate many collisions
      const largeAgg = { totalMerged: 50, totalWithCollisions: 20 };
      mockReadFile.mockResolvedValue(JSON.stringify({ aggregatedCollisions: largeAgg }));

      await plugin['aggregateFromChildren'](staticDataDir);

      // Should handle without error
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });
});