/**
 * Cytoscape.js Graph Engine Implementation
 * 
 * A fully-featured graph rendering engine using Cytoscape.js for network analysis,
 * interactive layouts, and complex graph manipulations.
 * 
 * This implementation provides:
 * - Sophisticated layout algorithms (force-directed, hierarchical, circular, etc.)
 * - Rich interaction capabilities (selection, dragging, grouping)
 * - Advanced styling with CSS-like selectors
 * - Built-in graph analysis functions
 * - Extensible plugin system
 * - Excellent performance up to ~10,000 nodes
 * 
 * @see https://cytoscape.org/
 * @see https://js.cytoscape.org/
 */

import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import dagre from 'cytoscape-dagre';
import React, { useEffect, useRef, useState } from 'react';

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
  ICytoscapeConfig
} from '../types';

// Register Cytoscape extensions
cytoscape.use(coseBilkent);
cytoscape.use(dagre);

// ============================================================================
// Cytoscape Engine Implementation
// ============================================================================

export class CytoscapeEngine<TVertexData = unknown, TEdgeData = unknown> 
  implements IGraphEngine<TVertexData, TEdgeData> {
  
  // Engine identification
  readonly id = 'cytoscape';
  readonly name = 'Cytoscape.js';
  readonly description = 'Feature-rich network visualization with interactive layouts and graph analysis capabilities';
  readonly version = '1.0.0';
  readonly isImplemented = true;
  
  // Engine capabilities
  readonly capabilities: IEngineCapabilities = {
    maxVertices: 10000,
    maxEdges: 50000,
    supportsHardwareAcceleration: false, // CPU-based rendering
    supportsInteractiveLayout: true,
    supportsPhysicsSimulation: true,
    supportsClustering: true,
    supportsCustomShapes: true,
    supportsEdgeBundling: true,
    exportFormats: ['png', 'svg', 'json'],
    memoryUsage: 'medium',
    cpuUsage: 'medium',
    batteryImpact: 'moderate',
  };
  
  // Installation requirements
  readonly requirements: IEngineRequirements = {
    dependencies: [
      { name: 'cytoscape', version: '^3.26.0' },
      { name: '@types/cytoscape', version: '^3.19.0', optional: true },
      { name: 'cytoscape-cose-bilkent', version: '^4.1.0', optional: true },
      { name: 'cytoscape-dagre', version: '^2.5.0', optional: true },
      { name: 'cytoscape-elk', version: '^2.2.0', optional: true },
      { name: 'cytoscape-klay', version: '^3.1.4', optional: true },
    ],
    browserSupport: {
      chrome: 60,
      firefox: 60,
      safari: 12,
      edge: 79,
    },
    requiredFeatures: [
      'Canvas 2D Context',
      'CSS3 Transforms',
      'ES6 Modules',
      'Web Workers (optional)',
    ],
    setupInstructions: `
# Install Cytoscape.js and layout extensions
npm install cytoscape @types/cytoscape
npm install cytoscape-cose-bilkent cytoscape-dagre cytoscape-elk

# Import in your component
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import dagre from 'cytoscape-dagre';

# Register extensions
cytoscape.use(coseBilkent);
cytoscape.use(dagre);
    `.trim(),
  };
  
  // Current status
  private _status: IEngineStatus = {
    isInitialised: false,
    isRendering: false,
    lastError: undefined,
  };

  get status(): IEngineStatus {
    return { ...this._status };
  }

  // Private state
  private container: HTMLElement | null = null;
  private dimensions: IDimensions = { width: 800, height: 600 };
  private cy: cytoscape.Core | null = null;
  private elements: cytoscape.ElementDefinition[] = [];
  private layoutRunning = false;
  
  // ============================================================================
  // Core Implementation
  // ============================================================================

  async initialise(
    container: HTMLElement,
    dimensions: IDimensions,
    config?: IEngineConfig
  ): Promise<void> {
    this.container = container;
    this.dimensions = dimensions;

    try {
      const cytoscapeConfig = config as ICytoscapeConfig | undefined;

      // Create Cytoscape instance with configuration
      this.cy = cytoscape({
        container,
        elements: [],
        style: cytoscapeConfig?.cytoscapeOptions?.style || this.createDefaultStyle(),
        layout: cytoscapeConfig?.cytoscapeOptions?.layout || { name: 'grid' },
        userZoomingEnabled: cytoscapeConfig?.cytoscapeOptions?.userZoomingEnabled ?? true,
        userPanningEnabled: cytoscapeConfig?.cytoscapeOptions?.userPanningEnabled ?? true,
        boxSelectionEnabled: cytoscapeConfig?.cytoscapeOptions?.boxSelectionEnabled ?? true,
      });

      // Set up event listeners
      this.setupEventListeners();

      this._status.isInitialised = true;
      this._status.lastError = undefined;

    } catch (error) {
      this._status.isInitialised = false;
      this._status.lastError = error instanceof Error ? error.message : 'Initialization error';
      throw error;
    }
  }
  
  async loadGraph(
    graph: IGraph<TVertexData, TEdgeData>,
    config?: IGraphConfig<TVertexData, TEdgeData>
  ): Promise<void> {
    if (!this.cy || !this._status.isInitialised) {
      throw new Error('Engine not initialised');
    }

    this._status.isRendering = true;

    try {
      // Transform graph data to Cytoscape format
      const nodes = this.convertVerticesToNodes(graph.vertices);
      const edges = this.convertEdgesToEdges(graph.edges);

      this.elements = [...nodes, ...edges];

      // Load elements into Cytoscape
      this.cy.elements().remove();
      this.cy.add(this.elements);

      // Apply layout
      const layoutConfig = config?.layoutConfig || { name: 'cose-bilkent' };
      const layout = this.cy.layout(layoutConfig);

      this.layoutRunning = true;
      layout.run();

      // Wait for layout to complete
      await this.waitForLayoutCompletion();

      this._status.isRendering = false;

    } catch (error) {
      this._status.isRendering = false;
      this._status.lastError = error instanceof Error ? error.message : 'Graph loading error';
      throw error;
    }
  }
  
  async updateGraph(
    graph: IGraph<TVertexData, TEdgeData>,
    animate = true
  ): Promise<void> {
    if (!this.cy || !this._status.isInitialised) {
      throw new Error('Engine not initialised');
    }

    try {
      // Transform new graph data
      const newNodes = this.convertVerticesToNodes(graph.vertices);
      const newEdges = this.convertEdgesToEdges(graph.edges);
      const newElements = [...newNodes, ...newEdges];

      // Get current elements
      const currentElements = this.cy.elements();

      // Find elements to add, remove, and update
      const currentIds = new Set(currentElements.map(el => el.id()));
      const newIds = new Set(newElements.map(el => el.data.id));

      // Remove deleted elements
      const toRemove = currentElements.filter(el => !newIds.has(el.id()));
      if (toRemove.length > 0) {
        this.cy.remove(toRemove);
      }

      // Add new elements
      const toAdd = newElements.filter(el => !currentIds.has(el.data.id));
      if (toAdd.length > 0) {
        this.cy.add(toAdd);
      }

      // Update existing elements if needed
      newElements.forEach(newEl => {
        if (currentIds.has(newEl.data.id)) {
          const existing = this.cy.getElementById(newEl.data.id);
          if (existing.length > 0) {
            existing.data(newEl.data);
          }
        }
      });

      this.elements = newElements;

      // Optionally animate the layout update
      if (animate) {
        const layout = this.cy.layout({ name: 'cose-bilkent', animate: true });
        layout.run();
      }

    } catch (error) {
      this._status.lastError = error instanceof Error ? error.message : 'Graph update error';
      throw error;
    }
  }
  
  resize(dimensions: IDimensions): void {
    this.dimensions = dimensions;

    if (this.cy && this.container) {
      // Update container dimensions
      this.container.style.width = `${dimensions.width}px`;
      this.container.style.height = `${dimensions.height}px`;

      // Notify Cytoscape of the resize
      this.cy.resize();
      this.cy.center();
    }
  }
  
  async export(
    format: 'png' | 'svg' | 'json' | 'pdf',
    options?: Record<string, unknown>
  ): Promise<string | Blob> {
    if (!this.cy || !this._status.isInitialised) {
      throw new Error('Engine not initialised');
    }

    try {
      switch (format) {
        case 'png':
          return this.cy.png({
            output: 'blob',
            bg: 'white',
            full: true,
            scale: 2,
            ...options,
          });

        case 'svg':
          return this.cy.svg({
            full: true,
            scale: 2,
            ...options,
          });

        case 'json':
          return JSON.stringify({
            elements: this.cy.elements().jsons(),
            style: this.cy.style().json(),
            layout: { name: 'preset' },
            ...options,
          });

        case 'pdf':
          // For PDF, we first export as PNG then convert (requires additional library)
          throw new Error('PDF export requires additional dependencies');

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      this._status.lastError = error instanceof Error ? error.message : 'Export error';
      throw error;
    }
  }
  
  getPositions(): ReadonlyArray<IPositionedVertex<TVertexData>> {
    if (!this.cy || !this._status.isInitialised) {
      return [];
    }

    const positions: IPositionedVertex<TVertexData>[] = [];

    this.cy.nodes().forEach(node => {
      const position = node.position();
      const data = node.data();

      positions.push({
        id: data.id,
        data: data.originalData || {} as TVertexData,
        label: data.label || data.id,
        position: {
          x: position.x,
          y: position.y,
        },
        metadata: data.metadata || {},
      });
    });

    return positions;
  }
  
  setPositions(
    positions: ReadonlyArray<IPositionedVertex<TVertexData>>,
    animate = true
  ): void {
    if (!this.cy || !this._status.isInitialised) {
      return;
    }

    positions.forEach(positionedVertex => {
      const node = this.cy!.getElementById(positionedVertex.id);
      if (node.length > 0) {
        if (animate) {
          node.animate({
            position: {
              x: positionedVertex.position.x,
              y: positionedVertex.position.y,
            },
          }, {
            duration: 500,
            easing: 'ease-out',
          });
        } else {
          node.position({
            x: positionedVertex.position.x,
            y: positionedVertex.position.y,
          });
        }
      }
    });
  }
  
  fitToView(padding = 50, animate = true): void {
    if (!this.cy || !this._status.isInitialised) {
      return;
    }

    if (animate) {
      this.cy.animate({
        fit: {
          eles: this.cy.elements(),
          padding,
        },
      }, {
        duration: 500,
        easing: 'ease-out',
      });
    } else {
      this.cy.fit(this.cy.elements(), padding);
    }
  }
  
  destroy(): void {
    if (this.cy) {
      // Remove all event listeners and destroy Cytoscape instance
      this.cy.removeAllListeners();
      this.cy.destroy();
      this.cy = null;
    }

    this.container = null;
    this.elements = [];
    this.layoutRunning = false;

    this._status.isInitialised = false;
    this._status.isRendering = false;
    this._status.lastError = undefined;
  }
  
  // ============================================================================
  // Helper Methods
  // ============================================================================

  private createDefaultStyle(): cytoscape.Stylesheet[] {
    return [
      {
        selector: 'node',
        style: {
          'background-color': '#666',
          'label': 'data(label)',
          'width': 'mapData(weight, 0, 100, 20, 60)',
          'height': 'mapData(weight, 0, 100, 20, 60)',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-size': '12px',
          'color': '#000',
          'border-width': 2,
          'border-color': '#2B7CE9',
        },
      },
      {
        selector: 'edge',
        style: {
          'width': 3,
          'line-color': '#ccc',
          'target-arrow-color': '#ccc',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'opacity': 0.8,
        },
      },
      {
        selector: 'node:selected',
        style: {
          'border-color': '#FF6B6B',
          'border-width': 3,
        },
      },
      {
        selector: 'edge:selected',
        style: {
          'line-color': '#FF6B6B',
          'target-arrow-color': '#FF6B6B',
          'width': 4,
        },
      },
    ];
  }

  private setupEventListeners(): void {
    if (!this.cy) return;

    // Layout events
    this.cy.on('layoutstop', () => {
      this.layoutRunning = false;
    });

    // Selection events for interactivity
    this.cy.on('select', 'node', (event) => {
      const node = event.target;
      // Could emit custom events for external listeners
      console.debug('Node selected:', node.id());
    });

    this.cy.on('unselect', 'node', (event) => {
      const node = event.target;
      console.debug('Node unselected:', node.id());
    });

    // Error handling
    this.cy.on('error', (error) => {
      this._status.lastError = error.message || 'Cytoscape error';
      console.error('Cytoscape error:', error);
    });
  }

  private convertVerticesToNodes(vertices: IGraph<TVertexData, TEdgeData>['vertices']): cytoscape.NodeDefinition[] {
    return vertices.map((vertex) => ({
      data: {
        id: vertex.id,
        label: vertex.label || vertex.id.substring(0, 10),
        originalData: vertex.data,
        metadata: vertex.metadata,
        weight: vertex.metadata?.weight || 1,
      },
      position: vertex.position ? {
        x: vertex.position.x,
        y: vertex.position.y,
      } : undefined,
      style: {
        'background-color': this.getVertexColor(vertex),
      },
    }));
  }

  private convertEdgesToEdges(edges: IGraph<TVertexData, TEdgeData>['edges']): cytoscape.EdgeDefinition[] {
    return edges.map((edge) => ({
      data: {
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        originalData: edge.data,
        metadata: edge.metadata,
        weight: edge.metadata?.weight || 1,
      },
      style: {
        'line-color': this.getEdgeColor(edge),
        'width': Math.max(1, Math.min(10, edge.metadata?.weight || 3)),
      },
    }));
  }

  private getVertexColor(vertex: IGraph<TVertexData, TEdgeData>['vertices'][0]): string {
    // Color based on metadata type or use default
    const type = vertex.metadata?.type;
    switch (type) {
      case 'author': return '#4FC3F7';
      case 'work': return '#81C784';
      case 'institution': return '#FFB74D';
      case 'topic': return '#F06292';
      case 'source': return '#9575CD';
      default: return '#90A4AE';
    }
  }

  private getEdgeColor(edge: IGraph<TVertexData, TEdgeData>['edges'][0]): string {
    // Color based on metadata type or use default
    const type = edge.metadata?.type;
    switch (type) {
      case 'authorship': return '#2196F3';
      case 'citation': return '#4CAF50';
      case 'collaboration': return '#FF9800';
      case 'affiliation': return '#9C27B0';
      default: return '#757575';
    }
  }

  private async waitForLayoutCompletion(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.cy || !this.layoutRunning) {
        resolve();
        return;
      }

      const checkLayout = () => {
        if (!this.layoutRunning) {
          resolve();
        } else {
          setTimeout(checkLayout, 100);
        }
      };

      setTimeout(checkLayout, 100);
    });
  }

  // ============================================================================
  // Preview Component
  // ============================================================================
  
  getPreviewComponent(): React.ComponentType<{
    dimensions: IDimensions;
    sampleData?: IGraph<TVertexData, TEdgeData>;
  }> {
    return CytoscapePreview;
  }
}

