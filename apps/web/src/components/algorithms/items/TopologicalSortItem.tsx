/**
 * Topological Sort and Cycle Detection Algorithm Item
 * Detects cycles and computes topological ordering for DAGs
 *
 * @module components/algorithms/items/TopologicalSortItem
 */

import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';

import { useCycleInfo, useTopologicalSort } from '@/hooks/use-graph-algorithms';

import type { AlgorithmItemBaseProps } from '../types';

export function TopologicalSortItem({
  nodes,
  edges,
  onHighlightNodes,
  onHighlightPath,
}: AlgorithmItemBaseProps) {
  const cycleInfo = useCycleInfo(nodes, edges, true);
  const topologicalOrder = useTopologicalSort(nodes, edges);

  return (
    <Stack gap="sm">
      {cycleInfo.hasCycle ? (
        <>
          <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
            Graph contains cycles - topological sort is not possible.
          </Alert>
          {cycleInfo.cycle.length > 0 && (
            <Card style={{ border: "1px solid var(--mantine-color-gray-3)" }} p="xs">
              <Text size="sm" fw={500} mb="xs">Detected Cycle:</Text>
              <Group gap="xs" wrap="wrap">
                {cycleInfo.cycle.map((nodeId, index) => (
                  <Group key={nodeId} gap={4}>
                    <Badge
                      size="xs"
                      variant="filled"
                      color="red"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onHighlightNodes?.([nodeId])}
                    >
                      {nodeId.slice(0, 8)}...
                    </Badge>
                    {index < cycleInfo.cycle.length - 1 && (
                      <Text size="xs" c="dimmed">→</Text>
                    )}
                  </Group>
                ))}
              </Group>
              <Button
                variant="light"
                size="xs"
                mt="xs"
                color="red"
                onClick={() => onHighlightNodes?.(cycleInfo.cycle)}
              >
                Highlight Cycle
              </Button>
            </Card>
          )}
        </>
      ) : (
        <>
          <Alert color="green" icon={<IconCircleCheck size={16} />}>
            Graph is a DAG (Directed Acyclic Graph) - topological ordering exists.
          </Alert>
          {topologicalOrder && topologicalOrder.length > 0 && (
            <Card style={{ border: "1px solid var(--mantine-color-gray-3)" }} p="xs">
              <Text size="sm" fw={500} mb="xs">Topological Order:</Text>
              <Text size="xs" c="dimmed" mb="xs">
                Nodes ordered so all edges point from earlier to later nodes.
              </Text>
              <Group gap="xs" wrap="wrap">
                {topologicalOrder.map((nodeId, index) => (
                  <Tooltip key={nodeId} label={nodeId}>
                    <Badge
                      size="xs"
                      variant="outline"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onHighlightNodes?.([nodeId])}
                    >
                      {index + 1}
                    </Badge>
                  </Tooltip>
                ))}
                </Group>
              <Button
                variant="light"
                size="xs"
                mt="xs"
                onClick={() => onHighlightPath?.(topologicalOrder)}
              >
                Highlight Topological Order
              </Button>
            </Card>
          )}
        </>
      )}
    </Stack>
  );
}
