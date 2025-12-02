/**
 * Entity Graph Page - Visualizes repository entities as an interactive graph
 *
 * This page provides real-time visualization of entities stored in the
 * repository (IndexedDB), with support for:
 * - 2D/3D force-directed layouts
 * - Community detection and pathfinding algorithms
 * - Interactive node exploration
 * - Entity type filtering
 *
 * @module routes/graph
 */

import {
  Container,
  Stack,
  Title,
  Text,
  Group,
  Card,
  Alert,
  Badge,
  Loader,
  Button,
  SegmentedControl,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconGraph,
  IconRefresh,
  IconInfoCircle,
  IconEye,
  IconAlertTriangle,
  IconFocusCentered,
  IconFocus2,
} from '@tabler/icons-react';
import { createLazyFileRoute, Link } from '@tanstack/react-router';
import React, { useMemo, useCallback, useRef } from 'react';

import { ForceGraph3DVisualization } from '@/components/graph/3d/ForceGraph3DVisualization';
import { ForceGraphVisualization } from '@/components/graph/ForceGraphVisualization';
import type { DisplayMode } from '@/components/graph/types';
import { ViewModeToggle } from '@/components/ui/ViewModeToggle';
import { useGraphVisualization } from '@/hooks/use-graph-visualization';
import { useRepositoryGraph } from '@/hooks/use-repository-graph';

/**
 * Minimal graph methods interface for fit-to-view controls
 */
interface GraphMethods {
  zoomToFit(duration?: number, padding?: number): void;
  centerAt?(x: number, y: number, duration?: number): void;
}

/**
 * Entity Graph Page Component
 *
 * Displays repository entities as an interactive force-directed graph
 */
