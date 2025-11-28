/**
 * Graph Algorithms Panel
 * UI component for running and displaying graph algorithm results
 *
 * @module components/algorithms/GraphAlgorithmsPanel
 */

import type { GraphNode, GraphEdge } from '@bibgraph/types';
import {
  Accordion,
  Badge,
  Box,
  Button,
  Card,
  Group,
  NumberInput,
  Progress,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
  List,
  ThemeIcon,
  rem,
  Alert,
} from '@mantine/core';
import {
  IconCircleCheck,
  IconCircleDot,
  IconGraph,
  IconRoute,
  IconUsers,
  IconNetwork,
  IconAlertCircle,
  IconChartDonut,
  IconHierarchy,
} from '@tabler/icons-react';
import React, { useState, useMemo } from 'react';

import {
  useGraphStatistics,
  useCommunityDetection,
  useConnectedComponents,
  useCycleDetection,
  useKCore,
  type CommunityDetectionOptions,
} from '@/hooks/use-graph-algorithms';
import { findShortestPath, type PathResult, type ClusteringAlgorithm } from '@/services/graph-algorithms';

export interface CommunityResult {
  id: number;
  nodeIds: string[];
  size: number;
  density: number;
}

interface GraphAlgorithmsPanelProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onHighlightNodes?: (nodeIds: string[]) => void;
  onHighlightPath?: (path: string[]) => void;
  onSelectCommunity?: (communityId: number, nodeIds: string[]) => void;
  /** Callback when community detection completes with all communities */
  onCommunitiesDetected?: (communities: CommunityResult[], communityColors: Map<number, string>) => void;
}

/**
 * Algorithm descriptions for user guidance
 */
const ALGORITHM_INFO = {
  louvain: 'Fast community detection using modularity optimization. Best for large graphs.',
  leiden: 'Improved version of Louvain with better community quality. Slightly slower.',
  'label-propagation': 'Simple and fast. Uses label spreading to find communities.',
};

/**
 * Panel for running and displaying graph algorithm results
 */
