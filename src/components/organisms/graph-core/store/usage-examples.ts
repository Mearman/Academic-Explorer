/**
 * Usage Examples for Generic Graph Data Store
 * 
 * This file demonstrates how to use the generic graph store interface
 * and adapter system for building reactive graph components.
 */

import {
  entityGraphAdapter,
  GraphFilterUtils,
  GraphStoreEventType,
  type GraphDataStore,
  type GraphVertex,
  type GraphEdge,
} from './index';

/**
 * Example 1: Basic store operations
 */
export function basicStoreOperations() {
  const store = entityGraphAdapter;
  
  // Get all vertices
  const vertices = store.getAllVertices();
  console.log(`Total vertices: ${vertices.length}`);
  
  // Get filtered data
  const filteredVertices = store.getFilteredVertices();
  const filteredEdges = store.getFilteredEdges();
  console.log(`Filtered: ${filteredVertices.length} vertices, ${filteredEdges.length} edges`);
  
  // Selection operations
  if (vertices.length > 0) {
    store.selectVertex(vertices[0].id);
    const selected = store.getSelectedVertex();
    console.log(`Selected vertex: ${selected?.displayName}`);
  }
  
  // Graph analysis
  const stats = store.getStatistics();
  console.log(`Graph stats:`, stats);
}

/**
 * Example 2: Using filters
 */
export function filteringExample() {
  const store = entityGraphAdapter;
  
  // Create filters using utility functions
  const directlyVisitedFilter = GraphFilterUtils.createVertexPredicateFilter(
    (vertex) => 'directlyVisited' in vertex && vertex.directlyVisited === true,
    'directly-visited',
    'Show only directly visited entities'
  );
  
  const highWeightEdgeFilter = GraphFilterUtils.createEdgeWeightFilter(
    0.7,
    'high-weight-edges'
  );
  
  // Apply filters
  store.addFilter(directlyVisitedFilter);
  store.addFilter(highWeightEdgeFilter);
  
  // Get filtered results
  const filtered = store.getFilteredVertices();
  console.log(`Filtered to ${filtered.length} directly visited vertices`);
  
  // Remove filters
  store.removeFilter('directly-visited');
  store.clearFilters();
}

/**
 * Example 3: Custom filter creation
 */
export function customFilterExample() {
  const store = entityGraphAdapter;
  
  // Custom vertex filter for specific entity types
  const worksOnlyFilter = {
    name: 'works-only',
    vertexFilter: (vertex: GraphVertex) => {
      return 'entityType' in vertex && vertex.entityType === 'works';
    },
    description: 'Show only work entities'
  };
  
  // Custom edge filter for citation relationships
  const citationOnlyFilter = {
    name: 'citations-only',
    edgeFilter: (edge: GraphEdge) => {
      return 'edgeType' in edge && 
             (edge.edgeType === 'cites' || edge.edgeType === 'cited_by');
    },
    description: 'Show only citation relationships'
  };
  
  // Combine filters
  const combinedFilter = GraphFilterUtils.combineFilters(
    [worksOnlyFilter, citationOnlyFilter],
    'works-with-citations'
  );
  
  store.addFilter(combinedFilter);
  
  const filtered = store.getFilteredVertices();
  console.log(`Combined filter result: ${filtered.length} vertices`);
}

/**
 * Example 4: Event handling and reactivity
 */
export function reactiveExample() {
  const store = entityGraphAdapter;
  
  // Subscribe to all events
  const unsubscribe = store.subscribe((event) => {
    console.log(`Graph event: ${event.type}`, event.payload);
  });
  
  // Subscribe to specific event types
  const unsubscribeSelection = store.subscribeToEvent(
    GraphStoreEventType.SELECTION_CHANGED,
    (event) => {
      const vertex = store.getSelectedVertex();
      console.log(`Selection changed to: ${vertex?.displayName || 'none'}`);
      
      // Update UI components here
      updateSelectionUI(vertex);
    }
  );
  
  const unsubscribeFilters = store.subscribeToEvent(
    GraphStoreEventType.FILTERS_CHANGED,
    (event) => {
      console.log('Filters changed, updating visualization...');
      
      // Re-render graph with new filtered data
      const vertices = store.getFilteredVertices();
      const edges = store.getFilteredEdges();
      updateGraphVisualization(vertices, edges);
    }
  );
  
  // Don't forget to cleanup
  return () => {
    unsubscribe();
    unsubscribeSelection();
    unsubscribeFilters();
  };
}

/**
 * Example 5: Graph analysis operations
 */
export function analysisExample() {
  const store = entityGraphAdapter;
  const vertices = store.getAllVertices();
  
  if (vertices.length >= 2) {
    const sourceId = vertices[0].id;
    const targetId = vertices[1].id;
    
    // Find shortest path
    const path = store.findShortestPath(sourceId, targetId);
    if (path) {
      console.log(`Path found: ${path.distance} hops, weight ${path.pathWeight}`);
      console.log(`Path: ${path.path.map(v => v.displayName).join(' -> ')}`);
    }
    
    // Get neighbors
    const neighbors = store.getNeighbors(sourceId, 2); // 2 hops
    console.log(`Neighbors of ${vertices[0].displayName}: ${neighbors.length}`);
    
    // Get vertex degree
    const degree = store.getVertexDegree(sourceId);
    console.log(`Vertex degree: ${degree}`);
  }
}

