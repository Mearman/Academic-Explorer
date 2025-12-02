/**
 * Right Sidebar Content - Context-aware content for the right sidebar
 * Shows different content based on the current route
 */

import { useLocation } from '@tanstack/react-router';
import React from 'react';

import { AlgorithmTabs } from '@/components/algorithms/AlgorithmTabs';
import { RepositoryAlgorithmsPanel } from '@/components/algorithms/RepositoryAlgorithmsPanel';
import { useGraphVisualization } from '@/hooks/use-graph-visualization';
import { useMultiSourceGraph } from '@/hooks/use-multi-source-graph';

/**
 * Context-aware right sidebar content
 * Renders different panels based on the current route
 */
export function RightSidebarContent() {
  const location = useLocation();
  const isGraphPage = location.pathname === '/graph';

  // Graph page hooks - only used when on graph page
  const graphData = useMultiSourceGraph();
  const graphViz = useGraphVisualization();

  // If we're on the graph page, show the AlgorithmTabs
  if (isGraphPage) {
    return (
      <AlgorithmTabs
        nodes={graphData.nodes}
        edges={graphData.edges}
        onHighlightNodes={graphViz.highlightNodes}
        onHighlightPath={graphViz.highlightPath}
        onSelectCommunity={graphViz.selectCommunity}
        onCommunitiesDetected={graphViz.setCommunitiesResult}
        pathSource={graphViz.pathSource}
        pathTarget={graphViz.pathTarget}
        onPathSourceChange={graphViz.setPathSource}
        onPathTargetChange={graphViz.setPathTarget}
      />
    );
  }

  // For all other pages, show the repository algorithms panel
  return <RepositoryAlgorithmsPanel />;
}
