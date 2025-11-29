/**
 * Algorithm Tabs Container
 * Organizes graph algorithms into discoverable category tabs
 *
 * @module components/algorithms/AlgorithmTabs
 */

import { Alert, Stack, Tabs, Text } from '@mantine/core';
import {
  IconUsers,
  IconRoute,
  IconNetwork,
  IconSearch,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useState } from 'react';

import {
  CommunitiesTab,
  PathfindingTab,
  StructureTab,
  PatternsTab,
} from './categories';
import type { AlgorithmTabsProps } from './types';

/**
 * Tab configuration with discoverable labels
 */
const TAB_CONFIG = [
  {
    value: 'communities',
    label: 'Find Communities',
    subtitle: 'Clusters, cores, community structure',
    icon: IconUsers,
  },
  {
    value: 'paths',
    label: 'Navigate Paths',
    subtitle: 'Routing, traversal, neighborhoods',
    icon: IconRoute,
  },
  {
    value: 'structure',
    label: 'Analyze Structure',
    subtitle: 'Connectivity, components, ordering',
    icon: IconNetwork,
  },
  {
    value: 'patterns',
    label: 'Find Patterns',
    subtitle: 'Motifs, triangles, citation patterns',
    icon: IconSearch,
  },
] as const;

/**
 * Main algorithm tabs container component
 * Provides categorized access to all graph algorithms
 */
export function AlgorithmTabs({
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
}: AlgorithmTabsProps) {
  const [activeTab, setActiveTab] = useState<string>('communities');

  if (nodes.length === 0) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="No Graph Data" color="gray">
        Add nodes and edges to the graph to run algorithms.
      </Alert>
    );
  }

  return (
    <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'communities')}>
      <Tabs.List mb="md">
        {TAB_CONFIG.map((tab) => (
          <Tabs.Tab
            key={tab.value}
            value={tab.value}
            leftSection={<tab.icon size={16} />}
          >
            <Stack gap={0}>
              <Text size="sm" fw={500}>{tab.label}</Text>
              <Text size="xs" c="dimmed">{tab.subtitle}</Text>
            </Stack>
          </Tabs.Tab>
        ))}
      </Tabs.List>

      <Tabs.Panel value="communities">
        <CommunitiesTab
          nodes={nodes}
          edges={edges}
          onHighlightNodes={onHighlightNodes}
          onHighlightPath={onHighlightPath}
          onSelectCommunity={onSelectCommunity}
          onCommunitiesDetected={onCommunitiesDetected}
        />
      </Tabs.Panel>

      <Tabs.Panel value="paths">
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
      </Tabs.Panel>

      <Tabs.Panel value="structure">
        <StructureTab
          nodes={nodes}
          edges={edges}
          onHighlightNodes={onHighlightNodes}
          onHighlightPath={onHighlightPath}
        />
      </Tabs.Panel>

      <Tabs.Panel value="patterns">
        <PatternsTab
          nodes={nodes}
          edges={edges}
          onHighlightNodes={onHighlightNodes}
          onHighlightPath={onHighlightPath}
        />
      </Tabs.Panel>
    </Tabs>
  );
}
