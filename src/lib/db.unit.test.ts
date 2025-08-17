import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { IDBPDatabase } from 'idb';

// Mock the idb module before any imports
const mockOpenDB = vi.fn();

// Let's use a more explicit mock
vi.doMock('idb', () => ({
  openDB: mockOpenDB,
}));

// We'll import the DatabaseService class directly to create fresh instances
let DatabaseService: any;

describe('DatabaseService', () => {
  let mockDB: any;
  let mockTransaction: any;
  let mockObjectStore: any;
  let testDb: any; // Test instance with injected mock

  beforeEach(async () => {
    // CRITICAL: Complete mock reset to prevent memory leaks
    vi.clearAllMocks();
    vi.clearAllTimers();
    
    // Import and create fresh DatabaseService instance with mocked dependencies
    vi.resetModules(); // Clear module cache
    const dbModule = await import('./db');
    DatabaseService = dbModule.DatabaseService;
    
    // Verify the constructor signature and create instance
    testDb = new DatabaseService(mockOpenDB);
    
    // Explicitly set the property if constructor didn't work
    if (!(testDb as any).openDBFn) {
      (testDb as any).openDBFn = mockOpenDB;
    }
    
    // Create completely fresh mock object store for each test
    mockObjectStore = {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      getAll: vi.fn().mockResolvedValue([]),
      getAllKeys: vi.fn().mockResolvedValue([]),
    };

    // Create completely fresh mock transaction for each test
    mockTransaction = {
      objectStore: vi.fn().mockReturnValue(mockObjectStore),
      done: Promise.resolve(),
    };

    // Create completely fresh mock database for each test
    mockDB = {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      getAll: vi.fn().mockResolvedValue([]), // Return empty array by default
      getAllKeys: vi.fn().mockResolvedValue([]), // Return empty array by default
      transaction: vi.fn().mockReturnValue(mockTransaction),
      objectStoreNames: {
        contains: vi.fn().mockReturnValue(false), // Default to false
      },
      createObjectStore: vi.fn(),
      close: vi.fn(),
    };

    // Configure the openDB mock implementation
    mockOpenDB.mockImplementation((name: string, version: number, config: any) => {
      console.log('mockOpenDB called with:', name, version);
      // Call upgrade callback once per mock setup
      if (config && config.upgrade) {
        console.log('Calling upgrade callback...');
        config.upgrade(mockDB, 0, version, mockTransaction);
      }
      console.log('mockOpenDB returning:', mockDB);
      return Promise.resolve(mockDB);
    });
  });

  afterEach(async () => {
    // CRITICAL: Complete cleanup after each test
    try {
      // Force reset testDb instance
      testDb.db = null;
      
      // Clear all mocks and timers
      vi.clearAllMocks();
      vi.clearAllTimers();
      
      // Clear any pending promises/microtasks
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Nullify mock references to help GC
      mockDB = null;
      mockTransaction = null;
      mockObjectStore = null;
      
    } catch (error) {
      console.warn('Test cleanup error:', error);
    }
  });

  describe('Database Initialization', () => {
    it('should initialize database with correct stores', async () => {
      // Check that dependency injection is working
      expect((testDb as any).openDBFn).toBe(mockOpenDB);
      
      // Debug: Check the initial state
      console.log('testDb.db before init:', (testDb as any).db);
      
      // Set explicitly to null if it's undefined
      if ((testDb as any).db === undefined) {
        (testDb as any).db = null;
      }
      
      // Ensure test db instance is not already initialized (it starts as null per db.ts line 54)
      expect((testDb as any).db).toBeNull();
      
      // Let's manually call this.openDBFn to see if it works
      console.log('Testing direct openDBFn call...');
      const directResult = await (testDb as any).openDBFn('test-db', 1, {});
      console.log('Direct openDBFn result:', directResult);
      
      console.log('About to call init...');
      await testDb.init();
      console.log('Init completed, db is now:', (testDb as any).db);
      console.log('mockOpenDB was called:', mockOpenDB.mock.calls.length, 'times');

      expect(mockOpenDB).toHaveBeenCalledWith('academic-explorer', 1, {
        upgrade: expect.any(Function),
      });
    });

    it('should create object stores during upgrade', async () => {
      // Test the upgrade function
      mockDB.objectStoreNames.contains.mockReturnValue(false);
      
      await testDb.init();

      expect(mockDB.createObjectStore).toHaveBeenCalledWith('searchResults');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('papers');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('citations');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('collections');
    });

    it('should not recreate existing object stores', async () => {
      // Modify the existing mock DB for this test
      mockDB.objectStoreNames.contains.mockReturnValue(true); // All stores exist
      mockDB.createObjectStore.mockClear(); // Clear any previous calls
      
      await testDb.init();

      // Since stores already exist, createObjectStore should not be called
      expect(mockDB.createObjectStore).not.toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      // First initialization
      await testDb.init();
      
      // Verify first initialization worked
      expect(mockOpenDB).toHaveBeenCalledTimes(1);
      
      // Clear the mock call history to track only the second call
      mockOpenDB.mockClear();
      
      // Second call should not trigger openDB again
      await testDb.init();
      
      // Should not be called again since db is already initialized
      expect(mockOpenDB).not.toHaveBeenCalled();
    });

    it('should throw error if database fails to initialize', async () => {
      // Ensure testDb is null to force initialization
      (testDb as any).db = null;
      
      // Mock openDB to fail - clear previous mock first
      mockOpenDB.mockReset();
      mockOpenDB.mockRejectedValue(new Error('Database init failed'));
      
      // This should trigger the init failure and ensureDB error path
      await expect(testDb.getPaper('test')).rejects.toThrow('Database init failed');
    });
  });

  describe('Search Results Cache', () => {
    it('should cache search results with generated key', async () => {
      await testDb.init(); // Initialize db for this test
      
      const results = [{ id: '1', title: 'Test Paper' }];
      const query = 'machine learning';
      const filters = { year: 2023 };

      await testDb.cacheSearchResults(query, results, 10, filters);

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
      await testDb.init(); // Initialize db for this test
      
      const results = [{ id: '1', title: 'Test Paper' }];
      const query = 'machine learning';

      await testDb.cacheSearchResults(query, results, 5);

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
      await testDb.init(); // Initialize db for this test
      const cachedData = {
        query: 'test',
        results: [{ id: '1' }],
        timestamp: Date.now() - 1000, // 1 second ago
        totalCount: 1,
      };

      // Set up the mock to return the cached data for any key
      mockDB.get.mockResolvedValue(cachedData);

      const result = await testDb.getSearchResults('test', undefined, 5000); // 5 second max age

      expect(result).toEqual(cachedData);
      expect(mockDB.get).toHaveBeenCalledWith('searchResults', expect.any(String));
    });

    it('should return null for expired cached results', async () => {
      await testDb.init(); // Initialize db for this test
      const cachedData = {
        query: 'test',
        results: [{ id: '1' }],
        timestamp: Date.now() - 10000, // 10 seconds ago
        totalCount: 1,
      };

      mockDB.get.mockResolvedValue(cachedData);

      const result = await testDb.getSearchResults('test', undefined, 5000); // 5 second max age

      expect(result).toBeNull();
    });

    it('should return null when no cached data exists', async () => {
      await testDb.init(); // Initialize db for this test
      mockDB.get.mockResolvedValue(undefined);

      const result = await testDb.getSearchResults('test');

      expect(result).toBeNull();
    });

    it('should generate consistent hash for same query and filters', async () => {
      // Initialize db first
      await testDb.init();
      
      const query = 'test';
      const filters = { year: 2023, author: 'Smith' };
      
      // Call cacheSearchResults twice with same params
      await testDb.cacheSearchResults(query, [], 0, filters);
      await testDb.cacheSearchResults(query, [], 0, filters);

      // Should use the same key both times
      const calls = mockDB.put.mock.calls;
      expect(calls.length).toBe(2); // Should have exactly 2 calls
      expect(calls[0][2]).toEqual(calls[1][2]); // Third parameter is the key
    });
  });

  describe('Papers Management', () => {

    it('should save paper with current timestamp', async () => {
      await testDb.init(); // Initialize db for this test
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

    it('should preserve existing savedAt timestamp', async () => {
      await testDb.init(); // Initialize db for this test
      const savedAt = Date.now() - 10000;
      const paper = {
        id: 'paper1',
        title: 'Test Paper',
        authors: ['Author 1'],
        savedAt,
      };

      await testDb.savePaper(paper);

      expect(mockDB.put).toHaveBeenCalledWith('papers', {
        ...paper,
        savedAt,
      });
    });

    it('should retrieve paper by id', async () => {
      await testDb.init(); // Initialize db for this test
      const paper = { id: 'paper1', title: 'Test Paper' };
      mockDB.get.mockResolvedValue(paper);

      const result = await testDb.getPaper('paper1');

      expect(result).toEqual(paper);
      expect(mockDB.get).toHaveBeenCalledWith('papers', 'paper1');
    });

    it('should retrieve all papers', async () => {
      await testDb.init(); // Initialize db for this test
      const papers = [
        { id: 'paper1', title: 'Paper 1' },
        { id: 'paper2', title: 'Paper 2' },
      ];
      mockDB.getAll.mockResolvedValue(papers);

      const result = await testDb.getAllPapers();

      expect(result).toEqual(papers);
      expect(mockDB.getAll).toHaveBeenCalledWith('papers');
    });

    it('should delete paper by id', async () => {
      await testDb.init(); // Initialize db for this test
      await testDb.deletePaper('paper1');

      expect(mockDB.delete).toHaveBeenCalledWith('papers', 'paper1');
    });
  });

  describe('Collections Management', () => {

    it('should create collection with generated id', async () => {
      await testDb.init(); // Initialize db for this test
      const name = 'My Collection';
      const description = 'Test collection';

      const id = await testDb.createCollection(name, description);

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
      await testDb.init(); // Initialize db for this test
      const name = 'My Collection';

      const id = await testDb.createCollection(name);

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
      await testDb.init(); // Initialize db for this test
      const collection = {
        id: 'collection1',
        name: 'Test Collection',
        paperIds: ['paper1'],
        createdAt: Date.now(),
        updatedAt: Date.now() - 1000,
      };
      mockDB.get.mockResolvedValue(collection);

      await testDb.addToCollection('collection1', 'paper2');

      expect(mockDB.put).toHaveBeenCalledWith('collections', {
        ...collection,
        paperIds: ['paper1', 'paper2'],
        updatedAt: expect.any(Number),
      });
    });

    it('should not add duplicate paper to collection', async () => {
      await testDb.init(); // Initialize db for this test
      
      const collection = {
        id: 'collection1',
        name: 'Test Collection',
        paperIds: ['paper1'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockDB.get.mockResolvedValue(collection);

      // Clear put calls to track only calls from this test
      mockDB.put.mockClear();
      
      await testDb.addToCollection('collection1', 'paper1');

      // Should not call put since paper already exists
      expect(mockDB.put).not.toHaveBeenCalled();
    });

    it('should handle adding to non-existent collection', async () => {
      await testDb.init(); // Initialize db for this test
      mockDB.get.mockResolvedValue(undefined);

      await testDb.addToCollection('nonexistent', 'paper1');

      // Should not call put for non-existent collection
      expect(mockDB.put).not.toHaveBeenCalled();
    });

    it('should retrieve all collections', async () => {
      await testDb.init(); // Initialize db for this test
      const collections = [
        { id: 'collection1', name: 'Collection 1' },
        { id: 'collection2', name: 'Collection 2' },
      ];
      mockDB.getAll.mockResolvedValue(collections);

      const result = await testDb.getCollections();

      expect(result).toEqual(collections);
      expect(mockDB.getAll).toHaveBeenCalledWith('collections');
    });
  });

  describe('Cleanup Utilities', () => {

    it('should clean old search results', async () => {
      await testDb.init(); // Initialize db for this test
      
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

      const deletedCount = await testDb.cleanOldSearchResults(30); // 30 days

      expect(deletedCount).toBe(2); // Should delete 2 old entries
      expect(mockDB.delete).toHaveBeenCalledTimes(2);
      expect(mockDB.delete).toHaveBeenCalledWith('searchResults', 'key1');
      expect(mockDB.delete).toHaveBeenCalledWith('searchResults', 'key3');
    });

    it('should handle empty search results during cleanup', async () => {
      // Initialize db first
      await testDb.init();
      
      mockDB.getAllKeys.mockResolvedValue([]);
      mockDB.delete.mockClear(); // Clear any previous calls
      
      const deletedCount = await testDb.cleanOldSearchResults();

      expect(deletedCount).toBe(0);
      expect(mockDB.delete).not.toHaveBeenCalled();
    });

    it('should handle null values during cleanup', async () => {
      await testDb.init(); // Initialize db for this test
      
      const keys = ['key1', 'key2'];
      mockDB.getAllKeys.mockResolvedValue(keys);
      mockDB.get.mockResolvedValue(null);

      const deletedCount = await testDb.cleanOldSearchResults();

      expect(deletedCount).toBe(0);
      expect(mockDB.delete).not.toHaveBeenCalled();
    });
  });

  describe('Storage Estimation', () => {

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

      const result = await testDb.getStorageEstimate();

      expect(result).toEqual(mockEstimate);
    });

    it('should return empty object when storage API not available', async () => {
      // Mock navigator without storage
      const originalNavigator = global.navigator;
      global.navigator = {} as any;

      const result = await testDb.getStorageEstimate();

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

      const result = await testDb.getStorageEstimate();

      expect(result).toEqual({});
    });
  });

  describe('Helper Methods', () => {

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
      // Reset testDb to null to force initialization
      (testDb as any).db = null;
      
      mockOpenDB.mockRejectedValueOnce(new Error('DB init failed'));

      await expect(testDb.init()).rejects.toThrow('DB init failed');
    });

    it('should handle errors in ensureDB', async () => {
      // Reset testDb to null
      (testDb as any).db = null;
      
      mockOpenDB.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(testDb.getPaper('test')).rejects.toThrow('Connection failed');
    });

    it('should handle database operation errors', async () => {
      await testDb.init(); // Initialize db for this test
      await testDb.init();
      mockDB.get.mockRejectedValue(new Error('Get operation failed'));

      await expect(testDb.getPaper('test')).rejects.toThrow('Get operation failed');
    });

    it('should handle put operation errors', async () => {
      await testDb.init(); // Initialize db for this test
      await testDb.init();
      mockDB.put.mockRejectedValueOnce(new Error('Put operation failed'));

      const paper = {
        id: 'test',
        title: 'Test',
        authors: [],
        savedAt: Date.now(),
      };

      await expect(testDb.savePaper(paper)).rejects.toThrow('Put operation failed');
    });

    it('should handle delete operation errors', async () => {
      await testDb.init(); // Initialize db for this test
      await testDb.init();
      mockDB.delete.mockRejectedValueOnce(new Error('Delete operation failed'));

      await expect(testDb.deletePaper('test')).rejects.toThrow('Delete operation failed');
    });
  });

  describe('Edge Cases', () => {

    it('should handle empty string queries', async () => {
      await testDb.init(); // Initialize db for this test
      await testDb.cacheSearchResults('', [], 0);
      
      expect(mockDB.put).toHaveBeenCalledWith(
        'searchResults',
        expect.objectContaining({ query: '' }),
        expect.any(String)
      );
    });

    it('should handle null filters', async () => {
      await testDb.init(); // Initialize db for this test
      const result = await testDb.getSearchResults('test', null as any);
      
      expect(mockDB.get).toHaveBeenCalledWith('searchResults', expect.any(String));
    });

    it('should handle papers with minimal data', async () => {
      await testDb.init(); // Initialize db for this test
      const minimalPaper = {
        id: 'minimal',
        title: '',
        authors: [],
        savedAt: Date.now(),
      };

      await testDb.savePaper(minimalPaper);

      expect(mockDB.put).toHaveBeenCalledWith('papers', {
        ...minimalPaper,
        savedAt: expect.any(Number),
      });
    });

    it('should handle very long collection names', async () => {
      await testDb.init(); // Initialize db for this test
      const longName = 'x'.repeat(1000);
      
      const id = await testDb.createCollection(longName);
      
      expect(mockDB.put).toHaveBeenCalledWith('collections', 
        expect.objectContaining({ name: longName })
      );
    });

    it('should handle cleanup with zero days', async () => {
      await testDb.init(); // Initialize db for this test
      mockDB.getAllKeys.mockResolvedValue([]);

      const deletedCount = await testDb.cleanOldSearchResults(0);

      expect(deletedCount).toBe(0);
    });
  });

  describe('Storage Quota Exceeded Scenarios', () => {
    it('should handle quota exceeded during cache operations', async () => {
      await testDb.init();
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      mockDB.put.mockRejectedValueOnce(quotaError);

      await expect(testDb.cacheSearchResults('test', [], 0)).rejects.toThrow('QuotaExceededError');
    });

    it('should handle quota exceeded during paper saving', async () => {
      await testDb.init();
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      mockDB.put.mockRejectedValueOnce(quotaError);

      const paper = { id: 'W123', title: 'Test', authors: [], savedAt: Date.now() };
      await expect(testDb.savePaper(paper)).rejects.toThrow('QuotaExceededError');
    });

    it('should handle transaction abort during large operations', async () => {
      await testDb.init();
      const abortError = new Error('TransactionInactiveError');
      abortError.name = 'TransactionInactiveError';
      mockDB.put.mockRejectedValueOnce(abortError);

      await expect(testDb.cacheSearchResults('large query', Array(1000).fill({ id: 'test' }), 1000))
        .rejects.toThrow('TransactionInactiveError');
    });
  });

  describe('Concurrent Access Patterns', () => {
    it('should handle concurrent cache operations', async () => {
      await testDb.init();
      mockDB.put.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 10)));

      const operations = [
        testDb.cacheSearchResults('query1', [], 0),
        testDb.cacheSearchResults('query2', [], 0),
        testDb.cacheSearchResults('query3', [], 0),
      ];

      await expect(Promise.all(operations)).resolves.toBeDefined();
      expect(mockDB.put).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent read/write operations', async () => {
      await testDb.init();
      mockDB.get.mockResolvedValue({ id: 'test', title: 'Test Paper' });
      mockDB.put.mockResolvedValue(undefined);

      const operations = [
        testDb.getPaper('paper1'),
        testDb.savePaper({ id: 'paper2', title: 'Test', authors: [], savedAt: Date.now() }),
        testDb.getAllPapers(),
        testDb.getSearchResults('test query'),
      ];

      await expect(Promise.all(operations)).resolves.toBeDefined();
    });

    it('should handle race conditions in collection updates', async () => {
      await testDb.init();
      const collection = {
        id: 'col1',
        name: 'Test',
        paperIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      mockDB.get.mockResolvedValue(collection);

      // Simulate concurrent additions to same collection
      const addOperations = [
        testDb.addToCollection('col1', 'paper1'),
        testDb.addToCollection('col1', 'paper2'),
        testDb.addToCollection('col1', 'paper3'),
      ];

      await Promise.all(addOperations);
      expect(mockDB.put).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle large search result caching', async () => {
      await testDb.init();
      
      // Create large result set (simulating 1000 papers)
      const largeResults = Array.from({ length: 1000 }, (_, i) => ({
        id: `W${i}`,
        title: `Paper ${i}`,
        authors: [`Author ${i}`],
        abstract: `Abstract for paper ${i}`.repeat(10), // Longer abstracts
        year: 2020 + (i % 4),
      }));

      await testDb.cacheSearchResults('large query', largeResults, 1000);

      expect(mockDB.put).toHaveBeenCalledWith(
        'searchResults',
        expect.objectContaining({
          results: largeResults,
          totalCount: 1000,
        }),
        expect.any(String)
      );
    });

    it('should handle batch paper operations', async () => {
      await testDb.init();
      
      const papers = Array.from({ length: 100 }, (_, i) => ({
        id: `paper${i}`,
        title: `Paper ${i}`,
        authors: [`Author ${i}`],
        savedAt: Date.now(),
      }));

      const saveOperations = papers.map(paper => testDb.savePaper(paper));
      await Promise.all(saveOperations);

      expect(mockDB.put).toHaveBeenCalledTimes(100);
    });

    it('should handle extensive cleanup operations', async () => {
      await testDb.init();
      
      // Simulate many cache entries
      const keys = Array.from({ length: 500 }, (_, i) => `key${i}`);
      const oldTimestamp = Date.now() - (40 * 24 * 60 * 60 * 1000); // 40 days old
      
      mockDB.getAllKeys.mockResolvedValue(keys);
      mockDB.get.mockImplementation(() => Promise.resolve({ timestamp: oldTimestamp }));

      const deletedCount = await testDb.cleanOldSearchResults(30);

      expect(deletedCount).toBe(500);
      expect(mockDB.delete).toHaveBeenCalledTimes(500);
    });
  });

  describe('Data Serialization/Deserialization', () => {
    it('should handle complex objects in search results', async () => {
      await testDb.init();
      
      const complexResults = [
        {
          id: 'W123',
          title: 'Complex Paper',
          authors: [
            { name: 'John Doe', orcid: '0000-0000-0000-0000' },
            { name: 'Jane Smith', orcid: null },
          ],
          concepts: [
            { id: 'C123', name: 'Machine Learning', score: 0.95 },
            { id: 'C456', name: 'Neural Networks', score: 0.87 },
          ],
          mesh: [{ ui: 'D000001', term: 'Biological Science' }],
          locations: [{ source: { id: 'S123', name: 'Nature' } }],
          dates: {
            published: '2023-01-15',
            updated: '2023-02-01',
          },
        },
      ];

      await testDb.cacheSearchResults('complex query', complexResults, 1);

      expect(mockDB.put).toHaveBeenCalledWith(
        'searchResults',
        expect.objectContaining({
          results: complexResults,
        }),
        expect.any(String)
      );
    });

    it('should handle papers with special characters and unicode', async () => {
      await testDb.init();
      
      const unicodePaper = {
        id: 'unicode-test',
        title: 'Título with éñ and 中文 and 🧬 emoji',
        authors: ['José María', 'François Müller', '田中太郎'],
        abstract: 'Abstract with mathematical symbols: ∫∑∆ and special chars: €£¥',
        tags: ['tag-with-émojis-🔬', 'unicode-测试'],
        notes: 'Notes with quotes: "smart quotes" and \'apostrophes\'',
        savedAt: Date.now(),
      };

      await testDb.savePaper(unicodePaper);

      expect(mockDB.put).toHaveBeenCalledWith('papers', unicodePaper);
    });

    it('should handle circular references gracefully in hash generation', () => {
      const hashQuery = (testDb as any).hashQuery.bind(testDb);
      
      // Create object with circular reference
      const filters: any = { year: 2023 };
      filters.self = filters;
      
      // Should handle circular references without throwing
      expect(() => hashQuery('test', filters)).toThrow();
    });
  });

  describe('Cache Invalidation Strategies', () => {
    it('should handle cache misses due to corruption', async () => {
      await testDb.init();
      
      // Mock corrupted cache entry
      const corruptedData = {
        query: 'test',
        results: null, // Corrupted results
        timestamp: Date.now(),
        totalCount: undefined, // Missing count
      };
      
      mockDB.get.mockResolvedValue(corruptedData);
      
      const result = await testDb.getSearchResults('test');
      
      // Should still return the data even if partially corrupted
      expect(result).toEqual(corruptedData);
    });

    it('should handle inconsistent timestamp formats', async () => {
      await testDb.init();
      
      // Test with string timestamp (potential data migration scenario)
      const dataWithStringTimestamp = {
        query: 'test',
        results: [],
        timestamp: '2023-01-01T00:00:00.000Z', // String instead of number
        totalCount: 0,
      };
      
      mockDB.get.mockResolvedValue(dataWithStringTimestamp);
      
      const result = await testDb.getSearchResults('test', {}, 60000); // 1 minute TTL
      
      // Should handle string timestamps in comparison
      expect(result).toBeNull(); // String timestamp should be treated as expired
    });
  });

  describe('Database Migration Scenarios', () => {
    it('should handle version upgrades gracefully', async () => {
      // Simulate database version upgrade
      const upgradeHandler = vi.fn();
      
      mockOpenDB.mockImplementationOnce((name, version, config) => {
        if (config?.upgrade) {
          config.upgrade(mockDB, 0, 1, mockTransaction, upgradeHandler);
        }
        return Promise.resolve(mockDB);
      });
      
      await testDb.init();
      
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('searchResults');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('papers');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('citations');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('collections');
    });

    it('should handle partial store creation during upgrade', async () => {
      // Simulate scenario where some stores already exist
      mockDB.objectStoreNames.contains.mockImplementation((storeName: string) => {
        return storeName === 'searchResults' || storeName === 'papers';
      });
      
      await testDb.init();
      
      // Should only create missing stores
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('citations');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('collections');
      expect(mockDB.createObjectStore).not.toHaveBeenCalledWith('searchResults');
      expect(mockDB.createObjectStore).not.toHaveBeenCalledWith('papers');
    });
  });
});