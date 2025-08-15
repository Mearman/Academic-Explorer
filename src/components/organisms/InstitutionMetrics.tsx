import { Grid, Paper, Stack, Text } from '@mantine/core';

import type { Institution } from '@/lib/openalex/types';

interface InstitutionMetricsProps {
  institution: Institution;
}

export function InstitutionMetrics({ institution }: InstitutionMetricsProps) {
  return (
    <>
      {/* Key Metrics */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper p="lg" radius="md" withBorder>
            <Stack gap="xs" align="center">
              <Text size="xl" fw={700} c="orange">
                {institution.works_count.toLocaleString()}
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
              <Text size="xl" fw={700} c="orange">
                {institution.cited_by_count.toLocaleString()}
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
              <Text size="xl" fw={700} c="orange">
                {institution.summary_stats.h_index}
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                h-index
              </Text>
            </Stack>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper p="lg" radius="md" withBorder>
            <Stack gap="xs" align="center">
              <Text size="xl" fw={700} c="orange">
                {institution.summary_stats.i10_index}
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                i10-index
              </Text>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Additional Metrics */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper p="lg" radius="md" withBorder>
            <Stack gap="xs" align="center">
              <Text size="lg" fw={600} c="orange">
                {institution.summary_stats['2yr_mean_citedness'].toFixed(2)}
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                2yr Mean Citedness
              </Text>
            </Stack>
          </Paper>
        </Grid.Col>
        {institution.repositories && institution.repositories.length > 0 && (
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="lg" radius="md" withBorder>
              <Stack gap="xs" align="center">
                <Text size="lg" fw={600} c="orange">
                  {institution.repositories.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Repositories
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        )}
        {institution.associated_institutions && institution.associated_institutions.length > 0 && (
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="lg" radius="md" withBorder>
              <Stack gap="xs" align="center">
                <Text size="lg" fw={600} c="orange">
                  {institution.associated_institutions.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Associated Institutions
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        )}
        {institution.lineage && institution.lineage.length > 0 && (
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="lg" radius="md" withBorder>
              <Stack gap="xs" align="center">
                <Text size="lg" fw={600} c="orange">
                  {institution.lineage.length}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Lineage Institutions
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        )}
      </Grid>
    </>
  );
}