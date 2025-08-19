/**
 * Comprehensive TypeScript interfaces for graph rendering engine abstraction
 * 
 * This module provides a unified API that can work with any graph rendering technology
 * (Cytoscape.js, D3.js, custom Canvas, WebGL, etc.) while maintaining type safety
 * and supporting advanced features like lifecycle management, capabilities detection,
 * and multiple rendering contexts.
 */

// ============================================================================
// Core Data Types
// ============================================================================

/**
 * Base vertex (node) interface that all graph engines must support
 */
export interface IGraphVertex {
  readonly id: string;
  readonly label?: string;
  readonly position?: IPosition;
  readonly style?: Record<string, unknown>;
  readonly data?: Record<string, unknown>;
  readonly classes?: string[];
}

/**
 * Base edge (connection) interface that all graph engines must support
 */
export interface IGraphEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly label?: string;
  readonly weight?: number;
  readonly style?: Record<string, unknown>;
  readonly data?: Record<string, unknown>;
  readonly classes?: string[];
}

/**
 * 2D position coordinates
 */
export interface IPosition {
  readonly x: number;
  readonly y: number;
}

/**
 * 3D position coordinates (for engines supporting 3D layouts)
 */
export interface IPosition3D extends IPosition {
  readonly z: number;
}

/**
 * Bounding box for layout and rendering calculations
 */
export interface IBoundingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Viewport information for rendering context
 */
export interface IViewport {
  readonly boundingBox: IBoundingBox;
  readonly zoom: number;
  readonly pan: IPosition;
}

// ============================================================================
// Rendering Context Types
// ============================================================================

/**
 * Supported rendering contexts
 */
export type RenderingContextType = 'canvas' | 'svg' | 'webgl' | 'css' | 'custom';

/**
 * Canvas rendering context
 */
export interface ICanvasRenderingContext {
  readonly type: 'canvas';
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  readonly devicePixelRatio?: number;
}

/**
 * SVG rendering context
 */
export interface ISVGRenderingContext {
  readonly type: 'svg';
  readonly svg: SVGSVGElement;
  readonly defs?: SVGDefsElement;
  readonly viewport?: SVGRect;
}

/**
 * WebGL rendering context
 */
export interface IWebGLRenderingContext {
  readonly type: 'webgl';
  readonly canvas: HTMLCanvasElement;
  readonly context: WebGLRenderingContext | WebGL2RenderingContext;
  readonly extensions?: string[];
}

/**
 * CSS-based rendering context (for DOM-based engines)
 */
export interface ICSSRenderingContext {
  readonly type: 'css';
  readonly container: HTMLElement;
  readonly stylesheet?: CSSStyleSheet;
}

/**
 * Custom rendering context for engine-specific implementations
 */
