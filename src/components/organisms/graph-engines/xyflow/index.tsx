/**
 * xyflow (React Flow) Graph Engine Implementation
 *
 * Modern React-based flow diagram library with excellent performance and built-in features.
 * xyflow provides a React component-based approach with hooks and optimized rendering.
 *
 * Features provided:
 * - React-first design with hooks and components
 * - High-performance rendering with efficient updates
 * - Built-in controls, minimap, and zoom/pan
 * - Multiple edge types and smooth curves
 * - Interactive node dragging and selection
 * - Automatic layout algorithms
 * - Customizable nodes and edges
 * - Accessibility support
 *
 * @see https://xyflow.com/
 * @see https://github.com/xyflow/xyflow
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  NodeTypes,
  EdgeTypes,
  ReactFlowProvider,
  ReactFlowInstance,
  Panel,
  Position,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type {
  IGraph,
  IDimensions,
  IGraphConfig,
  IPositionedVertex
} from '../../graph-core/interfaces';
import type {
  IGraphEngine,
  IEngineCapabilities,
  IEngineRequirements,
  IEngineStatus,
  IEngineConfig
} from '../types';

// xyflow specific configuration interface
export interface IXyflowConfig extends IEngineConfig {
  xyflowOptions?: {
    fitView?: boolean;
    fitViewOptions?: {
      padding?: number;
      includeHiddenNodes?: boolean;
      minZoom?: number;
      maxZoom?: number;
      duration?: number;
    };
    nodeTypes?: NodeTypes;
    edgeTypes?: EdgeTypes;
    defaultViewport?: {
      x: number;
      y: number;
      zoom: number;
    };
    attributionPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    proOptions?: {
      account?: 'paid';
      hideAttribution?: boolean;
    };
    background?: {
      variant?: BackgroundVariant;
      gap?: number | [number, number];
      size?: number;
      offset?: number;
      lineWidth?: number;
      color?: string;
    };
    controls?: {
      showZoom?: boolean;
      showFitView?: boolean;
      showInteractive?: boolean;
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    };
    miniMap?: {
      nodeColor?: string | ((node: Node) => string);
      nodeStrokeColor?: string | ((node: Node) => string);
      nodeClassName?: string | ((node: Node) => string);
      maskColor?: string;
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      ariaLabel?: string;
    };
    nodes?: {
      defaultType?: string;
      defaultSize?: { width: number; height: number };
      defaultStyle?: React.CSSProperties;
      selectionColor?: string;
      deletable?: boolean;
      focusable?: boolean;
    };
    edges?: {
      defaultType?: string;
      defaultStyle?: React.CSSProperties;
      selectionColor?: string;
      deletable?: boolean;
      focusable?: boolean;
    };
    interaction?: {
      nodesDraggable?: boolean;
      nodesConnectable?: boolean;
      elementsSelectable?: boolean;
      selectNodesOnDrag?: boolean;
      panOnDrag?: boolean;
      minZoom?: number;
      maxZoom?: number;
      panOnScroll?: boolean;
      panOnScrollSpeed?: number;
      zoomOnScroll?: boolean;
      zoomOnPinch?: boolean;
      zoomOnDoubleClick?: boolean;
      preventScrolling?: boolean;
    };
  };
  layout?: {
    algorithm?: 'dagre' | 'force' | 'hierarchical' | 'manual';
    direction?: 'TB' | 'BT' | 'LR' | 'RL';
    spacing?: {
      node?: [number, number];
      rank?: number;
    };
    alignment?: 'UL' | 'UR' | 'DL' | 'DR';
  };
}

// Custom Node Components
const EntityNode: React.FC<{ data: { label: string; entityType: string } }> = ({ data }) => {
  return (
    <div
      style={{
        padding: '8px 12px',
        borderRadius: '6px',
        background: data.entityType === 'author' ? '#4299e1' :
                   data.entityType === 'work' ? '#48bb78' :
                   data.entityType === 'institution' ? '#ed8936' : '#9f7aea',
        color: 'white',
        fontSize: '12px',
        fontWeight: '500',
        border: '2px solid transparent',
        minWidth: '80px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      }}
    >
      {data.label}
      <div
        style={{
          fontSize: '10px',
          opacity: 0.8,
          marginTop: '2px',
          textTransform: 'uppercase',
        }}
      >
        {data.entityType}
      </div>
    </div>
  );
};

const nodeTypes: NodeTypes = {
  entity: EntityNode,
};

// ============================================================================
// xyflow Engine Implementation
// ============================================================================

export class XyflowEngine<TVertexData = unknown, TEdgeData = unknown>
  implements IGraphEngine<TVertexData, TEdgeData> {

  // Engine identification
  readonly id = 'xyflow';
  readonly name = 'xyflow (React Flow)';
  readonly description = 'Modern React-based flow diagram library with excellent performance and built-in features';
  readonly version = '12.8.4';
  readonly isImplemented = true;

  // Engine capabilities
  readonly capabilities: IEngineCapabilities = {
    maxVertices: 5000,
    maxEdges: 10000,
    supportsHardwareAcceleration: false, // Uses React DOM rendering
    supportsInteractiveLayout: true,
    supportsPhysicsSimulation: false, // No built-in physics, but has positioning
    supportsClustering: false, // No built-in clustering
    supportsCustomShapes: true,
    supportsEdgeBundling: false,
    exportFormats: ['png', 'json'],
    memoryUsage: 'medium',
    cpuUsage: 'low',
    batteryImpact: 'moderate',
  };

  // Installation requirements
  readonly requirements: IEngineRequirements = {
    dependencies: [
      { name: '@xyflow/react', version: '^12.8.4' },
    ],
    browserSupport: {
      chrome: 88,
      firefox: 85,
      safari: 14,
      edge: 88,
    },
    requiredFeatures: [
      'ES6 Modules',
      'React 18+',
      'CSS Grid',
      'ResizeObserver',
    ],
    setupInstructions: `
# Install xyflow React Flow
npm install @xyflow/react

# Import in your component
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

# Basic setup
<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
>
  <Background />
  <Controls />
  <MiniMap />
</ReactFlow>
    `.trim(),
  };

  // Current status
  private _status: IEngineStatus = {
    isInitialised: false,
    isRendering: false,
    lastError: undefined,
  };

  get status(): IEngineStatus {
    return this._status;
  }

  // Private state
  private container: HTMLElement | null = null;
  private dimensions: IDimensions = { width: 800, height: 600 };
  private config: IXyflowConfig = {};
  private nodes: Node[] = [];
  private edges: Edge[] = [];
  private reactFlowInstance: ReactFlowInstance | null = null;

  // ============================================================================
  // Engine Implementation
  // ============================================================================

  async initialise(
    container: HTMLElement,
    dimensions: IDimensions,
    config?: IEngineConfig
  ): Promise<void> {
    this.container = container;
    this.dimensions = dimensions;
    this.config = { ...this.getDefaultConfig(), ...config } as IXyflowConfig;

    try {
      // Clear the container
      container.innerHTML = '';

      // xyflow will be rendered via React components
      // The actual rendering happens in the React component

      this._status = {
        isInitialised: true,
        isRendering: false,
        lastError: undefined,
      };

    } catch (error) {
      this._status = {
        isInitialised: false,
        isRendering: false,
        lastError: error instanceof Error ? error.message : 'Failed to initialise xyflow engine',
      };
      throw error;
    }
  }

  async loadGraph(
    graph: IGraph<TVertexData, TEdgeData>,
    config?: IGraphConfig<TVertexData, TEdgeData>
  ): Promise<void> {
    if (!this._status.isInitialised) {
      throw new Error('Engine not initialised');
    }

    try {
      this._status = { ...this._status, isRendering: true };

      // Convert graph vertices to xyflow nodes
      this.nodes = graph.vertices.map((vertex, index) => {
        const position = this.calculateNodePosition(vertex, index, graph.vertices.length);

        return {
          id: vertex.id,
          type: 'entity',
          position,
          data: {
            label: this.getVertexLabel(vertex),
            entityType: this.getVertexType(vertex),
            originalVertex: vertex,
          },
        } as Node;
      });

      // Convert graph edges to xyflow edges
      this.edges = graph.edges.map((edge) => ({
        id: `${edge.sourceId}-${edge.targetId}`,
        source: edge.sourceId,
        target: edge.targetId,
        type: 'smoothstep',
        animated: false,
        style: {
          stroke: '#94a3b8',
          strokeWidth: 2,
        },
        data: {
          originalEdge: edge,
        },
      } as Edge));

      this._status = { ...this._status, isRendering: false };

    } catch (error) {
      this._status = {
        ...this._status,
        isRendering: false,
        lastError: error instanceof Error ? error.message : 'Failed to load graph',
      };
      throw error;
    }
  }

  async updateGraph(
    graph: IGraph<TVertexData, TEdgeData>,
    animate = true
  ): Promise<void> {
    // For xyflow, updates are handled by React state changes
    // This method will be called by the React component
    await this.loadGraph(graph);
  }

  resize(dimensions: IDimensions): void {
    this.dimensions = dimensions;
    // xyflow handles resizing automatically via ResizeObserver
    if (this.reactFlowInstance) {
      // Trigger a fitView after resize
      setTimeout(() => {
        this.reactFlowInstance?.fitView({
          padding: 50,
          duration: 300,
        });
      }, 100);
    }
  }

  async export(
    format: 'png' | 'svg' | 'json' | 'pdf',
    options?: Record<string, unknown>
  ): Promise<string | Blob> {
    if (format === 'json') {
      return JSON.stringify({
        nodes: this.nodes,
        edges: this.edges,
        viewport: this.reactFlowInstance?.getViewport(),
      });
    }

    if (format === 'png' && this.reactFlowInstance) {
      const dataUrl = await this.reactFlowInstance.getViewport();
      // Convert viewport to image - this would need additional implementation
      throw new Error('PNG export not yet implemented for xyflow engine');
    }

    throw new Error(`Export format ${format} not supported by xyflow engine`);
  }

  getPositions(): ReadonlyArray<IPositionedVertex<TVertexData>> {
    return this.nodes.map(node => ({
      id: node.id,
      position: { x: node.position.x, y: node.position.y },
      data: node.data.originalVertex?.data,
    }));
  }

  setPositions(
    positions: ReadonlyArray<IPositionedVertex<TVertexData>>,
    animate = true
  ): void {
    // Update node positions
    this.nodes = this.nodes.map(node => {
      const newPosition = positions.find(p => p.id === node.id);
      if (newPosition) {
        return {
          ...node,
          position: { x: newPosition.position.x, y: newPosition.position.y },
        };
      }
      return node;
    });
  }

  fitToView(padding = 50, animate = true): void {
    if (this.reactFlowInstance) {
      this.reactFlowInstance.fitView({
        padding,
        duration: animate ? 300 : 0,
      });
    }
  }

  destroy(): void {
    this.container = null;
    this.reactFlowInstance = null;
    this.nodes = [];
    this.edges = [];
    this._status = {
      isInitialised: false,
      isRendering: false,
      lastError: undefined,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private getDefaultConfig(): IXyflowConfig {
    return {
      xyflowOptions: {
        fitView: true,
        fitViewOptions: {
          padding: 50,
          duration: 300,
        },
        nodeTypes,
        background: {
          variant: 'dots',
          gap: 20,
          size: 1,
          color: '#e2e8f0',
        },
        controls: {
          showZoom: true,
          showFitView: true,
          showInteractive: true,
          position: 'bottom-left',
        },
        miniMap: {
          position: 'bottom-right',
          maskColor: 'rgba(255, 255, 255, 0.7)',
        },
        interaction: {
          nodesDraggable: true,
          nodesConnectable: false,
          elementsSelectable: true,
          selectNodesOnDrag: false,
          panOnDrag: true,
          minZoom: 0.1,
          maxZoom: 2,
          zoomOnScroll: true,
          zoomOnPinch: true,
          zoomOnDoubleClick: true,
        },
      },
      layout: {
        algorithm: 'force',
        direction: 'TB',
        spacing: {
          node: [100, 80],
          rank: 80,
        },
      },
    };
  }

  private calculateNodePosition(vertex: any, index: number, totalVertices: number): { x: number; y: number } {
    // Simple circular layout for now
    const radius = Math.min(this.dimensions.width, this.dimensions.height) * 0.3;
    const centerX = this.dimensions.width / 2;
    const centerY = this.dimensions.height / 2;

    if (totalVertices === 1) {
      return { x: centerX, y: centerY };
    }

    const angle = (index / totalVertices) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    return { x, y };
  }

  private getVertexLabel(vertex: any): string {
    if (vertex.data?.display_name) return vertex.data.display_name;
    if (vertex.data?.title) return vertex.data.title;
    if (vertex.data?.name) return vertex.data.name;
    return vertex.id || 'Node';
  }

  private getVertexType(vertex: any): string {
    if (vertex.entityType) return vertex.entityType;
    if (vertex.data?.type) return vertex.data.type;
    if (vertex.id?.startsWith('A')) return 'author';
    if (vertex.id?.startsWith('W')) return 'work';
    if (vertex.id?.startsWith('I')) return 'institution';
    if (vertex.id?.startsWith('S')) return 'source';
    return 'entity';
  }

  // ============================================================================
  // React Component for Integration
  // ============================================================================

  getReactComponent(): React.ComponentType<{
    width: number;
    height: number;
    onReady?: (instance: ReactFlowInstance) => void;
  }> {
    const engine = this;

    return function XyflowComponent({ width, height, onReady }) {
      const [nodes, setNodes, onNodesChange] = useNodesState(engine.nodes);
      const [edges, setEdges, onEdgesChange] = useEdgesState(engine.edges);
      const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

      const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
      );

      const onInit = useCallback((instance: ReactFlowInstance) => {
        setRfInstance(instance);
        engine.reactFlowInstance = instance;
        onReady?.(instance);
      }, [onReady]);

      // Sync nodes and edges with engine
      useEffect(() => {
        setNodes(engine.nodes);
        setEdges(engine.edges);
      }, [engine.nodes, engine.edges, setNodes, setEdges]);

      const config = engine.config.xyflowOptions || {};

      return (
        <div style={{ width, height }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={onInit}
            nodeTypes={config.nodeTypes || nodeTypes}
            edgeTypes={config.edgeTypes}
            fitView={config.fitView}
            fitViewOptions={config.fitViewOptions}
            nodesDraggable={config.interaction?.nodesDraggable}
            nodesConnectable={config.interaction?.nodesConnectable}
            elementsSelectable={config.interaction?.elementsSelectable}
            selectNodesOnDrag={config.interaction?.selectNodesOnDrag}
            panOnDrag={config.interaction?.panOnDrag}
            minZoom={config.interaction?.minZoom}
            maxZoom={config.interaction?.maxZoom}
            zoomOnScroll={config.interaction?.zoomOnScroll}
            zoomOnPinch={config.interaction?.zoomOnPinch}
            zoomOnDoubleClick={config.interaction?.zoomOnDoubleClick}
            preventScrolling={config.interaction?.preventScrolling}
          >
            {config.background && (
              <Background
                variant={config.background.variant}
                gap={config.background.gap}
                size={config.background.size}
                offset={config.background.offset}
                lineWidth={config.background.lineWidth}
                color={config.background.color}
              />
            )}

            {config.controls && (
              <Controls
                showZoom={config.controls.showZoom}
                showFitView={config.controls.showFitView}
                showInteractive={config.controls.showInteractive}
                position={config.controls.position}
              />
            )}

            {config.miniMap && (
              <MiniMap
                nodeColor={config.miniMap.nodeColor}
                nodeStrokeColor={config.miniMap.nodeStrokeColor}
                nodeClassName={config.miniMap.nodeClassName}
                maskColor={config.miniMap.maskColor}
                position={config.miniMap.position}
                ariaLabel={config.miniMap.ariaLabel}
              />
            )}

            <Panel position="top-left">
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#4a5568',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                xyflow (React Flow)
              </div>
            </Panel>
          </ReactFlow>
        </div>
      );
    };
  }

  // ============================================================================
  // Preview Component
  // ============================================================================

  getPreviewComponent(): React.ComponentType<{
    dimensions: IDimensions;
    sampleData?: IGraph<TVertexData, TEdgeData>;
  }> {
    return XyflowPreview;
  }
}

// ============================================================================
// Preview Component
// ============================================================================

const XyflowPreview: React.FC<{
  dimensions: IDimensions;
  sampleData?: IGraph<unknown, unknown>;
}> = ({ dimensions }) => {
  const sampleNodes: Node[] = [
    {
      id: '1',
      type: 'entity',
      position: { x: 250, y: 50 },
      data: { label: 'Research Paper', entityType: 'work' },
    },
    {
      id: '2',
      type: 'entity',
      position: { x: 100, y: 150 },
      data: { label: 'Dr. Smith', entityType: 'author' },
    },
    {
      id: '3',
      type: 'entity',
      position: { x: 400, y: 150 },
      data: { label: 'University', entityType: 'institution' },
    },
  ];

  const sampleEdges: Edge[] = [
    {
      id: 'e1-2',
      source: '1',
      target: '2',
      type: 'smoothstep',
      animated: true,
    },
    {
      id: 'e1-3',
      source: '1',
      target: '3',
      type: 'smoothstep',
    },
  ];

  return (
    <div
      style={{
        width: dimensions.width,
        height: dimensions.height,
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f7fafc',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e1e5e9',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '11px',
            fontWeight: 'bold',
          }}
        >
          XY
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
            xyflow (React Flow)
          </div>
          <div style={{ fontSize: '12px', color: '#718096' }}>
            Modern React Flow Diagrams
          </div>
        </div>
        <div
          style={{
            marginLeft: 'auto',
            padding: '4px 8px',
            backgroundColor: '#c6f6d5',
            color: '#276749',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '500',
          }}
        >
          Active
        </div>
      </div>

      {/* xyflow demonstration */}
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={sampleNodes}
            edges={sampleEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 20 }}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
            minZoom={0.5}
            maxZoom={1.5}
          >
            <Background variant="dots" gap={20} size={1} color="#e2e8f0" />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor="#4299e1"
              maskColor="rgba(255, 255, 255, 0.7)"
              position="bottom-right"
            />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {/* Feature list */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #e1e5e9',
          backgroundColor: '#ffffff',
          fontSize: '12px',
          color: '#718096',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <span>✓ React Components</span>
          <span>✓ Interactive Controls</span>
          <span>✓ MiniMap & Zoom</span>
          <span>✓ Custom Nodes</span>
          <span>✓ High Performance</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a new xyflow engine instance.
 */
export function createXyflowEngine<TVertexData = unknown, TEdgeData = unknown>(
  config?: IXyflowConfig
): XyflowEngine<TVertexData, TEdgeData> {
  const engine = new XyflowEngine<TVertexData, TEdgeData>();
  if (config) {
    engine['config'] = { ...engine['config'], ...config };
  }
  return engine;
}

/**
 * Get default xyflow configuration for academic graphs.
 */
export function getDefaultXyflowConfig(): IXyflowConfig {
  return {
    xyflowOptions: {
      fitView: true,
      fitViewOptions: {
        padding: 50,
        duration: 300,
      },
      nodeTypes,
      background: {
        variant: BackgroundVariant.Dots,
        gap: 20,
        size: 1,
        color: '#e2e8f0',
      },
      controls: {
        showZoom: true,
        showFitView: true,
        showInteractive: true,
        position: 'bottom-left',
      },
      miniMap: {
        position: 'bottom-right',
        maskColor: 'rgba(255, 255, 255, 0.7)',
      },
      interaction: {
        nodesDraggable: true,
        nodesConnectable: false,
        elementsSelectable: true,
        selectNodesOnDrag: false,
        panOnDrag: true,
        minZoom: 0.1,
        maxZoom: 2,
        zoomOnScroll: true,
        zoomOnPinch: true,
        zoomOnDoubleClick: true,
      },
    },
    layout: {
      algorithm: 'force',
      direction: 'TB',
      spacing: {
        node: [100, 80],
        rank: 80,
      },
    },
  };
}

// Export the utilities (XyflowEngine is already exported as a class declaration)
export { nodeTypes };