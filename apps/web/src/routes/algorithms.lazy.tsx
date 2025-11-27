/**
 * Algorithms Page - Graph algorithms demonstration and analysis
 */

import type { GraphNode, GraphEdge, EntityType } from '@academic-explorer/types';
import { RelationType } from '@academic-explorer/types';
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
} from '@mantine/core';
import {
  IconGraph,
  IconRefresh,
  IconInfoCircle,
} from '@tabler/icons-react';
import { createLazyFileRoute } from '@tanstack/react-router';
import React, { useState, useCallback, useMemo } from 'react';

import { GraphAlgorithmsPanel } from '@/components/algorithms/GraphAlgorithmsPanel';
import { MainLayout } from '@/components/layout/MainLayout';

/**
 * Generate sample academic graph data for demonstration
 */
function generateSampleGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Create sample works (papers)
  const workIds = Array.from({ length: 20 }, (_, i) => `W${i + 1}`);
  const authorIds = Array.from({ length: 8 }, (_, i) => `A${i + 1}`);
  const institutionIds = Array.from({ length: 4 }, (_, i) => `I${i + 1}`);

  // Add work nodes
  workIds.forEach((id, index) => {
    nodes.push({
      id,
      entityType: 'works' as EntityType,
      label: `Research Paper ${index + 1}`,
      entityId: id,
      x: Math.random() * 800 - 400,
      y: Math.random() * 600 - 300,
      externalIds: [],
    });
  });

  // Add author nodes
  authorIds.forEach((id, index) => {
    nodes.push({
      id,
      entityType: 'authors' as EntityType,
      label: `Author ${String.fromCharCode(65 + index)}`,
      entityId: id,
      x: Math.random() * 800 - 400,
      y: Math.random() * 600 - 300,
      externalIds: [],
    });
  });

  // Add institution nodes
  institutionIds.forEach((id, index) => {
    nodes.push({
      id,
      entityType: 'institutions' as EntityType,
      label: `University ${index + 1}`,
      entityId: id,
      x: Math.random() * 800 - 400,
      y: Math.random() * 600 - 300,
      externalIds: [],
    });
  });

  // Create authorship edges (works -> authors)
  // Each paper has 1-3 authors
  let edgeId = 1;
  workIds.forEach((workId) => {
    const numAuthors = Math.floor(Math.random() * 3) + 1;
    const selectedAuthors = new Set<string>();
    while (selectedAuthors.size < numAuthors) {
      selectedAuthors.add(authorIds[Math.floor(Math.random() * authorIds.length)]);
    }
    selectedAuthors.forEach((authorId) => {
      edges.push({
        id: `E${edgeId++}`,
        source: workId,
        target: authorId,
        type: RelationType.AUTHORSHIP,
      });
    });
  });

  // Create affiliation edges (authors -> institutions)
  // Each author affiliated with 1-2 institutions
  authorIds.forEach((authorId) => {
    const numAffiliations = Math.floor(Math.random() * 2) + 1;
    const selectedInstitutions = new Set<string>();
    while (selectedInstitutions.size < numAffiliations) {
      selectedInstitutions.add(institutionIds[Math.floor(Math.random() * institutionIds.length)]);
    }
    selectedInstitutions.forEach((instId) => {
      edges.push({
        id: `E${edgeId++}`,
        source: authorId,
        target: instId,
        type: RelationType.AFFILIATION,
      });
    });
  });

  // Create citation edges (works -> works)
  // Create a somewhat realistic citation network
  workIds.forEach((workId, index) => {
    // Earlier papers cite later papers (simulating time ordering)
    const numCitations = Math.floor(Math.random() * 4);
    for (let i = 0; i < numCitations; i++) {
      const targetIndex = Math.floor(Math.random() * workIds.length);
      if (targetIndex !== index) {
        edges.push({
          id: `E${edgeId++}`,
          source: workId,
          target: workIds[targetIndex],
          type: RelationType.REFERENCE,
        });
      }
    }
  });

  return { nodes, edges };
}

/**
 * Algorithms demonstration page
 */
function AlgorithmsPage() {
  // Sample graph state
  const [graphData, setGraphData] = useState(() => generateSampleGraph());
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);

  // Regenerate sample data
  const handleRegenerateGraph = useCallback(() => {
    setGraphData(generateSampleGraph());
    setHighlightedNodes(new Set());
    setHighlightedPath([]);
  }, []);

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
    <MainLayout>
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

          {/* Main Content Grid */}
          <Grid>
            {/* Left: Graph Data Summary */}
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Stack gap="md">
                {/* Graph Summary Card */}
                <Card withBorder p="md">
                  <Title order={5} mb="sm">Sample Graph Data</Title>

                  <Stack gap="xs">
                    <Text size="sm" fw={500}>Nodes by Type</Text>
                    <Group gap="xs" wrap="wrap">
                      {Object.entries(nodeTypeCounts).map(([type, count]) => (
                        <Badge key={type} variant="light" size="sm">
                          {type}: {count}
                        </Badge>
                      ))}
                    </Group>

                    <Text size="sm" fw={500} mt="sm">Edges by Type</Text>
                    <Group gap="xs" wrap="wrap">
                      {Object.entries(edgeTypeCounts).map(([type, count]) => (
                        <Badge key={type} variant="outline" size="sm">
                          {type}: {count}
                        </Badge>
                      ))}
                    </Group>
                  </Stack>
                </Card>

                {/* Highlighted Nodes Card */}
                {highlightedNodes.size > 0 && (
                  <Card withBorder p="md">
                    <Title order={5} mb="sm">Highlighted Nodes</Title>
                    <Text size="sm" c="dimmed" mb="xs">
                      {highlightedNodes.size} nodes selected
                    </Text>
                    {highlightedPath.length > 0 && (
                      <Text size="xs" c="blue">
                        Path: {highlightedPath.join(' → ')}
                      </Text>
                    )}
                    <Button
                      variant="subtle"
                      size="xs"
                      mt="sm"
                      onClick={() => {
                        setHighlightedNodes(new Set());
                        setHighlightedPath([]);
                      }}
                    >
                      Clear Selection
                    </Button>
                  </Card>
                )}
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
                />
              </Paper>
            </Grid.Col>
          </Grid>
        </Stack>
      </Container>
    </MainLayout>
  );
}

export const Route = createLazyFileRoute('/algorithms')({
  component: AlgorithmsPage,
});

export default AlgorithmsPage;
