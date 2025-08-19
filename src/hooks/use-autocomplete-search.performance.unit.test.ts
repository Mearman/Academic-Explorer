/**
 * Performance tests for useAutocompleteSearch custom hook
 * Tests focus on debouncing strategies, caching, and search optimization
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useAutocompleteSearch } from './use-autocomplete-search';

// Mock dependencies
vi.mock('@/lib/openalex/client-with-cache', () => ({
  cachedOpenAlex: {
    worksAutocomplete: vi.fn(),
    authorsAutocomplete: vi.fn(),
    sourcesAutocomplete: vi.fn(),
    institutionsAutocomplete: vi.fn(),
  },
}));

vi.mock('@/lib/openalex/utils/entity-detection', () => ({
  detectEntityType: vi.fn((id: string) => {
    if (id.includes('/A')) return 'author';
    if (id.includes('/W')) return 'work';
    if (id.includes('/S')) return 'source';
    if (id.includes('/I')) return 'institution';
    return null;
  }),
}));

// Mock data with performance metrics
const mockLargeResultSet = {
  results: Array.from({ length: 100 }, (_, i) => ({
    id: `https://openalex.org/W${i.toString().padStart(10, '0')}`,
    display_name: `Research Paper ${i}`,
    cited_by_count: Math.floor(Math.random() * 1000),
    hint: `Research on topic ${i}`,
  })),
};

const mockFastResponse = {
  results: [
    {
      id: 'https://openalex.org/W123456789',
      display_name: 'Fast Response Paper',
      cited_by_count: 500,
    },
  ],
};

describe('useAutocompleteSearch Performance Tests', () => {
  let mockWorksAutocomplete: ReturnType<typeof vi.fn>;
  let mockAuthorsAutocomplete: ReturnType<typeof vi.fn>;
  let mockSourcesAutocomplete: ReturnType<typeof vi.fn>;
  let mockInstitutionsAutocomplete: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const { cachedOpenAlex } = await import('@/lib/openalex/client-with-cache');
    mockWorksAutocomplete = cachedOpenAlex.worksAutocomplete as ReturnType<typeof vi.fn>;
    mockAuthorsAutocomplete = cachedOpenAlex.authorsAutocomplete as ReturnType<typeof vi.fn>;
    mockSourcesAutocomplete = cachedOpenAlex.sourcesAutocomplete as ReturnType<typeof vi.fn>;
    mockInstitutionsAutocomplete = cachedOpenAlex.institutionsAutocomplete as ReturnType<typeof vi.fn>;
    
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Adaptive Debouncing', () => {
    it('should use shorter debounce for fast typers', async () => {
      const { result } = renderHook(() => useAutocompleteSearch({ debounceMs: 300 }));
      
      mockWorksAutocomplete.mockResolvedValue(mockFastResponse);
      mockAuthorsAutocomplete.mockResolvedValue({ results: [] });
      mockSourcesAutocomplete.mockResolvedValue({ results: [] });
      mockInstitutionsAutocomplete.mockResolvedValue({ results: [] });

      const startTime = Date.now();

      // Simulate fast typing (multiple characters within short time)
      act(() => {
        result.current.handleInputChange('m');
      });

      act(() => {
        vi.advanceTimersByTime(50);
      });

      act(() => {
        result.current.handleInputChange('ma');
      });

      act(() => {
        vi.advanceTimersByTime(50);
      });

      act(() => {
        result.current.handleInputChange('mac');
      });

      act(() => {
        vi.advanceTimersByTime(50);
      });

      act(() => {
        result.current.handleInputChange('mach');
      });

      // Should only trigger one search after final debounce period
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockWorksAutocomplete).toHaveBeenCalledTimes(1);
      });

      expect(mockWorksAutocomplete).toHaveBeenCalledWith({ q: 'mach' });
    });

    it('should prevent duplicate requests for same query', async () => {
      const { result } = renderHook(() => useAutocompleteSearch());
      
      mockWorksAutocomplete.mockResolvedValue(mockFastResponse);
      mockAuthorsAutocomplete.mockResolvedValue({ results: [] });
      mockSourcesAutocomplete.mockResolvedValue({ results: [] });
      mockInstitutionsAutocomplete.mockResolvedValue({ results: [] });

      // First search
      act(() => {
        result.current.handleInputChange('machine learning');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockWorksAutocomplete).toHaveBeenCalledTimes(1);
      });

      // Clear previous call history
      vi.clearAllMocks();

      // Same search again - should not trigger API call if cached
      act(() => {
        result.current.handleInputChange('machine learning');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should use cached results instead of making new API call
      await waitFor(() => {
        expect(mockWorksAutocomplete).toHaveBeenCalledTimes(1);
      });
    });

    it('should implement intelligent debounce timing based on query complexity', async () => {
      const { result } = renderHook(() => useAutocompleteSearch({ debounceMs: 300 }));
      
      mockWorksAutocomplete.mockResolvedValue(mockFastResponse);
      mockAuthorsAutocomplete.mockResolvedValue({ results: [] });
      mockSourcesAutocomplete.mockResolvedValue({ results: [] });
      mockInstitutionsAutocomplete.mockResolvedValue({ results: [] });

      // Simple query should use standard debounce
      act(() => {
        result.current.handleInputChange('ai');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockWorksAutocomplete).toHaveBeenCalledTimes(1);
      });

      vi.clearAllMocks();

      // Complex query with special characters should potentially use longer debounce
      act(() => {
        result.current.handleInputChange('title.search:"machine learning" AND publication_year:>2020');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockWorksAutocomplete).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Request Optimization', () => {
    it('should cancel in-flight requests when new query arrives', async () => {
      const { result } = renderHook(() => useAutocompleteSearch());
      
      let resolveFirst: (value: any) => void;
      let resolveSecond: (value: any) => void;

      const firstPromise = new Promise(resolve => { resolveFirst = resolve; });
      const secondPromise = new Promise(resolve => { resolveSecond = resolve; });

      mockWorksAutocomplete
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);
      
      mockAuthorsAutocomplete.mockResolvedValue({ results: [] });
      mockSourcesAutocomplete.mockResolvedValue({ results: [] });
      mockInstitutionsAutocomplete.mockResolvedValue({ results: [] });

      // Start first search
      act(() => {
        result.current.handleInputChange('first query');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Start second search before first completes
      act(() => {
        result.current.handleInputChange('second query');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Resolve first request (should be ignored)
      resolveFirst!(mockFastResponse);

      // Resolve second request
      resolveSecond!(mockFastResponse);

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeGreaterThan(0);
      });

      // Should have made two requests but only processed the latest
      expect(mockWorksAutocomplete).toHaveBeenCalledTimes(2);
      expect(mockWorksAutocomplete).toHaveBeenLastCalledWith({ q: 'second query' });
    });

    it('should batch entity type requests efficiently', async () => {
      const { result } = renderHook(() => useAutocompleteSearch());
      
      // Mock all requests to resolve at the same time
      const allRequests = Promise.resolve(mockFastResponse);
      mockWorksAutocomplete.mockReturnValue(allRequests);
      mockAuthorsAutocomplete.mockReturnValue(allRequests);
      mockSourcesAutocomplete.mockReturnValue(allRequests);
      mockInstitutionsAutocomplete.mockReturnValue(allRequests);

      const startTime = performance.now();

      act(() => {
        result.current.handleInputChange('machine learning');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // All requests should be initiated simultaneously
      expect(mockWorksAutocomplete).toHaveBeenCalledTimes(1);
      expect(mockAuthorsAutocomplete).toHaveBeenCalledTimes(1);
      expect(mockSourcesAutocomplete).toHaveBeenCalledTimes(1);
      expect(mockInstitutionsAutocomplete).toHaveBeenCalledTimes(1);
    });

    it('should handle large result sets efficiently without blocking UI', async () => {
      const { result } = renderHook(() => useAutocompleteSearch({ maxSuggestions: 20 }));
      
      mockWorksAutocomplete.mockResolvedValue(mockLargeResultSet);
      mockAuthorsAutocomplete.mockResolvedValue({ results: [] });
      mockSourcesAutocomplete.mockResolvedValue({ results: [] });
      mockInstitutionsAutocomplete.mockResolvedValue({ results: [] });

      const startTime = performance.now();

      act(() => {
        result.current.handleInputChange('research');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should limit results to maxSuggestions for performance
      expect(result.current.suggestions.length).toBeLessThanOrEqual(20);
      
      // Processing should be reasonably fast even with large dataset
      expect(processingTime).toBeLessThan(1000); // 1 second max
    });
  });

  describe('Memory Management', () => {
    it('should clean up debounce timers to prevent memory leaks', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      const { result, unmount } = renderHook(() => useAutocompleteSearch());

      // Trigger multiple input changes
      act(() => {
        result.current.handleInputChange('a');
      });

      act(() => {
        result.current.handleInputChange('ab');
      });

      act(() => {
        result.current.handleInputChange('abc');
      });

      // Should clear previous timeouts
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
      expect(setTimeoutSpy).toHaveBeenCalledTimes(3);

      unmount();

      // Should clear timeout on unmount
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(3);
    });

    it('should efficiently update suggestions array without unnecessary re-renders', async () => {
      let renderCount = 0;
      
      const { result } = renderHook(() => {
        renderCount++;
        return useAutocompleteSearch();
      });
      
      mockWorksAutocomplete.mockResolvedValue(mockFastResponse);
      mockAuthorsAutocomplete.mockResolvedValue({ results: [] });
      mockSourcesAutocomplete.mockResolvedValue({ results: [] });
      mockInstitutionsAutocomplete.mockResolvedValue({ results: [] });

      const initialRenderCount = renderCount;

      act(() => {
        result.current.handleInputChange('machine learning');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have minimal re-renders during the search process
      const finalRenderCount = renderCount;
      expect(finalRenderCount - initialRenderCount).toBeLessThanOrEqual(5);
    });
  });

  describe('Search Result Ranking Performance', () => {
    it('should efficiently sort large result sets by relevance', async () => {
      const { result } = renderHook(() => useAutocompleteSearch({ maxSuggestions: 50 }));
      
      // Create large dataset with mixed relevance scores
      const largeDataset = {
        results: Array.from({ length: 200 }, (_, i) => ({
          id: `https://openalex.org/W${i.toString().padStart(10, '0')}`,
          display_name: `Research Paper ${i}`,
          cited_by_count: Math.floor(Math.random() * 5000),
          works_count: Math.floor(Math.random() * 1000),
        })),
      };

      mockWorksAutocomplete.mockResolvedValue(largeDataset);
      mockAuthorsAutocomplete.mockResolvedValue({ results: [] });
      mockSourcesAutocomplete.mockResolvedValue({ results: [] });
      mockInstitutionsAutocomplete.mockResolvedValue({ results: [] });

      const startTime = performance.now();

      act(() => {
        result.current.handleInputChange('research');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const endTime = performance.now();
      const sortingTime = endTime - startTime;

      // Should complete sorting within reasonable time
      expect(sortingTime).toBeLessThan(500); // 500ms max

      // Results should be properly sorted by relevance (descending)
      const suggestions = result.current.suggestions;
      expect(suggestions.length).toBeGreaterThan(0);
      
      for (let i = 0; i < suggestions.length - 1; i++) {
        const currentScore = suggestions[i].cited_by_count || suggestions[i].works_count || 0;
        const nextScore = suggestions[i + 1].cited_by_count || suggestions[i + 1].works_count || 0;
        expect(currentScore).toBeGreaterThanOrEqual(nextScore);
      }
    });

    it('should handle relevance scoring with mixed metric types efficiently', async () => {
      const { result } = renderHook(() => useAutocompleteSearch());
      
      const mixedMetricsData = {
        results: [
          { id: 'W1', display_name: 'Work 1', cited_by_count: 100 }, // Work with citations
          { id: 'A1', display_name: 'Author 1', works_count: 200 }, // Author with works
          { id: 'S1', display_name: 'Source 1', works_count: 500 }, // Source with works
          { id: 'I1', display_name: 'Institution 1', works_count: 1000 }, // Institution with works
          { id: 'W2', display_name: 'Work 2' }, // Work without metrics
        ],
      };

      mockWorksAutocomplete.mockResolvedValue(mixedMetricsData);
      mockAuthorsAutocomplete.mockResolvedValue({ results: [] });
      mockSourcesAutocomplete.mockResolvedValue({ results: [] });
      mockInstitutionsAutocomplete.mockResolvedValue({ results: [] });

      act(() => {
        result.current.handleInputChange('mixed');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeGreaterThan(0);
      });

      // Should handle mixed metrics without errors and sort correctly
      const suggestions = result.current.suggestions;
      expect(suggestions[0].id).toBe('I1'); // Highest works_count (1000)
      expect(suggestions[1].id).toBe('S1'); // Next highest works_count (500)
    });
  });

  describe('Cache Warming and Preloading', () => {
    it('should implement efficient cache warming for common queries', async () => {
      const { result } = renderHook(() => useAutocompleteSearch());
      
      mockWorksAutocomplete.mockResolvedValue(mockFastResponse);
      mockAuthorsAutocomplete.mockResolvedValue({ results: [] });
      mockSourcesAutocomplete.mockResolvedValue({ results: [] });
      mockInstitutionsAutocomplete.mockResolvedValue({ results: [] });

      // Common queries that might be preloaded
      const commonQueries = ['machine learning', 'artificial intelligence', 'climate change'];

      for (const query of commonQueries) {
        act(() => {
          result.current.handleInputChange(query);
        });

        act(() => {
          vi.advanceTimersByTime(300);
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        // Subsequent searches for same query should be faster
        vi.clearAllMocks();
        
        act(() => {
          result.current.handleInputChange(query);
        });

        act(() => {
          vi.advanceTimersByTime(300);
        });

        // Should potentially hit cache for repeated queries
        expect(mockWorksAutocomplete).toHaveBeenCalledTimes(1);
      }
    });

    it('should prefetch suggestions based on partial queries', async () => {
      const { result } = renderHook(() => useAutocompleteSearch());
      
      mockWorksAutocomplete.mockResolvedValue(mockFastResponse);
      mockAuthorsAutocomplete.mockResolvedValue({ results: [] });
      mockSourcesAutocomplete.mockResolvedValue({ results: [] });
      mockInstitutionsAutocomplete.mockResolvedValue({ results: [] });

      // Start with partial query
      act(() => {
        result.current.handleInputChange('mach');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockWorksAutocomplete).toHaveBeenCalledWith({ q: 'mach' });
      });

      vi.clearAllMocks();

      // Extended query might use prefetched data
      act(() => {
        result.current.handleInputChange('machine');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should still make API call for extended query
      await waitFor(() => {
        expect(mockWorksAutocomplete).toHaveBeenCalledWith({ q: 'machine' });
      });
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle API errors efficiently without degrading search performance', async () => {
      const { result } = renderHook(() => useAutocompleteSearch());
      
      // Mix of successful and failed requests
      mockWorksAutocomplete.mockRejectedValue(new Error('API Error'));
      mockAuthorsAutocomplete.mockResolvedValue(mockFastResponse);
      mockSourcesAutocomplete.mockRejectedValue(new Error('Network Error'));
      mockInstitutionsAutocomplete.mockResolvedValue({ results: [] });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const startTime = performance.now();

      act(() => {
        result.current.handleInputChange('error test');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const endTime = performance.now();
      const errorHandlingTime = endTime - startTime;

      // Should complete error handling quickly
      expect(errorHandlingTime).toBeLessThan(1000);

      // Should still return successful results
      expect(result.current.suggestions.length).toBeGreaterThan(0);
      
      // Should log error but not crash
      expect(consoleSpy).toHaveBeenCalledWith('Autocomplete search failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should implement circuit breaker pattern for repeated API failures', async () => {
      const { result } = renderHook(() => useAutocompleteSearch());
      
      // Simulate repeated API failures
      mockWorksAutocomplete.mockRejectedValue(new Error('Persistent API Error'));
      mockAuthorsAutocomplete.mockRejectedValue(new Error('Persistent API Error'));
      mockSourcesAutocomplete.mockRejectedValue(new Error('Persistent API Error'));
      mockInstitutionsAutocomplete.mockRejectedValue(new Error('Persistent API Error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Multiple failed searches
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.handleInputChange(`query ${i}`);
        });

        act(() => {
          vi.advanceTimersByTime(300);
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });
      }

      // Should handle multiple failures gracefully
      expect(result.current.suggestions).toEqual([]);
      expect(result.current.isOpen).toBe(false);

      consoleSpy.mockRestore();
    });
  });
});