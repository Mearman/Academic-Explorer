/**
 * Graph Engine Interface - Plugin Architecture for Graph Visualization
 * 
 * Provides a standardized interface for pluggable graph rendering engines.
 * Each engine can provide different rendering strategies (Canvas, SVG, WebGL)
 * while maintaining consistent lifecycle and capability management.
 */

import type { 
  IGraph,
  IVertex,
  IEdge,
  IPosition,
  IDimensions,
  ILayoutConfig,
  IGraphConfig,
  IPositionedVertex
} from '../interfaces';

// ============================================================================
// Engine Capabilities System
// ============================================================================

/**
 * Layout algorithms supported by an engine
 */
export interface ILayoutCapability {
  /** Layout algorithm identifier */
  readonly id: string;
  /** Display name for UI */
  readonly name: string;
  /** Description of the layout */
  readonly description: string;
  /** Default configuration parameters */
  readonly defaultConfig: Record<string, unknown>;
  /** Whether layout supports animation */
  readonly supportsAnimation: boolean;
  /** Whether layout can be stopped/paused */
  readonly canStop: boolean;
}

/**
 * Interaction capabilities supported by an engine
 */
export interface IInteractionCapability {
  /** Pan/zoom support */
  readonly panZoom: boolean;
  /** Vertex selection */
  readonly vertexSelection: boolean;
  /** Edge selection */
  readonly edgeSelection: boolean;
  /** Multi-selection with modifiers */
  readonly multiSelection: boolean;
  /** Drag-to-move vertices */
  readonly vertexDragging: boolean;
  /** Rectangle selection */
  readonly rectangleSelection: boolean;
  /** Touch/mobile gestures */
  readonly touchGestures: boolean;
  /** Keyboard shortcuts */
  readonly keyboardShortcuts: boolean;
}

/**
 * Export formats supported by an engine
 */
export interface IExportCapability {
  /** PNG image export */
  readonly png: boolean;
  /** SVG vector export */
  readonly svg: boolean;
  /** JPEG image export */
  readonly jpeg: boolean;
  /** WebP image export */
  readonly webp: boolean;
  /** JSON data export */
  readonly json: boolean;
  /** Custom export formats */
  readonly customFormats: readonly string[];
}

/**
 * Performance features supported by an engine
 */
export interface IPerformanceCapability {
  /** Level-of-detail rendering */
  readonly levelOfDetail: boolean;
  /** Viewport culling */
  readonly viewportCulling: boolean;
  /** Vertex instancing */
  readonly vertexInstancing: boolean;
  /** Edge batching */
  readonly edgeBatching: boolean;
  /** Progressive rendering */
  readonly progressiveRendering: boolean;
  /** Worker thread support */
  readonly webWorkers: boolean;
  /** Maximum recommended vertices */
  readonly maxVertices: number;
  /** Maximum recommended edges */
  readonly maxEdges: number;
}

/**
 * Complete capability declaration for a graph engine
 */
export interface IEngineCapabilities {
  /** Supported layout algorithms */
  readonly layouts: readonly ILayoutCapability[];
  /** Interaction capabilities */
  readonly interactions: IInteractionCapability;
  /** Export format support */
  readonly exports: IExportCapability;
  /** Performance features */
  readonly performance: IPerformanceCapability;
  /** Engine-specific features */
  readonly customFeatures: Record<string, unknown>;
}

// ============================================================================
// Engine Configuration and State
// ============================================================================

/**
 * Engine-specific configuration parameters
 */
export interface IEngineConfig extends IGraphConfig {
  /** Engine-specific rendering options */
  readonly engineOptions?: Record<string, unknown>;
  /** Current active layout algorithm ID */
  readonly activeLayoutId?: string;
  /** Layout-specific parameters */
  readonly layoutParameters?: Record<string, unknown>;
  /** Performance optimization settings */
  readonly performanceMode?: 'high-quality' | 'balanced' | 'performance';
  /** Debug rendering options */
  readonly debug?: {
    readonly showBounds: boolean;
    readonly showFPS: boolean;
    readonly showStats: boolean;
    readonly logRenderTime: boolean;
  };
}

/**
 * Current rendering state of the engine
 */
