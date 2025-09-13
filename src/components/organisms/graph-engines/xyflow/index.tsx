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
  Handle,
  getNodesBounds,
  getViewportForBounds,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { getEntityColour, getOpenAccessColour } from '../../../design-tokens.utils';
import dagre from '@dagrejs/dagre';
import { toPng, toSvg } from 'html-to-image';

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

// Enhanced Custom Node Components
interface EntityNodeData {
  label: string;
  entityType: string;
  originalVertex?: any;
  citationCount?: number;
  publicationYear?: number;
  openAccessStatus?: string;
  isSelected?: boolean;
}

const EntityNode: React.FC<{ data: EntityNodeData; selected?: boolean }> = ({ data, selected }) => {
  const entityColor = getEntityColour(data.entityType);
  const [isHovered, setIsHovered] = useState(false);

  // Enhanced styling based on entity type and state
  const nodeStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${entityColor}, ${entityColor}dd)`,
    color: 'white',
    padding: '12px 16px',
    borderRadius: '12px',
    border: selected ? `3px solid ${entityColor}` : '2px solid rgba(255, 255, 255, 0.2)',
    minWidth: '100px',
    textAlign: 'center',
    boxShadow: isHovered
      ? `0 8px 24px ${entityColor}40, 0 4px 12px rgba(0, 0, 0, 0.15)`
      : '0 4px 12px rgba(0, 0, 0, 0.15)',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    transform: isHovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
    position: 'relative',
    fontSize: '13px',
    fontWeight: '600',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: '600',
    lineHeight: '1.2',
    marginBottom: '4px',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
  };

  const typeStyle: React.CSSProperties = {
    fontSize: '10px',
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: '500',
  };

  const metadataStyle: React.CSSProperties = {
    fontSize: '9px',
    opacity: 0.8,
    marginTop: '2px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  // Generate accessible description
  const getNodeDescription = (): string => {
    let description = `${data.entityType} node: ${data.label}`;
    if (data.entityType === 'work') {
      if (data.publicationYear) description += `, published in ${data.publicationYear}`;
      if (data.citationCount !== undefined) description += `, ${data.citationCount} citations`;
      if (data.openAccessStatus) description += `, ${data.openAccessStatus} access`;
    }
    return description;
  };

  return (
    <div
      style={nodeStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={selected ? 0 : -1}
      aria-label={getNodeDescription()}
      aria-selected={selected}
      aria-describedby={`node-details-${data.originalVertex?.id || 'unknown'}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: entityColor,
          border: '2px solid white',
          width: '8px',
          height: '8px',
        }}
      />

      <div style={labelStyle}>
        {data.label}
      </div>

      <div style={typeStyle}>
        {data.entityType}
      </div>

      {/* Additional metadata for works */}
      {data.entityType === 'work' && (data.citationCount || data.publicationYear || data.openAccessStatus) && (
        <div style={metadataStyle}>
          {data.publicationYear && (
            <span style={{ fontSize: '8px' }}>{data.publicationYear}</span>
          )}
          {data.citationCount !== undefined && (
            <span style={{ fontSize: '8px' }}>📄 {data.citationCount}</span>
          )}
          {data.openAccessStatus && (
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: getOpenAccessColour(data.openAccessStatus),
                border: '1px solid white',
              }}
              title={`Open Access: ${data.openAccessStatus}`}
            />
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: entityColor,
          border: '2px solid white',
          width: '8px',
          height: '8px',
        }}
      />
    </div>
  );
};

// Compact node for dense graphs
const CompactEntityNode: React.FC<{ data: EntityNodeData; selected?: boolean }> = ({ data, selected }) => {
  const entityColor = getEntityColour(data.entityType);

  // Generate accessible description for compact node
  const getCompactNodeDescription = (): string => {
    return `${data.entityType} node: ${data.label}`;
  };

  return (
    <div
      style={{
        background: entityColor,
        color: 'white',
        padding: '6px 10px',
        borderRadius: '8px',
        border: selected ? `2px solid ${entityColor}` : '1px solid rgba(255, 255, 255, 0.2)',
        minWidth: '60px',
        textAlign: 'center',
        fontSize: '11px',
        fontWeight: '600',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      role="button"
      tabIndex={selected ? 0 : -1}
      aria-label={getCompactNodeDescription()}
      aria-selected={selected}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: entityColor, border: '1px solid white', width: '6px', height: '6px' }}
      />

      <div style={{ fontSize: '11px', fontWeight: '600' }}>
        {data.label.length > 15 ? `${data.label.substring(0, 15)}...` : data.label}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: entityColor, border: '1px solid white', width: '6px', height: '6px' }}
      />
    </div>
  );
};

