import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { IDBPDatabase, openDB } from 'idb';
import { DatabaseService } from './db';

// Create mock for the openDB function
const mockOpenDB = vi.fn();

interface MockObjectStore {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  getAll: ReturnType<typeof vi.fn>;
  getAllKeys: ReturnType<typeof vi.fn>;
}

interface MockTransaction {
  objectStore: ReturnType<typeof vi.fn>;
  done: Promise<void>;
}

interface MockDatabase {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  getAll: ReturnType<typeof vi.fn>;
  getAllKeys: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
  objectStoreNames: {
    contains: ReturnType<typeof vi.fn>;
  };
  createObjectStore: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

describe('DatabaseService', () => {
  let mockDB: MockDatabase;
  let mockTransaction: MockTransaction;
  let mockObjectStore: MockObjectStore;
  let testDb: DatabaseService;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
    vi.clearAllTimers();

    // Create mock object store
    mockObjectStore = {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      getAll: vi.fn().mockResolvedValue([]),
      getAllKeys: vi.fn().mockResolvedValue([]),
    };

    // Create mock transaction
    mockTransaction = {
      objectStore: vi.fn().mockReturnValue(mockObjectStore),
      done: Promise.resolve(),
    };

    // Create mock database
    mockDB = {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      getAll: vi.fn().mockResolvedValue([]),
      getAllKeys: vi.fn().mockResolvedValue([]),
      transaction: vi.fn().mockReturnValue(mockTransaction),
      objectStoreNames: {
        contains: vi.fn().mockReturnValue(false),
      },
      createObjectStore: vi.fn(),
      close: vi.fn(),
    };

    // Setup mockOpenDB to return our mock database and call upgrade
    mockOpenDB.mockImplementation((name: string, version?: number, config?: { upgrade?: (db: unknown, oldVersion: number, newVersion: number | null, transaction: unknown, event: IDBVersionChangeEvent) => void }) => {
      if (config && config.upgrade && version !== undefined) {
        config.upgrade(mockDB, 0, version, mockTransaction, {} as IDBVersionChangeEvent);
      }
      return Promise.resolve(mockDB as unknown as IDBPDatabase);
    });

    // Create instance with explicit mock injection
    testDb = new DatabaseService(mockOpenDB as typeof openDB);
  });

