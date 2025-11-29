/**
 * Shortest Path Algorithm Item
 * Find shortest path between two nodes using Dijkstra's algorithm
 *
 * @module components/algorithms/items/ShortestPathItem
 */

import {
  Badge,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { IconAlertCircle, IconCircleCheck, IconRoute } from '@tabler/icons-react';
import { useState, useMemo } from 'react';

import { findShortestPath, type PathResult } from '@/services/graph-algorithms';
import type { PathAlgorithmProps } from '../types';

export function ShortestPathItem({
  nodes,
  edges,
  onHighlightPath,
  pathSource: controlledPathSource,
  pathTarget: controlledPathTarget,
  onPathSourceChange,
  onPathTargetChange,
}: PathAlgorithmProps) {
  // Path finding state - supports both controlled and uncontrolled modes
  const [internalPathSource, setInternalPathSource] = useState<string | null>(null);
  const [internalPathTarget, setInternalPathTarget] = useState<string | null>(null);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [pathDirected, setPathDirected] = useState<boolean>(true);

  // Use controlled values if provided, otherwise use internal state
  const isControlled = controlledPathSource !== undefined || controlledPathTarget !== undefined;
  const pathSource = isControlled ? (controlledPathSource ?? null) : internalPathSource;
  const pathTarget = isControlled ? (controlledPathTarget ?? null) : internalPathTarget;

  const setPathSource = (value: string | null) => {
    if (onPathSourceChange) {
      onPathSourceChange(value);
    }
    if (!isControlled) {
      setInternalPathSource(value);
    }
  };

  const setPathTarget = (value: string | null) => {
    if (onPathTargetChange) {
      onPathTargetChange(value);
    }
    if (!isControlled) {
      setInternalPathTarget(value);
    }
  };

  // Create node options for select dropdowns
  const nodeOptions = useMemo(
    () =>
      nodes.map((node) => ({
        value: node.id,
        label: node.label || node.id,
      })),
    [nodes]
  );

  // Handle path finding
  const handleFindPath = () => {
    if (pathSource && pathTarget) {
      const result = findShortestPath(nodes, edges, pathSource, pathTarget, pathDirected);
      setPathResult(result);
      if (result.found && onHighlightPath) {
        onHighlightPath(result.path);
      }
    }
  };

  return (
    <Stack gap="sm">
      <Select
        label="Source Node"
        placeholder="Select starting node"
        data={nodeOptions}
        value={pathSource}
        onChange={setPathSource}
        searchable
        clearable
      />
      <Select
        label="Target Node"
        placeholder="Select destination node"
        data={nodeOptions}
        value={pathTarget}
        onChange={setPathTarget}
        searchable
        clearable
      />
      <Switch
        label="Respect edge direction"
        description={pathDirected
          ? "Only traverse edges from source → target"
          : "Traverse edges in both directions"
        }
        checked={pathDirected}
        onChange={(e) => setPathDirected(e.currentTarget.checked)}
      />
      <Button
        onClick={handleFindPath}
        disabled={!pathSource || !pathTarget}
        leftSection={<IconRoute size={16} />}
      >
        Find Path
      </Button>

      {pathResult && (
        <Card withBorder p="sm" bg="gray.0">
          {pathResult.found ? (
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={500} c="green">
                  <IconCircleCheck size={16} style={{ verticalAlign: 'middle' }} /> Path Found
                </Text>
                <Badge variant="light">{pathResult.distance} hops</Badge>
              </Group>
              <Text size="xs" c="dimmed">
                Path: {pathResult.path.length} nodes
              </Text>
            </Stack>
          ) : (
            <Text size="sm" c="red">
              <IconAlertCircle size={16} style={{ verticalAlign: 'middle' }} /> No path exists
            </Text>
          )}
        </Card>
      )}
    </Stack>
  );
}
