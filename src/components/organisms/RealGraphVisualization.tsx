/**
 * Real graph visualization component using XYFlow
 * Integrates with graph store and provider system for proper layout handling
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
import { XYFlowProvider } from '@/lib/graph/providers/xyflow/xyflow-provider'
import type { GraphNode, GraphEdge } from '@/lib/graph/types'

import '@xyflow/react/dist/style.css'


// Singleton provider instance for consistent state
let providerInstance: XYFlowProvider | null = null;

function getProviderInstance(): XYFlowProvider {
  if (!providerInstance) {
    providerInstance = new XYFlowProvider();
  }
  return providerInstance;
}

const RealGraphVisualizationInner: React.FC = () => {
  const { nodes: graphNodes, edges: graphEdges, currentLayout } = useGraphStore()
  const { expandNode } = useGraphData()
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu()
  const { colors } = useThemeColors()

  // Get provider instance
  const provider = useMemo(() => getProviderInstance(), [])

  // Get XYFlow-compatible data from provider
  const { nodes: xyNodes, edges: xyEdges } = useMemo(() => {
    // Update provider with current graph data
    const graphNodeArray = Array.from(graphNodes.values())
    const graphEdgeArray = Array.from(graphEdges.values())

    provider.setNodes(graphNodeArray)
    provider.setEdges(graphEdgeArray)

    // Apply current layout if nodes exist
    if (graphNodeArray.length > 0) {
      provider.applyLayout(currentLayout)
    }

    return provider.getXYFlowData()
  }, [graphNodes, graphEdges, currentLayout, provider])

  const [nodes, setNodes, onNodesChange] = useNodesState(xyNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(xyEdges)

  // Update XYFlow nodes/edges when provider data changes
  useEffect(() => {
    setNodes(xyNodes)
    setEdges(xyEdges)
  }, [xyNodes, xyEdges, setNodes, setEdges])

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node)
    // Future: Navigate to entity page based on node.data.graphNode
  }, [])

  const onNodeDoubleClick = useCallback(async (event: React.MouseEvent, node: Node) => {
    console.log('Double-click: expanding node', node.id)
    try {
      await expandNode(node.id, { limit: 5 })
    } catch (error) {
      console.error('Failed to expand node:', error)
    }
  }, [expandNode])

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    // Convert XYFlow node back to GraphNode for context menu
    const graphNode = graphNodes.get(node.id)
    if (graphNode) {
      showContextMenu(graphNode, event)
    }
  }, [showContextMenu, graphNodes])

  const onConnect: OnConnect = useCallback(
    (params) => {
      // For now, we don't add manual connections since our edges come from the API
      console.log('Connection attempt:', params)
    },
    []
  )

  // Custom onNodesChange to sync position updates back to provider and graph store
  const handleNodesChange: OnNodesChange = useCallback((changes) => {
    onNodesChange(changes)

    // Update positions in provider for persistence
    changes.forEach(change => {
      if (change.type === 'position' && change.position && change.id) {
        const graphNode = graphNodes.get(change.id)
        if (graphNode) {
          // Update the graph node position
          const updatedNode: GraphNode = {
            ...graphNode,
            position: change.position
          }
          provider.updateNode?.(change.id, { position: change.position })
          console.log(`Node ${change.id} moved to:`, change.position)
        }
      }
    })
  }, [onNodesChange, graphNodes, provider])

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
            // Use node's computed background color from provider
            const background = node.style?.background
            return typeof background === 'string' ? background : colors.text.tertiary
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