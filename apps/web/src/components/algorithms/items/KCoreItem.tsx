/**
 * K-Core Decomposition Algorithm Item
 * Finds the k-core subgraph where every node has at least k neighbors
 *
 * @module components/algorithms/items/KCoreItem
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

import { useKCore } from '@/hooks/use-graph-algorithms';
import type { AlgorithmItemBaseProps } from '../types';

export function KCoreItem({
  nodes,
  edges,
  onHighlightNodes,
}: AlgorithmItemBaseProps) {
  const [kCoreValue, setKCoreValue] = useState<number>(2);
  const kCore = useKCore(nodes, edges, kCoreValue);

  const handleKCoreHighlight = () => {
    if (onHighlightNodes && kCore.nodes.length > 0) {
      onHighlightNodes(kCore.nodes);
    }
  };

  return (
    <Stack gap="sm">
      <NumberInput
        label="K Value"
        description="Minimum degree for nodes in the k-core"
        value={kCoreValue}
        onChange={(value) => setKCoreValue(typeof value === 'number' ? value : 2)}
        min={1}
        max={20}
        step={1}
      />

      {kCore.nodes.length > 0 ? (
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Nodes in {kCoreValue}-core</Text>
            <Badge variant="light">{kCore.nodes.length}</Badge>
          </Group>
          <Button
            variant="light"
            size="xs"
            onClick={handleKCoreHighlight}
            leftSection={<IconChartDonut size={14} />}
          >
            Highlight K-Core
          </Button>
        </Stack>
      ) : (
        <Text size="sm" c="dimmed">
          No {kCoreValue}-core exists (try a lower k value)
        </Text>
      )}
    </Stack>
  );
}
