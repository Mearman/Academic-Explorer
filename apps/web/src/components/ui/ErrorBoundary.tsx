/**
 * Error Boundary Component
 *
 * Provides graceful error handling for React components with
 * user-friendly error messages and recovery options.
 */

import { Alert, Button, Container, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconHome,IconRefresh } from '@tabler/icons-react';
import { Component, ErrorInfo, ReactNode,useCallback  } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorId: string, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  showRetry?: boolean;
  showDetails?: boolean;
  title?: string;
  description?: string;
}

/**
 * Error Boundary component that catches and handles React errors gracefully
 * @param root0
 * @param root0.children
 * @param root0.fallback
 * @param root0.onError
 * @param root0.showRetry
 * @param root0.showDetails
 * @param root0.title
 * @param root0.description
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    // Call error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, this.state.errorId);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', {
        error,
        errorInfo,
        errorId: this.state.errorId,
      });
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorId, this.handleReset);
      }

      // Default error UI
      return (
        <Container size="sm" py="xl">
          <Paper withBorder p="xl" radius="md">
            <Stack align="center" gap="md">
              <IconAlertTriangle size={48} color="red" />

              <Title order={2} c="red" ta="center">
                {this.props.title || 'Something went wrong'}
              </Title>

              <Text c="dimmed" ta="center" size="lg">
                {this.props.description || 'An unexpected error occurred while loading this component.'}
              </Text>

              {this.props.showDetails && process.env.NODE_ENV === 'development' && (
                <Alert
                  variant="light"
                  color="red"
                  title="Error Details"
                  icon={<IconAlertTriangle size={16} />}
                >
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      Error ID: {this.state.errorId}
                    </Text>
                    <Text size="sm" component="pre" style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: '200px',
                      overflow: 'auto'
                    }}>
                      {this.state.error.message}
                    </Text>
                    {this.state.error.stack && (
                      <Text size="sm" component="pre" style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        maxHeight: '200px',
                        overflow: 'auto'
                      }}>
                        {this.state.error.stack}
                      </Text>
                    )}
                  </Stack>
                </Alert>
              )}

              <Group gap="sm">
                {this.props.showRetry && (
                  <Button
                    leftSection={<IconRefresh size={16} />}
                    onClick={this.handleReset}
                    variant="filled"
                  >
                    Try Again
                  </Button>
                )}

                <Button
                  leftSection={<IconHome size={16} />}
                  onClick={this.handleGoHome}
                  variant="light"
                >
                  Go Home
                </Button>
              </Group>

              <Text size="xs" c="dimmed">
                Error ID: {this.state.errorId}
              </Text>
            </Stack>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

/**
 * Error handler utility for functional components to handle errors within their scope
 */
export const createErrorHandler = () => {
  // This could be expanded to integrate with error reporting services
  const reportError = (error: Error, context?: string) => {
    console.error(`Error in ${context || 'component'}:`, error);

    // Here you could add integration with error reporting services
    // like Sentry, LogRocket, etc.
  };

  return { reportError };
};

/**
 * Hook for functional components to handle errors within their scope
 */
export const useErrorHandler = () => {
  const errorHandlers = createErrorHandler();
  const reportError = useCallback(errorHandlers.reportError, []);

  return { reportError };
};

/**
 * Minimal error boundary for inline components
 */
interface InlineErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

const DEFAULT_FALLBACK = <Text c="red" size="sm">Failed to load content</Text>;

export const InlineErrorBoundary = ({
  children,
  fallback = DEFAULT_FALLBACK,
  onError,
}: InlineErrorBoundaryProps) => {
  return (
    <ErrorBoundary
      fallback={(error, errorId, reset) => (
        <Alert
          variant="light"
          color="red"
          title="Component Error"
          icon={<IconAlertTriangle size={14} />}
        >
          <Stack gap="xs">
            <Text size="sm">{fallback}</Text>
            <Button size="compact" onClick={reset}>
              Retry
            </Button>
          </Stack>
        </Alert>
      )}
      onError={onError ? (error, _errorInfo, _errorId) => onError(error) : undefined}
      showRetry={true}
      showDetails={false}
      title=""
      description=""
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * Error boundary specifically for async components
 * @param root0
 * @param root0.children
 */
export const AsyncErrorBoundary = ({
  children,
  ...props
}: Omit<ErrorBoundaryProps, 'title' | 'description'>) => {
  return (
    <ErrorBoundary
      {...props}
      title="Loading Failed"
      description="The component failed to load its data. Please try again."
    >
      {children}
    </ErrorBoundary>
  );
};

// No default export - use named exports from the class declaration above