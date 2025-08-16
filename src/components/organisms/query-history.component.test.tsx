import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import type { WorksParams } from '@/lib/openalex/types';
import { useAppStore, type QueryRecord } from '@/stores/app-store';

import { QueryHistory } from './query-history';

// Mock the app store
vi.mock('@/stores/app-store', () => ({
  useAppStore: vi.fn(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

const mockUseAppStore = vi.mocked(useAppStore);

// Test wrapper for router context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="router-wrapper">
    {children}
  </div>
);

// Helper to create a complete mock store
const createMockStore = (overrides: Partial<ReturnType<typeof useAppStore>> = {}) => ({
  queryHistory: [],
  clearQueryHistory: vi.fn(),
  theme: 'system' as const,
  searchQuery: '',
  searchFilters: {},
  searchHistory: [],
  preferences: {
    resultsPerPage: 20,
    defaultView: 'grid' as const,
    showAbstracts: true,
  },
  setTheme: vi.fn(),
  setSearchQuery: vi.fn(),
  updateSearchFilters: vi.fn(),
  clearSearchFilters: vi.fn(),
  addToSearchHistory: vi.fn(),
  clearSearchHistory: vi.fn(),
  updatePreferences: vi.fn(),
  recordQuery: vi.fn(),
  updateQueryResults: vi.fn(),
  updateQueryError: vi.fn(),
  getQueryHistory: vi.fn(),
  ...overrides,
});

describe('QueryHistory', () => {
  const mockClearQueryHistory = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppStore.mockReturnValue(createMockStore({
      clearQueryHistory: mockClearQueryHistory,
    }));
  });

  describe('Empty State', () => {
    it('should display empty state when no queries exist', () => {
      render(
        <TestWrapper>
          <QueryHistory />
        </TestWrapper>
      );

      expect(screen.getByText('No Query History')).toBeInTheDocument();
      expect(screen.getByText('Your executed queries will appear here with detailed results and timing information.')).toBeInTheDocument();
    });
  });

  describe('Query Display', () => {
    it('should display query with 0 results correctly', () => {
      const queryWithZeroResults: QueryRecord = {
        id: 'query-1',
        timestamp: '2024-01-15T10:30:00.000Z',
        query: 'test search',
        params: { search: 'test search' },
        results: {
          count: 0, // This is the bug - showing 0 results
          responseTimeMs: 150,
          firstResult: undefined,
        },
      };

      mockUseAppStore.mockReturnValue(createMockStore({
        queryHistory: [queryWithZeroResults],
        clearQueryHistory: mockClearQueryHistory,
      }));

      render(
        <TestWrapper>
          <QueryHistory />
        </TestWrapper>
      );

      expect(screen.getByText('test search')).toBeInTheDocument();
      expect(screen.getByText('0 results')).toBeInTheDocument(); // This is the problem
      expect(screen.getByText('150ms')).toBeInTheDocument();
    });

    it('should display query with actual results correctly', () => {
      const queryWithResults: QueryRecord = {
        id: 'query-2',
        timestamp: '2024-01-15T10:35:00.000Z',
        query: 'machine learning',
        params: { search: 'machine learning' },
        results: {
          count: 15000,
          responseTimeMs: 250,
          firstResult: {
            id: 'W123456789',
            title: 'Deep Learning in Practice',
          },
        },
      };

      mockUseAppStore.mockReturnValue(createMockStore({
        queryHistory: [queryWithResults],
        clearQueryHistory: mockClearQueryHistory,
      }));

      render(
        <TestWrapper>
          <QueryHistory />
        </TestWrapper>
      );

      expect(screen.getByText('machine learning')).toBeInTheDocument();
      expect(screen.getByText('15,000 results')).toBeInTheDocument();
      expect(screen.getByText('250ms')).toBeInTheDocument();
    });

    it('should display query count in header', () => {
      const queries: QueryRecord[] = [
        {
          id: 'query-1',
          timestamp: '2024-01-15T10:30:00.000Z',
          query: 'query 1',
          params: { search: 'query 1' },
          results: { count: 0, responseTimeMs: 100 },
        },
        {
          id: 'query-2',
          timestamp: '2024-01-15T10:31:00.000Z',
          query: 'query 2',
          params: { search: 'query 2' },
          results: { count: 500, responseTimeMs: 200 },
        },
      ];

      mockUseAppStore.mockReturnValue(createMockStore({
        queryHistory: queries,
        clearQueryHistory: mockClearQueryHistory,
      }));

      render(
        <TestWrapper>
          <QueryHistory />
        </TestWrapper>
      );

      expect(screen.getByText('2 queries')).toBeInTheDocument();
    });

    it('should format timestamps correctly in British format', () => {
      const query: QueryRecord = {
        id: 'query-1',
        timestamp: '2024-01-15T14:30:45.000Z',
        query: 'test',
        params: { search: 'test' },
        results: { count: 100, responseTimeMs: 150 },
      };

      mockUseAppStore.mockReturnValue(createMockStore({
        queryHistory: [query],
        clearQueryHistory: mockClearQueryHistory,
      }));

      render(
        <TestWrapper>
          <QueryHistory />
        </TestWrapper>
      );

      // Should format as DD/MM/YYYY, HH:MM:SS
      expect(screen.getByText(/15\/01\/2024, 14:30:45/)).toBeInTheDocument();
    });
  });

  describe('Query Interaction', () => {
    it('should expand query details when clicked', async () => {
      const query: QueryRecord = {
        id: 'query-1',
        timestamp: '2024-01-15T10:30:00.000Z',
        query: 'test search',
        params: { search: 'test search', per_page: 25 },
        results: {
          count: 1000,
          responseTimeMs: 200,
          firstResult: {
            id: 'W123456789',
            title: 'Test Paper',
          },
        },
      };

      mockUseAppStore.mockReturnValue(createMockStore({
        queryHistory: [query],
        clearQueryHistory: mockClearQueryHistory,
      }));

      render(
        <TestWrapper>
          <QueryHistory />
        </TestWrapper>
      );

      const queryHeader = screen.getByText('test search').closest('div');
      expect(queryHeader).toBeInTheDocument();

      fireEvent.click(queryHeader!);

      await waitFor(() => {
        expect(screen.getByText('Results:')).toBeInTheDocument();
        expect(screen.getByText('1,000')).toBeInTheDocument();
        expect(screen.getByText('Response Time:')).toBeInTheDocument();
        expect(screen.getByText('200ms')).toBeInTheDocument();
        expect(screen.getByText('First Result:')).toBeInTheDocument();
        expect(screen.getByText('Test Paper')).toBeInTheDocument();
        expect(screen.getByText('Query Parameters:')).toBeInTheDocument();
      });
    });

    it('should call rerun handler when rerun button is clicked', () => {
      const mockOnRerunQuery = vi.fn();
      const query: QueryRecord = {
        id: 'query-1',
        timestamp: '2024-01-15T10:30:00.000Z',
        query: 'test search',
        params: { search: 'test search' },
        results: { count: 100, responseTimeMs: 150 },
      };

      mockUseAppStore.mockReturnValue(createMockStore({
        queryHistory: [query],
        clearQueryHistory: mockClearQueryHistory,
      }));

      render(
        <TestWrapper>
          <QueryHistory onRerunQuery={mockOnRerunQuery} />
        </TestWrapper>
      );

      const rerunButton = screen.getByText('Rerun');
      fireEvent.click(rerunButton);

      expect(mockOnRerunQuery).toHaveBeenCalledWith(query.params);
    });

    it('should navigate to query page when rerun clicked without handler', () => {
      const query: QueryRecord = {
        id: 'query-1',
        timestamp: '2024-01-15T10:30:00.000Z',
        query: 'test search',
        params: { 
          search: 'test search',
          per_page: 25,
          filter: 'publication_year:2023',
        },
        results: { count: 100, responseTimeMs: 150 },
      };

      mockUseAppStore.mockReturnValue(createMockStore({
        queryHistory: [query],
        clearQueryHistory: mockClearQueryHistory,
      }));

      render(
        <TestWrapper>
          <QueryHistory />
        </TestWrapper>
      );

      const rerunButton = screen.getByText('Rerun');
      fireEvent.click(rerunButton);

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/query',
        search: {
          q: 'test search',
          per_page: 25,
          filter: 'publication_year:2023',
        },
      });
    });

    it('should clear history when clear button is clicked', () => {
      const query: QueryRecord = {
        id: 'query-1',
        timestamp: '2024-01-15T10:30:00.000Z',
        query: 'test search',
        params: { search: 'test search' },
        results: { count: 100, responseTimeMs: 150 },
      };

      mockUseAppStore.mockReturnValue(createMockStore({
        queryHistory: [query],
        clearQueryHistory: mockClearQueryHistory,
      }));

      render(
        <TestWrapper>
          <QueryHistory />
        </TestWrapper>
      );

      const clearButton = screen.getByText('Clear History');
      fireEvent.click(clearButton);

      expect(mockClearQueryHistory).toHaveBeenCalled();
    });
  });

  describe('Query Status Indicators', () => {
    it('should show error status for failed queries', () => {
      const errorQuery: QueryRecord = {
        id: 'query-error',
        timestamp: '2024-01-15T10:30:00.000Z',
        query: 'failing query',
        params: { search: 'failing query' },
        error: 'API request failed',
      };

      mockUseAppStore.mockReturnValue(createMockStore({
        queryHistory: [errorQuery],
        clearQueryHistory: mockClearQueryHistory,
      }));

      render(
        <TestWrapper>
          <QueryHistory />
        </TestWrapper>
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('failing query')).toBeInTheDocument();
    });

    it('should show success status for completed queries', () => {
      const successQuery: QueryRecord = {
        id: 'query-success',
        timestamp: '2024-01-15T10:30:00.000Z',
        query: 'successful query',
        params: { search: 'successful query' },
        results: { count: 500, responseTimeMs: 180 },
      };

      mockUseAppStore.mockReturnValue(createMockStore({
        queryHistory: [successQuery],
        clearQueryHistory: mockClearQueryHistory,
      }));

      const { container } = render(
        <TestWrapper>
          <QueryHistory />
        </TestWrapper>
      );

      // Check that the query item has success class
      const queryItem = container.querySelector('.queryItem');
      expect(queryItem).toHaveClass('success');
    });

    it('should show pending status for queries without results or errors', () => {
      const pendingQuery: QueryRecord = {
        id: 'query-pending',
        timestamp: '2024-01-15T10:30:00.000Z',
        query: 'pending query',
        params: { search: 'pending query' },
        // No results or error - should be pending
      };

      mockUseAppStore.mockReturnValue(createMockStore({
        queryHistory: [pendingQuery],
        clearQueryHistory: mockClearQueryHistory,
      }));

      const { container } = render(
        <TestWrapper>
          <QueryHistory />
        </TestWrapper>
      );

      // Check that the query item has pending class
      const queryItem = container.querySelector('.queryItem');
      expect(queryItem).toHaveClass('pending');
    });
  });

  describe('Edge Cases', () => {
    it('should handle queries with missing first result', () => {
      const query: QueryRecord = {
        id: 'query-no-first-result',
        timestamp: '2024-01-15T10:30:00.000Z',
        query: 'empty results',
        params: { search: 'empty results' },
        results: {
          count: 0, // 0 count but no first result
          responseTimeMs: 100,
          firstResult: undefined,
        },
      };

      mockUseAppStore.mockReturnValue(createMockStore({
        queryHistory: [query],
        clearQueryHistory: mockClearQueryHistory,
      }));

      render(
        <TestWrapper>
          <QueryHistory />
        </TestWrapper>
      );

      // Should not crash and should show 0 results
      expect(screen.getByText('0 results')).toBeInTheDocument();
      
      // Expand to check details don't include first result
      const queryHeader = screen.getByText('empty results').closest('div');
      fireEvent.click(queryHeader!);

      expect(screen.queryByText('First Result:')).not.toBeInTheDocument();
    });

    it('should handle queries with complex parameters', () => {
      const complexParams: WorksParams = {
        search: 'quantum computing',
        filter: 'publication_year:2020-2024,is_oa:true',
        sort: 'cited_by_count:desc',
        per_page: 50,
        from_publication_date: '2020-01-01',
        to_publication_date: '2024-12-31',
      };

      const query: QueryRecord = {
        id: 'query-complex',
        timestamp: '2024-01-15T10:30:00.000Z',
        query: 'quantum computing',
        params: complexParams,
        results: { count: 2500, responseTimeMs: 300 },
      };

      mockUseAppStore.mockReturnValue(createMockStore({
        queryHistory: [query],
        clearQueryHistory: mockClearQueryHistory,
      }));

      render(
        <TestWrapper>
          <QueryHistory />
        </TestWrapper>
      );

      // Expand to see parameters
      const queryHeader = screen.getByText('quantum computing').closest('div');
      fireEvent.click(queryHeader!);

      // Should display JSON formatted parameters
      expect(screen.getByText(/"search": "quantum computing"/)).toBeInTheDocument();
      expect(screen.getByText(/"per_page": 50/)).toBeInTheDocument();
    });
  });
});