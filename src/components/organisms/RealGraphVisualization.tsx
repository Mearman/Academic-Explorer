/**
 * Real graph visualization component using XYFlow
 * Integrates with graph store and provider system for proper layout handling
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
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
import { useLayout } from '@/lib/graph/providers/xyflow/use-layout'
import { logger, logError } from '@/lib/logger'

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
  const reactFlowInstance = useReactFlow()

  // Get provider instance
  const provider = useMemo(() => getProviderInstance(), [])

  // Use unified layout hook for all layout types
  const { isRunning: isLayoutRunning, reheatLayout } = useLayout(
    currentLayout,
    {
      enabled: true,
      onLayoutChange: () => {
        // Optional: Notify when layout positions change
      }
    }
  )

  // Set ReactFlow instance on the provider
  useEffect(() => {
    if (reactFlowInstance) {
      provider.setReactFlowInstance(reactFlowInstance)
    }
  }, [reactFlowInstance, provider])

  // Update provider when graph data changes
  useEffect(() => {
    const graphNodeArray = Array.from(graphNodes.values())
    const graphEdgeArray = Array.from(graphEdges.values())

    logger.info('graph', 'Graph data changed in RealGraphVisualization', {
      nodeCount: graphNodeArray.length,
      edgeCount: graphEdgeArray.length,
      nodeIds: graphNodeArray.map(n => n.id),
      nodePositions: graphNodeArray.map(n => ({ id: n.id, position: n.position }))
    }, 'RealGraphVisualization')

    provider.setNodes(graphNodeArray)
    provider.setEdges(graphEdgeArray)
  }, [graphNodes, graphEdges, provider])

  // Initialize XYFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Track layout type changes to force complete re-layout
  const prevLayoutType = useRef(currentLayout.type)

  // Single effect to handle both data updates and layout application
  useEffect(() => {
    const graphNodeArray = Array.from(graphNodes.values())
    const graphEdgeArray = Array.from(graphEdges.values())

    logger.info('graph', 'Main data processing effect triggered', {
      nodeCount: graphNodeArray.length,
      edgeCount: graphEdgeArray.length,
      currentLayoutType: currentLayout.type,
      isLayoutRunning,
      nodeIds: graphNodeArray.map(n => n.id),
      nodePositions: graphNodeArray.map(n => ({ id: n.id, x: n.position.x, y: n.position.y }))
    }, 'RealGraphVisualization')

    if (graphNodeArray.length > 0) {
      logger.info('graph', 'Processing graph data and layout', { nodeCount: graphNodeArray.length }, 'RealGraphVisualization')

      // Check if this is a layout type change (user switched layouts)
      const isLayoutTypeChange = prevLayoutType.current !== currentLayout.type
      if (isLayoutTypeChange) {
        logger.info('graph', 'Layout type changed', { from: prevLayoutType.current, to: currentLayout.type }, 'RealGraphVisualization')
        prevLayoutType.current = currentLayout.type
      }

      // All layouts are now managed by the useLayout hook
      logger.info('graph', 'Layout managed by hook', {
        type: currentLayout.type,
        isRunning: isLayoutRunning,
        isLayoutTypeChange
      }, 'RealGraphVisualization')

      // Get updated data and set state
      const newData = provider.getXYFlowData()
      logger.info('graph', 'Setting nodes/edges with layout positions', {
        nodeCount: newData.nodes.length,
        edgeCount: newData.edges.length,
        newNodePositions: newData.nodes.slice(0, 5).map(n => ({ id: n.id, position: n.position }))
      }, 'RealGraphVisualization')

      setNodes(newData.nodes)
      setEdges(newData.edges)

      // Fit view after initial layout setup
      // The layout hook will handle timing based on layout type
      const currentInstance = reactFlowInstance
      setTimeout(() => {
        if (currentInstance) {
          logger.info('graph', 'FitView after layout setup', { layoutType: currentLayout.type }, 'RealGraphVisualization')
          void currentInstance.fitView({ padding: 0.2 })
        }
      }, currentLayout.type === 'd3-force' ? 150 : 50)
    } else if (graphEdgeArray.length > 0) {
      // Handle edges-only case
      logger.info('graph', 'Handling edges-only case', { edgeCount: graphEdgeArray.length }, 'RealGraphVisualization')
      const newData = provider.getXYFlowData()
      setEdges(newData.edges)
    }
  }, [graphNodes, graphEdges, currentLayout, provider, setNodes, setEdges])

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    logger.info('ui', 'Node clicked', { nodeId: node.id, nodeType: node.type }, 'RealGraphVisualization')
    // Future: Navigate to entity page based on node.data.graphNode
  }, [])

  const onNodeDoubleClick = useCallback(async (event: React.MouseEvent, node: Node) => {
    logger.info('ui', 'Double-click: expanding node', { nodeId: node.id }, 'RealGraphVisualization')

    // Track state before expansion
    const beforeExpansion = {
      nodeCount: Array.from(graphNodes.values()).length,
      nodeIds: Array.from(graphNodes.values()).map(n => n.id)
    }
    logger.info('graph', 'State before node expansion', beforeExpansion, 'RealGraphVisualization')

    try {
      await expandNode(node.id, { limit: 5 })

      // Track state after expansion
      const afterExpansion = {
        nodeCount: Array.from(graphNodes.values()).length,
        nodeIds: Array.from(graphNodes.values()).map(n => n.id),
        newNodes: Array.from(graphNodes.values()).filter(n => !beforeExpansion.nodeIds.includes(n.id)),
        addedNodePositions: Array.from(graphNodes.values())
          .filter(n => !beforeExpansion.nodeIds.includes(n.id))
          .map(n => ({ id: n.id, position: n.position }))
      }
      logger.info('graph', 'State after node expansion', afterExpansion, 'RealGraphVisualization')

      // Reheat layout when new nodes are added (applies to all layout types)
      logger.info('graph', 'Reheating layout after node expansion', {
        layoutType: currentLayout.type,
        nodesAdded: afterExpansion.newNodes.length
      }, 'RealGraphVisualization')
      reheatLayout(0.3) // Restart with moderate energy
    } catch (error) {
      logError('Failed to expand node', error, 'RealGraphVisualization', 'graph')
    }
  }, [expandNode, currentLayout.type, reheatLayout, graphNodes])

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
      logger.info('ui', 'Connection attempt', { source: params.source, target: params.target }, 'RealGraphVisualization')
    },
    []
  )

  // Custom onNodesChange to sync position updates back to provider and graph store
  const handleNodesChange: OnNodesChange = useCallback((changes) => {
    logger.info('graph', 'handleNodesChange called', { changes: changes.map(c => ({ type: c.type, id: 'id' in c ? c.id : undefined, position: 'position' in c ? c.position : undefined })) }, 'RealGraphVisualization')
    onNodesChange(changes)

    // Update positions in provider for persistence
    changes.forEach(change => {
      if (change.type === 'position' && change.position && change.id) {
        const graphNode = graphNodes.get(change.id)
        if (graphNode) {
          provider.updateNode?.(change.id, { position: change.position })
          logger.info('graph', 'Node position changed', { nodeId: change.id, position: change.position }, 'RealGraphVisualization')
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
        fitView={false}
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
            logger.info('ui', 'View details for node', { nodeId: node.id, entityType: node.type }, 'RealGraphVisualization')
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