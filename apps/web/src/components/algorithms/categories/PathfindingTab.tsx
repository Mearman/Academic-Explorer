/**
 * Pathfinding Tab
 * Navigation, routing, traversal, and neighborhoods
 * @module components/algorithms/categories/PathfindingTab
 */

import { Accordion } from '@mantine/core';
import {
  IconArrowsShuffle,
  IconPoint,
  IconRoute,
} from '@tabler/icons-react';

import {
  EgoNetworkItem,
  ShortestPathItem,
  TraversalItem,
} from '../items';
import type { CategoryTabProps } from '../types';

export const PathfindingTab = ({
  nodes,
  edges,
  onHighlightNodes,
  onHighlightPath,
  pathSource,
  pathTarget,
  onPathSourceChange,
  onPathTargetChange,
}: CategoryTabProps) => <Accordion multiple defaultValue={['shortest-path']}>
      <Accordion.Item value="shortest-path">
        <Accordion.Control icon={<IconRoute size={18} />}>
          Shortest Path
        </Accordion.Control>
        <Accordion.Panel>
          <ShortestPathItem
            nodes={nodes}
            edges={edges}
            onHighlightPath={onHighlightPath}
            pathSource={pathSource}
            pathTarget={pathTarget}
            onPathSourceChange={onPathSourceChange}
            onPathTargetChange={onPathTargetChange}
          />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="traversal">
        <Accordion.Control icon={<IconArrowsShuffle size={18} />}>
          Graph Traversal (BFS/DFS)
        </Accordion.Control>
        <Accordion.Panel>
          <TraversalItem
            nodes={nodes}
            edges={edges}
            onHighlightNodes={onHighlightNodes}
            onHighlightPath={onHighlightPath}
          />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="ego-network">
        <Accordion.Control icon={<IconPoint size={18} />}>
          Ego Network
        </Accordion.Control>
        <Accordion.Panel>
          <EgoNetworkItem
            nodes={nodes}
            edges={edges}
            onHighlightNodes={onHighlightNodes}
          />
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>;
