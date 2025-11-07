import { Title, Text, Container, Paper } from "@mantine/core";

/**
 * Placeholder component for the removed CacheBrowser functionality
 */
export function CacheBrowser() {
  return (
    <Container size="lg" py="xl">
      <Paper p="xl" withBorder>
        <Title order={1}>Cache Browser</Title>
        <Text mt="md" c="dimmed">
          The Cache Browser component has been temporarily removed during application cleanup.
          This functionality may be restored in a future version.
        </Text>
        <Text mt="sm" c="dimmed">
          For cache management, please use the CLI tools: `pnpm cli cache:*`
        </Text>
      </Paper>
    </Container>
  );
}