  afterEach(async () => {
    // Reset database instance using proper private property access
    if (testDb) {
      // Access private property through unknown cast to avoid TypeScript errors
      (testDb as unknown as { db: IDBPDatabase | null }).db = null;
    }
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe('Database Initialization', () => {
    it('should initialize database with correct stores', async () => {
      await testDb.init();

      expect(mockOpenDB).toHaveBeenCalledWith('academic-explorer', 1, {
        upgrade: expect.any(Function),
      });
    });

    it('should create object stores during upgrade', async () => {
      mockDB.objectStoreNames.contains.mockReturnValue(false);
      
      await testDb.init();

      expect(mockDB.createObjectStore).toHaveBeenCalledWith('searchResults');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('papers');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('citations');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('collections');
    });

    it('should not recreate existing object stores', async () => {
      mockDB.objectStoreNames.contains.mockReturnValue(true);
      
      await testDb.init();

      expect(mockDB.createObjectStore).not.toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      await testDb.init();
      
      expect(mockOpenDB).toHaveBeenCalledTimes(1);
      
      vi.clearAllMocks();
      
      await testDb.init();
      
      expect(mockOpenDB).not.toHaveBeenCalled();
    });

    it('should throw error if database fails to initialize', async () => {
      mockOpenDB.mockRejectedValueOnce(new Error('DB init failed'));

      await expect(testDb.init()).rejects.toThrow('DB init failed');
    });
  });

  describe('Search Results Cache', () => {
    beforeEach(async () => {
      await testDb.init();
      vi.clearAllMocks(); // Clear init calls
    });

    it('should cache search results with generated key', async () => {
      const query = 'test search';
      const results = [{ id: '1' }];
      const filters = { year: 2023 };

      await testDb.cacheSearchResults(query, results, 10, filters);

      expect(mockDB.put).toHaveBeenCalledWith(
        'searchResults',
        {
          query,
          results,
          totalCount: 10,
          timestamp: expect.any(Number),
          filters,
        },
        expect.any(String), // hash key
      );
    });

    it('should cache search results without filters', async () => {
      const query = 'test search';
      const results = [{ id: '1' }];

      await testDb.cacheSearchResults(query, results, 5);

      expect(mockDB.put).toHaveBeenCalledWith(
        'searchResults',
        {
          query,
          results,
          totalCount: 5,
          timestamp: expect.any(Number),
          filters: undefined,
        },
        expect.any(String),
      );
    });

    it('should retrieve cached search results within max age', async () => {
      const cachedData = {
        query: 'test',
        results: [{ id: '1' }],
        timestamp: Date.now(),
        totalCount: 1,
      };
      
      mockDB.get.mockResolvedValueOnce(cachedData);

      const result = await testDb.getSearchResults('test', undefined, 60000);

      expect(result).toEqual(cachedData);
      expect(mockDB.get).toHaveBeenCalledWith('searchResults', expect.any(String));
    });

    it('should return null for expired cache', async () => {
      const expiredData = {
        query: 'test',
        results: [{ id: '1' }],
        timestamp: Date.now() - 120000, // 2 minutes ago
        totalCount: 1,
      };
      
      mockDB.get.mockResolvedValueOnce(expiredData);

      const result = await testDb.getSearchResults('test', undefined, 60000);

      expect(result).toBeNull();
    });

    it('should return null for cache miss', async () => {
      mockDB.get.mockResolvedValueOnce(undefined);

      const result = await testDb.getSearchResults('test', undefined, 60000);

      expect(result).toBeNull();
    });
  });

  describe('Papers Management', () => {
    beforeEach(async () => {
      await testDb.init();
      vi.clearAllMocks();
    });

    it('should save paper with current timestamp', async () => {
      const paper = {
        id: 'paper1',
        title: 'Test Paper',
        authors: ['Author 1'],
        savedAt: Date.now(),
      };

      await testDb.savePaper(paper);

      expect(mockDB.put).toHaveBeenCalledWith('papers', {
        ...paper,
        savedAt: expect.any(Number),
      });
    });

    it('should retrieve paper by ID', async () => {
      const paper = {
        id: 'paper1',
        title: 'Test Paper',
        authors: ['Author 1'],
        savedAt: Date.now(),
      };
      
      mockDB.get.mockResolvedValueOnce(paper);

      const result = await testDb.getPaper('paper1');

      expect(result).toEqual(paper);
      expect(mockDB.get).toHaveBeenCalledWith('papers', 'paper1');
    });

    it('should get all papers', async () => {
      const papers = [
        { id: 'paper1', title: 'Paper 1', authors: [] },
        { id: 'paper2', title: 'Paper 2', authors: [] },
      ];
      
      mockDB.getAll.mockResolvedValueOnce(papers);

      const result = await testDb.getAllPapers();

      expect(result).toEqual(papers);
      expect(mockDB.getAll).toHaveBeenCalledWith('papers');
    });

    it('should delete paper by ID', async () => {
      await testDb.deletePaper('paper1');

      expect(mockDB.delete).toHaveBeenCalledWith('papers', 'paper1');
    });
  });

  describe('Collections Management', () => {
    beforeEach(async () => {
      await testDb.init();
      vi.clearAllMocks();
    });

    it('should create collection with unique ID', async () => {
      const name = 'My Collection';

      const id = await testDb.createCollection(name);

      expect(typeof id).toBe('string');
      expect(mockDB.put).toHaveBeenCalledWith('collections', {
        id: expect.any(String),
        name,
        description: undefined,
        paperIds: [],
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
    });

    it('should add paper to collection', async () => {
      const collection = {
        id: 'collection1',
        name: 'Test Collection',
        paperIds: ['paper1'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      mockDB.get.mockResolvedValueOnce(collection);

      await testDb.addToCollection('collection1', 'paper2');

      expect(mockDB.put).toHaveBeenCalledWith('collections', {
        ...collection,
        paperIds: ['paper1', 'paper2'],
        updatedAt: expect.any(Number),
      });
    });

    it('should get all collections', async () => {
      const collections = [
        { id: 'collection1', name: 'Collection 1', paperIds: [] },
        { id: 'collection2', name: 'Collection 2', paperIds: [] },
      ];
      
      mockDB.getAll.mockResolvedValueOnce(collections);

      const result = await testDb.getCollections();

      expect(result).toEqual(collections);
      expect(mockDB.getAll).toHaveBeenCalledWith('collections');
    });
  });

  describe('Utility Methods', () => {
    beforeEach(async () => {
      await testDb.init();
      vi.clearAllMocks();
    });

    it('should clean old search results', async () => {
      const oldEntries = [
        ['key1', { timestamp: Date.now() - 100000 }],
        ['key2', { timestamp: Date.now() - 200000 }],
        ['key3', { timestamp: Date.now() - 50000 }], // recent
      ];
      
      mockDB.getAllKeys.mockResolvedValueOnce(['key1', 'key2', 'key3']);
      mockDB.get
        .mockResolvedValueOnce(oldEntries[0][1])
        .mockResolvedValueOnce(oldEntries[1][1])
        .mockResolvedValueOnce(oldEntries[2][1]);

      const deletedCount = await testDb.cleanOldSearchResults(30);

      expect(deletedCount).toBe(2);
      expect(mockDB.delete).toHaveBeenCalledTimes(2);
      expect(mockDB.delete).toHaveBeenCalledWith('searchResults', 'key1');
      expect(mockDB.delete).toHaveBeenCalledWith('searchResults', 'key2');
    });

    it('should get storage estimate', async () => {
      const mockEstimate = { quota: 1024 * 1024 * 1024, usage: 1024 * 1024 };
      
      // Mock navigator.storage.estimate
      Object.defineProperty(global, 'navigator', {
        value: {
          storage: {
            estimate: vi.fn().mockResolvedValue(mockEstimate),
          },
        },
        writable: true,
      });

      const result = await testDb.getStorageEstimate();

      expect(result).toEqual(mockEstimate);
    });
  });

  describe('Helper Methods', () => {
    // Type-safe access to private methods for testing
    interface TestableDatabase {
      hashQuery(query: string, filters?: Record<string, unknown>): string;
      generateId(): string;
    }

    beforeEach(async () => {
      await testDb.init();
    });

    it('should generate consistent hash for same input', async () => {
      const testableDb = testDb as unknown as TestableDatabase;
      
      const hash1 = testableDb.hashQuery('test query', { filter: 'value' });
      const hash2 = testableDb.hashQuery('test query', { filter: 'value' });
      
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
    });

    it('should generate different hash for different input', async () => {
      const testableDb = testDb as unknown as TestableDatabase;
      
      const hash1 = testableDb.hashQuery('test query 1', { filter: 'value' });
      const hash2 = testableDb.hashQuery('test query 2', { filter: 'value' });
      
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hash for different filters', async () => {
      const testableDb = testDb as unknown as TestableDatabase;
      
      const hash1 = testableDb.hashQuery('test query', { filter: 'value1' });
      const hash2 = testableDb.hashQuery('test query', { filter: 'value2' });
      
      expect(hash1).not.toBe(hash2);
    });

    it('should generate unique IDs', async () => {
      const testableDb = testDb as unknown as TestableDatabase;
      
      const id1 = testableDb.generateId();
      const id2 = testableDb.generateId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('Error Handling', () => {
    it('should handle database operation errors', async () => {
      const mockFn = mockOpenDB as ReturnType<typeof vi.fn>;
      mockFn.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(testDb.getPaper('test')).rejects.toThrow('Failed to initialise database');
    });

    it('should handle put operation errors', async () => {
      await testDb.init();
      mockDB.put.mockRejectedValueOnce(new Error('Put operation failed'));

      const paper = {
        id: 'W123',
        title: 'Test',
        authors: [],
        savedAt: Date.now()
      };

      await expect(testDb.savePaper(paper)).rejects.toThrow('Put operation failed');
    });

    it('should handle delete operation errors', async () => {
      await testDb.init();
      mockDB.delete.mockRejectedValueOnce(new Error('Delete operation failed'));

      await expect(testDb.deletePaper('test')).rejects.toThrow('Delete operation failed');
    });
  });
});