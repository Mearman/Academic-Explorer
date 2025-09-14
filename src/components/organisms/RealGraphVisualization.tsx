/**
 * Real graph visualization component using XYFlow
 * Integrates with graph store and includes context menu support
 */

import React, { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
  type OnConnect,
  type OnNodesChange,
} from '@xyflow/react'
import { useGraphStore } from '@/stores/graph-store'
import { useGraphData } from '@/hooks/use-graph-data'
import { useContextMenu } from '@/hooks/use-context-menu'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { NodeContextMenu } from '@/components/layout/NodeContextMenu'
import type { GraphNode, GraphEdge } from '@/lib/graph/types'

import '@xyflow/react/dist/style.css'


// Convert GraphNode to XYFlow Node
const convertToXYFlowNode = (graphNode: GraphNode, getEntityColor: (entityType: string) => string): Node => {
  const entityType = graphNode.type || 'works'
  const color = getEntityColor(entityType)

  return {
    id: graphNode.id,
    type: 'default',
    position: graphNode.position || { x: Math.random() * 400, y: Math.random() * 400 },
    data: {
      label: graphNode.label || graphNode.id,
      graphNode // Store original graph node data
    },
    style: {
      background: color,
      color: 'white',
      border: '2px solid #333',
      borderRadius: '8px',
      padding: '10px',
      fontSize: '12px',
      minWidth: '120px',
      textAlign: 'center'
    },
  }
}

// Convert GraphEdge to XYFlow Edge
const convertToXYFlowEdge = (graphEdge: GraphEdge): Edge => {
  return {
    id: graphEdge.id,
    source: graphEdge.source,
    target: graphEdge.target,
    label: graphEdge.label,
    type: 'default',
    style: {
      strokeWidth: 2,
      stroke: '#666'
    }
  }
}

const RealGraphVisualizationInner: React.FC = () => {
  const { nodes: graphNodes, edges: graphEdges } = useGraphStore()
  const { expandNode } = useGraphData()
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu()
  const { getEntityColor, colors } = useThemeColors()

  // Convert graph store data to XYFlow format
  const initialNodes = useMemo(() => {
    return Array.from(graphNodes.values()).map(node => convertToXYFlowNode(node, getEntityColor))
  }, [graphNodes, getEntityColor])

  const initialEdges = useMemo(() => {
    return Array.from(graphEdges.values()).map(convertToXYFlowEdge)
  }, [graphEdges])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update XYFlow nodes/edges when graph store changes
  useEffect(() => {
    const newNodes = Array.from(graphNodes.values()).map(node => convertToXYFlowNode(node, getEntityColor))
    const newEdges = Array.from(graphEdges.values()).map(convertToXYFlowEdge)

    setNodes(newNodes)
    setEdges(newEdges)
  }, [graphNodes, graphEdges, setNodes, setEdges, getEntityColor])

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node)
    // Future: Navigate to entity page based on node.data.graphNode
  }, [])

  const onNodeDoubleClick = useCallback(async (event: React.MouseEvent, node: Node) => {
    const graphNode = node.data.graphNode as GraphNode
    if (graphNode) {
      console.log('Double-click: expanding node', graphNode.id)
      try {
        await expandNode(graphNode.id, { limit: 5 })
      } catch (error) {
        console.error('Failed to expand node:', error)
      }
    }
  }, [expandNode])

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    const graphNode = node.data.graphNode as GraphNode
    if (graphNode) {
      showContextMenu(graphNode, event)
    }
  }, [showContextMenu])

  const onConnect: OnConnect = useCallback(
    (params) => {
      // For now, we don't add manual connections since our edges come from the API
      console.log('Connection attempt:', params)
    },
    []
  )

  // Custom onNodesChange to sync position updates back to graph store
  const handleNodesChange: OnNodesChange = useCallback((changes) => {
    onNodesChange(changes)

    // Update positions in graph store for persistence
    changes.forEach(change => {
      if (change.type === 'position' && change.position && change.id) {
        const graphNode = graphNodes.get(change.id)
        if (graphNode) {
          // Note: This would require a setNodePosition method in the graph store
          // For now, we'll just log the position change
          console.log(`Node ${change.id} moved to:`, change.position)
        }
      }
    })
  }, [onNodesChange, graphNodes])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false
        }}
        attributionPosition="bottom-left"
        deleteKeyCode={null} // Disable delete key
        multiSelectionKeyCode={null} // Disable multi-selection for now
      >
        <Controls
          position="bottom-left"
          showZoom={true}
          showFitView={true}
          showInteractive={false}
        />
        <MiniMap
          nodeColor={(node) => {
            const graphNode = node.data?.graphNode as GraphNode
            return graphNode ? getEntityColor(graphNode.type || 'works') : colors.text.tertiary
          }}
          nodeStrokeWidth={3}
          zoomable
          pannable
          position="top-right"
          style={{
            backgroundColor: colors.background.overlay,
            border: `1px solid ${colors.border.primary}`,
            borderRadius: '4px'
          }}
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color={colors.border.primary} />
      </ReactFlow>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.node && (
        <NodeContextMenu
          node={contextMenu.node}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={hideContextMenu}
          onViewDetails={(node) => {
            console.log('View details for:', node)
            hideContextMenu()
            // TODO: Show details in right sidebar or navigate to entity page
          }}
        />
      )}

      {/* Empty state */}
      {nodes.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: colors.text.secondary,
          fontSize: '16px',
          zIndex: 10
        }}>
          <div style={{ marginBottom: '8px', fontSize: '48px', opacity: 0.3 }}>
            🔍
          </div>
          <div style={{ fontWeight: 500 }}>No graph data</div>
          <div style={{ fontSize: '14px', marginTop: '4px' }}>
            Load entities or search to see the graph
          </div>
        </div>
      )}
    </div>
  )
}

export const RealGraphVisualization: React.FC = () => {
  const { colors } = useThemeColors()

  return (
    <ReactFlowProvider>
      <div style={{
        width: '100%',
        height: '100%',
        border: `1px solid ${colors.border.primary}`,
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: colors.background.secondary
      }}>
        <RealGraphVisualizationInner />
      </div>
    </ReactFlowProvider>
  )
}