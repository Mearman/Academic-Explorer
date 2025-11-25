/**
 * API Contract: Leiden Clustering
 *
 * Enhanced community detection with connectivity guarantee and refinement.
 * Priority: P5 (High-quality community detection)
 */

import type { Graph } from '../../../packages/algorithms/src/graph/graph';
import type { WeightFunction } from '../../../packages/algorithms/src/types/weight-function';
import type { Result } from '../../../packages/algorithms/src/types/result';
import type { LeidenCommunity, ClusterMetrics } from '../../../packages/algorithms/src/types/clustering-types';

/**
 * Leiden algorithm options
 */
export interface LeidenOptions<N, E> {
  /**
   * Resolution parameter for modularity optimization
   * @default 1.0
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
 * Leiden clustering result
 */
export interface LeidenResult<N> {
  /** Detected communities (guaranteed connected) */
  communities: LeidenCommunity<N>[];

  /** Quality metrics */
  metrics: ClusterMetrics;

  /** Algorithm metadata */
  metadata: {
    algorithm: 'leiden';
    runtime: number; // milliseconds
    iterations: number;
    refinementPhases: number; // Number of times refinement was triggered
    parameters: LeidenOptions<N, unknown>;
  };
}

/**
 * Leiden clustering error types
 */
export type LeidenError =
  | { type: 'InvalidInput'; message: string }
  | { type: 'EmptyGraph'; message: string }
  | { type: 'InsufficientNodes'; message: string; required: number; actual: number }
  | { type: 'ConvergenceFailure'; message: string; iterations: number };

/**
 * Detect communities using Leiden algorithm
 *
 * Guarantees:
 * - All communities are connected subgraphs
 * - Modularity ≥ Louvain modularity on same graph
 *
 * @param graph Input graph
 * @param options Algorithm options
 * @returns Result with communities or error
 *
 * @example
 * ```typescript
 * const graph = new Graph<string, CitationEdge>();
 * // ... add citation network ...
 *
 * const result = leiden(graph, { resolution: 1.0 });
 * if (result.isOk()) {
 *   const { communities, metrics } = result.unwrap();
 *
 *   // All communities guaranteed to be connected
 *   communities.forEach((community) => {
 *     console.assert(community.isConnected);
 *   });
 *
 *   console.log(`Modularity: ${metrics.modularity}`);
 * }
 * ```
 */
export function leiden<N, E>(
  graph: Graph<N, E>,
  options?: LeidenOptions<N, E>
): Result<LeidenResult<N>, LeidenError>;
