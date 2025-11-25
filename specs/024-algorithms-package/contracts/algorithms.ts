/**
 * API Contracts: Algorithms Package
 *
 * TypeScript interface definitions for graph algorithms package.
 * These contracts define the public API that consumers will use.
 *
 * @packageDocumentation
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Result type for operations that can fail.
 * Discriminated union with `ok` field for pattern matching.
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Option type for optional values.
 * Discriminated union with `some` field for pattern matching.
 */
export type Option<T> =
  | { some: true; value: T }
  | { some: false };

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base error type for all graph operations.
 * Discriminated union with `type` field for pattern matching.
 */
export type GraphError =
  | InvalidInputError
  | InvalidWeightError
  | NegativeWeightError
  | CycleDetectedError
  | DuplicateNodeError;

export type InvalidInputError = {
  type: 'invalid-input';
  message: string;
  input?: unknown;
};

export type InvalidWeightError = {
  type: 'invalid-weight';
  message: string;
  weight: unknown;
  edgeId: string;
};

export type NegativeWeightError = {
  type: 'negative-weight';
  message: string;
  weight: number;
  edgeId: string;
};

export type CycleDetectedError = {
  type: 'cycle-detected';
  message: string;
  cyclePath: string[];
};

export type DuplicateNodeError = {
  type: 'duplicate-node';
  message: string;
  nodeId: string;
};

// ============================================================================
// Graph Entities
// ============================================================================

/**
 * Node interface with required discriminator field.
 * Generic parameter N must extend this base interface.
 */
export interface Node {
  id: string;
  type: string;
  [key: string]: unknown;
}

/**
 * Edge interface with required fields for graph connectivity.
 * Generic parameter E must extend this base interface.
 */
export interface Edge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: number;
  [key: string]: unknown;
}

/**
 * Graph data structure interface.
 * Supports both directed and undirected graphs.
 *
 * @typeParam N - Node type (must extend Node interface)
 * @typeParam E - Edge type (must extend Edge interface)
 */
export interface Graph<
  N extends Node,
  E extends Edge
> {
  /**
   * Add a node to the graph.
   * @param node - Node to add
   * @returns Ok(void) if successful, Err(DuplicateNodeError) if node ID already exists
   */
  addNode(node: N): Result<void, DuplicateNodeError>;

  /**
   * Remove a node from the graph (and all incident edges).
   * @param id - Node ID to remove
   * @returns Ok(void) if successful, Err(InvalidInputError) if node not found
   */
  removeNode(id: string): Result<void, InvalidInputError>;

  /**
   * Check if node exists in graph.
   * @param id - Node ID to check
   * @returns true if node exists, false otherwise
   */
  hasNode(id: string): boolean;

  /**
   * Get node by ID.
   * @param id - Node ID to retrieve
   * @returns Some(node) if found, None if not found
   */
  getNode(id: string): Option<N>;

  /**
   * Add an edge to the graph.
   * @param edge - Edge to add
   * @returns Ok(void) if successful, Err(InvalidInputError) if source/target nodes don't exist
   */
  addEdge(edge: E): Result<void, InvalidInputError>;

  /**
   * Remove an edge from the graph.
   * @param id - Edge ID to remove
   * @returns Ok(void) if successful, Err(InvalidInputError) if edge not found
   */
  removeEdge(id: string): Result<void, InvalidInputError>;

  /**
   * Get neighbor node IDs for a given node.
   * @param id - Node ID to get neighbors for
   * @returns Ok(neighbor IDs) if successful, Err(InvalidInputError) if node not found
   */
  getNeighbors(id: string): Result<string[], InvalidInputError>;

  /**
   * Get total number of nodes in graph.
   * @returns Node count
   */
  getNodeCount(): number;

  /**
   * Get total number of edges in graph.
   * @returns Edge count
   */
  getEdgeCount(): number;

  /**
   * Check if graph is directed.
   * @returns true if directed, false if undirected
   */
  isDirected(): boolean;
}

// ============================================================================
// Algorithm Result Types
// ============================================================================

/**
 * Result from graph traversal algorithms (DFS, BFS).
 *
 * @typeParam N - Node type
 */