const nodeTypes: NodeTypes = {
  entity: EntityNode,
  compact: CompactEntityNode,
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

    // Validate input graph
    if (!graph || !Array.isArray(graph.vertices) || !Array.isArray(graph.edges)) {
      throw new Error('Invalid graph structure: missing vertices or edges arrays');
    }

    // Handle empty graph gracefully
    if (graph.vertices.length === 0) {
      this.nodes = [];
      this.edges = [];
      this._status = { ...this._status, isRendering: false };
      return;
    }

    try {
      this._status = { ...this._status, isRendering: true };

      // Convert graph vertices to xyflow nodes with enhanced data
      let tempNodes = graph.vertices.map((vertex, index) => {
        // Start with a default position - will be updated by layout algorithm
        const position = { x: 0, y: 0 };
        const entityType = this.getVertexType(vertex);
        const vertexData = vertex.data || {};

        // Determine node type based on graph density
        const nodeType = graph.vertices.length > 50 ? 'compact' : 'entity';

        return {
          id: vertex.id,
          type: nodeType,
          position,
          data: {
            label: this.getVertexLabel(vertex),
            entityType,
            originalVertex: vertex,
            // Extract additional metadata for enhanced display
            citationCount: ('cited_by_count' in vertexData ? vertexData.cited_by_count : null) ||
                          ('citation_count' in vertexData ? vertexData.citation_count : null) || 0,
            publicationYear: ('publication_year' in vertexData ? vertexData.publication_year : null) ||
                            ('published_year' in vertexData ? vertexData.published_year : null),
            openAccessStatus: ('open_access' in vertexData && vertexData.open_access && typeof vertexData.open_access === 'object' && 'oa_type' in vertexData.open_access ? vertexData.open_access.oa_type : null) ||
                             ('oa_type' in vertexData ? vertexData.oa_type : null),
            isSelected: false,
          } as EntityNodeData,
        } as Node;
      });

      // Convert graph edges to xyflow edges with enhanced styling (needed for layout algorithms)
      const tempEdges = graph.edges.map((edge) => {
        return {
          id: `${edge.sourceId}-${edge.targetId}`,
          source: edge.sourceId,
          target: edge.targetId,
          type: 'smoothstep',
        } as Edge;
      });

      // Apply layout algorithm based on configuration with error handling
      const layoutAlgorithm = this.config.layout?.algorithm || 'force';
      const layoutDirection = this.config.layout?.direction || 'TB';

      try {
        switch (layoutAlgorithm) {
          case 'dagre':
            this.nodes = this.applyDagreLayout(tempNodes, tempEdges, layoutDirection);
            break;
          case 'force':
            this.nodes = this.applyForceLayout(tempNodes, tempEdges);
            break;
          case 'hierarchical':
            // Use dagre for hierarchical layout
            this.nodes = this.applyDagreLayout(tempNodes, tempEdges, layoutDirection);
            break;
          case 'manual':
            // For manual layout, use a simple grid arrangement
            this.nodes = this.applyGridLayout(tempNodes);
            break;
          default:
            // Fallback to force layout
            this.nodes = this.applyForceLayout(tempNodes, tempEdges);
        }
      } catch (layoutError) {
        // Fallback to simple grid layout if any layout algorithm fails
        console.warn(`Layout algorithm '${layoutAlgorithm}' failed, falling back to grid layout:`, layoutError);
        this.nodes = this.applyGridLayout(tempNodes);
      }

      // Convert graph edges to xyflow edges with enhanced styling
      this.edges = graph.edges.map((edge) => {
        const edgeData = edge.data || {};
        const rawWeight = ('weight' in edgeData ? edgeData.weight : null);
        const weight = typeof rawWeight === 'number' ? rawWeight : 1;
        const relationshipType = ('type' in edgeData ? edgeData.type : null) || 'default';

        // Determine edge appearance based on relationship strength and type
        const strokeWidth = Math.max(1, Math.min(6, weight * 2));
        const isStrong = weight > 0.7;

        return {
          id: `${edge.sourceId}-${edge.targetId}`,
          source: edge.sourceId,
          target: edge.targetId,
          type: 'smoothstep',
          animated: isStrong,
          style: {
            stroke: isStrong ? '#4f46e5' : '#94a3b8',
            strokeWidth,
            strokeDasharray: relationshipType === 'indirect' ? '5,5' : undefined,
            opacity: 0.6 + (weight * 0.4),
          },
          markerEnd: {
            type: 'arrow',
            color: isStrong ? '#4f46e5' : '#94a3b8',
            width: 20,
            height: 20,
          },
          data: {
            originalEdge: edge,
            weight,
            relationshipType,
          },
        } as Edge;
      });

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
      }, null, 2);
    }

    if ((format === 'png' || format === 'svg') && this.container && this.reactFlowInstance) {
      try {
        // Find the React Flow viewport element
        const viewportElement = this.container.querySelector('.react-flow__viewport');
        if (!viewportElement) {
          throw new Error('React Flow viewport element not found');
        }

        // Configure export options
        const exportOptions = {
          backgroundColor: options?.backgroundColor ? String(options.backgroundColor) : '#ffffff',
          width: options?.width ? Number(options.width) : this.dimensions.width,
          height: options?.height ? Number(options.height) : this.dimensions.height,
          style: {
            transform: 'none',
          },
          filter: (node: Element) => {
            // Exclude certain elements that shouldn't be in the export
            if (node.classList?.contains('react-flow__controls') ||
                node.classList?.contains('react-flow__minimap') ||
                node.classList?.contains('react-flow__attribution')) {
              return false;
            }
            return true;
          },
        };

        if (format === 'png') {
          return await toPng(viewportElement as HTMLElement, exportOptions);
        } else if (format === 'svg') {
          return await toSvg(viewportElement as HTMLElement, exportOptions);
        }
      } catch (error) {
        throw new Error(`Failed to export ${format}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    throw new Error(`Export format ${format} not supported by xyflow engine`);
  }

  getPositions(): ReadonlyArray<IPositionedVertex<TVertexData>> {
    return this.nodes.map(node => ({
      id: node.id,
      position: { x: node.position.x, y: node.position.y },
      data: node.data.originalVertex && 'data' in node.data.originalVertex ? node.data.originalVertex.data : undefined,
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
          ariaLabel: 'Graph minimap for navigation overview',
        },
        nodes: {
          focusable: true,
          defaultSize: { width: 100, height: 60 },
          selectionColor: '#3b82f6',
        },
        edges: {
          focusable: true,
          selectionColor: '#3b82f6',
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
          node: [120, 90], // Slightly more spacing for better readability
          rank: 100, // Increased rank spacing for clearer hierarchy
        },
      },
    };
  }

  // ============================================================================
  // Layout Algorithms
  // ============================================================================

  private applyDagreLayout(nodes: Node[], edges: Edge[], direction: 'TB' | 'BT' | 'LR' | 'RL' = 'TB'): Node[] {
    const g = new dagre.graphlib.Graph();

    // Use spacing configuration if available
    const nodeSpacing = this.config.layout?.spacing?.node || [120, 90];
    const rankSpacing = this.config.layout?.spacing?.rank || 100;

    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
      rankdir: direction,
      nodesep: nodeSpacing[0],
      ranksep: rankSpacing,
      marginx: 20,
      marginy: 20,
    });

    // Add nodes to dagre graph
    nodes.forEach((node) => {
      g.setNode(node.id, {
        width: node.data.entityType === 'work' ? 120 : 100,
        height: node.data.entityType === 'work' ? 80 : 60,
      });
    });

    // Add edges to dagre graph
    edges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    // Calculate layout
    dagre.layout(g);

    // Apply calculated positions to nodes
    return nodes.map((node) => {
      const nodeWithPosition = g.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWithPosition.width / 2,
          y: nodeWithPosition.y - nodeWithPosition.height / 2,
        },
      };
    });
  }

  private applyForceLayout(nodes: Node[], edges: Edge[]): Node[] {
    // Simple force-directed layout simulation
    const iterations = 100;
    const k = Math.sqrt((this.dimensions.width * this.dimensions.height) / nodes.length);
    const positions = new Map(nodes.map(node => [node.id, { ...node.position }]));

    for (let iter = 0; iter < iterations; iter++) {
      const forces = new Map<string, { x: number; y: number }>();

      // Initialize forces
      nodes.forEach(node => {
        forces.set(node.id, { x: 0, y: 0 });
      });

      // Repulsive forces between all pairs of nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const node1 = nodes[i];
          const node2 = nodes[j];
          if (!node1 || !node2) continue;

          const pos1 = positions.get(node1.id);
          const pos2 = positions.get(node2.id);
          if (!pos1 || !pos2) continue;

          const dx = pos1.x - pos2.x;
          const dy = pos1.y - pos2.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;

          const force = k * k / distance;
          const fx = force * dx / distance;
          const fy = force * dy / distance;

          const force1 = forces.get(node1.id);
          const force2 = forces.get(node2.id);
          if (!force1 || !force2) continue;

          force1.x += fx;
          force1.y += fy;
          force2.x -= fx;
          force2.y -= fy;
        }
      }

      // Attractive forces along edges
      edges.forEach(edge => {
        const pos1 = positions.get(edge.source);
        const pos2 = positions.get(edge.target);
        if (!pos1 || !pos2) return;

        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = distance * distance / k;
        const fx = force * dx / distance;
        const fy = force * dy / distance;

        const force1 = forces.get(edge.source);
        const force2 = forces.get(edge.target);
        if (!force1 || !force2) return;

        force1.x += fx;
        force1.y += fy;
        force2.x -= fx;
        force2.y -= fy;
      });

      // Apply forces with cooling
      const temperature = 0.9 ** iter;
      forces.forEach((force, nodeId) => {
        const pos = positions.get(nodeId);
        if (!pos) return;

        const displacement = Math.sqrt(force.x * force.x + force.y * force.y) || 1;
        const limitedDisplacement = Math.min(displacement, temperature * k);

        pos.x += (force.x / displacement) * limitedDisplacement;
        pos.y += (force.y / displacement) * limitedDisplacement;

        // Keep nodes within bounds
        pos.x = Math.max(50, Math.min(this.dimensions.width - 50, pos.x));
        pos.y = Math.max(50, Math.min(this.dimensions.height - 50, pos.y));
      });
    }

    // Apply calculated positions to nodes
    return nodes.map(node => ({
      ...node,
      position: positions.get(node.id) || { x: 0, y: 0 },
    }));
  }

  private applyCircularLayout(nodes: Node[]): Node[] {
    const centerX = this.dimensions.width / 2;
    const centerY = this.dimensions.height / 2;
    const radius = Math.min(this.dimensions.width, this.dimensions.height) * 0.3;

    return nodes.map((node, index) => {
      if (nodes.length === 1) {
        return { ...node, position: { x: centerX, y: centerY } };
      }

      const angle = (index / nodes.length) * Math.PI * 2;
      return {
        ...node,
        position: {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        },
      };
    });
  }

  private applyGridLayout(nodes: Node[]): Node[] {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const nodeSpacing = this.config.layout?.spacing?.node || [120, 90];
    const nodeWidth = nodeSpacing[0];
    const nodeHeight = nodeSpacing[1];
    const startX = (this.dimensions.width - (cols * nodeWidth)) / 2;
    const startY = 50;

    return nodes.map((node, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      return {
        ...node,
        position: {
          x: startX + col * nodeWidth,
          y: startY + row * nodeHeight,
        },
      };
    });
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

      // Keyboard navigation handler
      const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (!rfInstance) return;

        // Focus management and navigation
        const selectedNodes = nodes.filter(node => node.selected);
        const selectedNode = selectedNodes[0];

        switch (event.key) {
          case 'Escape':
            // Clear selection
            setNodes(nodes => nodes.map(node => ({ ...node, selected: false })));
            setEdges(edges => edges.map(edge => ({ ...edge, selected: false })));
            event.preventDefault();
            break;

          case 'Tab':
            // Focus next/previous node
            if (nodes.length > 0) {
              event.preventDefault();
              const currentIndex = selectedNode ? nodes.findIndex(n => n.id === selectedNode.id) : -1;
              const nextIndex = event.shiftKey
                ? (currentIndex - 1 + nodes.length) % nodes.length
                : (currentIndex + 1) % nodes.length;

              setNodes(nodes => nodes.map((node, index) => ({
                ...node,
                selected: index === nextIndex
              })));
            }
            break;

          case 'Enter':
          case ' ':
            // Activate/select focused node
            if (selectedNode) {
              event.preventDefault();
              // Could trigger node details or other actions
            }
            break;

          case 'ArrowUp':
          case 'ArrowDown':
          case 'ArrowLeft':
          case 'ArrowRight':
            // Pan the viewport or move selected node
            if (selectedNode && !event.shiftKey) {
              event.preventDefault();
              const step = 20;
              const deltaX = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
              const deltaY = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;

              setNodes(nodes => nodes.map(node =>
                node.id === selectedNode.id
                  ? { ...node, position: { x: node.position.x + deltaX, y: node.position.y + deltaY } }
                  : node
              ));
            } else if (event.shiftKey) {
              // Pan the viewport
              event.preventDefault();
              const panStep = 50;
              const deltaX = event.key === 'ArrowLeft' ? panStep : event.key === 'ArrowRight' ? -panStep : 0;
              const deltaY = event.key === 'ArrowUp' ? panStep : event.key === 'ArrowDown' ? -panStep : 0;

              const viewport = rfInstance.getViewport();
              rfInstance.setViewport({
                x: viewport.x + deltaX,
                y: viewport.y + deltaY,
                zoom: viewport.zoom
              });
            }
            break;

          case '+':
          case '=':
            // Zoom in
            event.preventDefault();
            rfInstance.zoomIn();
            break;

          case '-':
            // Zoom out
            event.preventDefault();
            rfInstance.zoomOut();
            break;

          case '0':
            // Fit view
            event.preventDefault();
            rfInstance.fitView();
            break;
        }
      }, [rfInstance, nodes, setNodes, setEdges]);

      // Performance optimization - Level of Detail based on zoom
      const [currentZoom, setCurrentZoom] = useState(1);
      const shouldShowCompactNodes = currentZoom < 0.5 || nodes.length > 100;
      const shouldShowEdgeLabels = currentZoom > 0.8 && nodes.length < 200;

      // Viewport change handler for performance optimization
      const onViewportChange = useCallback((viewport: { x: number; y: number; zoom: number }) => {
        setCurrentZoom(viewport.zoom);
      }, []);

      // Sync nodes and edges with engine, applying performance optimizations
      useEffect(() => {
        let optimizedNodes = engine.nodes;
        let optimizedEdges = engine.edges;

        // Level of Detail: Switch to compact nodes for large graphs or low zoom
        if (shouldShowCompactNodes && optimizedNodes.length > 0) {
          optimizedNodes = optimizedNodes.map(node => ({
            ...node,
            type: 'compact'
          }));
        }

        // Cull edges for very large graphs
        if (optimizedEdges.length > 500) {
          // Keep only the most important edges (those with higher weights or involving selected nodes)
          const selectedNodeIds = new Set(optimizedNodes.filter(n => n.selected).map(n => n.id));
          optimizedEdges = optimizedEdges
            .filter(edge => {
              // Keep edges connected to selected nodes
              if (selectedNodeIds.has(edge.source) || selectedNodeIds.has(edge.target)) {
                return true;
              }
              // Keep edges with high weight (assuming weight is in edge data)
              const weight = edge.data?.weight || 0;
              return typeof weight === 'number' && weight > 0.5;
            })
            .slice(0, 300); // Limit to 300 edges maximum
        }

        setNodes(optimizedNodes);
        setEdges(optimizedEdges);
      }, [engine.nodes, engine.edges, setNodes, setEdges, shouldShowCompactNodes]);

      const config = engine.config.xyflowOptions || {};

      return (
        <div
          style={{ width, height }}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="application"
          aria-label="Interactive graph visualization"
          aria-describedby="graph-instructions"
        >
          {/* Screen reader instructions */}
          <div
            id="graph-instructions"
            style={{
              position: 'absolute',
              left: '-10000px',
              width: '1px',
              height: '1px',
              overflow: 'hidden'
            }}
          >
            Use Tab to navigate between nodes, Arrow keys to move selected nodes or pan (with Shift),
            + and - to zoom, 0 to fit view, Escape to clear selection, Enter or Space to activate nodes.
          </div>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={onInit}
            onViewportChange={onViewportChange}
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
            aria-label="Graph visualization"
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

            {/* Performance Status Panel */}
            {(nodes.length > 50 || edges.length > 100) && (
              <Panel position="top-right">
                <div
                  style={{
                    background: shouldShowCompactNodes ? 'rgba(255, 165, 0, 0.9)' : 'rgba(34, 197, 94, 0.9)',
                    color: 'white',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  }}
                  title={`Performance mode: ${shouldShowCompactNodes ? 'Compact view for better performance' : 'Full detail view'}`}
                >
                  {shouldShowCompactNodes ? '⚡ Optimized' : '🔍 Detailed'}
                  ({nodes.length}N, {edges.length}E)
                </div>
              </Panel>
            )}
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
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
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