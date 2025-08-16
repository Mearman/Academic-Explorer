import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { cachedOpenAlex } from '@/lib/openalex';
import type { ApiResponse, Work, WorksParams } from '@/lib/openalex/types';
import { useAppStore } from '@/stores/app-store';

import { useSearchState } from './use-search-state';

// Mock the dependencies
vi.mock('@/lib/openalex', () => ({
  cachedOpenAlex: {
    works: vi.fn(),
    worksGroupBy: vi.fn(),
  },
}));

vi.mock('@/stores/app-store', () => ({
  useAppStore: vi.fn(),
}));

const mockCachedOpenAlex = vi.mocked(cachedOpenAlex);
const mockUseAppStore = vi.mocked(useAppStore);

describe('useSearchState', () => {
  const mockRecordQuery = vi.fn();
  const mockUpdateQueryResults = vi.fn();
  const mockUpdateQueryError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAppStore.mockReturnValue({
      recordQuery: mockRecordQuery,
      updateQueryResults: mockUpdateQueryResults,
      updateQueryError: mockUpdateQueryError,
    } as any);

    mockRecordQuery.mockReturnValue('test-query-id');
  });

  describe('performSearch', () => {
    it('should record query results with correct count from API response', async () => {
      const mockWork: Work = {
        id: 'W123456789',
        title: 'Test Work',
        display_name: 'Test Work',
        doi: 'https://doi.org/10.1234/test',
        publication_year: 2023,
      } as Work;

      const mockResponse: ApiResponse<Work> = {
        meta: {
          count: 1500,
          db_response_time_ms: 250,
          page: 1,
          per_page: 25,
        },
        results: [mockWork],
      };

      mockCachedOpenAlex.works.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useSearchState());

      const params: WorksParams = { search: 'machine learning' };
      
      await act(async () => {
        await result.current.performSearch(params);
      });

      // Verify query was recorded
      expect(mockRecordQuery).toHaveBeenCalledWith('machine learning', params);

      // Verify results were updated with correct count
      expect(mockUpdateQueryResults).toHaveBeenCalledWith('test-query-id', {
        count: 1500, // Should be the actual count from API
        responseTimeMs: 250,
        firstResult: {
          id: 'W123456789',
          title: 'Test Work',
        },
      });

      expect(result.current.state.results).toEqual([mockWork]);
      expect(result.current.state.meta).toEqual(mockResponse.meta);
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBeNull();
    });

    it('should handle undefined meta.count and default to 0', async () => {
      const mockResponse: ApiResponse<Work> = {
        meta: {
          db_response_time_ms: 100,
          page: 1,
          per_page: 25,
          // count is intentionally missing
        } as any,
        results: [],
      };

      mockCachedOpenAlex.works.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useSearchState());

      await act(async () => {
        await result.current.performSearch({ search: 'test query' });
      });

      expect(mockUpdateQueryResults).toHaveBeenCalledWith('test-query-id', {
        count: 0, // Should default to 0 when count is undefined
        responseTimeMs: 100,
        firstResult: undefined,
      });
    });

    it('should handle null meta object and use defaults', async () => {
      const mockResponse: ApiResponse<Work> = {
        meta: null as any,
        results: [],
      };

      mockCachedOpenAlex.works.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useSearchState());

      await act(async () => {
        await result.current.performSearch({ search: 'test query' });
      });

      expect(mockUpdateQueryResults).toHaveBeenCalledWith('test-query-id', expect.objectContaining({
        count: 0, // Should default to 0 when meta is null
        firstResult: undefined,
      }));
    });

    it('should handle API response with results but missing count', async () => {
      const mockWork: Work = {
        id: 'W987654321',
        title: 'Another Test Work',
        display_name: 'Another Test Work',
      } as Work;

      const mockResponse: ApiResponse<Work> = {
        meta: {
          db_response_time_ms: 150,
          // count is missing
        } as any,
        results: [mockWork],
      };

      mockCachedOpenAlex.works.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useSearchState());

      await act(async () => {
        await result.current.performSearch({ search: 'another test' });
      });

      // When count is missing but results exist, should use results.length as fallback
      expect(mockUpdateQueryResults).toHaveBeenCalledWith('test-query-id', {
        count: 1, // Should use results.length (1) when meta.count is undefined
        responseTimeMs: 150,
        firstResult: {
          id: 'W987654321',
          title: 'Another Test Work',
        },
      });
    });

    it('should handle group_by queries correctly', async () => {
      const mockResponse: ApiResponse<Work> = {
        meta: {
          count: 500,
          db_response_time_ms: 180,
          groups_count: 25,
        },
        results: [],
        group_by: [
          { key: '2023', key_display_name: '2023', count: 250 },
          { key: '2022', key_display_name: '2022', count: 250 },
        ],
      };

      mockCachedOpenAlex.worksGroupBy.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useSearchState());

      const params: WorksParams = { search: 'AI', group_by: 'publication_year' };

      await act(async () => {
        await result.current.performSearch(params);
      });

      expect(mockCachedOpenAlex.worksGroupBy).toHaveBeenCalledWith({
        search: 'AI',
        group_by: 'publication_year',
      });

      expect(mockUpdateQueryResults).toHaveBeenCalledWith('test-query-id', {
        count: 500,
        responseTimeMs: 180,
        firstResult: undefined, // No results in group_by
      });

      expect(result.current.state.groupBy).toEqual(mockResponse.group_by);
    });

    it('should handle API errors and record them', async () => {
      const errorMessage = 'API request failed';
      mockCachedOpenAlex.works.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useSearchState());

      await act(async () => {
        await result.current.performSearch({ search: 'failing query' });
      });

      expect(mockUpdateQueryError).toHaveBeenCalledWith('test-query-id', errorMessage);
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBe(errorMessage);
      expect(result.current.state.results).toEqual([]);
    });

    it('should use Advanced Query as default when search is empty', async () => {
      const mockResponse: ApiResponse<Work> = {
        meta: { count: 100, db_response_time_ms: 50 },
        results: [],
      };

      mockCachedOpenAlex.works.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useSearchState());

      await act(async () => {
        await result.current.performSearch({ filter: 'publication_year:2023' });
      });

      expect(mockRecordQuery).toHaveBeenCalledWith('Advanced Query', { filter: 'publication_year:2023' });
    });

    it('should handle large result counts correctly', async () => {
      const largeCount = 50000;
      const mockResponse: ApiResponse<Work> = {
        meta: {
          count: largeCount,
          db_response_time_ms: 500,
          page: 1,
          per_page: 25,
        },
        results: Array.from({ length: 25 }, (_, i) => ({
          id: `W${i}`,
          title: `Work ${i}`,
          display_name: `Work ${i}`,
        })) as Work[],
      };

      mockCachedOpenAlex.works.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useSearchState());

      await act(async () => {
        await result.current.performSearch({ search: 'popular topic' });
      });

      expect(mockUpdateQueryResults).toHaveBeenCalledWith('test-query-id', {
        count: largeCount,
        responseTimeMs: 500,
        firstResult: {
          id: 'W0',
          title: 'Work 0',
        },
      });
    });
  });
});