export function GraphAlgorithmsPanel({
  nodes,
  edges,
  onHighlightNodes,
  onHighlightPath,
  onSelectCommunity,
  onCommunitiesDetected,
}: GraphAlgorithmsPanelProps) {
  // Statistics hook
  const statistics = useGraphStatistics(nodes, edges, true);

  // Community detection state and hook
  const [communityAlgorithm, setCommunityAlgorithm] = useState<ClusteringAlgorithm>('louvain');
  const [resolution, setResolution] = useState<number>(1.0);

  const communityOptions: CommunityDetectionOptions = useMemo(
    () => ({ algorithm: communityAlgorithm, resolution }),
    [communityAlgorithm, resolution]
  );

  const { communities, modularity, isComputing } = useCommunityDetection(
    nodes,
    edges,
    communityOptions
  );

  // Connected components hook
  const connectedComponents = useConnectedComponents(nodes, edges, { directed: false });

  // Cycle detection hook
  const hasCycles = useCycleDetection(nodes, edges, true);

  // K-core state and hook
  const [kCoreValue, setKCoreValue] = useState<number>(2);
  const kCore = useKCore(nodes, edges, kCoreValue);

  // Path finding state
  const [pathSource, setPathSource] = useState<string | null>(null);
  const [pathTarget, setPathTarget] = useState<string | null>(null);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);

  // Create node options for select dropdowns
  const nodeOptions = useMemo(
    () =>
      nodes.map((node) => ({
        value: node.id,
        label: node.label || node.id,
      })),
    [nodes]
  );

  // Handle path finding
  const handleFindPath = () => {
    if (pathSource && pathTarget) {
      const result = findShortestPath(nodes, edges, pathSource, pathTarget, true);
      setPathResult(result);
      if (result.found && onHighlightPath) {
        onHighlightPath(result.path);
      }
    }
  };

  // Handle community selection
  const handleCommunityClick = (communityId: number, nodeIds: string[]) => {
    if (onHighlightNodes) {
      onHighlightNodes(nodeIds);
    }
    if (onSelectCommunity) {
      onSelectCommunity(communityId, nodeIds);
    }
  };

  // Handle k-core highlight
  const handleKCoreHighlight = () => {
    if (onHighlightNodes && kCore.nodes.length > 0) {
      onHighlightNodes(kCore.nodes);
    }
  };

  // Sort communities by size
  const sortedCommunities = useMemo(
    () => [...communities].sort((a, b) => b.size - a.size),
    [communities]
  );

  // Community colors for visualization
  const communityColors = useMemo(() => {
    const colors = [
      '#3b82f6', // blue
      '#22c55e', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange
      '#6366f1', // indigo
    ];
    const colorMap = new Map<number, string>();
    sortedCommunities.forEach((community, index) => {
      colorMap.set(community.id, colors[index % colors.length]);
    });
    return colorMap;
  }, [sortedCommunities]);

  // Notify parent when communities are detected
  React.useEffect(() => {
    if (onCommunitiesDetected && sortedCommunities.length > 0) {
      onCommunitiesDetected(sortedCommunities, communityColors);
    }
  }, [sortedCommunities, communityColors, onCommunitiesDetected]);

  if (nodes.length === 0) {
    return (
      <Card withBorder p="md">
        <Alert icon={<IconAlertCircle size={16} />} title="No Graph Data" color="gray">
          Add nodes and edges to the graph to run algorithms.
        </Alert>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      {/* Graph Statistics Card */}
      <Card withBorder p="md">
        <Title order={5} mb="sm">
          <Group gap="xs">
            <IconGraph size={18} />
            Graph Statistics
          </Group>
        </Title>

        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Nodes</Text>
            <Badge variant="light">{statistics.nodeCount}</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Edges</Text>
            <Badge variant="light">{statistics.edgeCount}</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Density</Text>
            <Badge variant="light">{(statistics.density * 100).toFixed(2)}%</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Avg. Degree</Text>
            <Badge variant="light">{statistics.averageDegree.toFixed(2)}</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Connected</Text>
            <Badge color={statistics.isConnected ? 'green' : 'yellow'} variant="light">
              {statistics.isConnected ? 'Yes' : 'No'}
            </Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Components</Text>
            <Badge variant="light">{statistics.componentCount}</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Has Cycles</Text>
            <Badge color={hasCycles ? 'blue' : 'gray'} variant="light">
              {hasCycles ? 'Yes' : 'No'}
            </Badge>
          </Group>
        </Stack>
      </Card>

      {/* Algorithms Accordion */}
      <Accordion variant="separated" defaultValue="communities">
        {/* Community Detection */}
        <Accordion.Item value="communities">
          <Accordion.Control icon={<IconUsers size={18} />}>
            Community Detection
            {communities.length > 0 && (
              <Badge ml="xs" size="sm" variant="light">
                {communities.length} communities
              </Badge>
            )}
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              {/* Algorithm Selection */}
              <Select
                label="Algorithm"
                description={ALGORITHM_INFO[communityAlgorithm]}
                data={[
                  { value: 'louvain', label: 'Louvain' },
                  { value: 'leiden', label: 'Leiden' },
                  { value: 'label-propagation', label: 'Label Propagation' },
                ]}
                value={communityAlgorithm}
                onChange={(value) => setCommunityAlgorithm(value as ClusteringAlgorithm)}
              />

              {/* Resolution Parameter */}
              {communityAlgorithm !== 'label-propagation' && (
                <NumberInput
                  label="Resolution"
                  description="Higher = more communities, Lower = fewer communities"
                  value={resolution}
                  onChange={(value) => setResolution(typeof value === 'number' ? value : 1.0)}
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  decimalScale={2}
                />
              )}

              {/* Modularity Score */}
              {communities.length > 0 && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Modularity Score</Text>
                  <Tooltip label="Quality metric (higher is better, 0.3-0.7 typical)">
                    <Badge
                      color={modularity > 0.4 ? 'green' : modularity > 0.2 ? 'yellow' : 'red'}
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
                    {sortedCommunities.slice(0, 10).map((community) => (
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
                    {sortedCommunities.length > 10 && (
                      <Text size="xs" c="dimmed" mt="xs">
                        +{sortedCommunities.length - 10} more communities
                      </Text>
                    )}
                  </List>
                </Box>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Shortest Path */}
        <Accordion.Item value="path">
          <Accordion.Control icon={<IconRoute size={18} />}>
            Shortest Path
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Select
                label="Source Node"
                placeholder="Select starting node"
                data={nodeOptions}
                value={pathSource}
                onChange={setPathSource}
                searchable
                clearable
              />
              <Select
                label="Target Node"
                placeholder="Select destination node"
                data={nodeOptions}
                value={pathTarget}
                onChange={setPathTarget}
                searchable
                clearable
              />
              <Button
                onClick={handleFindPath}
                disabled={!pathSource || !pathTarget}
                leftSection={<IconRoute size={16} />}
              >
                Find Path
              </Button>

              {pathResult && (
                <Card withBorder p="sm" bg="gray.0">
                  {pathResult.found ? (
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="sm" fw={500} c="green">
                          <IconCircleCheck size={16} style={{ verticalAlign: 'middle' }} /> Path Found
                        </Text>
                        <Badge variant="light">{pathResult.distance} hops</Badge>
                      </Group>
                      <Text size="xs" c="dimmed">
                        Path: {pathResult.path.length} nodes
                      </Text>
                    </Stack>
                  ) : (
                    <Text size="sm" c="red">
                      <IconAlertCircle size={16} style={{ verticalAlign: 'middle' }} /> No path exists
                    </Text>
                  )}
                </Card>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Connected Components */}
        <Accordion.Item value="components">
          <Accordion.Control icon={<IconNetwork size={18} />}>
            Connected Components
            <Badge ml="xs" size="sm" variant="light">
              {connectedComponents.count}
            </Badge>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              {connectedComponents.components.length > 0 && (
                <List spacing="xs" size="sm">
                  {connectedComponents.components.slice(0, 5).map((component, index) => (
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
                  {connectedComponents.components.length > 5 && (
                    <Text size="xs" c="dimmed">
                      +{connectedComponents.components.length - 5} more components
                    </Text>
                  )}
                </List>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* K-Core Decomposition */}
        <Accordion.Item value="kcore">
          <Accordion.Control icon={<IconHierarchy size={18} />}>
            K-Core Decomposition
            {kCore.nodes.length > 0 && (
              <Badge ml="xs" size="sm" variant="light">
                {kCore.nodes.length} nodes
              </Badge>
            )}
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <NumberInput
                label="K Value"
                description="Minimum degree for nodes in the k-core"
                value={kCoreValue}
                onChange={(value) => setKCoreValue(typeof value === 'number' ? value : 2)}
                min={1}
                max={20}
                step={1}
              />

              {kCore.nodes.length > 0 ? (
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Nodes in {kCoreValue}-core</Text>
                    <Badge variant="light">{kCore.nodes.length}</Badge>
                  </Group>
                  <Button
                    variant="light"
                    size="xs"
                    onClick={handleKCoreHighlight}
                    leftSection={<IconChartDonut size={14} />}
                  >
                    Highlight K-Core
                  </Button>
                </Stack>
              ) : (
                <Text size="sm" c="dimmed">
                  No {kCoreValue}-core exists (try a lower k value)
                </Text>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
