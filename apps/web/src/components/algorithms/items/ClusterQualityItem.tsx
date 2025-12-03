/**
 * Cluster Quality Metrics Algorithm Item
 * Displays quality metrics for the current community detection results
 * @module components/algorithms/items/ClusterQualityItem
 */

import {
  Alert,
  Badge,
  Group,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

import { useClusterQuality } from '@/hooks/use-graph-algorithms';

import type { AlgorithmItemBaseProps, CommunityResult } from '../types';

interface ClusterQualityItemProps extends AlgorithmItemBaseProps {
  communities: CommunityResult[];
}

export const ClusterQualityItem = ({
  nodes,
  edges,
  communities,
}: ClusterQualityItemProps) => {
  const clusterQuality = useClusterQuality(nodes, edges, communities);

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Quality metrics for the current community detection result.
        Run community detection first to see these metrics.
      </Text>

      {communities.length > 0 ? (
        <>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Modularity</Text>
            <Tooltip label="Community structure quality (-0.5 to 1.0, higher is better)">
              <Badge
                color={clusterQuality.modularity > 0.4 ? 'green' : (clusterQuality.modularity > 0.2 ? 'yellow' : 'red')}
                variant="light"
              >
                {clusterQuality.modularity.toFixed(4)}
              </Badge>
            </Tooltip>
          </Group>

          <Group justify="space-between">
            <Text size="sm" c="dimmed">Avg. Conductance</Text>
            <Tooltip label="Ratio of boundary to internal edges (0-1, lower is better)">
              <Badge
                color={clusterQuality.avgConductance < 0.3 ? 'green' : (clusterQuality.avgConductance < 0.5 ? 'yellow' : 'red')}
                variant="light"
              >
                {clusterQuality.avgConductance.toFixed(4)}
              </Badge>
            </Tooltip>
          </Group>

          <Group justify="space-between">
            <Text size="sm" c="dimmed">Avg. Density</Text>
            <Tooltip label="Internal edge density of clusters (0-1, higher is better)">
              <Badge
                color={clusterQuality.avgDensity > 0.5 ? 'green' : (clusterQuality.avgDensity > 0.2 ? 'yellow' : 'gray')}
                variant="light"
              >
                {(clusterQuality.avgDensity * 100).toFixed(1)}%
              </Badge>
            </Tooltip>
          </Group>

          <Group justify="space-between">
            <Text size="sm" c="dimmed">Coverage Ratio</Text>
            <Tooltip label="Fraction of edges within clusters (0-1, higher is better)">
              <Badge
                color={clusterQuality.coverageRatio > 0.7 ? 'green' : (clusterQuality.coverageRatio > 0.4 ? 'yellow' : 'gray')}
                variant="light"
              >
                {(clusterQuality.coverageRatio * 100).toFixed(1)}%
              </Badge>
            </Tooltip>
          </Group>

          <Group justify="space-between">
            <Text size="sm" c="dimmed">Number of Clusters</Text>
            <Badge variant="light">{clusterQuality.numClusters}</Badge>
          </Group>
        </>
      ) : (
        <Alert icon={<IconAlertCircle size={16} />} color="gray">
          Run community detection to see cluster quality metrics.
        </Alert>
      )}
    </Stack>
  );
};
