import { Paper, Title, Text } from "@mantine/core";

/**
 * Placeholder component for the removed RightSidebarDynamic functionality
 */
export function RightSidebarDynamic() {
  return (
    <Paper p="md" withBorder h="100%">
      <Title order={4}>Right Sidebar</Title>
      <Text size="sm" c="dimmed" mt="sm">
        The dynamic right sidebar has been temporarily removed during application cleanup.
        This functionality may be restored in a future version.
      </Text>
    </Paper>
  );
}