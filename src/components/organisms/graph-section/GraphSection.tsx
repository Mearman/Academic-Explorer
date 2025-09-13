import React, { useMemo } from 'react';

import { GraphDescription } from '@/components/molecules/graph-description/GraphDescription';
import { GraphEmptyState } from '@/components/molecules/graph-empty-state/GraphEmptyState';
import { GraphStatsDisplay } from '@/components/molecules/graph-stats-display/GraphStatsDisplay';
import type { EntityGraphVertex } from '@/types/entity-graph';
import { useEntityGraphStore } from '@/stores/entity-graph-store';


import { EntitySection } from '../../templates/entity-page-template';
import { OpenAlexEntityGraph } from '../openalex-entity-graph';
import { LoadingSkeleton } from '@/components';

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

// Using store methods directly with proper memoization to prevent infinite loops

// EXACTLY MATCHING TEST APP: Direct vertices access with useMemo like test app
function SimpleGraphDisplay({
  width,
  height,
  onVertexClick,
}: {
  width: number;
  height: number;
  onVertexClick: (vertex: EntityGraphVertex) => void;
}) {
  // Match test app pattern: vertices from hook, then useMemo for XYFlow transformation
  const rawVerticesMap = useEntityGraphStore((state) => state.graph.vertices);
  const rawEdgesMap = useEntityGraphStore((state) => state.graph.edges);

  // Convert to simple array format like test app (no filtering, just conversion)
  const vertices = useMemo(() => {
    return Array.from(rawVerticesMap.values());
  }, [rawVerticesMap]);

  const edges = useMemo(() => {
    return Array.from(rawEdgesMap.values());
  }, [rawEdgesMap]);

  console.log('SimpleGraphDisplay:', { vertices: vertices.length, edges: edges.length });

  // TEMPORARY: Just show data without XYFlow to test if data is stable
  return (
    <div style={{ width, height, padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
      <h3>Graph Data (XYFlow Disabled for Testing)</h3>
      <p><strong>Vertices:</strong> {vertices.length}</p>
      <p><strong>Edges:</strong> {edges.length}</p>
      {vertices.length > 0 && (
        <div>
          <h4>Sample Vertices:</h4>
          <ul>
            {vertices.slice(0, 5).map(v => (
              <li key={v.id}>{v.displayName} ({v.entityType})</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Internal component using our new OpenAlexEntityGraph directly
function GraphSectionInternal({
  isVisible,
  graphHeight,
  graphStats,
  totalVisits,
  onVertexClick,
  showEngineSelector = false, // Engine selector disabled for now
  showTransitionOverlay = false, // Transition overlay disabled for now
}: GraphSectionProps) {
  // Silence unused parameter warnings
  void showEngineSelector;
  void showTransitionOverlay;

  if (!isVisible) return null;

  // Show graph with data
  if (graphStats.totalVertices > 0) {
    return (
      <EntitySection
        title="Related Entities"
        icon="graph"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          <SimpleGraphDisplay
            width={800}
            height={graphHeight}
            onVertexClick={onVertexClick}
          />
        </div>

        <GraphDescription />
      </EntitySection>
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
        <div style={{ height: graphHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSkeleton height="100%" />
        </div>
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

// Main export component - NO MORE GraphEngineProvider wrapper
export function GraphSection(props: GraphSectionProps) {
  // Direct rendering without complex engine wrapper to avoid infinite loops
  return <GraphSectionInternal {...props} />;
}