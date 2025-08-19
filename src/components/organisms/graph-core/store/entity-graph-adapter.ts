/**
 * Entity Graph Adapter
 * 
 * Adapter that wraps the existing EntityGraphStore to implement the generic
 * GraphDataStore interface. This provides a clean bridge between the
 * entity-specific store and the generic graph components without requiring
 * any modifications to the existing store.
 * 
 * The adapter handles:
 * - Type mapping between entity types and generic types
 * - Event forwarding and transformation
 * - Filter strategy translation
 * - State synchronization
 */

import { useEntityGraphStore } from '@/stores/entity-graph-store';
import type {
  EntityGraphVertex,
  EntityGraphEdge,
  EntityGraph,
  GraphLayoutConfig,
  GraphFilterOptions,
  GraphStatistics as EntityGraphStatistics,
  GraphTraversalResult as EntityGraphTraversalResult,
  EntityType,
  EdgeType,
} from '@/types/entity-graph';

import type {
  GraphDataStore,
  GraphVertex,
  GraphEdge,
  GraphLayoutOptions,
  GraphFilterStrategy,
  GraphStoreState,
  GraphStoreEvent,
  GraphStoreEventListener,
  GraphStatistics,
  GraphTraversalResult,
  VertexFilterFn,
  EdgeFilterFn,
} from './abstract-store';
import {
  GraphStoreEventType,
} from './abstract-store';



/**
 * Extended vertex interface that maps EntityGraphVertex to GraphVertex
 */
type AdaptedVertex = GraphVertex & EntityGraphVertex;

/**
 * Extended edge interface that maps EntityGraphEdge to GraphEdge
 */
type AdaptedEdge = GraphEdge & EntityGraphEdge;

/**
 * Entity Graph Adapter Implementation
 * 
 * This adapter implements the GraphDataStore interface while delegating
 * all operations to the underlying EntityGraphStore. It provides type
 * safety and event handling without modifying the original store.
 */
export class EntityGraphAdapter implements GraphDataStore<AdaptedVertex, AdaptedEdge> {
  private eventListeners: Set<GraphStoreEventListener<AdaptedVertex, AdaptedEdge>> = new Set();
  private eventTypeListeners: Map<GraphStoreEventType, Set<GraphStoreEventListener<AdaptedVertex, AdaptedEdge>>> = new Map();
  private activeFilters: GraphFilterStrategy<AdaptedVertex, AdaptedEdge>[] = [];
  private unsubscribeStore?: () => void;
  
  constructor() {
    // Subscribe to the underlying store changes
    this.subscribeToStoreChanges();
  }
  
  /**
   * Subscribe to underlying EntityGraphStore changes and emit corresponding events
   */
  private subscribeToStoreChanges(): void {
    let previousState = this.getStoreSnapshot();
    
    this.unsubscribeStore = useEntityGraphStore.subscribe((state) => {
      const currentState = this.mapStoreState(state);
      
      // Detect what changed and emit appropriate events
      if (previousState.selectedVertexId !== currentState.selectedVertexId) {
        this.emitEvent(GraphStoreEventType.SELECTION_CHANGED, {
          previousState: { selectedVertexId: previousState.selectedVertexId },
          currentState
        });
      }
      
      if (previousState.hoveredVertexId !== currentState.hoveredVertexId) {
        this.emitEvent(GraphStoreEventType.HOVER_CHANGED, {
          previousState: { hoveredVertexId: previousState.hoveredVertexId },
          currentState
        });
      }
      
      if (previousState.isLoading !== currentState.isLoading) {
        this.emitEvent(GraphStoreEventType.LOADING_CHANGED, {
          previousState: { isLoading: previousState.isLoading },
          currentState
        });
      }
      
      if (previousState.isVisible !== currentState.isVisible || 
          previousState.isFullscreen !== currentState.isFullscreen) {
        this.emitEvent(GraphStoreEventType.VIEW_CHANGED, {
          previousState: { 
            isVisible: previousState.isVisible, 
            isFullscreen: previousState.isFullscreen 
          },
          currentState
        });
      }
      
      // Always emit data changed event (could be optimized to detect actual data changes)
      this.emitEvent(GraphStoreEventType.DATA_CHANGED, {
        previousState,
        currentState
      });
      
      previousState = currentState;
    });
  }
  
  /**
   * Get a snapshot of the current store state
   */
  private getStoreSnapshot(): GraphStoreState<AdaptedVertex, AdaptedEdge> {
    const state = useEntityGraphStore.getState();
    return this.mapStoreState(state);
  }
  
