/**
 * Entity Graph Page - Visualizes entities from multiple sources as an interactive graph
 *
 * This page provides real-time visualization of entities from:
 * - Catalogue lists (bookmarks, history, custom lists)
 * - Caches (IndexedDB, memory, static)
 *
 * Features:
 * - 2D/3D force-directed layouts
 * - Community detection and pathfinding algorithms
 * - Interactive node exploration
 * - Toggleable data sources
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
  Box,
} from '@mantine/core';
import {
  IconGraph,
  IconRefresh,
  IconInfoCircle,
  IconEye,
  IconAlertTriangle,
  IconFocusCentered,
  IconFocus2,
  IconLoader,
} from '@tabler/icons-react';
import { createLazyFileRoute, Link } from '@tanstack/react-router';
import React, { useMemo, useCallback, useRef } from 'react';

import { AlgorithmTabs } from '@/components/algorithms/AlgorithmTabs';
import { ForceGraph3DVisualization } from '@/components/graph/3d/ForceGraph3DVisualization';
import { ForceGraphVisualization } from '@/components/graph/ForceGraphVisualization';
import { GraphSourcePanel } from '@/components/graph/GraphSourcePanel';
import type { DisplayMode } from '@/components/graph/types';
import { ViewModeToggle } from '@/components/ui/ViewModeToggle';
import { useGraphVisualization } from '@/hooks/use-graph-visualization';
import { useMultiSourceGraph } from '@/hooks/use-multi-source-graph';
import { useFitToView, type GraphMethods } from '@/hooks/useFitToView';
import { useNodeExpansion } from '@/lib/graph-index';

/**
 * Entity Graph Page Component
 *
 * Displays entities from multiple sources as an interactive force-directed graph
 */
