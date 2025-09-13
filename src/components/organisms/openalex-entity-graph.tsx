/**
 * OpenAlex Entity Graph Component
 *
 * A React component for visualizing OpenAlex entity relationships using xyflow (React Flow).
 * This provides modern React-based graph visualization with interactive features.
 */

import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  ReactFlowProvider,
  BackgroundVariant,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type {
  EntityGraphVertex,
  EntityGraphEdge
} from '@/types/entity-graph';
import { getEntityColour } from '@/components/design-tokens.utils';

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
 * This component provides modern React Flow visualization for entity graphs.
 */
const OpenAlexEntityGraphInner: React.FC<OpenAlexEntityGraphProps> = ({
  vertices = [],
  edges = [],
  width = 800,
  height = 600,
  onVertexClick,
  onEdgeClick: _onEdgeClick,
  selectedVertexId: _selectedVertexId,
  engineType: _engineType = 'xyflow',
  className
}) => {
  // Convert vertices to React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    return vertices.map((vertex, index) => ({
      id: vertex.id,
      position: {
        x: vertex.position?.x || Math.random() * 400 + 50,
        y: vertex.position?.y || Math.random() * 400 + 50,
      },
      data: {
        label: vertex.displayName || vertex.id,
        vertex,
      },
      style: {
        backgroundColor: getEntityColour(vertex.entityType),
        color: 'white',
        border: '2px solid #333',
        borderRadius: '8px',
        fontSize: '12px',
        padding: '8px',
        minWidth: '120px',
        textAlign: 'center',
      },
      type: 'default',
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));
  }, [vertices]);

  // Convert edges to React Flow edges
  const initialEdges: Edge[] = useMemo(() => {
    return edges.map((edge) => ({
      id: `${edge.sourceId}-${edge.targetId}`,
      source: edge.sourceId,
      target: edge.targetId,
      label: edge.type || '',
      style: {
        stroke: '#666',
        strokeWidth: 2,
      },
      labelStyle: {
        fontSize: '10px',
        fill: '#666',
      },
      type: 'smoothstep',
    }));
  }, [edges]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [flowEdges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (onVertexClick && node.data?.vertex) {
      onVertexClick(node.data.vertex);
    }
  }, [onVertexClick]);

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

  return (
    <div className={className} style={{ width, height }}>
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="top-right"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap
          style={{
            height: 120,
            backgroundColor: '#1a1a1a',
            border: '1px solid #333'
          }}
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
};

export const OpenAlexEntityGraph: React.FC<OpenAlexEntityGraphProps> = (props) => {
  return (
    <ReactFlowProvider>
      <OpenAlexEntityGraphInner {...props} />
    </ReactFlowProvider>
  );
};

// Named export only - no default export