export interface TraversalResult<N extends Node> {
  /** Nodes in visit order */
  visitOrder: N[];

  /** Parent relationships (node ID → parent ID, null for root) */
  parents: Map<string, string | null>;

  /** Discovery times (DFS only, undefined for BFS) */
  discovered?: Map<string, number>;

  /** Finish times (DFS only, undefined for BFS) */
  finished?: Map<string, number>;
}

/**
 * Path from source to destination node.
 *
 * @typeParam N - Node type
 * @typeParam E - Edge type
 */
export interface Path<N extends Node, E extends Edge> {
  /** Nodes in path order (source to destination) */
  nodes: N[];

  /** Edges connecting nodes in path */
  edges: E[];

  /** Sum of edge weights */
  totalWeight: number;
}

/**
 * Connected component of nodes.
 *
 * @typeParam N - Node type
 */
export interface Component<N extends Node> {
  /** Component identifier (0-indexed) */
  id: number;

  /** Nodes in this component */
  nodes: N[];

  /** Number of nodes in component */
  size: number;
}

/**
 * Information about cycle detection.
 */
export interface CycleInfo {
  /** Whether graph contains at least one cycle */
  hasCycle: boolean;

  /** Node IDs forming a cycle (if found) */
  cyclePath?: string[];
}

// ============================================================================
// Traversal Algorithms
// ============================================================================

/**
 * Depth-first search traversal.
 *
 * Visits all reachable nodes from start node in depth-first order.
 * Time complexity: O(V + E)
 * Space complexity: O(V)
 *
 * @typeParam N - Node type
 * @typeParam E - Edge type
 * @param graph - Graph to traverse
 * @param startId - ID of starting node
 * @returns Ok(TraversalResult) if successful, Err(GraphError) if validation fails
 *
 * @example
 * ```typescript
 * const result = dfs(graph, 'node1');
 * if (result.ok) {
 *   console.log('Visited nodes:', result.value.visitOrder);
 * } else {
 *   console.error('Error:', result.error.message);
 * }
 * ```
 */
export function dfs<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  startId: string
): Result<TraversalResult<N>, GraphError>;

/**
 * Breadth-first search traversal.
 *
 * Visits all reachable nodes from start node in breadth-first order.
 * Time complexity: O(V + E)
 * Space complexity: O(V)
 *
 * @typeParam N - Node type
 * @typeParam E - Edge type
 * @param graph - Graph to traverse
 * @param startId - ID of starting node
 * @returns Ok(TraversalResult) if successful, Err(GraphError) if validation fails
 *
 * @example
 * ```typescript
 * const result = bfs(graph, 'node1');
 * if (result.ok) {
 *   console.log('Level-order traversal:', result.value.visitOrder);
 * } else {
 *   console.error('Error:', result.error.message);
 * }
 * ```
 */
export function bfs<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  startId: string
): Result<TraversalResult<N>, GraphError>;

// ============================================================================
// Pathfinding Algorithms
// ============================================================================

/**
 * Dijkstra's shortest path algorithm.
 *
 * Finds shortest weighted path from source to target node.
 * Requires non-negative edge weights.
 * Time complexity: O((V + E) log V) with binary heap
 * Space complexity: O(V)
 *
 * @typeParam N - Node type
 * @typeParam E - Edge type
 * @param graph - Graph to search
 * @param sourceId - ID of source node
 * @param targetId - ID of target node
 * @returns Ok(Some(Path)) if path found, Ok(None) if no path exists, Err(GraphError) if validation fails
 *
 * @example
 * ```typescript
 * const result = dijkstra(graph, 'A', 'Z');
 * if (result.ok) {
 *   if (result.value.some) {
 *     const path = result.value.value;
 *     console.log('Path length:', path.totalWeight);
 *     console.log('Path:', path.nodes.map(n => n.id).join(' -> '));
 *   } else {
 *     console.log('No path exists');
 *   }
 * } else {
 *   console.error('Error:', result.error.message);
 * }
 * ```
 */
export function dijkstra<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  sourceId: string,
  targetId: string
): Result<Option<Path<N, E>>, GraphError>;

// ============================================================================
// Graph Analysis Algorithms
// ============================================================================

