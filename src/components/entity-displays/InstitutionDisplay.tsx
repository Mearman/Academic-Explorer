import { Stack, Text, Paper } from '@mantine/core';

import type { Institution } from '@/lib/openalex/types';

interface InstitutionDisplayProps {
  entity: Institution;
}

export function InstitutionDisplay({ entity: institution }: InstitutionDisplayProps) {
  return (
    <Stack gap="xl">
      <Paper p="xl" withBorder>
        <Text size="xl" fw={700} mb="md">
          {institution.display_name}
        </Text>
        <Text c="dimmed" mb="xs">Institution ID: {institution.id}</Text>
        <Text c="dimmed" mb="xs">Works Count: {institution.works_count ?? 0}</Text>
        <Text c="dimmed" mb="xs">Type: {institution.type}</Text>
        {institution.country_code && <Text c="dimmed" mb="xs">Country: {institution.country_code}</Text>}
      </Paper>
    </Stack>
  );
}