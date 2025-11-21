/**
 * Catalogue Error Boundary
 *
 * Wraps PostHog's official ErrorBoundary with custom fallback UI
 * for catalogue components. Provides user-friendly error display
 * with automatic error tracking to PostHog.
 */

import React, { ReactNode, FunctionComponent } from "react";
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
import { PostHogErrorBoundary } from "@posthog/react";
import type { PostHogErrorBoundaryFallbackProps } from "@posthog/react";

interface CatalogueErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback component */
  fallback?: FunctionComponent<PostHogErrorBoundaryFallbackProps>;
}

/**
 * Custom fallback component for catalogue errors
 * Provides detailed error information and recovery actions
 */
function CatalogueFallback({
  error,
}: PostHogErrorBoundaryFallbackProps) {
  // Convert unknown error to Error for display
  const errorObj = error instanceof Error ? error : new Error(String(error));

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
              {errorObj.message || "Unknown error occurred"}
            </Code>
          </Stack>
        </Alert>

        {process.env.NODE_ENV === "development" && errorObj.stack && (
          <Alert color="yellow" variant="light">
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Stack Trace (Development Only):
              </Text>
              <Code
                block
                color="yellow"
                style={{ maxHeight: "200px", overflow: "auto" }}
              >
                {errorObj.stack}
              </Code>
            </Stack>
          </Alert>
        )}

        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            This error has been automatically reported to PostHog for analysis.
            Please reload the page to continue.
          </Text>
        </Group>

        <Group>
          <Button
            variant="subtle"
            onClick={() => window.location.reload()}
            size="sm"
            leftSection={<IconRefresh size={16} />}
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

/**
 * Catalogue Error Boundary Component
 *
 * Uses PostHog's official ErrorBoundary with custom fallback UI.
 * Automatically tracks errors to PostHog for analytics and debugging.
 *
 * @param children - Components to wrap with error boundary
 * @param fallback - Optional custom fallback component (defaults to CatalogueFallback)
 */
export function CatalogueErrorBoundary({
  children,
  fallback,
}: CatalogueErrorBoundaryProps) {
  return (
    <PostHogErrorBoundary fallback={fallback || CatalogueFallback}>
      {children}
    </PostHogErrorBoundary>
  );
}

export default CatalogueErrorBoundary;
