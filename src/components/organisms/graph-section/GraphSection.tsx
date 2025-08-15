import React from 'react';
import { EntityGraphVisualization, EntityGraphVisualizationSkeleton } from '../entity-graph-visualization';
import { EntitySection } from '../../templates/entity-page-template';
import { GraphStatsDisplay } from '@/components/molecules/graph-stats-display/GraphStatsDisplay';
import { GraphDescription } from '@/components/molecules/graph-description/GraphDescription';
import { GraphEmptyState } from '@/components/molecules/graph-empty-state/GraphEmptyState';

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
  onVertexClick: (vertex: any) => void;
}

export function GraphSection({
  isVisible,
  graphHeight,
  graphStats,
  totalVisits,
  onVertexClick,
}: GraphSectionProps) {
  if (!isVisible) return null;

  // Show graph with data
  if (graphStats.totalVertices > 0) {
    return (
      <EntitySection
        title="Related Entities"
        icon="graph"
        actions={
          <GraphStatsDisplay
            directlyVisited={graphStats.directlyVisited}
            totalEdges={graphStats.totalEdges}
            hasCurrentEntity={graphStats.hasCurrentEntity}
          />
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