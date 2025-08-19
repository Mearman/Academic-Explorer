/**
 * Core interfaces for a fully decoupled graph visualization system.
 * 
 * This module provides generic, type-safe interfaces that enable:
 * - Domain-agnostic graph data representation
 * - Pluggable rendering strategies
 * - Swappable layout algorithms
 * - Extensible interaction handling
 * - Flexible configuration management
 * 
 * All interfaces use generic type parameters to maintain type safety
 * while avoiding any domain-specific assumptions.
 */

// ============================================================================
// Core Data Structures
// ============================================================================

/**
 * Generic vertex interface with minimal required properties.
 * 
 * @template TData - The type of domain-specific data stored in the vertex
 */
export interface IVertex<TData = unknown> {
  /** Unique identifier for the vertex */
  readonly id: string;
  
  /** Domain-specific data payload */
  readonly data: TData;
  
  /** Optional display label (falls back to id if not provided) */
  readonly label?: string;
  
  /** Extensible metadata for rendering, layout, and interaction hints */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Generic edge interface with minimal required properties.
 * 
 * @template TData - The type of domain-specific data stored in the edge
 */
export interface IEdge<TData = unknown> {
  /** Unique identifier for the edge */
  readonly id: string;
  
  /** Source vertex identifier */
  readonly sourceId: string;
  
  /** Target vertex identifier */
  readonly targetId: string;
  
  /** Domain-specific data payload */
  readonly data: TData;
  
  /** Optional display label */
  readonly label?: string;
  
  /** Optional weight for layout algorithms */
  readonly weight?: number;
  
  /** Whether the edge is directed (default: true) */
  readonly directed?: boolean;
  
  /** Extensible metadata for rendering, layout, and interaction hints */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Complete graph structure containing vertices and edges.
 * 
 * @template TVertexData - The type of data stored in vertices
 * @template TEdgeData - The type of data stored in edges
 */
export interface IGraph<TVertexData = unknown, TEdgeData = unknown> {
  /** All vertices in the graph */
  readonly vertices: ReadonlyArray<IVertex<TVertexData>>;
  
  /** All edges in the graph */
  readonly edges: ReadonlyArray<IEdge<TEdgeData>>;
  
  /** Optional graph-level metadata */
  readonly metadata?: Record<string, unknown>;
}

// ============================================================================
// Data Access Layer
// ============================================================================

/**
 * Abstract interface for graph data retrieval and management.
 * Decouples data access from rendering and layout concerns.
 * 
 * @template TVertexData - The type of data stored in vertices
 * @template TEdgeData - The type of data stored in edges
 */
export interface IGraphDataStore<TVertexData = unknown, TEdgeData = unknown> {
  /**
   * Retrieve the complete graph structure.
   * 
   * @returns Promise resolving to the complete graph
   */
  getGraph(): Promise<IGraph<TVertexData, TEdgeData>>;
  
  /**
   * Retrieve a specific vertex by its identifier.
   * 
   * @param id - The vertex identifier
   * @returns Promise resolving to the vertex, or undefined if not found
   */
  getVertex(id: string): Promise<IVertex<TVertexData> | undefined>;
  
  /**
   * Retrieve a specific edge by its identifier.
   * 
   * @param id - The edge identifier
   * @returns Promise resolving to the edge, or undefined if not found
   */
  getEdge(id: string): Promise<IEdge<TEdgeData> | undefined>;
  
  /**
   * Retrieve all edges connected to a specific vertex.
   * 
   * @param vertexId - The vertex identifier
   * @returns Promise resolving to connected edges
   */
  getConnectedEdges(vertexId: string): Promise<ReadonlyArray<IEdge<TEdgeData>>>;
  
  /**
   * Retrieve all vertices connected to a specific vertex.
   * 
   * @param vertexId - The vertex identifier
   * @returns Promise resolving to connected vertices
   */
  getNeighbors(vertexId: string): Promise<ReadonlyArray<IVertex<TVertexData>>>;
}

// ============================================================================
// Layout System
// ============================================================================

/**
 * 2D position coordinates for layout calculations.
 */
export interface IPosition {
  readonly x: number;
  readonly y: number;
}

/**
 * 2D dimensions for rendering calculations.
 */
export interface IDimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * Positioned vertex containing layout coordinates.
 * 
 * @template TData - The type of domain-specific data stored in the vertex
 */
export interface IPositionedVertex<TData = unknown> extends IVertex<TData> {
  /** Current position in the layout */
  readonly position: IPosition;
  
