/**
 * OpenAlex Entity Graph Component
 *
 * A React component for visualizing OpenAlex entity relationships using XYFlow/React Flow.
 * Uses simplified, stable patterns proven to work with React 19.
 *
 * STABLE IMPLEMENTATION: Based on proven test patterns that eliminate infinite loops.
 */

import React, { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
} from '@xyflow/react';

import type {
  EntityGraphVertex,
  EntityGraphEdge
} from '@/types/entity-graph';
import { getEntityColour } from '@/components/design-tokens.utils';

import type { GraphEngineType } from './graph-engines/types';
import { useEntityGraphStore } from '@/stores/entity-graph-store';

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

// SIMPLIFIED: Using default nodes to match working test app pattern

/**
 * ULTRA STABLE XYFLOW - Using useRef and useCallback pattern from working test app
 * Key insight: Prevent ANY object recreation by using refs and stable callbacks
 */
const WorkingXYFlowGraph: React.FC<OpenAlexEntityGraphProps> = React.memo(({
  vertices: _propsVertices = [],
  edges: _propsEdges = [],
  width = 800,
  height = 600,
  className,
  onVertexClick
}) => {
  // STABLE: Store vertices and edges in refs to prevent recreation
  const verticesRef = React.useRef(_propsVertices);
  const edgesRef = React.useRef(_propsEdges);

  // Update refs when props change, but don't trigger re-renders
  React.useEffect(() => {
    verticesRef.current = _propsVertices;
  }, [_propsVertices]);

  React.useEffect(() => {
    edgesRef.current = _propsEdges;
  }, [_propsEdges]);

  const vertices = verticesRef.current;
  const edges = edgesRef.current;

  console.log('WorkingXYFlowGraph render:', { vertices: vertices.length, edges: edges.length });

  if (vertices.length === 0) {
    return (
      <div
        className={className}
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #333',
          borderRadius: '8px',
          backgroundColor: '#1a1a1a',
          color: '#666'
        }}
      >
        No graph data available
      </div>
    );
  }

  // ULTRA STABLE: Create nodes only once and store in ref
  const nodesRef = React.useRef<Node[]>([]);
  const edgesRefFlow = React.useRef<Edge[]>([]);

  // Only recreate when length actually changes
  if (nodesRef.current.length !== vertices.length) {
    nodesRef.current = vertices.map((vertex, index) => ({
      id: vertex.id,
      type: 'default',
      position: {
        x: (index % 6) * 180,
        y: Math.floor(index / 6) * 120
      },
      data: {
        label: vertex.displayName || vertex.id
      }
    }));
  }

  if (edgesRefFlow.current.length !== edges.length) {
    edgesRefFlow.current = edges.map((edge, index) => ({
      id: `edge-${edge.sourceId}-${edge.targetId}-${index}`,
      source: edge.sourceId,
      target: edge.targetId,
    }));
  }

  console.log('SimpleXYFlowGraph render:', { vertices: vertices.length, edges: edges.length, nodes: nodesRef.current.length, flowEdges: edgesRefFlow.current.length });

  // ULTRA STABLE: Always use same reference from ref
  return (
    <div className={className} style={{ width, height }}>
      <ReactFlow
        nodes={nodesRef.current}
        edges={edgesRefFlow.current}
        fitView
        attributionPosition="bottom-left"
        style={{ width: '100%', height: '100%' }}
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" />
      </ReactFlow>
    </div>
  );
});

// COMPLETELY STATIC GRAPH: No store dependencies at all
const StaticGraphComponent: React.FC<OpenAlexEntityGraphProps> = React.memo((props) => {
  // Use only props data - NO store access to prevent infinite loops
  const vertices = props.vertices || [];
  const edges = props.edges || [];

  console.log('StaticGraphComponent render:', { vertices: vertices.length, edges: edges.length });

  if (vertices.length === 0) {
    return (
      <div style={{
        width: props.width || 800,
        height: props.height || 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '8px',
        color: '#666'
      }}>
        No graph data provided
      </div>
    );
  }

  // Pass data directly to XYFlow component
  return (
    <WorkingXYFlowGraph
      {...props}
      vertices={vertices}
      edges={edges}
    />
  );
});

// FIXED: Export without ReactFlowProvider to match test app pattern
export const OpenAlexEntityGraph: React.FC<OpenAlexEntityGraphProps> = React.memo((props) => {
  return <StaticGraphComponent {...props} />;
});

// Named export only - no default export