export interface IEngineState {
  /** Whether engine is initialized */
  readonly initialized: boolean;
  /** Current graph being rendered */
  readonly graph?: IGraph;
  /** Current vertex positions */
  readonly positions: ReadonlyMap<string, IPosition>;
  /** Current viewport transform */
  readonly viewport: {
    readonly zoom: number;
    readonly pan: IPosition;
  };
  /** Selected elements */
  readonly selection: {
    readonly vertices: ReadonlySet<string>;
    readonly edges: ReadonlySet<string>;
  };
  /** Currently hovered elements */
  readonly hover: {
    readonly vertex?: string;
    readonly edge?: string;
  };
  /** Layout animation state */
  readonly animation: {
    readonly running: boolean;
    readonly progress: number;
  };
  /** Performance metrics */
  readonly metrics: {
    readonly fps: number;
    readonly renderTime: number;
    readonly vertexCount: number;
    readonly edgeCount: number;
    readonly culledVertices: number;
    readonly culledEdges: number;
  };
}

// ============================================================================
// Engine Events
// ============================================================================

/**
 * Engine event data for user interactions
 */
export interface IEngineEvent {
  /** Event type identifier */
  readonly type: string;
  /** Screen coordinates */
  readonly screenPosition: IPosition;
  /** Graph coordinates */
  readonly graphPosition: IPosition;
  /** Timestamp */
  readonly timestamp: number;
  /** Modifier keys */
  readonly modifiers: {
    readonly shift: boolean;
    readonly ctrl: boolean;
    readonly alt: boolean;
    readonly meta: boolean;
  };
  /** Original DOM event (if applicable) */
  readonly originalEvent?: Event;
  /** Hit testing results */
  readonly hitTest?: {
    readonly vertex?: IVertex;
    readonly edge?: IEdge;
  };
}

/**
 * Engine event handlers
 */
export interface IEngineEventHandlers<TVertexData = unknown, TEdgeData = unknown> {
  /** Vertex clicked */
  onVertexClick?: (vertex: IVertex<TVertexData>, event: IEngineEvent) => void;
  /** Edge clicked */
  onEdgeClick?: (edge: IEdge<TEdgeData>, event: IEngineEvent) => void;
  /** Vertex hovered */
  onVertexHover?: (vertex: IVertex<TVertexData> | undefined, event: IEngineEvent) => void;
  /** Edge hovered */
  onEdgeHover?: (edge: IEdge<TEdgeData> | undefined, event: IEngineEvent) => void;
  /** Selection changed */
  onSelectionChange?: (vertices: ReadonlySet<string>, edges: ReadonlySet<string>) => void;
  /** Viewport changed */
  onViewportChange?: (zoom: number, pan: IPosition) => void;
  /** Layout started */
  onLayoutStart?: (layoutId: string) => void;
  /** Layout completed */
  onLayoutComplete?: (layoutId: string, positions: ReadonlyMap<string, IPosition>) => void;
  /** Rendering performance update */
  onPerformanceUpdate?: (metrics: IEngineState['metrics']) => void;
  /** Error occurred */
  onError?: (error: Error, context?: string) => void;
}

// ============================================================================
// Main Graph Engine Interface
// ============================================================================

/**
 * Core graph rendering engine interface
 * 
 * Provides standardized lifecycle management, rendering capabilities,
 * and interaction handling for different rendering strategies.
 * 
 * @template TVertexData - Type of data stored in vertices
 * @template TEdgeData - Type of data stored in edges
 */
export interface IGraphEngine<TVertexData = unknown, TEdgeData = unknown> {
  // ============================================================================
  // Engine Identity and Capabilities
  // ============================================================================
  
  /** Unique engine identifier */
  readonly engineId: string;
  
  /** Human-readable engine name */
  readonly engineName: string;
  
  /** Engine version */
  readonly engineVersion: string;
  
  /** Engine description */
  readonly description: string;
  
  /** Engine capabilities declaration */
  readonly capabilities: IEngineCapabilities;
  
  /** Current engine state */
  readonly state: IEngineState;
  
  // ============================================================================
  // Lifecycle Management
  // ============================================================================
  
  /**
   * Initialize the engine with a container element and configuration
   * 
   * @param container - DOM element to render into
   * @param config - Engine configuration
   * @param eventHandlers - Event callback handlers
   * @returns Promise that resolves when initialization completes
   */
  initialize(
    container: HTMLElement,
    config: IEngineConfig,
    eventHandlers?: IEngineEventHandlers<TVertexData, TEdgeData>
  ): Promise<void>;
  
  /**
   * Load and render a new graph
   * 
   * @param graph - Graph data to render
   * @param layoutId - Layout algorithm to use (optional, uses active layout)
   * @returns Promise that resolves when loading completes
   */
  loadGraph(
    graph: IGraph<TVertexData, TEdgeData>,
    layoutId?: string
  ): Promise<void>;
  
  /**
   * Update the engine configuration
   * 
   * @param config - New configuration (merged with existing)
   * @returns Promise that resolves when update completes
   */
  updateConfig(config: Partial<IEngineConfig>): Promise<void>;
  
