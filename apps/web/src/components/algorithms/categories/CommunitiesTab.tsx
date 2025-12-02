/**
 * Communities Tab
 * Find clusters, communities, and dense regions
 *
 * @module components/algorithms/categories/CommunitiesTab
 */

import { Accordion } from '@mantine/core';
import {
  IconUsers,
  IconHierarchy,
  IconChartDonut,
  IconFocusCentered,
  IconChartBar,
} from '@tabler/icons-react';
import { useState, useCallback } from 'react';

import {
  CommunityDetectionItem,
  KCoreItem,
  KTrussItem,
  CorePeripheryItem,
  ClusterQualityItem,
} from '../items';
import type { CategoryTabProps, CommunityResult } from '../types';

export function CommunitiesTab({
  nodes,
  edges,
  onHighlightNodes,
  onSelectCommunity,
  onCommunitiesDetected,
}: CategoryTabProps) {
  // Track communities for cluster quality metrics
  const [communities, setCommunities] = useState<CommunityResult[]>([]);

  // Memoize callback to prevent infinite re-render loop
  // This is passed to CommunityDetectionItem which has a useEffect depending on it
  const handleCommunitiesDetected = useCallback(
    (detectedCommunities: CommunityResult[], colors: Map<number, string>) => {
      setCommunities(detectedCommunities);
      onCommunitiesDetected?.(detectedCommunities, colors);
    },
    [onCommunitiesDetected]
  );

  return (
    <Accordion multiple defaultValue={['community-detection']}>
      <Accordion.Item value="community-detection">
        <Accordion.Control icon={<IconUsers size={18} />}>
          Community Detection
        </Accordion.Control>
        <Accordion.Panel>
          <CommunityDetectionItem
            nodes={nodes}
            edges={edges}
            onHighlightNodes={onHighlightNodes}
            onSelectCommunity={onSelectCommunity}
            onCommunitiesDetected={handleCommunitiesDetected}
          />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="k-core">
        <Accordion.Control icon={<IconHierarchy size={18} />}>
          K-Core Decomposition
        </Accordion.Control>
        <Accordion.Panel>
          <KCoreItem
            nodes={nodes}
            edges={edges}
            onHighlightNodes={onHighlightNodes}
          />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="k-truss">
        <Accordion.Control icon={<IconChartDonut size={18} />}>
          K-Truss Decomposition
        </Accordion.Control>
        <Accordion.Panel>
          <KTrussItem
            nodes={nodes}
            edges={edges}
            onHighlightNodes={onHighlightNodes}
          />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="core-periphery">
        <Accordion.Control icon={<IconFocusCentered size={18} />}>
          Core-Periphery
        </Accordion.Control>
        <Accordion.Panel>
          <CorePeripheryItem
            nodes={nodes}
            edges={edges}
            onHighlightNodes={onHighlightNodes}
          />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="cluster-quality">
        <Accordion.Control icon={<IconChartBar size={18} />}>
          Cluster Quality Metrics
        </Accordion.Control>
        <Accordion.Panel>
          <ClusterQualityItem
            nodes={nodes}
            edges={edges}
            communities={communities}
          />
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