export interface ICustomRenderingContext {
  readonly type: 'custom';
  readonly container: HTMLElement;
  readonly context: unknown;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Union type of all supported rendering contexts
 */
export type RenderingContext = 
  | ICanvasRenderingContext 
  | ISVGRenderingContext 
  | IWebGLRenderingContext
  | ICSSRenderingContext
  | ICustomRenderingContext;

// ============================================================================
// Engine Capabilities and Configuration
// ============================================================================

/**
 * Layout algorithms supported by graph engines
 */
export type LayoutAlgorithm = 
  | 'force-directed' 
  | 'hierarchical' 
  | 'circular' 
  | 'grid' 
  | 'tree' 
  | 'dagre' 
  | 'cola' 
  | 'cose' 
  | 'fcose' 
  | 'elk' 
  | 'custom';

/**
 * Interaction capabilities
 */
export interface IInteractionCapabilities {
  readonly pan: boolean;
  readonly zoom: boolean;
  readonly select: boolean;
  readonly drag: boolean;
  readonly hover: boolean;
  readonly doubleClick: boolean;
  readonly contextMenu: boolean;
  readonly multiSelect: boolean;
  readonly boxSelect: boolean;
  readonly edgeHandles: boolean;
}

/**
 * Export format support
 */
export interface IExportCapabilities {
  readonly png: boolean;
  readonly jpg: boolean;
  readonly svg: boolean;
  readonly pdf: boolean;
  readonly json: boolean;
  readonly graphml: boolean;
  readonly gexf: boolean;
  readonly cyjs: boolean;
}

/**
 * Animation and transition support
 */
export interface IAnimationCapabilities {
  readonly layoutTransitions: boolean;
  readonly nodeAnimations: boolean;
  readonly edgeAnimations: boolean;
  readonly customEasing: boolean;
  readonly duration: boolean;
  readonly delay: boolean;
}

/**
 * Performance characteristics and limitations
 */
export interface IPerformanceCapabilities {
  readonly maxNodes: number | 'unlimited';
  readonly maxEdges: number | 'unlimited';
  readonly supportsLargeGraphs: boolean;
  readonly supportsStreaming: boolean;
  readonly supportsWebWorkers: boolean;
  readonly memoryEfficient: boolean;
}

/**
 * Comprehensive engine capabilities
 */
export interface EngineCapabilities {
  readonly renderingContexts: RenderingContextType[];
  readonly layouts: LayoutAlgorithm[];
  readonly interactions: IInteractionCapabilities;
  readonly exports: IExportCapabilities;
  readonly animations: IAnimationCapabilities;
  readonly performance: IPerformanceCapabilities;
  readonly supports3D: boolean;
  readonly supportsCustomShaders: boolean;
  readonly supportsPlugins: boolean;
  readonly accessibility: boolean;
}

/**
 * Engine-specific configuration options
 */
export interface EngineConfiguration {
  readonly layout?: {
    readonly algorithm: LayoutAlgorithm;
    readonly options?: Record<string, unknown>;
    readonly animate?: boolean;
    readonly duration?: number;
  };
  readonly style?: {
    readonly theme?: string;
    readonly nodeStyle?: Record<string, unknown>;
    readonly edgeStyle?: Record<string, unknown>;
    readonly globalStyle?: Record<string, unknown>;
  };
  readonly interactions?: Partial<IInteractionCapabilities>;
  readonly performance?: {
    readonly enableWebGL?: boolean;
    readonly enableWebWorkers?: boolean;
    readonly maxFPS?: number;
    readonly renderOnDemand?: boolean;
  };
  readonly accessibility?: {
    readonly enableKeyboardNavigation?: boolean;
    readonly enableScreenReader?: boolean;
    readonly focusVisible?: boolean;
  };
  readonly debug?: {
    readonly showFPS?: boolean;
    readonly showBoundingBoxes?: boolean;
    readonly logPerformance?: boolean;
  };
}

// ============================================================================
// Engine Metadata and Lifecycle
// ============================================================================

/**
 * Engine metadata for identification and feature discovery
 */
export interface EngineMetadata {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author?: string;
  readonly homepage?: string;
  readonly license?: string;
  readonly capabilities: EngineCapabilities;
  readonly dependencies?: string[];
  readonly minNodeVersion?: string;
}

/**
 * Engine lifecycle states
 */
export type EngineState = 
  | 'uninitialised' 
  | 'initialising' 
  | 'ready' 
  | 'rendering' 
  | 'updating' 
  | 'destroyed' 
  | 'error';

/**
 * Lifecycle event types
 */
export type LifecycleEvent = 
  | 'beforeInit' 
  | 'afterInit' 
  | 'beforeRender' 
  | 'afterRender' 
  | 'beforeUpdate' 
  | 'afterUpdate' 
  | 'beforeDestroy' 
  | 'afterDestroy' 
  | 'error';

/**
 * Lifecycle event handler
 */
export type LifecycleEventHandler = (event: LifecycleEvent, data?: unknown) => void | Promise<void>;

/**
 * Engine lifecycle management interface
 */
export interface IEngineLifecycle {
  readonly state: EngineState;
  
  /**
   * Register lifecycle event handler
   */
  on(event: LifecycleEvent, handler: LifecycleEventHandler): void;
  
  /**
   * Unregister lifecycle event handler
   */
  off(event: LifecycleEvent, handler: LifecycleEventHandler): void;
  
  /**
   * Initialise the engine with rendering context and configuration
   */
  init(context: RenderingContext, config?: EngineConfiguration): Promise<void>;
  
  /**
   * Destroy the engine and clean up resources
   */
  destroy(): Promise<void>;
  
  /**
   * Check if engine is ready for operations
   */
  isReady(): boolean;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Graph engine error types
 */
export type GraphEngineErrorType = 
  | 'initialisation' 
  | 'rendering' 
  | 'layout' 
  | 'data' 
  | 'configuration' 
  | 'export' 
  | 'performance' 
  | 'unsupported';

/**
 * Graph engine error class
 */
export class GraphEngineError extends Error {
  public readonly type: GraphEngineErrorType;
  public readonly engine: string;
  public readonly details?: Record<string, unknown>;
  
  constructor(
    type: GraphEngineErrorType,
    message: string,
    engine: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GraphEngineError';
    this.type = type;
    this.engine = engine;
    this.details = details;
  }
}

/**
 * Error handling strategy
 */
export interface IErrorHandling {
  /**
   * Handle engine errors with optional fallback
   */
  handleError(error: GraphEngineError): Promise<void>;
  
  /**
   * Register error recovery handler
   */
  onError(handler: (error: GraphEngineError) => void | Promise<void>): void;
  
