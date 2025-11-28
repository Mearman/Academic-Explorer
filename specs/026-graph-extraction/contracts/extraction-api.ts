/**
 * Graph Extraction API Contract
 *
 * Feature: 026-graph-extraction
 * Package: @bibgraph/algorithms
 * Module: packages/algorithms/src/extraction/
 *
 * This file defines the TypeScript function signatures for all graph extraction
 * operations. These signatures serve as the contract between feature specification
 * and implementation.
 */

import type { Graph } from '../graph/graph';
import type { Node, Edge } from '../types/graph';
import type { Result } from '../types/result';

// ============================================================================
// Error Types
// ============================================================================

export type ExtractionError =
  | InvalidInputError
  | InvalidRadiusError
  | InvalidKError
  | EmptyResultWarning
  | GraphTooLargeError;

export interface InvalidInputError {
  type: 'invalid-input';
  message: string;
  input?: unknown;
}

export interface InvalidRadiusError {
  type: 'invalid-radius';
  message: string;
  radius: number;
}

export interface InvalidKError {
  type: 'invalid-k';
  message: string;
  k: number;
}

export interface EmptyResultWarning {
  type: 'empty-result';
  message: string;
  context: string;
}

export interface GraphTooLargeError {
  type: 'graph-too-large';
  message: string;
  nodeCount: number;
  limit: number;
}

// ============================================================================
// User Story 1: Ego Network Extraction
// ============================================================================

/**
 * Options for ego network extraction.
 */
export interface EgoNetworkOptions {
  /**
   * Seed node ID(s) to center ego network around.
   * Single seed or multiple seeds for multi-source ego network.
   */
  seeds: string | string[];

  /**
   * Maximum hop distance from seed node(s).
   * - radius=1: immediate neighbors
   * - radius=2: neighbors of neighbors
   * - radius=k: all nodes within k hops
   */
  radius: number;

  /**
   * Whether to include edges between nodes in the ego network.
   * Default: true (induced subgraph)
   */
  includeInternalEdges?: boolean;
}

/**
 * Extract radius-k ego network from a graph.
 *
 * Returns all nodes within k hops of seed node(s) and edges between them.
 * For multiple seeds, returns the union of individual ego networks.
 *
 * Time Complexity: O(V + E) for full graph, typically much better for small k
 * Space Complexity: O(V) for distance tracking
 *
 * @param graph - The graph to extract from
 * @param options - Ego network configuration
 * @returns Result containing ego network subgraph or error
 *
 * @example
 * ```typescript
 * const result = extractEgoNetwork(graph, {
 *   seeds: 'W1',
 *   radius: 2
 * });
 *
 * if (result.ok) {
 *   console.log('Ego network size:', result.value.getNodeCount());
 * }
 * ```
 */
export function extractEgoNetwork<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  options: EgoNetworkOptions
): Result<Graph<N, E>, ExtractionError>;

/**
 * Extract multi-source ego network (convenience wrapper).
 *
 * @param graph - The graph to extract from
 * @param seeds - Array of seed node IDs
 * @param radius - Maximum hop distance
 * @returns Result containing union of ego networks or error
 */
export function extractMultiSourceEgoNetwork<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  seeds: string[],
  radius: number
): Result<Graph<N, E>, ExtractionError>;

// ============================================================================
// User Story 2: Attribute-Based Filtering
// ============================================================================

/**
 * Predicate function for filtering nodes by attributes.
 */
export type NodePredicate<N extends Node> = (node: N) => boolean;

/**
 * Predicate function for filtering edges by attributes.
 */
export type EdgePredicate<E extends Edge> = (edge: E) => boolean;

/**
 * Filter specification for extracting subgraphs by attributes.
 */
export interface SubgraphFilter<N extends Node, E extends Edge> {
  /**
   * Predicate to filter nodes by attributes.
   * Returns true if node should be included in subgraph.
   */
  nodeFilter?: NodePredicate<N>;

  /**
   * Predicate to filter edges by attributes.
   * Returns true if edge should be included in subgraph.
   */
  edgeFilter?: EdgePredicate<E>;

  /**
   * How to combine node and edge filters.
   * - 'AND': Include nodes AND edges that pass both filters
   * - 'OR': Include nodes OR edges that pass either filter
   * Default: 'AND'
   */
  combinator?: 'AND' | 'OR';
}

/**
 * Filter graph by node and edge attributes.
 *
 * Applies predicates to filter nodes and edges, then extracts induced subgraph.
 * Edges with missing endpoints are automatically removed.
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V + E) for filtered subgraph
 *
 * @param graph - The graph to filter
 * @param filter - Filter specification with predicates
 * @returns Result containing filtered subgraph or error
 *
 * @example
 * ```typescript
 * const result = filterSubgraph(graph, {
 *   nodeFilter: (node) => node.year >= 2020 && node.citationCount > 10,
 *   edgeFilter: (edge) => edge.type === 'REFERENCE'
 * });
 * ```
 */
export function filterSubgraph<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  filter: SubgraphFilter<N, E>
): Result<Graph<N, E>, ExtractionError>;

