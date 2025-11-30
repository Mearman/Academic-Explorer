/**
 * Biconnected Components Algorithm Item
 * Finds biconnected components and articulation points using Tarjan's algorithm
 *
 * @module components/algorithms/items/BiconnectedItem
 */

import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  List,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconCircle, IconLink } from '@tabler/icons-react';

import { useBiconnectedComponents } from '@/hooks/use-graph-algorithms';

import type { AlgorithmItemBaseProps } from '../types';

export function BiconnectedItem({
  nodes,
  edges,
  onHighlightNodes,
}: AlgorithmItemBaseProps) {
  const biconnectedComponents = useBiconnectedComponents(nodes, edges);

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Biconnected components remain connected after removing any single node.
        Articulation points are critical nodes whose removal disconnects the graph.
      </Text>

      {biconnectedComponents ? (
        <>
          {/* Articulation Points */}
          {biconnectedComponents.articulationPoints.length > 0 && (
            <Card withBorder p="xs">
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500}>Articulation Points (Cut Vertices)</Text>
                <Badge color="orange" variant="light">
                  {biconnectedComponents.articulationPoints.length}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed" mb="xs">
                Removing these nodes would disconnect the graph:
              </Text>
              <Group gap="xs" wrap="wrap">
                {biconnectedComponents.articulationPoints.slice(0, 8).map((nodeId) => (
                  <Badge
                    key={nodeId}
                    size="xs"
                    color="orange"
                    variant="filled"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onHighlightNodes?.([nodeId])}
                  >
                    {nodeId.slice(0, 10)}...
                  </Badge>
                ))}
                {biconnectedComponents.articulationPoints.length > 8 && (
                  <Text size="xs" c="dimmed">
                    +{biconnectedComponents.articulationPoints.length - 8} more
                  </Text>
                )}
              </Group>
              <Button
                variant="light"
                size="xs"
                mt="xs"
                color="orange"
                onClick={() => onHighlightNodes?.(biconnectedComponents.articulationPoints)}
              >
                Highlight All Articulation Points
              </Button>
            </Card>
          )}

          {/* Biconnected Components List */}
          <Box>
            <Text size="sm" fw={500} mb="xs">Components</Text>
            <List spacing="xs" size="sm">
              {biconnectedComponents.components
                .sort((a, b) => b.nodes.length - a.nodes.length)
                .slice(0, 6)
                .map((component) => (
                <List.Item
                  key={component.id}
                  icon={
                    <ThemeIcon
                      size={20}
                      radius="xl"
                      variant="light"
                      color={component.isBridge ? 'yellow' : 'teal'}
                    >
                      {component.isBridge ? <IconLink size={12} /> : <IconCircle size={12} />}
                    </ThemeIcon>
                  }
                  style={{ cursor: 'pointer' }}
                  onClick={() => onHighlightNodes?.(component.nodes)}
                >
                  <Group justify="space-between">
                    <Group gap="xs">
                      <Text size="sm">Component {component.id + 1}</Text>
                      {component.isBridge && (
                        <Badge size="xs" color="yellow" variant="outline">Bridge</Badge>
                      )}
                    </Group>
                    <Badge size="xs" variant="light">
                      {component.nodes.length} nodes
                    </Badge>
                  </Group>
                </List.Item>
              ))}
              {biconnectedComponents.components.length > 6 && (
                <Text size="xs" c="dimmed">
                  +{biconnectedComponents.components.length - 6} more components
                </Text>
              )}
            </List>
          </Box>
        </>
      ) : (
        <Text size="sm" c="dimmed">
          Requires at least 2 nodes for biconnected component analysis.
        </Text>
      )}
    </Stack>
  );
}
