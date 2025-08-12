import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { db } from './db';
import type { IDBPDatabase } from 'idb';

// Mock the idb module
vi.mock('idb', () => ({
  openDB: vi.fn(),
}));

describe('DatabaseService', () => {
  let mockDB: any;
  let mockTransaction: any;
  let mockObjectStore: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset the db instance
    (db as any).db = null;
    
    // Create mock object store
    mockObjectStore = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(),
      getAllKeys: vi.fn(),
    };

    // Create mock transaction
    mockTransaction = {
      objectStore: vi.fn(() => mockObjectStore),
      done: Promise.resolve(),
    };

    // Create mock database
    mockDB = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(),
      getAllKeys: vi.fn(),
      transaction: vi.fn(() => mockTransaction),
      objectStoreNames: {
        contains: vi.fn(() => false),
      },
      createObjectStore: vi.fn(),
      close: vi.fn(),
    };

    // Mock openDB to return our mock database
    const { openDB } = await import('idb');
    (openDB as any).mockImplementation((name: string, version: number, config: any) => {
      // Simulate upgrade callback
      if (config && config.upgrade) {
        config.upgrade(mockDB);
      }
      return Promise.resolve(mockDB);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Database Initialization', () => {
    it('should initialize database with correct stores', async () => {
      const { openDB } = await import('idb');
      
      await db.init();

      expect(openDB).toHaveBeenCalledWith('academic-explorer', 1, {
        upgrade: expect.any(Function),
      });
    });

    it('should create object stores during upgrade', async () => {
      const { openDB } = await import('idb');
      
      // Test the upgrade function
      mockDB.objectStoreNames.contains.mockReturnValue(false);
      
      await db.init();

      expect(mockDB.createObjectStore).toHaveBeenCalledWith('searchResults');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('papers');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('citations');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('collections');
    });

    it('should not recreate existing object stores', async () => {
      const { openDB } = await import('idb');
      
      // Simulate that stores already exist
      mockDB.objectStoreNames.contains.mockReturnValue(true);
      
      await db.init();

      expect(mockDB.createObjectStore).not.toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      const { openDB } = await import('idb');
      
      await db.init();
      await db.init(); // Second call
      
      // Should only be called once
      expect(openDB).toHaveBeenCalledTimes(1);
    });

    it('should throw error if database fails to initialize', async () => {
      // Set db to null to force initialization
      (db as any).db = null;
      
      // Mock the init method to fail
      const originalInit = db.init;
      db.init = vi.fn().mockResolvedValue(undefined);
      
      // This should trigger the ensureDB error path
      await expect(db.getPaper('test')).rejects.toThrow('Failed to initialise database');
      
      // Restore original method
      db.init = originalInit;
    });
  });

  describe('Search Results Cache', () => {
    beforeEach(async () => {
      await db.init();
    });

    it('should cache search results with generated key', async () => {
      const results = [{ id: '1', title: 'Test Paper' }];
      const query = 'machine learning';
      const filters = { year: 2023 };

      await db.cacheSearchResults(query, results, 10, filters);

      expect(mockDB.put).toHaveBeenCalledWith(
        'searchResults',
        {
          query,
          results,
          totalCount: 10,
          filters,
          timestamp: expect.any(Number),
        },
        expect.any(String)
      );
    });

    it('should cache search results without filters', async () => {
      const results = [{ id: '1', title: 'Test Paper' }];
      const query = 'machine learning';

      await db.cacheSearchResults(query, results, 5);

      expect(mockDB.put).toHaveBeenCalledWith(
        'searchResults',
        {
          query,
          results,
          totalCount: 5,
          filters: undefined,
          timestamp: expect.any(Number),
        },
        expect.any(String)
      );
    });

    it('should retrieve cached search results within max age', async () => {
      const cachedData = {
        query: 'test',
        results: [{ id: '1' }],
        timestamp: Date.now() - 1000, // 1 second ago
        totalCount: 1,
      };

      mockDB.get.mockResolvedValue(cachedData);

      const result = await db.getSearchResults('test', undefined, 5000); // 5 second max age

      expect(result).toEqual(cachedData);
      expect(mockDB.get).toHaveBeenCalledWith('searchResults', expect.any(String));
    });

    it('should return null for expired cached results', async () => {
      const cachedData = {
        query: 'test',
        results: [{ id: '1' }],
        timestamp: Date.now() - 10000, // 10 seconds ago
        totalCount: 1,
      };

      mockDB.get.mockResolvedValue(cachedData);

      const result = await db.getSearchResults('test', undefined, 5000); // 5 second max age

      expect(result).toBeNull();
    });

    it('should return null when no cached data exists', async () => {
      mockDB.get.mockResolvedValue(undefined);

      const result = await db.getSearchResults('test');

      expect(result).toBeNull();
    });

    it('should generate consistent hash for same query and filters', async () => {
      const query = 'test';
      const filters = { year: 2023, author: 'Smith' };
      
      // Call cacheSearchResults twice with same params
      await db.cacheSearchResults(query, [], 0, filters);
      await db.cacheSearchResults(query, [], 0, filters);

      // Should use the same key both times
      const calls = mockDB.put.mock.calls;
      expect(calls[0][2]).toEqual(calls[1][2]); // Third parameter is the key
    });
  });

  describe('Papers Management', () => {
    beforeEach(async () => {
      await db.init();
    });

    it('should save paper with current timestamp', async () => {
      const paper = {
        id: 'paper1',
        title: 'Test Paper',
        authors: ['Author 1'],
      };

      await db.savePaper(paper);

      expect(mockDB.put).toHaveBeenCalledWith('papers', {
        ...paper,
        savedAt: expect.any(Number),
      });
    });

    it('should preserve existing savedAt timestamp', async () => {
      const savedAt = Date.now() - 10000;
      const paper = {
        id: 'paper1',
        title: 'Test Paper',
        authors: ['Author 1'],
        savedAt,
      };

      await db.savePaper(paper);

      expect(mockDB.put).toHaveBeenCalledWith('papers', {
        ...paper,
        savedAt,
      });
    });

    it('should retrieve paper by id', async () => {
      const paper = { id: 'paper1', title: 'Test Paper' };
      mockDB.get.mockResolvedValue(paper);

      const result = await db.getPaper('paper1');

      expect(result).toEqual(paper);
      expect(mockDB.get).toHaveBeenCalledWith('papers', 'paper1');
    });

    it('should retrieve all papers', async () => {
      const papers = [
        { id: 'paper1', title: 'Paper 1' },
        { id: 'paper2', title: 'Paper 2' },
      ];
      mockDB.getAll.mockResolvedValue(papers);

      const result = await db.getAllPapers();

      expect(result).toEqual(papers);
      expect(mockDB.getAll).toHaveBeenCalledWith('papers');
    });

    it('should delete paper by id', async () => {
      await db.deletePaper('paper1');

      expect(mockDB.delete).toHaveBeenCalledWith('papers', 'paper1');
    });
  });

  describe('Collections Management', () => {
    beforeEach(async () => {
      await db.init();
    });

    it('should create collection with generated id', async () => {
      const name = 'My Collection';
      const description = 'Test collection';

      const id = await db.createCollection(name, description);

      expect(typeof id).toBe('string');
      expect(id).toMatch(/^\d+-[a-z0-9]+$/); // timestamp-randomstring format
      expect(mockDB.put).toHaveBeenCalledWith('collections', {
        id,
        name,
        description,
        paperIds: [],
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
    });

    it('should create collection without description', async () => {
      const name = 'My Collection';

      const id = await db.createCollection(name);

      expect(mockDB.put).toHaveBeenCalledWith('collections', {
        id: expect.any(String),
        name,
        description: undefined,
        paperIds: [],
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
    });

    it('should add paper to existing collection', async () => {
      const collection = {
        id: 'collection1',
        name: 'Test Collection',
        paperIds: ['paper1'],
        createdAt: Date.now(),
        updatedAt: Date.now() - 1000,
      };
      mockDB.get.mockResolvedValue(collection);

      await db.addToCollection('collection1', 'paper2');

      expect(mockDB.put).toHaveBeenCalledWith('collections', {
        ...collection,
        paperIds: ['paper1', 'paper2'],
        updatedAt: expect.any(Number),
      });
    });

    it('should not add duplicate paper to collection', async () => {
      const collection = {
        id: 'collection1',
        name: 'Test Collection',
        paperIds: ['paper1'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockDB.get.mockResolvedValue(collection);

      await db.addToCollection('collection1', 'paper1');

      // Should not call put since paper already exists
      expect(mockDB.put).not.toHaveBeenCalled();
    });

    it('should handle adding to non-existent collection', async () => {
      mockDB.get.mockResolvedValue(undefined);

      await db.addToCollection('nonexistent', 'paper1');

      // Should not call put for non-existent collection
      expect(mockDB.put).not.toHaveBeenCalled();
    });

    it('should retrieve all collections', async () => {
      const collections = [
        { id: 'collection1', name: 'Collection 1' },
        { id: 'collection2', name: 'Collection 2' },
      ];
      mockDB.getAll.mockResolvedValue(collections);

      const result = await db.getCollections();

      expect(result).toEqual(collections);
      expect(mockDB.getAll).toHaveBeenCalledWith('collections');
    });
  });

  describe('Cleanup Utilities', () => {
    beforeEach(async () => {
      await db.init();
    });

    it('should clean old search results', async () => {
      const now = Date.now();
      const oldTimestamp = now - (31 * 24 * 60 * 60 * 1000); // 31 days ago
      const recentTimestamp = now - (10 * 24 * 60 * 60 * 1000); // 10 days ago

      const keys = ['key1', 'key2', 'key3'];
      const values = [
        { timestamp: oldTimestamp },
        { timestamp: recentTimestamp },
        { timestamp: oldTimestamp },
      ];

      mockDB.getAllKeys.mockResolvedValue(keys);
      mockDB.get.mockImplementation((store: string, key: string) => {
        const index = keys.indexOf(key);
        return Promise.resolve(values[index]);
      });

      const deletedCount = await db.cleanOldSearchResults(30); // 30 days

      expect(deletedCount).toBe(2); // Should delete 2 old entries
      expect(mockDB.delete).toHaveBeenCalledTimes(2);
      expect(mockDB.delete).toHaveBeenCalledWith('searchResults', 'key1');
      expect(mockDB.delete).toHaveBeenCalledWith('searchResults', 'key3');
    });

    it('should handle empty search results during cleanup', async () => {
      mockDB.getAllKeys.mockResolvedValue([]);

      const deletedCount = await db.cleanOldSearchResults();

      expect(deletedCount).toBe(0);
      expect(mockDB.delete).not.toHaveBeenCalled();
    });

    it('should handle null values during cleanup', async () => {
      const keys = ['key1', 'key2'];
      mockDB.getAllKeys.mockResolvedValue(keys);
      mockDB.get.mockResolvedValue(null);

      const deletedCount = await db.cleanOldSearchResults();

      expect(deletedCount).toBe(0);
      expect(mockDB.delete).not.toHaveBeenCalled();
    });
  });

  describe('Storage Estimation', () => {
    beforeEach(async () => {
      await db.init();
    });

    it('should return storage estimate when available', async () => {
      const mockEstimate = {
        usage: 1024 * 1024, // 1MB
        quota: 100 * 1024 * 1024, // 100MB
      };

      // Mock navigator.storage.estimate
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: vi.fn().mockResolvedValue(mockEstimate),
        },
        configurable: true,
      });

      const result = await db.getStorageEstimate();

      expect(result).toEqual(mockEstimate);
    });

    it('should return empty object when storage API not available', async () => {
      // Mock navigator without storage
      const originalNavigator = global.navigator;
      global.navigator = {} as any;

      const result = await db.getStorageEstimate();

      expect(result).toEqual({});
      
      // Restore original navigator
      global.navigator = originalNavigator;
    });

    it('should return empty object when estimate method not available', async () => {
      // Mock storage without estimate method
      Object.defineProperty(navigator, 'storage', {
        value: {},
        configurable: true,
      });

      const result = await db.getStorageEstimate();

      expect(result).toEqual({});
    });
  });

  describe('Helper Methods', () => {
    beforeEach(async () => {
      await db.init();
    });

    it('should generate consistent hash for same input', () => {
      const hashQuery = (db as any).hashQuery.bind(db);
      
      const hash1 = hashQuery('test query', { filter: 'value' });
      const hash2 = hashQuery('test query', { filter: 'value' });
      
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
    });

    it('should generate different hash for different input', () => {
      const hashQuery = (db as any).hashQuery.bind(db);
      
      const hash1 = hashQuery('test query 1', { filter: 'value' });
      const hash2 = hashQuery('test query 2', { filter: 'value' });
      
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hash for different filters', () => {
      const hashQuery = (db as any).hashQuery.bind(db);
      
      const hash1 = hashQuery('test query', { filter: 'value1' });
      const hash2 = hashQuery('test query', { filter: 'value2' });
      
      expect(hash1).not.toBe(hash2);
    });

    it('should generate unique IDs', () => {
      const generateId = (db as any).generateId.bind(db);
      
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('Error Handling', () => {
    it('should handle database initialization errors', async () => {
      const { openDB } = await import('idb');
      (openDB as any).mockRejectedValue(new Error('DB init failed'));

      await expect(db.init()).rejects.toThrow('DB init failed');
    });

    it('should handle errors in ensureDB', async () => {
      // Reset db to null
      (db as any).db = null;
      
      const { openDB } = await import('idb');
      (openDB as any).mockRejectedValue(new Error('Connection failed'));

      await expect(db.getPaper('test')).rejects.toThrow('Connection failed');
    });

    it('should handle database operation errors', async () => {
      await db.init();
      mockDB.get.mockRejectedValue(new Error('Get operation failed'));

      await expect(db.getPaper('test')).rejects.toThrow('Get operation failed');
    });

    it('should handle put operation errors', async () => {
      await db.init();
      mockDB.put.mockRejectedValue(new Error('Put operation failed'));

      const paper = {
        id: 'test',
        title: 'Test',
        authors: [],
      };

      await expect(db.savePaper(paper)).rejects.toThrow('Put operation failed');
    });

    it('should handle delete operation errors', async () => {
      await db.init();
      mockDB.delete.mockRejectedValue(new Error('Delete operation failed'));

      await expect(db.deletePaper('test')).rejects.toThrow('Delete operation failed');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await db.init();
    });

    it('should handle empty string queries', async () => {
      await db.cacheSearchResults('', [], 0);
      
      expect(mockDB.put).toHaveBeenCalledWith(
        'searchResults',
        expect.objectContaining({ query: '' }),
        expect.any(String)
      );
    });

    it('should handle null filters', async () => {
      const result = await db.getSearchResults('test', null as any);
      
      expect(mockDB.get).toHaveBeenCalledWith('searchResults', expect.any(String));
    });

    it('should handle papers with minimal data', async () => {
      const minimalPaper = {
        id: 'minimal',
        title: '',
        authors: [],
      };

      await db.savePaper(minimalPaper);

      expect(mockDB.put).toHaveBeenCalledWith('papers', {
        ...minimalPaper,
        savedAt: expect.any(Number),
      });
    });

    it('should handle very long collection names', async () => {
      const longName = 'x'.repeat(1000);
      
      const id = await db.createCollection(longName);
      
      expect(mockDB.put).toHaveBeenCalledWith('collections', 
        expect.objectContaining({ name: longName })
      );
    });

    it('should handle cleanup with zero days', async () => {
      mockDB.getAllKeys.mockResolvedValue([]);

      const deletedCount = await db.cleanOldSearchResults(0);

      expect(deletedCount).toBe(0);
    });
  });
});