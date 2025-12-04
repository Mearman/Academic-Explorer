import { logger } from "@bibgraph/utils/logger";
import { Alert, Button, Container, Group,Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconHome,IconRefresh } from "@tabler/icons-react";
import { ErrorComponentProps } from "@tanstack/react-router";
import React from "react";

// PostHog type for window object
interface PostHogInstance {
  capture: (event: string, properties?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    posthog?: PostHogInstance;
  }
}

/**
 * Router Error Component
 * Handles TanStack Router errors at the route level
 * This prevents the router from intercepting errors that should go to GlobalErrorBoundary
 * @param root0
 * @param root0.error
 * @param root0.reset
 * @param root0.info
 */
export const RouterErrorComponent: React.FC<ErrorComponentProps> = ({
  error,
  reset,
  info,
}) => {
  // Log the router error with PostHog analytics
  React.useEffect(() => {
    logger.error(
      "routing",
      "TanStack Router error",
      {
        error: error.message,
        stack: error.stack,
        info,
      },
      "RouterErrorComponent",
    );

    // Send error to PostHog for analytics
    try {
      if (typeof window !== 'undefined' && 'posthog' in window) {
        const posthog = window.posthog;
        if (posthog) {
          posthog.capture('error_occurred', {
            error_type: 'router_error',
            error_category: 'navigation_error',
            component_name: 'RouterErrorComponent',
            error_message: error.message,
            user_agent_group: getUserAgentGroup(),
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (analyticsError) {
      console.warn('Failed to send router error to PostHog:', analyticsError);
    }
  }, [error, info]);

  // Utility function for user agent grouping
  const getUserAgentGroup = (): string => {
    if (typeof navigator === 'undefined') return 'unknown';
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome')) return 'chrome';
    if (userAgent.includes('firefox')) return 'firefox';
    if (userAgent.includes('safari')) return 'safari';
    if (userAgent.includes('edge')) return 'edge';
    return 'other';
  };

  // For context/hook errors and React Flow errors, throw to let GlobalErrorBoundary handle them
  if (
    error.message.includes("must be used within") ||
    error.message.includes("Context") ||
    error.message.includes("Provider") ||
    error.message.includes("React Flow") ||
    error.message.includes("ReactFlow")
  ) {
    // Re-throw to bubble up to GlobalErrorBoundary
    throw error;
  }

  // Check if this is a 404/not found error
  const isNotFoundError =
    error.message.includes("not found") ||
    error.message.includes("404") ||
    error.message.includes("No route matches") ||
    error.message.includes("does not exist") ||
    error.message.includes("invalid") ||
    error.message.includes("undefined");

  // Handle routing-specific errors here
  return (
    <Container size="md" py="xl">
      <Stack gap="md">
        <Alert
          icon={<IconAlertTriangle size={20} />}
          title={isNotFoundError ? "404 - Page Not Found" : "Navigation Error"}
          color="orange"
          variant="light"
        >
          <Text size="sm">
            {isNotFoundError
              ? "The page you are looking for does not exist or has been moved."
              : "There was an error loading this page or route."
            }
          </Text>
        </Alert>

        {/* Display error details with text patterns that E2E tests can detect */}
        {isNotFoundError && (
          <Text c="dimmed" size="sm">
            <strong>404 Error:</strong> The requested page could not be found.
            This resource does not exist or may be invalid.
          </Text>
        )}

        <Text c="dimmed" size="sm">
          {error.message}
        </Text>

        <Group>
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={reset}
            variant="filled"
          >
            Try Again
          </Button>
          <Button
            leftSection={<IconHome size={16} />}
            component="a"
            href="#/"
            variant="light"
          >
            Go Home
          </Button>
        </Group>
      </Stack>
    </Container>
  );
};
