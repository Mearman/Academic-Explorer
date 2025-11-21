/**
 * T078: Error boundary for catalogue components
 * Catches errors in catalogue UI and provides user-friendly fallback
 * Enhanced with PostHog error tracking for analytics
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

// Error boundary hook wrapper for PostHog integration
interface CatalogueErrorBoundaryWithAnalyticsProps {
  children: ReactNode;
  /** Optional fallback component to render on error */
  fallback?: ReactNode;
}

/**
 * Error boundary wrapper that adds PostHog analytics to the original CatalogueErrorBoundary
 */
export function CatalogueErrorBoundaryWithAnalytics(props: CatalogueErrorBoundaryWithAnalyticsProps) {
  return (
    <EnhancedCatalogueErrorBoundary {...props} />
  );
}

/**
 * Enhanced error boundary component with PostHog integration
 */
class EnhancedCatalogueErrorBoundary extends Component<
  CatalogueErrorBoundaryWithAnalyticsProps,
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  constructor(props: CatalogueErrorBoundaryWithAnalyticsProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to existing logger
    logger.error("catalogue-error-boundary", "Component error caught", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Send to PostHog if available
    try {
      if (typeof window !== 'undefined' && 'posthog' in window) {
        const posthog = (window as any).posthog;
        if (posthog) {
          posthog.capture('error_occurred', {
            error_type: 'component_error',
            error_category: 'ui_error',
            component_name: 'CatalogueErrorBoundary',
            error_message: error.message,
            user_agent_group: this.getUserAgentGroup(),
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (analyticsError) {
      // Don't let analytics errors break the error boundary
      console.warn('Failed to send error to PostHog:', analyticsError);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  getUserAgentGroup(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome')) return 'chrome';
    if (userAgent.includes('firefox')) return 'firefox';
    if (userAgent.includes('safari')) return 'safari';
    if (userAgent.includes('edge')) return 'edge';
    return 'other';
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Track reset action in PostHog
    try {
      if (typeof window !== 'undefined' && 'posthog' in window) {
        const posthog = (window as any).posthog;
        if (posthog) {
          posthog.capture('error_boundary_reset', {
            component_name: 'CatalogueErrorBoundary',
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (analyticsError) {
      console.warn('Failed to send reset action to PostHog:', analyticsError);
    }

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

      // Default error UI with enhanced analytics messaging
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
                This error has been logged for analysis. Please try reloading the page or resetting the catalogue.
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

/**
 * Default export - CatalogueErrorBoundary with analytics
 */
export { CatalogueErrorBoundaryWithAnalytics as CatalogueErrorBoundary };
