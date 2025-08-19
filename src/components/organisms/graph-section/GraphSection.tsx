import React from 'react';

import { GraphDescription } from '@/components/molecules/graph-description/GraphDescription';
import { GraphEmptyState } from '@/components/molecules/graph-empty-state/GraphEmptyState';
import { GraphStatsDisplay } from '@/components/molecules/graph-stats-display/GraphStatsDisplay';
import type { EntityGraphVertex } from '@/types/entity-graph';


import { EntitySection } from '../../templates/entity-page-template';
import { EntityGraphVisualization, EntityGraphVisualizationSkeleton } from '../entity-graph-visualization';
import { 
  useGraphEngine, 
  CompactGraphEngineSettings,
  GraphEngineProvider,
  TransitionOverlay,
} from '../graph-engines';

interface GraphSectionProps {
  isVisible: boolean;
  graphHeight: number;
  graphStats: {
    totalVertices: number;
    totalEdges: number;
    directlyVisited: number;
    hasCurrentEntity: boolean;
  };
  totalVisits: number;
  onVertexClick: (vertex: EntityGraphVertex) => void;
  /** Whether to show engine selector in actions */
  showEngineSelector?: boolean;
  /** Whether to show transition overlay during engine switches */
  showTransitionOverlay?: boolean;
}

// Internal component that uses graph engine hooks
function GraphSectionInternal({
  isVisible,
  graphHeight,
  graphStats,
  totalVisits,
  onVertexClick,
  showEngineSelector = true,
  showTransitionOverlay = true,
}: GraphSectionProps) {
  const {
    currentEngine,
    isTransitioning,
    transitionProgress,
    availableEngines,
  } = useGraphEngine();

  if (!isVisible) return null;

  // Show graph with data
  if (graphStats.totalVertices > 0) {
    return (
      <>
        {/* Transition overlay during engine switches */}
        {showTransitionOverlay && isTransitioning && (
          <TransitionOverlay
            isTransitioning={isTransitioning}
            progress={transitionProgress}
            fromEngine={currentEngine}
            toEngine={currentEngine} // Will be updated during transition
            options={{
              duration: 500,
              preservePositions: true,
              preserveSelection: true,
              preserveViewport: true,
            }}
            engineDisplayNames={{
              'svg': 'SVG',
              'canvas-2d': 'Canvas',
              'webgl': 'WebGL',
              'cytoscape': 'Cytoscape.js',
              'd3-force': 'D3.js Force',
              'vis-network': 'vis-network'
            }}
          />
        )}
        
        <EntitySection
          title="Related Entities"
          icon="graph"
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Engine selector */}
              {showEngineSelector && availableEngines.length > 1 && (
                <CompactGraphEngineSettings />
              )}
              
              {/* Graph statistics */}
              <GraphStatsDisplay
                directlyVisited={graphStats.directlyVisited}
                totalEdges={graphStats.totalEdges}
                hasCurrentEntity={graphStats.hasCurrentEntity}
              />
            </div>
          }
        >
          <div style={{ marginBottom: '16px' }}>
            <EntityGraphVisualization
              height={graphHeight}
              onVertexClick={onVertexClick}
              showControls={true}
              showLegend={true}
            />
          </div>
          
          <GraphDescription />
        </EntitySection>
      </>
    );
  }

  // Show loading state if we have visits but no graph data yet
  if (totalVisits > 0) {
    return (
      <EntitySection
        title="Related Entities"
        icon="graph"
        loading={true}
      >
        <EntityGraphVisualizationSkeleton height={graphHeight} />
      </EntitySection>
    );
  }

  // Show empty state
  return (
    <EntitySection
      title="Related Entities"
      icon="graph"
    >
      <GraphEmptyState />
    </EntitySection>
  );
}

// Main export component
export function GraphSection(props: GraphSectionProps) {
  // Wrap in GraphEngineProvider to ensure engine context is available
  return (
    <GraphEngineProvider preloadDefault>
      <GraphSectionInternal {...props} />
    </GraphEngineProvider>
  );
}