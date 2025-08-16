import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

import { cachedOpenAlex } from '@/lib/openalex';
import type { ApiResponse, Work } from '@/lib/openalex/types';
import { useAppStore } from '@/stores/app-store';
import { useSearchState } from '@/components/organisms/hooks/use-search-state';

// This test file specifically reproduces the bug where Query History shows 0 results
// for all queries, even when the API returns actual counts

vi.mock('@/lib/openalex', () => ({
  cachedOpenAlex: {
    works: vi.fn(),
  },
}));

const mockCachedOpenAlex = vi.mocked(cachedOpenAlex);

describe('Bug Reproduction: Query History Zero Results', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset app store state
    act(() => {
      useAppStore.setState({ queryHistory: [] });
    });
  });

  it('BUG: Query History shows 0 results when API returns actual count', async () => {
    // This test reproduces the exact bug described by the user
    
    // Setup: Mock a realistic OpenAlex API response with actual data
    const realWorldApiResponse: ApiResponse<Work> = {
      meta: {
        count: 12543, // Real count from API
        db_response_time_ms: 156,
        page: 1,
        per_page: 25,
      },
      results: [
        {
          id: 'W2963487018',
          doi: 'https://doi.org/10.1038/s41586-019-1724-z',
          title: 'Machine learning for molecular and materials science',
          display_name: 'Machine learning for molecular and materials science',
          publication_year: 2020,
          cited_by_count: 1834,
          type: 'article',
          open_access: {
            is_oa: true,
            oa_status: 'green',
          },
        },
        // ... additional results would be here
      ] as Work[],
    };

    mockCachedOpenAlex.works.mockResolvedValueOnce(realWorldApiResponse);

    // Execute: Perform a search that would typically return many results
    const { result: searchResult } = renderHook(() => useSearchState());
    const { result: storeResult } = renderHook(() => useAppStore());

    await act(async () => {
      await searchResult.current.performSearch({ search: 'machine learning' });
    });

    // Wait for the query to be recorded
    await waitFor(() => {
      expect(storeResult.current.queryHistory.length).toBe(1);
    });

    const recordedQuery = storeResult.current.queryHistory[0];

    // DEBUG: Log the actual values to understand what's happening
    console.log('API Response Count:', realWorldApiResponse.meta.count);
    console.log('Recorded Query Count:', recordedQuery.results?.count);
    console.log('Full Recorded Query:', JSON.stringify(recordedQuery, null, 2));

    // The bug would manifest here:
    // Expected: recordedQuery.results.count should be 12543
    // Actual (bug): recordedQuery.results.count is 0
    
    if (recordedQuery.results?.count === 0) {
      // This is the bug - we got a count of 0 despite API returning 12543
      console.error('🐛 BUG CONFIRMED: Query History shows 0 results despite API returning', realWorldApiResponse.meta.count);
      
      // Let's investigate what went wrong
      expect(realWorldApiResponse.meta.count).toBe(12543); // API definitely has the count
      expect(recordedQuery.results?.count).toBe(12543); // But this will fail due to the bug
    } else {
      // If this passes, the bug has been fixed
      expect(recordedQuery.results?.count).toBe(12543);
      console.log('✅ Bug appears to be fixed - count is correctly recorded');
    }
  });

  it('BUG: Multiple queries all show 0 results in history', async () => {
    // Test the scenario where user performs multiple searches but all show 0 in history
    
    const queries = [
      {
        search: 'artificial intelligence',
        apiCount: 45789,
      },
      {
        search: 'deep learning',
        apiCount: 23456,
      },
      {
        search: 'neural networks',
        apiCount: 34567,
      },
    ];

    // Mock API responses for each query
    for (const query of queries) {
      const apiResponse: ApiResponse<Work> = {
        meta: {
          count: query.apiCount,
          db_response_time_ms: 150 + Math.random() * 100,
          page: 1,
          per_page: 25,
        },
        results: [
          {
            id: `W${Math.floor(Math.random() * 1000000)}`,
            title: `Sample work for ${query.search}`,
            display_name: `Sample work for ${query.search}`,
            publication_year: 2023,
          } as Work,
        ],
      };

      mockCachedOpenAlex.works.mockResolvedValueOnce(apiResponse);
    }

    const { result: searchResult } = renderHook(() => useSearchState());
    const { result: storeResult } = renderHook(() => useAppStore());

    // Execute all queries
    for (const query of queries) {
      await act(async () => {
        await searchResult.current.performSearch({ search: query.search });
      });
    }

    await waitFor(() => {
      expect(storeResult.current.queryHistory.length).toBe(3);
    });

    const queryHistory = storeResult.current.queryHistory;

    // Check each query - the bug would make all of them show 0 results
    const recordedCounts = queryHistory.map((q, index) => {
      const expectedCount = queries[queries.length - 1 - index].apiCount; // Reverse order (most recent first)
      const actualCount = q.results?.count ?? -1;
      
      console.log(`Query "${q.query}": Expected ${expectedCount}, Got ${actualCount}`);
      
      return {
        query: q.query,
        expected: expectedCount,
        actual: actualCount,
      };
    });

    // The bug would make all actualCount values be 0
    const allZero = recordedCounts.every(r => r.actual === 0);
    if (allZero) {
      console.error('🐛 BUG CONFIRMED: All queries show 0 results in history');
      console.error('Expected counts:', recordedCounts.map(r => r.expected));
      expect(allZero).toBe(false); // This should fail, confirming the bug
    } else {
      // Verify correct counts if bug is fixed
      recordedCounts.forEach(({ expected, actual }) => {
        expect(actual).toBe(expected);
      });
    }
  });

  it('INVESTIGATION: Check if meta object is undefined or malformed', async () => {
    // This test investigates what exactly is going wrong with the meta object
    
    const apiResponse: ApiResponse<Work> = {
      meta: {
        count: 9876,
        db_response_time_ms: 200,
        page: 1,
        per_page: 25,
      },
      results: [],
    };

    // Spy on the updateQueryResults call to see what's actually being passed
    const { result: storeResult } = renderHook(() => useAppStore());
    const updateQueryResultsSpy = vi.spyOn(storeResult.current, 'updateQueryResults');

    mockCachedOpenAlex.works.mockResolvedValueOnce(apiResponse);

    const { result: searchResult } = renderHook(() => useSearchState());

    await act(async () => {
      await searchResult.current.performSearch({ search: 'investigation query' });
    });

    // Check what was actually passed to updateQueryResults
    expect(updateQueryResultsSpy).toHaveBeenCalled();
    const callArgs = updateQueryResultsSpy.mock.calls[0];
    const [queryId, resultsData] = callArgs;

    console.log('updateQueryResults called with:');
    console.log('  queryId:', queryId);
    console.log('  resultsData:', JSON.stringify(resultsData, null, 2));
    
    // This will help us understand if the problem is in:
    // 1. The API response itself
    // 2. The count extraction (response.meta?.count ?? 0)
    // 3. The store update logic
    
    expect(resultsData).toBeDefined();
    expect(resultsData!.count).toBe(9876);
  });

  it('INVESTIGATION: Check if cache is interfering with meta data', async () => {
    // Test if the caching layer is somehow stripping or corrupting the meta.count field
    
    const originalApiResponse: ApiResponse<Work> = {
      meta: {
        count: 5555,
        db_response_time_ms: 100,
        page: 1,
        per_page: 25,
      },
      results: [
        {
          id: 'W999999',
          title: 'Cache Test Work',
          display_name: 'Cache Test Work',
        } as Work,
      ],
    };

    // Mock the cached client to return our known response
    mockCachedOpenAlex.works.mockImplementation(async (params) => {
      console.log('Mock cachedOpenAlex.works called with:', params);
      console.log('Returning API response with count:', originalApiResponse.meta.count);
      return originalApiResponse;
    });

    const { result: searchResult } = renderHook(() => useSearchState());

    await act(async () => {
      await searchResult.current.performSearch({ search: 'cache test' });
    });

    const { result: storeResult } = renderHook(() => useAppStore());
    const recordedQuery = storeResult.current.queryHistory[0];

    // If the cache is corrupting data, this will reveal it
    console.log('Original API count:', originalApiResponse.meta.count);
    console.log('Recorded query count:', recordedQuery.results?.count);
    
    expect(recordedQuery.results?.count).toBe(5555);
  });

  it('WORKAROUND: Test if using results.length could fix the issue', async () => {
    // This test explores a potential workaround for the bug
    
    const apiResponse: ApiResponse<Work> = {
      meta: {
        // Simulate the bug condition where count might be undefined
        count: undefined as any,
        db_response_time_ms: 120,
      },
      results: Array.from({ length: 25 }, (_, i) => ({
        id: `W${1000 + i}`,
        title: `Result ${i + 1}`,
        display_name: `Result ${i + 1}`,
      })) as Work[],
    };

    mockCachedOpenAlex.works.mockResolvedValueOnce(apiResponse);

    const { result: searchResult } = renderHook(() => useSearchState());

    await act(async () => {
      await searchResult.current.performSearch({ search: 'workaround test' });
    });

    const { result: storeResult } = renderHook(() => useAppStore());
    const recordedQuery = storeResult.current.queryHistory[0];

    // Current implementation would record count as 0
    // A potential fix would be to use results.length when count is unavailable
    console.log('API meta.count:', apiResponse.meta.count);
    console.log('API results.length:', apiResponse.results.length);
    console.log('Recorded count:', recordedQuery.results?.count);

    // This demonstrates that even when API returns results, 
    // the count should use results.length as fallback when meta.count is undefined
    expect(recordedQuery.results?.count).toBe(25); // Fixed behavior - uses results.length as fallback
  });
});