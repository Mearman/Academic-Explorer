/**
 * Persistent Graph API Contract
 *
 * Defines the interface for the PersistentGraph class that combines
 * an in-memory Graph with IndexedDB persistence.
 *
 * @packageDocumentation
 */

import type { Option } from '@bibgraph/algorithms';
import type { RelationType } from '@bibgraph/types';
import type {
  GraphNodeRecord,
  GraphEdgeRecord,
  GraphNodeInput,
  GraphEdgeInput,
  CompletenessStatus,
  EdgeDirectionFilter,
  NeighborQueryOptions,
  SubgraphResult,
  GraphStatistics,
} from './graph-index-types';

// ============================================================================
// Persistent Graph Interface
// ============================================================================

/**
 * PersistentGraph provides a unified API for graph operations with
 * automatic IndexedDB persistence.
 *
 * Architecture:
 * - In-memory Graph class (from @bibgraph/algorithms) for fast queries
 * - IndexedDB storage (via Dexie) for persistence
 * - Write-through caching: all mutations persist immediately
 * - Lazy hydration: memory graph populated from IndexedDB on first access
 *
 * @example
 * ```typescript
 * const graph = new PersistentGraph();
 * await graph.initialize();
 *
 * // Add nodes and edges
 * await graph.addNode({ id: 'W123', entityType: 'works', label: 'Paper', completeness: 'full' });
 * await graph.addEdge({ source: 'W123', target: 'A456', type: 'AUTHORSHIP', direction: 'outbound' });
 *
 * // Query
 * const neighbors = graph.getNeighbors('W123');
 * const authors = graph.getEdgesFrom('W123', 'AUTHORSHIP');
 * ```
 */
export interface IPersistentGraph {
  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Initialize the persistent graph.
   * Opens IndexedDB connection and prepares for operations.
   * Does NOT hydrate - call hydrate() separately or it will happen lazily.
   */
  initialize(): Promise<void>;

  /**
   * Hydrate the in-memory graph from IndexedDB.
   * Loads all nodes and edges into memory for fast queries.
   * Safe to call multiple times (no-op if already hydrated).
   */
  hydrate(): Promise<void>;

  /**
   * Check if the graph has been hydrated.
   */
  isHydrated(): boolean;

  /**
   * Clear all graph data from both memory and IndexedDB.
   * Use with caution - this is destructive.
   */
  clear(): Promise<void>;

  /**
   * Close the database connection.
   * Call when disposing of the graph instance.
   */
  close(): Promise<void>;

  // ==========================================================================
  // Node Operations
  // ==========================================================================

  /**
   * Add a node to the graph.
   * If node already exists, this is a no-op (use updateNode for changes).
   *
   * @param input - Node data to add
   * @returns Promise that resolves when node is persisted
   */
  addNode(input: GraphNodeInput): Promise<void>;

  /**
   * Get a node by ID.
   * Returns None if node doesn't exist.
   *
   * @param id - OpenAlex ID
   * @returns Option containing the node or None
   */
  getNode(id: string): Option<GraphNodeRecord>;

  /**
   * Check if a node exists in the graph.
   *
   * @param id - OpenAlex ID
   * @returns true if node exists
   */
  hasNode(id: string): boolean;

  /**
   * Update a node's completeness status.
   * Only upgrades are allowed (stub → partial → full).
   *
   * @param id - OpenAlex ID
   * @param status - New completeness status
   * @returns Promise that resolves when update is persisted
   * @throws If node doesn't exist or downgrade attempted
   */
  updateNodeCompleteness(id: string, status: CompletenessStatus): Promise<void>;

  /**
   * Update a node's label.
   * Typically called when upgrading from stub to partial/full.
   *
   * @param id - OpenAlex ID
   * @param label - New display label
   * @returns Promise that resolves when update is persisted
   */
  updateNodeLabel(id: string, label: string): Promise<void>;

  /**
   * Get all nodes in the graph.
   *
   * @returns Array of all nodes
   */
  getAllNodes(): GraphNodeRecord[];

