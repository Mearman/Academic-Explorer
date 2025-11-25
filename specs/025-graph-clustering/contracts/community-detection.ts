/**
 * API Contract: Louvain Community Detection
 *
 * Identifies dense communities in graphs using greedy modularity optimization.
 * Priority: P1 (Core functionality)
 */

import type { Graph } from '../../../packages/algorithms/src/graph/graph';
import type { WeightFunction } from '../../../packages/algorithms/src/types/weight-function';
import type { Result } from '../../../packages/algorithms/src/types/result';
import type { Community, ClusterMetrics } from '../../../packages/algorithms/src/types/clustering-types';

/**
 * Louvain algorithm options
 */
export interface LouvainOptions<N, E> {
  /**
   * Resolution parameter for modularity optimization
   * @default 1.0
   * Higher values produce smaller communities
   */
  resolution?: number;

  /**
   * Custom weight function for edges
   * @default uniform weights (1.0)
   */
  weightFunction?: WeightFunction<N, E>;

  /**
   * Maximum number of iterations before forced termination
   * @default 100
   */
  maxIterations?: number;

  /**
   * Minimum modularity improvement to continue iterations
   * @default 0.0001
   */
  minImprovement?: number;
}

/**
 * Louvain clustering result
 */
export interface LouvainResult<N> {
  /** Detected communities */
  communities: Community<N>[];

  /** Quality metrics */
  metrics: ClusterMetrics;

  /** Algorithm metadata */
  metadata: {
    algorithm: 'louvain';
    runtime: number; // milliseconds
    iterations: number;
    parameters: LouvainOptions<N, unknown>;
  };
}

/**
 * Clustering error types
 */
export type ClusteringError =
  | { type: 'InvalidInput'; message: string }
  | { type: 'EmptyGraph'; message: string }
  | { type: 'InsufficientNodes'; message: string; required: number; actual: number }
  | { type: 'ConvergenceFailure'; message: string; iterations: number };

/**
 * Detect communities using Louvain algorithm
 *
 * @param graph Input graph
 * @param options Algorithm options
 * @returns Result with communities or error
 *
 * @example
 * ```typescript
 * const graph = new Graph<string, CitationEdge>();
 * // ... add nodes and edges ...
 *
 * const result = louvain(graph, { resolution: 1.0 });
 * if (result.isOk()) {
 *   const { communities, metrics } = result.unwrap();
 *   console.log(`Found ${communities.length} communities`);
 *   console.log(`Modularity: ${metrics.modularity}`);
 * }
 * ```
 */
export function louvain<N, E>(
  graph: Graph<N, E>,
  options?: LouvainOptions<N, E>
): Result<LouvainResult<N>, ClusteringError>;
