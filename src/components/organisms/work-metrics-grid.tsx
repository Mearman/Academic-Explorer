import { Badge, Grid, Paper, Stack, Text } from '@mantine/core';

import type { Work } from '@/lib/openalex/types';

interface WorkMetricsGridProps {
  work: Work;
}

export function WorkMetricsGrid({ work }: WorkMetricsGridProps) {
  return (
    <Grid>
      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="xs" align="center">
            <Text size="xl" fw={700} c="blue">
              {work.cited_by_count}
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Citations
            </Text>
          </Stack>
        </Paper>
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="xs" align="center">
            <Text size="xl" fw={700}>
              {work.publication_year || 'N/A'}
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Published
            </Text>
          </Stack>
        </Paper>
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="xs" align="center">
            <Text size="xl" fw={700}>
              {work.authorships?.length || 0}
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Authors
            </Text>
          </Stack>
        </Paper>
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="xs" align="center">
            <Badge 
              color={work.open_access.is_oa ? 'openAccess' : 'publisher'} 
              size="lg" 
              radius="sm"
            >
              {work.open_access.is_oa ? 'Open Access' : 'Restricted'}
            </Badge>
            <Text size="sm" c="dimmed" ta="center">
              Access Status
            </Text>
          </Stack>
        </Paper>
      </Grid.Col>
    </Grid>
  );
}