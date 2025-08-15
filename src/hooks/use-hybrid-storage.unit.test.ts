import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHybridStorage } from './use-hybrid-storage';

// Create hoisted mocks
const mockUseAppStore = vi.hoisted(() => vi.fn());

// Mock the app store
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
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked db module
    const { db } = await import('@/lib/db');
    mockDb = db;
    
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

    // Mock useAppStore to return empty search history by default
    mockUseAppStore.mockReturnValue([]);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    consoleSpy.error.mockClear();
  });

  describe('Initialization', () => {
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
      mockDb.init.mockRejectedValue(new Error('Init failed'));

      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(consoleSpy.error).toHaveBeenCalledWith(
          'Failed to initialise IndexedDB:',
          expect.any(Error)
        );
      });

      expect(result.current.isInitialised).toBe(false);
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

      // Wait for initialization 
      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      // Trigger metrics update and wait for it to complete
      await act(async () => {
        await result.current.updateMetrics();
      });

      // Check that metrics were calculated
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

      await act(async () => {
        await result.current.updateMetrics();
      });

      expect(mockDb.getStorageEstimate).toHaveBeenCalledTimes(2); // Once on init, once manually
    });
  });

  describe('Archive search results', () => {
    it('should archive search results when initialized', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

      const mockResults = [{ id: 'W1', title: 'Test Work' }];

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
      });

      mockDb.cacheSearchResults.mockRejectedValue(new Error('Archive failed'));

      await act(async () => {
        await result.current.archiveSearchResults('test', [], 0);
      });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to archive search results:',
        expect.any(Error)
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
      });

      mockDb.getSearchResults.mockRejectedValue(new Error('Retrieval failed'));

      let cachedResults;
      await act(async () => {
        cachedResults = await result.current.getCachedSearchResults('test');
      });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to retrieve cached results:',
        expect.any(Error)
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

      mockDb.savePaper.mockRejectedValue(new Error('Save failed'));

      await act(async () => {
        await result.current.savePaperOffline({
          id: 'W123',
          title: 'Test',
          authors: [],
        });
      });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to save paper:',
        expect.any(Error)
      );
    });
  });

  describe('Cleanup old data', () => {
    it('should cleanup old data with default days', async () => {
      const { result } = renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(result.current.isInitialised).toBe(true);
      });

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
      });

      await act(async () => {
        await result.current.cleanupOldData(7);
      });

      expect(mockDb.cleanOldSearchResults).toHaveBeenCalledWith(7);
    });

    it('should not cleanup when not initialized', async () => {
      mockDb.init.mockResolvedValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useHybridStorage());

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

      mockDb.cleanOldSearchResults.mockRejectedValue(new Error('Cleanup failed'));

      let deletedCount;
      await act(async () => {
        deletedCount = await result.current.cleanupOldData();
      });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to cleanup old data:',
        expect.any(Error)
      );
      expect(deletedCount).toBe(0);
    });
  });

  describe('Search history migration', () => {
    it('should not migrate when search history is small', async () => {
      mockUseAppStore.mockReturnValue(['query1', 'query2']); // 2 items

      renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(mockDb.init).toHaveBeenCalled();
      });

      // Wait a bit to ensure migration effect runs
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockDb.cacheSearchResults).not.toHaveBeenCalled();
    });

    it('should migrate when search history is large', async () => {
      const largeHistory = Array.from({ length: 10 }, (_, i) => `query${i + 1}`);
      mockUseAppStore.mockReturnValue(largeHistory);

      renderHook(() => useHybridStorage());

      await waitFor(() => {
        expect(mockDb.init).toHaveBeenCalled();
      });

      // Wait for migration effect to run
      await waitFor(() => {
        expect(mockDb.cacheSearchResults).toHaveBeenCalledTimes(5); // Last 5 archived
      });

      // Check that queries 6-10 were archived (slice(5))
      expect(mockDb.cacheSearchResults).toHaveBeenCalledWith('query6', [], 0);
      expect(mockDb.cacheSearchResults).toHaveBeenCalledWith('query10', [], 0);
    });

    it('should not migrate when not initialized', async () => {
      mockDb.init.mockResolvedValue(new Promise(() => {})); // Never resolves
      
      const largeHistory = Array.from({ length: 10 }, (_, i) => `query${i + 1}`);
      mockUseAppStore.mockReturnValue(largeHistory);

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
});