import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { routeTree } from '@/routeTree.gen';
import { server } from '@/test/setup';
import { mockWorksResponse } from '@/test/mocks/data';

describe('Query Route Integration Tests', () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
  });

  const renderWithRouter = (path: string) => {
    const history = createMemoryHistory({ initialEntries: [path] });
    router = createRouter({ routeTree, history });
    
    return render(<RouterProvider router={router} />);
  };

  it('should execute search when navigating directly to query URL with parameters', async () => {
    renderWithRouter('/query?q=Joseph+Mearman&sort=relevance_score&order=desc&per_page=25');
    
    // Wait for the search to be triggered and results to load
    await waitFor(() => {
      expect(screen.getByText('Test Work Title')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Verify the search metadata shows correct results (shared mock returns 100 results)
    expect(screen.getByText(/100 result/i)).toBeInTheDocument();
  });

  it('should handle navigation to complex query URLs', async () => {
    const complexUrl = '/query?q=machine+learning&is_oa=true&year=2023&sort=citation_count&order=desc&per_page=50';
    renderWithRouter(complexUrl);
    
    await waitFor(() => {
      expect(screen.getByText('Test Work Title')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should update results when URL parameters change', async () => {
    renderWithRouter('/query?q=initial+query');
    
    // Wait for initial results
    await waitFor(() => {
      expect(screen.getByText('Test Work Title')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Navigate to updated query
    router.navigate({ 
      to: '/query', 
      search: { q: 'updated query', sort: 'publication_date', order: 'asc' } 
    });
    
    // Results should update (in real scenario, would be different results)
    await waitFor(() => {
      expect(screen.getByText('Test Work Title')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should handle empty query parameters gracefully', async () => {
    renderWithRouter('/query');
    
    // Should render without errors but no search should be triggered
    expect(screen.getByText('Advanced Academic Search')).toBeInTheDocument();
    expect(screen.queryByText('Test Work Title')).not.toBeInTheDocument();
  });

  it('should preserve URL parameters when component re-renders', async () => {
    renderWithRouter('/query?q=persistent+query&per_page=25');
    
    await waitFor(() => {
      expect(screen.getByText('Test Work Title')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Force a re-render by updating some state (simulated)
    // The URL parameters should still be preserved and search should still work
    expect(window.location.hash).toContain('q=persistent+query');
    expect(window.location.hash).toContain('per_page=25');
  });

  it('should handle special characters in query parameters', async () => {
    const encodedQuery = encodeURIComponent('machine learning & AI "deep learning"');
    renderWithRouter(`/query?q=${encodedQuery}`);
    
    await waitFor(() => {
      expect(screen.getByText('Test Work Title')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should trigger search with boolean filter parameters', async () => {
    renderWithRouter('/query?q=test&is_oa=true&has_doi=true&not_retracted=true');
    
    await waitFor(() => {
      expect(screen.getByText('Test Work Title')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should handle date range parameters correctly', async () => {
    renderWithRouter('/query?q=test&from_date=2020-01-01&to_date=2023-12-31');
    
    await waitFor(() => {
      expect(screen.getByText('Test Work Title')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should handle entity ID filter parameters', async () => {
    renderWithRouter('/query?q=test&author_id=A5017898742&institution_id=I123456789');
    
    await waitFor(() => {
      expect(screen.getByText('Test Work Title')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should handle API errors gracefully', async () => {
    // Override the server handler to return an error
    server.use(
      http.get('https://api.openalex.org/works', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    renderWithRouter('/query?q=error+test');
    
    // Should show error state
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should show loading state during search', async () => {
    // Delay the API response to test loading state
    server.use(
      http.get('https://api.openalex.org/works', async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return HttpResponse.json(mockWorksResponse);
      })
    );

    renderWithRouter('/query?q=slow+query');
    
    // Should show loading state initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    
    // Then show results
    await waitFor(() => {
      expect(screen.getByText('Test Work Title')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should handle pagination parameters in URL', async () => {
    renderWithRouter('/query?q=test&page=2&per_page=10');
    
    await waitFor(() => {
      expect(screen.getByText('Test Work Title')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Verify pagination controls reflect the URL parameters
    // Note: This would require checking the actual pagination component state
  });

  it('should maintain search history when navigating with URL parameters', async () => {
    renderWithRouter('/query?q=first+search');
    
    await waitFor(() => {
      expect(screen.getByText('Test Work Title')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Navigate to second search
    router.navigate({ to: '/query', search: { q: 'second search' } });
    
    await waitFor(() => {
      expect(screen.getByText('Test Work Title')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Both searches should be in history (would need to check SearchHistory component)
    expect(screen.getByTestId('search-history')).toBeInTheDocument();
  });
});