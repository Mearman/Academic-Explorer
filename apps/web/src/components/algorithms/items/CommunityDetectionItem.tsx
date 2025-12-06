/**
 * Community Detection Algorithm Item
 * Detects communities using various clustering algorithms
 * @module components/algorithms/items/CommunityDetectionItem
 */

import {
  Badge,
  Box,
  Group,
  List,
  NumberInput,
  Progress,
  rem,
  Select,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { IconCircleDot } from '@tabler/icons-react';
import React, { useEffect,useMemo, useState } from 'react';

import { type CommunityDetectionOptions,useCommunityDetection } from '@/hooks/use-graph-algorithms';
import type { ClusteringAlgorithm } from '@/services/graph-algorithms';

import {
  COMMUNITY_COLORS,
  COMMUNITY_DETECTION,
  type LinkageMethod,
  QUALITY_THRESHOLDS,
} from '../constants';
import type { CommunityAlgorithmProps } from '../types';

/**
 * Algorithm descriptions for user guidance
 */
const ALGORITHM_INFO: Record<ClusteringAlgorithm, string> = {
  louvain: 'Fast community detection using modularity optimization. Best for large graphs.',
  leiden: 'Improved version of Louvain with better community quality. Slightly slower.',
  'label-propagation': 'Simple and fast. Uses label spreading to find communities.',
  infomap: 'Information-theoretic approach. Finds communities by minimizing flow description length.',
  spectral: 'Uses graph eigenvalues for balanced partitioning. Good for k-way partitions.',
  hierarchical: 'Agglomerative clustering that builds a dendrogram. Supports different linkage methods.',
};

export const CommunityDetectionItem = ({
  nodes,
  edges,
  onHighlightNodes,
  onSelectCommunity,
  onCommunitiesDetected,
}: CommunityAlgorithmProps) => {
  // Community detection state
  const [communityAlgorithm, setCommunityAlgorithm] = useState<ClusteringAlgorithm>('louvain');
  const [resolution, setResolution] = useState<number>(COMMUNITY_DETECTION.RESOLUTION_DEFAULT);
  const [numClusters, setNumClusters] = useState<number>(COMMUNITY_DETECTION.NUM_CLUSTERS_DEFAULT);
  const [linkage, setLinkage] = useState<LinkageMethod>(COMMUNITY_DETECTION.LINKAGE_DEFAULT);

  const communityOptions: CommunityDetectionOptions = useMemo(
    () => ({ algorithm: communityAlgorithm, resolution, numClusters, linkage }),
    [communityAlgorithm, resolution, numClusters, linkage]
  );

  const { communities, modularity, isComputing } = useCommunityDetection(
    nodes,
    edges,
    communityOptions
  );

  // Sort communities by size
  const sortedCommunities = useMemo(
    () => [...communities].sort((a, b) => b.size - a.size),
    [communities]
  );

  // Community colors for visualization
  const communityColors = useMemo(() => {
    const colorMap = new Map<number, string>();
    sortedCommunities.forEach((community, index) => {
      colorMap.set(community.id, COMMUNITY_COLORS[index % COMMUNITY_COLORS.length]);
    });
    return colorMap;
  }, [sortedCommunities]);

  // Notify parent when communities are detected
  useEffect(() => {
    if (onCommunitiesDetected && sortedCommunities.length > 0) {
      onCommunitiesDetected(sortedCommunities, communityColors);
    }
  }, [sortedCommunities, communityColors, onCommunitiesDetected]);

  // Handle community selection
  const handleCommunityClick = (communityId: number, nodeIds: string[]) => {
    if (onHighlightNodes) {
      onHighlightNodes(nodeIds);
    }
    if (onSelectCommunity) {
      onSelectCommunity(communityId, nodeIds);
    }
  };

  return (
    <Stack gap="sm">
      {/* Algorithm Selection */}
      <Select
        label="Algorithm"
        description={ALGORITHM_INFO[communityAlgorithm]}
        data={[
          {
            group: 'Modularity-based',
            items: [
              { value: 'louvain', label: 'Louvain' },
              { value: 'leiden', label: 'Leiden' },
            ],
          },
          {
            group: 'Propagation-based',
            items: [
              { value: 'label-propagation', label: 'Label Propagation' },
            ],
          },
          {
            group: 'Information-theoretic',
            items: [
              { value: 'infomap', label: 'Infomap' },
            ],
          },
          {
            group: 'Matrix-based',
            items: [
              { value: 'spectral', label: 'Spectral Partitioning' },
            ],
          },
          {
            group: 'Agglomerative',
            items: [
              { value: 'hierarchical', label: 'Hierarchical Clustering' },
            ],
          },
        ]}
        value={communityAlgorithm}
        onChange={(value) => setCommunityAlgorithm(value as ClusteringAlgorithm)}
      />

      {/* Resolution Parameter - for louvain, leiden */}
      {(communityAlgorithm === 'louvain' || communityAlgorithm === 'leiden') && (
        <NumberInput
          label="Resolution"
          description="Higher = more communities, Lower = fewer communities"
          value={resolution}
          onChange={(value) => setResolution(typeof value === 'number' ? value : COMMUNITY_DETECTION.RESOLUTION_DEFAULT)}
          min={COMMUNITY_DETECTION.RESOLUTION_MIN}
          max={COMMUNITY_DETECTION.RESOLUTION_MAX}
          step={COMMUNITY_DETECTION.RESOLUTION_STEP}
          decimalScale={2}
        />
      )}

      {/* Number of clusters - for spectral and hierarchical */}
      {(communityAlgorithm === 'spectral' || communityAlgorithm === 'hierarchical') && (
        <NumberInput
          label="Number of Clusters"
          description="Target number of communities/partitions"
          value={numClusters}
          onChange={(value) => setNumClusters(typeof value === 'number' ? value : COMMUNITY_DETECTION.NUM_CLUSTERS_DEFAULT)}
          min={COMMUNITY_DETECTION.NUM_CLUSTERS_MIN}
          max={COMMUNITY_DETECTION.NUM_CLUSTERS_MAX}
          step={1}
        />
      )}

      {/* Linkage method - for hierarchical */}
      {communityAlgorithm === 'hierarchical' && (
        <Select
          label="Linkage Method"
          description="How to measure distance between clusters"
          data={[
            { value: 'single', label: 'Single (minimum)' },
            { value: 'complete', label: 'Complete (maximum)' },
            { value: 'average', label: 'Average (UPGMA)' },
          ]}
          value={linkage}
          onChange={(value) => setLinkage(value as 'single' | 'complete' | 'average')}
        />
      )}

      {/* Modularity Score */}
      {communities.length > 0 && (
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Modularity Score</Text>
          <Tooltip label="Quality metric (higher is better, 0.3-0.7 typical)">
            <Badge
              color={modularity > QUALITY_THRESHOLDS.MODULARITY.EXCELLENT ? 'green' : (modularity > QUALITY_THRESHOLDS.MODULARITY.GOOD ? 'yellow' : 'red')}
              variant="light"
            >
              {modularity.toFixed(4)}
            </Badge>
          </Tooltip>
        </Group>
      )}

      {/* Loading indicator */}
      {isComputing && <Progress value={100} animated size="xs" />}

      {/* Community List */}
      {sortedCommunities.length > 0 && (
        <Box>
          <Text size="sm" fw={500} mb="xs">
            Communities (sorted by size)
          </Text>
          <List spacing="xs" size="sm">
            {sortedCommunities.map((community) => (
              <List.Item
                key={community.id}
                icon={
                  <ThemeIcon
                    size={20}
                    radius="xl"
                    style={{ backgroundColor: communityColors.get(community.id) }}
                  >
                    <IconCircleDot size={12} />
                  </ThemeIcon>
                }
                style={{ cursor: 'pointer' }}
                onClick={() => handleCommunityClick(community.id, community.nodeIds)}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm" truncate style={{ maxWidth: rem(150) }}>
                    Community {community.id + 1}
                  </Text>
                  <Group gap="xs" wrap="nowrap">
                    <Badge size="xs" variant="light">
                      {community.size} nodes
                    </Badge>
                    <Badge size="xs" variant="outline">
                      {(community.density * 100).toFixed(0)}% dense
                    </Badge>
                  </Group>
                </Group>
              </List.Item>
            ))}
            </List>
        </Box>
      )}
    </Stack>
  );
};
