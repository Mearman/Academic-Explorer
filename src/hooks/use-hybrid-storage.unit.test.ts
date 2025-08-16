import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHybridStorage } from './use-hybrid-storage';

// Create hoisted mocks
const mockDb = vi.hoisted(() => ({
  init: vi.fn(),
  getStorageEstimate: vi.fn(),
  cacheSearchResults: vi.fn(),
  getSearchResults: vi.fn(),
  savePaper: vi.fn(),
  cleanOldSearchResults: vi.fn(),
  clearAllStores: vi.fn(),
}));

// Mock the db module
vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

// Mock the app store with hoisted mock
const mockUseAppStore = vi.hoisted(() => vi.fn());
vi.mock('@/stores/app-store', () => ({
  useAppStore: mockUseAppStore,
}));

// Use jsdom's built-in localStorage implementation
// No need to mock it since Vitest with jsdom provides it

// Mock console methods
const consoleSpy = {
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
};

describe('useHybridStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Clear all stores from the mock database
    if (typeof mockDb.clearAllStores === 'function') {
      mockDb.clearAllStores();
    }

    // Reset all mock implementations to ensure clean state
    mockDb.init.mockResolvedValue(undefined);
    mockDb.getStorageEstimate.mockResolvedValue({
      usage: 1024000,
      quota: 50000000,
    });
    mockDb.cacheSearchResults.mockResolvedValue(undefined);
    mockDb.getSearchResults.mockResolvedValue(null);
    mockDb.savePaper.mockResolvedValue(undefined);
    mockDb.cleanOldSearchResults.mockResolvedValue(5);

    // Mock useAppStore to return a selector function that returns empty search history
    mockUseAppStore.mockImplementation((selector) => {
      const mockState = { searchHistory: [] };
      return selector(mockState);
    });

    // Clear localStorage before each test - but do it after we set up mocks
    // to avoid interference with specific tests that need localStorage data
  });

  afterEach(() => {
    consoleSpy.error.mockClear();
    // Clear localStorage after each test to prevent test interference
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should verify console spy is working', () => {
      // Simple test to verify the spy is set up correctly
      console.error('test message');
      expect(consoleSpy.error).toHaveBeenCalledWith('test message');
      consoleSpy.error.mockClear();
    });

    it('should initialize with correct initial state', () => {
      const { result } = renderHook(() => useHybridStorage());

      expect(result.current.isInitialised).toBe(false);
      expect(result.current.metrics).toEqual({
        localStorageSize: 0,
      });
    });

    it('should initialize IndexedDB on mount', async () => {
      renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(mockDb.init).toHaveBeenCalled();
      });
    });

    it('should set initialized to true after successful init', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });
    });

    it('should handle initialization errors', async () => {
      // Clear any previous mock setup and set rejection BEFORE rendering
      vi.clearAllMocks();
      consoleSpy.error.mockClear();
      
      // Create a fresh mock that will reject
      const rejectionError = new Error('Init failed');
      mockDb.init.mockRejectedValue(rejectionError);

      const { result } = renderHook(() => useHybridStorage());

      // Wait for the hook to try to initialize and fail
      await waitFor(() => {
        expect(result.current.isInitialised).toBe(false);
      }, { timeout: 1000 });

      // Give extra time for async error logging to complete  
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that console.error was called (it should have been called by now)
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to initialise IndexedDB:',
        rejectionError
      );
    });
  });

  describe('Metrics calculation', () => {
    it('should calculate localStorage size', async () => {
      // Clear localStorage first to ensure clean state
      localStorage.clear();
      
      // Add some test data to localStorage
      localStorage.setItem('test-key-1', 'test-value-1');
      localStorage.setItem('test-key-2', JSON.stringify({ data: 'test' }));
      
      // Verify localStorage has data
      expect(localStorage.getItem('test-key-1')).toBe('test-value-1');
      expect(localStorage.length).toBeGreaterThan(0);

      const { result } = renderHook(() => useHybridStorage());

      // Wait for initialization to complete
      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      }, { timeout: 2000 });

      // The initialization should have already called updateMetrics
      // Check that metrics were calculated during initialization
      expect(result.current.metrics.localStorageSize).toBeGreaterThan(0);

      // Clean up
      localStorage.clear();
    });

    it('should include IndexedDB metrics', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.metrics.indexedDBUsage).toBe(1024000);
        expect(result.current.metrics.indexedDBQuota).toBe(50000000);
      });
    });

    it('should update metrics on demand', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      // Clear the call count after initialization
      mockDb.getStorageEstimate.mockClear();

      await act(async () => {
        await result.current.updateMetrics();
      });

      expect(mockDb.getStorageEstimate).toHaveBeenCalledTimes(1); // Once manually called
    });
  });

  describe('Archive search results', () => {
    it('should archive search results when initialized', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      }, { timeout: 2000 });

      const mockResults = [{ id: 'W1', title: 'Test Work' }];

      // Clear previous calls to focus on this test
      mockDb.cacheSearchResults.mockClear();

      await act(async () => {
        await result.current.archiveSearchResults(
          'test query',
          mockResults,
          100,
          { filter: 'test' }
        );
      });

      expect(mockDb.cacheSearchResults).toHaveBeenCalledWith(
        'test query',
        mockResults,
        100,
        { filter: 'test' }
      );
    });

    it('should not archive when not initialized', async () => {
      mockDb.init.mockResolvedValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useHybridStorage());

      await act(async () => {
        await result.current.archiveSearchResults('test', [], 0);
      });

      expect(mockDb.cacheSearchResults).not.toHaveBeenCalled();
    });

    it('should handle archiving errors', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      }, { timeout: 2000 });

      // Clear console spy to focus on this error
      consoleSpy.error.mockClear();
      
      // Set up the mock to reject AFTER initialization but clear previous setup
      mockDb.cacheSearchResults.mockClear();
      const archiveError = new Error('Archive failed');
      mockDb.cacheSearchResults.mockRejectedValue(archiveError);

      await act(async () => {
        await result.current.archiveSearchResults('test', [], 0);
      });

      // The error should be logged immediately since the function catches and logs errors
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to archive search results:',
        archiveError
      );
    });
  });

  describe('Get cached search results', () => {
    it('should retrieve cached search results', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      const mockCachedData = { results: [], totalCount: 0 };
      mockDb.getSearchResults.mockResolvedValue(mockCachedData);

      let cachedResults;
      await act(async () => {
        cachedResults = await result.current.getCachedSearchResults(
          'test query',
          { filter: 'test' }
        );
      });

      expect(mockDb.getSearchResults).toHaveBeenCalledWith(
        'test query',
        { filter: 'test' }
      );
      expect(cachedResults).toBe(mockCachedData);
    });

    it('should return null when not initialized', async () => {
      mockDb.init.mockResolvedValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useHybridStorage());

      let cachedResults;
      await act(async () => {
        cachedResults = await result.current.getCachedSearchResults('test');
      });

      expect(cachedResults).toBeNull();
      expect(mockDb.getSearchResults).not.toHaveBeenCalled();
    });

    it('should handle retrieval errors', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      }, { timeout: 2000 });

      // Clear console spy to focus on this error
      consoleSpy.error.mockClear();
      
      // Set up the mock to reject AFTER initialization but clear previous setup
      mockDb.getSearchResults.mockClear();
      const retrievalError = new Error('Retrieval failed');
      mockDb.getSearchResults.mockRejectedValue(retrievalError);

      let cachedResults;
      await act(async () => {
        cachedResults = await result.current.getCachedSearchResults('test');
      });

      // The error should be logged immediately since the function catches and logs errors
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to retrieve cached results:',
        retrievalError
      );
      
      expect(cachedResults).toBeNull();
    });
  });

  describe('Save paper offline', () => {
    it('should save paper with timestamp', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      const mockPaper = {
        id: 'W123',
        title: 'Test Paper',
        authors: ['Author 1', 'Author 2'],
        abstract: 'Test abstract',
        year: 2023,
        doi: '10.1000/test',
      };

      const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(1234567890);

      await act(async () => {
        await result.current.savePaperOffline(mockPaper);
      });

      expect(mockDb.savePaper).toHaveBeenCalledWith({
        ...mockPaper,
        savedAt: 1234567890,
      });

      dateSpy.mockRestore();
    });

    it('should not save when not initialized', async () => {
      mockDb.init.mockResolvedValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useHybridStorage());

      await act(async () => {
        await result.current.savePaperOffline({
          id: 'W123',
          title: 'Test',
          authors: [],
        });
      });

      expect(mockDb.savePaper).not.toHaveBeenCalled();
    });

    it('should handle save errors', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      // Clear console spy and set up rejection
      consoleSpy.error.mockClear();
      mockDb.savePaper.mockClear();
      const saveError = new Error('Save failed');
      mockDb.savePaper.mockRejectedValue(saveError);

      await act(async () => {
        await result.current.savePaperOffline({
          id: 'W123',
          title: 'Test',
          authors: [],
        });
      });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to save paper:',
        saveError
      );
    });
  });

  describe('Cleanup old data', () => {
    it('should cleanup old data with default days', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      }, { timeout: 2000 });

      // Clear previous calls from initialization
      mockDb.cleanOldSearchResults.mockClear();

      let deletedCount;
      await act(async () => {
        deletedCount = await result.current.cleanupOldData();
      });

      expect(mockDb.cleanOldSearchResults).toHaveBeenCalledWith(30);
      expect(deletedCount).toBe(5);
    });

    it('should cleanup old data with custom days', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      }, { timeout: 2000 });

      // Clear previous calls from initialization
      mockDb.cleanOldSearchResults.mockClear();

      await act(async () => {
        await result.current.cleanupOldData(7);
      });

      expect(mockDb.cleanOldSearchResults).toHaveBeenCalledWith(7);
    });

    it('should not cleanup when not initialized', async () => {
      // Set up mock to never resolve BEFORE creating the hook
      mockDb.init.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useHybridStorage());

      // Give it a moment to try to initialize but not succeed
      await new Promise(resolve => setTimeout(resolve, 50));

      let deletedCount;
      await act(async () => {
        deletedCount = await result.current.cleanupOldData();
      });

      expect(deletedCount).toBeUndefined();
      expect(mockDb.cleanOldSearchResults).not.toHaveBeenCalled();
    });

    it('should handle cleanup errors', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      // Clear console spy and previous setup, then set rejection
      consoleSpy.error.mockClear();
      mockDb.cleanOldSearchResults.mockClear();
      const cleanupError = new Error('Cleanup failed');
      mockDb.cleanOldSearchResults.mockRejectedValue(cleanupError);

      let deletedCount;
      await act(async () => {
        deletedCount = await result.current.cleanupOldData();
      });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to cleanup old data:',
        cleanupError
      );
      expect(deletedCount).toBe(0);
    });
  });

  describe('Search history migration', () => {
    it('should not migrate when search history is small', async () => {
      // Mock useAppStore to return a small search history
      mockUseAppStore.mockImplementation((selector) => {
        const mockState = { searchHistory: ['query1', 'query2'] };
        return selector(mockState);
      });

      // Clear any previous calls to cacheSearchResults
      mockDb.cacheSearchResults.mockClear();

      const { result } = renderHook(() => useHybridStorage());

      // Wait for initialization to complete
      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      }, { timeout: 2000 });

      // Wait a bit to ensure migration effect runs
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockDb.cacheSearchResults).not.toHaveBeenCalled();
    });

    it('should migrate when search history is large', async () => {
      const largeHistory = Array.from({ length: 10 }, (_, i) => `query${i + 1}`);
      
      // Mock useAppStore to return a large search history
      mockUseAppStore.mockImplementation((selector) => {
        const mockState = { searchHistory: largeHistory };
        return selector(mockState);
      });

      // Clear any previous calls to cacheSearchResults
      mockDb.cacheSearchResults.mockClear();

      const { result } = renderHook(() => useHybridStorage());

      // Wait for initialization to complete first
      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      }, { timeout: 2000 });

      // Wait for migration effect to run
      await waitFor(() => {
        expect(mockDb.cacheSearchResults).toHaveBeenCalledTimes(5); // Last 5 archived
      }, { timeout: 2000 });

      // Check that queries 6-10 were archived (slice(5))
      expect(mockDb.cacheSearchResults).toHaveBeenCalledWith('query6', [], 0);
      expect(mockDb.cacheSearchResults).toHaveBeenCalledWith('query10', [], 0);
    });

    it('should not migrate when not initialized', async () => {
      mockDb.init.mockResolvedValue(new Promise(() => {})); // Never resolves
      
      const largeHistory = Array.from({ length: 10 }, (_, i) => `query${i + 1}`);
      
      // Mock useAppStore to return a large search history
      mockUseAppStore.mockImplementation((selector) => {
        const mockState = { searchHistory: largeHistory };
        return selector(mockState);
      });

      renderHook(() => useHybridStorage());

      // Wait a bit to ensure effect runs
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockDb.cacheSearchResults).not.toHaveBeenCalled();
    });
  });

  describe('Return values', () => {
    it('should return all expected functions and values', async () => {
      const { result } = renderHook(() => useHybridStorage());

      expect(typeof result.current.isInitialised).toBe('boolean');
      expect(typeof result.current.metrics).toBe('object');
      expect(typeof result.current.archiveSearchResults).toBe('function');
      expect(typeof result.current.getCachedSearchResults).toBe('function');
      expect(typeof result.current.savePaperOffline).toBe('function');
      expect(typeof result.current.cleanupOldData).toBe('function');
      expect(typeof result.current.updateMetrics).toBe('function');
    });
  });

  describe('Storage Quota Exceeded Scenarios', () => {
    it('should handle quota exceeded during archiving', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      // Clear console spy to focus on this error
      consoleSpy.error.mockClear();
      
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      
      // Clear previous setup and set rejection
      mockDb.cacheSearchResults.mockClear();
      mockDb.cacheSearchResults.mockRejectedValueOnce(quotaError);

      await act(async () => {
        await result.current.archiveSearchResults('test', [], 0);
      });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to archive search results:',
        quotaError
      );
    });

    it('should handle quota exceeded during paper saving', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      // Clear console spy to focus on this error
      consoleSpy.error.mockClear();

      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      
      // Clear previous setup and set rejection
      mockDb.savePaper.mockClear();
      mockDb.savePaper.mockRejectedValueOnce(quotaError);

      await act(async () => {
        await result.current.savePaperOffline({
          id: 'W123',
          title: 'Test',
          authors: [],
        });
      });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to save paper:',
        quotaError
      );
    });

    it('should handle storage estimate failures', async () => {
      mockDb.getStorageEstimate.mockRejectedValue(new Error('Storage API unavailable'));

      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      // Metrics should still be initialized, even without storage estimate
      expect(result.current.metrics).toBeDefined();
      expect(result.current.metrics.localStorageSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent archiving operations', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      // Setup delayed responses
      mockDb.cacheSearchResults.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 50))
      );

      const operations = [
        result.current.archiveSearchResults('query1', [], 0),
        result.current.archiveSearchResults('query2', [], 0),
        result.current.archiveSearchResults('query3', [], 0),
      ];

      await act(async () => {
        await Promise.all(operations);
      });

      expect(mockDb.cacheSearchResults).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent read/write operations', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      mockDb.getSearchResults.mockResolvedValue({ results: [], totalCount: 0 });

      const operations = [
        result.current.getCachedSearchResults('query1'),
        result.current.archiveSearchResults('query2', [], 0),
        result.current.savePaperOffline({ id: 'W1', title: 'Test', authors: [] }),
        result.current.cleanupOldData(7),
      ];

      await act(async () => {
        await Promise.all(operations);
      });

      expect(mockDb.getSearchResults).toHaveBeenCalled();
      expect(mockDb.cacheSearchResults).toHaveBeenCalled();
      expect(mockDb.savePaper).toHaveBeenCalled();
      expect(mockDb.cleanOldSearchResults).toHaveBeenCalled();
    });
  });

  describe('localStorage Fallback Scenarios', () => {
    it('should handle localStorage access errors during metrics calculation', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock localStorage to throw during iteration
      const originalLength = Object.getOwnPropertyDescriptor(Storage.prototype, 'length');
      const originalKey = Storage.prototype.key;
      
      Object.defineProperty(Storage.prototype, 'length', {
        get() {
          throw new Error('localStorage access denied');
        },
        configurable: true,
      });

      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      // Trigger updateMetrics manually to ensure the error path is tested
      await act(async () => {
        await result.current.updateMetrics();
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Error calculating localStorage size:',
        expect.any(Error)
      );
      expect(result.current.metrics.localStorageSize).toBe(0);

      // Restore original descriptor
      if (originalLength) {
        Object.defineProperty(Storage.prototype, 'length', originalLength);
      }
      Storage.prototype.key = originalKey;
      consoleWarnSpy.mockRestore();
    });

    it('should handle localStorage getItem errors', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Add data to localStorage first
      localStorage.setItem('test-key', 'test-value');
      
      // Mock getItem to throw
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = vi.fn().mockImplementation(() => {
        throw new Error('getItem failed');
      });

      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      // Trigger updateMetrics manually to ensure the error path is tested
      await act(async () => {
        await result.current.updateMetrics();
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Error calculating localStorage size:',
        expect.any(Error)
      );
      expect(result.current.metrics.localStorageSize).toBe(0);

      // Restore original method
      Storage.prototype.getItem = originalGetItem;
      consoleWarnSpy.mockRestore();
    });

    it('should handle null localStorage values gracefully', async () => {
      // Mock localStorage with null values
      const originalGetItem = Storage.prototype.getItem;
      const originalKey = Storage.prototype.key;
      
      Storage.prototype.key = vi.fn().mockReturnValue('test-key');
      Storage.prototype.getItem = vi.fn().mockReturnValue(null);
      Object.defineProperty(Storage.prototype, 'length', {
        get: () => 1,
        configurable: true,
      });

      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      // Should handle null values without error
      expect(result.current.metrics.localStorageSize).toBeGreaterThanOrEqual(0);

      // Restore original methods
      Storage.prototype.getItem = originalGetItem;
      Storage.prototype.key = originalKey;
    });
  });

  describe('Performance Under Load', () => {
    it('should handle large search result archiving', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      // Create large result set
      const largeResults = Array.from({ length: 1000 }, (_, i) => ({
        id: `W${i}`,
        title: `Paper ${i}`,
        authors: [`Author ${i}`],
      }));

      await act(async () => {
        await result.current.archiveSearchResults('large query', largeResults, 1000);
      });

      expect(mockDb.cacheSearchResults).toHaveBeenCalledWith(
        'large query',
        largeResults,
        1000,
        undefined
      );
    });

    it('should handle batch paper operations', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      const papers = Array.from({ length: 50 }, (_, i) => ({
        id: `paper${i}`,
        title: `Paper ${i}`,
        authors: [`Author ${i}`],
      }));

      const saveOperations = papers.map(paper => 
        result.current.savePaperOffline(paper)
      );

      await act(async () => {
        await Promise.all(saveOperations);
      });

      expect(mockDb.savePaper).toHaveBeenCalledTimes(50);
    });

    it('should handle frequent metrics updates', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      // Clear initial calls
      mockDb.getStorageEstimate.mockClear();

      const updateOperations = Array.from({ length: 10 }, () =>
        result.current.updateMetrics()
      );

      await act(async () => {
        await Promise.all(updateOperations);
      });

      expect(mockDb.getStorageEstimate).toHaveBeenCalledTimes(10);
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    it('should handle undefined search history in store', async () => {
      mockUseAppStore.mockImplementation((selector) => {
        const mockState = { searchHistory: undefined };
        return selector(mockState);
      });

      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      // Should not crash with undefined search history
      expect(result.current.isInitialised).toBe(true);
    });

    it('should handle null search history in store', async () => {
      mockUseAppStore.mockImplementation((selector) => {
        const mockState = { searchHistory: null };
        return selector(mockState);
      });

      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      // Should not crash with null search history
      expect(result.current.isInitialised).toBe(true);
    });

    it('should handle component unmounting during async operations', async () => {
      const { result, unmount } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      // Start async operation
      const archivePromise = act(async () => {
        await result.current.archiveSearchResults('test', [], 0);
      });

      // Unmount component during operation
      unmount();

      // Should not throw error
      await expect(archivePromise).resolves.toBeUndefined();
    });

    it('should handle rapid initialization attempts', async () => {
      // Mount and unmount multiple times quickly
      const hooks = Array.from({ length: 5 }, () => {
        const hook = renderHook(() => useHybridStorage());
        hook.unmount();
        return hook;
      });

      // Final hook that stays mounted
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      // Should successfully initialize despite rapid mount/unmount cycles
      expect(result.current.isInitialised).toBe(true);
    });

    it('should handle storage operations with malformed data', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      // Try to save paper with circular reference
      const circularPaper: any = {
        id: 'circular',
        title: 'Circular Paper',
        authors: [],
      };
      circularPaper.self = circularPaper;

      // Should handle circular references gracefully
      await act(async () => {
        await result.current.savePaperOffline(circularPaper);
      });

      expect(mockDb.savePaper).toHaveBeenCalled();
    });

    it('should handle very large localStorage calculations', async () => {
      // Mock localStorage with many large entries
      const originalLength = Object.getOwnPropertyDescriptor(Storage.prototype, 'length');
      const originalKey = Storage.prototype.key;
      const originalGetItem = Storage.prototype.getItem;

      Object.defineProperty(Storage.prototype, 'length', {
        get: () => 100, // Many entries but not too many to cause timeout
        configurable: true,
      });

      Storage.prototype.key = vi.fn().mockImplementation((index) => `key${index}`);
      Storage.prototype.getItem = vi.fn().mockImplementation(() => 'x'.repeat(100)); // Large values

      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      // Should handle large localStorage without timeout
      // With mocked data: 100 entries * (key + value) = 100 * (4 + 100) = 10,400 characters
      expect(result.current.metrics.localStorageSize).toBeGreaterThan(10000);

      // Restore original methods
      if (originalLength) {
        Object.defineProperty(Storage.prototype, 'length', originalLength);
      }
      Storage.prototype.key = originalKey;
      Storage.prototype.getItem = originalGetItem;
    });
  });
});