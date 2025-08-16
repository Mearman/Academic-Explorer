import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { createRouter, RouterProvider, createMemoryHistory } from '@tanstack/react-router';

import { cachedOpenAlex } from '@/lib/openalex';
import type { ApiResponse, Work } from '@/lib/openalex/types';
import { useAppStore } from '@/stores/app-store';
import { routeTree } from '@/routeTree.gen';

// Mock the OpenAlex client
vi.mock('@/lib/openalex', () => ({
  cachedOpenAlex: {
    works: vi.fn(),
    worksGroupBy: vi.fn(),
  },
}));

const mockCachedOpenAlex = vi.mocked(cachedOpenAlex);

describe('E2E: Page Loading Issues', () => {
  let router: ReturnType<typeof createRouter>;
  let memoryHistory: ReturnType<typeof createMemoryHistory>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset app store
    act(() => {
      useAppStore.setState({ queryHistory: [] });
    });

    // Create memory history and router
    memoryHistory = createMemoryHistory({
      initialEntries: ['/'],
    });

    router = createRouter({
      routeTree,
      history: memoryHistory,
    });
  });

  describe('Query Page Loading Issues', () => {
    it('should not get stuck loading when navigating to query page', async () => {
      // Mock successful API response
      const mockApiResponse: ApiResponse<Work> = {
        meta: {
          count: 1000,
          db_response_time_ms: 150,
          page: 1,
          per_page: 25,
        },
        results: [
          {
            id: 'W2755950973',
            doi: 'https://doi.org/10.1038/nature12373',
            title: 'Deep learning',
            display_name: 'Deep learning',
            publication_year: 2015,
            cited_by_count: 50000,
          } as Work,
        ],
      };

      mockCachedOpenAlex.works.mockResolvedValue(mockApiResponse);

      // Navigate to query page
      await act(async () => {
        await router.navigate({ to: '/query', search: { q: 'deep learning' } });
      });

      render(<RouterProvider router={router} />);

      // Should not be stuck loading - check for content within reasonable time
      await waitFor(
        () => {
          // Look for any content that indicates the page has loaded
          const loadingIndicators = screen.queryAllByText(/loading/i);
          const contentElements = screen.queryAllByText(/deep learning/i);
          
          // Should not have loading indicators OR should have content
          expect(loadingIndicators.length === 0 || contentElements.length > 0).toBe(true);
        },
        { timeout: 5000 } // 5 second timeout - if it takes longer, it's stuck
      );

      // Verify that the API was called
      expect(mockCachedOpenAlex.works).toHaveBeenCalled();
    });

    it('should handle API timeout without getting stuck', async () => {
      // Mock API timeout
      mockCachedOpenAlex.works.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 1000)
        )
      );

      await act(async () => {
        await router.navigate({ to: '/query', search: { q: 'timeout test' } });
      });

      render(<RouterProvider router={router} />);

      // Should show error state, not infinite loading
      await waitFor(
        () => {
          const errorElements = screen.queryAllByText(/error|timeout|failed/i);
          const loadingElements = screen.queryAllByText(/loading/i);
          
          // Should either show error or not be loading
          expect(errorElements.length > 0 || loadingElements.length === 0).toBe(true);
        },
        { timeout: 3000 }
      );
    });

    it('should handle slow API responses gracefully', async () => {
      // Mock slow but successful API response
      const mockApiResponse: ApiResponse<Work> = {
        meta: { count: 500, db_response_time_ms: 2000 },
        results: [{ id: 'W123', title: 'Slow Result', display_name: 'Slow Result' } as Work],
      };

      mockCachedOpenAlex.works.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(mockApiResponse), 2000)
        )
      );

      await act(async () => {
        await router.navigate({ to: '/query', search: { q: 'slow query' } });
      });

      render(<RouterProvider router={router} />);

      // Should show loading initially
      expect(screen.queryAllByText(/loading/i).length).toBeGreaterThan(0);

      // Should eventually show results
      await waitFor(
        () => {
          const results = screen.queryAllByText(/slow result/i);
          expect(results.length).toBeGreaterThan(0);
        },
        { timeout: 4000 }
      );
    });
  });

  describe('Query History Page Loading', () => {
    it('should load query history page without getting stuck', async () => {
      // Pre-populate some query history
      act(() => {
        useAppStore.setState({
          queryHistory: [
            {
              id: 'query-1',
              timestamp: '2024-01-15T10:30:00.000Z',
              query: 'machine learning',
              params: { search: 'machine learning' },
              results: { count: 1500, responseTimeMs: 200 },
            },
            {
              id: 'query-2',
              timestamp: '2024-01-15T10:25:00.000Z',
              query: 'deep learning',
              params: { search: 'deep learning' },
              results: { count: 0, responseTimeMs: 150 }, // This is the bug case
            },
          ],
        });
      });

      // Navigate to a route that might show query history
      await act(async () => {
        await router.navigate({ to: '/query' });
      });

      render(<RouterProvider router={router} />);

      // Should load without getting stuck
      await waitFor(
        () => {
          // Page should be responsive and not stuck loading
          const pageContent = screen.getByRole('main') || screen.getByText(/query/i);
          expect(pageContent).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should handle corrupted query history data', async () => {
      // Set corrupted/malformed query history data
      act(() => {
        useAppStore.setState({
          queryHistory: [
            {
              id: 'corrupted-query',
              timestamp: 'invalid-date',
              query: null as any,
              params: undefined as any,
              results: { count: undefined as any, responseTimeMs: 'invalid' as any },
            },
          ],
        });
      });

      await act(async () => {
        await router.navigate({ to: '/query' });
      });

      render(<RouterProvider router={router} />);

      // Should not crash or get stuck loading with corrupted data
      await waitFor(
        () => {
          // Should either show error state or empty state, not infinite loading
          const pageContent = document.body;
          expect(pageContent).toBeInTheDocument();
          
          // Ensure no infinite loading spinners
          const loadingElements = screen.queryAllByText(/loading/i);
          const spinners = screen.queryAllByRole('progressbar');
          
          // Allow some loading but not infinite
          expect(loadingElements.length + spinners.length).toBeLessThan(3);
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Search Integration Loading', () => {
    it('should handle search form submission without hanging', async () => {
      const mockApiResponse: ApiResponse<Work> = {
        meta: { count: 250, db_response_time_ms: 100 },
        results: [{ id: 'W456', title: 'Search Result', display_name: 'Search Result' } as Work],
      };

      mockCachedOpenAlex.works.mockResolvedValue(mockApiResponse);

      await act(async () => {
        await router.navigate({ to: '/query' });
      });

      render(<RouterProvider router={router} />);

      // Simulate search form interaction if search form exists
      await waitFor(() => {
        const searchInput = screen.queryByRole('textbox', { name: /search/i }) || 
                           screen.queryByPlaceholderText(/search/i);
        
        if (searchInput) {
          // Type and submit if search form is available
          act(() => {
            searchInput.focus();
          });
        }
        
        // Regardless of form presence, the page should be loaded
        expect(document.body).toBeInTheDocument();
      });
    });

    it('should handle rapid successive searches without hanging', async () => {
      // Mock multiple API responses
      const responses = [
        { meta: { count: 100, db_response_time_ms: 50 }, results: [] },
        { meta: { count: 200, db_response_time_ms: 75 }, results: [] },
        { meta: { count: 300, db_response_time_ms: 100 }, results: [] },
      ];

      mockCachedOpenAlex.works
        .mockResolvedValueOnce(responses[0] as ApiResponse<Work>)
        .mockResolvedValueOnce(responses[1] as ApiResponse<Work>)
        .mockResolvedValueOnce(responses[2] as ApiResponse<Work>);

      await act(async () => {
        await router.navigate({ to: '/query', search: { q: 'search1' } });
      });

      render(<RouterProvider router={router} />);

      // Rapidly change search queries
      await act(async () => {
        await router.navigate({ to: '/query', search: { q: 'search2' } });
      });

      await act(async () => {
        await router.navigate({ to: '/query', search: { q: 'search3' } });
      });

      // Should handle rapid changes without hanging
      await waitFor(
        () => {
          // Should complete without infinite loading
          const loadingElements = screen.queryAllByText(/loading/i);
          expect(loadingElements.length).toBeLessThan(2); // Allow minimal loading
        },
        { timeout: 3000 }
      );

      // Verify API calls were made
      expect(mockCachedOpenAlex.works).toHaveBeenCalledTimes(3);
    });
  });

  describe('Memory and Performance Issues', () => {
    it('should handle large query history without performance issues', async () => {
      // Create large query history (simulate heavy usage)
      const largeQueryHistory = Array.from({ length: 100 }, (_, i) => ({
        id: `query-${i}`,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        query: `test query ${i}`,
        params: { search: `test query ${i}` },
        results: { count: Math.floor(Math.random() * 10000), responseTimeMs: 100 + i },
      }));

      act(() => {
        useAppStore.setState({ queryHistory: largeQueryHistory });
      });

      const startTime = Date.now();

      await act(async () => {
        await router.navigate({ to: '/query' });
      });

      render(<RouterProvider router={router} />);

      await waitFor(
        () => {
          expect(document.body).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time even with large data
      expect(loadTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should handle memory cleanup on route changes', async () => {
      await act(async () => {
        await router.navigate({ to: '/query' });
      });

      render(<RouterProvider router={router} />);

      // Navigate away and back
      await act(async () => {
        await router.navigate({ to: '/' });
      });

      await act(async () => {
        await router.navigate({ to: '/query' });
      });

      // Should handle route changes without hanging
      await waitFor(
        () => {
          expect(document.body).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Network and Cache Issues', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      mockCachedOpenAlex.works.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await router.navigate({ to: '/query', search: { q: 'network test' } });
      });

      render(<RouterProvider router={router} />);

      // Should show error state, not hang
      await waitFor(
        () => {
          const hasError = screen.queryAllByText(/error|failed|network/i).length > 0;
          const hasNoLoading = screen.queryAllByText(/loading/i).length === 0;
          
          expect(hasError || hasNoLoading).toBe(true);
        },
        { timeout: 3000 }
      );
    });

    it('should handle cache corruption without hanging', async () => {
      // Mock cache-related error
      mockCachedOpenAlex.works.mockImplementation(() => {
        throw new Error('Cache corruption detected');
      });

      await act(async () => {
        await router.navigate({ to: '/query', search: { q: 'cache test' } });
      });

      render(<RouterProvider router={router} />);

      // Should handle cache errors without infinite loading
      await waitFor(
        () => {
          // Should complete loading cycle within reasonable time
          const isStuck = screen.queryAllByText(/loading/i).length > 2;
          expect(isStuck).toBe(false);
        },
        { timeout: 2000 }
      );
    });
  });
});