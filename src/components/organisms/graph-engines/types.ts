/**
 * Graph Engine Types and Interfaces
 *
 * Defines standardised interfaces for pluggable graph rendering engines.
 * Currently supports:
 * - xyflow (React Flow): Modern React-based flow diagrams and interactive graphs
 * - svg: SVG-based rendering (placeholder for future implementation)
 *
 * The infrastructure supports easy addition of new engines while maintaining
 * the same interface for seamless switching between implementations.
 */

import type {
  IGraph,
  IVertex as _IVertex,
  IEdge as _IEdge,
  IPosition as _IPosition,
  IDimensions,
  IGraphConfig,
  IPositionedVertex
} from '../graph-core/interfaces';

// ============================================================================
// Core Engine Interface
// ============================================================================

/**
 * Performance characteristics for different graph rendering engines.
 */
export interface IEngineCapabilities {
  /** Maximum recommended number of vertices for optimal performance */
  readonly maxVertices: number;
  
  /** Maximum recommended number of edges for optimal performance */
  readonly maxEdges: number;
  
  /** Whether the engine supports hardware acceleration */
  readonly supportsHardwareAcceleration: boolean;
  
  /** Whether the engine supports interactive layouts */
  readonly supportsInteractiveLayout: boolean;
  
  /** Whether the engine supports real-time physics simulation */
  readonly supportsPhysicsSimulation: boolean;
  
  /** Whether the engine supports clustering/grouping */
  readonly supportsClustering: boolean;
  
  /** Whether the engine supports custom node shapes */
  readonly supportsCustomShapes: boolean;
  
  /** Whether the engine supports edge bundling */
  readonly supportsEdgeBundling: boolean;
  
  /** Supported export formats */
  readonly exportFormats: ReadonlyArray<'png' | 'svg' | 'json' | 'pdf'>;
  
  /** Memory usage characteristics */
  readonly memoryUsage: 'low' | 'medium' | 'high';
  
  /** CPU usage characteristics */
  readonly cpuUsage: 'low' | 'medium' | 'high';
  
  /** Battery impact on mobile devices */
  readonly batteryImpact: 'minimal' | 'moderate' | 'significant';
}

/**
 * Engine-specific configuration options.
 */
export interface IEngineConfig {
  /** Engine-specific parameters */
  readonly parameters?: Record<string, unknown>;
  
  /** Performance optimisation level */
  readonly performanceLevel?: 'memory' | 'balanced' | 'performance';
  
  /** Whether to enable debugging features */
  readonly debug?: boolean;
  
  /** Custom styling overrides */
  readonly styling?: Record<string, unknown>;
}

/**
 * Installation and setup requirements for graph engines.
 */
export interface IEngineRequirements {
  /** NPM packages that need to be installed */
  readonly dependencies: ReadonlyArray<{
    readonly name: string;
    readonly version: string;
    readonly optional?: boolean;
  }>;
  
  /** Minimum browser requirements */
  readonly browserSupport: {
    readonly chrome?: number;
    readonly firefox?: number;
    readonly safari?: number;
    readonly edge?: number;
  };
  
  /** Required browser features */
  readonly requiredFeatures: ReadonlyArray<string>;
  
  /** Setup instructions */
  readonly setupInstructions: string;
}

/**
 * Graph engine initialization status and information.
 */
export interface IEngineStatus {
  /** Whether the engine is currently initialised */
  readonly isInitialised: boolean;
  
  /** Whether the engine is currently rendering */
  readonly isRendering: boolean;
  
  /** Last error message (if any) */
  readonly lastError?: string;
  
  /** Current performance metrics */
  readonly metrics?: {
    readonly frameRate: number;
    readonly memoryUsage: number;
    readonly verticesRendered: number;
    readonly edgesRendered: number;
    readonly lastRenderTime: number;
  };
}

/**
 * Standardised interface for all graph rendering engines.
 * 
 * @template TVertexData - The type of data stored in vertices
 * @template TEdgeData - The type of data stored in edges
 */
export interface IGraphEngine<TVertexData = unknown, TEdgeData = unknown> {
  /** Unique identifier for this engine */
  readonly id: string;
  
  /** Human-readable name */
  readonly name: string;
  
