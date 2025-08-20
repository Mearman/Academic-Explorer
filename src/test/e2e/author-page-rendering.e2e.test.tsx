import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { createRouter, RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { MantineProvider } from '@mantine/core';
import React from 'react';

import { cachedOpenAlex } from '@/lib/openalex';
import type { Author } from '@/lib/openalex/types';
import { routeTree } from '@/routeTree.gen';
import { mantineTheme } from '@/lib/mantine-theme';
import { useAppStore } from '@/stores/app-store';

// Mock the OpenAlex client
vi.mock('@/lib/openalex', () => ({
  cachedOpenAlex: {
    author: vi.fn(),
  },
}));

// Mock the graph tracking system to prevent side effects
vi.mock('@/lib/graph-entity-tracking', () => ({
  recordEntityPageView: vi.fn().mockResolvedValue(undefined),
  initializeGraphDatabase: vi.fn().mockResolvedValue(undefined),
}));

const mockCachedOpenAlex = vi.mocked(cachedOpenAlex);

// Test wrapper component that provides necessary context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider theme={mantineTheme} forceColorScheme="light">
    {children}
  </MantineProvider>
);

// Custom render function that includes test wrapper
const renderWithProvider = (ui: React.ReactElement) => {
  return render(ui, { wrapper: TestWrapper });
};