  /**
   * Get nodes filtered by completeness status.
   *
   * @param status - Filter by this completeness status
   * @returns Array of matching nodes
   */
  getNodesByCompleteness(status: CompletenessStatus): GraphNodeRecord[];

  /**
   * Get nodes filtered by entity type.
   *
   * @param entityType - Filter by this entity type
   * @returns Array of matching nodes
   */
  getNodesByType(entityType: string): GraphNodeRecord[];

  // ==========================================================================
  // Edge Operations
  // ==========================================================================

  /**
   * Add an edge to the graph.
   * Automatically creates stub nodes for source/target if they don't exist.
   * If edge already exists (same source, target, type), this is a no-op.
   *
   * @param input - Edge data to add
   * @returns Promise that resolves when edge is persisted
   */
  addEdge(input: GraphEdgeInput): Promise<void>;

  /**
   * Check if an edge exists.
   *
   * @param source - Source node ID
   * @param target - Target node ID
   * @param type - Relationship type
   * @returns true if edge exists
   */
  hasEdge(source: string, target: string, type: RelationType): boolean;

  /**
   * Get edges originating from a node.
   *
   * @param nodeId - Source node ID
   * @param type - Optional filter by relationship type
   * @returns Array of matching edges
   */
  getEdgesFrom(nodeId: string, type?: RelationType): GraphEdgeRecord[];

  /**
   * Get edges pointing to a node.
   *
   * @param nodeId - Target node ID
   * @param type - Optional filter by relationship type
   * @returns Array of matching edges
   */
  getEdgesTo(nodeId: string, type?: RelationType): GraphEdgeRecord[];

  /**
   * Get all edges in the graph.
   *
   * @returns Array of all edges
   */
  getAllEdges(): GraphEdgeRecord[];

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  /**
   * Get neighbor node IDs.
   *
   * @param nodeId - Node to get neighbors for
   * @param options - Query options (direction, types, limit)
   * @returns Array of neighbor node IDs
   */
  getNeighbors(nodeId: string, options?: NeighborQueryOptions): string[];

  /**
   * Extract a subgraph containing specified nodes and their connecting edges.
   *
   * @param nodeIds - Node IDs to include in subgraph
   * @returns Subgraph with nodes and edges
   */
  getSubgraph(nodeIds: string[]): SubgraphResult;

  /**
   * Get the shortest path between two nodes (if exists).
   * Uses BFS for unweighted shortest path.
   *
   * @param fromId - Starting node ID
   * @param toId - Target node ID
   * @returns Array of node IDs in path, or empty array if no path exists
   */
  getShortestPath(fromId: string, toId: string): string[];

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get total node count.
   */
  getNodeCount(): number;

  /**
   * Get total edge count.
   */
  getEdgeCount(): number;

  /**
   * Get detailed graph statistics.
   */
  getStatistics(): GraphStatistics;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Events emitted by PersistentGraph.
 */
export type PersistentGraphEvent =
  | { type: 'initialized' }
  | { type: 'hydrated'; nodeCount: number; edgeCount: number }
  | { type: 'nodeAdded'; node: GraphNodeRecord }
  | { type: 'nodeUpdated'; node: GraphNodeRecord }
  | { type: 'edgeAdded'; edge: GraphEdgeRecord }
  | { type: 'cleared' }
  | { type: 'error'; error: Error };

/**
 * Callback for graph events.
 */
export type PersistentGraphEventHandler = (event: PersistentGraphEvent) => void;

// ============================================================================
// Factory Function Type
// ============================================================================

/**
 * Options for creating a PersistentGraph instance.
 */
export interface PersistentGraphOptions {
  /**
   * Custom database name (defaults to 'bibgraph-graph-index').
   * Useful for testing with isolated databases.
   */
  dbName?: string;

  /**
   * Event handler for graph events.
   */
  onEvent?: PersistentGraphEventHandler;

  /**
   * Whether to auto-hydrate on first query.
   * Defaults to true.
   */
  autoHydrate?: boolean;
}

/**
 * Factory function type for creating PersistentGraph instances.
 */
export type CreatePersistentGraph = (options?: PersistentGraphOptions) => IPersistentGraph;