function EntityGraphPage() {
  // Multi-source graph data
  const {
    nodes,
    edges,
    loading,
    isEmpty,
    error,
    sources,
    enabledSourceIds,
    toggleSource,
    enableAll,
    disableAll,
    refresh,
    addNodesAndEdges,
  } = useMultiSourceGraph();

  // Node expansion for click-to-expand
  const {
    expandNode,
    isExpanding,
    isExpanded,
    expandingNodeIds,
  } = useNodeExpansion();

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
    highlightNodes,
    highlightPath,
    setCommunitiesResult,
    selectCommunity,
    setPathSource,
    setPathTarget,
  } = useGraphVisualization();

  // Graph methods ref for external control (zoomToFit, etc.)
  const graphMethodsRef = useRef<GraphMethods | null>(null);

  // Fit-to-view operations (shared logic for 2D/3D)
  const { fitToViewAll, fitToViewSelected } = useFitToView({
    graphMethodsRef,
    viewMode,
    highlightedNodes,
  });

  // Handler for when graph methods become available
  const handleGraphReady = useCallback(
    (methods: GraphMethods) => {
      graphMethodsRef.current = methods;
    },
    []
  );

  // Wrapped node click handler - handles visualization + expansion
  const handleNodeClickWithExpansion = useCallback(
    (node: Parameters<typeof handleNodeClick>[0]) => {
      // First, handle the visualization click (path selection, highlighting)
      handleNodeClick(node);

      // Then trigger expansion if not already expanded
      // This runs asynchronously - doesn't block the UI
      if (!isExpanded(node.id) && !isExpanding(node.id)) {
        // Pass entityType explicitly for reliable type resolution
        // (avoids relying solely on ID prefix inference)
        void expandNode(node.id, node.entityType).then((result) => {
          // If expansion added new nodes/edges, add them incrementally
          // (no full graph refresh needed)
          if (result.success && (result.nodes.length > 0 || result.edges.length > 0)) {
            addNodesAndEdges(result.nodes, result.edges);
          }
        });
      }
    },
    [handleNodeClick, isExpanded, isExpanding, expandNode, addNodesAndEdges]
  );

  // Node type counts for stats
  const nodeTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    nodes.forEach((node) => {
      counts[node.entityType] = (counts[node.entityType] || 0) + 1;
    });
    return counts;
  }, [nodes]);

  // Convert expandingNodeIds array to Set for visualization components
  const expandingNodeIdsSet = useMemo(() => new Set(expandingNodeIds), [expandingNodeIds]);

  // Count enabled sources with entities
  const enabledSourceCount = sources.filter(s => enabledSourceIds.has(s.source.id)).length;

  // Loading state
  if (loading && sources.length === 0) {
    return (
      <Container size="xl" py="md">
        <Stack align="center" justify="center" h="50vh" gap="md">
          <Loader size="xl" />
          <Text c="dimmed">Loading data sources...</Text>
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

  // Empty state - no sources enabled or no entities
  if (isEmpty && enabledSourceCount === 0) {
    return (
      <Box style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
        {/* Source Panel */}
        <GraphSourcePanel
          sources={sources}
          enabledSourceIds={enabledSourceIds}
          onToggleSource={toggleSource}
          onEnableAll={enableAll}
          onDisableAll={disableAll}
          onRefresh={refresh}
          loading={loading}
        />

        {/* Empty state content */}
        <Container size="md" py="xl" style={{ flex: 1 }}>
          <Stack gap="lg">
            <Group>
              <IconGraph size={28} />
              <Title order={2}>Entity Graph</Title>
            </Group>

            <Alert icon={<IconInfoCircle size={16} />} title="No Data Sources Enabled" color="blue">
              <Stack gap="md">
                <Text>
                  Enable one or more data sources from the left panel to visualize entities.
                </Text>
                <Text size="sm" c="dimmed">
                  Available sources include your bookmarks, browsing history, custom lists, and cached entities.
                </Text>
              </Stack>
            </Alert>
          </Stack>
        </Container>
      </Box>
    );
  }

  // Empty state with sources enabled but no entities
  if (isEmpty) {
    return (
      <Box style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
        {/* Source Panel */}
        <GraphSourcePanel
          sources={sources}
          enabledSourceIds={enabledSourceIds}
          onToggleSource={toggleSource}
          onEnableAll={enableAll}
          onDisableAll={disableAll}
          onRefresh={refresh}
          loading={loading}
        />

        {/* Empty state content */}
        <Container size="md" py="xl" style={{ flex: 1 }}>
          <Stack gap="lg">
            <Group>
              <IconGraph size={28} />
              <Title order={2}>Entity Graph</Title>
            </Group>

            <Alert icon={<IconInfoCircle size={16} />} title="No Entities Found" color="blue">
              <Stack gap="md">
                <Text>
                  The enabled data sources contain no entities. Try enabling more sources or add some bookmarks.
                </Text>
                <Group>
                  <Button component={Link} to="/browse" variant="light">
                    Browse Entities
                  </Button>
                  <Button component={Link} to="/search" variant="light">
                    Search OpenAlex
                  </Button>
                  <Button component={Link} to="/bookmarks" variant="light">
                    View Bookmarks
                  </Button>
                </Group>
              </Stack>
            </Alert>
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      {/* Source Panel */}
      <GraphSourcePanel
        sources={sources}
        enabledSourceIds={enabledSourceIds}
        onToggleSource={toggleSource}
        onEnableAll={enableAll}
        onDisableAll={disableAll}
        onRefresh={refresh}
        loading={loading}
      />

      {/* Main Content */}
      <Box style={{ flex: 1, overflow: 'auto', padding: 'var(--mantine-spacing-md)' }}>
        <Stack gap="lg">
          {/* Page Header */}
          <Group justify="space-between" align="flex-start">
            <Group>
              <IconGraph size={28} />
              <Stack gap={0}>
                <Title order={2}>Entity Graph</Title>
                <Text c="dimmed" size="sm">
                  {nodes.length} nodes, {edges.length} edges from {enabledSourceCount} source{enabledSourceCount !== 1 ? 's' : ''}
                </Text>
              </Stack>
            </Group>
            <Group>
              <Tooltip label="Refresh data">
                <ActionIcon variant="light" onClick={refresh} loading={loading}>
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

                  {/* Expanding indicator */}
                  {expandingNodeIds.length > 0 && (
                    <Badge
                      variant="light"
                      color="blue"
                      size="sm"
                      leftSection={<IconLoader size={12} className="animate-spin" />}
                    >
                      Expanding {expandingNodeIds.length} node{expandingNodeIds.length !== 1 ? 's' : ''}...
                    </Badge>
                  )}
                </Group>
              </Group>

              {/* Graph Container */}
              <div
                style={{
                  height: '55vh',
                  minHeight: '350px',
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
                    expandingNodeIds={expandingNodeIdsSet}
                    displayMode={displayMode}
                    enableSimulation={enableSimulation}
                    onNodeClick={handleNodeClickWithExpansion}
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
                    expandingNodeIds={expandingNodeIdsSet}
                    displayMode={displayMode}
                    enableSimulation={enableSimulation}
                    onNodeClick={handleNodeClickWithExpansion}
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

          {/* Graph Algorithms */}
          <Card style={{ border: '1px solid var(--mantine-color-gray-3)' }} p="md">
            <Stack gap="md">
              <Title order={4}>Graph Algorithms</Title>
              <AlgorithmTabs
                nodes={nodes}
                edges={edges}
                onHighlightNodes={highlightNodes}
                onHighlightPath={highlightPath}
                onSelectCommunity={selectCommunity}
                onCommunitiesDetected={setCommunitiesResult}
                pathSource={pathSource}
                pathTarget={pathTarget}
                onPathSourceChange={setPathSource}
                onPathTargetChange={setPathTarget}
              />
            </Stack>
          </Card>
        </Stack>
      </Box>
    </Box>
  );
}

export const Route = createLazyFileRoute('/graph')({
  component: EntityGraphPage,
});

export default EntityGraphPage;
