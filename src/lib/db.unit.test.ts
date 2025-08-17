import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { IDBPDatabase } from 'idb';

// Unmock the database module to get the real implementation
vi.unmock('@/lib/db');

// Mock the idb module entirely - define in factory to avoid hoisting issues
vi.mock('idb', () => ({
  openDB: vi.fn(),
}));

// Import the actual implementation after setting up mocks
import { DatabaseService } from './db';
// Get the mocked openDB function
import { openDB } from 'idb';
const mockOpenDB = vi.mocked(openDB);

import { 
  createMockDatabase, 
  createMockTransaction, 
  createMockObjectStore,
  type MockDatabase,
  type MockTransaction,
  type MockObjectStore
} from './db.test-utils';

describe('DatabaseService', () => {
  let mockDB: MockDatabase;
  let mockTransaction: MockTransaction;
  let mockObjectStore: MockObjectStore;
  let testDb: DatabaseService;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    vi.clearAllTimers();

    // Create mock objects
    mockObjectStore = createMockObjectStore();
    mockTransaction = createMockTransaction();
    mockDB = createMockDatabase();
    
    // Setup transaction to return mock object store
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    
    // Setup database to return mock transaction
    mockDB.transaction.mockReturnValue(mockTransaction);

    // Setup the module-level mock with correct signature including upgrade handling
    mockOpenDB.mockImplementation(async (name: string, version?: number, config?: any) => {
      // Call the upgrade function if provided
      if (config && config.upgrade && version !== undefined) {
        config.upgrade(mockDB, 0, version, mockTransaction, {} as IDBVersionChangeEvent);
      }
      return mockDB as unknown as IDBPDatabase;
    });

    // Create instance (now using the mocked module)
    testDb = new DatabaseService();
  });

  afterEach(() => {
    // Reset database instance
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
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const oldEntries = [
        ['key1', { timestamp: now - (40 * oneDayMs) }], // 40 days old - should be deleted
        ['key2', { timestamp: now - (50 * oneDayMs) }], // 50 days old - should be deleted
        ['key3', { timestamp: now - (20 * oneDayMs) }], // 20 days old - should be kept
      ];
      
      mockDB.getAllKeys.mockResolvedValueOnce(['key1', 'key2', 'key3']);
      mockDB.get
        .mockResolvedValueOnce(oldEntries[0][1])
        .mockResolvedValueOnce(oldEntries[1][1])
        .mockResolvedValueOnce(oldEntries[2][1]);

      const deletedCount = await testDb.cleanOldSearchResults(30); // 30 days cutoff

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
    beforeEach(async () => {
      await testDb.init();
      vi.clearAllMocks();
    });

    it('should generate consistent hash for same input', async () => {
      // Test indirectly by caching the same query twice and verifying it uses the same key
      const query = 'test query';
      const filters = { filter: 'value' };
      const results = [{ id: '1' }];
      
      await testDb.cacheSearchResults(query, results, 1, filters);
      await testDb.cacheSearchResults(query, results, 1, filters);
      
      // Should call put twice with same key
      expect(mockDB.put).toHaveBeenCalledTimes(2);
      const calls = mockDB.put.mock.calls;
      expect(calls[0][2]).toBe(calls[1][2]); // Same keys
    });

    it('should generate different hash for different input', async () => {
      // Test by caching different queries and verifying different keys are used
      await testDb.cacheSearchResults('query1', [], 0);
      await testDb.cacheSearchResults('query2', [], 0);
      
      expect(mockDB.put).toHaveBeenCalledTimes(2);
      const calls = mockDB.put.mock.calls;
      expect(calls[0][2]).not.toBe(calls[1][2]); // Different keys
    });

    it('should generate different hash for different filters', async () => {
      // Test by caching same query with different filters
      const query = 'test query';
      await testDb.cacheSearchResults(query, [], 0, { filter: 'value1' });
      await testDb.cacheSearchResults(query, [], 0, { filter: 'value2' });
      
      expect(mockDB.put).toHaveBeenCalledTimes(2);
      const calls = mockDB.put.mock.calls;
      expect(calls[0][2]).not.toBe(calls[1][2]); // Different keys
    });

    it('should generate unique IDs', async () => {
      // Test by creating collections and verifying unique IDs
      const id1 = await testDb.createCollection('Collection 1');
      const id2 = await testDb.createCollection('Collection 2');
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('Error Handling', () => {
    it('should handle database operation errors', async () => {
      mockOpenDB.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(testDb.getPaper('test')).rejects.toThrow('Connection failed');
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