// ============================================================================
// Preview Component
// ============================================================================

const CytoscapePreview: React.FC<{
  dimensions: IDimensions;
  sampleData?: IGraph<unknown, unknown>;
}> = ({ dimensions, sampleData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewEngine] = useState(() => new CytoscapeEngine());
  
  useEffect(() => {
    const initializePreview = async () => {
      if (!containerRef.current) return;

      try {
        await previewEngine.initialise(containerRef.current, {
          width: dimensions.width,
          height: dimensions.height - 100, // Account for header and footer
        });

        // Create sample graph if none provided
        const graph = sampleData || createSampleGraph();
        await previewEngine.loadGraph(graph);

        // Fit to view after loading
        setTimeout(() => {
          previewEngine.fitToView(20, true);
        }, 500);

      } catch (error) {
        console.warn('Failed to initialize Cytoscape preview:', error);
      }
    };

    initializePreview();

    return () => {
      previewEngine.destroy();
    };
  }, [dimensions, sampleData, previewEngine]);
  
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
      {/* Header with branding */}
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
            backgroundColor: '#ff6b6b',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          Cy
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
            Cytoscape.js Engine
          </div>
          <div style={{ fontSize: '12px', color: '#718096' }}>
            Network Analysis & Interactive Layouts
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
      
      {/* Live Cytoscape visualization area */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#ffffff',
        }}
      />
      
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
          <span>✓ Rich Layouts</span>
          <span>✓ Interactive Selection</span>
          <span>✓ Graph Analysis</span>
          <span>✓ CSS Styling</span>
          <span>✓ Plugin System</span>
        </div>
      </div>
    </div>
  );
};