  /** Optional velocity for physics-based layouts */
  readonly velocity?: IPosition;
  
  /** Whether the vertex position is fixed (not affected by layout) */
  readonly fixed?: boolean;
}

/**
 * Layout configuration interface for algorithm parameters.
 */
export interface ILayoutConfig {
  /** Canvas dimensions for layout calculations */
  readonly dimensions: IDimensions;
  
  /** Algorithm-specific parameters */
  readonly parameters?: Record<string, unknown>;
  
  /** Whether to animate layout changes */
  readonly animated?: boolean;
  
  /** Animation duration in milliseconds */
  readonly animationDuration?: number;
}

/**
 * Layout algorithm interface for pluggable layout engines.
 * 
 * @template TVertexData - The type of data stored in vertices
 * @template TEdgeData - The type of data stored in edges
 */
export interface ILayoutAlgorithm<TVertexData = unknown, TEdgeData = unknown> {
  /** Human-readable name of the layout algorithm */
  readonly name: string;
  
  /** Algorithm description */
  readonly description?: string;
  
  /** Default configuration parameters */
  readonly defaultConfig: Partial<ILayoutConfig>;
  
  /**
   * Calculate layout positions for all vertices.
   * 
   * @param graph - The graph to layout
   * @param config - Layout configuration
   * @returns Promise resolving to positioned vertices
   */
  layout(
    graph: IGraph<TVertexData, TEdgeData>,
    config: ILayoutConfig
  ): Promise<ReadonlyArray<IPositionedVertex<TVertexData>>>;
  
  /**
   * Update layout with new or modified vertices/edges.
   * Allows for incremental layout updates without full recalculation.
   * 
   * @param currentPositions - Current vertex positions
   * @param graph - Updated graph structure
   * @param config - Layout configuration
   * @returns Promise resolving to updated positions
   */
  updateLayout?(
    currentPositions: ReadonlyArray<IPositionedVertex<TVertexData>>,
    graph: IGraph<TVertexData, TEdgeData>,
    config: ILayoutConfig
  ): Promise<ReadonlyArray<IPositionedVertex<TVertexData>>>;
  
  /**
   * Stop any running layout calculations.
   * Useful for physics-based algorithms that run continuously.
   */
  stop?(): void;
}

// ============================================================================
// Rendering System
// ============================================================================

/**
 * Rendering context providing access to canvas and utilities.
 */
export interface IRenderingContext {
  /** The canvas 2D rendering context */
  readonly ctx: CanvasRenderingContext2D;
  
  /** Current canvas dimensions */
  readonly dimensions: IDimensions;
  
  /** Current zoom level */
  readonly zoom: number;
  
  /** Current pan offset */
  readonly pan: IPosition;
  
  /** Device pixel ratio for high-DPI displays */
  readonly devicePixelRatio: number;
  
  /** Convert screen coordinates to graph coordinates */
  screenToGraph(screenPos: IPosition): IPosition;
  
  /** Convert graph coordinates to screen coordinates */
  graphToScreen(graphPos: IPosition): IPosition;
}

/**
 * Vertex rendering strategy interface.
 * 
 * @template TData - The type of domain-specific data stored in the vertex
 */
export interface IVertexRenderer<TData = unknown> {
  /** Unique identifier for the renderer */
  readonly id: string;
  
  /** Human-readable name */
  readonly name: string;
  
  /**
   * Render a single vertex.
   * 
   * @param vertex - The positioned vertex to render
   * @param context - Rendering context
   * @param isSelected - Whether the vertex is currently selected
   * @param isHovered - Whether the vertex is currently hovered
   */
  render(
    vertex: IPositionedVertex<TData>,
    context: IRenderingContext,
    isSelected?: boolean,
    isHovered?: boolean
  ): void;
  
