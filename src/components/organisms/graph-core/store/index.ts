/**
 * Graph Core Store
 * 
 * Exports generic graph data store interfaces, adapters, and utilities
 * for building reusable graph components.
 * 
 * ## Usage
 * 
 * ```typescript
 * import { entityGraphAdapter, GraphFilterUtils, GraphStoreEventType } from '@/components/organisms/graph-core/store';
 * 
 * // Use the adapter as a generic store
 * const store = entityGraphAdapter;
 * const vertices = store.getFilteredVertices();
 * const edges = store.getFilteredEdges();
 * 
 * // Create and apply filters
 * const filter = GraphFilterUtils.createVertexPredicateFilter(
 *   (vertex) => vertex.directlyVisited,
 *   'visited-only'
 * );
 * store.addFilter(filter);
 * 
 * // Subscribe to changes
 * store.subscribeToEvent(GraphStoreEventType.SELECTION_CHANGED, (event) => {
 *   // Handle selection changes
 * });
 * ```
 */

// Abstract interfaces and types
export type {
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
  GraphDataStore,
} from './abstract-store';

export {
  GraphStoreEventType,
  GraphFilterUtils,
} from './abstract-store';

// Entity graph adapter implementation
export {
  EntityGraphAdapter,
  entityGraphAdapter,
} from './entity-graph-adapter';

/**
 * Re-export commonly used entity types for convenience
 */
export type {
  EntityGraphVertex,
  EntityGraphEdge,
  EdgeType,
  EntityType,
} from '@/types/entity-graph';