  /** Engine description */
  readonly description: string;
  
  /** Version of the engine implementation */
  readonly version: string;
  
  /** Engine capabilities and performance characteristics */
  readonly capabilities: IEngineCapabilities;
  
  /** Installation and setup requirements */
  readonly requirements: IEngineRequirements;
  
  /** Current engine status */
  readonly status: IEngineStatus;
  
  /** Whether this engine is fully implemented */
  readonly isImplemented: boolean;
  
  /**
   * Initialise the engine with a container element.
   * 
   * @param container - HTML element to render the graph in
   * @param dimensions - Initial canvas dimensions
   * @param config - Engine-specific configuration
   * @returns Promise resolving when initialisation is complete
   */
  initialise(
    container: HTMLElement,
    dimensions: IDimensions,
    config?: IEngineConfig
  ): Promise<void>;
  
  /**
   * Load and display a graph.
   * 
   * @param graph - The graph data to display
   * @param config - Graph layout and styling configuration
   * @returns Promise resolving when graph is loaded and rendered
   */
  loadGraph(
    graph: IGraph<TVertexData, TEdgeData>,
    config?: IGraphConfig<TVertexData, TEdgeData>
  ): Promise<void>;
  
  /**
   * Update the graph with new data.
   * 
   * @param graph - Updated graph data
   * @param animate - Whether to animate the transition
   * @returns Promise resolving when update is complete
   */
  updateGraph(
    graph: IGraph<TVertexData, TEdgeData>,
    animate?: boolean
  ): Promise<void>;
  
  /**
   * Resize the graph canvas/viewport.
   * 
   * @param dimensions - New dimensions
   */
  resize(dimensions: IDimensions): void;
  
  /**
   * Export the current graph visualization.
   * 
   * @param format - Export format
   * @param options - Format-specific options
   * @returns Promise resolving to exported data
   */
  export(
    format: 'png' | 'svg' | 'json' | 'pdf',
    options?: Record<string, unknown>
  ): Promise<string | Blob>;
  
  /**
   * Get current vertex positions.
   * 
   * @returns Array of positioned vertices
   */
  getPositions(): ReadonlyArray<IPositionedVertex<TVertexData>>;
  
  /**
   * Set vertex positions programmatically.
   * 
   * @param positions - Vertex positions to apply
   * @param animate - Whether to animate the position change
   */
  setPositions(
    positions: ReadonlyArray<IPositionedVertex<TVertexData>>,
    animate?: boolean
  ): void;
  
  /**
   * Fit the graph to the viewport.
   * 
   * @param padding - Optional padding around the graph
   * @param animate - Whether to animate the fit operation
   */
  fitToView(padding?: number, animate?: boolean): void;
  
  /**
   * Clean up resources and destroy the engine instance.
   */
  destroy(): void;
  
  /**
   * Get a preview/demo component showing the engine's capabilities.
   * This is useful for development, testing, and demonstration purposes.
   * 
   * @returns React component showing engine preview
   */
  getPreviewComponent?(): React.ComponentType<{
    dimensions: IDimensions;
    sampleData?: IGraph<TVertexData, TEdgeData>;
  }>;
}

// ============================================================================
// Engine-Specific Configuration Types
// ============================================================================

/**
 * xyflow (React Flow) specific configuration options.
 */
export interface IXyflowConfig extends IEngineConfig {
  readonly xyflowOptions?: {
    readonly fitView?: boolean;
    readonly nodesDraggable?: boolean;
    readonly nodesConnectable?: boolean;
    readonly elementsSelectable?: boolean;
    readonly showBackground?: boolean;
    readonly showControls?: boolean;
    readonly showMiniMap?: boolean;
    readonly backgroundVariant?: 'lines' | 'dots' | 'cross';
    readonly minZoom?: number;
    readonly maxZoom?: number;
    readonly defaultViewport?: {
      readonly x: number;
      readonly y: number;
      readonly zoom: number;
    };
  };
  readonly layout?: {
    readonly algorithm?: 'dagre' | 'force' | 'hierarchical' | 'manual';
    readonly direction?: 'TB' | 'BT' | 'LR' | 'RL';
    readonly nodeSpacing?: [number, number];
    readonly rankSpacing?: number;
  };
}