function EntityGraphPage() {
  // Repository data - real entities from IndexedDB
  const {
    nodes,
    edges,
    loading,
    isEmpty,
    error,
    refresh,
    lastUpdated,
  } = useRepositoryGraph();

  // Visualization state management
  const {
    highlightedNodes,
    highlightedPath,
    communityAssignments,
    communityColors,
    displayMode,
    enableSimulation,
    viewMode,
    pathSource,
    pathTarget,
    setDisplayMode,
    setEnableSimulation,
    setViewMode,
    handleNodeClick,
    handleBackgroundClick,
    clearHighlights,
  } = useGraphVisualization();

  // Graph methods ref for external control (zoomToFit, etc.)
  const graphMethodsRef = useRef<GraphMethods | null>(null);

  // Handler for when graph methods become available
  const handleGraphReady = useCallback(
    (methods: GraphMethods) => {
      graphMethodsRef.current = methods;
    },
    []
  );

  // Fit all nodes to view
  const fitToViewAll = useCallback(() => {
    const graph = graphMethodsRef.current;
    if (!graph?.zoomToFit) return;
    graph.zoomToFit(400, 50);
  }, []);

  // Fit selected nodes to view (or all if none selected)
  const fitToViewSelected = useCallback(() => {
    const graph = graphMethodsRef.current;
    if (!graph?.zoomToFit) return;

    if (highlightedNodes.size === 0) {
      fitToViewAll();
      return;
    }

    // For selected nodes, use the same zoomToFit
    // The graph component will handle focusing on highlighted nodes
    graph.zoomToFit(400, 50);
  }, [highlightedNodes.size, fitToViewAll]);

  // Node type counts for stats
  const nodeTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    nodes.forEach((node) => {
      counts[node.entityType] = (counts[node.entityType] || 0) + 1;
    });
    return counts;
  }, [nodes]);

  // Loading state
  if (loading) {
    return (
      <Container size="xl" py="md">
        <Stack align="center" justify="center" h="50vh" gap="md">
          <Loader size="xl" />
          <Text c="dimmed">Loading repository data...</Text>
        </Stack>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container size="xl" py="md">
        <Alert icon={<IconAlertTriangle size={16} />} title="Error Loading Data" color="red">
          <Stack gap="sm">
            <Text>{error.message}</Text>
            <Button
              variant="outline"
              color="red"
              size="xs"
              leftSection={<IconRefresh size={14} />}
              onClick={refresh}
            >
              Retry
            </Button>
          </Stack>
        </Alert>
      </Container>
    );
  }

  // Empty state - guide user to add entities
  if (isEmpty) {
    return (
      <Container size="xl" py="md">
        <Stack gap="lg">
          <Group>
            <IconGraph size={28} />
            <Title order={2}>Entity Graph</Title>
          </Group>

          <Alert icon={<IconInfoCircle size={16} />} title="No Entities in Repository" color="blue">
            <Stack gap="md">
              <Text>
                Your repository is empty. Add entities to visualize them as a graph.
              </Text>
              <Group>
                <Button component={Link} to="/browse" variant="light">
                  Browse Entities
                </Button>
                <Button component={Link} to="/search" variant="light">
                  Search OpenAlex
                </Button>
                <Button component={Link} to="/catalogue" variant="light">
                  Manage Catalogue
                </Button>
              </Group>
            </Stack>
          </Alert>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Page Header */}
        <Group justify="space-between" align="flex-start">
          <Group>
            <IconGraph size={28} />
            <Stack gap={0}>
              <Title order={2}>Entity Graph</Title>
              <Text c="dimmed" size="sm">
                {nodes.length} nodes, {edges.length} edges
                {lastUpdated && ` • Updated ${lastUpdated.toLocaleTimeString()}`}
              </Text>
            </Stack>
          </Group>
          <Group>
            <Tooltip label="Refresh data">
              <ActionIcon variant="light" onClick={refresh}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Graph Visualization Card */}
        <Card style={{ border: '1px solid var(--mantine-color-gray-3)' }} p="md">
          <Stack gap="md">
            {/* Controls Row */}
            <Group justify="space-between">
              <Group gap="xs">
                <ViewModeToggle value={viewMode} onChange={setViewMode} />

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

              <Group gap="xs">
                {/* Fit to view controls */}
                <Tooltip label="Fit all nodes to view">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={fitToViewAll}
                    aria-label="Fit all to view"
                  >
                    <IconFocusCentered size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={highlightedNodes.size > 0 ? "Fit selected nodes to view" : "Fit all to view (no selection)"}>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={fitToViewSelected}
                    aria-label="Fit selected to view"
                    disabled={highlightedNodes.size === 0}
                  >
                    <IconFocus2 size={16} />
                  </ActionIcon>
                </Tooltip>

                {/* Simulation toggle */}
                <Tooltip label={enableSimulation ? 'Pause simulation' : 'Resume simulation'}>
                  <ActionIcon
                    variant={enableSimulation ? 'filled' : 'light'}
                    onClick={() => setEnableSimulation(!enableSimulation)}
                  >
                    <IconEye size={16} />
                  </ActionIcon>
                </Tooltip>

                {/* Clear highlights */}
                {highlightedNodes.size > 0 && (
                  <Button variant="subtle" size="xs" onClick={clearHighlights}>
                    Clear Selection ({highlightedNodes.size})
                  </Button>
                )}
              </Group>
            </Group>

            {/* Graph Container */}
            <div
              style={{
                height: '60vh',
                minHeight: '400px',
                border: '1px solid var(--mantine-color-gray-2)',
                borderRadius: 'var(--mantine-radius-md)',
                overflow: 'hidden',
              }}
            >
              {viewMode === '2D' ? (
                <ForceGraphVisualization
                  nodes={nodes}
                  edges={edges}
                  highlightedNodeIds={highlightedNodes}
                  highlightedPath={highlightedPath}
                  communityAssignments={communityAssignments}
                  communityColors={communityColors}
                  displayMode={displayMode}
                  enableSimulation={enableSimulation}
                  onNodeClick={handleNodeClick}
                  onBackgroundClick={handleBackgroundClick}
                  onGraphReady={handleGraphReady}
                />
              ) : (
                <ForceGraph3DVisualization
                  nodes={nodes}
                  edges={edges}
                  highlightedNodeIds={highlightedNodes}
                  highlightedPath={highlightedPath}
                  communityAssignments={communityAssignments}
                  communityColors={communityColors}
                  displayMode={displayMode}
                  enableSimulation={enableSimulation}
                  onNodeClick={handleNodeClick}
                  onBackgroundClick={handleBackgroundClick}
                  onGraphReady={handleGraphReady}
                />
              )}
            </div>
          </Stack>
        </Card>

        {/* Stats Summary */}
        <Group gap="md">
          {Object.entries(nodeTypeCounts).map(([type, count]) => (
            <Badge key={type} variant="light" size="lg">
              {type}: {count}
            </Badge>
          ))}
        </Group>

        {/* Path selection info */}
        {(pathSource || pathTarget) && (
          <Alert icon={<IconInfoCircle size={16} />} color="blue" title="Path Selection">
            <Text size="sm">
              {pathSource && !pathTarget && `Source selected: ${pathSource}. Click another node to set target.`}
              {pathSource && pathTarget && `Source: ${pathSource} → Target: ${pathTarget}`}
            </Text>
          </Alert>
        )}
      </Stack>
    </Container>
  );
}

export const Route = createLazyFileRoute('/graph')({
  component: EntityGraphPage,
});

export default EntityGraphPage;
