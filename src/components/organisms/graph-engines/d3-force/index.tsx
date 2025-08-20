/**
 * D3.js Force Simulation Graph Engine
 * 
 * A complete implementation of D3.js force-directed graph rendering engine.
 * Provides physics-based layouts with real-time animation and smooth interactions.
 * 
 * Features:
 * - Physics-based force simulation (charge, link, collision forces)
 * - Highly customisable force parameters
 * - Smooth real-time animations with alpha decay
 * - Interactive node dragging with position fixing
 * - SVG rendering with zoom and pan support
 * - Automatic graph bounds calculation and fitting
 * - PNG and SVG export capabilities
 * - Efficient enter/update/exit pattern for graph changes
 * 
 * @see https://d3js.org/
 * @see https://github.com/d3/d3-force
 */

import * as d3 from 'd3';
import React from 'react';

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
  IEngineConfig,
  ID3ForceConfig
} from '../types';

// ============================================================================
// D3 Force Engine Implementation
// ============================================================================

export class D3ForceEngine<TVertexData = unknown, TEdgeData = unknown> 
  implements IGraphEngine<TVertexData, TEdgeData> {
  
  // Engine identification
  readonly id = 'd3-force';
  readonly name = 'D3.js Force Simulation';
  readonly description = 'Physics-based graph layout with customisable forces and smooth real-time animation';
  readonly version = '1.0.0';
  readonly isImplemented = true;
  
  // Engine capabilities
  readonly capabilities: IEngineCapabilities = {
    maxVertices: 5000,
    maxEdges: 20000,
    supportsHardwareAcceleration: false, // CPU-based physics
    supportsInteractiveLayout: true,
    supportsPhysicsSimulation: true,
    supportsClustering: false, // Can be implemented with custom forces
    supportsCustomShapes: true,
    supportsEdgeBundling: false, // Requires additional implementation
    exportFormats: ['png', 'svg'],
    memoryUsage: 'low',
    cpuUsage: 'high', // Physics calculations are CPU intensive
    batteryImpact: 'significant', // Continuous animation
  };
  
  // Installation requirements
  readonly requirements: IEngineRequirements = {
    dependencies: [
      { name: 'd3-force', version: '^3.0.0' },
      { name: 'd3-selection', version: '^3.0.0' },
      { name: 'd3-drag', version: '^3.0.0' },
      { name: 'd3-zoom', version: '^3.0.0' },
      { name: 'd3-scale', version: '^4.0.0' },
      { name: '@types/d3-force', version: '^3.0.0', optional: true },
      { name: '@types/d3-selection', version: '^3.0.0', optional: true },
    ],
    browserSupport: {
      chrome: 45,
      firefox: 45,
      safari: 10,
      edge: 12,
    },
    requiredFeatures: [
      'SVG',
      'Canvas 2D Context',
      'RequestAnimationFrame',
      'ES6 Modules',
      'Web Workers (optional for offloading physics)',
    ],
    setupInstructions: `
# Install D3 force simulation modules
npm install d3-force d3-selection d3-drag d3-zoom d3-scale
npm install @types/d3-force @types/d3-selection --save-dev

# Import in your component
import * as d3 from 'd3-force';
import { select } from 'd3-selection';
import { drag } from 'd3-drag';
import { zoom } from 'd3-zoom';
    `.trim(),
  };
  
  // Current status (mutable for runtime updates)
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
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private g: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private simulation: d3.Simulation<d3.SimulationNodeDatum, undefined> | null = null;
  private config: IEngineConfig | null = null;
  private currentGraph: IGraph<TVertexData, TEdgeData> | null = null;
  private graphConfig: IGraphConfig<TVertexData, TEdgeData> | null = null;
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
  
  // D3 data structures
  private nodes: Array<d3.SimulationNodeDatum & { 
    id: string; 
    label?: string; 
    data: TVertexData;
    originalRadius?: number;
  }> = [];
  private links: Array<d3.SimulationLinkDatum<d3.SimulationNodeDatum> & {
    id: string;
    source: string | d3.SimulationNodeDatum;
    target: string | d3.SimulationNodeDatum;
    data: TEdgeData;
    label?: string;
    weight?: number;
  }> = [];
  
  // DOM selections
  private linkSelection: d3.Selection<SVGLineElement, any, SVGGElement, unknown> | null = null;
  private nodeSelection: d3.Selection<SVGCircleElement, any, SVGGElement, unknown> | null = null;
  private labelSelection: d3.Selection<SVGTextElement, any, SVGGElement, unknown> | null = null;
  
  // ============================================================================
  // Implementation
  // ============================================================================
  
  async initialise(
    container: HTMLElement,
    dimensions: IDimensions,
    __config?: IEngineConfig
  ): Promise<void> {
    try {
      this.container = container;
      this.dimensions = dimensions;
      this.config = __config || null;
      
      // Clear any existing content
      d3.select(container).selectAll('*').remove();
      
      // Create SVG container
      this.svg = d3.select(container)
        .append('svg')
        .attr('width', dimensions.width)
        .attr('height', dimensions.height)
        .style('background-color', '#fafafa')
        .style('border-radius', '8px');
      
      // Create main group for zoom/pan
      this.g = this.svg.append('g')
        .attr('class', 'graph-container');
      
      // Set up zoom behaviour
      this.zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 10])
        .on('zoom', (event) => {
          if (this.g) {
            this.g.attr('transform', event.transform);
          }
        });
      
      this.svg.call(this.zoom);
      
      // Create force simulation
      this.simulation = d3.forceSimulation()
        .force('link', d3.forceLink().id((d: any) => d.id))
        .force('charge', d3.forceManyBody())
        .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
        .force('collision', d3.forceCollide());
      
      // Configure forces with config parameters
      this.updateForces();
      
      // Stop simulation initially
      this.simulation.stop();
      
      this._status = {
        isInitialised: true,
        isRendering: false,
      };
    } catch (error) {
      this._status = {
        isInitialised: false,
        isRendering: false,
        lastError: error instanceof Error ? error.message : String(error),
      };
      throw error;
    }
  }
  
  async loadGraph(
    _graph: IGraph<TVertexData, TEdgeData>,
    _config?: IGraphConfig<TVertexData, TEdgeData>
  ): Promise<void> {
    if (!this._status.isInitialised || !this.simulation || !this.g) {
      throw new Error('Engine not initialised. Call initialise() first.');
    }
    
    try {
      this._status = { ...this._status, isRendering: true };
      
      this.currentGraph = _graph;
      this.graphConfig = _config || null;
      
      // Transform graph data to D3 format  
      this.nodes = _graph.vertices.map(vertex => ({
        id: vertex.id,
        label: vertex.label || vertex.id,
        data: vertex.data,
        originalRadius: 8, // Default node radius
        x: Math.random() * this.dimensions.width,
        y: Math.random() * this.dimensions.height,
      }));
      
      this.links = _graph.edges.map(edge => ({
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        data: edge.data,
        label: edge.label,
        weight: edge.weight || 1,
      }));
      
      // Update simulation with new data
      this.simulation
        .nodes(this.nodes)
        .on('tick', () => this.onTick());
      
      (this.simulation.force('link') as d3.ForceLink<any, any>)?.links(this.links);
      
      // Create initial DOM elements
      this.updateDOM();
      
      // Start simulation
      this.simulation.restart();
      
      this._status = { ...this._status, isRendering: false };
    } catch (error) {
      this._status = {
        ...this._status,
        isRendering: false,
        lastError: error instanceof Error ? error.message : String(error),
      };
      throw error;
    }
  }
  
  async updateGraph(
    graph: IGraph<TVertexData, TEdgeData>,
    animate = true
  ): Promise<void> {
    if (!this._status.isInitialised || !this.simulation) {
      // If not initialised, just load the graph
      await this.loadGraph(graph, this.graphConfig || undefined);
      return;
    }
    
    try {
      this._status = { ...this._status, isRendering: true };
      
      this.currentGraph = graph;
      
      // Create new data arrays
      const newNodes = graph.vertices.map(vertex => {
        // Preserve existing positions if node already exists
        const existingNode = this.nodes.find(n => n.id === vertex.id);
        return {
          id: vertex.id,
          label: vertex.label || vertex.id,
          data: vertex.data,
          originalRadius: 8,
          x: existingNode?.x || Math.random() * this.dimensions.width,
          y: existingNode?.y || Math.random() * this.dimensions.height,
          vx: existingNode?.vx || 0,
          vy: existingNode?.vy || 0,
        };
      });
      
      const newLinks = graph.edges.map(edge => ({
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        data: edge.data,
        label: edge.label,
        weight: edge.weight || 1,
      }));
      
      // Update internal data
      this.nodes = newNodes;
      this.links = newLinks;
      
      // Update simulation
      this.simulation.nodes(this.nodes);
      (this.simulation.force('link') as d3.ForceLink<any, any>)?.links(this.links);
      
      // Update DOM with enter/update/exit pattern
      this.updateDOM();
      
      // Restart simulation if animating
      if (animate) {
        this.simulation.alpha(1).restart();
      } else {
        this.simulation.stop();
        this.render();
      }
      
      this._status = { ...this._status, isRendering: false };
    } catch (error) {
      this._status = {
        ...this._status,
        isRendering: false,
        lastError: error instanceof Error ? error.message : String(error),
      };
      throw error;
    }
  }
  
  resize(dimensions: IDimensions): void {
    this.dimensions = dimensions;
    
    if (this.svg) {
      this.svg
        .attr('width', dimensions.width)
        .attr('height', dimensions.height);
    }
    
    if (this.simulation) {
      // Update center force
      this.simulation.force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2));
      this.simulation.alpha(0.1).restart();
    }
  }
  
  async export(
    format: 'png' | 'svg' | 'json' | 'pdf',
    _options?: Record<string, unknown>
  ): Promise<string | Blob> {
    if (!this.svg) {
      throw new Error('SVG not available for export');
    }
    
    switch (format) {
      case 'svg': {
        const svgNode = this.svg.node();
        if (!svgNode) throw new Error('SVG node not available');
        
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgNode);
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
      }
      
      case 'png': {
        // Create a canvas to render the SVG
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not available');
        
        canvas.width = this.dimensions.width;
        canvas.height = this.dimensions.height;
        
        // Get SVG data
        const svgData = await this.export('svg') as string;
        
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create PNG blob'));
              }
            }, 'image/png');
          };
          img.onerror = reject;
          img.src = svgData;
        });
      }
      
      case 'json': {
        const exportData = {
          nodes: this.nodes.map(node => ({
            id: node.id,
            label: node.label,
            x: node.x || 0,
            y: node.y || 0,
            data: node.data,
          })),
          links: this.links.map(link => ({
            id: link.id,
            source: typeof link.source === 'string' ? link.source : (link.source as any).id,
            target: typeof link.target === 'string' ? link.target : (link.target as any).id,
            label: link.label,
            weight: link.weight,
            data: link.data,
          })),
        };
        return JSON.stringify(exportData, null, 2);
      }
      
      default:
        throw new Error(`Export format '${format}' not supported`);
    }
  }
  
  getPositions(): ReadonlyArray<IPositionedVertex<TVertexData>> {
    return this.nodes.map(node => ({
      id: node.id,
      label: node.label,
      data: node.data,
      position: {
        x: node.x || 0,
        y: node.y || 0,
      },
      velocity: {
        x: node.vx || 0,
        y: node.vy || 0,
      },
      fixed: node.fx !== undefined && node.fy !== undefined,
    }));
  }
  
  setPositions(
    positions: ReadonlyArray<IPositionedVertex<TVertexData>>,
    animate = true
  ): void {
    if (!this.simulation) return;
    
    // Update node positions
    positions.forEach(positionedVertex => {
      const node = this.nodes.find(n => n.id === positionedVertex.id);
      if (node) {
        node.x = positionedVertex.position.x;
        node.y = positionedVertex.position.y;
        
        if (positionedVertex.velocity) {
          node.vx = positionedVertex.velocity.x;
          node.vy = positionedVertex.velocity.y;
        }
        
        // Fix positions if specified
        if (positionedVertex.fixed) {
          node.fx = positionedVertex.position.x;
          node.fy = positionedVertex.position.y;
        }
      }
    });
    
    // Update visualization
    if (animate) {
      this.simulation.alpha(0.3).restart();
    } else {
      this.render();
    }
  }
  
  fitToView(padding = 50, animate = true): void {
    if (!this.svg || !this.zoom || this.nodes.length === 0) return;
    
    // Calculate bounds of all nodes
    const xValues = this.nodes.map(n => n.x || 0);
    const yValues = this.nodes.map(n => n.y || 0);
    
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    
    if (graphWidth === 0 || graphHeight === 0) return;
    
    // Calculate scale to fit graph in viewport with padding
    const scaleX = (this.dimensions.width - padding * 2) / graphWidth;
    const scaleY = (this.dimensions.height - padding * 2) / graphHeight;
    const scale = Math.min(scaleX, scaleY, 2); // Cap scale at 2x
    
    // Calculate center translation
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const translateX = this.dimensions.width / 2 - centerX * scale;
    const translateY = this.dimensions.height / 2 - centerY * scale;
    
    const transform = d3.zoomIdentity
      .translate(translateX, translateY)
      .scale(scale);
    
    // Apply transform
    const transition = animate ? this.svg.transition().duration(750) : this.svg;
    transition.call(this.zoom.transform as any, transform);
  }
  
  destroy(): void {
    // Stop force simulation
    if (this.simulation) {
      this.simulation.stop();
      this.simulation = null;
    }
    
    // Remove DOM elements
    if (this.container) {
      d3.select(this.container).selectAll('*').remove();
    }
    
    // Clean up references
    this.container = null;
    this.svg = null;
    this.g = null;
    this.zoom = null;
    this.nodes = [];
    this.links = [];
    this.linkSelection = null;
    this.nodeSelection = null;
    this.labelSelection = null;
    
    this._status = {
      isInitialised: false,
      isRendering: false,
    };
  }
  
  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  
  private updateForces(): void {
    if (!this.simulation) return;
    
    const forceConfig = (this.config as ID3ForceConfig)?.forceOptions || {};
    
    // Configure link force
    const linkForce = this.simulation.force('link') as d3.ForceLink<any, any>;
    if (linkForce) {
      linkForce
        .distance(forceConfig.linkDistance || 80)
        .strength(forceConfig.linkStrength || 0.1);
    }
    
    // Configure charge force
    const chargeForce = this.simulation.force('charge') as d3.ForceManyBody<any>;
    if (chargeForce) {
      chargeForce.strength(forceConfig.chargeStrength || -300);
    }
    
    // Configure center force
    const centerForce = this.simulation.force('center') as d3.ForceCenter<any>;
    if (centerForce) {
      centerForce.strength(forceConfig.centerStrength || 0.1);
    }
    
    // Configure collision force
    const collisionForce = this.simulation.force('collision') as d3.ForceCollide<any>;
    if (collisionForce) {
      collisionForce.radius(forceConfig.collideRadius || 30);
    }
    
    // Configure simulation parameters
    this.simulation
      .alpha(forceConfig.alpha || 1)
      .alphaDecay(forceConfig.alphaDecay || 0.0228)
      .velocityDecay(forceConfig.velocityDecay || 0.4);
  }
  
  private updateDOM(): void {
    if (!this.g) return;
    
    // Update links with enter/update/exit pattern
    this.linkSelection = this.g.selectAll<SVGLineElement, any>('.link')
      .data(this.links, (d: any) => d.id);
    
    this.linkSelection.exit().remove();
    
    const linkEnter = this.linkSelection.enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2);
    
    this.linkSelection = linkEnter.merge(this.linkSelection);
    
    // Update nodes with enter/update/exit pattern
    this.nodeSelection = this.g.selectAll<SVGCircleElement, any>('.node')
      .data(this.nodes, (d: any) => d.id);
    
    this.nodeSelection.exit().remove();
    
    const nodeEnter = this.nodeSelection.enter()
      .append('circle')
      .attr('class', 'node')
      .attr('r', 8)
      .attr('fill', '#4299e1')
      .attr('stroke', '#2b6cb0')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(this.createDragBehaviour());
    
    this.nodeSelection = nodeEnter.merge(this.nodeSelection);
    
    // Update labels with enter/update/exit pattern
    this.labelSelection = this.g.selectAll<SVGTextElement, any>('.label')
      .data(this.nodes, (d: any) => d.id);
    
    this.labelSelection.exit().remove();
    
    const labelEnter = this.labelSelection.enter()
      .append('text')
      .attr('class', 'label')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .attr('font-size', '10px')
      .attr('fill', '#2d3748')
      .attr('pointer-events', 'none')
      .text((d: any) => d.label || d.id);
    
    this.labelSelection = labelEnter.merge(this.labelSelection);
  }
  
  private onTick(): void {
    if (!this.linkSelection || !this.nodeSelection || !this.labelSelection) return;
    
    // Update link positions
    this.linkSelection
      .attr('x1', (d: any) => (d.source as any).x)
      .attr('y1', (d: any) => (d.source as any).y)
      .attr('x2', (d: any) => (d.target as any).x)
      .attr('y2', (d: any) => (d.target as any).y);
    
    // Update node positions
    this.nodeSelection
      .attr('cx', (d: any) => d.x)
      .attr('cy', (d: any) => d.y);
    
    // Update label positions
    this.labelSelection
      .attr('x', (d: any) => d.x)
      .attr('y', (d: any) => d.y);
  }
  
  private render(): void {
    // Force a single tick to update positions
    this.onTick();
  }
  
  private createDragBehaviour(): d3.DragBehavior<SVGCircleElement, any, any> {
    if (!this.simulation) {
      throw new Error('Simulation not available for drag behaviour');
    }
    
    return d3.drag<SVGCircleElement, any>()
      .on('start', (event, d: any) => {
        if (!event.active && this.simulation) {
          this.simulation.alphaTarget(0.3).restart();
        }
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d: any) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, _d: any) => {
        if (!event.active && this.simulation) {
          this.simulation.alphaTarget(0);
        }
        // Keep position fixed after dragging
        // To unfix, user would need to double-click or use API
      });
  }
  
  // ============================================================================
  // Preview Component
  // ============================================================================
  
  getPreviewComponent(): React.ComponentType<{
    dimensions: IDimensions;
    sampleData?: IGraph<TVertexData, TEdgeData>;
  }> {
    return D3ForcePreview;
  }
}

