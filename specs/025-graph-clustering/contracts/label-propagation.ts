/**
 * API Contract: Label Propagation Clustering
 *
 * Fast linear-time clustering for large graphs.
 * Priority: P6 (Large-scale performance)
 */

import type { Graph } from '../../../packages/algorithms/src/graph/graph';
import type { WeightFunction } from '../../../packages/algorithms/src/types/weight-function';
import type { Result } from '../../../packages/algorithms/src/types/result';
import type { LabelCluster, ClusterMetrics } from '../../../packages/algorithms/src/types/clustering-types';

/**
 * Label propagation options
 */
export interface LabelPropagationOptions<N, E> {
  /**
   * Maximum number of iterations before forced termination
   * @default 100
   */
  maxIterations?: number;

  /**
   * Custom weight function for edges
   * @default uniform weights (1.0)
   */
  weightFunction?: WeightFunction<N, E>;

  /**
   * Random seed for reproducibility
   * @default undefined (non-deterministic)
   */
  seed?: number;
}

/**
 * Label propagation result
 */
export interface LabelPropagationResult<N> {
  /** Detected clusters */
  clusters: LabelCluster<N>[];

  /** Quality metrics */
  metrics: ClusterMetrics;

  /** Algorithm metadata */
  metadata: {
    algorithm: 'label-propagation';
    runtime: number; // milliseconds
    iterations: number;
    converged: boolean; // True if stopped due to convergence, false if hit maxIterations
    parameters: LabelPropagationOptions<N, unknown>;
  };
}

/**
 * Label propagation error types
 */
export type LabelPropagationError =
  | { type: 'InvalidInput'; message: string }
  | { type: 'EmptyGraph'; message: string };

/**
 * Cluster graph using label propagation
 *
 * Time complexity: O(m + n) per iteration
 * Typically converges in 3-5 iterations for social/citation networks
 *
 * @param graph Input graph
 * @param options Algorithm options
 * @returns Result with clusters or error
 *
 * @example
 * ```typescript
 * const graph = new Graph<string, Edge>();
 * // ... add 10,000 node citation network ...
 *
 * const result = labelPropagation(graph, {
 *   maxIterations: 100,
 *   seed: 42 // For reproducibility
 * });
 *
 * if (result.isOk()) {
 *   const { clusters, metadata } = result.unwrap();
 *
 *   console.log(`Found ${clusters.length} clusters`);
 *   console.log(`Converged: ${metadata.converged}`);
 *   console.log(`Runtime: ${metadata.runtime}ms`);
 * }
 * ```
 */
export function labelPropagation<N, E>(
  graph: Graph<N, E>,
  options?: LabelPropagationOptions<N, E>
): Result<LabelPropagationResult<N>, LabelPropagationError>;
