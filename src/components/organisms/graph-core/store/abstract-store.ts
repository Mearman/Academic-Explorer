/**
 * Abstract Graph Data Store Interface
 * 
 * Provides a generic interface for graph data stores that is completely
 * decoupled from specific entity types or data structures. This interface
 * enables building reusable graph components that work with any vertex/edge
 * data structure.
 * 
 * Design Principles:
 * - Zero coupling to OpenAlex entities or specific data types
 * - Generic vertex and edge types via TypeScript generics
 * - Observable pattern for reactive UI updates
 * - Pluggable filtering strategies
 * - Clean separation of concerns
 */

/**
 * Basic vertex interface that all vertices must implement
 */
export interface GraphVertex {
  /** Unique identifier for the vertex */
  id: string;
  
  /** Display name for the vertex */
  displayName: string;
}

/**
 * Basic edge interface that all edges must implement
 */
export interface GraphEdge {
  /** Unique identifier for the edge */
  id: string;
  
  /** Source vertex ID */
  sourceId: string;
  
  /** Target vertex ID */
  targetId: string;
  
  /** Weight/strength of the relationship (0-1) */
  weight: number;
}

/**
 * Graph layout configuration interface
 */
export interface GraphLayoutOptions {
  /** Layout algorithm to use */
  algorithm: 'force-directed' | 'hierarchical' | 'circular' | 'grid';
  
  /** Maximum number of vertices to display */
  maxVertices?: number;
  
  /** Minimum edge weight to display */
  minEdgeWeight?: number;
  
  /** Additional layout-specific options */
  [key: string]: unknown;
}

/**
 * Graph filter function type - returns true if vertex should be included
 */
export type VertexFilterFn<TVertex extends GraphVertex> = (vertex: TVertex) => boolean;

/**
 * Graph filter function type - returns true if edge should be included
 */
export type EdgeFilterFn<TVertex extends GraphVertex, TEdge extends GraphEdge> = (edge: TEdge, sourceVertex: TVertex, targetVertex: TVertex) => boolean;

/**
 * Combined filter strategy interface
 */
export interface GraphFilterStrategy<TVertex extends GraphVertex, TEdge extends GraphEdge> {
  /** Name/identifier for this filter strategy */
  name: string;
  
  /** Vertex filter function */
  vertexFilter?: VertexFilterFn<TVertex>;
  
  /** Edge filter function */
  edgeFilter?: EdgeFilterFn<TVertex, TEdge>;
  
  /** Optional description */
  description?: string;
}

/**
 * Graph store state interface
 */
export interface GraphStoreState<TVertex extends GraphVertex, TEdge extends GraphEdge> {
  /** Loading state */
  isLoading: boolean;
  
  /** Hydration state */
  isHydrated: boolean;
  
  /** Selected vertex ID */
  selectedVertexId: string | null;
  
  /** Hovered vertex ID */
  hoveredVertexId: string | null;
  
  /** Current layout configuration */
  layoutOptions: GraphLayoutOptions;
  
  /** Active filter strategies */
  activeFilters: GraphFilterStrategy<TVertex, TEdge>[];
  
  /** View state */
  isVisible: boolean;
  
  /** Fullscreen state */
  isFullscreen: boolean;
}

/**
 * Graph statistics interface
 */
export interface GraphStatistics<TVertex extends GraphVertex, _TEdge extends GraphEdge> {
  /** Total vertices */
  totalVertices: number;
  
  /** Total edges */
  totalEdges: number;
  
  /** Filtered vertices count */
  filteredVertices: number;
  
  /** Filtered edges count */
  filteredEdges: number;
  
  /** Most connected vertices */
  mostConnectedVertices: Array<{
    vertex: TVertex;
    degree: number;
  }>;
  
  /** Additional statistics */
  [key: string]: unknown;
}

/**
 * Graph traversal result interface
 */
export interface GraphTraversalResult<TVertex extends GraphVertex, TEdge extends GraphEdge> {
  /** The target vertex */
  vertex: TVertex;
  
  /** Path from source to target */
  path: TVertex[];
  
  /** Edges used in the path */
  edges: TEdge[];
  
  /** Total distance (number of hops) */
  distance: number;
  
  /** Aggregate path weight */
  pathWeight: number;
}

