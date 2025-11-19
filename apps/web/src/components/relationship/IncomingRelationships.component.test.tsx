/**
 * IncomingRelationships Component Tests
 * Tests for incoming relationship display with error handling and retry functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { IncomingRelationships } from './IncomingRelationships';
import type { UseEntityRelationshipsResult } from '@/hooks/use-entity-relationships';
import { RelationshipErrorCode } from '@/types/relationship';

// Mock the useEntityRelationships hook
vi.mock('@/hooks/use-entity-relationships', () => ({
  useEntityRelationships: vi.fn(),
}));

// Import after mocking
import { useEntityRelationships } from '@/hooks/use-entity-relationships';

// Helper to render with Mantine provider
const renderWithProvider = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('IncomingRelationships', () => {
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
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Error State with Retry', () => {
    it('should render error message when error occurs', () => {
      // Mock hook to return error state
      vi.mocked(useEntityRelationships).mockReturnValue({
        incoming: [],
        outgoing: [],
        incomingCount: 0,
        outgoingCount: 0,
        loading: false,
        error: {
          message: 'Failed to load graph data',
          code: RelationshipErrorCode.GRAPH_LOAD_FAILED,
          retryable: true,
          timestamp: new Date(),
        },
      });

      renderWithProvider(<IncomingRelationships entityId={mockEntityId} entityType={mockEntityType} />);

      expect(screen.getByTestId('incoming-relationships-error')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load relationships: Failed to load graph data/i)).toBeInTheDocument();
    });

    it('should render retry button when error is retryable', () => {
      vi.mocked(useEntityRelationships).mockReturnValue({
        incoming: [],
        outgoing: [],
        incomingCount: 0,
        outgoingCount: 0,
        loading: false,
        error: {
          message: 'Network error',
          code: RelationshipErrorCode.GRAPH_LOAD_FAILED,
          retryable: true,
          timestamp: new Date(),
        },
      });

      renderWithProvider(<IncomingRelationships entityId={mockEntityId} entityType={mockEntityType} />);

      const retryButton = screen.getByTestId('incoming-relationships-retry-button');
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveTextContent('Retry');
    });

    it('should not render retry button when error is not retryable', () => {
      vi.mocked(useEntityRelationships).mockReturnValue({
        incoming: [],
        outgoing: [],
        incomingCount: 0,
        outgoingCount: 0,
        loading: false,
        error: {
          message: 'Permanent error',
          code: RelationshipErrorCode.GRAPH_LOAD_FAILED,
          retryable: false,
          timestamp: new Date(),
        },
      });

      renderWithProvider(<IncomingRelationships entityId={mockEntityId} entityType={mockEntityType} />);

      expect(screen.getByTestId('incoming-relationships-error')).toBeInTheDocument();
      expect(screen.queryByTestId('incoming-relationships-retry-button')).not.toBeInTheDocument();
    });

    it('should call window.location.reload when retry button is clicked', async () => {
      const user = userEvent.setup();
      const reloadSpy = vi.fn();
      window.location.reload = reloadSpy;

      vi.mocked(useEntityRelationships).mockReturnValue({
        incoming: [],
        outgoing: [],
        incomingCount: 0,
        outgoingCount: 0,
        loading: false,
        error: {
          message: 'Temporary error',
          code: RelationshipErrorCode.GRAPH_LOAD_FAILED,
          retryable: true,
          timestamp: new Date(),
        },
      });

      renderWithProvider(<IncomingRelationships entityId={mockEntityId} entityType={mockEntityType} />);

      const retryButton = screen.getByTestId('incoming-relationships-retry-button');
      await user.click(retryButton);

      await waitFor(() => {
        expect(reloadSpy).toHaveBeenCalledOnce();
      });
    });

    it('should render error with proper styling', () => {
      vi.mocked(useEntityRelationships).mockReturnValue({
        incoming: [],
        outgoing: [],
        incomingCount: 0,
        outgoingCount: 0,
        loading: false,
        error: {
          message: 'Test error',
          code: RelationshipErrorCode.GRAPH_LOAD_FAILED,
          retryable: true,
          timestamp: new Date(),
        },
      });

      renderWithProvider(<IncomingRelationships entityId={mockEntityId} entityType={mockEntityType} />);

      const errorContainer = screen.getByTestId('incoming-relationships-error');
      expect(errorContainer).toHaveClass('mantine-Paper-root');
    });
  });

  describe('Loading State', () => {
    it('should render loading skeleton when loading is true', () => {
      vi.mocked(useEntityRelationships).mockReturnValue({
        incoming: [],
        outgoing: [],
        incomingCount: 0,
        outgoingCount: 0,
        loading: true,
        error: undefined,
      });

      renderWithProvider(<IncomingRelationships entityId={mockEntityId} entityType={mockEntityType} />);

      expect(screen.getByTestId('incoming-relationships-loading')).toBeInTheDocument();
      expect(screen.getByText('Incoming Relationships')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render nothing when no incoming relationships and no error', () => {
      vi.mocked(useEntityRelationships).mockReturnValue({
        incoming: [],
        outgoing: [],
        incomingCount: 0,
        outgoingCount: 0,
        loading: false,
        error: undefined,
      });

      renderWithProvider(<IncomingRelationships entityId={mockEntityId} entityType={mockEntityType} />);

      // Component should not render its sections when there are no relationships
      expect(screen.queryByTestId('incoming-relationships')).not.toBeInTheDocument();
      expect(screen.queryByTestId('incoming-relationships-error')).not.toBeInTheDocument();
      expect(screen.queryByTestId('incoming-relationships-loading')).not.toBeInTheDocument();
    });
  });
});