  /**
   * Map EntityGraphStore state to generic store state
   */
  private mapStoreState(state: ReturnType<typeof useEntityGraphStore.getState>): GraphStoreState<AdaptedVertex, AdaptedEdge> {
    return {
      isLoading: state.isLoading,
      isHydrated: state.isHydrated,
      selectedVertexId: state.selectedVertexId,
      hoveredVertexId: state.hoveredVertexId,
      layoutOptions: this.mapLayoutConfig(state.layoutConfig),
      activeFilters: this.activeFilters,
      isVisible: state.isGraphVisible,
      isFullscreen: state.isFullscreen,
    };
  }
  
  /**
   * Map GraphLayoutConfig to GraphLayoutOptions
   */
  private mapLayoutConfig(config: GraphLayoutConfig): GraphLayoutOptions {
    return {
      algorithm: config.algorithm,
      maxVertices: config.maxVertices,
      minEdgeWeight: config.minEdgeWeight,
      separateVisitedEntities: config.separateVisitedEntities,
      clusterByEntityType: config.clusterByEntityType,
      sizeByVisitCount: config.sizeByVisitCount,
      weightEdgesByStrength: config.weightEdgesByStrength,
    };
  }
  
  /**
   * Map GraphLayoutOptions to GraphLayoutConfig
   */
  private mapToLayoutConfig(options: Partial<GraphLayoutOptions>): Partial<GraphLayoutConfig> {
    return {
      algorithm: options.algorithm,
      maxVertices: options.maxVertices,
      minEdgeWeight: options.minEdgeWeight,
      separateVisitedEntities: options.separateVisitedEntities as boolean,
      clusterByEntityType: options.clusterByEntityType as boolean,
      sizeByVisitCount: options.sizeByVisitCount as boolean,
      weightEdgesByStrength: options.weightEdgesByStrength as boolean,
    };
  }
  
  /**
   * Convert EntityGraphVertex to AdaptedVertex
   */
  private adaptVertex(vertex: EntityGraphVertex): AdaptedVertex {
    return vertex as AdaptedVertex;
  }
  
  /**
   * Convert EntityGraphEdge to AdaptedEdge
   */
  private adaptEdge(edge: EntityGraphEdge): AdaptedEdge {
    return edge as AdaptedEdge;
  }
  
  /**
   * Apply active filters to vertices
   */
  private applyVertexFilters(vertices: AdaptedVertex[]): AdaptedVertex[] {
    return vertices.filter(vertex => {
      return this.activeFilters.every(filter => 
        !filter.vertexFilter || filter.vertexFilter(vertex)
      );
    });
  }
  
  /**
   * Apply active filters to edges
   */
  private applyEdgeFilters(edges: AdaptedEdge[], vertices: AdaptedVertex[]): AdaptedEdge[] {
    const vertexMap = new Map(vertices.map(v => [v.id, v]));
    
    return edges.filter(edge => {
      const sourceVertex = vertexMap.get(edge.sourceId);
      const targetVertex = vertexMap.get(edge.targetId);
      
      if (!sourceVertex || !targetVertex) return false;
      
      return this.activeFilters.every(filter => 
        !filter.edgeFilter || filter.edgeFilter(edge, sourceVertex, targetVertex)
      );
    });
  }
  