  /**
   * Calculate vertex bounds for hit testing.
   * 
   * @param vertex - The positioned vertex
   * @param context - Rendering context
   * @returns Bounding rectangle in graph coordinates
   */
  getBounds(
    vertex: IPositionedVertex<TData>,
    context: IRenderingContext
  ): { x: number; y: number; width: number; height: number };
  
  /**
   * Test if a point intersects with the vertex.
   * 
   * @param vertex - The positioned vertex
   * @param point - Point to test in graph coordinates
   * @param context - Rendering context
   * @returns Whether the point intersects the vertex
   */
  hitTest(
    vertex: IPositionedVertex<TData>,
    point: IPosition,
    context: IRenderingContext
  ): boolean;
}

/**
 * Edge rendering strategy interface.
 * 
 * @template TData - The type of domain-specific data stored in the edge
 */
export interface IEdgeRenderer<TData = unknown> {
  /** Unique identifier for the renderer */
  readonly id: string;
  
  /** Human-readable name */
  readonly name: string;
  
  /**
   * Render a single edge.
   * 
   * @param edge - The edge to render
   * @param sourceVertex - The positioned source vertex
   * @param targetVertex - The positioned target vertex
   * @param context - Rendering context
   * @param isSelected - Whether the edge is currently selected
   * @param isHovered - Whether the edge is currently hovered
   */
  render(
    edge: IEdge<TData>,
    sourceVertex: IPositionedVertex,
    targetVertex: IPositionedVertex,
    context: IRenderingContext,
    isSelected?: boolean,
    isHovered?: boolean
  ): void;
  
  /**
   * Test if a point intersects with the edge.
   * 
   * @param edge - The edge to test
   * @param sourceVertex - The positioned source vertex
   * @param targetVertex - The positioned target vertex
   * @param point - Point to test in graph coordinates
   * @param context - Rendering context
   * @returns Whether the point intersects the edge
   */
  hitTest(
    edge: IEdge<TData>,
    sourceVertex: IPositionedVertex,
    targetVertex: IPositionedVertex,
    point: IPosition,
    context: IRenderingContext
  ): boolean;
}

// ============================================================================
// Interaction System
// ============================================================================

/**
 * Mouse event data for interaction handlers.
 */
export interface IMouseEvent {
  /** Mouse position in screen coordinates */
  readonly screenPosition: IPosition;
  
  /** Mouse position in graph coordinates */
  readonly graphPosition: IPosition;
  
  /** Which mouse button was pressed (0=left, 1=middle, 2=right) */
  readonly button: number;
  
  /** Modifier keys held during the event */
  readonly modifiers: {
    readonly shift: boolean;
    readonly ctrl: boolean;
    readonly alt: boolean;
    readonly meta: boolean;
  };
  
  /** Original DOM event for advanced use cases */
  readonly originalEvent: MouseEvent;
}

/**
 * Keyboard event data for interaction handlers.
 */
export interface IKeyboardEvent {
  /** The key that was pressed */
  readonly key: string;
  
  /** Key code for the pressed key */
  readonly code: string;
  
  /** Modifier keys held during the event */
  readonly modifiers: {
    readonly shift: boolean;
    readonly ctrl: boolean;
    readonly alt: boolean;
    readonly meta: boolean;
  };
  
  /** Original DOM event for advanced use cases */
  readonly originalEvent: KeyboardEvent;
}

/**
 * Selection state management interface.
 * 
 * @template TVertexData - The type of data stored in vertices
 * @template TEdgeData - The type of data stored in edges
 */
export interface ISelectionState<TVertexData = unknown, TEdgeData = unknown> {
  /** Currently selected vertices */
  readonly selectedVertices: ReadonlySet<string>;
  
  /** Currently selected edges */
  readonly selectedEdges: ReadonlySet<string>;
  
  /** Currently hovered vertex (if any) */
  readonly hoveredVertex?: string;
  
  /** Currently hovered edge (if any) */
  readonly hoveredEdge?: string;
  
  /** Select vertices (replacing current selection) */
  selectVertices(vertexIds: ReadonlyArray<string>): void;
  
  /** Add vertices to current selection */
  addVertices(vertexIds: ReadonlyArray<string>): void;
  
  /** Remove vertices from current selection */
  removeVertices(vertexIds: ReadonlyArray<string>): void;
  