/**
 * Store update event types
 */
export enum GraphStoreEventType {
  /** Data changed (vertices/edges added/removed/modified) */
  DATA_CHANGED = 'data_changed',
  
  /** Selection changed */
  SELECTION_CHANGED = 'selection_changed',
  
  /** Hover state changed */
  HOVER_CHANGED = 'hover_changed',
  
  /** Filters changed */
  FILTERS_CHANGED = 'filters_changed',
  
  /** Layout options changed */
  LAYOUT_CHANGED = 'layout_changed',
  
  /** View state changed */
  VIEW_CHANGED = 'view_changed',
  
  /** Loading state changed */
  LOADING_CHANGED = 'loading_changed',
}

/**
 * Store update event interface
 */
export interface GraphStoreEvent<TVertex extends GraphVertex, TEdge extends GraphEdge> {
  /** Event type */
  type: GraphStoreEventType;
  
  /** Event payload (varies by type) */
  payload: {
    /** Previous state (for comparison) */
    previousState?: Partial<GraphStoreState<TVertex, TEdge>>;
    
    /** Current state */
    currentState: GraphStoreState<TVertex, TEdge>;
    
    /** Additional event-specific data */
    [key: string]: unknown;
  };
  
  /** Event timestamp */
  timestamp: Date;
}

/**
 * Event listener function type
 */
export type GraphStoreEventListener<TVertex extends GraphVertex, TEdge extends GraphEdge> = 
  (event: GraphStoreEvent<TVertex, TEdge>) => void;

/**
 * Abstract graph data store interface
 * 
 * This interface defines the contract for any graph data store implementation.
 * It's completely generic and can work with any vertex/edge data structures
 * that implement the basic GraphVertex and GraphEdge interfaces.
 */
export interface GraphDataStore<TVertex extends GraphVertex, TEdge extends GraphEdge> {
  // === State Access ===
  
  /** Get current store state */
  getState(): GraphStoreState<TVertex, TEdge>;
  
  /** Get all vertices (unfiltered) */
  getAllVertices(): TVertex[];
  
  /** Get all edges (unfiltered) */
  getAllEdges(): TEdge[];
  
  /** Get filtered vertices based on current filters */
  getFilteredVertices(): TVertex[];
  
  /** Get filtered edges based on current filters */
  getFilteredEdges(): TEdge[];
  
  /** Get vertex by ID */
  getVertex(id: string): TVertex | undefined;
  
  /** Get edge by ID */
  getEdge(id: string): TEdge | undefined;
  
  /** Check if vertex exists */
  hasVertex(id: string): boolean;
  
  /** Check if edge exists */
  hasEdge(id: string): boolean;
  
  // === Data Manipulation ===
  
  /** Add or update vertex */
  setVertex(vertex: TVertex): void;
  
  /** Add or update edge */
  setEdge(edge: TEdge): void;
  
  /** Remove vertex (and connected edges) */
  removeVertex(id: string): void;
  
  /** Remove edge */
  removeEdge(id: string): void;
  
  /** Clear all data */
  clearAll(): void;
  
  // === Selection and Interaction ===
  
  /** Get currently selected vertex */
  getSelectedVertex(): TVertex | undefined;
  
  /** Set selected vertex */
  selectVertex(id: string | null): void;
  
  /** Get currently hovered vertex */
  getHoveredVertex(): TVertex | undefined;
  
  /** Set hovered vertex */
  hoverVertex(id: string | null): void;
  
  // === Filtering ===
  
  /** Get active filters */
  getActiveFilters(): GraphFilterStrategy<TVertex, TEdge>[];
  
  /** Add filter strategy */
  addFilter(filter: GraphFilterStrategy<TVertex, TEdge>): void;
  
  /** Remove filter strategy by name */
  removeFilter(filterName: string): void;
  
  /** Clear all filters */
  clearFilters(): void;
  
  /** Apply custom vertex filter */
  filterVertices(predicate: VertexFilterFn<TVertex>): TVertex[];
  
  /** Apply custom edge filter */
  filterEdges(predicate: EdgeFilterFn<TVertex, TEdge>): TEdge[];
  
  // === Graph Analysis ===
  