  /**
   * Check if engine supports graceful degradation
   */
  supportsGracefulDegradation(): boolean;
}

// ============================================================================
// Core Graph Engine Interface
// ============================================================================

/**
 * Graph data structure
 */
export interface IGraphData<TVertex extends IGraphVertex = IGraphVertex, TEdge extends IGraphEdge = IGraphEdge> {
  readonly vertices: TVertex[];
  readonly edges: TEdge[];
  readonly metadata?: Record<string, unknown>;
}

/**
 * Update operations for graph data
 */
export interface IGraphUpdate<TVertex extends IGraphVertex = IGraphVertex, TEdge extends IGraphEdge = IGraphEdge> {
  readonly addVertices?: TVertex[];
  readonly updateVertices?: Partial<TVertex>[];
  readonly removeVertices?: string[];
  readonly addEdges?: TEdge[];
  readonly updateEdges?: Partial<TEdge>[];
  readonly removeEdges?: string[];
}

/**
 * Selection state management
 */
export interface ISelectionState {
  readonly selectedVertices: string[];
  readonly selectedEdges: string[];
  readonly hoveredVertex?: string;
  readonly hoveredEdge?: string;
}

/**
 * Event data for graph interactions
 */
export interface IGraphEvent<T = unknown> {
  readonly type: string;
  readonly target?: string;
  readonly data?: T;
  readonly position?: IPosition;
  readonly modifiers?: {
    readonly ctrl: boolean;
    readonly shift: boolean;
    readonly alt: boolean;
    readonly meta: boolean;
  };
}

/**
 * Event handler for graph interactions
 */
export type GraphEventHandler<T = unknown> = (event: IGraphEvent<T>) => void | Promise<void>;

/**
 * Core graph rendering engine interface
 * 
 * This is the main interface that all graph engines must implement
 * Generic types TVertex and TEdge allow for engine-specific data structures
 * while maintaining type safety and consistency
 */
export interface IGraphEngine<TVertex extends IGraphVertex = IGraphVertex, TEdge extends IGraphEdge = IGraphEdge>
  extends IEngineLifecycle, IErrorHandling {
  
  // ========================================================================
  // Engine Identity and Capabilities
  // ========================================================================
  
  /**
   * Engine metadata and capabilities
   */
  readonly metadata: EngineMetadata;
  
  /**
   * Current engine configuration
   */
  readonly configuration?: EngineConfiguration;
  
  /**
   * Current rendering context
   */
  readonly context?: RenderingContext;
  
  // ========================================================================
  // Data Management
  // ========================================================================
  
  /**
   * Set complete graph data (replaces existing data)
   */
  setData(data: IGraphData<TVertex, TEdge>): Promise<void>;
  
  /**
   * Update graph data incrementally
   */
  updateData(update: IGraphUpdate<TVertex, TEdge>): Promise<void>;
  
  /**
   * Get current graph data
   */
  getData(): IGraphData<TVertex, TEdge>;
  
  /**
   * Clear all graph data
   */
  clearData(): Promise<void>;
  
  // ========================================================================
  // Rendering Control
  // ========================================================================
  
  /**
   * Render the graph (full re-render)
   */
  render(): Promise<void>;
  
  /**
   * Update rendering (optimised partial update)
   */
  update(): Promise<void>;
  
  /**
   * Force a repaint/redraw
   */
  repaint(): void;
  
  /**
   * Resize the rendering context
   */
  resize(width?: number, height?: number): Promise<void>;
  
  // ========================================================================
  // Layout Management
  // ========================================================================
  
  /**
   * Apply layout algorithm
   */
  applyLayout(algorithm?: LayoutAlgorithm, options?: Record<string, unknown>): Promise<void>;
  
  /**
   * Stop current layout calculation
   */
  stopLayout(): void;
  
  /**
   * Get available layout algorithms
   */
  getAvailableLayouts(): LayoutAlgorithm[];
  
  // ========================================================================
  // Viewport and Navigation
  // ========================================================================
  
  /**
   * Get current viewport information
   */
  getViewport(): IViewport;
  
  /**
   * Set viewport (pan and zoom)
   */
  setViewport(viewport: Partial<IViewport>): Promise<void>;
  
  /**
   * Fit graph to viewport
   */
  fit(padding?: number): Promise<void>;
  
  /**
   * Center graph in viewport
   */
  center(): Promise<void>;
  
  /**
   * Zoom to specific level
   */
  zoom(level: number, center?: IPosition): Promise<void>;
  
  /**
   * Pan to specific position
   */
  pan(position: IPosition): Promise<void>;
  
  // ========================================================================
  // Selection and Interaction
  // ========================================================================
  
  /**
   * Get current selection state
   */
  getSelection(): ISelectionState;
  
  /**
   * Set selection state
   */
  setSelection(selection: Partial<ISelectionState>): void;
  
  /**
   * Register lifecycle event handler
   */
  on(event: LifecycleEvent, handler: LifecycleEventHandler): void;
  /**
   * Register graph interaction event handler  
   */
  on<T = unknown>(event: string, handler: GraphEventHandler<T>): void;
  
  /**
   * Unregister lifecycle event handler
   */
  off(event: LifecycleEvent, handler: LifecycleEventHandler): void;
  /**
   * Unregister graph interaction event handler
   */
  off<T = unknown>(event: string, handler: GraphEventHandler<T>): void;
  
  /**
   * Enable or disable interactions
   */
  setInteractive(interactive: boolean): void;
  
  // ========================================================================
  // Export and Utilities
  // ========================================================================
  
  /**
   * Export graph in specified format
   */
  export(format: keyof IExportCapabilities, options?: Record<string, unknown>): Promise<string | Blob>;
  
  /**
   * Get element at specific position
   */
  getElementAt(position: IPosition): { vertex?: TVertex; edge?: TEdge } | null;
  
  /**
   * Get elements in bounding box
   */
  getElementsInBoundingBox(boundingBox: IBoundingBox): { vertices: TVertex[]; edges: TEdge[] };
  
  /**
   * Calculate shortest path between vertices
   */
  getShortestPath?(source: string, target: string): string[] | null;
  
  /**
   * Get performance statistics
   */
  getStats?(): Record<string, number>;
}

// ============================================================================
// Engine Factory and Registry
// ============================================================================

/**
 * Engine factory function type
 */
export type EngineFactory<TVertex extends IGraphVertex = IGraphVertex, TEdge extends IGraphEdge = IGraphEdge> = 
  () => Promise<IGraphEngine<TVertex, TEdge>>;

/**
 * Engine registry for managing multiple engine implementations
 */
export interface IEngineRegistry {
  /**
   * Register a new engine factory
   */
  register<TVertex extends IGraphVertex = IGraphVertex, TEdge extends IGraphEdge = IGraphEdge>(
    name: string, 
    factory: EngineFactory<TVertex, TEdge>
  ): void;
  
