import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { cachedOpenAlex } from '@/lib/openalex';
import type { ApiResponse, Work, WorksParams } from '@/lib/openalex/types';
import { useAppStore } from '@/stores/app-store';
import { useSearchState } from './hooks/use-search-state';

// Mock the OpenAlex client
vi.mock('@/lib/openalex', () => ({
  cachedOpenAlex: {
    works: vi.fn(),
    worksGroupBy: vi.fn(),
  },
}));

const mockCachedOpenAlex = vi.mocked(cachedOpenAlex);

describe('Query Recording Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Clear the app store state
    const { getState } = useAppStore;
    act(() => {
      useAppStore.setState({ queryHistory: [] });
    });
  });

  describe('End-to-End Query Recording', () => {
    it('should record and display complete query lifecycle with correct counts', async () => {
      // Setup: Mock API response with actual count
      const mockWork: Work = {
        id: 'W2755950973',
        doi: 'https://doi.org/10.1038/nature12373',
        title: 'Deep learning',
        display_name: 'Deep learning',
        publication_year: 2015,
        cited_by_count: 50000,
      } as Work;

      const mockApiResponse: ApiResponse<Work> = {
        meta: {
          count: 25000, // Actual count from API
          db_response_time_ms: 180,
          page: 1,
          per_page: 25,
        },
        results: [mockWork],
      };

      mockCachedOpenAlex.works.mockResolvedValueOnce(mockApiResponse);

      // Execute: Perform search using the hook
      const { result: searchResult } = renderHook(() => useSearchState());
      const { result: storeResult } = renderHook(() => useAppStore());

      const searchParams: WorksParams = {
        search: 'deep learning',
        per_page: 25,
        sort: 'cited_by_count:desc',
      };

      await act(async () => {
        await searchResult.current.performSearch(searchParams);
      });

      // Verify: Query was recorded correctly
      const queryHistory = storeResult.current.queryHistory;
      expect(queryHistory).toHaveLength(1);

      const recordedQuery = queryHistory[0];
      expect(recordedQuery.query).toBe('deep learning');
      expect(recordedQuery.params).toEqual(searchParams);
      
      // Critical assertion: Count should match API response
      expect(recordedQuery.results?.count).toBe(25000);
      expect(recordedQuery.results?.responseTimeMs).toBe(180);
      expect(recordedQuery.results?.firstResult).toEqual({
        id: 'W2755950973',
        title: 'Deep learning',
      });
    });

    it('should demonstrate the bug: API returns count but query shows 0', async () => {
      // This test reproduces the bug where API returns a count but query history shows 0
      
      // Mock a realistic API response
      const mockApiResponse: ApiResponse<Work> = {
        meta: {
          count: 15750, // API clearly returns a count
          db_response_time_ms: 220,
          page: 1,
          per_page: 25,
        },
        results: Array.from({ length: 25 }, (_, i) => ({
          id: `W${1000 + i}`,
          title: `Research Paper ${i + 1}`,
          display_name: `Research Paper ${i + 1}`,
          publication_year: 2023,
        })) as Work[],
      };

      mockCachedOpenAlex.works.mockResolvedValueOnce(mockApiResponse);

      const { result: searchResult } = renderHook(() => useSearchState());
      const { result: storeResult } = renderHook(() => useAppStore());

      await act(async () => {
        await searchResult.current.performSearch({ search: 'machine learning' });
      });

      const recordedQuery = storeResult.current.queryHistory[0];
      
      // The bug would be: recordedQuery.results?.count === 0 despite API returning 15750
      // Expected behavior: should match API response
      expect(recordedQuery.results?.count).toBe(15750);
      
      // If this fails, it indicates the bug where count defaults to 0
      if (recordedQuery.results?.count === 0) {
        console.error('BUG DETECTED: Query recorded with 0 count despite API returning', mockApiResponse.meta.count);
        expect(recordedQuery.results.count).not.toBe(0);
      }
    });

    it('should handle edge case: API response with missing meta.count', async () => {
      // Test scenario where API response meta is malformed
      const mockApiResponse = {
        meta: {
          db_response_time_ms: 100,
          page: 1,
          per_page: 25,
          // count is missing!
        },
        results: [
          {
            id: 'W123',
            title: 'Test Work',
            display_name: 'Test Work',
          },
        ],
      } as ApiResponse<Work>;

      mockCachedOpenAlex.works.mockResolvedValueOnce(mockApiResponse);

      const { result: searchResult } = renderHook(() => useSearchState());
      const { result: storeResult } = renderHook(() => useAppStore());

      await act(async () => {
        await searchResult.current.performSearch({ search: 'edge case' });
      });

      const recordedQuery = storeResult.current.queryHistory[0];
      
      // In this case, defaulting to 0 is correct behavior since API didn't provide count
      expect(recordedQuery.results?.count).toBe(0);
      expect(recordedQuery.results?.firstResult).toEqual({
        id: 'W123',
        title: 'Test Work',
      });
    });

    it('should handle multiple queries and maintain correct counts', async () => {
      // Query 1: Small result set
      const response1: ApiResponse<Work> = {
        meta: { count: 50, db_response_time_ms: 80 },
        results: [{ id: 'W1', title: 'Work 1', display_name: 'Work 1' } as Work],
      };

      // Query 2: Large result set
      const response2: ApiResponse<Work> = {
        meta: { count: 100000, db_response_time_ms: 300 },
        results: [{ id: 'W2', title: 'Work 2', display_name: 'Work 2' } as Work],
      };

      mockCachedOpenAlex.works
        .mockResolvedValueOnce(response1)
        .mockResolvedValueOnce(response2);

      const { result: searchResult } = renderHook(() => useSearchState());
      const { result: storeResult } = renderHook(() => useAppStore());

      // Execute both queries
      await act(async () => {
        await searchResult.current.performSearch({ search: 'small query' });
      });

      await act(async () => {
        await searchResult.current.performSearch({ search: 'large query' });
      });

      const queryHistory = storeResult.current.queryHistory;
      expect(queryHistory).toHaveLength(2);

      // Most recent query should be first (large query)
      expect(queryHistory[0].query).toBe('large query');
      expect(queryHistory[0].results?.count).toBe(100000);

      // Previous query should be second (small query)
      expect(queryHistory[1].query).toBe('small query');
      expect(queryHistory[1].results?.count).toBe(50);
    });

    it('should persist query history across hook re-renders', async () => {
      const mockApiResponse: ApiResponse<Work> = {
        meta: { count: 1000, db_response_time_ms: 150 },
        results: [{ id: 'W999', title: 'Persistent Work', display_name: 'Persistent Work' } as Work],
      };

      mockCachedOpenAlex.works.mockResolvedValueOnce(mockApiResponse);

      // First render: perform search
      const { result: searchResult1, unmount } = renderHook(() => useSearchState());

      await act(async () => {
        await searchResult1.current.performSearch({ search: 'persistence test' });
      });

      unmount();

      // Second render: check if history persists
      const { result: storeResult } = renderHook(() => useAppStore());
      
      const queryHistory = storeResult.current.queryHistory;
      expect(queryHistory).toHaveLength(1);
      expect(queryHistory[0].query).toBe('persistence test');
      expect(queryHistory[0].results?.count).toBe(1000);
    });

    it('should handle concurrent queries correctly', async () => {
      const response1: ApiResponse<Work> = {
        meta: { count: 500, db_response_time_ms: 200 },
        results: [{ id: 'W1', title: 'Concurrent 1', display_name: 'Concurrent 1' } as Work],
      };

      const response2: ApiResponse<Work> = {
        meta: { count: 750, db_response_time_ms: 180 },
        results: [{ id: 'W2', title: 'Concurrent 2', display_name: 'Concurrent 2' } as Work],
      };

      mockCachedOpenAlex.works
        .mockResolvedValueOnce(response1)
        .mockResolvedValueOnce(response2);

      const { result: searchResult } = renderHook(() => useSearchState());
      const { result: storeResult } = renderHook(() => useAppStore());

      // Start both queries concurrently
      const promise1 = act(async () => {
        await searchResult.current.performSearch({ search: 'concurrent 1' });
      });

      const promise2 = act(async () => {
        await searchResult.current.performSearch({ search: 'concurrent 2' });
      });

      await Promise.all([promise1, promise2]);

      const queryHistory = storeResult.current.queryHistory;
      expect(queryHistory).toHaveLength(2);

      // Both queries should be recorded with correct counts
      const counts = queryHistory.map(q => q.results?.count).sort();
      expect(counts).toEqual([500, 750]);
    });
  });

  describe('Error Handling in Recording', () => {
    it('should record API errors without crashing', async () => {
      const errorMessage = 'Network timeout';
      mockCachedOpenAlex.works.mockRejectedValueOnce(new Error(errorMessage));

      const { result: searchResult } = renderHook(() => useSearchState());
      const { result: storeResult } = renderHook(() => useAppStore());

      await act(async () => {
        await searchResult.current.performSearch({ search: 'failing query' });
      });

      const queryHistory = storeResult.current.queryHistory;
      expect(queryHistory).toHaveLength(1);
      
      const errorQuery = queryHistory[0];
      expect(errorQuery.query).toBe('failing query');
      expect(errorQuery.error).toBe(errorMessage);
      expect(errorQuery.results).toBeUndefined();
    });

    it('should handle malformed API responses gracefully', async () => {
      // Completely malformed response
      const malformedResponse = {
        // Missing meta and results
        some_other_field: 'unexpected data',
      } as any;

      mockCachedOpenAlex.works.mockResolvedValueOnce(malformedResponse);

      const { result: searchResult } = renderHook(() => useSearchState());
      const { result: storeResult } = renderHook(() => useAppStore());

      await act(async () => {
        await searchResult.current.performSearch({ search: 'malformed response' });
      });

      const queryHistory = storeResult.current.queryHistory;
      expect(queryHistory).toHaveLength(1);

      const recordedQuery = queryHistory[0];
      expect(recordedQuery.results?.count).toBe(0); // Should default to 0
      expect(recordedQuery.results?.firstResult).toBeUndefined();
    });
  });
});