// ============================================================================
// Engine Registry Interface
// ============================================================================

/**
 * Registry for managing available graph engines.
 */
export interface IGraphEngineRegistry<TVertexData = unknown, TEdgeData = unknown> {
  /**
   * Register a graph engine.
   * 
   * @param engine - The engine to register
   */
  registerEngine(engine: IGraphEngine<TVertexData, TEdgeData>): void;
  
  /**
   * Get an engine by ID.
   * 
   * @param id - Engine identifier
   * @returns The engine instance or undefined if not found
   */
  getEngine(id: string): IGraphEngine<TVertexData, TEdgeData> | undefined;
  
  /**
   * Get all registered engines.
   * 
   * @returns Array of all registered engines
   */
  getEngines(): ReadonlyArray<IGraphEngine<TVertexData, TEdgeData>>;
  
  /**
   * Get engines that support specific capabilities.
   * 
   * @param requiredCapabilities - Capability requirements
   * @returns Array of engines meeting the requirements
   */
  getEnginesByCapabilities(
    requiredCapabilities: Partial<IEngineCapabilities>
  ): ReadonlyArray<IGraphEngine<TVertexData, TEdgeData>>;
  
  /**
   * Get the recommended engine for a specific graph size.
   * 
   * @param vertexCount - Number of vertices
   * @param edgeCount - Number of edges
   * @returns Recommended engine or undefined if none suitable
   */
  getRecommendedEngine(
    vertexCount: number,
    edgeCount: number
  ): IGraphEngine<TVertexData, TEdgeData> | undefined;
}

// ============================================================================
// Engine Type Aliases and Union Types
// ============================================================================

/**
 * Available graph engine types
 */
export type GraphEngineType =
  | 'svg'            // SVG-based rendering (placeholder)
  | 'xyflow';        // xyflow (React Flow) - modern React-based flow diagrams

/**
 * Graph engine capabilities
 */
export interface GraphEngineCapabilities {
  /** Engine identifier */
  readonly type: GraphEngineType;
  
  /** Human-readable engine name */
  readonly displayName: string;
  
  /** Engine description */
  readonly description: string;
  
  /** Performance characteristics */
  readonly performance: {
    /** Maximum recommended vertices */
    readonly maxVertices: number;
    /** Maximum recommended edges */
    readonly maxEdges: number;
    /** Supports hardware acceleration */
    readonly hardwareAccelerated: boolean;
    /** Memory efficiency rating (1-5, 5 = most efficient) */
    readonly memoryEfficiency: 1 | 2 | 3 | 4 | 5;
    /** Rendering speed rating (1-5, 5 = fastest) */
    readonly renderingSpeed: 1 | 2 | 3 | 4 | 5;
  };
  
  /** Supported features */
  readonly features: {
    /** Supports real-time animations */
    readonly animations: boolean;
    /** Supports zooming and panning */
    readonly zoomPan: boolean;
    /** Supports vertex dragging */
    readonly vertexDragging: boolean;
    /** Supports edge selection */
    readonly edgeSelection: boolean;
    /** Supports multi-selection */
    readonly multiSelection: boolean;
    /** Supports custom vertex shapes */
    readonly customVertexShapes: boolean;
    /** Supports curved edges */
    readonly curvedEdges: boolean;
    /** Supports edge labels */
    readonly edgeLabels: boolean;
    /** Supports clustering */
    readonly clustering: boolean;
    /** Supports level-of-detail rendering */
    readonly levelOfDetail: boolean;
    /** Supports export capabilities */
    readonly export: {
      readonly png: boolean;
      readonly svg: boolean;
      readonly pdf: boolean;
      readonly json: boolean;
    };
  };
  
  /** Layout algorithms supported by this engine */
  readonly supportedLayouts: ReadonlyArray<string>;
  
  /** Rendering modes supported by this engine */
  readonly supportedRenderingModes: ReadonlyArray<'immediate' | 'retained' | 'hybrid'>;
}

/**
 * Graph engine transition options
 */
export interface GraphEngineTransitionOptions {
  /** Duration of transition animation in milliseconds */
  duration?: number;
  