/**
 * Extract induced subgraph from explicit node ID set.
 *
 * @param graph - The graph to extract from
 * @param nodeIds - Set of node IDs to include
 * @returns Result containing induced subgraph or error
 */
export function extractInducedSubgraph<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  nodeIds: Set<string>
): Result<Graph<N, E>, ExtractionError>;

// ============================================================================
// User Story 3: Citation Path Analysis
// ============================================================================

/**
 * Result of shortest path search between two nodes.
 */
export interface PathResult<N extends Node, E extends Edge> {
  /** Source node ID (start of path) */
  source: string;

  /** Target node ID (end of path) */
  target: string;

  /**
   * Ordered sequence of node IDs forming the path.
   * Includes source and target.
   * Empty array if no path exists.
   */
  path: string[];

  /**
   * Ordered sequence of edges forming the path.
   * Empty array if no path exists.
   */
  edges: E[];

  /**
   * Length of path in hops (number of edges).
   * Infinity if no path exists.
   */
  length: number;

  /**
   * Total weight of path (sum of edge weights).
   * For unweighted graphs, equals length.
   */
  weight: number;
}

/**
 * Find shortest path between two nodes.
 *
 * Uses BFS for unweighted graphs, Dijkstra for weighted graphs.
 * Returns one shortest path (deterministic tie-breaking by node ID).
 *
 * Time Complexity: O(V + E) for unweighted, O((V + E) log V) for weighted
 * Space Complexity: O(V) for distance tracking
 *
 * @param graph - The graph to search
 * @param source - Source node ID
 * @param target - Target node ID
 * @param weighted - Whether to use edge weights (default: false)
 * @returns Result containing path information or error
 *
 * @example
 * ```typescript
 * const result = findShortestPath(graph, 'W1', 'W3');
 * if (result.ok && result.value.length < Infinity) {
 *   console.log('Path:', result.value.path);
 * }
 * ```
 */
export function findShortestPath<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  source: string,
  target: string,
  weighted?: boolean
): Result<PathResult<N, E>, ExtractionError>;

/**
 * Set of nodes reachable from source node(s).
 */
export interface ReachabilitySet<N extends Node> {
  /** Source node ID(s) for reachability analysis */
  sources: string[];

  /**
   * Set of node IDs reachable from any source
   * (includes sources themselves)
   */
  reachableNodeIds: Set<string>;

  /**
   * Map from node ID to minimum distance from any source.
   * Only includes reachable nodes.
   */
  distances: Map<string, number>;
}

/**
 * Extract reachability subgraph from source node(s).
 *
 * Returns all nodes reachable from source(s) via forward traversal.
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V) for reachability set
 *
 * @param graph - The graph to analyze
 * @param sources - Source node ID(s)
 * @param direction - 'forward' (follow edge direction) or 'backward' (reverse edges)
 * @returns Result containing reachability information and subgraph or error
 *
 * @example
 * ```typescript
 * // Find all papers citing a seminal work
 * const result = extractReachabilitySubgraph(graph, ['W1'], 'backward');
 * ```
 */
export function extractReachabilitySubgraph<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  sources: string | string[],
  direction?: 'forward' | 'backward'
): Result<{
  reachability: ReachabilitySet<N>;
  subgraph: Graph<N, E>;
}, ExtractionError>;

// ============================================================================
// User Story 4: Academic Motif Detection
// ============================================================================

/**
 * Represents a 3-node cycle (triangle) in the graph.
 */
export interface Triangle<N extends Node, E extends Edge> {
  /**
   * Three distinct node IDs forming the triangle.
   * Order: sorted by ID for canonical representation.
   */
  nodes: [string, string, string];

  /**
   * Three edges forming the triangle cycle.
   */
  edges: [E, E, E];
}

/**
 * Detect all triangles in the graph.
 *
 * Finds all 3-node cycles using node-iterator with neighbor intersection.
 *
 * Time Complexity: O(V × d²) where d = average degree
 * Space Complexity: O(T) where T = number of triangles
 *
 * @param graph - The graph to analyze
 * @returns Result containing array of triangles or error
 *
 * @example
 * ```typescript
 * const result = detectTriangles(graph);
 * if (result.ok) {
 *   console.log('Found triangles:', result.value.length);
 * }
 * ```
 */
export function detectTriangles<N extends Node, E extends Edge>(
  graph: Graph<N, E>
): Result<Triangle<N, E>[], ExtractionError>;

/**
 * Type of star pattern.
 */
export type StarType = 'IN_STAR' | 'OUT_STAR' | 'UNDIRECTED_STAR';

/**
 * Identifies high-degree nodes (hubs) in the graph.
 */
export interface StarPattern<N extends Node> {
  /** Center node ID (hub) */
  center: string;

  /** Node IDs connected to center */
  spokes: string[];

  /** Degree of center node (size of star) */
  degree: number;

  /**
   * Type of star pattern
   * - IN_STAR: high in-degree (many incoming edges)
   * - OUT_STAR: high out-degree (many outgoing edges)
   * - UNDIRECTED_STAR: high degree in undirected graph
   */
  starType: StarType;
}

