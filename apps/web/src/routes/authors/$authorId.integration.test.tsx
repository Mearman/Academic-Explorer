import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from '@tanstack/react-router';
import { MantineProvider } from '@mantine/core';
import AuthorRoute from './$authorId';
import { useRawEntityData } from '@/hooks/use-raw-entity-data';
import { useGraphData } from '@/hooks/use-graph-data';
import { useEntityDocumentTitle } from '@/hooks/use-document-title';
import { EntityDetectionService } from '@academic-explorer/graph';
import { setupRouterMocks } from '@/test/utils/router-mocks';
import { renderWithProviders } from '@/test/utils';

// Mock the route for testing
vi.mock('./$authorId', () => ({
  Route: {
    useParams: vi.fn(() => ({ authorId: 'A123' })),
  },
  default: AuthorRoute,
}));

// Mock hooks
vi.mock('@/hooks/use-raw-entity-data', () => ({
  useRawEntityData: vi.fn(),
}));

vi.mock('@/hooks/use-graph-data', () => ({
  useGraphData: vi.fn(),
}));

vi.mock('@/hooks/use-document-title', () => ({
  useEntityDocumentTitle: vi.fn(),
}));

vi.mock('@academic-explorer/graph', () => ({
  EntityDetectionService: {
    detectEntity: vi.fn(),
  },
}));

// Mock ViewToggle to avoid circular dependency issues
vi.mock('@/ui/components/ViewToggle/ViewToggle', () => ({
  default: ({ viewMode, onToggle, entityType }: any) => (
    <div data-testid="view-toggle" data-view-mode={viewMode} data-entity-type={entityType}>
      <button data-testid="toggle-raw" onClick={() => onToggle('raw')}>Raw</button>
      <button data-testid="toggle-rich" onClick={() => onToggle('rich')}>Rich</button>
    </div>
  ),
}));

// Synthetic mock data for author (since synthetic-data.ts not available)
const mockAuthorData = {
  id: 'https://openalex.org/A123',
  display_name: 'John Doe',
  works_count: 100,
  cited_by_count: 5000,
  ids: { orcid: '0000-0001-2345-6789' },
  // ... more fields as needed
};

