/**
 * Unit tests for usePersistentSearchFilters hook
 * Tests persistent search filter functionality with hybrid storage
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePersistentSearchFilters } from './use-persistent-search-filters';
import type { AdvancedSearchFormData } from './use-advanced-search-form';

// Create hoisted mocks
const mockDb = vi.hoisted(() => ({
  init: vi.fn(),
  getStorageEstimate: vi.fn(),
  saveSearchFilters: vi.fn(),
  getSearchFilters: vi.fn(),
  deleteSearchFilters: vi.fn(),
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

// Mock console methods
const consoleSpy = {
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
};

describe('usePersistentSearchFilters', () => {
  const sampleFilterData: AdvancedSearchFormData = {
    query: 'machine learning',
    searchField: 'title',
    searchMode: 'basic',
    fromPublicationDate: '2020-01-01',
    toPublicationDate: '2023-12-31',
    isOpenAccess: true,
    hasAbstract: true,
    citationCountMin: 10,
    sortBy: 'cited_by_count',
    sortOrder: 'desc',
    perPage: 50,
  };

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
    mockDb.saveSearchFilters.mockResolvedValue(undefined);
    mockDb.getSearchFilters.mockResolvedValue(null);
    mockDb.deleteSearchFilters.mockResolvedValue(undefined);

    // Mock useAppStore to return filter manipulation functions
    mockUseAppStore.mockImplementation((selector) => {
      const mockState = { 
        persistentSearchFilters: null,
        setPersistentSearchFilters: vi.fn(),
        clearPersistentSearchFilters: vi.fn(),
      };
      return selector(mockState);
    });
  });

  afterEach(() => {
    consoleSpy.error.mockClear();
    consoleSpy.warn.mockClear();
    // Clear localStorage after each test to prevent test interference
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize with correct initial state when no stored filters exist', () => {
      const { result } = renderHook(() => usePersistentSearchFilters());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.savedFilters).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should initialize IndexedDB on mount', async () => {
      renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(mockDb.init).toHaveBeenCalled();
      });
    });

    it('should set initialized to true after successful init', async () => {
      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should load existing filters from storage on mount', async () => {
      const storedFilters = {
        ...sampleFilterData,
        savedAt: Date.now(),
        version: 1,
      };
      
      mockDb.getSearchFilters.mockResolvedValue(storedFilters);

      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
        expect(result.current.savedFilters).toEqual(storedFilters);
      });

      expect(mockDb.getSearchFilters).toHaveBeenCalledWith('default');
    });

    it('should handle initialization errors gracefully', async () => {
      const initError = new Error('Init failed');
      mockDb.init.mockRejectedValue(initError);

      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(false);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe('Failed to initialize storage');
      });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to initialize persistent search filters:',
        initError
      );
    });
  });

  describe('Filter Persistence', () => {
    it('should save filters to storage when saveFilters is called', async () => {
      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(1234567890);

      await act(async () => {
        await result.current.saveFilters(sampleFilterData);
      });

      expect(mockDb.saveSearchFilters).toHaveBeenCalledWith('default', {
        ...sampleFilterData,
        savedAt: 1234567890,
        version: 1,
      });

      dateSpy.mockRestore();
    });

    it('should update savedFilters state after successful save', async () => {
      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.saveFilters(sampleFilterData);
      });

      expect(result.current.savedFilters).toEqual({
        ...sampleFilterData,
        savedAt: expect.any(Number),
        version: 1,
      });
    });

    it('should not save when not initialized', async () => {
      mockDb.init.mockResolvedValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => usePersistentSearchFilters());

      await act(async () => {
        await result.current.saveFilters(sampleFilterData);
      });

      expect(mockDb.saveSearchFilters).not.toHaveBeenCalled();
      expect(result.current.error).toBe('Storage not initialized');
    });

    it('should handle save errors gracefully', async () => {
      const saveError = new Error('Save failed');
      mockDb.saveSearchFilters.mockRejectedValue(saveError);

      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.saveFilters(sampleFilterData);
      });

      expect(result.current.error).toBe('Failed to save filters');
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to save search filters:',
        saveError
      );
    });

    it('should save filters with custom key', async () => {
      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.saveFilters(sampleFilterData, 'custom-key');
      });

      expect(mockDb.saveSearchFilters).toHaveBeenCalledWith('custom-key', {
        ...sampleFilterData,
        savedAt: expect.any(Number),
        version: 1,
      });
    });
  });

  describe('Filter Loading', () => {
    it('should load filters by key', async () => {
      const storedFilters = {
        ...sampleFilterData,
        savedAt: Date.now(),
        version: 1,
      };
      
      mockDb.getSearchFilters.mockResolvedValue(storedFilters);

      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let loadedFilters;
      await act(async () => {
        loadedFilters = await result.current.loadFilters('test-key');
      });

      expect(mockDb.getSearchFilters).toHaveBeenCalledWith('test-key');
      expect(loadedFilters).toEqual(storedFilters);
    });

    it('should return null when no filters exist for key', async () => {
      mockDb.getSearchFilters.mockResolvedValue(null);

      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let loadedFilters;
      await act(async () => {
        loadedFilters = await result.current.loadFilters('non-existent');
      });

      expect(loadedFilters).toBeNull();
    });

    it('should handle load errors gracefully', async () => {
      const loadError = new Error('Load failed');
      mockDb.getSearchFilters.mockRejectedValue(loadError);

      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let loadedFilters;
      await act(async () => {
        loadedFilters = await result.current.loadFilters('test-key');
      });

      expect(loadedFilters).toBeNull();
      expect(result.current.error).toBe('Failed to load filters');
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to load search filters:',
        loadError
      );
    });

    it('should not load when not initialized', async () => {
      mockDb.init.mockResolvedValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => usePersistentSearchFilters());

      let loadedFilters;
      await act(async () => {
        loadedFilters = await result.current.loadFilters('test-key');
      });

      expect(loadedFilters).toBeNull();
      expect(mockDb.getSearchFilters).not.toHaveBeenCalled();
      expect(result.current.error).toBe('Storage not initialized');
    });
  });

  describe('Filter Clearing', () => {
    it('should clear filters by key', async () => {
      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.clearFilters('test-key');
      });

      expect(mockDb.deleteSearchFilters).toHaveBeenCalledWith('test-key');
    });

    it('should clear savedFilters state when clearing default key', async () => {
      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // First save some filters
      await act(async () => {
        await result.current.saveFilters(sampleFilterData);
      });

      expect(result.current.savedFilters).not.toBeNull();

      // Then clear them
      await act(async () => {
        await result.current.clearFilters();
      });

      expect(result.current.savedFilters).toBeNull();
      expect(mockDb.deleteSearchFilters).toHaveBeenCalledWith('default');
    });

    it('should handle clear errors gracefully', async () => {
      const clearError = new Error('Clear failed');
      mockDb.deleteSearchFilters.mockRejectedValue(clearError);

      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.clearFilters();
      });

      expect(result.current.error).toBe('Failed to clear filters');
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to clear search filters:',
        clearError
      );
    });

    it('should not clear when not initialized', async () => {
      mockDb.init.mockResolvedValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => usePersistentSearchFilters());

      await act(async () => {
        await result.current.clearFilters();
      });

      expect(mockDb.deleteSearchFilters).not.toHaveBeenCalled();
      expect(result.current.error).toBe('Storage not initialized');
    });
  });

  describe('Error Handling', () => {
    it('should reset error state when successful operation occurs after error', async () => {
      const saveError = new Error('Save failed');
      mockDb.saveSearchFilters.mockRejectedValueOnce(saveError);

      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // First operation fails
      await act(async () => {
        await result.current.saveFilters(sampleFilterData);
      });

      expect(result.current.error).toBe('Failed to save filters');

      // Fix the mock and try again
      mockDb.saveSearchFilters.mockResolvedValue(undefined);

      await act(async () => {
        await result.current.saveFilters(sampleFilterData);
      });

      expect(result.current.error).toBeNull();
    });

    it('should provide clearError function', async () => {
      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Simulate an error
      const saveError = new Error('Save failed');
      mockDb.saveSearchFilters.mockRejectedValue(saveError);

      await act(async () => {
        await result.current.saveFilters(sampleFilterData);
      });

      expect(result.current.error).toBe('Failed to save filters');

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Return values', () => {
    it('should return all expected functions and values', async () => {
      const { result } = renderHook(() => usePersistentSearchFilters());

      expect(typeof result.current.isLoading).toBe('boolean');
      expect(typeof result.current.isInitialized).toBe('boolean');
      expect(typeof result.current.error).toBe('object'); // null is object
      expect(typeof result.current.saveFilters).toBe('function');
      expect(typeof result.current.loadFilters).toBe('function');
      expect(typeof result.current.clearFilters).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('localStorage Fallback', () => {
    it('should fallback to localStorage when IndexedDB fails', async () => {
      // Mock IndexedDB failure
      mockDb.init.mockRejectedValue(new Error('IndexedDB unavailable'));
      
      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem');

      await act(async () => {
        await result.current.saveFilters(sampleFilterData);
      });

      // Should save to localStorage as fallback
      expect(localStorageSpy).toHaveBeenCalledWith(
        'academic-explorer-search-filters-default',
        expect.stringContaining('"query":"machine learning"')
      );

      localStorageSpy.mockRestore();
    });

    it('should load from localStorage when IndexedDB fails', async () => {
      // Mock IndexedDB failure
      mockDb.init.mockRejectedValue(new Error('IndexedDB unavailable'));
      
      // Pre-populate localStorage
      const storedData = {
        ...sampleFilterData,
        savedAt: Date.now(),
        version: 1,
      };
      localStorage.setItem(
        'academic-explorer-search-filters-default',
        JSON.stringify(storedData)
      );

      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
        expect(result.current.savedFilters).toEqual(storedData);
      });
    });

    it('should handle localStorage parse errors', async () => {
      // Mock IndexedDB failure
      mockDb.init.mockRejectedValue(new Error('IndexedDB unavailable'));
      
      // Add invalid JSON to localStorage
      localStorage.setItem(
        'academic-explorer-search-filters-default',
        'invalid json'
      );

      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
        expect(result.current.savedFilters).toBeNull();
      });

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Failed to parse stored search filters from localStorage:',
        expect.any(Error)
      );
    });
  });

  describe('Data Migration', () => {
    it('should handle missing version field in stored data', async () => {
      const legacyData = {
        ...sampleFilterData,
        savedAt: Date.now(),
        // No version field
      };
      
      mockDb.getSearchFilters.mockResolvedValue(legacyData);

      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
        expect(result.current.savedFilters).toEqual({
          ...legacyData,
          version: 1, // Should add version field
        });
      });
    });

    it('should handle future version migration gracefully', async () => {
      const futureData = {
        ...sampleFilterData,
        savedAt: Date.now(),
        version: 999, // Future version
        futureField: 'some future data',
      };
      
      mockDb.getSearchFilters.mockResolvedValue(futureData);

      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
        // Should load future data as-is
        expect(result.current.savedFilters).toEqual(futureData);
      });
    });

    it('should handle corrupted data structure', async () => {
      const corruptedData = {
        invalidField: 'corrupt',
        // Missing required fields
      };
      
      mockDb.getSearchFilters.mockResolvedValue(corruptedData);

      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
        expect(result.current.savedFilters).toBeNull();
      });

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Stored search filters are corrupted, ignoring:',
        corruptedData
      );
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent save operations', async () => {
      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      const filter1 = { ...sampleFilterData, query: 'query1' };
      const filter2 = { ...sampleFilterData, query: 'query2' };

      const promises = [
        result.current.saveFilters(filter1, 'key1'),
        result.current.saveFilters(filter2, 'key2'),
      ];

      await act(async () => {
        await Promise.all(promises);
      });

      expect(mockDb.saveSearchFilters).toHaveBeenCalledTimes(2);
      expect(mockDb.saveSearchFilters).toHaveBeenCalledWith('key1', expect.objectContaining({ query: 'query1' }));
      expect(mockDb.saveSearchFilters).toHaveBeenCalledWith('key2', expect.objectContaining({ query: 'query2' }));
    });

    it('should handle concurrent load operations', async () => {
      mockDb.getSearchFilters.mockImplementation((key) => 
        Promise.resolve({ query: `data-for-${key}`, savedAt: Date.now(), version: 1 })
      );

      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      const promises = [
        result.current.loadFilters('key1'),
        result.current.loadFilters('key2'),
      ];

      let results: unknown[] | undefined;
      await act(async () => {
        results = await Promise.all(promises);
      });

      expect(results).toBeDefined();
      expect(results![0]).toEqual(expect.objectContaining({ query: 'data-for-key1' }));
      expect(results![1]).toEqual(expect.objectContaining({ query: 'data-for-key2' }));
    });
  });

  describe('Performance', () => {
    it('should handle large filter objects', async () => {
      const largeFilterData = {
        ...sampleFilterData,
        largeField: 'x'.repeat(10000), // Large string
        arrayField: Array.from({ length: 1000 }, (_, i) => `item${i}`),
      };

      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.saveFilters(largeFilterData);
      });

      expect(mockDb.saveSearchFilters).toHaveBeenCalledWith('default', expect.objectContaining({
        largeField: expect.any(String),
        arrayField: expect.any(Array),
      }));
    });

    it('should debounce rapid save operations', async () => {
      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Rapidly save multiple times
      const savePromises = Array.from({ length: 5 }, (_, i) => 
        result.current.saveFilters({ ...sampleFilterData, query: `query${i}` })
      );

      await act(async () => {
        await Promise.all(savePromises);
      });

      // All saves should succeed
      expect(mockDb.saveSearchFilters).toHaveBeenCalledTimes(5);
    });
  });
});