  /**
   * Clean up resources and dispose the engine
   */
  dispose(): void;
  
  // ============================================================================
  // Rendering Control
  // ============================================================================
  
  /**
   * Force a re-render of the current graph
   */
  render(): void;
  
  /**
   * Resize the rendering surface
   * 
   * @param dimensions - New dimensions
   */
  resize(dimensions: IDimensions): void;
  
  /**
   * Set the viewport (zoom and pan)
   * 
   * @param zoom - Zoom level
   * @param pan - Pan offset
   * @param animated - Whether to animate the transition
   */
  setViewport(zoom: number, pan: IPosition, animated?: boolean): void;
  
  /**
   * Fit the graph to the viewport
   * 
   * @param padding - Padding around graph bounds
   * @param animated - Whether to animate the transition
   */
  fitToViewport(padding?: number, animated?: boolean): void;
  
  // ============================================================================
  // Layout Management
  // ============================================================================
  
  /**
   * Change the active layout algorithm
   * 
   * @param layoutId - Layout algorithm identifier
   * @param config - Layout-specific configuration
   * @param animated - Whether to animate the transition
   * @returns Promise that resolves when layout completes
   */
  setLayout(
    layoutId: string,
    config?: Record<string, unknown>,
    animated?: boolean
  ): Promise<void>;
  
  /**
   * Stop any running layout calculations
   */
  stopLayout(): void;
  
  /**
   * Get current vertex positions
   * 
   * @returns Map of vertex ID to position
   */
  getPositions(): ReadonlyMap<string, IPosition>;
  
  /**
   * Set specific vertex positions
   * 
   * @param positions - Map of vertex ID to new position
   * @param animated - Whether to animate to new positions
   */
  setPositions(
    positions: ReadonlyMap<string, IPosition>,
    animated?: boolean
  ): void;
  
  // ============================================================================
  // Selection and Interaction
  // ============================================================================
  
  /**
   * Select vertices
   * 
   * @param vertexIds - Vertex IDs to select
   * @param replace - Whether to replace existing selection
   */
  selectVertices(vertexIds: readonly string[], replace?: boolean): void;
  
  /**
   * Select edges
   * 
   * @param edgeIds - Edge IDs to select
   * @param replace - Whether to replace existing selection
   */
  selectEdges(edgeIds: readonly string[], replace?: boolean): void;
  
  /**
   * Clear all selections
   */
  clearSelection(): void;
  
  /**
   * Get currently selected elements
   * 
   * @returns Object with selected vertex and edge IDs
   */
  getSelection(): { vertices: ReadonlySet<string>; edges: ReadonlySet<string> };
  
  /**
   * Perform hit testing at a specific point
   * 
   * @param screenPosition - Position in screen coordinates
   * @returns Hit test results
   */
  hitTest(screenPosition: IPosition): {
    vertex?: IVertex<TVertexData>;
    edge?: IEdge<TEdgeData>;
  };
  
  // ============================================================================
  // Export Capabilities
  // ============================================================================
  
  /**
   * Export the current graph as an image
   * 
   * @param format - Export format
   * @param options - Format-specific options
   * @returns Promise resolving to data URL or blob
   */
  export(
    format: 'png' | 'svg' | 'jpeg' | 'webp' | 'json',
    options?: {
      quality?: number;
      scale?: number;
      backgroundColor?: string;
      includeLabels?: boolean;
      includeMetadata?: boolean;
    }
  ): Promise<string | Blob>;
  
  // ============================================================================
  // Performance and Debugging
  // ============================================================================
  
  /**
   * Get current performance metrics
   * 
   * @returns Current performance statistics
   */
  getMetrics(): IEngineState['metrics'];
  
  /**
   * Enable or disable performance profiling
   * 
   * @param enabled - Whether to enable profiling
   */
  setProfilingEnabled(enabled: boolean): void;
  
  /**
   * Get debug information about the engine state
   * 
   * @returns Debug information object
   */
  getDebugInfo(): Record<string, unknown>;
  
  // ============================================================================
  // Coordinate Transformations
  // ============================================================================
  
  /**
   * Convert screen coordinates to graph coordinates
   * 
   * @param screenPosition - Position in screen space
   * @returns Position in graph space
   */
  screenToGraph(screenPosition: IPosition): IPosition;
  
  /**
   * Convert graph coordinates to screen coordinates
   * 
   * @param graphPosition - Position in graph space
   * @returns Position in screen space
   */
  graphToScreen(graphPosition: IPosition): IPosition;
}