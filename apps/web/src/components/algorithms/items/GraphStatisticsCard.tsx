/**
 * Graph Statistics Card
 * Displays basic graph statistics in a card format
 *
 * @module components/algorithms/items/GraphStatisticsCard
 */

import {
  Badge,
  Card,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconGraph } from '@tabler/icons-react';

import { useGraphStatistics, useCycleDetection } from '@/hooks/use-graph-algorithms';
import type { AlgorithmItemBaseProps } from '../types';

export function GraphStatisticsCard({
  nodes,
  edges,
}: AlgorithmItemBaseProps) {
  const statistics = useGraphStatistics(nodes, edges, true);
  const hasCycles = useCycleDetection(nodes, edges, true);

  return (
    <Card withBorder p="md">
      <Title order={5} mb="sm">
        <Group gap="xs">
          <IconGraph size={18} />
          Graph Statistics
        </Group>
      </Title>

      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Nodes</Text>
          <Badge variant="light">{statistics.nodeCount}</Badge>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Edges</Text>
          <Badge variant="light">{statistics.edgeCount}</Badge>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Density</Text>
          <Badge variant="light">{(statistics.density * 100).toFixed(2)}%</Badge>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Avg. Degree</Text>
          <Badge variant="light">{statistics.averageDegree.toFixed(2)}</Badge>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Connected</Text>
          <Badge color={statistics.isConnected ? 'green' : 'yellow'} variant="light">
            {statistics.isConnected ? 'Yes' : 'No'}
          </Badge>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Components</Text>
          <Badge variant="light">{statistics.componentCount}</Badge>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Has Cycles</Text>
          <Badge color={hasCycles ? 'blue' : 'gray'} variant="light">
            {hasCycles ? 'Yes' : 'No'}
          </Badge>
        </Group>
      </Stack>
    </Card>
  );
}