// ============================================================================
// Preview Component with Animated Physics Simulation
// ============================================================================

const D3ForcePreview: React.FC<{
  dimensions: IDimensions;
  sampleData?: IGraph<unknown, unknown>;
}> = ({ dimensions }) => {
  const [animationPhase, setAnimationPhase] = React.useState(0);
  
  // Simple animation to simulate physics
  React.useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 0.02) % (Math.PI * 2));
    }, 50);
    
    return () => clearInterval(interval);
  }, []);
  
  // Calculate animated node positions
  const nodes = React.useMemo(() => {
    const centerX = 150;
    const centerY = 100;
    const time = animationPhase;
    
    return [
      { 
        id: 'A', 
        x: centerX + Math.cos(time) * 40, 
        y: centerY + Math.sin(time) * 30,
        r: 18,
        color: '#ff6b6b'
      },
      { 
        id: 'B', 
        x: centerX + Math.cos(time + Math.PI * 0.5) * 50, 
        y: centerY + Math.sin(time + Math.PI * 0.5) * 35,
        r: 15,
        color: '#4299e1'
      },
      { 
        id: 'C', 
        x: centerX + Math.cos(time + Math.PI) * 45, 
        y: centerY + Math.sin(time + Math.PI) * 32,
        r: 16,
        color: '#48bb78'
      },
      { 
        id: 'D', 
        x: centerX + Math.cos(time + Math.PI * 1.5) * 38, 
        y: centerY + Math.sin(time + Math.PI * 1.5) * 28,
        r: 14,
        color: '#ed8936'
      },
      { 
        id: 'E', 
        x: centerX + Math.cos(time * 0.7) * 65, 
        y: centerY + Math.sin(time * 0.7) * 45,
        r: 12,
        color: '#9f7aea'
      },
    ];
  }, [animationPhase]);
  
  return (
    <div
      style={{
        width: dimensions.width,
        height: dimensions.height,
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8f9fa',
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
            backgroundColor: '#4299e1',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          D3
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
            D3.js Force Simulation
          </div>
          <div style={{ fontSize: '12px', color: '#718096' }}>
            Physics-Based Layout Engine
          </div>
        </div>
        <div
          style={{
            marginLeft: 'auto',
            padding: '4px 8px',
            backgroundColor: '#c6f6d5',
            color: '#22543d',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '500',
          }}
        >
          Ready
        </div>
      </div>
      
      {/* Animated graph visualization */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          background: `
            linear-gradient(135deg, rgba(66, 153, 225, 0.05) 0%, rgba(72, 187, 120, 0.05) 100%)
          `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="300"
          height="200"
          style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))' }}
        >
          <defs>
            <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>
          
          {/* Animated connection lines */}
          <g stroke="rgba(203, 213, 224, 0.6)" strokeWidth="2" fill="none">
            {nodes.map((node, i) => 
              nodes.slice(i + 1).map((otherNode, j) => (
                <line
                  key={`${i}-${j}`}
                  x1={node.x}
                  y1={node.y}
                  x2={otherNode.x}
                  y2={otherNode.y}
                  opacity={0.3 + 0.3 * Math.sin(animationPhase * 2 + i + j)}
                />
              ))
            )}
          </g>
          
          {/* Animated nodes */}
          <g>
            {nodes.map((node, i) => (
              <g key={node.id}>
                {/* Glow effect */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.r + 5}
                  fill="url(#nodeGlow)"
                  opacity={0.4 + 0.3 * Math.sin(animationPhase * 1.5 + i)}
                />
                {/* Main node */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.r}
                  fill={node.color}
                  stroke="#ffffff"
                  strokeWidth="3"
                />
                {/* Node label */}
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  fontSize="12"
                  fill="white"
                  fontFamily="system-ui"
                  fontWeight="bold"
                >
                  {node.id}
                </text>
              </g>
            ))}
          </g>
          
          {/* Force vectors visualization */}
          <g stroke="#e53e3e" strokeWidth="1" opacity="0.6">
            {nodes.map((node, i) => {
              const forceX = Math.cos(animationPhase * 2 + i) * 15;
              const forceY = Math.sin(animationPhase * 2 + i) * 15;
              return (
                <g key={`force-${i}`}>
                  <line
                    x1={node.x}
                    y1={node.y}
                    x2={node.x + forceX}
                    y2={node.y + forceY}
                  />
                  <polygon
                    points={`${node.x + forceX},${node.y + forceY} ${node.x + forceX - 3},${node.y + forceY - 2} ${node.x + forceX - 3},${node.y + forceY + 2}`}
                    fill="#e53e3e"
                  />
                </g>
              );
            })}
          </g>
        </svg>
        
        {/* Real-time indicators */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#4a5568',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              backgroundColor: '#48bb78',
              borderRadius: '50%',
              animation: 'pulse 1.5s infinite',
            }}
          />
          Real-time Physics
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
        </div>
        
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#4a5568',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          Force Vectors
        </div>
        
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '6px 10px',
            borderRadius: '4px',
            fontSize: '10px',
            color: '#718096',
            fontFamily: 'monospace',
          }}
        >
          α: {(0.1 + 0.05 * Math.sin(animationPhase)).toFixed(3)}
        </div>
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
          <span>✓ Physics Forces</span>
          <span>✓ Real-time Animation</span>
          <span>✓ Custom Forces</span>
          <span>✓ Smooth Interaction</span>
          <span>✓ Precise Control</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a new D3 Force engine instance.
 */