/**
 * Example 6: Layout and view state management
 */
export function layoutExample() {
  const store = entityGraphAdapter;
  
  // Get current layout options
  const layout = store.getLayoutOptions();
  console.log('Current layout:', layout);
  
  // Update layout options
  store.setLayoutOptions({
    algorithm: 'hierarchical',
    maxVertices: 50,
    minEdgeWeight: 0.3
  });
  
  // View state management
  store.setVisible(true);
  store.setFullscreen(false);
  
  console.log(`Visible: ${store.isVisible()}, Fullscreen: ${store.isFullscreen()}`);
}

/**
 * Example 7: Store lifecycle management
 */
export async function lifecycleExample() {
  const store = entityGraphAdapter;
  
  // Initialize store (loads data if needed)
  await store.initialize();
  console.log(`Store initialized. Hydrated: ${store.isHydrated()}`);
  
  // Use store...
  
  // Cleanup when done
  store.dispose();
  console.log('Store disposed');
}

// Mock UI update functions for the examples
function updateSelectionUI(vertex: GraphVertex | undefined) {
  // Update selection indicators in UI
  console.log('UI: Selection updated');
}

function updateGraphVisualization(vertices: GraphVertex[], edges: GraphEdge[]) {
  // Re-render the graph visualization
  console.log(`UI: Graph updated with ${vertices.length} vertices, ${edges.length} edges`);
}

/**
 * Example 8: Creating a custom graph store adapter
 * 
 * This shows how you could create adapters for other data sources
 */
export class SimpleGraphAdapter implements GraphDataStore<GraphVertex, GraphEdge> {
  private vertices = new Map<string, GraphVertex>();
  private edges = new Map<string, GraphEdge>();
  private state: any = {};
  private listeners = new Set<any>();
  
  // Implement all required methods...
  // This is just a skeleton to show the pattern
  
  getState() { return this.state; }
  getAllVertices() { return Array.from(this.vertices.values()); }
  getAllEdges() { return Array.from(this.edges.values()); }
  // ... implement all other required methods
  
  // This shows how any data source could be adapted to the generic interface
  getFilteredVertices(): GraphVertex[] { throw new Error('Not implemented'); }
  getFilteredEdges(): GraphEdge[] { throw new Error('Not implemented'); }
  getVertex(id: string): GraphVertex | undefined { throw new Error('Not implemented'); }
  getEdge(id: string): GraphEdge | undefined { throw new Error('Not implemented'); }
  hasVertex(id: string): boolean { throw new Error('Not implemented'); }
  hasEdge(id: string): boolean { throw new Error('Not implemented'); }
  setVertex(vertex: GraphVertex): void { throw new Error('Not implemented'); }
  setEdge(edge: GraphEdge): void { throw new Error('Not implemented'); }
  removeVertex(id: string): void { throw new Error('Not implemented'); }
  removeEdge(id: string): void { throw new Error('Not implemented'); }
  clearAll(): void { throw new Error('Not implemented'); }
  getSelectedVertex(): GraphVertex | undefined { throw new Error('Not implemented'); }
  selectVertex(id: string | null): void { throw new Error('Not implemented'); }
  getHoveredVertex(): GraphVertex | undefined { throw new Error('Not implemented'); }
  hoverVertex(id: string | null): void { throw new Error('Not implemented'); }
  getActiveFilters(): any[] { throw new Error('Not implemented'); }
  addFilter(filter: any): void { throw new Error('Not implemented'); }
  removeFilter(filterName: string): void { throw new Error('Not implemented'); }
  clearFilters(): void { throw new Error('Not implemented'); }
  filterVertices(predicate: any): GraphVertex[] { throw new Error('Not implemented'); }
  filterEdges(predicate: any): GraphEdge[] { throw new Error('Not implemented'); }
  getNeighbors(vertexId: string, hops?: number): GraphVertex[] { throw new Error('Not implemented'); }
  getVertexDegree(vertexId: string): number { throw new Error('Not implemented'); }
  findShortestPath(sourceId: string, targetId: string): any { throw new Error('Not implemented'); }
  getStatistics(): any { throw new Error('Not implemented'); }
  getLayoutOptions(): any { throw new Error('Not implemented'); }
  setLayoutOptions(options: any): void { throw new Error('Not implemented'); }
  isVisible(): boolean { throw new Error('Not implemented'); }
  setVisible(visible: boolean): void { throw new Error('Not implemented'); }
  isFullscreen(): boolean { throw new Error('Not implemented'); }
  setFullscreen(fullscreen: boolean): void { throw new Error('Not implemented'); }
  isLoading(): boolean { throw new Error('Not implemented'); }
  isHydrated(): boolean { throw new Error('Not implemented'); }
  subscribe(listener: any): () => void { throw new Error('Not implemented'); }
  subscribeToEvent(eventType: any, listener: any): () => void { throw new Error('Not implemented'); }
  emit(event: any): void { throw new Error('Not implemented'); }
  async initialize(): Promise<void> { throw new Error('Not implemented'); }
  dispose(): void { throw new Error('Not implemented'); }
}