  /** Select edges (replacing current selection) */
  selectEdges(edgeIds: ReadonlyArray<string>): void;
  
  /** Add edges to current selection */
  addEdges(edgeIds: ReadonlyArray<string>): void;
  
  /** Remove edges from current selection */
  removeEdges(edgeIds: ReadonlyArray<string>): void;
  
  /** Clear all selections */
  clearSelection(): void;
  
  /** Set hovered vertex */
  setHoveredVertex(vertexId?: string): void;
  
  /** Set hovered edge */
  setHoveredEdge(edgeId?: string): void;
}

/**
 * Interaction handler for mouse events.
 * 
 * @template TVertexData - The type of data stored in vertices
 * @template TEdgeData - The type of data stored in edges
 */
export interface IMouseInteractionHandler<TVertexData = unknown, TEdgeData = unknown> {
  /** Handler identifier */
  readonly id: string;
  
  /** Handler name */
  readonly name: string;
  
  /** Handle mouse down events */
  onMouseDown?(
    event: IMouseEvent,
    hitVertex?: IVertex<TVertexData>,
    hitEdge?: IEdge<TEdgeData>
  ): boolean | void;
  
  /** Handle mouse up events */
  onMouseUp?(
    event: IMouseEvent,
    hitVertex?: IVertex<TVertexData>,
    hitEdge?: IEdge<TEdgeData>
  ): boolean | void;
  
  /** Handle mouse move events */
  onMouseMove?(
    event: IMouseEvent,
    hitVertex?: IVertex<TVertexData>,
    hitEdge?: IEdge<TEdgeData>
  ): boolean | void;
  
  /** Handle mouse click events */
  onClick?(
    event: IMouseEvent,
    hitVertex?: IVertex<TVertexData>,
    hitEdge?: IEdge<TEdgeData>
  ): boolean | void;
  
  /** Handle mouse double-click events */
  onDoubleClick?(
    event: IMouseEvent,
    hitVertex?: IVertex<TVertexData>,
    hitEdge?: IEdge<TEdgeData>
  ): boolean | void;
  
  /** Handle mouse wheel events */
  onWheel?(event: IMouseEvent & { deltaY: number }): boolean | void;
}

/**
 * Interaction handler for keyboard events.
 */
export interface IKeyboardInteractionHandler {
  /** Handler identifier */
  readonly id: string;
  
  /** Handler name */
  readonly name: string;
  
  /** Handle key down events */
  onKeyDown?(event: IKeyboardEvent): boolean | void;
  
  /** Handle key up events */
  onKeyUp?(event: IKeyboardEvent): boolean | void;
}

// ============================================================================
// Configuration Interfaces
// ============================================================================

/**
 * Visual styling configuration for graph rendering.
 */
export interface IGraphStyling {
  /** Background color */
  readonly backgroundColor?: string;
  
  /** Default vertex styling */
  readonly vertex?: {
    readonly fillColor?: string;
    readonly strokeColor?: string;
    readonly strokeWidth?: number;
    readonly radius?: number;
    readonly fontSize?: number;
    readonly fontFamily?: string;
    readonly fontColor?: string;
  };
  
  /** Default edge styling */
  readonly edge?: {
    readonly strokeColor?: string;
    readonly strokeWidth?: number;
    readonly arrowSize?: number;
    readonly fontSize?: number;
    readonly fontFamily?: string;
    readonly fontColor?: string;
  };
  
  /** Selection styling */
  readonly selection?: {
    readonly vertexStrokeColor?: string;
    readonly vertexStrokeWidth?: number;
    readonly edgeStrokeColor?: string;
    readonly edgeStrokeWidth?: number;
  };
  
  /** Hover styling */
  readonly hover?: {
    readonly vertexStrokeColor?: string;
    readonly vertexStrokeWidth?: number;
    readonly edgeStrokeColor?: string;
    readonly edgeStrokeWidth?: number;
  };
}

/**
 * Interaction behavior configuration.
 */
export interface IInteractionConfig {
  /** Enable pan interaction */
  readonly enablePan?: boolean;
  
  /** Enable zoom interaction */
  readonly enableZoom?: boolean;
  
