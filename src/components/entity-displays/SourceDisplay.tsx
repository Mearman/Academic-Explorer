import { Stack, Text, Paper } from '@mantine/core';
import type { Source } from '@/lib/openalex/types';

interface SourceDisplayProps {
  entity: Source;
}

export function SourceDisplay({ entity: source }: SourceDisplayProps) {
  return (
    <Stack gap="xl">
      <Paper p="xl" withBorder>
        <Text size="xl" fw={700} mb="md">
          {source.display_name}
        </Text>
        <Text c="dimmed" mb="xs">
          Source ID: {source.id}
        </Text>
        <Text c="dimmed" mb="xs">
          Works Count: {source.works_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Citations: {source.cited_by_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Type: {source.type}
        </Text>
        {source.issn && (
          <Text c="dimmed" mb="xs">
            ISSN: {source.issn.join(', ')}
          </Text>
        )}
      </Paper>
    </Stack>
  );
}