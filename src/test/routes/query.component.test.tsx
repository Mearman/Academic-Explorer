import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { routeTree } from '@/routeTree.gen';

// Mock the SearchResults component since we're testing parameter passing
vi.mock('@/components/organisms/search-results', () => ({
  SearchResults: vi.fn(({ searchParams }) => (
    <div data-testid="search-results" data-search-params={JSON.stringify(searchParams)}>
      Search Results Component
    </div>
  ))
}));

// Mock other components to simplify testing
vi.mock('@/components/molecules/advanced-search-form', () => ({
  AdvancedSearchForm: vi.fn(() => <div data-testid="advanced-search-form">Advanced Search Form</div>)
}));

vi.mock('@/components/organisms/query-history', () => ({
  QueryHistory: vi.fn(() => <div data-testid="query-history">Query History</div>)
}));

vi.mock('@/components/organisms/search-history', () => ({
  SearchHistory: vi.fn(() => <div data-testid="search-history">Search History</div>)
}));

describe.skip('Query Route Component', () => {
  let router: ReturnType<typeof createRouter>;
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        {children}
      </MantineProvider>
    </QueryClientProvider>
  );

  const renderWithRouter = (path: string) => {
    const history = createMemoryHistory({ initialEntries: [path] });
    router = createRouter({ routeTree, history });
    
    return render(
      <TestWrapper>
        <RouterProvider router={router} />
      </TestWrapper>
    );
  };

  it('should render query page components', async () => {
    renderWithRouter('/query');
    
    await waitFor(() => {
      expect(screen.getByText('Advanced Academic Search')).toBeInTheDocument();
      expect(screen.getByTestId('advanced-search-form')).toBeInTheDocument();
      expect(screen.getByTestId('search-results')).toBeInTheDocument();
      expect(screen.getByTestId('query-history')).toBeInTheDocument();
      expect(screen.getByTestId('search-history')).toBeInTheDocument();
    });
  });

  it('should initialize with empty searchParams when no URL parameters', async () => {
    renderWithRouter('/query');
    
    await waitFor(() => {
      const searchResults = screen.getByTestId('search-results');
      const searchParamsData = JSON.parse(searchResults.dataset.searchParams || '{}');
      expect(searchParamsData).toEqual({});
    });
  });

  it('should convert basic query parameter to searchParams', async () => {
    renderWithRouter('/query?q=Joseph+Mearman');
    
    await waitFor(() => {
      const searchResults = screen.getByTestId('search-results');
      const searchParamsData = JSON.parse(searchResults.dataset.searchParams || '{}');
      expect(searchParamsData).toEqual({
        search: 'Joseph Mearman'
      });
    });
  });

  it('should convert sort and order parameters', async () => {
    renderWithRouter('/query?q=test&sort=relevance_score&order=desc');
    
    await waitFor(() => {
      const searchResults = screen.getByTestId('search-results');
      const searchParamsData = JSON.parse(searchResults.dataset.searchParams || '{}');
      expect(searchParamsData).toEqual({
        search: 'test',
        sort: 'relevance_score:desc'
      });
    });
  });

  it('should convert pagination parameters', async () => {
    renderWithRouter('/query?q=test&per_page=25&page=2');
    
    await waitFor(() => {
      const searchResults = screen.getByTestId('search-results');
      const searchParamsData = JSON.parse(searchResults.dataset.searchParams || '{}');
      expect(searchParamsData).toEqual({
        search: 'test',
        per_page: 25,
        page: 2
      });
    });
  });

  it('should convert boolean filter parameters', async () => {
    renderWithRouter('/query?q=test&is_oa=true&has_doi=false');
    
    await waitFor(() => {
      const searchResults = screen.getByTestId('search-results');
      const searchParamsData = JSON.parse(searchResults.dataset.searchParams || '{}');
      expect(searchParamsData.filter).toBe('is_oa:true,has_doi:false');
    });
  });

  it('should convert year filter parameter', async () => {
    renderWithRouter('/query?q=test&year=2023');
    
    await waitFor(() => {
      const searchResults = screen.getByTestId('search-results');
      const searchParamsData = JSON.parse(searchResults.dataset.searchParams || '{}');
      expect(searchParamsData.filter).toBe('publication_year:2023');
    });
  });

  it('should convert entity ID parameters', async () => {
    renderWithRouter('/query?q=test&author_id=A123456789&institution_id=I987654321');
    
    await waitFor(() => {
      const searchResults = screen.getByTestId('search-results');
      const searchParamsData = JSON.parse(searchResults.dataset.searchParams || '{}');
      expect(searchParamsData.filter).toBe('authorships.author.id:A123456789,authorships.institutions.id:I987654321');
    });
  });

  it('should convert date range parameters', async () => {
    renderWithRouter('/query?q=test&from_date=2020-01-01&to_date=2023-12-31');
    
    await waitFor(() => {
      const searchResults = screen.getByTestId('search-results');
      const searchParamsData = JSON.parse(searchResults.dataset.searchParams || '{}');
      expect(searchParamsData).toEqual({
        search: 'test',
        from_publication_date: '2020-01-01',
        to_publication_date: '2023-12-31'
      });
    });
  });

  it('should handle complex URL with multiple parameters', async () => {
    const complexUrl = '/query?q=machine+learning&sort=citation_count&order=desc&per_page=50&is_oa=true&year=2022&author_id=A123456789';
    renderWithRouter(complexUrl);
    
    await waitFor(() => {
      const searchResults = screen.getByTestId('search-results');
      const searchParamsData = JSON.parse(searchResults.dataset.searchParams || '{}');
      
      expect(searchParamsData).toEqual({
        search: 'machine learning',
        sort: 'citation_count:desc',
        per_page: 50,
        filter: 'is_oa:true,publication_year:2022,authorships.author.id:A123456789'
      });
    });
  });

  it('should handle URL-encoded special characters', async () => {
    renderWithRouter('/query?q=machine%20learning%20%26%20AI');
    
    await waitFor(() => {
      const searchResults = screen.getByTestId('search-results');
      const searchParamsData = JSON.parse(searchResults.dataset.searchParams || '{}');
      expect(searchParamsData.search).toBe('machine learning & AI');
    });
  });

  it('should handle retraction parameter correctly', async () => {
    renderWithRouter('/query?q=test&not_retracted=true');
    
    await waitFor(() => {
      const searchResults = screen.getByTestId('search-results');
      const searchParamsData = JSON.parse(searchResults.dataset.searchParams || '{}');
      expect(searchParamsData.filter).toBe('is_retracted:false');
    });
  });

  it('should update searchParams when URL parameters change', async () => {
    renderWithRouter('/query?q=initial');
    
    await waitFor(() => {
      const searchResults = screen.getByTestId('search-results');
      const searchParamsData = JSON.parse(searchResults.dataset.searchParams || '{}');
      expect(searchParamsData.search).toBe('initial');
    });

    // Navigate to new URL with different parameters
    router.navigate({ to: '/query', search: { q: 'updated', sort: 'publication_date', order: 'asc' } });
    
    await waitFor(() => {
      const searchResults = screen.getByTestId('search-results');
      const searchParamsData = JSON.parse(searchResults.dataset.searchParams || '{}');
      expect(searchParamsData).toEqual({
        search: 'updated',
        sort: 'publication_date:asc'
      });
    });
  });
});