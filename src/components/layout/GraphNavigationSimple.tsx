/**
 * Simplified graph navigation component for initial implementation
 * Basic XYFlow integration without full API integration
 */

import React, { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  addEdge,
  type Node,
  type Edge,
  type OnConnect,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

// Sample data for testing
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'default',
    position: { x: 0, y: 0 },
    data: { label: 'Author: John Smith' },
    style: {
      background: '#3498db',
      color: 'white',
      border: '2px solid #333',
      borderRadius: '8px',
      padding: '10px'
    },
  },
  {
    id: '2',
    type: 'default',
    position: { x: 0, y: 100 },
    data: { label: 'Work: Machine Learning Paper' },
    style: {
      background: '#e74c3c',
      color: 'white',
      border: '2px solid #333',
      borderRadius: '8px',
      padding: '10px'
    },
  },
  {
    id: '3',
    type: 'default',
    position: { x: 200, y: 50 },
    data: { label: 'Source: Nature Journal' },
    style: {
      background: '#2ecc71',
      color: 'white',
      border: '2px solid #333',
      borderRadius: '8px',
      padding: '10px'
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', label: 'authored' },
  { id: 'e2-3', source: '2', target: '3', label: 'published in' },
];

const GraphNavigationInner: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node);
    // Future: Navigate to entity page
    // navigate({ to: `/entity/${node.id}` });
  }, []);

  return (
    <div style={{ width: '100%', height: '500px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <MiniMap
          nodeColor="#666"
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export const GraphNavigationSimple: React.FC = () => {
  return (
    <ReactFlowProvider>
      <div style={{
        width: '100%',
        height: '500px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <GraphNavigationInner />
      </div>
    </ReactFlowProvider>
  );
};