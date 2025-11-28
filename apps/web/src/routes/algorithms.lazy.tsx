/**
 * Algorithms Page - Graph algorithms demonstration and analysis
 */

import type { GraphNode, GraphEdge, EntityType } from '@bibgraph/types';
import { RelationType } from '@bibgraph/types';
import {
  Container,
  Title,
  Text,
  Stack,
  Grid,
  Card,
  Group,
  Badge,
  Button,
  Paper,
  Box,
  Alert,
  SegmentedControl,
  Switch,
  NumberInput,
  Slider,
  RangeSlider,
  Divider,
} from '@mantine/core';
import {
  IconGraph,
  IconRefresh,
  IconInfoCircle,
  IconLock,
  IconLockOpen,
} from '@tabler/icons-react';
import { createLazyFileRoute } from '@tanstack/react-router';
import React, { useState, useCallback, useMemo } from 'react';

import { GraphAlgorithmsPanel, type CommunityResult } from '@/components/algorithms/GraphAlgorithmsPanel';
import { ForceGraphVisualization, type DisplayMode } from '@/components/graph/ForceGraphVisualization';

/**
 * Configuration for sample graph generation
 * All ranges are [min, max] tuples
 */
interface SampleGraphConfig {
  /** Random seed for reproducible graphs (null = use Math.random) */
  seed: number | null;
  /** Number of disconnected graph components */
  componentCount: number;
  /** Range for edges per node [min, max] - each node gets a random value in range */
  edgesPerNodeRange: [number, number];
  /** Range for number of work nodes [min, max] */
  workCountRange: [number, number];
  /** Range for number of author nodes [min, max] */
  authorCountRange: [number, number];
  /** Range for number of institution nodes [min, max] */
  institutionCountRange: [number, number];
}

const DEFAULT_CONFIG: SampleGraphConfig = {
  seed: 42,
  componentCount: 1,
  edgesPerNodeRange: [1, 4],
  workCountRange: [15, 25],
  authorCountRange: [6, 10],
  institutionCountRange: [2, 6],
};

/**
 * Simple seeded pseudo-random number generator (Mulberry32)
 * Returns values in [0, 1) like Math.random()
 */
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Distribute items into N buckets as evenly as possible
 */
function distributeToComponents<T>(items: T[], componentCount: number): T[][] {
  const components: T[][] = Array.from({ length: componentCount }, () => []);
  items.forEach((item, index) => {
    components[index % componentCount].push(item);
  });
  return components;
}

/**
 * Get a random integer within a range [min, max] inclusive
 */