  /** Enable vertex selection */
  readonly enableVertexSelection?: boolean;
  
  /** Enable edge selection */
  readonly enableEdgeSelection?: boolean;
  
  /** Enable multi-selection with Ctrl/Cmd */
  readonly enableMultiSelection?: boolean;
  
  /** Enable vertex dragging */
  readonly enableVertexDragging?: boolean;
  
  /** Zoom limits */
  readonly zoomLimits?: {
    readonly min: number;
    readonly max: number;
  };
}

/**
 * Complete graph visualization configuration.
 * 
 * @template TVertexData - The type of data stored in vertices
 * @template TEdgeData - The type of data stored in edges
 */
export interface IGraphConfig<TVertexData = unknown, TEdgeData = unknown> {
  /** Layout algorithm configuration */
  readonly layout: ILayoutConfig;
  
  /** Visual styling configuration */
  readonly styling?: IGraphStyling;
  
  /** Interaction behavior configuration */
  readonly interaction?: IInteractionConfig;
  
  /** Performance optimization settings */
  readonly performance?: {
    /** Maximum vertices to render at once */
    readonly maxVertices?: number;
    /** Maximum edges to render at once */
    readonly maxEdges?: number;
    /** Enable level-of-detail rendering */
    readonly enableLOD?: boolean;
    /** Enable vertex culling outside viewport */
    readonly enableCulling?: boolean;
  };
}

// ============================================================================
// Registry Interfaces
// ============================================================================

/**
 * Type-safe renderer registry for managing vertex and edge renderers.
 * 
 * @template TVertexData - The type of data stored in vertices
 * @template TEdgeData - The type of data stored in edges
 */
export interface IRendererRegistry<TVertexData = unknown, TEdgeData = unknown> {
  /**
   * Register a vertex renderer.
   * 
   * @param renderer - The vertex renderer to register
   */
  registerVertexRenderer(renderer: IVertexRenderer<TVertexData>): void;
  
  /**
   * Register an edge renderer.
   * 
   * @param renderer - The edge renderer to register
   */
  registerEdgeRenderer(renderer: IEdgeRenderer<TEdgeData>): void;
  
  /**
   * Get a vertex renderer by ID.
   * 
   * @param id - The renderer ID
   * @returns The vertex renderer, or undefined if not found
   */
  getVertexRenderer(id: string): IVertexRenderer<TVertexData> | undefined;
  
  /**
   * Get an edge renderer by ID.
   * 
   * @param id - The renderer ID
   * @returns The edge renderer, or undefined if not found
   */
  getEdgeRenderer(id: string): IEdgeRenderer<TEdgeData> | undefined;
  
  /**
   * Get all registered vertex renderers.
   * 
   * @returns Array of all vertex renderers
   */
  getVertexRenderers(): ReadonlyArray<IVertexRenderer<TVertexData>>;
  
  /**
   * Get all registered edge renderers.
   * 
   * @returns Array of all edge renderers
   */
  getEdgeRenderers(): ReadonlyArray<IEdgeRenderer<TEdgeData>>;
}

/**
 * Type-safe layout algorithm registry.
 * 
 * @template TVertexData - The type of data stored in vertices
 * @template TEdgeData - The type of data stored in edges
 */
export interface ILayoutRegistry<TVertexData = unknown, TEdgeData = unknown> {
  /**
   * Register a layout algorithm.
   * 
   * @param algorithm - The layout algorithm to register
   */
  registerAlgorithm(algorithm: ILayoutAlgorithm<TVertexData, TEdgeData>): void;
  
  /**
   * Get a layout algorithm by name.
   * 
   * @param name - The algorithm name
   * @returns The layout algorithm, or undefined if not found
   */
  getAlgorithm(name: string): ILayoutAlgorithm<TVertexData, TEdgeData> | undefined;
  
  /**
   * Get all registered layout algorithms.
   * 
   * @returns Array of all layout algorithms
   */
  getAlgorithms(): ReadonlyArray<ILayoutAlgorithm<TVertexData, TEdgeData>>;
}

/**
 * Type-safe interaction handler registry.
 * 
 * @template TVertexData - The type of data stored in vertices
 * @template TEdgeData - The type of data stored in edges
 */
export interface IInteractionRegistry<TVertexData = unknown, TEdgeData = unknown> {
  /**
   * Register a mouse interaction handler.
   * 
   * @param handler - The mouse interaction handler to register
   */
  registerMouseHandler(handler: IMouseInteractionHandler<TVertexData, TEdgeData>): void;
  
