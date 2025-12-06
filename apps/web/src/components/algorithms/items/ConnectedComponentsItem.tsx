/**
 * Connected Components Algorithm Item
 * Analyzes graph connectivity and finds connected components
 * @module components/algorithms/items/ConnectedComponentsItem
 */

import {
  Badge,
  Group,
  List,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconCircleDot } from '@tabler/icons-react';

import { useConnectedComponents } from '@/hooks/use-graph-algorithms';

import type { AlgorithmItemBaseProps } from '../types';

export const ConnectedComponentsItem = ({
  nodes,
  edges,
  onHighlightNodes,
}: AlgorithmItemBaseProps) => {
  const connectedComponents = useConnectedComponents(nodes, edges, { directed: false });

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Groups of nodes where every node can reach every other node (ignoring edge direction).
      </Text>
      {connectedComponents.components.length > 0 ? (
        <List spacing="xs" size="sm">
          {connectedComponents.components.map((component, index) => (
            <List.Item
              key={index}
              icon={
                <ThemeIcon size={20} radius="xl" variant="light">
                  <IconCircleDot size={12} />
                </ThemeIcon>
              }
              style={{ cursor: 'pointer' }}
              onClick={() => onHighlightNodes?.(component)}
            >
              <Group justify="space-between">
                <Text size="sm">Component {index + 1}</Text>
                <Badge size="xs" variant="light">
                  {component.length} nodes
                </Badge>
              </Group>
            </List.Item>
          ))}
        </List>
      ) : (
        <Text size="sm" c="dimmed">
          No connected components found. Add nodes and edges to the graph.
        </Text>
      )}
    </Stack>
  );
};