describe('AuthorRoute Integration Tests', () => {
  let queryClient: QueryClient;
  let router: ReturnType<typeof createMemoryRouter>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });

    // Setup router mocks
    setupRouterMocks();

    // Mock useParams
    const mockUseParams = require('@tanstack/react-router').useParams;
    mockUseParams.mockReturnValue({ authorId: 'A123' });

    // Mock useNavigate
    const mockUseNavigate = require('@tanstack/react-router').useNavigate;
    mockUseNavigate.mockReturnValue(vi.fn());

    // Mock EntityDetectionService
    EntityDetectionService.detectEntity.mockReturnValue({
      entityType: 'authors',
      normalizedId: 'A123', // No redirect for this test
    });

    // Mock useRawEntityData
    (useRawEntityData as any).mockReturnValue({
      data: mockAuthorData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    // Mock useGraphData
    (useGraphData as any).mockReturnValue({
      loadEntity: vi.fn().mockResolvedValue(undefined),
      loadEntityIntoGraph: vi.fn().mockResolvedValue(undefined),
      isLoading: false,
      error: null,
    });

    // Mock useEntityDocumentTitle
    (useEntityDocumentTitle as any).mockImplementation((data) => {
      document.title = data ? `${data.display_name} - Academic Explorer` : 'Academic Explorer';
    });

    // Create router for the route
    router = createMemoryRouter({
      routeTree: {
        path: '/authors/$authorId',
        component: AuthorRoute,
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
    document.title = 'Academic Explorer'; // Reset title
  });

  it('renders loading state when rawEntityData is loading', () => {
    (useRawEntityData as any).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <RouterProvider router={router} />
        </MantineProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Loading Author...')).toBeInTheDocument();
    expect(screen.getByText('Author ID: A123')).toBeInTheDocument();
  });

  it('renders error state with retry button when rawEntityData has error', async () => {
    const mockError = new Error('API Error');
    (useRawEntityData as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: mockError,
      refetch: vi.fn(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <RouterProvider router={router} />
        </MantineProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Error Loading Author')).toBeInTheDocument();
    expect(screen.getByText('Author ID: A123')).toBeInTheDocument();
    expect(screen.getByText(`Error: ${mockError.message}`)).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect((useRawEntityData as any)().refetch).toHaveBeenCalled();
  });

  it('renders ViewToggle and rich view (null content) by default', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <RouterProvider router={router} />
        </MantineProvider>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('view-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('view-toggle')).toHaveAttribute('data-view-mode', 'rich');
    expect(screen.getByTestId('view-toggle')).toHaveAttribute('data-entity-type', 'author');

    // Rich view renders null, so no <pre>, but toggle is there
    expect(screen.queryByRole('generic', { name: /json/i })).not.toBeInTheDocument();
  });

  it('toggles to raw view and renders JSON in <pre>', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <RouterProvider router={router} />
        </MantineProvider>
      </QueryClientProvider>
    );

    const rawButton = screen.getByTestId('toggle-raw');
    fireEvent.click(rawButton);

    // Wait for re-render
    await waitFor(() => {
      expect(screen.getByTestId('view-toggle')).toHaveAttribute('data-view-mode', 'raw');
    });

    const preElement = screen.getByRole('generic', { name: /json/i }); // <pre> has no role, but class or text
    expect(preElement).toBeInTheDocument();
    expect(preElement).toHaveTextContent(mockAuthorData.display_name);
    expect(preElement).toHaveClass('json-view', 'p-4', 'bg-gray-100', 'overflow-auto', 'mt-4');
  });

  it('toggles back to rich view and hides JSON', async () => {
    // Start in rich, toggle to raw, then back
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <RouterProvider router={router} />
        </MantineProvider>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByTestId('toggle-raw'));
    await waitFor(() => expect(screen.getByTestId('view-toggle')).toHaveAttribute('data-view-mode', 'raw'));

    fireEvent.click(screen.getByTestId('toggle-rich'));
    await waitFor(() => expect(screen.getByTestId('view-toggle')).toHaveAttribute('data-view-mode', 'rich'));

    expect(screen.queryByRole('generic', { name: /json/i })).not.toBeInTheDocument();
  });

  it('does not refetch data on view toggle', async () => {
    const mockRefetch = vi.fn();
    (useRawEntityData as any).mockReturnValue({
      data: mockAuthorData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <RouterProvider router={router} />
        </MantineProvider>
      </QueryClientProvider>
    );

    // Initial render
    expect(mockRefetch).not.toHaveBeenCalled();

    // Toggle to raw
    fireEvent.click(screen.getByTestId('toggle-raw'));
    await waitFor(() => expect(screen.getByTestId('view-toggle')).toHaveAttribute('data-view-mode', 'raw'));

    // No refetch called
    expect(mockRefetch).not.toHaveBeenCalled();

    // Toggle back
    fireEvent.click(screen.getByTestId('toggle-rich'));
    await waitFor(() => expect(screen.getByTestId('view-toggle')).toHaveAttribute('data-view-mode', 'rich'));

    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('sets document title correctly with entity data', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <RouterProvider router={router} />
        </MantineProvider>
      </QueryClientProvider>
    );

    expect(useEntityDocumentTitle).toHaveBeenCalledWith(mockAuthorData);
    expect(document.title).toBe('John Doe - Academic Explorer');
  });

  it('handles normalization and redirect', async () => {
    const mockNavigate = vi.fn();
    const mockUseNavigate = require('@tanstack/react-router').useNavigate;
    mockUseNavigate.mockReturnValue(mockNavigate);

    EntityDetectionService.detectEntity.mockReturnValue({
      entityType: 'authors',
      normalizedId: 'A456', // Different ID
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <RouterProvider router={router} />
        </MantineProvider>
      </QueryClientProvider>
    );

    // Should call navigate with normalized ID
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/authors/$authorId',
        params: { authorId: 'A456' },
        search: expect.any(Function),
        replace: true,
      });
    });
  });

  it('loads entity into graph correctly (initial empty graph)', async () => {
    const mockLoadEntity = vi.fn().mockResolvedValue(undefined);
    (useGraphData as any).mockReturnValue({
      loadEntity: mockLoadEntity,
      loadEntityIntoGraph: vi.fn(),
      isLoading: false,
      error: null,
    });

    // Mock nodeCount = 0
    const mockUseGraphStore = require('@/stores/graph-store').useGraphStore;
    mockUseGraphStore.mockImplementation((selector) => selector({ totalNodeCount: 0 }));

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <RouterProvider router={router} />
        </MantineProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mockLoadEntity).toHaveBeenCalledWith('A123');
    });
  });

  it('loads entity into existing graph incrementally', async () => {
    const mockLoadEntityIntoGraph = vi.fn().mockResolvedValue(undefined);
    (useGraphData as any).mockReturnValue({
      loadEntity: vi.fn(),
      loadEntityIntoGraph: mockLoadEntityIntoGraph,
      isLoading: false,
      error: null,
    });

    // Mock nodeCount > 0
    const mockUseGraphStore = require('@/stores/graph-store').useGraphStore;
    mockUseGraphStore.mockImplementation((selector) => selector({ totalNodeCount: 5 }));

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <RouterProvider router={router} />
        </MantineProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mockLoadEntityIntoGraph).toHaveBeenCalledWith('A123');
    });
  });
});