  /**
   * Register a keyboard interaction handler.
   * 
   * @param handler - The keyboard interaction handler to register
   */
  registerKeyboardHandler(handler: IKeyboardInteractionHandler): void;
  
  /**
   * Get all registered mouse handlers.
   * 
   * @returns Array of all mouse handlers
   */
  getMouseHandlers(): ReadonlyArray<IMouseInteractionHandler<TVertexData, TEdgeData>>;
  
  /**
   * Get all registered keyboard handlers.
   * 
   * @returns Array of all keyboard handlers
   */
  getKeyboardHandlers(): ReadonlyArray<IKeyboardInteractionHandler>;
  
  /**
   * Remove a mouse handler by ID.
   * 
   * @param id - The handler ID to remove
   */
  removeMouseHandler(id: string): void;
  
  /**
   * Remove a keyboard handler by ID.
   * 
   * @param id - The handler ID to remove
   */
  removeKeyboardHandler(id: string): void;
}

// ============================================================================
// Core Graph Visualization Engine Interface
// ============================================================================

/**
 * Main graph visualization engine interface that orchestrates all components.
 * 
 * @template TVertexData - The type of data stored in vertices
 * @template TEdgeData - The type of data stored in edges
 */
export interface IGraphVisualizationEngine<TVertexData = unknown, TEdgeData = unknown> {
  /** Data store for graph access */
  readonly dataStore: IGraphDataStore<TVertexData, TEdgeData>;
  
  /** Current layout algorithm */
  readonly layoutAlgorithm: ILayoutAlgorithm<TVertexData, TEdgeData>;
  
  /** Renderer registry */
  readonly rendererRegistry: IRendererRegistry<TVertexData, TEdgeData>;
  
  /** Layout algorithm registry */
  readonly layoutRegistry: ILayoutRegistry<TVertexData, TEdgeData>;
  
  /** Interaction handler registry */
  readonly interactionRegistry: IInteractionRegistry<TVertexData, TEdgeData>;
  
  /** Current selection state */
  readonly selectionState: ISelectionState<TVertexData, TEdgeData>;
  
  /** Current configuration */
  readonly config: IGraphConfig<TVertexData, TEdgeData>;
  
  /**
   * Initialize the visualization engine with a canvas element.
   * 
   * @param canvas - The HTML canvas element to render to
   * @param config - Initial configuration
   */
  initialize(canvas: HTMLCanvasElement, config: IGraphConfig<TVertexData, TEdgeData>): Promise<void>;
  
  /**
   * Load and display a graph.
   * 
   * @param graph - The graph to display, or undefined to load from data store
   */
  loadGraph(graph?: IGraph<TVertexData, TEdgeData>): Promise<void>;
  
  /**
   * Update the configuration and re-render.
   * 
   * @param config - New configuration (merged with existing)
   */
  updateConfig(config: Partial<IGraphConfig<TVertexData, TEdgeData>>): void;
  
  /**
   * Switch to a different layout algorithm.
   * 
   * @param algorithmName - Name of the layout algorithm to use
   * @param config - Optional layout-specific configuration
   */
  setLayoutAlgorithm(algorithmName: string, config?: Partial<ILayoutConfig>): Promise<void>;
  
  /**
   * Manually trigger a re-render of the graph.
   */
  render(): void;
  
  /**
   * Clean up resources and event listeners.
   */
  dispose(): void;
  
  /**
   * Fit the graph to the canvas viewport.
   * 
   * @param padding - Optional padding around the graph bounds
   */
  fitToCanvas(padding?: number): void;
  
  /**
   * Export the current graph as an image.
   * 
   * @param format - Image format ('png' | 'jpeg' | 'webp')
   * @param quality - Image quality (0-1, for lossy formats)
   * @returns Promise resolving to the image data URL
   */
  exportAsImage(format?: 'png' | 'jpeg' | 'webp', quality?: number): Promise<string>;
}