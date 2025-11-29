/**
 * Structure Tab
 * Connectivity, components, and ordering analysis
 *
 * @module components/algorithms/categories/StructureTab
 */

import { Accordion, Badge, Stack, Text } from '@mantine/core';
import {
  IconNetwork,
  IconCircles,
  IconLink,
  IconArrowsSort,
} from '@tabler/icons-react';

import {
  ConnectedComponentsItem,
  SCCItem,
  BiconnectedItem,
  TopologicalSortItem,
} from '../items';
import { useConnectedComponents, useStronglyConnectedComponents, useCycleInfo } from '@/hooks/use-graph-algorithms';
import type { CategoryTabProps } from '../types';

export function StructureTab({
  nodes,
  edges,
  onHighlightNodes,
  onHighlightPath,
}: CategoryTabProps) {
  // Get counts for badges
  const connectedComponents = useConnectedComponents(nodes, edges, { directed: false });
  const stronglyConnectedComponents = useStronglyConnectedComponents(nodes, edges);
  const cycleInfo = useCycleInfo(nodes, edges, true);

  return (
    <Accordion multiple defaultValue={['connected-components']}>
      <Accordion.Item value="connected-components">
        <Accordion.Control icon={<IconNetwork size={18} />}>
          Connected Components
          <Badge ml="xs" size="sm" variant="light">
            {connectedComponents.count}
          </Badge>
        </Accordion.Control>
        <Accordion.Panel>
          <ConnectedComponentsItem
            nodes={nodes}
            edges={edges}
            onHighlightNodes={onHighlightNodes}
          />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="scc">
        <Accordion.Control icon={<IconCircles size={18} />}>
          Strongly Connected Components
          <Badge ml="xs" size="sm" variant="light">
            {stronglyConnectedComponents.count}
          </Badge>
        </Accordion.Control>
        <Accordion.Panel>
          <SCCItem
            nodes={nodes}
            edges={edges}
            onHighlightNodes={onHighlightNodes}
          />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="biconnected">
        <Accordion.Control icon={<IconLink size={18} />}>
          Biconnected Components
        </Accordion.Control>
        <Accordion.Panel>
          <BiconnectedItem
            nodes={nodes}
            edges={edges}
            onHighlightNodes={onHighlightNodes}
          />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="topological-sort">
        <Accordion.Control icon={<IconArrowsSort size={18} />}>
          Topological Sort / Cycles
          <Badge
            ml="xs"
            size="sm"
            variant="light"
            color={cycleInfo.hasCycle ? 'red' : 'green'}
          >
            {cycleInfo.hasCycle ? 'Has Cycles' : 'Acyclic'}
          </Badge>
        </Accordion.Control>
        <Accordion.Panel>
          <TopologicalSortItem
            nodes={nodes}
            edges={edges}
            onHighlightNodes={onHighlightNodes}
            onHighlightPath={onHighlightPath}
          />
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
