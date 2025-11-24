/**
 * OutgoingRelationships Component Tests
 * Tests for outgoing relationship display with error handling and retry functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OutgoingRelationships } from './OutgoingRelationships';
import { RelationshipErrorCode } from '@/types/relationship';

// Mock the hooks
vi.mock('@/hooks/use-entity-relationship-queries', () => ({
  useEntityRelationshipQueries: vi.fn(),
}));

vi.mock('@/hooks/use-entity-relationships-from-data', () => ({
  useEntityRelationshipsFromData: vi.fn(),
}));

// Import after mocking
import { useEntityRelationshipQueries } from '@/hooks/use-entity-relationship-queries';
import { useEntityRelationshipsFromData } from '@/hooks/use-entity-relationships-from-data';

// Helper to render with providers
const renderWithProvider = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>{component}</MantineProvider>
    </QueryClientProvider>
  );
};

describe('OutgoingRelationships', () => {
  const mockEntityId = 'W123456789';
  const mockEntityType = 'works';

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Reset window.location.reload mock
    Object.defineProperty(window, 'location', {
      value: { reload: vi.fn() },
      writable: true,
      configurable: true,
    });

    // Set default mock return values for the additional hooks
    vi.mocked(useEntityRelationshipQueries).mockReturnValue({
      incoming: [],
      outgoing: [],
      incomingCount: 0,
      outgoingCount: 0,
      loading: false,
      error: undefined,
    });

    vi.mocked(useEntityRelationshipsFromData).mockReturnValue({
      incoming: [],
      outgoing: [],
      incomingCount: 0,
      outgoingCount: 0,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Error State with Retry', () => {
    it('should render error message when error occurs', () => {
      // Mock hook to return error state
      vi.mocked(useEntityRelationshipQueries).mockReturnValue({
        incoming: [],
        outgoing: [],
        incomingCount: 0,
        outgoingCount: 0,
        loading: false,
        error: new Error('Network error occurred'),
      });

      renderWithProvider(<OutgoingRelationships entityId={mockEntityId} entityType={mockEntityType} />);

      expect(screen.getByTestId('outgoing-relationships-error')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load relationships: Network error occurred/i)).toBeInTheDocument();
    });

    it('should render retry button when error occurs', () => {
      vi.mocked(useEntityRelationshipQueries).mockReturnValue({
        incoming: [],
        outgoing: [],
        incomingCount: 0,
        outgoingCount: 0,
        loading: false,
        error: new Error('Network error occurred'),
      });

      renderWithProvider(<OutgoingRelationships entityId={mockEntityId} entityType={mockEntityType} />);

      const retryButton = screen.getByTestId('outgoing-relationships-retry-button');
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveTextContent('Retry');
    });
  });

  describe('Loading State', () => {
    it('should render loading skeleton when loading is true', () => {
      vi.mocked(useEntityRelationshipQueries).mockReturnValue({
        incoming: [],
        outgoing: [],
        incomingCount: 0,
        outgoingCount: 0,
        loading: true,
        error: undefined,
      });

      renderWithProvider(<OutgoingRelationships entityId={mockEntityId} entityType={mockEntityType} />);

      expect(screen.getByTestId('outgoing-relationships-loading')).toBeInTheDocument();
      expect(screen.getByText('Outgoing Relationships')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render nothing when no outgoing relationships and no error', () => {
      vi.mocked(useEntityRelationshipQueries).mockReturnValue({
        incoming: [],
        outgoing: [],
        incomingCount: 0,
        outgoingCount: 0,
        loading: false,
        error: undefined,
      });

      renderWithProvider(<OutgoingRelationships entityId={mockEntityId} entityType={mockEntityType} />);

      // Component should not render its sections when there are no relationships
      expect(screen.queryByTestId('outgoing-relationships')).not.toBeInTheDocument();
      expect(screen.queryByTestId('outgoing-relationships-error')).not.toBeInTheDocument();
      expect(screen.queryByTestId('outgoing-relationships-loading')).not.toBeInTheDocument();
    });
  });
});