function randomInRange(range: [number, number], random: () => number): number {
  const [min, max] = range;
  if (min === max) return min;
  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * Generate sample academic graph data for demonstration
 */
function generateSampleGraph(config: SampleGraphConfig = DEFAULT_CONFIG): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const {
    seed,
    componentCount,
    edgesPerNodeRange,
    workCountRange,
    authorCountRange,
    institutionCountRange,
  } = config;

  // Use seeded random if seed is provided, otherwise use Math.random
  const random = seed !== null ? createSeededRandom(seed) : Math.random;

  // Get actual node counts from ranges
  const actualWorkCount = randomInRange(workCountRange, random);
  const actualAuthorCount = randomInRange(authorCountRange, random);
  const actualInstitutionCount = randomInRange(institutionCountRange, random);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const edgeCounts = new Map<string, number>(); // Track edges per node
  const nodeEdgeTargets = new Map<string, number>(); // Per-node edge target (randomly assigned from range)

  // Helper to get current edge count
  const getEdgeCount = (nodeId: string) => edgeCounts.get(nodeId) || 0;
  const incrementEdgeCount = (nodeId: string) => edgeCounts.set(nodeId, getEdgeCount(nodeId) + 1);
  const getNodeEdgeTarget = (nodeId: string) => nodeEdgeTargets.get(nodeId) || edgesPerNodeRange[1];
  const canAddEdge = (nodeId: string) => getEdgeCount(nodeId) < getNodeEdgeTarget(nodeId);

  // Helper to initialize per-node edge target from range
  const initNodeEdgeTarget = (nodeId: string) => {
    const target = randomInRange(edgesPerNodeRange, random);
    nodeEdgeTargets.set(nodeId, target);
  };

  // Create node IDs using actual counts (with variance applied)
  const workIds = Array.from({ length: actualWorkCount }, (_, i) => `W${i + 1}`);
  const authorIds = Array.from({ length: actualAuthorCount }, (_, i) => `A${i + 1}`);
  const institutionIds = Array.from({ length: actualInstitutionCount }, (_, i) => `I${i + 1}`);

  // Distribute nodes across components
  const workComponents = distributeToComponents(workIds, componentCount);
  const authorComponents = distributeToComponents(authorIds, componentCount);
  const institutionComponents = distributeToComponents(institutionIds, componentCount);

  // Calculate component positioning for visual separation
  const componentOffsets = Array.from({ length: componentCount }, (_, i) => {
    const angle = (2 * Math.PI * i) / componentCount;
    const radius = componentCount > 1 ? 300 : 0;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });

  // Add all nodes with component-based positioning
  workIds.forEach((id, index) => {
    const componentIndex = index % componentCount;
    const offset = componentOffsets[componentIndex];
    nodes.push({
      id,
      entityType: 'works' as EntityType,
      label: `Paper ${index + 1}`,
      entityId: id,
      x: offset.x + (random() * 200 - 100),
      y: offset.y + (random() * 150 - 75),
      externalIds: [],
    });
    edgeCounts.set(id, 0);
    initNodeEdgeTarget(id);
  });

  authorIds.forEach((id, index) => {
    const componentIndex = index % componentCount;
    const offset = componentOffsets[componentIndex];
    nodes.push({
      id,
      entityType: 'authors' as EntityType,
      label: `Author ${String.fromCharCode(65 + (index % 26))}${index >= 26 ? Math.floor(index / 26) : ''}`,
      entityId: id,
      x: offset.x + (random() * 200 - 100),
      y: offset.y + (random() * 150 - 75),
      externalIds: [],
    });
    edgeCounts.set(id, 0);
    initNodeEdgeTarget(id);
  });

  institutionIds.forEach((id, index) => {
    const componentIndex = index % componentCount;
    const offset = componentOffsets[componentIndex];
    nodes.push({
      id,
      entityType: 'institutions' as EntityType,
      label: `University ${index + 1}`,
      entityId: id,
      x: offset.x + (random() * 200 - 100),
      y: offset.y + (random() * 150 - 75),
      externalIds: [],
    });
    edgeCounts.set(id, 0);
    initNodeEdgeTarget(id);
  });

  let edgeId = 1;
  const existingEdges = new Set<string>(); // Prevent duplicate edges

  const tryAddEdge = (source: string, target: string, type: RelationType): boolean => {
    const edgeKey = `${source}-${target}`;
    const reverseKey = `${target}-${source}`;
    if (existingEdges.has(edgeKey) || existingEdges.has(reverseKey)) return false;
    if (!canAddEdge(source) || !canAddEdge(target)) return false;
    if (source === target) return false;

    edges.push({ id: `E${edgeId++}`, source, target, type });
    existingEdges.add(edgeKey);
    incrementEdgeCount(source);
    incrementEdgeCount(target);
    return true;
  };

  // Create edges within each component
  for (let c = 0; c < componentCount; c++) {
    const compWorks = workComponents[c];
    const compAuthors = authorComponents[c];
    const compInstitutions = institutionComponents[c];

    // Create authorship edges (works -> authors)
    compWorks.forEach((workId) => {
      const numAuthors = Math.min(
        randomInRange(edgesPerNodeRange, random),
        compAuthors.length
      );
      const shuffledAuthors = [...compAuthors].sort(() => random() - 0.5);
      for (let i = 0; i < numAuthors && i < shuffledAuthors.length; i++) {
        tryAddEdge(workId, shuffledAuthors[i], RelationType.AUTHORSHIP);
      }
    });

    // Create affiliation edges (authors -> institutions)
    compAuthors.forEach((authorId) => {
      if (compInstitutions.length === 0) return;
      const numAffiliations = Math.min(
        Math.floor(random() * 2) + 1,
        compInstitutions.length
      );
      const shuffledInsts = [...compInstitutions].sort(() => random() - 0.5);
      for (let i = 0; i < numAffiliations && i < shuffledInsts.length; i++) {
        tryAddEdge(authorId, shuffledInsts[i], RelationType.AFFILIATION);
      }
    });

    // Create citation edges (works -> works)
    compWorks.forEach((workId) => {
      const numCitations = Math.floor(random() * Math.max(1, edgesPerNodeRange[1] - 1));
      const otherWorks = compWorks.filter(w => w !== workId);
      const shuffled = [...otherWorks].sort(() => random() - 0.5);
      for (let i = 0; i < numCitations && i < shuffled.length; i++) {
        tryAddEdge(workId, shuffled[i], RelationType.REFERENCE);
      }
    });
  }

  // Second pass: ensure minimum edges (best effort within component)
  const minEdgesTarget = edgesPerNodeRange[0];
  for (let c = 0; c < componentCount; c++) {
    const compNodes = [
      ...workComponents[c],
      ...authorComponents[c],
      ...institutionComponents[c],
    ];

    compNodes.forEach((nodeId) => {
      let attempts = 0;
      while (getEdgeCount(nodeId) < minEdgesTarget && attempts < 20) {
        const otherNodes = compNodes.filter(n => n !== nodeId && canAddEdge(n));
        if (otherNodes.length === 0) break;
        const target = otherNodes[Math.floor(random() * otherNodes.length)];
        tryAddEdge(nodeId, target, RelationType.REFERENCE);
        attempts++;
      }
    });
  }

  return { nodes, edges };
}