  /**
   * Emit an event to all listeners
   */
  private emitEvent(type: GraphStoreEventType, payload: Partial<GraphStoreEvent<AdaptedVertex, AdaptedEdge>['payload']>): void {
    const event: GraphStoreEvent<AdaptedVertex, AdaptedEdge> = {
      type,
      payload: {
        currentState: this.getState(),
        ...payload,
      },
      timestamp: new Date(),
    };
    
    // Emit to general listeners
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in graph store event listener:', error);
      }
    });
    
    // Emit to type-specific listeners
    const typeListeners = this.eventTypeListeners.get(type);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in graph store event listener:', error);
        }
      });
    }
  }
  
  // === Implementation of GraphDataStore interface ===
  
  getState(): GraphStoreState<AdaptedVertex, AdaptedEdge> {
    return this.getStoreSnapshot();
  }
  
  getAllVertices(): AdaptedVertex[] {
    const state = useEntityGraphStore.getState();
    return Array.from(state.graph.vertices.values()).map(v => this.adaptVertex(v));
  }
  
  getAllEdges(): AdaptedEdge[] {
    const state = useEntityGraphStore.getState();
    return Array.from(state.graph.edges.values()).map(e => this.adaptEdge(e));
  }
  
  getFilteredVertices(): AdaptedVertex[] {
    const storeVertices = useEntityGraphStore.getState().getFilteredVertices().map(v => this.adaptVertex(v));
    return this.applyVertexFilters(storeVertices);
  }
  
  getFilteredEdges(): AdaptedEdge[] {
    const storeEdges = useEntityGraphStore.getState().getFilteredEdges().map(e => this.adaptEdge(e));
    const filteredVertices = this.getFilteredVertices();
    return this.applyEdgeFilters(storeEdges, filteredVertices);
  }
  
  getVertex(id: string): AdaptedVertex | undefined {
    const state = useEntityGraphStore.getState();
    const vertex = state.graph.vertices.get(id);
    return vertex ? this.adaptVertex(vertex) : undefined;
  }
  
  getEdge(id: string): AdaptedEdge | undefined {
    const state = useEntityGraphStore.getState();
    const edge = state.graph.edges.get(id);
    return edge ? this.adaptEdge(edge) : undefined;
  }
  
  hasVertex(id: string): boolean {
    return useEntityGraphStore.getState().hasVertex(id);
  }
  
  hasEdge(id: string): boolean {
    const state = useEntityGraphStore.getState();
    return state.graph.edges.has(id);
  }
  
  setVertex(vertex: AdaptedVertex): void {
    // Note: EntityGraphStore doesn't have direct setVertex, but this would be the interface
    console.warn('EntityGraphAdapter: setVertex not implemented in underlying store');
  }
  
  setEdge(edge: AdaptedEdge): void {
    // Note: EntityGraphStore doesn't have direct setEdge, but this would be the interface
    console.warn('EntityGraphAdapter: setEdge not implemented in underlying store');
  }
  
  removeVertex(id: string): void {
    useEntityGraphStore.getState().removeVertex(id);
  }
  
  removeEdge(id: string): void {
    useEntityGraphStore.getState().removeEdge(id);
  }
  
  clearAll(): void {
    useEntityGraphStore.getState().clearGraph();
  }
  
  getSelectedVertex(): AdaptedVertex | undefined {
    const state = useEntityGraphStore.getState();
    const selectedId = state.selectedVertexId;
    return selectedId ? this.getVertex(selectedId) : undefined;
  }
  
  selectVertex(id: string | null): void {
    useEntityGraphStore.getState().selectVertex(id);
  }
  
  getHoveredVertex(): AdaptedVertex | undefined {
    const state = useEntityGraphStore.getState();
    const hoveredId = state.hoveredVertexId;
    return hoveredId ? this.getVertex(hoveredId) : undefined;
  }
  
  hoverVertex(id: string | null): void {
    useEntityGraphStore.getState().hoverVertex(id);
  }
  
  getActiveFilters(): GraphFilterStrategy<AdaptedVertex, AdaptedEdge>[] {
    return [...this.activeFilters];
  }
  
  addFilter(filter: GraphFilterStrategy<AdaptedVertex, AdaptedEdge>): void {
    // Remove existing filter with same name
    this.activeFilters = this.activeFilters.filter(f => f.name !== filter.name);
    this.activeFilters.push(filter);
    
    this.emitEvent(GraphStoreEventType.FILTERS_CHANGED, {
      currentState: this.getState(),
      activeFilters: this.activeFilters
    });
  }
  
  removeFilter(filterName: string): void {
    const originalLength = this.activeFilters.length;
    this.activeFilters = this.activeFilters.filter(f => f.name !== filterName);
    
    if (this.activeFilters.length !== originalLength) {
      this.emitEvent(GraphStoreEventType.FILTERS_CHANGED, {
        currentState: this.getState(),
        activeFilters: this.activeFilters
      });
    }
  }
  
  clearFilters(): void {
    if (this.activeFilters.length > 0) {
      this.activeFilters = [];
      this.emitEvent(GraphStoreEventType.FILTERS_CHANGED, {
        currentState: this.getState(),
        activeFilters: this.activeFilters
      });
    }
  }
  
  filterVertices(predicate: VertexFilterFn<AdaptedVertex>): AdaptedVertex[] {
    return this.getAllVertices().filter(predicate);
  }
  
  filterEdges(predicate: EdgeFilterFn<AdaptedVertex, AdaptedEdge>): AdaptedEdge[] {
    const vertices = this.getAllVertices();
    const vertexMap = new Map(vertices.map(v => [v.id, v]));
    
    return this.getAllEdges().filter(edge => {
      const sourceVertex = vertexMap.get(edge.sourceId);
      const targetVertex = vertexMap.get(edge.targetId);
      return sourceVertex && targetVertex && predicate(edge, sourceVertex, targetVertex);
    });
  }
  
  getNeighbors(vertexId: string, hops = 1): AdaptedVertex[] {
    const neighbors = useEntityGraphStore.getState().getNeighbors(vertexId, hops);
    return neighbors.map(v => this.adaptVertex(v));
  }
  
  getVertexDegree(vertexId: string): number {
    return useEntityGraphStore.getState().getVertexDegree(vertexId);
  }
  
  findShortestPath(sourceId: string, targetId: string): GraphTraversalResult<AdaptedVertex, AdaptedEdge> | null {
    const result = useEntityGraphStore.getState().findShortestPath(sourceId, targetId);
    if (!result) return null;
    
    // Map the result to generic types
    const edges: AdaptedEdge[] = [];
    for (let i = 0; i < result.path.length - 1; i++) {
      const state = useEntityGraphStore.getState();
      const sourceVertexId = result.path[i].id;
      const targetVertexId = result.path[i + 1].id;
      
      // Find edge between consecutive vertices in path
      const outgoingEdges = state.graph.edgesBySource.get(sourceVertexId) || new Set();
      for (const edgeId of outgoingEdges) {
        const edge = state.graph.edges.get(edgeId);
        if (edge && edge.targetId === targetVertexId) {
          edges.push(this.adaptEdge(edge));
          break;
        }
      }
    }
    
    return {
      vertex: this.adaptVertex(result.vertex),
      path: result.path.map(v => this.adaptVertex(v)),
      edges,
      distance: result.distance,
      pathWeight: result.pathWeight,
    };
  }
  
  getStatistics(): GraphStatistics<AdaptedVertex, AdaptedEdge> {
    const entityStats = useEntityGraphStore.getState().getGraphStatistics();
    const filteredVertices = this.getFilteredVertices();
    const filteredEdges = this.getFilteredEdges();
    
    return {
      totalVertices: entityStats.totalVertices,
      totalEdges: entityStats.totalEdges,
      filteredVertices: filteredVertices.length,
      filteredEdges: filteredEdges.length,
      mostConnectedVertices: entityStats.mostConnectedVertices.map(item => ({
        vertex: this.adaptVertex(useEntityGraphStore.getState().graph.vertices.get(item.vertexId)!),
        degree: item.degree,
      })),
      // Include entity-specific statistics
      directlyVisitedCount: entityStats.directlyVisitedCount,
      entityTypeDistribution: entityStats.entityTypeDistribution,
      edgeTypeDistribution: entityStats.edgeTypeDistribution,
      mostVisitedEntities: entityStats.mostVisitedEntities,
      recentActivity: entityStats.recentActivity,
      connectedComponents: entityStats.connectedComponents,
      clusteringCoefficient: entityStats.clusteringCoefficient,
    };
  }
  
  getLayoutOptions(): GraphLayoutOptions {
    const state = useEntityGraphStore.getState();
    return this.mapLayoutConfig(state.layoutConfig);
  }
  
  setLayoutOptions(options: Partial<GraphLayoutOptions>): void {
    const mappedConfig = this.mapToLayoutConfig(options);
    useEntityGraphStore.getState().updateLayout(mappedConfig);
    
    this.emitEvent(GraphStoreEventType.LAYOUT_CHANGED, {
      currentState: this.getState(),
      layoutOptions: options
    });
  }
  
  isVisible(): boolean {
    return useEntityGraphStore.getState().isGraphVisible;
  }
  
  setVisible(visible: boolean): void {
    const state = useEntityGraphStore.getState();
    if (state.isGraphVisible !== visible) {
      state.toggleGraphVisibility();
    }
  }
  
  isFullscreen(): boolean {
    return useEntityGraphStore.getState().isFullscreen;
  }
  
  setFullscreen(fullscreen: boolean): void {
    const state = useEntityGraphStore.getState();
    if (state.isFullscreen !== fullscreen) {
      state.toggleFullscreen();
    }
  }
  
  isLoading(): boolean {
    return useEntityGraphStore.getState().isLoading;
  }
  
  isHydrated(): boolean {
    return useEntityGraphStore.getState().isHydrated;
  }
  
  subscribe(listener: GraphStoreEventListener<AdaptedVertex, AdaptedEdge>): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }
  
  subscribeToEvent(
    eventType: GraphStoreEventType, 
    listener: GraphStoreEventListener<AdaptedVertex, AdaptedEdge>
  ): () => void {
    if (!this.eventTypeListeners.has(eventType)) {
      this.eventTypeListeners.set(eventType, new Set());
    }
    
    const listeners = this.eventTypeListeners.get(eventType)!;
    listeners.add(listener);
    
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventTypeListeners.delete(eventType);
      }
    };
  }
  
  emit(event: GraphStoreEvent<AdaptedVertex, AdaptedEdge>): void {
    this.emitEvent(event.type, event.payload);
  }
  
  async initialize(): Promise<void> {
    const state = useEntityGraphStore.getState();
    if (!state.isHydrated) {
      await state.hydrateFromIndexedDB();
    }
  }
  
  dispose(): void {
    // Clean up subscriptions
    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = undefined;
    }
    
    // Clear event listeners
    this.eventListeners.clear();
    this.eventTypeListeners.clear();
    this.activeFilters = [];
  }
}

/**
 * Singleton instance for use throughout the application
 */
export const entityGraphAdapter = new EntityGraphAdapter();