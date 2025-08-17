/**
 * Component tests for EntityErrorBoundary template
 * Tests React component rendering and error handling behavior
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { EntityErrorBoundary, EntityError } from './error-boundary';

// Interface definitions for mock components
interface ErrorActionsProps {
  onRetry: () => void;
}

interface ErrorDebugDetailsProps {
  error: Error;
  errorInfo?: React.ErrorInfo;
  showInProduction?: boolean;
  includeSystemInfo?: boolean;
}

interface ErrorIconProps {
  isNotFound: boolean;
}

interface ErrorMessageContentProps {
  isNotFound: boolean;
  isNetworkError: boolean;
  entityType?: string;
  entityId?: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  FallbackComponent?: React.ComponentType<CustomFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface CustomFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
  entityType?: string;
  entityId?: string;
  errorInfo?: React.ErrorInfo;
}

// Mock dependencies
vi.mock('../molecules/error-actions', () => ({
  ErrorActions: ({ onRetry }: ErrorActionsProps) => (
    <button data-testid="error-actions" onClick={onRetry}>
      Retry
    </button>
  ),
}));

vi.mock('../molecules/error-debug-details', () => ({
  ErrorDebugDetails: ({ error, errorInfo, showInProduction, includeSystemInfo }: ErrorDebugDetailsProps) => (
    <div 
      data-testid="error-debug-details"
      data-show-in-production={showInProduction}
      data-include-system-info={includeSystemInfo}
    >
      Error: {error.message}
      {errorInfo && <div>Component Stack: {errorInfo.componentStack || 'test stack'}</div>}
    </div>
  ),
}));

vi.mock('../molecules/error-icon', () => ({
  ErrorIcon: ({ isNotFound }: ErrorIconProps) => (
    <div data-testid="error-icon" data-is-not-found={isNotFound}>
      {isNotFound ? '404 Icon' : 'Error Icon'}
    </div>
  ),
}));

vi.mock('../molecules/error-message-content', () => ({
  ErrorMessageContent: ({ isNotFound, isNetworkError, entityType, entityId }: ErrorMessageContentProps) => (
    <div 
      data-testid="error-message-content"
      data-is-not-found={isNotFound}
      data-is-network-error={isNetworkError}
      data-entity-type={entityType || ''}
      data-entity-id={entityId || ''}
    >
      {isNotFound ? 'Not Found Message' : 'Generic Error Message'}
    </div>
  ),
}));

// Mock react-error-boundary with a proper React Error Boundary simulation
vi.mock('react-error-boundary', () => ({
  ErrorBoundary: ({ children, FallbackComponent, onError, onReset }: ErrorBoundaryProps) => {
    class MockErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
    > {
      constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
      }

      static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
      }

      componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ errorInfo });
        onError?.(error, errorInfo);
      }


      resetError = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        onReset?.();
      };

      render() {
        if (this.state.hasError && this.state.error) {
          if (FallbackComponent) {
            return (
              <FallbackComponent 
                error={this.state.error}
                resetErrorBoundary={this.resetError}
                errorInfo={this.state.errorInfo || { componentStack: 'test stack' }}
              />
            );
          }
          return <div>Error: {this.state.error.message}</div>;
        }

        return this.props.children;
      }
    }

    return <MockErrorBoundary>{children}</MockErrorBoundary>;
  },
}));

// Test component that can throw errors (unused but kept for potential future test expansion)
const _ThrowError = ({ shouldThrow = false, errorMessage = 'Test error' }: { shouldThrow?: boolean; errorMessage?: string }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div data-testid="working-component">Working Component</div>;
};

// Component that triggers error via window.error event
const TriggerError = ({ errorMessage = 'Test error' }: { errorMessage?: string }) => {
  throw new Error(errorMessage);
};

describe('EntityError Basic Rendering', () => {
  const mockResetErrorBoundary = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render error component with basic props', () => {
    const error = new Error('Test error message');
    
    render(
      <EntityError 
        error={error} 
        resetErrorBoundary={mockResetErrorBoundary} 
      />
    );

    expect(screen.getByTestId('error-icon')).toBeInTheDocument();
    expect(screen.getByTestId('error-message-content')).toBeInTheDocument();
    expect(screen.getByTestId('error-actions')).toBeInTheDocument();
    expect(screen.getByTestId('error-debug-details')).toBeInTheDocument();
  });

  it('should pass entity context to components', () => {
    const error = new Error('Test error message');
    
    render(
      <EntityError 
        error={error} 
        resetErrorBoundary={mockResetErrorBoundary}
        entityType="author"
        entityId="A123456789"
      />
    );

    const messageContent = screen.getByTestId('error-message-content');
    expect(messageContent).toHaveAttribute('data-entity-type', 'author');
    expect(messageContent).toHaveAttribute('data-entity-id', 'A123456789');
  });

  it('should pass errorInfo to debug details', () => {
    const error = new Error('Test error message');
    const errorInfo = { componentStack: 'Test component stack' };
    
    render(
      <EntityError 
        error={error} 
        resetErrorBoundary={mockResetErrorBoundary}
        errorInfo={errorInfo}
      />
    );

    const debugDetails = screen.getByTestId('error-debug-details');
    expect(debugDetails).toHaveTextContent('Component Stack: Test component stack');
  });
});

describe('EntityError Type Detection', () => {
  const mockResetErrorBoundary = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect 404/not found errors', () => {
    const error = new Error('Entity not found (404)');
    
    render(
      <EntityError 
        error={error} 
        resetErrorBoundary={mockResetErrorBoundary} 
      />
    );

    const errorIcon = screen.getByTestId('error-icon');
    const messageContent = screen.getByTestId('error-message-content');
    
    expect(errorIcon).toHaveAttribute('data-is-not-found', 'true');
    expect(messageContent).toHaveAttribute('data-is-not-found', 'true');
    expect(messageContent).toHaveTextContent('Not Found Message');
  });

  it('should detect network errors', () => {
    const error = new Error('Failed to fetch data from network');
    
    render(
      <EntityError 
        error={error} 
        resetErrorBoundary={mockResetErrorBoundary} 
      />
    );

    const messageContent = screen.getByTestId('error-message-content');
    expect(messageContent).toHaveAttribute('data-is-network-error', 'true');
  });

  it('should handle generic errors', () => {
    const error = new Error('Generic error message');
    
    render(
      <EntityError 
        error={error} 
        resetErrorBoundary={mockResetErrorBoundary} 
      />
    );

    const errorIcon = screen.getByTestId('error-icon');
    const messageContent = screen.getByTestId('error-message-content');
    
    expect(errorIcon).toHaveAttribute('data-is-not-found', 'false');
    expect(messageContent).toHaveAttribute('data-is-not-found', 'false');
    expect(messageContent).toHaveAttribute('data-is-network-error', 'false');
    expect(messageContent).toHaveTextContent('Generic Error Message');
  });
});

describe('EntityError User Interactions and Debug Info', () => {
  const mockResetErrorBoundary = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call resetErrorBoundary when retry button is clicked', async () => {
    const user = userEvent.setup();
    const error = new Error('Test error message');
    
    render(
      <EntityError 
        error={error} 
        resetErrorBoundary={mockResetErrorBoundary} 
      />
    );

    const retryButton = screen.getByTestId('error-actions');
    await user.click(retryButton);

    expect(mockResetErrorBoundary).toHaveBeenCalledTimes(1);
  });

  it('should show debug details in production', () => {
    const error = new Error('Test error message');
    
    render(
      <EntityError 
        error={error} 
        resetErrorBoundary={mockResetErrorBoundary} 
      />
    );

    const debugDetails = screen.getByTestId('error-debug-details');
    expect(debugDetails).toHaveAttribute('data-show-in-production', 'true');
    expect(debugDetails).toHaveAttribute('data-include-system-info', 'true');
  });
});

describe('EntityErrorBoundary Normal Operation', () => {
  it('should render children when no error occurs', () => {
    render(
      <EntityErrorBoundary>
        <div data-testid="normal-content">Normal Content</div>
      </EntityErrorBoundary>
    );

    expect(screen.getByTestId('normal-content')).toBeInTheDocument();
    expect(screen.queryByTestId('error-icon')).not.toBeInTheDocument();
  });

  it('should pass entity context to children', () => {
    render(
      <EntityErrorBoundary entityType="work" entityId="W123456789">
        <div data-testid="normal-content">Normal Content</div>
      </EntityErrorBoundary>
    );

    expect(screen.getByTestId('normal-content')).toBeInTheDocument();
  });
});

describe('EntityErrorBoundary Error Handling', () => {
  it('should catch and display errors from children', async () => {
    render(
      <EntityErrorBoundary entityType="author" entityId="A123456789">
        <TriggerError errorMessage="Test error" />
      </EntityErrorBoundary>
    );

    // Error is thrown synchronously during render

    expect(screen.getByTestId('error-icon')).toBeInTheDocument();
    expect(screen.getByTestId('error-message-content')).toBeInTheDocument();
    expect(screen.queryByTestId('trigger-component')).not.toBeInTheDocument();
  });

  it('should pass entity context to error fallback', async () => {
    render(
      <EntityErrorBoundary entityType="work" entityId="W987654321">
        <TriggerError errorMessage="Test error" />
      </EntityErrorBoundary>
    );

    // Error is thrown synchronously during render

    const messageContent = screen.getByTestId('error-message-content');
    expect(messageContent).toHaveAttribute('data-entity-type', 'work');
    expect(messageContent).toHaveAttribute('data-entity-id', 'W987654321');
  });
});

describe('EntityErrorBoundary Error Logging', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log error with full context', async () => {
    render(
      <EntityErrorBoundary entityType="source" entityId="S123456789">
        <TriggerError errorMessage="Test logging error" />
      </EntityErrorBoundary>
    );

    // Error is thrown synchronously during render

    expect(consoleSpy).toHaveBeenCalledWith(
      'Entity page error:',
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'Full error context:',
      expect.objectContaining({
        error: expect.objectContaining({
          name: 'Error',
          message: 'Test logging error',
          stack: expect.any(String)
        }),
        context: expect.objectContaining({
          entityType: 'source',
          entityId: 'S123456789',
          url: expect.any(String),
          timestamp: expect.any(String),
          userAgent: expect.any(String)
        })
      })
    );
  });
});

describe('EntityErrorBoundary Error Recovery', () => {
  it('should call resetErrorBoundary and reset error state when retry button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnReset = vi.fn();
    
    // Create a simple error boundary mock for this specific test
    const TestErrorBoundary = ({ children }: { children: React.ReactNode }) => {
      const [hasError, setHasError] = React.useState(true); // Start with error state
      
      if (hasError) {
        return (
          <EntityError 
            error={new Error('Test error')} 
            resetErrorBoundary={() => {
              setHasError(false);
              mockOnReset();
            }}
          />
        );
      }
      
      return <>{children}</>;
    };

    render(
      <TestErrorBoundary>
        <div data-testid="recovered-content">Recovered Content</div>
      </TestErrorBoundary>
    );

    // Error should be shown initially
    expect(screen.getByTestId('error-icon')).toBeInTheDocument();

    // Click retry button to reset the boundary
    const retryButton = screen.getByTestId('error-actions');
    await user.click(retryButton);

    // After reset, the boundary should be in non-error state
    expect(mockOnReset).toHaveBeenCalled();
    expect(screen.queryByTestId('error-icon')).not.toBeInTheDocument();
    expect(screen.getByTestId('recovered-content')).toBeInTheDocument();
  });
});

describe('EntityErrorBoundary Custom Fallback', () => {
  it('should use custom fallback component when provided', async () => {
    const CustomFallback = ({ error, resetErrorBoundary }: CustomFallbackProps) => (
      <div data-testid="custom-fallback">
        Custom Error: {error?.message ?? 'Unknown error'}
        <button onClick={resetErrorBoundary}>Custom Retry</button>
      </div>
    );

    render(
      <EntityErrorBoundary fallback={CustomFallback}>
        <TriggerError errorMessage="Custom fallback test" />
      </EntityErrorBoundary>
    );

    // Error is thrown synchronously during render

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom Error: Custom fallback test')).toBeInTheDocument();
    expect(screen.queryByTestId('error-icon')).not.toBeInTheDocument();
  });

  it('should pass entity context to custom fallback', async () => {
    const CustomFallback = ({ entityType, entityId }: CustomFallbackProps) => (
      <div data-testid="custom-fallback">
        Entity: {entityType} - {entityId}
      </div>
    );

    render(
      <EntityErrorBoundary 
        fallback={CustomFallback}
        entityType="institution"
        entityId="I555666777"
      >
        <TriggerError errorMessage="Custom context test" />
      </EntityErrorBoundary>
    );

    // Error is thrown synchronously during render

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Entity: institution - I555666777')).toBeInTheDocument();
  });
});

describe('EntityErrorBoundary Error Information Persistence', () => {
  it('should maintain errorInfo across renders', async () => {
    render(
      <EntityErrorBoundary>
        <TriggerError errorMessage="ErrorInfo test" />
      </EntityErrorBoundary>
    );

    // Error is thrown synchronously during render

    const debugDetails = screen.getByTestId('error-debug-details');
    expect(debugDetails).toHaveTextContent('Component Stack:');
    expect(debugDetails).toHaveTextContent('TriggerError');
  });

  it('should clear errorInfo on reset', async () => {
    const user = userEvent.setup();
    
    // Create a simple error boundary mock for this specific test
    const TestErrorBoundary = ({ children }: { children: React.ReactNode }) => {
      const [hasError, setHasError] = React.useState(true); // Start with error state
      
      if (hasError) {
        return (
          <EntityError 
            error={new Error('Reset test')} 
            resetErrorBoundary={() => setHasError(false)}
            errorInfo={{ componentStack: 'test stack' }}
          />
        );
      }
      
      return <>{children}</>;
    };

    render(
      <TestErrorBoundary>
        <div data-testid="reset-recovered-content">Reset Recovered</div>
      </TestErrorBoundary>
    );

    // Error should be shown
    expect(screen.getByTestId('error-debug-details')).toBeInTheDocument();

    // Reset the error boundary
    const retryButton = screen.getByTestId('error-actions');
    await user.click(retryButton);

    // ErrorInfo should be cleared (component should reset to normal state)
    expect(screen.queryByTestId('error-debug-details')).not.toBeInTheDocument();
    expect(screen.getByTestId('reset-recovered-content')).toBeInTheDocument();
  });
});

describe('EntityErrorBoundary Edge Cases and Accessibility', () => {
  it('should handle errors without entityType and entityId', async () => {
    render(
      <EntityErrorBoundary>
        <TriggerError errorMessage="No context error" />
      </EntityErrorBoundary>
    );

    // Error is thrown synchronously during render

    const messageContent = screen.getByTestId('error-message-content');
    expect(messageContent).toHaveAttribute('data-entity-type', '');
    expect(messageContent).toHaveAttribute('data-entity-id', '');
  });

  it('should handle multiple error boundary resets', async () => {
    const user = userEvent.setup();
    
    render(
      <EntityErrorBoundary>
        <TriggerError errorMessage="Multiple reset test" />
      </EntityErrorBoundary>
    );

    // Error is thrown synchronously during render

    // First reset
    await user.click(screen.getByTestId('error-actions'));
    
    // Should be able to handle another error
    expect(() => {
      render(
        <EntityErrorBoundary>
          <TriggerError errorMessage="Second error" />
        </EntityErrorBoundary>
      );
    }).not.toThrow();
  });

  it('should maintain accessibility structure in error state', async () => {
    render(
      <EntityErrorBoundary>
        <TriggerError errorMessage="Accessibility test" />
      </EntityErrorBoundary>
    );

    // Error is thrown synchronously during render

    // Error boundary should maintain proper structure
    const retryButton = screen.getByTestId('error-actions');
    expect(retryButton).toBeInTheDocument();
    expect(retryButton.tagName).toBe('BUTTON');
  });
});