/**
 * Topological sort of directed acyclic graph (DAG).
 *
 * Returns linear ordering where all edges point forward.
 * Only valid for acyclic graphs.
 * Time complexity: O(V + E)
 * Space complexity: O(V)
 *
 * @typeParam N - Node type
 * @typeParam E - Edge type
 * @param graph - Directed graph to sort
 * @returns Ok(sorted nodes) if successful, Err(CycleDetectedError) if graph has cycle, Err(GraphError) for other errors
 *
 * @example
 * ```typescript
 * const result = topologicalSort(graph);
 * if (result.ok) {
 *   console.log('Topological order:', result.value.map(n => n.id));
 * } else if (result.error.type === 'cycle-detected') {
 *   console.error('Graph has cycle:', result.error.cyclePath);
 * }
 * ```
 */
export function topologicalSort<N extends Node, E extends Edge>(
  graph: Graph<N, E>
): Result<N[], CycleDetectedError | GraphError>;

/**
 * Detect cycles in graph.
 *
 * Returns cycle information including presence and path (if found).
 * Time complexity: O(V + E)
 * Space complexity: O(V)
 *
 * @typeParam N - Node type
 * @typeParam E - Edge type
 * @param graph - Graph to check
 * @returns Ok(CycleInfo) if successful, Err(GraphError) if validation fails
 *
 * @example
 * ```typescript
 * const result = detectCycle(graph);
 * if (result.ok) {
 *   if (result.value.hasCycle) {
 *     console.log('Cycle found:', result.value.cyclePath);
 *   } else {
 *     console.log('Graph is acyclic');
 *   }
 * }
 * ```
 */
export function detectCycle<N extends Node, E extends Edge>(
  graph: Graph<N, E>
): Result<CycleInfo, GraphError>;

/**
 * Find connected components in undirected graph.
 *
 * Returns disjoint sets of mutually reachable nodes.
 * Time complexity: O(V + E)
 * Space complexity: O(V)
 *
 * @typeParam N - Node type
 * @typeParam E - Edge type
 * @param graph - Undirected graph to analyze
 * @returns Ok(components) if successful, Err(GraphError) if validation fails
 *
 * @example
 * ```typescript
 * const result = connectedComponents(graph);
 * if (result.ok) {
 *   console.log(`Found ${result.value.length} components`);
 *   result.value.forEach(comp => {
 *     console.log(`Component ${comp.id}: ${comp.size} nodes`);
 *   });
 * }
 * ```
 */
export function connectedComponents<N extends Node, E extends Edge>(
  graph: Graph<N, E>
): Result<Component<N>[], GraphError>;

/**
 * Find strongly connected components (SCC) in directed graph.
 *
 * Returns maximal sets of mutually reachable nodes.
 * Uses Kosaraju's algorithm.
 * Time complexity: O(V + E)
 * Space complexity: O(V)
 *
 * @typeParam N - Node type
 * @typeParam E - Edge type
 * @param graph - Directed graph to analyze
 * @returns Ok(SCCs) if successful, Err(GraphError) if validation fails
 *
 * @example
 * ```typescript
 * const result = stronglyConnectedComponents(graph);
 * if (result.ok) {
 *   console.log(`Found ${result.value.length} SCCs`);
 *   result.value.forEach(scc => {
 *     console.log(`SCC ${scc.id}: ${scc.nodes.map(n => n.id).join(', ')}`);
 *   });
 * }
 * ```
 */
export function stronglyConnectedComponents<N extends Node, E extends Edge>(
  graph: Graph<N, E>
): Result<Component<N>[], GraphError>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create Ok result.
 * @typeParam T - Value type
 * @param value - Success value
 * @returns Result with ok: true
 */
export function Ok<T>(value: T): Result<T, never>;

/**
 * Create Err result.
 * @typeParam E - Error type
 * @param error - Error value
 * @returns Result with ok: false
 */
export function Err<E>(error: E): Result<never, E>;

/**
 * Create Some option.
 * @typeParam T - Value type
 * @param value - Present value
 * @returns Option with some: true
 */
export function Some<T>(value: T): Option<T>;

/**
 * Create None option.
 * @typeParam T - Value type
 * @returns Option with some: false
 */
export function None<T = never>(): Option<T>;
