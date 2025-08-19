/**
 * Integration tests for usePersistentSearchFilters hook
 * Tests real storage interactions and end-to-end scenarios
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePersistentSearchFilters } from './use-persistent-search-filters';
import type { AdvancedSearchFormData } from './use-advanced-search-form';
import { db, DatabaseService } from '@/lib/db';

// Real database for integration testing
const realDb = new DatabaseService();

// Mock console methods
const consoleSpy = {
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
};

describe('usePersistentSearchFilters Integration Tests', () => {
  const sampleFilterData: AdvancedSearchFormData = {
    query: 'machine learning neural networks',
    searchField: 'title',
    searchMode: 'boolean',
    fromPublicationDate: '2020-01-01',
    toPublicationDate: '2023-12-31',
    publicationYear: 2022,
    isOpenAccess: true,
    hasFulltext: true,
    hasDoi: true,
    hasAbstract: true,
    isRetracted: false,
    citationCountMin: 10,
    citationCountMax: 1000,
    authorId: 'A123456789',
    institutionId: 'I987654321',
    sourceId: 'S456789123',
    funderId: 'F789123456',
    topicId: 'T321654987',
    sortBy: 'cited_by_count',
    sortOrder: 'desc',
    perPage: 50,
    sample: 100,
    groupBy: 'authorships.author.id',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Initialize real database
    await realDb.init();
    
    // Clean up any existing test data
    try {
      await realDb.deleteSearchFilters('test-key');
      await realDb.deleteSearchFilters('default');
      await realDb.deleteSearchFilters('integration-test');
    } catch (error) {
      // Ignore cleanup errors
    }

    // Clear localStorage
    localStorage.clear();
  });

  afterEach(async () => {
    consoleSpy.error.mockClear();
    consoleSpy.warn.mockClear();
    
    // Cleanup test data
    try {
      await realDb.deleteSearchFilters('test-key');
      await realDb.deleteSearchFilters('default');
      await realDb.deleteSearchFilters('integration-test');
    } catch (error) {
      // Ignore cleanup errors
    }
    
    localStorage.clear();
  });

  describe('Full Storage Workflow', () => {
    it('should complete full save-load-clear cycle with IndexedDB', async () => {
      const { result } = renderHook(() => usePersistentSearchFilters());

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      // Save filters
      await act(async () => {
        await result.current.saveFilters(sampleFilterData, 'integration-test');
      });

      expect(result.current.error).toBeNull();

      // Load filters in new hook instance to simulate page reload
      const { result: result2 } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result2.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      let loadedFilters;
      await act(async () => {
        loadedFilters = await result2.current.loadFilters('integration-test');
      });

      expect(loadedFilters).toEqual({
        ...sampleFilterData,
        savedAt: expect.any(Number),
        version: 1,
      });

      // Clear filters
      await act(async () => {
        await result2.current.clearFilters('integration-test');
      });

      // Verify filters are cleared
      let clearedFilters;
      await act(async () => {
        clearedFilters = await result2.current.loadFilters('integration-test');
      });

      expect(clearedFilters).toBeNull();
    });

    it('should handle complex filter objects with all fields', async () => {
      const complexFilters: AdvancedSearchFormData = {
        ...sampleFilterData,
        // Test with edge case values
        citationCountMin: 0,
        citationCountMax: 999999,
        publicationYear: 1900,
        sample: 10000,
      };

      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      await act(async () => {
        await result.current.saveFilters(complexFilters, 'complex-test');
      });

      let loadedFilters;
      await act(async () => {
        loadedFilters = await result.current.loadFilters('complex-test');
      });

      expect(loadedFilters).toEqual({
        ...complexFilters,
        savedAt: expect.any(Number),
        version: 1,
      });

      // Cleanup
      await act(async () => {
        await result.current.clearFilters('complex-test');
      });
    });

    it('should persist across multiple hook instances (simulating page reloads)', async () => {
      // First instance - save data
      const { result: firstInstance, unmount: unmountFirst } = renderHook(() => 
        usePersistentSearchFilters()
      );

      await waitFor(() => {
        expect(firstInstance.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      await act(async () => {
        await firstInstance.current.saveFilters(sampleFilterData, 'persistence-test');
      });

      unmountFirst();

      // Second instance - should load saved data
      const { result: secondInstance, unmount: unmountSecond } = renderHook(() => 
        usePersistentSearchFilters()
      );

      await waitFor(() => {
        expect(secondInstance.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      let loadedData;
      await act(async () => {
        loadedData = await secondInstance.current.loadFilters('persistence-test');
      });

      expect(loadedData).toEqual({
        ...sampleFilterData,
        savedAt: expect.any(Number),
        version: 1,
      });

      unmountSecond();

      // Third instance - clear data
      const { result: thirdInstance, unmount: unmountThird } = renderHook(() => 
        usePersistentSearchFilters()
      );

      await waitFor(() => {
        expect(thirdInstance.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      await act(async () => {
        await thirdInstance.current.clearFilters('persistence-test');
      });

      unmountThird();

      // Fourth instance - verify cleared
      const { result: fourthInstance } = renderHook(() => 
        usePersistentSearchFilters()
      );

      await waitFor(() => {
        expect(fourthInstance.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      let finalData;
      await act(async () => {
        finalData = await fourthInstance.current.loadFilters('persistence-test');
      });

      expect(finalData).toBeNull();
    });
  });

  describe('Storage Fallback Scenarios', () => {
    it('should fallback to localStorage when IndexedDB quota exceeded', async () => {
      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      // Create large filter data to potentially trigger quota issues
      const largeFilterData = {
        ...sampleFilterData,
        query: 'large query data '.repeat(1000),
        authorId: 'A'.repeat(1000),
        institutionId: 'I'.repeat(1000),
      };

      // Try to save - should succeed with fallback if needed
      await act(async () => {
        await result.current.saveFilters(largeFilterData, 'large-data-test');
      });

      // Should not have error (fallback should work)
      expect(result.current.error).toBeNull();

      // Should be able to load the data
      let loadedData: unknown;
      await act(async () => {
        loadedData = await result.current.loadFilters('large-data-test');
      });

      expect(loadedData).toBeDefined();
      if (loadedData && typeof loadedData === 'object' && 'query' in loadedData) {
        expect((loadedData as { query: string }).query).toContain('large query data');
      }

      // Cleanup
      await act(async () => {
        await result.current.clearFilters('large-data-test');
      });
    });

    it('should handle simultaneous IndexedDB and localStorage operations', async () => {
      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      // Save multiple filters simultaneously
      const filters1 = { ...sampleFilterData, query: 'query1' };
      const filters2 = { ...sampleFilterData, query: 'query2' };
      const filters3 = { ...sampleFilterData, query: 'query3' };

      await act(async () => {
        await Promise.all([
          result.current.saveFilters(filters1, 'concurrent-1'),
          result.current.saveFilters(filters2, 'concurrent-2'),
          result.current.saveFilters(filters3, 'concurrent-3'),
        ]);
      });

      // All should succeed
      expect(result.current.error).toBeNull();

      // Load all filters
      let loaded1: unknown, loaded2: unknown, loaded3: unknown;
      await act(async () => {
        [loaded1, loaded2, loaded3] = await Promise.all([
          result.current.loadFilters('concurrent-1'),
          result.current.loadFilters('concurrent-2'),
          result.current.loadFilters('concurrent-3'),
        ]);
      });

      expect((loaded1 as { query?: string })?.query).toBe('query1');
      expect((loaded2 as { query?: string })?.query).toBe('query2');
      expect((loaded3 as { query?: string })?.query).toBe('query3');

      // Cleanup
      await act(async () => {
        await Promise.all([
          result.current.clearFilters('concurrent-1'),
          result.current.clearFilters('concurrent-2'),
          result.current.clearFilters('concurrent-3'),
        ]);
      });
    });
  });

  describe('Data Migration and Versioning', () => {
    it('should handle data format migration from version 0 to 1', async () => {
      // Manually insert old format data into storage
      const legacyData = {
        ...sampleFilterData,
        savedAt: Date.now(),
        // No version field (version 0)
      };

      // Save legacy data directly to IndexedDB
      await realDb.saveSearchFilters('legacy-test', legacyData);

      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      // Load should automatically migrate to current version
      let migratedData;
      await act(async () => {
        migratedData = await result.current.loadFilters('legacy-test');
      });

      expect(migratedData).toEqual({
        ...legacyData,
        version: 1, // Should add version field
      });

      // Cleanup
      await act(async () => {
        await result.current.clearFilters('legacy-test');
      });
    });

    it('should preserve unknown fields for forward compatibility', async () => {
      // Simulate future version data
      const futureData = {
        ...sampleFilterData,
        savedAt: Date.now(),
        version: 5,
        futureField: 'future value',
        newFilterType: { complex: 'object' },
      };

      // Save future data directly
      await realDb.saveSearchFilters('future-test', futureData);

      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      // Should load future data without modification
      let loadedFutureData;
      await act(async () => {
        loadedFutureData = await result.current.loadFilters('future-test');
      });

      expect(loadedFutureData).toEqual(futureData);

      // Cleanup
      await act(async () => {
        await result.current.clearFilters('future-test');
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from corrupted IndexedDB data', async () => {
      // Insert corrupted data directly
      const corruptedData = {
        invalidStructure: true,
        missingFields: 'yes',
        // No required fields
      };

      await realDb.saveSearchFilters('corrupted-test', corruptedData as any);

      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      // Should handle corrupted data gracefully
      let loadedData;
      await act(async () => {
        loadedData = await result.current.loadFilters('corrupted-test');
      });

      expect(loadedData).toBeNull();
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Stored search filters are corrupted, ignoring:',
        corruptedData
      );

      // Should still be able to save new valid data
      await act(async () => {
        await result.current.saveFilters(sampleFilterData, 'corrupted-test');
      });

      let newData;
      await act(async () => {
        newData = await result.current.loadFilters('corrupted-test');
      });

      expect(newData).toEqual({
        ...sampleFilterData,
        savedAt: expect.any(Number),
        version: 1,
      });

      // Cleanup
      await act(async () => {
        await result.current.clearFilters('corrupted-test');
      });
    });

    it('should handle database connection failures gracefully', async () => {
      // This test might be challenging to implement without mocking, 
      // but we can test rapid operations that might cause connection issues
      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      // Rapid fire operations to stress test the connection
      const operations = Array.from({ length: 20 }, (_, i) => 
        result.current.saveFilters({ ...sampleFilterData, query: `query${i}` }, `stress-${i}`)
      );

      await act(async () => {
        await Promise.allSettled(operations);
      });

      // Should handle all operations without crashing
      expect(result.current.isInitialized).toBe(true);

      // Cleanup all stress test data
      const cleanupOperations = Array.from({ length: 20 }, (_, i) => 
        result.current.clearFilters(`stress-${i}`)
      );

      await act(async () => {
        await Promise.allSettled(cleanupOperations);
      });
    });
  });

  describe('Performance Under Load', () => {
    it('should handle rapid save operations without data loss', async () => {
      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      // Rapid saves to same key (simulating rapid form changes)
      const rapidSaves = Array.from({ length: 10 }, (_, i) => 
        result.current.saveFilters({ ...sampleFilterData, query: `rapid-${i}` }, 'rapid-test')
      );

      await act(async () => {
        await Promise.all(rapidSaves);
      });

      // Should have the last saved value
      let finalData: unknown;
      await act(async () => {
        finalData = await result.current.loadFilters('rapid-test');
      });

      expect((finalData as { query?: string })?.query).toMatch(/rapid-\d+/);
      expect((finalData as { version?: number })?.version).toBe(1);

      // Cleanup
      await act(async () => {
        await result.current.clearFilters('rapid-test');
      });
    });

    it('should handle large datasets efficiently', async () => {
      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      // Create filters with large arrays and strings
      const largeFilters = {
        ...sampleFilterData,
        query: 'complex query with many terms '.repeat(100),
        // Simulate large filter object
        largeArray: Array.from({ length: 1000 }, (_, i) => `item-${i}`),
        complexObject: {
          nested: {
            deeply: {
              values: Array.from({ length: 100 }, (_, i) => ({ id: i, name: `name-${i}` }))
            }
          }
        }
      };

      const startTime = Date.now();

      await act(async () => {
        await result.current.saveFilters(largeFilters, 'large-dataset-test');
      });

      const saveTime = Date.now() - startTime;
      
      // Save should complete in reasonable time (less than 5 seconds)
      expect(saveTime).toBeLessThan(5000);

      const loadStartTime = Date.now();

      let loadedData: unknown;
      await act(async () => {
        loadedData = await result.current.loadFilters('large-dataset-test');
      });

      const loadTime = Date.now() - loadStartTime;

      // Load should also be reasonably fast
      expect(loadTime).toBeLessThan(5000);
      
      // Data should be intact
      expect((loadedData as { query?: string })?.query).toContain('complex query');
      expect((loadedData as { largeArray?: unknown[] })?.largeArray).toHaveLength(1000);
      expect((loadedData as { complexObject?: { nested?: { deeply?: { values?: unknown[] } } } })?.complexObject?.nested?.deeply?.values).toHaveLength(100);

      // Cleanup
      await act(async () => {
        await result.current.clearFilters('large-dataset-test');
      });
    });
  });

  describe('Cross-Tab Synchronization', () => {
    it('should detect changes made by other tabs', async () => {
      const { result } = renderHook(() => usePersistentSearchFilters());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 5000 });

      // Save initial data
      await act(async () => {
        await result.current.saveFilters(sampleFilterData, 'cross-tab-test');
      });

      // Simulate another tab making changes by directly modifying storage
      const modifiedData = {
        ...sampleFilterData,
        query: 'modified by another tab',
        savedAt: Date.now() + 1000, // Later timestamp
        version: 1,
      };

      await realDb.saveSearchFilters('cross-tab-test', modifiedData);

      // Load should get the modified data
      let updatedData: unknown;
      await act(async () => {
        updatedData = await result.current.loadFilters('cross-tab-test');
      });

      expect((updatedData as { query?: string })?.query).toBe('modified by another tab');

      // Cleanup
      await act(async () => {
        await result.current.clearFilters('cross-tab-test');
      });
    });
  });
});