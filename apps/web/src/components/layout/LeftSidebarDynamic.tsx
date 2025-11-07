import { Paper, Title, Text } from "@mantine/core";

/**
 * Placeholder component for the removed LeftSidebarDynamic functionality
 */
export function LeftSidebarDynamic() {
  return (
    <Paper p="md" withBorder h="100%">
      <Title order={4}>Left Sidebar</Title>
      <Text size="sm" c="dimmed" mt="sm">
        The dynamic left sidebar has been temporarily removed during application cleanup.
        This functionality may be restored in a future version.
      </Text>
    </Paper>
  );
}