/**
 * Algorithms demonstration page
 */
function AlgorithmsPage() {
  // Sample graph configuration
  const [graphConfig, setGraphConfig] = useState<SampleGraphConfig>(DEFAULT_CONFIG);

  // Seed lock preference - when unlocked, regeneration picks a new random seed
  const [seedLocked, setSeedLocked] = useState(true);

  // Sample graph state
  const [graphData, setGraphData] = useState(() => generateSampleGraph(graphConfig));
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);

  // Display mode: highlight dims non-selected nodes, filter hides them
  const [displayMode, setDisplayMode] = useState<DisplayMode>('highlight');

  // Community assignments from algorithm results
  const [communityAssignments, setCommunityAssignments] = useState<Map<string, number>>(new Map());
  const [communityColors, setCommunityColors] = useState<Map<number, string>>(new Map());

  // Enable/disable force simulation
  const [enableSimulation, setEnableSimulation] = useState(true);

  // Shortest path node selections (synced with panel and node clicks)
  const [pathSource, setPathSource] = useState<string | null>(null);
  const [pathTarget, setPathTarget] = useState<string | null>(null);

  // Config update helper
  const updateConfig = useCallback(<K extends keyof SampleGraphConfig>(
    key: K,
    value: SampleGraphConfig[K]
  ) => {
    setGraphConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Regenerate sample data with current config
  const handleRegenerateGraph = useCallback(() => {
    let configToUse = graphConfig;

    // When seed is unlocked, generate a new random seed on each regeneration
    if (!seedLocked) {
      const newSeed = Math.floor(Math.random() * 10000);
      configToUse = { ...graphConfig, seed: newSeed };
      setGraphConfig(configToUse);
    }

    setGraphData(generateSampleGraph(configToUse));
    setHighlightedNodes(new Set());
    setHighlightedPath([]);
    setCommunityAssignments(new Map());
    setCommunityColors(new Map());
    setPathSource(null);
    setPathTarget(null);
  }, [graphConfig, seedLocked]);

  // Handle node highlighting from algorithm results
  const handleHighlightNodes = useCallback((nodeIds: string[]) => {
    setHighlightedNodes(new Set(nodeIds));
    setHighlightedPath([]);
  }, []);

  // Handle path highlighting
  const handleHighlightPath = useCallback((path: string[]) => {
    setHighlightedPath(path);
    setHighlightedNodes(new Set(path));
  }, []);

  // Handle community selection - updates both highlighting and community coloring
  const handleSelectCommunity = useCallback((communityId: number, nodeIds: string[]) => {
    setHighlightedNodes(new Set(nodeIds));
    setHighlightedPath([]);
  }, []);

  // Handle node click in the visualization
  // Clicking nodes sets them as source/target for shortest path
  const handleNodeClick = useCallback((node: GraphNode) => {
    // Update path source/target selection
    if (pathSource === node.id) {
      // Clicking source again clears it
      setPathSource(null);
      setHighlightedNodes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(node.id);
        return newSet;
      });
    } else if (pathTarget === node.id) {
      // Clicking target again clears it
      setPathTarget(null);
      setHighlightedNodes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(node.id);
        return newSet;
      });
    } else if (pathSource === null) {
      // No source set - this becomes the source
      setPathSource(node.id);
      setHighlightedNodes(new Set([node.id]));
      setHighlightedPath([]);
    } else if (pathTarget === null) {
      // Source set but no target - this becomes the target
      setPathTarget(node.id);
      setHighlightedNodes(new Set([pathSource, node.id]));
      setHighlightedPath([]);
    } else {
      // Both set - start over with this as new source
      setPathSource(node.id);
      setPathTarget(null);
      setHighlightedNodes(new Set([node.id]));
      setHighlightedPath([]);
    }
  }, [pathSource, pathTarget]);

  // Clear all highlights when clicking background
  const handleBackgroundClick = useCallback(() => {
    setHighlightedNodes(new Set());
    setHighlightedPath([]);
    setPathSource(null);
    setPathTarget(null);
  }, []);

  // Handle community detection results - update node coloring
  const handleCommunitiesDetected = useCallback((communities: CommunityResult[], colors: Map<number, string>) => {
    // Build node -> community assignment map
    const assignments = new Map<string, number>();
    communities.forEach((community) => {
      community.nodeIds.forEach((nodeId) => {
        assignments.set(nodeId, community.id);
      });
    });
    setCommunityAssignments(assignments);
    setCommunityColors(colors);
  }, []);

  // Calculate node type counts
  const nodeTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    graphData.nodes.forEach((node) => {
      counts[node.entityType] = (counts[node.entityType] || 0) + 1;
    });
    return counts;
  }, [graphData.nodes]);

  // Calculate edge type counts
  const edgeTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    graphData.edges.forEach((edge) => {
      counts[edge.type] = (counts[edge.type] || 0) + 1;
    });
    return counts;
  }, [graphData.edges]);

  return (
    <Container size="xl" py="md">
        <Stack gap="lg">
          {/* Page Header */}
          <Group justify="space-between" align="flex-start">
            <Box>
              <Title order={2}>
                <Group gap="xs">
                  <IconGraph size={28} />
                  Graph Algorithms
                </Group>
              </Title>
              <Text c="dimmed" mt="xs">
                Analyze graph structure using community detection, pathfinding, and more.
              </Text>
            </Box>
            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              onClick={handleRegenerateGraph}
            >
              Regenerate Sample Data
            </Button>
          </Group>

          {/* Info Alert */}
          <Alert icon={<IconInfoCircle size={16} />} title="Demo Mode" color="blue">
            This page demonstrates the graph algorithms package with sample academic data.
            Click "Regenerate Sample Data" to create a new random graph.
            The algorithms can analyze community structure, find paths, and detect graph properties.
          </Alert>

          {/* Graph Visualization */}
          <Card withBorder p="md">
            <Group justify="space-between" mb="md">
              <Title order={5}>Graph Visualization</Title>
              <Group gap="md">
                <Switch
                  label="Simulation"
                  checked={enableSimulation}
                  onChange={(e) => setEnableSimulation(e.currentTarget.checked)}
                  size="sm"
                />
                <SegmentedControl
                  size="xs"
                  value={displayMode}
                  onChange={(value) => setDisplayMode(value as DisplayMode)}
                  data={[
                    { label: 'Highlight', value: 'highlight' },
                    { label: 'Filter', value: 'filter' },
                  ]}
                />
              </Group>
            </Group>
            <ForceGraphVisualization
              nodes={graphData.nodes}
              edges={graphData.edges}
              height={450}
              displayMode={displayMode}
              highlightedNodeIds={highlightedNodes}
              highlightedPath={highlightedPath}
              communityAssignments={communityAssignments}
              communityColors={communityColors}
              enableSimulation={enableSimulation}
              onNodeClick={handleNodeClick}
              onBackgroundClick={handleBackgroundClick}
            />
            {highlightedNodes.size > 0 && (
              <Group mt="sm" gap="xs">
                <Text size="sm" c="dimmed">
                  {highlightedNodes.size} nodes selected
                </Text>
                {highlightedPath.length > 0 && (
                  <Text size="sm" c="blue">
                    Path: {highlightedPath.join(' → ')}
                  </Text>
                )}
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => {
                    setHighlightedNodes(new Set());
                    setHighlightedPath([]);
                  }}
                >
                  Clear
                </Button>
              </Group>
            )}
          </Card>

          {/* Main Content Grid */}
          <Grid>
            {/* Left: Graph Data Summary + Configuration */}
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Stack gap="md">
                {/* Configuration Card */}
                <Card withBorder p="md">
                  <Title order={5} mb="sm">Graph Configuration</Title>

                  <Stack gap="sm">
                    {/* Seed */}
                    <Group gap="xs" align="flex-end">
                      <NumberInput
                        label="Seed"
                        description={seedLocked ? "Locked - same graph each time" : "Unlocked - new seed on regenerate"}
                        value={graphConfig.seed ?? ''}
                        onChange={(val) => updateConfig('seed', typeof val === 'number' ? val : null)}
                        placeholder="Random"
                        allowNegative={false}
                        style={{ flex: 1 }}
                        size="xs"
                      />
                      <Button
                        variant={seedLocked ? "light" : "subtle"}
                        size="xs"
                        onClick={() => setSeedLocked(!seedLocked)}
                        title={seedLocked ? "Seed locked - click to unlock" : "Seed unlocked - click to lock"}
                        px="xs"
                      >
                        {seedLocked ? <IconLock size={14} /> : <IconLockOpen size={14} />}
                      </Button>
                      <Button
                        variant="subtle"
                        size="xs"
                        onClick={() => updateConfig('seed', Math.floor(Math.random() * 10000))}
                      >
                        Randomize
                      </Button>
                    </Group>

                    <Divider />

                    {/* Components */}
                    <Box>
                      <Text size="xs" fw={500} mb={4}>Components: {graphConfig.componentCount}</Text>
                      <Slider
                        value={graphConfig.componentCount}
                        onChange={(val) => updateConfig('componentCount', val)}
                        min={1}
                        max={6}
                        step={1}
                        marks={[
                          { value: 1, label: '1' },
                          { value: 3, label: '3' },
                          { value: 6, label: '6' },
                        ]}
                        size="sm"
                      />
                    </Box>

                    <Divider />

                    {/* Edges per Node */}
                    <Box>
                      <Text size="xs" fw={500} mb={4}>
                        Edges per Node: {graphConfig.edgesPerNodeRange[0]} - {graphConfig.edgesPerNodeRange[1]}
                      </Text>
                      <RangeSlider
                        value={graphConfig.edgesPerNodeRange}
                        onChange={(val) => updateConfig('edgesPerNodeRange', val)}
                        min={0}
                        max={10}
                        step={1}
                        minRange={0}
                        marks={[
                          { value: 0, label: '0' },
                          { value: 5, label: '5' },
                          { value: 10, label: '10' },
                        ]}
                        size="sm"
                      />
                    </Box>

                    <Divider />

                    {/* Node Counts */}
                    <Text size="xs" fw={500}>Node Counts (min - max)</Text>
                    <Stack gap="md">
                      <Box>
                        <Text size="xs" c="dimmed" mb={4}>
                          Works: {graphConfig.workCountRange[0]} - {graphConfig.workCountRange[1]}
                        </Text>
                        <RangeSlider
                          value={graphConfig.workCountRange}
                          onChange={(val) => updateConfig('workCountRange', val)}
                          min={1}
                          max={50}
                          step={1}
                          minRange={0}
                          marks={[
                            { value: 1, label: '1' },
                            { value: 25, label: '25' },
                            { value: 50, label: '50' },
                          ]}
                          size="sm"
                        />
                      </Box>
                      <Box>
                        <Text size="xs" c="dimmed" mb={4}>
                          Authors: {graphConfig.authorCountRange[0]} - {graphConfig.authorCountRange[1]}
                        </Text>
                        <RangeSlider
                          value={graphConfig.authorCountRange}
                          onChange={(val) => updateConfig('authorCountRange', val)}
                          min={1}
                          max={30}
                          step={1}
                          minRange={0}
                          marks={[
                            { value: 1, label: '1' },
                            { value: 15, label: '15' },
                            { value: 30, label: '30' },
                          ]}
                          size="sm"
                        />
                      </Box>
                      <Box>
                        <Text size="xs" c="dimmed" mb={4}>
                          Institutions: {graphConfig.institutionCountRange[0]} - {graphConfig.institutionCountRange[1]}
                        </Text>
                        <RangeSlider
                          value={graphConfig.institutionCountRange}
                          onChange={(val) => updateConfig('institutionCountRange', val)}
                          min={0}
                          max={15}
                          step={1}
                          minRange={0}
                          marks={[
                            { value: 0, label: '0' },
                            { value: 7, label: '7' },
                            { value: 15, label: '15' },
                          ]}
                          size="sm"
                        />
                      </Box>
                    </Stack>
                  </Stack>
                </Card>

                {/* Graph Summary Card */}
                <Card withBorder p="md">
                  <Title order={5} mb="sm">Current Graph Stats</Title>

                  <Stack gap="xs">
                    <Text size="sm" fw={500}>Nodes by Type ({graphData.nodes.length} total)</Text>
                    <Group gap="xs" wrap="wrap">
                      {Object.entries(nodeTypeCounts).map(([type, count]) => (
                        <Badge key={type} variant="light" size="sm">
                          {type}: {count}
                        </Badge>
                      ))}
                    </Group>

                    <Text size="sm" fw={500} mt="sm">Edges by Type ({graphData.edges.length} total)</Text>
                    <Group gap="xs" wrap="wrap">
                      {Object.entries(edgeTypeCounts).map(([type, count]) => (
                        <Badge key={type} variant="outline" size="sm">
                          {type}: {count}
                        </Badge>
                      ))}
                    </Group>
                  </Stack>
                </Card>
              </Stack>
            </Grid.Col>

            {/* Right: Algorithms Panel */}
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Paper withBorder p="md">
                <GraphAlgorithmsPanel
                  nodes={graphData.nodes}
                  edges={graphData.edges}
                  onHighlightNodes={handleHighlightNodes}
                  onHighlightPath={handleHighlightPath}
                  onSelectCommunity={handleSelectCommunity}
                  onCommunitiesDetected={handleCommunitiesDetected}
                  pathSource={pathSource}
                  pathTarget={pathTarget}
                  onPathSourceChange={setPathSource}
                  onPathTargetChange={setPathTarget}
                />
              </Paper>
            </Grid.Col>
          </Grid>
        </Stack>
    </Container>
  );
}

export const Route = createLazyFileRoute('/algorithms')({
  component: AlgorithmsPage,
});

export default AlgorithmsPage;
