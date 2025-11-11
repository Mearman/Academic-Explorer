/**
 * T078: Error boundary for catalogue components
 * Catches errors in catalogue UI and provides user-friendly fallback
 */

import React, { Component, ReactNode } from "react";
import {
  Alert,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Code,
} from "@mantine/core";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import { logger } from "@/lib/logger";

interface CatalogueErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback component to render on error */
  fallback?: ReactNode;
}

interface CatalogueErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error boundary component for catalogue features
 * Provides graceful error handling with recovery options
 */
export class CatalogueErrorBoundary extends Component<
  CatalogueErrorBoundaryProps,
  CatalogueErrorBoundaryState
> {
  constructor(props: CatalogueErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<CatalogueErrorBoundaryState> {
    // Update state so next render shows fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details for debugging
    logger.error("catalogue-error-boundary", "Component error caught", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    // Reset error boundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    logger.debug("catalogue-error-boundary", "Error boundary reset");
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <Card withBorder p="xl" bg="red.0">
          <Stack gap="md">
            <Group>
              <IconAlertTriangle size={32} color="var(--mantine-color-red-6)" />
              <div>
                <Text size="lg" fw={600} c="red">
                  Catalogue Error
                </Text>
                <Text size="sm" c="dimmed">
                  Something went wrong while loading the catalogue
                </Text>
              </div>
            </Group>

            <Alert color="red" variant="light">
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  Error Details:
                </Text>
                <Code block color="red">
                  {error?.message || "Unknown error occurred"}
                </Code>
              </Stack>
            </Alert>

            {process.env.NODE_ENV === "development" && errorInfo && (
              <Alert color="yellow" variant="light">
                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    Component Stack (Development Only):
                  </Text>
                  <Code block color="yellow" style={{ maxHeight: "200px", overflow: "auto" }}>
                    {errorInfo.componentStack}
                  </Code>
                </Stack>
              </Alert>
            )}

            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                This error has been logged. Please try reloading the page or resetting the catalogue.
              </Text>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={this.handleReset}
                color="red"
                variant="light"
              >
                Reset Catalogue
              </Button>
            </Group>

            <Group>
              <Button
                variant="subtle"
                onClick={() => window.location.reload()}
                size="sm"
              >
                Reload Page
              </Button>
              <Button
                variant="subtle"
                onClick={() => window.history.back()}
                size="sm"
              >
                Go Back
              </Button>
            </Group>
          </Stack>
        </Card>
      );
    }

    return children;
  }
}
