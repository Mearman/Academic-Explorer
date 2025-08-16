import { Stack, Text, Paper } from '@mantine/core';

import type { Funder } from '@/lib/openalex/types';

interface FunderDisplayProps {
  entity: Funder;
}

export function FunderDisplay({ entity: funder }: FunderDisplayProps) {
  return (
    <Stack gap="xl">
      <Paper p="xl" withBorder>
        <Text size="xl" fw={700} mb="md">
          {funder.display_name}
        </Text>
        <Text c="dimmed" mb="xs">
          Funder ID: {funder.id}
        </Text>
        <Text c="dimmed" mb="xs">
          Works Count: {funder.works_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Citations: {funder.cited_by_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Grants Count: {funder.grants_count ?? 0}
        </Text>
        {funder.country_code && (
          <Text c="dimmed" mb="xs">
            Country: {funder.country_code}
          </Text>
        )}
        {funder.description && (
          <Text c="dimmed" mb="xs">
            Description: {funder.description}
          </Text>
        )}
      </Paper>
    </Stack>
  );
}