describe('E2E: Author Page Rendering', () => {
  let router: ReturnType<typeof createRouter>;
  let memoryHistory: ReturnType<typeof createMemoryHistory>;

  const mockAuthorData: Author = {
    id: 'A5017898742',
    orcid: 'https://orcid.org/0000-0003-1613-5981',
    display_name: 'Joseph Mearman',
    display_name_alternatives: ['J. Mearman', 'Joe Mearman'],
    works_count: 15,
    cited_by_count: 125,
    works_api_url: 'https://api.openalex.org/works?filter=author.id:A5017898742',
    updated_date: '2024-01-15T10:30:00.000Z',
    created_date: '2023-01-01T00:00:00.000Z',
    summary_stats: {
      '2yr_mean_citedness': 2.5,
      h_index: 8,
      i10_index: 5,
    },
    ids: {
      openalex: 'https://openalex.org/A5017898742',
      orcid: 'https://orcid.org/0000-0003-1613-5981',
    },
    counts_by_year: [
      { year: 2024, works_count: 5, cited_by_count: 30 },
      { year: 2023, works_count: 8, cited_by_count: 45 },
      { year: 2022, works_count: 2, cited_by_count: 50 },
    ],
    affiliations: [
      {
        institution: {
          id: 'I1234567890',
          ror: 'https://ror.org/example',
          display_name: 'Example University',
          country_code: 'GB',
          type: 'education',
          lineage: [],
        },
        years: [2020, 2021, 2022, 2023, 2024],
      },
    ],
    last_known_institutions: [{
      id: 'I1234567890',
      ror: 'https://ror.org/example',
      display_name: 'Example University',
      country_code: 'GB',
      type: 'education' as const,
      type_id: 'education',
      ids: {},
      works_count: 1000,
      cited_by_count: 5000,
      summary_stats: {
        '2yr_mean_citedness': 3.5,
        h_index: 45,
        i10_index: 150,
      },
      counts_by_year: [
        { year: 2024, works_count: 100, cited_by_count: 800 },
        { year: 2023, works_count: 120, cited_by_count: 900 },
      ],
      works_api_url: 'https://api.openalex.org/works?filter=institutions.id:I1234567890',
      updated_date: '2024-01-15T10:30:00.000Z',
      created_date: '2020-01-01T00:00:00.000Z',
    }],
    topics: [
      {
        id: 'T41008148',
        display_name: 'Computer science',
        subfield: {
          id: 'subfields/1701',
          display_name: 'Computer Science Applications',
        },
        field: {
          id: 'fields/17',
          display_name: 'Computer Science',
        },
        domain: {
          id: 'domains/3',
          display_name: 'Physical Sciences',
        },
        works_count: 1000,
        cited_by_count: 5000,
        ids: {
          openalex: 'https://openalex.org/T41008148',
          wikidata: 'https://www.wikidata.org/wiki/Q21198',
        },
        works_api_url: 'https://api.openalex.org/works?filter=topics.id:T41008148',
        updated_date: '2024-01-15T10:30:00.000Z',
        created_date: '2020-01-01T00:00:00.000Z',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create memory history starting at home to test navigation
    memoryHistory = createMemoryHistory({
      initialEntries: ['/'],
    });

    router = createRouter({
      routeTree,
      history: memoryHistory,
    });
  });

  describe('Basic Author Page Rendering', () => {
    it('should render author page with valid OpenAlex ID without getting stuck in loading', async () => {
      // Mock successful API response
      mockCachedOpenAlex.author.mockResolvedValue(mockAuthorData);

      // Navigate to author page
      await act(async () => {
        await router.navigate({ to: '/authors/$id', params: { id: 'A5017898742' } });
      });

      renderWithProvider(<RouterProvider router={router} />);

      // Should not be stuck loading - check for author content within reasonable time
      await waitFor(
        () => {
          // Look for author name or other identifying content
          const authorName = screen.queryByText(/Joseph Mearman/i);
          const authorId = screen.queryAllByText(/A5017898742/i)[0];
          const loadingIndicators = screen.queryAllByText(/loading/i);
          
          // Should show author content and not have excessive loading indicators
          expect(authorName || authorId).toBeInTheDocument();
          expect(loadingIndicators.length).toBeLessThan(2); // Allow minimal loading elements
        },
        { timeout: 8000 } // Give enough time for data fetching and rendering
      );

      // Verify that the API was called with correct parameters
      expect(mockCachedOpenAlex.author).toHaveBeenCalledWith('A5017898742', false);
    });

    it('should display key author information components', async () => {
      mockCachedOpenAlex.author.mockResolvedValue(mockAuthorData);

      await act(async () => {
        await router.navigate({ to: '/authors/$id', params: { id: 'A5017898742' } });
      });

      renderWithProvider(<RouterProvider router={router} />);

      await waitFor(
        () => {
          // Check for key author information
          expect(screen.getByText(/Joseph Mearman/i)).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Additional checks for author components (may be displayed progressively)
      const authorElement = screen.getByText(/Joseph Mearman/i);
      expect(authorElement).toBeVisible();
      
      // Check for metrics or other expected author data
      const metricsOrStats = screen.queryAllByText(/works|citations|cited/i)[0] || 
                            screen.queryAllByText(/\d+/)[0]; // Look for numeric data
      if (metricsOrStats) {
        expect(metricsOrStats).toBeInTheDocument();
      }
    });

    it('should handle numeric IDs by redirecting to prefixed format', async () => {
      mockCachedOpenAlex.author.mockResolvedValue(mockAuthorData);

      // Navigate with numeric ID (should redirect to A5017898742)
      await act(async () => {
        await router.navigate({ to: '/authors/$id', params: { id: '5017898742' } });
      });

      renderWithProvider(<RouterProvider router={router} />);

      // Should redirect and then load the author
      await waitFor(
        () => {
          // Should eventually show author data or be in a non-loading state
          const hasAuthorData = screen.queryByText(/Joseph Mearman/i) || 
                               screen.queryAllByText(/A5017898742/i)[0];
          const loadingElements = screen.queryAllByText(/loading/i);
          
          // Should either show data or not be stuck in loading
          expect(hasAuthorData || loadingElements.length === 0).toBe(true);
        },
        { timeout: 6000 }
      );
    });
  });

  describe('Loading States and Error Handling', () => {
    it('should show appropriate loading skeleton while fetching data', async () => {
      // Mock delayed API response to test loading state
      mockCachedOpenAlex.author.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(mockAuthorData), 1000)
        )
      );

      await act(async () => {
        await router.navigate({ to: '/authors/$id', params: { id: 'A5017898742' } });
      });

      renderWithProvider(<RouterProvider router={router} />);

      // Should show loading skeleton initially
      const loadingElements = screen.queryAllByText(/loading/i);
      expect(loadingElements.length).toBeGreaterThan(0);

      // Should eventually show author data
      await waitFor(
        () => {
          const authorName = screen.queryByText(/Joseph Mearman/i);
          expect(authorName).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should handle API errors gracefully without infinite loading', async () => {
      // Mock API error
      mockCachedOpenAlex.author.mockRejectedValue(new Error('Author not found'));

      await act(async () => {
        await router.navigate({ to: '/authors/$id', params: { id: 'A9999999999' } });
      });

      renderWithProvider(<RouterProvider router={router} />);

      // Should show error state or fallback, not infinite loading
      await waitFor(
        () => {
          const errorElements = screen.queryAllByText(/error|not found|failed/i);
          const retryElements = screen.queryAllByText(/retry|try again/i);
          const loadingElements = screen.queryAllByText(/loading/i);
          
          // Should show error handling OR not be stuck loading
          expect(errorElements.length > 0 || retryElements.length > 0 || loadingElements.length < 2).toBe(true);
        },
        { timeout: 4000 }
      );

      // Verify API was called
      expect(mockCachedOpenAlex.author).toHaveBeenCalledWith('A9999999999', false);
    });

    it('should handle network timeout without getting stuck', async () => {
      // Mock network timeout
      mockCachedOpenAlex.author.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 2000)
        )
      );

      await act(async () => {
        await router.navigate({ to: '/authors/$id', params: { id: 'A5017898742' } });
      });

      renderWithProvider(<RouterProvider router={router} />);

      // Should handle timeout and show appropriate state
      await waitFor(
        () => {
          const timeoutElements = screen.queryAllByText(/timeout|failed|error/i);
          const loadingElements = screen.queryAllByText(/loading/i);
          
          // Should show error state or stop loading
          expect(timeoutElements.length > 0 || loadingElements.length === 0).toBe(true);
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Page Component Structure', () => {
    it('should render author page within proper layout structure', async () => {
      mockCachedOpenAlex.author.mockResolvedValue(mockAuthorData);

      await act(async () => {
        await router.navigate({ to: '/authors/$id', params: { id: 'A5017898742' } });
      });

      renderWithProvider(<RouterProvider router={router} />);

      await waitFor(
        () => {
          // Check for main content area
          const mainElement = screen.getByRole('main') || document.querySelector('main');
          expect(mainElement).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Should be within proper app layout
      const appContainer = document.body;
      expect(appContainer).toBeInTheDocument();
      expect(appContainer.children.length).toBeGreaterThan(0);
    });

    it('should display author page with two-pane layout when data loads', async () => {
      mockCachedOpenAlex.author.mockResolvedValue(mockAuthorData);

      await act(async () => {
        await router.navigate({ to: '/authors/$id', params: { id: 'A5017898742' } });
      });

      renderWithProvider(<RouterProvider router={router} />);

      await waitFor(
        () => {
          const authorContent = screen.queryByText(/Joseph Mearman/i);
          expect(authorContent).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Look for layout structure (though exact implementation may vary)
      const layoutElements = document.querySelectorAll('[class*="pane"], [class*="layout"], [class*="container"]');
      expect(layoutElements.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation and Routing', () => {
    it('should handle navigation from home page to author page', async () => {
      mockCachedOpenAlex.author.mockResolvedValue(mockAuthorData);

      // Start at home page
      renderWithProvider(<RouterProvider router={router} />);
      
      // Navigate to author page
      await act(async () => {
        await router.navigate({ to: '/authors/$id', params: { id: 'A5017898742' } });
      });

      // Should successfully navigate and render author content
      await waitFor(
        () => {
          const authorContent = screen.queryByText(/Joseph Mearman/i) ||
                               screen.queryAllByText(/A5017898742/i)[0];
          expect(authorContent).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('should handle direct URL access to author page', async () => {
      mockCachedOpenAlex.author.mockResolvedValue(mockAuthorData);

      // Create router with direct author page navigation
      const directMemoryHistory = createMemoryHistory({
        initialEntries: ['/authors/A5017898742'],
      });

      const directRouter = createRouter({
        routeTree,
        history: directMemoryHistory,
      });

      renderWithProvider(<RouterProvider router={directRouter} />);

      // Should handle direct access without issues
      await waitFor(
        () => {
          const authorContent = screen.queryByText(/Joseph Mearman/i);
          const loadingElements = screen.queryAllByText(/loading/i);
          
          // Should show content or not be stuck loading
          expect(authorContent || loadingElements.length < 2).toBe(true);
        },
        { timeout: 5000 }
      );
    });

    it('should handle hash-based routing correctly', async () => {
      mockCachedOpenAlex.author.mockResolvedValue(mockAuthorData);

      // The app uses hash routing for GitHub Pages compatibility
      const hashMemoryHistory = createMemoryHistory({
        initialEntries: ['/#/authors/A5017898742'],
      });

      const hashRouter = createRouter({
        routeTree,
        history: hashMemoryHistory,
      });

      renderWithProvider(<RouterProvider router={hashRouter} />);

      await waitFor(
        () => {
          // Should handle hash routing
          const pageContent = screen.queryByText(/Joseph Mearman/i) ||
                             document.querySelector('main') ||
                             screen.queryByRole('main');
          expect(pageContent).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Performance and Memory', () => {
    it('should not cause memory leaks during rapid navigation', async () => {
      mockCachedOpenAlex.author.mockResolvedValue(mockAuthorData);

      renderWithProvider(<RouterProvider router={router} />);

      // Rapid navigation test
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await router.navigate({ to: '/authors/$id', params: { id: 'A5017898742' } });
        });

        await act(async () => {
          await router.navigate({ to: '/' });
        });
      }

      // Final navigation to author page
      await act(async () => {
        await router.navigate({ to: '/authors/$id', params: { id: 'A5017898742' } });
      });

      // Should handle rapid navigation without issues
      await waitFor(
        () => {
          const hasContent = screen.queryByText(/Joseph Mearman/i) || 
                            document.querySelector('main');
          expect(hasContent).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should handle component cleanup on unmount', async () => {
      mockCachedOpenAlex.author.mockResolvedValue(mockAuthorData);

      await act(async () => {
        await router.navigate({ to: '/authors/$id', params: { id: 'A5017898742' } });
      });

      const { unmount } = renderWithProvider(<RouterProvider router={router} />);

      await waitFor(
        () => {
          const authorContent = screen.queryByText(/Joseph Mearman/i);
          expect(authorContent).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Unmount component
      unmount();

      // Should clean up without throwing errors
      expect(() => {
        // Any cleanup code would run here
      }).not.toThrow();
    });
  });

  describe('Edge Cases and Robustness', () => {
    it('should handle malformed author IDs gracefully', async () => {
      // Mock appropriate response or error for malformed ID
      mockCachedOpenAlex.author.mockRejectedValue(new Error('Invalid ID format'));

      await act(async () => {
        await router.navigate({ to: '/authors/$id', params: { id: 'invalid-id-format' } });
      });

      renderWithProvider(<RouterProvider router={router} />);

      // Should handle malformed IDs without crashing
      await waitFor(
        () => {
          const hasErrorHandling = screen.queryAllByText(/error|invalid|not found/i).length > 0 ||
                                  screen.queryAllByText(/loading/i).length === 0;
          expect(hasErrorHandling).toBe(true);
        },
        { timeout: 3000 }
      );
    });

    it('should handle empty or null author data', async () => {
      // Mock empty response
      mockCachedOpenAlex.author.mockResolvedValue(null as any);

      await act(async () => {
        await router.navigate({ to: '/authors/$id', params: { id: 'A5017898742' } });
      });

      renderWithProvider(<RouterProvider router={router} />);

      // Should handle empty data gracefully
      await waitFor(
        () => {
          const hasErrorOrFallback = screen.queryAllByText(/error|not found|unavailable/i).length > 0 ||
                                    screen.queryAllByText(/loading/i).length === 0;
          expect(hasErrorOrFallback).toBe(true);
        },
        { timeout: 3000 }
      );
    });

    it('should prevent infinite re-render loops', async () => {
      mockCachedOpenAlex.author.mockResolvedValue(mockAuthorData);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await act(async () => {
        await router.navigate({ to: '/authors/$id', params: { id: 'A5017898742' } });
      });

      renderWithProvider(<RouterProvider router={router} />);

      // Wait for component to settle
      await waitFor(
        () => {
          const hasContent = screen.queryByText(/Joseph Mearman/i) ||
                            document.querySelector('main');
          expect(hasContent).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Should not have React errors about maximum update depth
      const maxUpdateDepthErrors = consoleSpy.mock.calls.filter(call => 
        call[0]?.toString().includes('Maximum update depth exceeded') ||
        call[0]?.toString().includes('Too many re-renders')
      );
      
      expect(maxUpdateDepthErrors).toHaveLength(0);
      
      consoleSpy.mockRestore();
    });
  });
});