/**
 * Detect star patterns (high-degree nodes) in the graph.
 *
 * Identifies nodes with degree exceeding threshold.
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(S) where S = number of stars found
 *
 * @param graph - The graph to analyze
 * @param minDegree - Minimum degree threshold
 * @param starType - Type of star to detect (default: auto-detect based on graph directionality)
 * @returns Result containing array of star patterns or error
 *
 * @example
 * ```typescript
 * // Find highly cited papers (in-stars)
 * const result = detectStarPatterns(graph, 50, 'IN_STAR');
 * ```
 */
export function detectStarPatterns<N extends Node>(
  graph: Graph<N, Edge>,
  minDegree: number,
  starType?: StarType
): Result<StarPattern<N>[], ExtractionError>;

/**
 * Identifies pairs of papers citing common sources.
 */
export interface CoCitationPair<N extends Node> {
  /** IDs of two papers that cite the same source */
  citingPapers: [string, string];

  /** ID of the commonly cited source paper */
  citedSource: string;

  /** Strength of coupling (number of shared citations for this specific source) */
  couplingStrength: number;
}

/**
 * Detect co-citation patterns in the graph.
 *
 * Finds pairs of papers that cite common sources.
 *
 * Time Complexity: O(E + C²) where C = average cluster size
 * Space Complexity: O(P) where P = number of pairs found
 *
 * @param graph - The graph to analyze (must be directed)
 * @returns Result containing array of co-citation pairs or error
 *
 * @example
 * ```typescript
 * const result = detectCoCitations(graph);
 * // Aggregate by pair to compute total coupling strength
 * ```
 */
export function detectCoCitations<N extends Node>(
  graph: Graph<N, Edge>
): Result<CoCitationPair<N>[], ExtractionError>;

/**
 * Identifies pairs of papers cited by the same source.
 */
export interface BibliographicCouplingPair<N extends Node> {
  /** IDs of two papers cited by the same source */
  coupledPapers: [string, string];

  /** ID of the paper citing both coupled papers */
  citingSource: string;

  /** Strength of coupling */
  couplingStrength: number;
}

/**
 * Detect bibliographic coupling patterns in the graph.
 *
 * Finds pairs of papers cited by common sources.
 *
 * Time Complexity: O(E + C²) where C = average cluster size
 * Space Complexity: O(P) where P = number of pairs found
 *
 * @param graph - The graph to analyze (must be directed)
 * @returns Result containing array of coupling pairs or error
 */
export function detectBibliographicCoupling<N extends Node>(
  graph: Graph<N, Edge>
): Result<BibliographicCouplingPair<N>[], ExtractionError>;

// ============================================================================
// User Story 5: Dense Collaboration Cluster Extraction (K-Truss)
// ============================================================================

/**
 * Dense subgraph where every edge participates in at least k-2 triangles.
 */
export interface KTrussSubgraph<N extends Node, E extends Edge> {
  /** The k value for this k-truss */
  k: number;

  /** Subgraph containing only edges with sufficient triangle support */
  subgraph: Graph<N, E>;

  /**
   * Map from edge ID to triangle support count
   * (number of triangles containing this edge)
   */
  edgeSupport: Map<string, number>;

  /**
   * Maximum k value achievable for each edge before removal
   * (useful for understanding cohesion hierarchy)
   */
  trussNumber: Map<string, number>;
}

/**
 * Extract k-truss subgraph from the graph.
 *
 * Returns all edges that participate in at least (k-2) triangles.
 *
 * Time Complexity: O(V × d²) for triangle counting + O(E × d) for removal
 * Space Complexity: O(E) for support map
 *
 * @param graph - The graph to analyze
 * @param k - Minimum triangle support (k >= 3)
 * @returns Result containing k-truss subgraph or error
 *
 * @example
 * ```typescript
 * // Find cohesive collaboration clusters
 * const result = extractKTruss(graph, 4);
 * if (result.ok) {
 *   console.log('4-truss size:', result.value.subgraph.getEdgeCount());
 * }
 * ```
 */
export function extractKTruss<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  k: number
): Result<KTrussSubgraph<N, E>, ExtractionError>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Compute triangle support for all edges in the graph.
 *
 * Helper function used by k-truss extraction.
 *
 * @param graph - The graph to analyze
 * @returns Map from edge ID to triangle count
 */
export function computeTriangleSupport<N extends Node, E extends Edge>(
  graph: Graph<N, E>
): Map<string, number>;

/**
 * Validate ego network options.
 *
 * @param options - Options to validate
 * @returns Result indicating success or validation error
 */
export function validateEgoNetworkOptions(
  options: EgoNetworkOptions
): Result<void, ExtractionError>;

/**
 * Validate subgraph filter.
 *
 * @param filter - Filter to validate
 * @returns Result indicating success or validation error
 */
export function validateSubgraphFilter<N extends Node, E extends Edge>(
  filter: SubgraphFilter<N, E>
): Result<void, ExtractionError>;
