/**
 * Strongly Connected Components Algorithm Item
 * Finds strongly connected components in directed graphs using Tarjan's algorithm
 *
 * @module components/algorithms/items/SCCItem
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

import { useStronglyConnectedComponents } from '@/hooks/use-graph-algorithms';

import type { AlgorithmItemBaseProps } from '../types';

export function SCCItem({
  nodes,
  edges,
  onHighlightNodes,
}: AlgorithmItemBaseProps) {
  const stronglyConnectedComponents = useStronglyConnectedComponents(nodes, edges);

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        SCCs are maximal sets of nodes where every node can reach every other node
        following edge directions.
      </Text>
      {stronglyConnectedComponents.components.length > 0 && (
        <List spacing="xs" size="sm">
          {stronglyConnectedComponents.components
            .sort((a, b) => b.length - a.length)
            .slice(0, 8)
            .map((component, index) => (
            <List.Item
              key={index}
              icon={
                <ThemeIcon size={20} radius="xl" variant="light" color="violet">
                  <IconCircleDot size={12} />
                </ThemeIcon>
              }
              style={{ cursor: 'pointer' }}
              onClick={() => onHighlightNodes?.(component)}
            >
              <Group justify="space-between">
                <Text size="sm">SCC {index + 1}</Text>
                <Badge size="xs" variant="light">
                  {component.length} nodes
                </Badge>
              </Group>
            </List.Item>
          ))}
          {stronglyConnectedComponents.components.length > 8 && (
            <Text size="xs" c="dimmed">
              +{stronglyConnectedComponents.components.length - 8} more SCCs
            </Text>
          )}
        </List>
      )}
    </Stack>
  );
}
