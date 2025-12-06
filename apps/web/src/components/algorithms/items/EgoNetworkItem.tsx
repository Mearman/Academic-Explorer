/**
 * Ego Network Algorithm Item
 * Extracts the local neighborhood around a center node
 * @module components/algorithms/items/EgoNetworkItem
 */

import {
  Badge,
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import { useMemo,useState } from 'react';

import { useEgoNetwork } from '@/hooks/use-graph-algorithms';

import { EGO_NETWORK } from '../constants';
import type { AlgorithmItemBaseProps } from '../types';

export const EgoNetworkItem = ({
  nodes,
  edges,
  onHighlightNodes,
}: AlgorithmItemBaseProps) => {
  const [egoCenter, setEgoCenter] = useState<string | null>(null);
  const [egoRadius, setEgoRadius] = useState<number>(EGO_NETWORK.RADIUS_DEFAULT);
  const egoNetwork = useEgoNetwork(nodes, edges, egoCenter, egoRadius, true);

  // Create node options for select dropdown
  const nodeOptions = useMemo(
    () =>
      nodes.map((node) => ({
        value: node.id,
        label: node.label || node.id,
      })),
    [nodes]
  );

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Extract the local neighborhood around a center node within a given radius.
      </Text>
      <Select
        label="Center Node"
        placeholder="Select center node"
        data={nodeOptions}
        value={egoCenter}
        onChange={setEgoCenter}
        searchable
        clearable
      />
      <NumberInput
        label="Radius"
        description="Number of hops from the center node"
        value={egoRadius}
        onChange={(value) => setEgoRadius(typeof value === 'number' ? value : EGO_NETWORK.RADIUS_DEFAULT)}
        min={EGO_NETWORK.RADIUS_MIN}
        max={EGO_NETWORK.RADIUS_MAX}
        step={1}
      />

      {egoNetwork && egoCenter && (
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Nodes in Ego Network</Text>
            <Badge variant="light">{egoNetwork.nodes.length}</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Edges in Ego Network</Text>
            <Badge variant="light">{egoNetwork.edges.length}</Badge>
          </Group>
          <Button
            variant="light"
            size="xs"
            onClick={() => onHighlightNodes?.(egoNetwork.nodes.map(n => n.id))}
          >
            Highlight Ego Network
          </Button>
        </Stack>
      )}
    </Stack>
  );
};
