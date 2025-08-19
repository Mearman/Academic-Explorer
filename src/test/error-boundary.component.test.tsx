/**
 * Component tests for error boundary system
 * Tests error boundary behaviour, recovery, and user feedback
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createRouter, createRootRoute, createMemoryHistory, RouterProvider } from '@tanstack/react-router';

import { EntityErrorBoundary, EntityError } from '@/components/templates/error-boundary';
import type { EntityErrorProps } from '@/components/templates/error-boundary';

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const rootRoute = createRootRoute({
    component: () => children as React.ReactElement,
  });

  const history = createMemoryHistory({
    initialEntries: ['/'],
  });

  const router = createRouter({
    routeTree: rootRoute,
    history,
  });

  return <RouterProvider router={router} />;
}

// Mock the child components
vi.mock('@/components/molecules/error-actions', () => ({
  ErrorActions: ({ onRetry }: { onRetry: () => void }) => (
    <div data-testid="error-actions">
      <button onClick={onRetry} data-testid="retry-button">
        Try Again
      </button>
      <button data-testid="back-button">Go Back</button>
      <button data-testid="home-button">Home</button>
    </div>
  ),
}));

vi.mock('@/components/molecules/error-debug-details', () => ({
  ErrorDebugDetails: ({ 
    error, 
    errorInfo,
    showInProduction,
    includeSystemInfo,
  }: {
    error: Error;
    errorInfo?: React.ErrorInfo;
    showInProduction: boolean;
    includeSystemInfo: boolean;
  }) => (
    <div data-testid="error-debug-details">
      <div data-testid="error-message">{error.message}</div>
      <div data-testid="error-stack">{error.stack}</div>
      {errorInfo && (
        <div data-testid="error-info">{errorInfo.componentStack}</div>
      )}
      <div data-testid="show-in-production">{showInProduction.toString()}</div>
      <div data-testid="include-system-info">{includeSystemInfo.toString()}</div>
    </div>
  ),
}));

vi.mock('@/components/molecules/error-icon', () => ({
  ErrorIcon: ({ isNotFound }: { isNotFound: boolean }) => (
    <div data-testid="error-icon" data-not-found={isNotFound} />
  ),
}));

vi.mock('@/components/molecules/error-message-content', () => ({
  ErrorMessageContent: ({ 
    isNotFound, 
    isNetworkError, 
    entityType, 
    entityId 
  }: {
    isNotFound: boolean;
    isNetworkError: boolean;
    entityType?: string;
    entityId?: string;
  }) => (
    <div data-testid="error-message-content">
      <div data-testid="is-not-found">{isNotFound.toString()}</div>
      <div data-testid="is-network-error">{isNetworkError.toString()}</div>
      <div data-testid="entity-type">{entityType || 'undefined'}</div>
      <div data-testid="entity-id">{entityId || 'undefined'}</div>
    </div>
  ),
}));

// Test component that throws errors
function ThrowingComponent({ shouldThrow = false, errorMessage = 'Test error' }) {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div data-testid="working-component">Component is working</div>;
}

describe('EntityError Component', () => {
  const mockResetErrorBoundary = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Type Detection', () => {
    it('should detect 404 not found errors', () => {
      const error = new Error('404 - Entity not found');
      
      render(
        <TestWrapper>
          <EntityError 
            error={error} 
            resetErrorBoundary={mockResetErrorBoundary}
            entityType="works"
            entityId="W123456789"
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('is-not-found')).toHaveTextContent('true');
      expect(screen.getByTestId('is-network-error')).toHaveTextContent('false');
      expect(screen.getByTestId('entity-type')).toHaveTextContent('works');
      expect(screen.getByTestId('entity-id')).toHaveTextContent('W123456789');
    });

    it('should detect network errors', () => {
      const error = new Error('Failed to fetch from network');
      
      render(
        <TestWrapper>
          <EntityError 
            error={error} 
            resetErrorBoundary={mockResetErrorBoundary}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('is-not-found')).toHaveTextContent('false');
      expect(screen.getByTestId('is-network-error')).toHaveTextContent('true');
    });

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong');
      
      render(
        <TestWrapper>
          <EntityError 
            error={error} 
            resetErrorBoundary={mockResetErrorBoundary}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('is-not-found')).toHaveTextContent('false');
      expect(screen.getByTestId('is-network-error')).toHaveTextContent('false');
    });
  });

  describe('Error Information Display', () => {
    it('should display error message and stack trace', () => {
      const error = new Error('Test error message');
      error.stack = 'Error: Test error message\n    at TestComponent';
      
      const errorInfo: React.ErrorInfo = {
        componentStack: '\n    in TestComponent\n    in ErrorBoundary',
      };

      render(
        <TestWrapper>
          <EntityError 
            error={error} 
            resetErrorBoundary={mockResetErrorBoundary}
            errorInfo={errorInfo}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('error-message')).toHaveTextContent('Test error message');
      expect(screen.getByTestId('error-stack')).toHaveTextContent('Error: Test error message');
      expect(screen.getByTestId('error-info')).toHaveTextContent('in TestComponent');
    });

    it('should enable production debug details', () => {
      const error = new Error('Production error');
      
      render(
        <TestWrapper>
          <EntityError 
            error={error} 
            resetErrorBoundary={mockResetErrorBoundary}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('show-in-production')).toHaveTextContent('true');
      expect(screen.getByTestId('include-system-info')).toHaveTextContent('true');
    });
  });

  describe('User Actions', () => {
    it('should call resetErrorBoundary when retry button is clicked', () => {
      const error = new Error('Test error');
      
      render(
        <TestWrapper>
          <EntityError 
            error={error} 
            resetErrorBoundary={mockResetErrorBoundary}
          />
        </TestWrapper>
      );

      const retryButton = screen.getByTestId('retry-button');
      fireEvent.click(retryButton);

      expect(mockResetErrorBoundary).toHaveBeenCalledTimes(1);
    });

    it('should render all action buttons', () => {
      const error = new Error('Test error');
      
      render(
        <TestWrapper>
          <EntityError 
            error={error} 
            resetErrorBoundary={mockResetErrorBoundary}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
      expect(screen.getByTestId('back-button')).toBeInTheDocument();
      expect(screen.getByTestId('home-button')).toBeInTheDocument();
    });
  });

  describe('Icon Display', () => {
    it('should show correct icon for not found errors', () => {
      const error = new Error('404 not found');
      
      render(
        <TestWrapper>
          <EntityError 
            error={error} 
            resetErrorBoundary={mockResetErrorBoundary}
          />
        </TestWrapper>
      );

      const icon = screen.getByTestId('error-icon');
      expect(icon).toHaveAttribute('data-not-found', 'true');
    });

    it('should show correct icon for other errors', () => {
      const error = new Error('General error');
      
      render(
        <TestWrapper>
          <EntityError 
            error={error} 
            resetErrorBoundary={mockResetErrorBoundary}
          />
        </TestWrapper>
      );

      const icon = screen.getByTestId('error-icon');
      expect(icon).toHaveAttribute('data-not-found', 'false');
    });
  });
});

describe('EntityErrorBoundary Component', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy.mockClear();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Error Catching', () => {
    it('should catch and display errors from child components', async () => {
      render(
        <TestWrapper>
          <EntityErrorBoundary entityType="works" entityId="W123">
            <ThrowingComponent shouldThrow={true} errorMessage="Component crashed" />
          </EntityErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-message-content')).toBeInTheDocument();
      });

      expect(screen.getByTestId('entity-type')).toHaveTextContent('works');
      expect(screen.getByTestId('entity-id')).toHaveTextContent('W123');
      expect(screen.getByTestId('error-message')).toHaveTextContent('Component crashed');
    });

    it('should render children when no errors occur', () => {
      render(
        <TestWrapper>
          <EntityErrorBoundary>
            <ThrowingComponent shouldThrow={false} />
          </EntityErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
      expect(screen.getByTestId('working-component')).toHaveTextContent('Component is working');
    });
  });

  describe('Error Logging', () => {
    it('should log comprehensive error information', async () => {
      render(
        <TestWrapper>
          <EntityErrorBoundary entityType="authors" entityId="A123456">
            <ThrowingComponent shouldThrow={true} errorMessage="Detailed error" />
          </EntityErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Entity page error:',
          expect.any(Error),
          expect.any(Object)
        );
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Full error context:',
        expect.objectContaining({
          error: expect.objectContaining({
            name: 'Error',
            message: 'Detailed error',
            stack: expect.any(String),
          }),
          context: expect.objectContaining({
            entityType: 'authors',
            entityId: 'A123456',
            url: expect.any(String),
            timestamp: expect.any(String),
            userAgent: expect.any(String),
          }),
        })
      );
    });

    it('should include errorInfo in logs', async () => {
      render(
        <TestWrapper>
          <EntityErrorBoundary>
            <ThrowingComponent shouldThrow={true} />
          </EntityErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Full error context:',
          expect.objectContaining({
            errorInfo: expect.objectContaining({
              componentStack: expect.any(String),
            }),
          })
        );
      });
    });
  });

  describe('Error Recovery', () => {
    it('should reset error state when boundary is reset', async () => {
      const { rerender } = render(
        <TestWrapper>
          <EntityErrorBoundary>
            <ThrowingComponent shouldThrow={true} />
          </EntityErrorBoundary>
        </TestWrapper>
      );

      // Wait for error to be caught
      await waitFor(() => {
        expect(screen.getByTestId('error-message-content')).toBeInTheDocument();
      });

      // Simulate reset by rerendering with working component
      rerender(
        <TestWrapper>
          <EntityErrorBoundary>
            <ThrowingComponent shouldThrow={false} />
          </EntityErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });

    it('should allow retry functionality', async () => {
      let shouldThrow = true;
      
      const TestWrapperComponent = () => (
        <TestWrapper>
          <EntityErrorBoundary>
            <ThrowingComponent shouldThrow={shouldThrow} />
          </EntityErrorBoundary>
        </TestWrapper>
      );

      const { rerender } = render(<TestWrapperComponent />);

      // Wait for error to be caught
      await waitFor(() => {
        expect(screen.getByTestId('retry-button')).toBeInTheDocument();
      });

      // Simulate fixing the issue
      shouldThrow = false;
      
      // Click retry button
      fireEvent.click(screen.getByTestId('retry-button'));

      // Rerender to simulate component reset
      rerender(<TestWrapperComponent />);

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });

  describe('Custom Fallback Components', () => {
    it('should use custom fallback component when provided', async () => {
      const CustomFallback = ({ error, resetErrorBoundary }: EntityErrorProps) => (
        <div data-testid="custom-fallback">
          <div data-testid="custom-error-message">{error.message}</div>
          <button onClick={resetErrorBoundary} data-testid="custom-retry">
            Custom Retry
          </button>
        </div>
      );

      render(
        <TestWrapper>
          <EntityErrorBoundary fallback={CustomFallback}>
            <ThrowingComponent shouldThrow={true} errorMessage="Custom error" />
          </EntityErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      });

      expect(screen.getByTestId('custom-error-message')).toHaveTextContent('Custom error');
      expect(screen.getByTestId('custom-retry')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors without entity information', async () => {
      render(
        <TestWrapper>
          <EntityErrorBoundary>
            <ThrowingComponent shouldThrow={true} />
          </EntityErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-message-content')).toBeInTheDocument();
      });

      expect(screen.getByTestId('entity-type')).toHaveTextContent('undefined');
      expect(screen.getByTestId('entity-id')).toHaveTextContent('undefined');
    });

    it('should handle multiple consecutive errors', async () => {
      const { rerender } = render(
        <TestWrapper>
          <EntityErrorBoundary>
            <ThrowingComponent shouldThrow={true} errorMessage="First error" />
          </EntityErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('First error');
      });

      rerender(
        <TestWrapper>
          <EntityErrorBoundary>
            <ThrowingComponent shouldThrow={true} errorMessage="Second error" />
          </EntityErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Second error');
      });
    });

    it('should handle errors with no message', async () => {
      render(
        <TestWrapper>
          <EntityErrorBoundary>
            <ThrowingComponent shouldThrow={true} errorMessage="" />
          </EntityErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-message-content')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent('');
    });
  });

  describe('Performance', () => {
    it('should not re-render children unnecessarily', () => {
      let renderCount = 0;
      
      const CountingComponent = () => {
        renderCount++;
        return <div data-testid="counting-component">Render count: {renderCount}</div>;
      };

      const { rerender } = render(
        <TestWrapper>
          <EntityErrorBoundary entityType="test">
            <CountingComponent />
          </EntityErrorBoundary>
        </TestWrapper>
      );

      expect(renderCount).toBe(1);

      // Rerender with same props - should not re-render children
      rerender(
        <TestWrapper>
          <EntityErrorBoundary entityType="test">
            <CountingComponent />
          </EntityErrorBoundary>
        </TestWrapper>
      );

      expect(renderCount).toBe(1);
    });
  });
});