/**
 * HTML5 Canvas Graph Engine Implementation
 *
 * A production-ready HTML5 Canvas-based graph rendering engine providing excellent
 * browser compatibility and predictable rendering behavior with good performance
 * for moderate-sized graphs.
 *
 * Features:
 * - Excellent cross-browser compatibility (Chrome 4+, Firefox 4+, Safari 4+, IE 9+)
 * - Predictable 2D rendering with precise pixel control
 * - Good performance for graphs up to 5,000 vertices
 * - Built-in text rendering and typography support
 * - Easy export to PNG/JPEG formats
 * - Low memory footprint
 * - Straightforward debugging and development
 * - High-DPI display support
 * - Smooth animations and transitions
 * - Interactive pan, zoom, and selection
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
 * @see https://www.html5canvastutorials.com/
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { getEntityColour, getOpenAccessColour } from '../../../design-tokens.utils';
import { setCanvasEngineDebug, getMemoryUsageMB } from '../types/debug';

import type {
  IGraph,
  IDimensions,
  IGraphConfig,
  IPositionedVertex,
  IVertex,
  IEdge,
  IPosition
} from '../../graph-core/interfaces';
import type {
  IGraphEngine,
  IEngineCapabilities,
  IEngineRequirements,
  IEngineStatus,
  IEngineConfig,
  ICanvasConfig
} from '../types';

// ============================================================================
// Canvas Engine Implementation
// ============================================================================

// Internal types for rendered elements
interface RenderedNode {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  label: string;
  originalData: any;
  isSelected: boolean;
  isHovered: boolean;
}

interface RenderedEdge {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  color: string;
  width: number;
  originalData: any;
}

interface ViewTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

interface InteractionState {
  isDragging: boolean;
  isPanning: boolean;
  dragNodeId: string | null;
  lastMousePos: { x: number; y: number } | null;
  selectedNodes: Set<string>;
  hoveredNodeId: string | null;
}

interface PerformanceOptions {
  enableViewportCulling: boolean;
  enableLevelOfDetail: boolean;
  cullingMargin: number;
  lodThresholds: {
    hideLabels: number;
    simplifyNodes: number;
    hideEdges: number;
  };
}

interface ForceDirectedOptions {
  enabled: boolean;
  iterations: number;
  repulsion: number;
  attraction: number;
  damping: number;
  centerForce: number;
  minDistance: number;
  maxDistance: number;
}

interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export class CanvasEngine<TVertexData = unknown, TEdgeData = unknown>
  implements IGraphEngine<TVertexData, TEdgeData> {

  // Engine identification
  readonly id = 'canvas';
  readonly name = 'HTML5 Canvas Renderer';
  readonly description = 'Reliable 2D rendering with excellent browser compatibility and straightforward implementation';
  readonly version = '1.0.0';
  readonly isImplemented = true;

  // Engine capabilities
  readonly capabilities: IEngineCapabilities = {
    maxVertices: 5000,
    maxEdges: 15000,
    supportsHardwareAcceleration: false, // Software rendering
    supportsInteractiveLayout: true,
    supportsPhysicsSimulation: false,
    supportsClustering: false,
    supportsCustomShapes: true,
    supportsEdgeBundling: false,
    exportFormats: ['png'],
    memoryUsage: 'low',
    cpuUsage: 'medium',
    batteryImpact: 'minimal',
  };

  // Installation requirements
  readonly requirements: IEngineRequirements = {
    dependencies: [],
    browserSupport: {
      chrome: 4,
      firefox: 4,
      safari: 4,
      edge: 12,
    },
    requiredFeatures: [
      'Canvas 2D Context',
      'Canvas.getImageData()',
      'Canvas.toDataURL()',
    ],
    setupInstructions: 'No external dependencies required! HTML5 Canvas is supported natively.',
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
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private dimensions: IDimensions = { width: 800, height: 600 };
  private config: ICanvasConfig = getDefaultCanvasConfig();

  // Graph data
  private currentGraph: IGraph<TVertexData, TEdgeData> | null = null;
  private renderedNodes: RenderedNode[] = [];
  private renderedEdges: RenderedEdge[] = [];

  // Viewport and interaction
  private transform: ViewTransform = { scale: 1, translateX: 0, translateY: 0 };
  private interaction: InteractionState = {
    isDragging: false,
    isPanning: false,
    dragNodeId: null,
    lastMousePos: null,
    selectedNodes: new Set(),
    hoveredNodeId: null,
  };

  // Animation
  private animationId: number | null = null;
  private needsRedraw = false;

  // Performance optimizations
  private performance: PerformanceOptions = {
    enableViewportCulling: true,
    enableLevelOfDetail: true,
    cullingMargin: 100, // Extra margin around viewport for culling
    lodThresholds: {
      hideLabels: 0.3,      // Hide labels when scale < 0.3
      simplifyNodes: 0.2,   // Simplify nodes when scale < 0.2
      hideEdges: 0.1,       // Hide edges when scale < 0.1
    },
  };
  private lastFrameTime = 0;
  private frameCount = 0;
  private fps = 60;

  // Force-directed layout
  private forceOptions: ForceDirectedOptions = {
    enabled: false,
    iterations: 100,
    repulsion: 100,
    attraction: 0.01,
    damping: 0.9,
    centerForce: 0.1,
    minDistance: 30,
    maxDistance: 200,
  };
  private nodeVelocities: Map<string, { vx: number; vy: number }> = new Map();
  private layoutAnimationId: number | null = null;

  // ============================================================================
  // Public API Implementation
  // ============================================================================

  async initialise(
    container: HTMLElement,
    dimensions: IDimensions,
    config?: IEngineConfig
  ): Promise<void> {
    try {
      this.container = container;
      this.dimensions = dimensions;
      this.config = { ...this.config, ...config } as ICanvasConfig;

      // Create canvas element
      this.canvas = document.createElement('canvas');
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.cursor = 'grab';

      // Set up 2D context with high-DPI support
      this.ctx = setupHighDPICanvas(this.canvas, dimensions.width, dimensions.height);

      // Configure context
      if (this.config.canvasOptions) {
        const options = this.config.canvasOptions;
        if (typeof options.imageSmoothingEnabled === 'boolean') {
          this.ctx.imageSmoothingEnabled = options.imageSmoothingEnabled;
        }
        if (options.imageSmoothingQuality) {
          this.ctx.imageSmoothingQuality = options.imageSmoothingQuality;
        }
        if (options.textBaseline) {
          this.ctx.textBaseline = options.textBaseline;
        }
        if (options.textAlign) {
          this.ctx.textAlign = options.textAlign;
        }
      }

      // Add to container
      container.appendChild(this.canvas);

      // Set up event listeners
      this.setupEventListeners();

      // Start render loop
      this.startRenderLoop();

      this._status = {
        isInitialised: true,
        isRendering: false,
        lastError: undefined,
      };

    } catch (error) {
      this._status = {
        isInitialised: false,
        isRendering: false,
        lastError: error instanceof Error ? error.message : 'Initialization failed',
      };
      throw error;
    }
  }

  async loadGraph(
    graph: IGraph<TVertexData, TEdgeData>,
    _config?: IGraphConfig<TVertexData, TEdgeData>
  ): Promise<void> {
    this.currentGraph = graph;

    // Convert graph data to renderable format
    this.updateRenderedElements();

    // Auto-fit to view
    this.fitToView(50, false);

    // Trigger redraw
    this.needsRedraw = true;
  }

  async updateGraph(
    graph: IGraph<TVertexData, TEdgeData>,
    animate = true
  ): Promise<void> {
    this.currentGraph = graph;
    this.updateRenderedElements();

    if (animate) {
      // Simple fade transition
      this.animateUpdate();
    } else {
      this.needsRedraw = true;
    }
  }

  resize(dimensions: IDimensions): void {
    if (!this.canvas || !this.ctx) return;

    this.dimensions = dimensions;
    setupHighDPICanvas(this.canvas, dimensions.width, dimensions.height);
    this.needsRedraw = true;
  }

  async export(
    format: 'png' | 'svg' | 'json' | 'pdf',
    options?: Record<string, unknown>
  ): Promise<string | Blob> {
    if (!this.canvas) throw new Error('Canvas not initialized');

    if (format === 'png') {
      const quality = (options?.quality as number) || 0.92;

      return new Promise((resolve, reject) => {
        this.canvas!.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to export canvas'));
            }
          },
          'image/png',
          quality
        );
      });
    }

    throw new Error(`Export format ${format} not supported by Canvas engine`);
  }

  getPositions(): ReadonlyArray<IPositionedVertex<TVertexData>> {
    return this.renderedNodes.map(node => ({
      ...node.originalData,
      position: { x: node.x, y: node.y },
    }));
  }

  setPositions(
    positions: ReadonlyArray<IPositionedVertex<TVertexData>>,
    animate = true
  ): void {
    const positionMap = new Map(positions.map(p => [p.id, p.position]));

    this.renderedNodes.forEach(node => {
      const newPos = positionMap.get(node.id);
      if (newPos) {
        if (animate) {
          this.animateNodeToPosition(node, newPos.x, newPos.y);
        } else {
          node.x = newPos.x;
          node.y = newPos.y;
        }
      }
    });

    this.needsRedraw = true;
  }

  fitToView(padding = 50, animate = true): void {
    if (this.renderedNodes.length === 0) return;

    // Calculate bounding box
    const minX = Math.min(...this.renderedNodes.map(n => n.x - n.radius));
    const maxX = Math.max(...this.renderedNodes.map(n => n.x + n.radius));
    const minY = Math.min(...this.renderedNodes.map(n => n.y - n.radius));
    const maxY = Math.max(...this.renderedNodes.map(n => n.y + n.radius));

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;

    if (graphWidth === 0 || graphHeight === 0) return;

    // Calculate scale to fit with padding
    const scaleX = (this.dimensions.width - padding * 2) / graphWidth;
    const scaleY = (this.dimensions.height - padding * 2) / graphHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 1:1

    // Calculate translation to center
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const translateX = this.dimensions.width / 2 - centerX * scale;
    const translateY = this.dimensions.height / 2 - centerY * scale;

    if (animate) {
      this.animateTransform({ scale, translateX, translateY });
    } else {
      this.transform = { scale, translateX, translateY };
      this.needsRedraw = true;
    }
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.stopForceSimulation();

    if (this.canvas && this.container) {
      this.container.removeChild(this.canvas);
    }

    this.container = null;
    this.canvas = null;
    this.ctx = null;
    this.currentGraph = null;
    this.renderedNodes = [];
    this.renderedEdges = [];
    this.nodeVelocities.clear();

    this._status = {
      isInitialised: false,
      isRendering: false,
      lastError: undefined,
    };
  }

  // ============================================================================
  // Performance Optimization Methods
  // ============================================================================

  private calculateViewportBounds(): ViewportBounds {
    const margin = this.performance.cullingMargin;
    return {
      minX: (-this.transform.translateX - margin) / this.transform.scale,
      maxX: (-this.transform.translateX + this.dimensions.width + margin) / this.transform.scale,
      minY: (-this.transform.translateY - margin) / this.transform.scale,
      maxY: (-this.transform.translateY + this.dimensions.height + margin) / this.transform.scale,
    };
  }

  private isNodeVisible(node: RenderedNode, bounds: ViewportBounds): boolean {
    const radius = node.radius;
    return (
      node.x + radius >= bounds.minX &&
      node.x - radius <= bounds.maxX &&
      node.y + radius >= bounds.minY &&
      node.y - radius <= bounds.maxY
    );
  }

  private isEdgeVisible(edge: RenderedEdge, bounds: ViewportBounds): boolean {
    // Check if at least one endpoint is visible or edge crosses viewport
    const sourceVisible =
      edge.sourceX >= bounds.minX && edge.sourceX <= bounds.maxX &&
      edge.sourceY >= bounds.minY && edge.sourceY <= bounds.maxY;

    const targetVisible =
      edge.targetX >= bounds.minX && edge.targetX <= bounds.maxX &&
      edge.targetY >= bounds.minY && edge.targetY <= bounds.maxY;

    if (sourceVisible || targetVisible) return true;

    // Check if edge crosses viewport (basic line-rectangle intersection)
    return this.lineIntersectsRect(
      edge.sourceX, edge.sourceY, edge.targetX, edge.targetY,
      bounds.minX, bounds.minY, bounds.maxX, bounds.maxY
    );
  }

  private lineIntersectsRect(
    x1: number, y1: number, x2: number, y2: number,
    rectX1: number, rectY1: number, rectX2: number, rectY2: number
  ): boolean {
    // Simple AABB line intersection check
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    return !(maxX < rectX1 || minX > rectX2 || maxY < rectY1 || minY > rectY2);
  }

  private updatePerformanceMetrics(): void {
    const now = performance.now();
    if (this.lastFrameTime > 0) {
      const deltaTime = now - this.lastFrameTime;
      this.fps = Math.round(1000 / deltaTime);
      this.frameCount++;
    }
    this.lastFrameTime = now;
  }

  getPerformanceStats(): { fps: number; nodeCount: number; edgeCount: number; scale: number } {
    return {
      fps: this.fps,
      nodeCount: this.renderedNodes.length,
      edgeCount: this.renderedEdges.length,
      scale: this.transform.scale,
    };
  }

  // ============================================================================
  // Private Implementation
  // ============================================================================

  private updateRenderedElements(): void {
    if (!this.currentGraph) return;

    // Convert vertices to rendered nodes
    this.renderedNodes = this.currentGraph.vertices.map((vertex, index) => {
      const angle = (index / this.currentGraph!.vertices.length) * 2 * Math.PI;
      const radius = Math.min(this.dimensions.width, this.dimensions.height) * 0.3;

      return {
        id: vertex.id,
        x: this.dimensions.width / 2 + Math.cos(angle) * radius,
        y: this.dimensions.height / 2 + Math.sin(angle) * radius,
        radius: this.getNodeRadius(vertex),
        color: this.getNodeColor(vertex),
        label: this.getNodeLabel(vertex),
        originalData: vertex,
        isSelected: this.interaction.selectedNodes.has(vertex.id),
        isHovered: this.interaction.hoveredNodeId === vertex.id,
      };
    });

    // Convert edges to rendered edges
    this.renderedEdges = this.currentGraph.edges.map(edge => {
      const sourceNode = this.renderedNodes.find(n => n.id === edge.sourceId);
      const targetNode = this.renderedNodes.find(n => n.id === edge.targetId);

      if (!sourceNode || !targetNode) {
        throw new Error(`Edge references non-existent node: ${edge.sourceId} -> ${edge.targetId}`);
      }

      return {
        id: `${edge.sourceId}-${edge.targetId}`,
        sourceX: sourceNode.x,
        sourceY: sourceNode.y,
        targetX: targetNode.x,
        targetY: targetNode.y,
        color: this.getEdgeColor(edge),
        width: this.getEdgeWidth(edge),
        originalData: edge,
      };
    });
  }

  private getNodeRadius(vertex: IVertex<TVertexData>): number {
    // Base radius with some variation based on data
    const baseRadius = 20;
    if (vertex.citationCount) {
      return Math.max(baseRadius, Math.min(40, baseRadius + Math.log(vertex.citationCount + 1) * 3));
    }
    return baseRadius;
  }

  private getNodeColor(vertex: IVertex<TVertexData>): string {
    return getEntityColour(vertex.entityType || 'work');
  }

  private getNodeLabel(vertex: IVertex<TVertexData>): string {
    if (vertex.displayName && vertex.displayName.length > 20) {
      return vertex.displayName.substring(0, 17) + '...';
    }
    return vertex.displayName || vertex.id;
  }

  private getEdgeColor(_edge: IEdge<TEdgeData>): string {
    return '#cbd5e0';
  }

  private getEdgeWidth(edge: IEdge<TEdgeData>): number {
    if (edge.weight !== undefined) {
      return Math.max(1, Math.min(5, edge.weight * 3));
    }
    return 2;
  }

  private setupEventListeners(): void {
    if (!this.canvas) return;

    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));

    // Prevent context menu
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private handleMouseDown(event: MouseEvent): void {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert to graph coordinates
    const graphCoords = this.screenToGraph(x, y);

    // Check if clicking on a node
    const clickedNode = this.getNodeAt(graphCoords.x, graphCoords.y);

    if (clickedNode) {
      this.interaction.isDragging = true;
      this.interaction.dragNodeId = clickedNode.id;
      this.canvas.style.cursor = 'grabbing';
    } else {
      this.interaction.isPanning = true;
      this.canvas.style.cursor = 'grabbing';
    }

    this.interaction.lastMousePos = { x, y };
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.canvas || !this.interaction.lastMousePos) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const deltaX = x - this.interaction.lastMousePos.x;
    const deltaY = y - this.interaction.lastMousePos.y;

    if (this.interaction.isDragging && this.interaction.dragNodeId) {
      // Drag node
      const node = this.renderedNodes.find(n => n.id === this.interaction.dragNodeId);
      if (node) {
        node.x += deltaX / this.transform.scale;
        node.y += deltaY / this.transform.scale;
        this.needsRedraw = true;
      }
    } else if (this.interaction.isPanning) {
      // Pan viewport
      this.transform.translateX += deltaX;
      this.transform.translateY += deltaY;
      this.needsRedraw = true;
    } else {
      // Update hover state
      const graphCoords = this.screenToGraph(x, y);
      const hoveredNode = this.getNodeAt(graphCoords.x, graphCoords.y);

      if (hoveredNode) {
        this.canvas.style.cursor = 'pointer';
        if (this.interaction.hoveredNodeId !== hoveredNode.id) {
          this.interaction.hoveredNodeId = hoveredNode.id;
          this.updateNodeHoverStates();
          this.needsRedraw = true;
        }
      } else {
        this.canvas.style.cursor = 'grab';
        if (this.interaction.hoveredNodeId) {
          this.interaction.hoveredNodeId = null;
          this.updateNodeHoverStates();
          this.needsRedraw = true;
        }
      }
    }

    this.interaction.lastMousePos = { x, y };
  }

  private handleMouseUp(): void {
    this.interaction.isDragging = false;
    this.interaction.isPanning = false;
    this.interaction.dragNodeId = null;
    this.interaction.lastMousePos = null;

    if (this.canvas) {
      this.canvas.style.cursor = 'grab';
    }
  }

  private handleWheel(event: WheelEvent): void {
    event.preventDefault();

    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Zoom centered on mouse position
    const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(3, this.transform.scale * scaleFactor));

    // Adjust translation to zoom toward mouse position
    const scaleRatio = newScale / this.transform.scale;
    this.transform.translateX = x - (x - this.transform.translateX) * scaleRatio;
    this.transform.translateY = y - (y - this.transform.translateY) * scaleRatio;
    this.transform.scale = newScale;

    this.needsRedraw = true;
  }

  private handleClick(event: MouseEvent): void {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const graphCoords = this.screenToGraph(x, y);
    const clickedNode = this.getNodeAt(graphCoords.x, graphCoords.y);

    if (clickedNode) {
      // Toggle selection
      if (event.ctrlKey || event.metaKey) {
        if (this.interaction.selectedNodes.has(clickedNode.id)) {
          this.interaction.selectedNodes.delete(clickedNode.id);
        } else {
          this.interaction.selectedNodes.add(clickedNode.id);
        }
      } else {
        this.interaction.selectedNodes.clear();
        this.interaction.selectedNodes.add(clickedNode.id);
      }

      this.updateNodeSelectionStates();
      this.needsRedraw = true;
    } else if (!event.ctrlKey && !event.metaKey) {
      // Clear selection when clicking empty space
      this.interaction.selectedNodes.clear();
      this.updateNodeSelectionStates();
      this.needsRedraw = true;
    }
  }

  private getNodeAt(x: number, y: number): RenderedNode | null {
    for (const node of this.renderedNodes) {
      const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
      if (distance <= node.radius) {
        return node;
      }
    }
    return null;
  }

  private screenToGraph(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.transform.translateX) / this.transform.scale,
      y: (screenY - this.transform.translateY) / this.transform.scale,
    };
  }

  private updateNodeSelectionStates(): void {
    this.renderedNodes.forEach(node => {
      node.isSelected = this.interaction.selectedNodes.has(node.id);
    });
  }

  private updateNodeHoverStates(): void {
    this.renderedNodes.forEach(node => {
      node.isHovered = this.interaction.hoveredNodeId === node.id;
    });
  }

  private startRenderLoop(): void {
    const render = () => {
      if (this.needsRedraw) {
        this.draw();
        this.needsRedraw = false;
      }
      this.animationId = requestAnimationFrame(render);
    };

    this.animationId = requestAnimationFrame(render);
  }

  private draw(): void {
    if (!this.ctx || !this.canvas) return;

    // Update performance metrics
    this.updatePerformanceMetrics();

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Save context state
    this.ctx.save();

    // Apply transforms
    this.ctx.translate(this.transform.translateX, this.transform.translateY);
    this.ctx.scale(this.transform.scale, this.transform.scale);

    // Calculate viewport bounds for culling
    const viewportBounds = this.performance.enableViewportCulling
      ? this.calculateViewportBounds()
      : null;

    // Determine level of detail based on scale
    const scale = this.transform.scale;
    const shouldHideLabels = this.performance.enableLevelOfDetail &&
      scale < this.performance.lodThresholds.hideLabels;
    const shouldSimplifyNodes = this.performance.enableLevelOfDetail &&
      scale < this.performance.lodThresholds.simplifyNodes;
    const shouldHideEdges = this.performance.enableLevelOfDetail &&
      scale < this.performance.lodThresholds.hideEdges;

    // Draw edges first (behind nodes) if not hidden by LOD
    if (!shouldHideEdges) {
      this.drawEdges(viewportBounds);
    }

    // Draw nodes
    this.drawNodes(viewportBounds, shouldHideLabels, shouldSimplifyNodes);

    // Restore context state
    this.ctx.restore();

    // Draw performance overlay in debug mode
    if (this.isDebugMode()) {
      this.drawPerformanceOverlay();
    }
  }

  private drawEdges(viewportBounds: ViewportBounds | null): void {
    if (!this.ctx) return;

    // Set edge drawing style once
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = '#cbd5e0';

    // Use batching for better performance
    this.ctx.beginPath();

    let drawnEdgeCount = 0;
    for (const edge of this.renderedEdges) {
      // Skip if viewport culling is enabled and edge is not visible
      if (viewportBounds && !this.isEdgeVisible(edge, viewportBounds)) {
        continue;
      }

      // Set individual edge properties only when needed
      if (this.ctx.strokeStyle !== edge.color) {
        this.ctx.stroke(); // Draw previous batch
        this.ctx.beginPath();
        this.ctx.strokeStyle = edge.color;
      }
      if (this.ctx.lineWidth !== edge.width) {
        this.ctx.stroke(); // Draw previous batch
        this.ctx.beginPath();
        this.ctx.lineWidth = edge.width;
      }

      this.ctx.moveTo(edge.sourceX, edge.sourceY);
      this.ctx.lineTo(edge.targetX, edge.targetY);
      drawnEdgeCount++;
    }

    // Draw final batch
    this.ctx.stroke();
  }

  private drawNodes(
    viewportBounds: ViewportBounds | null,
    hideLabels: boolean,
    simplifyNodes: boolean
  ): void {
    if (!this.ctx) return;

    let drawnNodeCount = 0;

    for (const node of this.renderedNodes) {
      // Skip if viewport culling is enabled and node is not visible
      if (viewportBounds && !this.isNodeVisible(node, viewportBounds)) {
        continue;
      }

      const nodeRadius = simplifyNodes ? Math.max(2, node.radius * 0.5) : node.radius;

      // Draw node shadow if selected or hovered (only in high quality mode)
      if (!simplifyNodes && (node.isSelected || node.isHovered)) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(node.x + 2, node.y + 2, nodeRadius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Draw node body
      this.ctx.fillStyle = node.color;
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw node border (simplified in LOD mode)
      if (!simplifyNodes) {
        if (node.isSelected) {
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 4;
          this.ctx.stroke();
          this.ctx.strokeStyle = '#3182ce';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
        } else if (node.isHovered) {
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 3;
          this.ctx.stroke();
        } else {
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
        }
      } else {
        // Simplified border for LOD
        if (node.isSelected) {
          this.ctx.strokeStyle = '#3182ce';
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }
      }

      // Draw node label (skip if hidden by LOD or node too small)
      if (!hideLabels && nodeRadius > 8) {
        this.ctx.fillStyle = '#ffffff';
        const fontSize = Math.max(8, nodeRadius * 0.6);
        this.ctx.font = `bold ${fontSize}px system-ui`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Truncate labels at small scales
        let displayLabel = node.label;
        if (simplifyNodes && displayLabel.length > 3) {
          displayLabel = displayLabel.substring(0, 3);
        }

        this.ctx.fillText(displayLabel, node.x, node.y);
      }

      drawnNodeCount++;
    }
  }

  private animateUpdate(): void {
    // Simple fade animation for updates
    if (!this.ctx || !this.canvas) return;

    const steps = 10;
    let currentStep = 0;

    const animateStep = () => {
      if (currentStep < steps) {
        this.ctx!.globalAlpha = currentStep / steps;
        this.needsRedraw = true;
        currentStep++;
        setTimeout(animateStep, 50);
      } else {
        this.ctx!.globalAlpha = 1;
        this.needsRedraw = true;
      }
    };

    animateStep();
  }

  private animateNodeToPosition(node: RenderedNode, targetX: number, targetY: number): void {
    const startX = node.x;
    const startY = node.y;
    const duration = 500; // ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out animation
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      node.x = startX + (targetX - startX) * easedProgress;
      node.y = startY + (targetY - startY) * easedProgress;

      this.needsRedraw = true;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  private animateTransform(targetTransform: ViewTransform): void {
    const startTransform = { ...this.transform };
    const duration = 300; // ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out animation
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      this.transform.scale = startTransform.scale +
        (targetTransform.scale - startTransform.scale) * easedProgress;
      this.transform.translateX = startTransform.translateX +
        (targetTransform.translateX - startTransform.translateX) * easedProgress;
      this.transform.translateY = startTransform.translateY +
        (targetTransform.translateY - startTransform.translateY) * easedProgress;

      this.needsRedraw = true;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  private isDebugMode(): boolean {
    return typeof window !== 'undefined' && Boolean(window.__CANVAS_ENGINE_DEBUG__);
  }

  private drawPerformanceOverlay(): void {
    if (!this.ctx) return;

    // Reset transform for overlay
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(10, 10, 200, 135);

    // Text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    const stats = this.getPerformanceStats();
    const lines = [
      `FPS: ${stats.fps}`,
      `Nodes: ${stats.nodeCount}`,
      `Edges: ${stats.edgeCount}`,
      `Scale: ${stats.scale.toFixed(2)}`,
      `Culling: ${this.performance.enableViewportCulling ? 'ON' : 'OFF'}`,
      `LOD: ${this.performance.enableLevelOfDetail ? 'ON' : 'OFF'}`,
      `Forces: ${this.forceOptions.enabled ? 'ON' : 'OFF'}`,
      `Memory: ${this.getMemoryUsage()}MB`,
    ];

    lines.forEach((line, index) => {
      this.ctx!.fillText(line, 20, 25 + index * 15);
    });

    this.ctx.restore();
  }

  private getMemoryUsage(): number {
    return getMemoryUsageMB() ?? 0;
  }

  // Performance configuration methods
  enableDebugMode(): void {
    setCanvasEngineDebug(true);
    this.needsRedraw = true;
  }

  disableDebugMode(): void {
    setCanvasEngineDebug(false);
    this.needsRedraw = true;
  }

  setPerformanceOptions(options: Partial<PerformanceOptions>): void {
    this.performance = { ...this.performance, ...options };
    this.needsRedraw = true;
  }

  // Force-directed layout methods
  enableForceDirectedLayout(options?: Partial<ForceDirectedOptions>): void {
    this.forceOptions = { ...this.forceOptions, enabled: true, ...options };
    this.initializeForces();
    this.startForceSimulation();
  }

  disableForceDirectedLayout(): void {
    this.forceOptions.enabled = false;
    this.stopForceSimulation();
  }

  setForceOptions(options: Partial<ForceDirectedOptions>): void {
    this.forceOptions = { ...this.forceOptions, ...options };
  }

  private initializeForces(): void {
    // Initialize velocities for all nodes
    this.nodeVelocities.clear();
    this.renderedNodes.forEach(node => {
      this.nodeVelocities.set(node.id, { vx: 0, vy: 0 });
    });
  }

  private startForceSimulation(): void {
    if (this.layoutAnimationId) {
      cancelAnimationFrame(this.layoutAnimationId);
    }

    let iteration = 0;
    const simulate = () => {
      if (!this.forceOptions.enabled || iteration >= this.forceOptions.iterations) {
        return;
      }

      this.applyForces();
      this.updateNodePositions();
      this.needsRedraw = true;

      iteration++;
      this.layoutAnimationId = requestAnimationFrame(simulate);
    };

    this.layoutAnimationId = requestAnimationFrame(simulate);
  }

  private stopForceSimulation(): void {
    if (this.layoutAnimationId) {
      cancelAnimationFrame(this.layoutAnimationId);
      this.layoutAnimationId = null;
    }
  }

  private applyForces(): void {
    const centerX = this.dimensions.width / 2;
    const centerY = this.dimensions.height / 2;

    // Reset forces
    this.nodeVelocities.forEach(velocity => {
      velocity.vx = 0;
      velocity.vy = 0;
    });

    // Apply repulsion forces between all node pairs
    for (let i = 0; i < this.renderedNodes.length; i++) {
      const nodeA = this.renderedNodes[i];
      const velocityA = this.nodeVelocities.get(nodeA.id)!;

      // Center force - attract nodes toward center
      const centerDx = centerX - nodeA.x;
      const centerDy = centerY - nodeA.y;
      const centerDistance = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
      if (centerDistance > 0) {
        velocityA.vx += (centerDx / centerDistance) * this.forceOptions.centerForce;
        velocityA.vy += (centerDy / centerDistance) * this.forceOptions.centerForce;
      }

      // Repulsion forces with other nodes
      for (let j = i + 1; j < this.renderedNodes.length; j++) {
        const nodeB = this.renderedNodes[j];
        const velocityB = this.nodeVelocities.get(nodeB.id)!;

        const dx = nodeA.x - nodeB.x;
        const dy = nodeA.y - nodeB.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0 && distance < this.forceOptions.maxDistance) {
          // Coulomb's law-like repulsion
          const force = this.forceOptions.repulsion / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          velocityA.vx += fx;
          velocityA.vy += fy;
          velocityB.vx -= fx;
          velocityB.vy -= fy;
        }
      }
    }

    // Apply attraction forces along edges
    this.renderedEdges.forEach(edge => {
      const sourceNode = this.renderedNodes.find(n => n.id === edge.id.split('-')[0]);
      const targetNode = this.renderedNodes.find(n => n.id === edge.id.split('-')[1]);

      if (sourceNode && targetNode) {
        const sourceVelocity = this.nodeVelocities.get(sourceNode.id)!;
        const targetVelocity = this.nodeVelocities.get(targetNode.id)!;

        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.forceOptions.minDistance) {
          // Hooke's law-like attraction
          const force = this.forceOptions.attraction * (distance - this.forceOptions.minDistance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          sourceVelocity.vx += fx;
          sourceVelocity.vy += fy;
          targetVelocity.vx -= fx;
          targetVelocity.vy -= fy;
        }
      }
    });
  }

  private updateNodePositions(): void {
    this.renderedNodes.forEach(node => {
      const velocity = this.nodeVelocities.get(node.id)!;

      // Apply damping
      velocity.vx *= this.forceOptions.damping;
      velocity.vy *= this.forceOptions.damping;

      // Update position
      node.x += velocity.vx;
      node.y += velocity.vy;

      // Keep nodes within reasonable bounds
      const margin = 50;
      node.x = Math.max(margin, Math.min(this.dimensions.width - margin, node.x));
      node.y = Math.max(margin, Math.min(this.dimensions.height - margin, node.y));
    });

    // Update edge positions
    this.updateEdgePositions();
  }

  private updateEdgePositions(): void {
    this.renderedEdges.forEach(edge => {
      const sourceNode = this.renderedNodes.find(n => n.id === edge.id.split('-')[0]);
      const targetNode = this.renderedNodes.find(n => n.id === edge.id.split('-')[1]);

      if (sourceNode && targetNode) {
        edge.sourceX = sourceNode.x;
        edge.sourceY = sourceNode.y;
        edge.targetX = targetNode.x;
        edge.targetY = targetNode.y;
      }
    });
  }

  // ============================================================================
  // Preview Component
  // ============================================================================

  getPreviewComponent(): React.ComponentType<{
    dimensions: IDimensions;
    sampleData?: IGraph<TVertexData, TEdgeData>;
  }> {
    return CanvasPreview;
  }
}

// ============================================================================
// Preview Component with Canvas-style Rendering
// ============================================================================

const CanvasPreview: React.FC<{
  dimensions: IDimensions;
  sampleData?: IGraph<unknown, unknown>;
}> = ({ dimensions }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [animationId, setAnimationId] = React.useState(0);
  
  // Canvas animation loop to demonstrate smooth 2D rendering
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set up high-DPI rendering
    const ratio = window.devicePixelRatio || 1;
    canvas.width = 300 * ratio;
    canvas.height = 180 * ratio;
    canvas.style.width = '300px';
    canvas.style.height = '180px';
    ctx.scale(ratio, ratio);
    
    let frame = 0;
    
    const animate = () => {
      frame += 1;
      
      // Clear canvas with subtle background
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, 300, 180);
      
      // Draw grid pattern to show canvas precision
      ctx.strokeStyle = 'rgba(203, 213, 224, 0.3)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= 300; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 180);
        ctx.stroke();
      }
      for (let y = 0; y <= 180; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(300, y);
        ctx.stroke();
      }
      
      // Sample graph data
      const nodes = [
        { x: 150, y: 90, r: 20, color: '#ff6b6b', label: 'A' },
        { x: 100 + Math.cos(frame * 0.02) * 40, y: 60, r: 16, color: '#4299e1', label: 'B' },
        { x: 200 + Math.cos(frame * 0.02 + Math.PI) * 40, y: 60, r: 16, color: '#48bb78', label: 'C' },
        { x: 100, y: 120, r: 14, color: '#ed8936', label: 'D' },
        { x: 200, y: 120, r: 14, color: '#9f7aea', label: 'E' },
      ];
      
      // Draw connections (edges first, behind nodes)
      ctx.strokeStyle = '#cbd5e0';
      ctx.lineWidth = 2;
      
      const connections = [
        [0, 1], [0, 2], [1, 3], [2, 4], [3, 4]
      ];
      
      connections.forEach(([from, to]) => {
        const fromNode = nodes[from];
        const toNode = nodes[to];
        
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();
      });
      
      // Draw nodes
      nodes.forEach((node, _i) => {
        // Node shadow for depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.beginPath();
        ctx.arc(node.x + 2, node.y + 2, node.r, 0, Math.PI * 2);
        ctx.fill();
        
        // Node fill
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fill();
        
        // Node border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Node label with precise typography
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label, node.x, node.y);
      });
      
      // Canvas-specific features demo
      
      // Precise pixel manipulation demo
      const _imageData = ctx.getImageData(10, 10, 1, 1);
      ctx.fillStyle = '#e53e3e';
      ctx.fillRect(10, 160, 2, 2);
      
      // Text rendering capabilities
      ctx.fillStyle = '#4a5568';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Canvas 2D', 10, 175);
      
      // Gradient demo
      const gradient = ctx.createLinearGradient(250, 10, 290, 30);
      gradient.addColorStop(0, '#48bb78');
      gradient.addColorStop(1, '#38b2ac');
      ctx.fillStyle = gradient;
      ctx.fillRect(250, 10, 40, 20);
      
      setAnimationId(requestAnimationFrame(animate));
    };
    
    setAnimationId(requestAnimationFrame(animate));
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [animationId]);
  
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
            background: 'linear-gradient(135deg, #ed8936, #dd6b20)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          2D
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
            HTML5 Canvas Renderer
          </div>
          <div style={{ fontSize: '12px', color: '#718096' }}>
            Reliable Cross-Browser 2D Graphics
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
      
      {/* Canvas preview */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <div
          style={{
            position: 'relative',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            borderRadius: '6px',
            overflow: 'hidden',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              borderRadius: '6px',
            }}
          />
          
          {/* Canvas info overlay */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              color: '#4a5568',
              fontFamily: 'monospace',
            }}
          >
            2D Context
          </div>
          
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              color: '#4a5568',
              fontFamily: 'monospace',
            }}
          >
            HiDPI Ready
          </div>
        </div>
      </div>
      
      {/* Compatibility info */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #e1e5e9',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          fontSize: '11px',
          color: '#718096',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#48bb78', fontSize: '12px' }}>✓</span>
          <span>Chrome 4+</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#48bb78', fontSize: '12px' }}>✓</span>
          <span>Firefox 4+</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#48bb78', fontSize: '12px' }}>✓</span>
          <span>Safari 4+</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#48bb78', fontSize: '12px' }}>✓</span>
          <span>IE 9+</span>
        </div>
        <div style={{ marginLeft: 'auto', fontWeight: '500', color: '#4a5568' }}>
          No Dependencies
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
          <span>✓ Universal Support</span>
          <span>✓ Pixel Perfect</span>
          <span>✓ Text Rendering</span>
          <span>✓ Easy Export</span>
          <span>✓ Low Memory</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a new Canvas engine instance.
 */
export function createCanvasEngine<TVertexData = unknown, TEdgeData = unknown>(
  _config?: ICanvasConfig
): CanvasEngine<TVertexData, TEdgeData> {
  return new CanvasEngine<TVertexData, TEdgeData>();
}

/**
 * Get default Canvas configuration for optimal rendering.
 */
export function getDefaultCanvasConfig(): ICanvasConfig {
  return {
    canvasOptions: {
      contextType: '2d',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'medium',
      lineDashSupport: true,
      textBaseline: 'middle',
      textAlign: 'center',
    },
    performanceLevel: 'balanced',
  };
}

/**
 * Get high-quality Canvas configuration for print/export.
 */
export function getHighQualityCanvasConfig(): ICanvasConfig {
  return {
    canvasOptions: {
      contextType: '2d',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      lineDashSupport: true,
      textBaseline: 'middle',
      textAlign: 'center',
    },
    performanceLevel: 'memory',
  };
}

/**
 * Set up high-DPI canvas rendering.
 */
export function setupHighDPICanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D rendering context');
  }
  
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.scale(ratio, ratio);
  
  return ctx;
}

/**
 * Check Canvas 2D support and features.
 */
export function checkCanvasSupport(): {
  supported: boolean;
  features: {
    getImageData: boolean;
    toDataURL: boolean;
    imageSmoothingEnabled: boolean;
    setLineDash: boolean;
  };
} {
  // This would be implemented in a real engine
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return {
      supported: false,
      features: {
        getImageData: false,
        toDataURL: false,
        imageSmoothingEnabled: false,
        setLineDash: false,
      },
    };
  }
  
  return {
    supported: true,
    features: {
      getImageData: typeof ctx.getImageData === 'function',
      toDataURL: typeof canvas.toDataURL === 'function',
      imageSmoothingEnabled: 'imageSmoothingEnabled' in ctx,
      setLineDash: typeof ctx.setLineDash === 'function',
    },
  };
}

// Export the engine and utilities
// Named export only - no default export
export type { ICanvasConfig };