// Helper function to create sample graph data for preview
function createSampleGraph(): IGraph<unknown, unknown> {
  return {
    vertices: [
      { id: 'A', data: {}, label: 'Author A', metadata: { type: 'author', weight: 8 } },
      { id: 'B', data: {}, label: 'Work B', metadata: { type: 'work', weight: 12 } },
      { id: 'C', data: {}, label: 'Institution C', metadata: { type: 'institution', weight: 6 } },
      { id: 'D', data: {}, label: 'Topic D', metadata: { type: 'topic', weight: 4 } },
      { id: 'E', data: {}, label: 'Author E', metadata: { type: 'author', weight: 7 } },
      { id: 'F', data: {}, label: 'Work F', metadata: { type: 'work', weight: 9 } },
    ],
    edges: [
      { id: 'AB', sourceId: 'A', targetId: 'B', data: {}, metadata: { type: 'authorship' } },
      { id: 'BC', sourceId: 'B', targetId: 'C', data: {}, metadata: { type: 'affiliation' } },
      { id: 'BD', sourceId: 'B', targetId: 'D', data: {}, metadata: { type: 'topic' } },
      { id: 'AE', sourceId: 'A', targetId: 'E', data: {}, metadata: { type: 'collaboration' } },
      { id: 'EF', sourceId: 'E', targetId: 'F', data: {}, metadata: { type: 'authorship' } },
      { id: 'BF', sourceId: 'B', targetId: 'F', data: {}, metadata: { type: 'citation' } },
    ],
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a new Cytoscape engine instance.
 */
export function createCytoscapeEngine<TVertexData = unknown, TEdgeData = unknown>(
  _config?: ICytoscapeConfig
): CytoscapeEngine<TVertexData, TEdgeData> {
  return new CytoscapeEngine<TVertexData, TEdgeData>();
}

/**
 * Get default Cytoscape configuration for common use cases.
 */
export function getDefaultCytoscapeConfig(): ICytoscapeConfig {
  return {
    cytoscapeOptions: {
      layout: {
        name: 'cose-bilkent',
        idealEdgeLength: 100,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 30,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 4500,
        edgeElasticity: 32,
        nestingFactor: 5,
        gravity: 80,
        numIter: 2500,
        tile: true,
        animate: 'end',
        animationDuration: 1000,
        tilingPaddingVertical: 10,
        tilingPaddingHorizontal: 10
      },
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#666',
            'label': 'data(label)',
            'width': 'mapData(weight, 0, 100, 20, 60)',
            'height': 'mapData(weight, 0, 100, 20, 60)',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 3,
            'line-color': '#ccc',
            'target-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
          },
        },
      ],
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: true,
    },
  };
}

// Export the engine and utilities
// Named export only - no default export
export type { ICytoscapeConfig };