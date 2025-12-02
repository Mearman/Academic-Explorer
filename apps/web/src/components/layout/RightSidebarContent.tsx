/**
 * Right Sidebar Content - Context-aware content for the right sidebar
 * Shows different content based on the current route
 */

import { useLocation } from '@tanstack/react-router';
import React, { useContext } from 'react';

import { AlgorithmTabs } from '@/components/algorithms/AlgorithmTabs';
import { RepositoryAlgorithmsPanel } from '@/components/algorithms/RepositoryAlgorithmsPanel';
import { GraphVisualizationContext } from '@/contexts/GraphVisualizationContext';

/**
 * Context-aware right sidebar content
 * Renders different panels based on the current route
 */
export function RightSidebarContent() {
  const location = useLocation();
  const isGraphPage = location.pathname === '/graph';

  // Try to get shared state from context (only available on graph page)
  // This will be null when outside the provider (non-graph pages)
  const context = useContext(GraphVisualizationContext);

  // If we're on the graph page, show the AlgorithmTabs
  if (isGraphPage && context) {
    const { graphData, visualization } = context;

    return (
      <AlgorithmTabs
        nodes={graphData.nodes}
        edges={graphData.edges}
        onHighlightNodes={visualization.highlightNodes}
        onHighlightPath={visualization.highlightPath}
        onSelectCommunity={visualization.selectCommunity}
        onCommunitiesDetected={visualization.setCommunitiesResult}
        pathSource={visualization.pathSource}
        pathTarget={visualization.pathTarget}
        onPathSourceChange={visualization.setPathSource}
        onPathTargetChange={visualization.setPathTarget}
      />
    );
  }

  // For all other pages, show the repository algorithms panel
  return <RepositoryAlgorithmsPanel />;
}
