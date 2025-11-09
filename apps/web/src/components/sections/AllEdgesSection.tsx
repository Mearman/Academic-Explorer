import { Title, Text, Paper } from "@mantine/core";

/**
 * Placeholder component for the removed AllEdgesSection functionality
 */
export function AllEdgesSection() {
  return (
    <Paper p="md" withBorder>
      <Title order={4}>All Edges</Title>
      <Text size="sm" c="dimmed" mt="sm">
        The All Edges section has been temporarily removed during application cleanup.
        This functionality may be restored in a future version.
      </Text>
    </Paper>
  );
}