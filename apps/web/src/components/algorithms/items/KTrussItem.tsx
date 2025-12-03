/**
 * K-Truss Decomposition Algorithm Item
 * Finds the k-truss subgraph where every edge is in at least k-2 triangles
 * @module components/algorithms/items/KTrussItem
 */

import {
  Badge,
  Button,
  Group,
  NumberInput,
  Stack,
  Text,
} from '@mantine/core';
import { IconChartDonut } from '@tabler/icons-react';
import { useState } from 'react';

import { useKTruss } from '@/hooks/use-graph-algorithms';

import type { AlgorithmItemBaseProps } from '../types';

export const KTrussItem = ({
  nodes,
  edges,
  onHighlightNodes,
}: AlgorithmItemBaseProps) => {
  const [kTrussK, setKTrussK] = useState<number>(3);
  const kTruss = useKTruss(nodes, edges, kTrussK);

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        K-truss: subgraph where every edge participates in at least (k-2) triangles.
        Provides stronger cohesion guarantees than k-core.
      </Text>
      <NumberInput
        label="K Value"
        description="k=3 means edges in at least 1 triangle, k=4 means at least 2 triangles"
        value={kTrussK}
        onChange={(value) => setKTrussK(typeof value === 'number' ? value : 3)}
        min={2}
        max={10}
        step={1}
      />

      {kTruss.nodeCount > 0 ? (
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Nodes in {kTrussK}-truss</Text>
            <Badge variant="light">{kTruss.nodeCount}</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Edges in {kTrussK}-truss</Text>
            <Badge variant="light">{kTruss.edgeCount}</Badge>
          </Group>
          <Button
            variant="light"
            size="xs"
            onClick={() => onHighlightNodes?.(kTruss.nodes)}
            leftSection={<IconChartDonut size={14} />}
          >
            Highlight K-Truss
          </Button>
        </Stack>
      ) : (
        <Text size="sm" c="dimmed">
          No {kTrussK}-truss exists (try a lower k value or add more edges)
        </Text>
      )}
    </Stack>
  );
};
