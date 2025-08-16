import { Stack, Text, Paper } from '@mantine/core';

import type { Work } from '@/lib/openalex/types';

interface WorkDisplayProps {
  entity: Work;
}

export function WorkDisplay({ entity: work }: WorkDisplayProps) {
  return (
    <Stack gap="xl">
      <Paper p="xl" withBorder>
        <Text size="xl" fw={700} mb="md">
          {work.display_name}
        </Text>
        <Text c="dimmed" mb="xs">
          Work ID: {work.id}
        </Text>
        <Text c="dimmed" mb="xs">
          Citations: {work.cited_by_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Publication Year: {work.publication_year}
        </Text>
        {work.primary_location?.source && (
          <Text c="dimmed" mb="xs">
            Source: {work.primary_location.source.display_name}
          </Text>
        )}
      </Paper>
    </Stack>
  );
}