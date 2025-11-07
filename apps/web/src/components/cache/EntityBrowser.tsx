import { Title, Text, Container, Paper } from "@mantine/core";

/**
 * Placeholder component for the removed EntityBrowser functionality
 */
export function EntityBrowser() {
  return (
    <Container size="lg" py="xl">
      <Paper p="xl" withBorder>
        <Title order={1}>Entity Browser</Title>
        <Text mt="md" c="dimmed">
          The Entity Browser component has been temporarily removed during application cleanup.
          This functionality may be restored in a future version.
        </Text>
        <Text mt="sm" c="dimmed">
          For entity exploration, please use the main search functionality.
        </Text>
      </Paper>
    </Container>
  );
}