  /** Get neighbors of a vertex */
  getNeighbors(vertexId: string, hops?: number): TVertex[];
  
  /** Get vertex degree (number of connections) */
  getVertexDegree(vertexId: string): number;
  
  /** Find shortest path between two vertices */
  findShortestPath(sourceId: string, targetId: string): GraphTraversalResult<TVertex, TEdge> | null;
  
  /** Get graph statistics */
  getStatistics(): GraphStatistics<TVertex, TEdge>;
  
  // === Layout and Visualization ===
  
  /** Get current layout options */
  getLayoutOptions(): GraphLayoutOptions;
  
  /** Update layout options */
  setLayoutOptions(options: Partial<GraphLayoutOptions>): void;
  
  // === View State ===
  
  /** Get visibility state */
  isVisible(): boolean;
  
  /** Set visibility state */
  setVisible(visible: boolean): void;
  
  /** Get fullscreen state */
  isFullscreen(): boolean;
  
  /** Set fullscreen state */
  setFullscreen(fullscreen: boolean): void;
  
  // === Loading State ===
  
  /** Get loading state */
  isLoading(): boolean;
  
  /** Get hydration state */
  isHydrated(): boolean;
  
  // === Observable Pattern ===
  
  /** Subscribe to store events */
  subscribe(listener: GraphStoreEventListener<TVertex, TEdge>): () => void;
  
  /** Subscribe to specific event types */
  subscribeToEvent(
    eventType: GraphStoreEventType, 
    listener: GraphStoreEventListener<TVertex, TEdge>
  ): () => void;
  
  /** Emit store event (for implementations) */
  emit(event: GraphStoreEvent<TVertex, TEdge>): void;
  
  // === Lifecycle ===
  
  /** Initialize/hydrate the store */
  initialize(): Promise<void>;
  
  /** Dispose/cleanup the store */
  dispose(): void;
}

/**
 * Utility functions for creating filter strategies
 */
export class GraphFilterUtils {
  /**
   * Create a vertex filter by property value
   */
  static createVertexPropertyFilter<TVertex extends GraphVertex, TValue>(
    propertyKey: keyof TVertex,
    value: TValue,
    name: string = `${String(propertyKey)}=${value}`
  ): GraphFilterStrategy<TVertex, GraphEdge> {
    return {
      name,
      vertexFilter: (vertex: TVertex) => vertex[propertyKey] === value,
      description: `Filter vertices where ${String(propertyKey)} equals ${value}`
    };
  }
  
  /**
   * Create a vertex filter by predicate function
   */
  static createVertexPredicateFilter<TVertex extends GraphVertex>(
    predicate: VertexFilterFn<TVertex>,
    name: string,
    description?: string
  ): GraphFilterStrategy<TVertex, GraphEdge> {
    return {
      name,
      vertexFilter: predicate,
      description
    };
  }
  
  /**
   * Create an edge filter by weight threshold
   */
  static createEdgeWeightFilter<TVertex extends GraphVertex, TEdge extends GraphEdge>(
    minWeight: number,
    name: string = `minWeight=${minWeight}`
  ): GraphFilterStrategy<TVertex, TEdge> {
    return {
      name,
      edgeFilter: (edge: TEdge) => edge.weight >= minWeight,
      description: `Filter edges with weight >= ${minWeight}`
    };
  }
  
  /**
   * Combine multiple filters with AND logic
   */
  static combineFilters<TVertex extends GraphVertex, TEdge extends GraphEdge>(
    filters: GraphFilterStrategy<TVertex, TEdge>[],
    name: string
  ): GraphFilterStrategy<TVertex, TEdge> {
    const vertexFilters = filters.map(f => f.vertexFilter).filter(Boolean);
    const edgeFilters = filters.map(f => f.edgeFilter).filter(Boolean);
    
    return {
      name,
      vertexFilter: vertexFilters.length > 0 
        ? (vertex: TVertex) => vertexFilters.every(filter => filter!(vertex))
        : undefined,
      edgeFilter: edgeFilters.length > 0
        ? (edge: TEdge, source: TVertex, target: TVertex) => 
            edgeFilters.every(filter => filter!(edge, source, target))
        : undefined,
      description: `Combined filter: ${filters.map(f => f.name).join(' AND ')}`
    };
  }
}