export function createD3ForceEngine<TVertexData = unknown, TEdgeData = unknown>(
  _config?: ID3ForceConfig
): D3ForceEngine<TVertexData, TEdgeData> {
  return new D3ForceEngine<TVertexData, TEdgeData>();
}

/**
 * Get default D3 Force configuration for common use cases.
 */
export function getDefaultD3ForceConfig(): ID3ForceConfig {
  return {
    forceOptions: {
      linkDistance: 80,
      linkStrength: 0.1,
      chargeStrength: -300,
      centerStrength: 0.1,
      collideRadius: 30,
      alpha: 1,
      alphaDecay: 0.0228,
      velocityDecay: 0.4,
    },
    performanceLevel: 'balanced',
  };
}

/**
 * Get high-performance D3 Force configuration for large graphs.
 */
export function getHighPerformanceD3ForceConfig(): ID3ForceConfig {
  return {
    forceOptions: {
      linkDistance: 60,
      linkStrength: 0.05,
      chargeStrength: -150,
      centerStrength: 0.05,
      collideRadius: 20,
      alpha: 0.8,
      alphaDecay: 0.05, // Faster convergence
      velocityDecay: 0.6, // More damping
    },
    performanceLevel: 'performance',
  };
}

// Export the engine and utilities
// Named export only - no default export
export type { ID3ForceConfig };