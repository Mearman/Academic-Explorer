/**
 * Algorithm Tabs Container
 * Organizes graph algorithms into collapsible sections
 * @module components/algorithms/AlgorithmTabs
 */

import { Accordion, Alert, Stack, Text } from '@mantine/core';
import {
  IconAlertCircle,
  IconNetwork,
  IconRoute,
  IconSearch,
  IconUsers,
} from '@tabler/icons-react';

import {
  CommunitiesTab,
  PathfindingTab,
  PatternsTab,
  StructureTab,
} from './categories';
import type { AlgorithmTabsProps } from './types';

/**
 * Main algorithm accordion container component
 * Provides categorized access to all graph algorithms via collapsible sections
 * @param root0
 * @param root0.nodes
 * @param root0.edges
 * @param root0.onHighlightNodes
 * @param root0.onHighlightPath
 * @param root0.onSelectCommunity
 * @param root0.onCommunitiesDetected
 * @param root0.pathSource
 * @param root0.pathTarget
 * @param root0.onPathSourceChange
 * @param root0.onPathTargetChange
 */
export const AlgorithmTabs = ({
  nodes,
  edges,
  onHighlightNodes,
  onHighlightPath,
  onSelectCommunity,
  onCommunitiesDetected,
  pathSource,
  pathTarget,
  onPathSourceChange,
  onPathTargetChange,
}: AlgorithmTabsProps) => {
  if (nodes.length === 0) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="No Graph Data" color="gray">
        Add nodes and edges to the graph to run algorithms.
      </Alert>
    );
  }

  return (
    <Accordion
      multiple
      variant="separated"
      defaultValue={['communities']}
      styles={{
        item: {
          borderRadius: 'var(--mantine-radius-sm)',
          border: '1px solid var(--mantine-color-gray-3)',
        },
      }}
    >
      {/* Communities Section */}
      <Accordion.Item value="communities">
        <Accordion.Control icon={<IconUsers />}>
          <Stack gap={0}>
            <Text size="sm" fw={500}>Find Communities</Text>
            <Text size="xs" c="dimmed">Clusters, cores, community structure</Text>
          </Stack>
        </Accordion.Control>
        <Accordion.Panel>
          <CommunitiesTab
            nodes={nodes}
            edges={edges}
            onHighlightNodes={onHighlightNodes}
            onHighlightPath={onHighlightPath}
            onSelectCommunity={onSelectCommunity}
            onCommunitiesDetected={onCommunitiesDetected}
          />
        </Accordion.Panel>
      </Accordion.Item>

      {/* Pathfinding Section */}
      <Accordion.Item value="paths">
        <Accordion.Control icon={<IconRoute size={16} />}>
          <Stack gap={0}>
            <Text size="sm" fw={500}>Navigate Paths</Text>
            <Text size="xs" c="dimmed">Routing, traversal, neighborhoods</Text>
          </Stack>
        </Accordion.Control>
        <Accordion.Panel>
          <PathfindingTab
            nodes={nodes}
            edges={edges}
            onHighlightNodes={onHighlightNodes}
            onHighlightPath={onHighlightPath}
            pathSource={pathSource}
            pathTarget={pathTarget}
            onPathSourceChange={onPathSourceChange}
            onPathTargetChange={onPathTargetChange}
          />
        </Accordion.Panel>
      </Accordion.Item>

      {/* Structure Section */}
      <Accordion.Item value="structure">
        <Accordion.Control icon={<IconNetwork size={16} />}>
          <Stack gap={0}>
            <Text size="sm" fw={500}>Analyze Structure</Text>
            <Text size="xs" c="dimmed">Connectivity, components, ordering</Text>
          </Stack>
        </Accordion.Control>
        <Accordion.Panel>
          <StructureTab
            nodes={nodes}
            edges={edges}
            onHighlightNodes={onHighlightNodes}
            onHighlightPath={onHighlightPath}
          />
        </Accordion.Panel>
      </Accordion.Item>

      {/* Patterns Section */}
      <Accordion.Item value="patterns">
        <Accordion.Control icon={<IconSearch size={16} />}>
          <Stack gap={0}>
            <Text size="sm" fw={500}>Find Patterns</Text>
            <Text size="xs" c="dimmed">Motifs, triangles, citation patterns</Text>
          </Stack>
        </Accordion.Control>
        <Accordion.Panel>
          <PatternsTab
            nodes={nodes}
            edges={edges}
            onHighlightNodes={onHighlightNodes}
            onHighlightPath={onHighlightPath}
          />
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
};
