import { logger } from "@academic-explorer/utils/logger";
import { Container, Alert, Text, Button, Stack, Group } from "@mantine/core";
import { IconAlertTriangle, IconRefresh, IconHome } from "@tabler/icons-react";
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
  function getUserAgentGroup(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome')) return 'chrome';
    if (userAgent.includes('firefox')) return 'firefox';
    if (userAgent.includes('safari')) return 'safari';
    if (userAgent.includes('edge')) return 'edge';
    return 'other';
  }

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

  // Handle routing-specific errors here
  return (
    <Container size="md" py="xl">
      <Stack gap="md">
        <Alert
          icon={<IconAlertTriangle size={20} />}
          title="Navigation Error"
          color="orange"
          variant="light"
        >
          <Text size="sm">There was an error loading this page or route.</Text>
        </Alert>

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
