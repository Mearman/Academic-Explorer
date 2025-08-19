/**
 * OpenAlex Entity Graph Component
 * 
 * A React component for visualizing OpenAlex entity relationships using the new graph engine system.
 * This component serves as a bridge between the legacy entity graph visualization and the new
 * modular graph engine architecture.
 */

import React, { useCallback, useMemo } from 'react';

import type { 
  EntityGraphVertex, 
  EntityGraphEdge, 
  EntityType 
} from '@/types/entity-graph';

import { useGraphEngine } from './graph-engines/hooks/useGraphEngine';
import type { GraphEngineType } from './graph-engines/types';

export interface OpenAlexEntityGraphProps {
  vertices: EntityGraphVertex[];
  edges: EntityGraphEdge[];
  width?: number;
  height?: number;
  onVertexClick?: (vertex: EntityGraphVertex) => void;
  onEdgeClick?: (edge: EntityGraphEdge) => void;
  selectedVertexId?: string | null;
  engineType?: GraphEngineType;
  className?: string;
}

/**
 * OpenAlex Entity Graph Component
 * 
 * This component provides a modern interface for rendering entity graphs using
 * the new graph engine system while maintaining compatibility with existing
 * entity graph data structures.
 */
export const OpenAlexEntityGraph: React.FC<OpenAlexEntityGraphProps> = ({
  vertices = [],
  edges = [],
  width = 800,
  height = 600,
  onVertexClick,
  onEdgeClick,
  selectedVertexId,
  engineType = 'svg',
  className
}) => {
  const { engineInstance, isLoading, error } = useGraphEngine();

  // Convert OpenAlex entities to graph engine format
  const graphData = useMemo(() => {
    const graphVertices = vertices.map(vertex => ({
      id: vertex.id,
      label: vertex.displayName || vertex.id,
      data: vertex,
      x: vertex.position?.x || 0,
      y: vertex.position?.y || 0,
      metadata: vertex.metadata
    }));

    const graphEdges = edges.map(edge => ({
      id: `${edge.sourceId}-${edge.targetId}`,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      label: edge.type || '',
      data: edge
    }));

    return {
      vertices: graphVertices,
      edges: graphEdges
    };
  }, [vertices, edges]);

  const handleVertexClick = useCallback((vertex: unknown) => {
    if (onVertexClick && vertex && typeof vertex === 'object' && 'data' in vertex) {
      onVertexClick(vertex.data as EntityGraphVertex);
    }
  }, [onVertexClick]);

  const handleEdgeClick = useCallback((edge: unknown) => {
    if (onEdgeClick && edge && typeof edge === 'object' && 'data' in edge) {
      onEdgeClick(edge.data as EntityGraphEdge);
    }
  }, [onEdgeClick]);

  if (isLoading) {
    return (
      <div 
        className={className}
        style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        Loading graph engine...
      </div>
    );
  }

  if (error || !engineInstance) {
    return (
      <div 
        className={className}
        style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        Error loading graph engine: {error?.message || 'Unknown error'}
      </div>
    );
  }

  // Render using the selected graph engine
  // Note: This implementation needs to be updated to properly integrate with the graph engine
  // For now, return a placeholder that doesn't cause TypeScript errors
  return (
    <div className={className} style={{ width, height }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        color: '#666',
        fontSize: '14px'
      }}>
        Graph visualization (engine integration pending)
      </div>
    </div>
  );
};

export default OpenAlexEntityGraph;