  /** Easing function for transition */
  easing?: 'ease-in-out' | 'ease-in' | 'ease-out' | 'linear';
  
  /** Whether to preserve vertex positions during transition */
  preservePositions?: boolean;
  
  /** Whether to preserve selection state during transition */
  preserveSelection?: boolean;
  
  /** Whether to preserve zoom and pan state during transition */
  preserveViewport?: boolean;
  
  /** Custom transition effects */
  effects?: {
    fadeOut?: boolean;
    fadeIn?: boolean;
    scale?: boolean;
    slide?: 'left' | 'right' | 'up' | 'down';
  };
}

/**
 * Graph engine settings and configuration
 */
export interface GraphEngineSettings {
  /** Currently selected engine */
  selectedEngine: GraphEngineType;
  
  /** Engine-specific configurations */
  engineConfigs: Record<GraphEngineType, Partial<any>>;
  
  /** Transition preferences */
  transitionSettings: GraphEngineTransitionOptions;
  
  /** Performance preferences */
  performanceSettings: {
    /** Automatically switch to more performant engines for large graphs */
    autoOptimise: boolean;
    /** Vertex count threshold for auto-optimisation */
    autoOptimiseThreshold: number;
    /** Preferred engine for large graphs */
    largeGraphEngine: GraphEngineType;
  };
  
  /** User preferences */
  userPreferences: {
    /** Remember engine selection per project/graph type */
    rememberPerGraph: boolean;
    /** Show transition animations */
    showTransitions: boolean;
    /** Show engine performance warnings */
    showPerformanceWarnings: boolean;
  };
}

/**
 * Graph engine state interface
 */
export interface GraphEngineState {
  /** Available engines and their capabilities */
  availableEngines: Map<GraphEngineType, GraphEngineCapabilities>;
  
  /** Currently active engine */
  currentEngine: GraphEngineType;
  
  /** Engine instances (lazy-loaded) */
  engineInstances: Map<GraphEngineType, any | null>;
  
  /** Current graph data shared across engines */
  currentGraph: any | null;
  
  /** Transition state */
  isTransitioning: boolean;
  transitionProgress: number;
  
  /** Engine loading states */
  engineLoadingStates: Map<GraphEngineType, 'idle' | 'loading' | 'loaded' | 'error'>;
  
  /** Engine error states */
  engineErrors: Map<GraphEngineType, string | null>;
  
  /** Settings */
  settings: GraphEngineSettings;
}

/**
 * Graph engine actions interface
 */
export interface GraphEngineActions {
  /** Switch to a different graph engine */
  switchEngine: (
    engineType: GraphEngineType, 
    options?: GraphEngineTransitionOptions
  ) => Promise<void>;
  
  /** Get engine capabilities */
  getEngineCapabilities: (engineType: GraphEngineType) => GraphEngineCapabilities | null;
  
  /** Get current engine instance */
  getCurrentEngine: () => any | null;
  
  /** Load graph data into all engines */
  loadGraph: (graph: any) => Promise<void>;
  
  /** Update engine configuration */
  updateEngineConfig: (
    engineType: GraphEngineType, 
    config: Partial<any>
  ) => void;
  
  /** Update settings */
  updateSettings: (settings: Partial<GraphEngineSettings>) => void;
  
  /** Reset to default settings */
  resetSettings: () => void;
  
  /** Handle engine errors */
  handleEngineError: (engineType: GraphEngineType, error: string) => void;
  
  /** Clear engine errors */
  clearEngineError: (engineType: GraphEngineType) => void;
  
  /** Preload engine for faster switching */
  preloadEngine: (engineType: GraphEngineType) => Promise<void>;
  
  /** Dispose of unused engines to free memory */
  disposeUnusedEngines: () => void;
}

/**
 * Combined graph engine context value
 */
export type GraphEngineContextValue = GraphEngineState & GraphEngineActions;

/**
 * Graph engine provider props
 */
export interface GraphEngineProviderProps {
  children: React.ReactNode;
  /** Custom engine capabilities to override defaults */
  customEngines?: Partial<Record<GraphEngineType, GraphEngineCapabilities>>;
  /** Whether to automatically preload the default engine */
  preloadDefault?: boolean;
}