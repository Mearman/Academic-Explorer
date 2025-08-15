import { Grid, Paper, Stack, Text, Badge } from '@mantine/core';
import React from 'react';

import type { Source } from '@/lib/openalex/types';

interface SourceMetricsGridProps {
  source: Source;
}

/**
 * Display key metrics for a source in a grid layout
 */
export function SourceMetricsGrid({ source }: SourceMetricsGridProps) {
  return (
    <Grid>
      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="xs" align="center">
            <Text size="xl" fw={700} c="green">
              {source.works_count.toLocaleString()}
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Works Published
            </Text>
          </Stack>
        </Paper>
      </Grid.Col>
      
      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="xs" align="center">
            <Text size="xl" fw={700} c="blue">
              {source.cited_by_count.toLocaleString()}
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Total Citations
            </Text>
          </Stack>
        </Paper>
      </Grid.Col>
      
      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="xs" align="center">
            <Text size="xl" fw={700} c="grape">
              {source.summary_stats?.h_index || 'N/A'}
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
            <Badge 
              color={source.is_oa ? 'openAccess' : 'publisher'} 
              size="lg" 
              radius="sm"
            >
              {source.is_oa ? 'Open Access' : 'Subscription'}
            </Badge>
            <Text size="sm" c="dimmed" ta="center">
              Access Model
            </Text>
          </Stack>
        </Paper>
      </Grid.Col>
    </Grid>
  );
}