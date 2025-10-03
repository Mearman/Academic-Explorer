import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { MantineProvider } from '@mantine/core';
import SourceRoute from './$sourceId';
import { useRawEntityData } from '@/hooks/use-raw-entity-data';
import { useGraphData } from '@/hooks/use-graph-data';
import { useEntityDocumentTitle } from '@/hooks/use-document-title';
import { EntityDetectionService } from '@academic-explorer/graph';
import { useParams } from '@tanstack/react-router';
import { setupRouterMocks } from '@/test/utils/router-mocks';

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

// Mock router hooks
vi.mock('@tanstack/react-router', () => ({
  useParams: vi.fn(),
  useNavigate: vi.fn(),
}));

// Mock ViewToggle
vi.mock('@/ui/components/ViewToggle/ViewToggle', () => ({
  default: ({ viewMode, onToggle, entityType }: any) => (
    <div data-testid="view-toggle" data-view-mode={viewMode} data-entity-type={entityType}>
      <button data-testid="toggle-raw" onClick={() => onToggle('raw')}>Raw</button>
      <button data-testid="toggle-rich" onClick={() => onToggle('rich')}>Rich</button>
    </div>
  ),
}));

// Mock useGraphStore for nodeCount
vi.mock('@/stores/graph-store', () => ({
  useGraphStore: vi.fn(),
}));

// Synthetic mock data for source
const mockSourceData = {
  id: 'https://openalex.org/S123',
  display_name: 'Sample Source',
  issn: '1234-5678',
  publisher: 'Sample Publisher',
  // ... more fields
};

describe('SourceRoute Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });

    setupRouterMocks();

    // Mock useParams
    (useParams as any).mockReturnValue({ sourceId: 'S123' });

    // Mock useNavigate
    (useNavigate as any).mockReturnValue(vi.fn());

    // Mock EntityDetectionService
    EntityDetectionService.detectEntity.mockReturnValue({
      entityType: 'sources',
      normalizedId: 'S123',
    });

    // Mock useRawEntityData
    (useRawEntityData as any).mockReturnValue({
      data: mockSourceData,
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

    // Mock useGraphStore
    const mockUseGraphStore = require('@/stores/graph-store').useGraphStore;
    mockUseGraphStore.mockImplementation((selector) => selector({ totalNodeCount: 0 }));
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
    document.title = 'Academic Explorer';
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
          <SourceRoute />
        </MantineProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Loading Source...')).toBeInTheDocument();
    expect(screen.getByText('Source ID: S123')).toBeInTheDocument();
  });

  it('renders error state with retry button when rawEntityData has error', () => {
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
          <SourceRoute />
        </MantineProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Error Loading Source')).toBeInTheDocument();
    expect(screen.getByText('Source ID: S123')).toBeInTheDocument();
    expect(screen.getByText(`Error: ${mockError.message}`)).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);
    expect((useRawEntityData as any)().refetch).toHaveBeenCalled();
  });

  it('renders ViewToggle and rich view (null content) by default', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <SourceRoute />
        </MantineProvider>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('view-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('view-toggle')).toHaveAttribute('data-view-mode', 'rich');
    expect(screen.getByTestId('view-toggle')).toHaveAttribute('data-entity-type', 'source');

    expect(screen.queryByTestId('json-pre')).not.toBeInTheDocument();
  });

  it('toggles to raw view and renders JSON in <pre>', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <SourceRoute />
        </MantineProvider>
      </QueryClientProvider>
    );

    const rawButton = screen.getByTestId('toggle-raw');
    fireEvent.click(rawButton);

    await waitFor(() => {
      expect(screen.getByTestId('view-toggle')).toHaveAttribute('data-view-mode', 'raw');
    });

    const preElement = screen.getByTestId('json-pre');
    expect(preElement).toBeInTheDocument();
    expect(preElement).toHaveTextContent(mockSourceData.display_name);
  });

  it('toggles back to rich view and hides JSON', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <SourceRoute />
        </MantineProvider>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByTestId('toggle-raw'));
    await waitFor(() => expect(screen.getByTestId('view-toggle')).toHaveAttribute('data-view-mode', 'raw'));

    fireEvent.click(screen.getByTestId('toggle-rich'));
    await waitFor(() => expect(screen.getByTestId('view-toggle')).toHaveAttribute('data-view-mode', 'rich'));

    expect(screen.queryByTestId('json-pre')).not.toBeInTheDocument();
  });

  it('does not refetch data on view toggle', async () => {
    const mockRefetch = vi.fn();
    (useRawEntityData as any).mockReturnValue({
      data: mockSourceData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <SourceRoute />
        </MantineProvider>
      </QueryClientProvider>
    );

    expect(mockRefetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('toggle-raw'));
    await waitFor(() => expect(screen.getByTestId('view-toggle')).toHaveAttribute('data-view-mode', 'raw'));

    expect(mockRefetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('toggle-rich'));
    await waitFor(() => expect(screen.getByTestId('view-toggle')).toHaveAttribute('data-view-mode', 'rich'));

    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('sets document title correctly with entity data', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <SourceRoute />
        </MantineProvider>
      </QueryClientProvider>
    );

    expect(useEntityDocumentTitle).toHaveBeenCalledWith(mockSourceData);
    expect(document.title).toBe('Sample Source - Academic Explorer');
  });

  it('handles normalization and redirect', async () => {
    const mockNavigate = vi.fn();
    (useNavigate as any).mockReturnValue(mockNavigate);

    EntityDetectionService.detectEntity.mockReturnValue({
      entityType: 'sources',
      normalizedId: 'S456',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <SourceRoute />
        </MantineProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/sources/$sourceId',
        params: { sourceId: 'S456' },
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

    const mockUseGraphStore = require('@/stores/graph-store').useGraphStore;
    mockUseGraphStore.mockImplementation((selector) => selector({ totalNodeCount: 0 }));

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <SourceRoute />
        </MantineProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mockLoadEntity).toHaveBeenCalledWith('S123');
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

    const mockUseGraphStore = require('@/stores/graph-store').useGraphStore;
    mockUseGraphStore.mockImplementation((selector) => selector({ totalNodeCount: 5 }));

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <SourceRoute />
        </MantineProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mockLoadEntityIntoGraph).toHaveBeenCalledWith('S123');
    });
  });
});