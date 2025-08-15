import { Grid, Paper, Stack, Text } from '@mantine/core';

import type { Concept } from '@/lib/openalex/types';

interface ConceptMetricsProps {
  concept: Concept;
}

export function ConceptMetrics({ concept }: ConceptMetricsProps) {
  return (
    <Grid>
      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="xs" align="center">
            <Text size="xl" fw={700} c="grape">
              {concept.works_count.toLocaleString()}
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Works
            </Text>
          </Stack>
        </Paper>
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="xs" align="center">
            <Text size="xl" fw={700} c="grape">
              {concept.cited_by_count.toLocaleString()}
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
            <Text size="xl" fw={700} c="grape">
              {concept.level}
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Hierarchy Level
            </Text>
          </Stack>
        </Paper>
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="xs" align="center">
            <Text size="xl" fw={700} c="grape">
              {concept.ancestors ? concept.ancestors.length : 0}
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Ancestor Concepts
            </Text>
          </Stack>
        </Paper>
      </Grid.Col>
    </Grid>
  );
}