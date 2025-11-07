import { Title, Text, Paper } from "@mantine/core";

/**
 * Placeholder component for the removed CustomForcesSection functionality
 */
export function CustomForcesSection() {
  return (
    <Paper p="md" withBorder>
      <Title order={4}>Custom Forces</Title>
      <Text size="sm" c="dimmed" mt="sm">
        The Custom Forces section has been temporarily removed during application cleanup.
        This functionality may be restored in a future version.
      </Text>
    </Paper>
  );
}