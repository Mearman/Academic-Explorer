import React, { useState } from "react";
import { Container, Stack, Button, Alert, Text, Group } from "@mantine/core";
import { IconBug, IconAlertTriangle } from "@tabler/icons-react";
import { createLazyFileRoute } from "@tanstack/react-router";

/**
 * Error Test Component
 * Used to verify that GlobalErrorBoundary is working correctly
 * Only available in development mode
 */
function ErrorTestComponent() {
  const [shouldThrow, setShouldThrow] = useState(false);

  // Throw an error when shouldThrow is true
  if (shouldThrow) {
    throw new Error(
      "Test error from ErrorTestComponent - This should be caught by GlobalErrorBoundary",
    );
  }

  const triggerError = () => {
    setShouldThrow(true);
  };

  const triggerAsyncError = () => {
    // This will trigger an unhandled promise rejection
    void Promise.reject(
      new Error(
        "Test async error - This should be caught by global error handling",
      ),
    );
  };

  const triggerJSError = () => {
    // This will trigger a JavaScript error
    setTimeout(() => {
      throw new Error(
        "Test JavaScript error - This should be caught by global error handling",
      );
    }, 100);
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Alert
          icon={<IconAlertTriangle size={20} />}
          title="Error Testing Page"
          color="orange"
          variant="light"
        >
          <Text size="sm">
            This page is only available in development mode and is used to test
            error handling.
          </Text>
        </Alert>

        <Stack gap="md">
          <Text fw={500}>Test GlobalErrorBoundary:</Text>
          <Button
            leftSection={<IconBug size={16} />}
            onClick={triggerError}
            color="red"
            variant="light"
          >
            Trigger React Error (Should show GlobalErrorBoundary)
          </Button>
        </Stack>

        <Stack gap="md">
          <Text fw={500}>Test Global Error Handlers:</Text>
          <Group>
            <Button
              leftSection={<IconBug size={16} />}
              onClick={triggerAsyncError}
              color="orange"
              variant="light"
            >
              Trigger Async Error
            </Button>
            <Button
              leftSection={<IconBug size={16} />}
              onClick={triggerJSError}
              color="yellow"
              variant="light"
            >
              Trigger JS Error
            </Button>
          </Group>
        </Stack>

        <Alert color="blue" variant="light">
          <Text size="sm">
            <strong>Expected behavior:</strong>
            <br />
            • React Error: Should display the GlobalErrorBoundary UI with copy
            functionality
            <br />• Async/JS Errors: Should appear in console and Application
            Logger Panel
          </Text>
        </Alert>
      </Stack>
    </Container>
  );
}

export const Route = createLazyFileRoute("/error-test")({
  component: ErrorTestComponent,
});

export default ErrorTestComponent;