  /**
   * Get engine factory by name
   */
  get<TVertex extends IGraphVertex = IGraphVertex, TEdge extends IGraphEdge = IGraphEdge>(
    name: string
  ): EngineFactory<TVertex, TEdge> | undefined;
  
  /**
   * Get all registered engine names
   */
  getNames(): string[];
  
  /**
   * Create engine instance
   */
  create<TVertex extends IGraphVertex = IGraphVertex, TEdge extends IGraphEdge = IGraphEdge>(
    name: string
  ): Promise<IGraphEngine<TVertex, TEdge>>;
  
  /**
   * Get engines supporting specific capabilities
   */
  findByCapabilities(requirements: Partial<EngineCapabilities>): string[];
}

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Type guard for graph vertex
 */
export function isGraphVertex(obj: unknown): obj is IGraphVertex {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as IGraphVertex).id === 'string'
  );
}

/**
 * Type guard for graph edge
 */
export function isGraphEdge(obj: unknown): obj is IGraphEdge {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as IGraphEdge).id === 'string' &&
    typeof (obj as IGraphEdge).source === 'string' &&
    typeof (obj as IGraphEdge).target === 'string'
  );
}

/**
 * Type guard for rendering context
 */
export function isRenderingContext(obj: unknown): obj is RenderingContext {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as RenderingContext).type === 'string' &&
    ['canvas', 'svg', 'webgl', 'css', 'custom'].includes((obj as RenderingContext).type)
  );
}

/**
 * Create default engine capabilities
 */
export function createDefaultCapabilities(): EngineCapabilities {
  return {
    renderingContexts: ['canvas', 'svg'],
    layouts: ['force-directed', 'circular', 'grid'],
    interactions: {
      pan: true,
      zoom: true,
      select: true,
      drag: true,
      hover: true,
      doubleClick: true,
      contextMenu: false,
      multiSelect: true,
      boxSelect: true,
      edgeHandles: false,
    },
    exports: {
      png: true,
      jpg: true,
      svg: true,
      pdf: false,
      json: true,
      graphml: false,
      gexf: false,
      cyjs: false,
    },
    animations: {
      layoutTransitions: true,
      nodeAnimations: true,
      edgeAnimations: true,
      customEasing: false,
      duration: true,
      delay: true,
    },
    performance: {
      maxNodes: 10000,
      maxEdges: 20000,
      supportsLargeGraphs: false,
      supportsStreaming: false,
      supportsWebWorkers: false,
      memoryEfficient: true,
    },
    supports3D: false,
    supportsCustomShaders: false,
    supportsPlugins: false,
    accessibility: false,
  };
}