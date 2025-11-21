import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';
import * as client from '@academic-explorer/client';

// Mock the client
vi.mock('@academic-explorer/client', () => ({
  cachedOpenAlex: {
    client: {
      keywords: {
        getKeyword: vi.fn(),
      },
    },
  },
}));

describe('Keywords Route - EntityDetailLayout Migration', () => {
  let queryClient: QueryClient;
  let router: ReturnType<typeof createRouter>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    const history = createMemoryHistory({
      initialEntries: ['/keywords/artificial-intelligence'],
    });

    router = createRouter({
      routeTree,
      history,
      context: { queryClient },
    });

    vi.clearAllMocks();
  });

  describe('T003: EntityDetailLayout Component', () => {
    it('should use EntityDetailLayout component (currently fails - migration not done)', async () => {
      // Setup mock data
      const mockKeyword = {
        id: 'https://openalex.org/keywords/artificial-intelligence',
        display_name: 'Artificial Intelligence',
        cited_by_count: 50000,
        works_count: 10000,
        counts_by_year: [],
      };

      (client.cachedOpenAlex.client.keywords.getKeyword as any).mockResolvedValue(mockKeyword);

      // Render route
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      render(<RouterProvider router={router} />, { wrapper });

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // THIS WILL FAIL: Expect EntityDetailLayout to be used
      // EntityDetailLayout should render with specific data-testid
      const entityDetailLayout = screen.queryByTestId('entity-detail-layout');
      expect(entityDetailLayout).toBeInTheDocument();
    });

    it('should use LoadingState component during fetch (currently fails)', async () => {
      // Setup slow-resolving mock
      (client.cachedOpenAlex.client.keywords.getKeyword as any).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      render(<RouterProvider router={router} />, { wrapper });

      // THIS WILL FAIL: Expect LoadingState component to be rendered
      const loadingState = screen.queryByTestId('loading-state');
      expect(loadingState).toBeInTheDocument();
    });

    it('should use ErrorState component on error (currently fails)', async () => {
      // Setup error mock
      (client.cachedOpenAlex.client.keywords.getKeyword as any).mockRejectedValue(
        new Error('Network error')
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      render(<RouterProvider router={router} />, { wrapper });

      // Wait for error to be handled
      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // THIS WILL FAIL: Expect ErrorState component to be rendered
      const errorState = screen.queryByTestId('error-state');
      expect(errorState).toBeInTheDocument();
    });

    it('should render RelationshipCounts component (currently fails)', async () => {
      const mockKeyword = {
        id: 'https://openalex.org/keywords/artificial-intelligence',
        display_name: 'Artificial Intelligence',
        cited_by_count: 50000,
        works_count: 10000,
        counts_by_year: [],
      };

      (client.cachedOpenAlex.client.keywords.getKeyword as any).mockResolvedValue(mockKeyword);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      render(<RouterProvider router={router} />, { wrapper });

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // THIS WILL FAIL: Expect RelationshipCounts to be rendered
      const relationshipCounts = screen.queryByTestId('relationship-counts');
      expect(relationshipCounts).toBeInTheDocument();
    });

    it('should render IncomingRelationships component (currently fails)', async () => {
      const mockKeyword = {
        id: 'https://openalex.org/keywords/artificial-intelligence',
        display_name: 'Artificial Intelligence',
        cited_by_count: 50000,
        works_count: 10000,
        counts_by_year: [],
      };

      (client.cachedOpenAlex.client.keywords.getKeyword as any).mockResolvedValue(mockKeyword);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      render(<RouterProvider router={router} />, { wrapper });

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // THIS WILL FAIL: Expect IncomingRelationships to be rendered
      const incomingRelationships = screen.queryByTestId('incoming-relationships');
      expect(incomingRelationships).toBeInTheDocument();
    });

    it('should render OutgoingRelationships component (currently fails)', async () => {
      const mockKeyword = {
        id: 'https://openalex.org/keywords/artificial-intelligence',
        display_name: 'Artificial Intelligence',
        cited_by_count: 50000,
        works_count: 10000,
        counts_by_year: [],
      };

      (client.cachedOpenAlex.client.keywords.getKeyword as any).mockResolvedValue(mockKeyword);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      render(<RouterProvider router={router} />, { wrapper });

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // THIS WILL FAIL: Expect OutgoingRelationships to be rendered
      const outgoingRelationships = screen.queryByTestId('outgoing-relationships');
      expect(outgoingRelationships).toBeInTheDocument();
    });
  });
});
