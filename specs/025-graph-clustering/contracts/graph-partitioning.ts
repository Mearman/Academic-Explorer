/**
 * API Contract: Spectral Graph Partitioning
 *
 * Partitions graph into balanced subgraphs using spectral clustering.
 * Priority: P2 (Visualization optimization)
 */

import type { Graph } from '../../../packages/algorithms/src/graph/graph';
import type { WeightFunction } from '../../../packages/algorithms/src/types/weight-function';
import type { Result } from '../../../packages/algorithms/src/types/result';
import type { Partition } from '../../../packages/algorithms/src/types/clustering-types';

/**
 * Spectral partitioning options
 */
export interface SpectralOptions<N, E> {
  /**
   * Number of partitions (k)
   * @required
   */
  k: number;

  /**
   * Custom weight function for edges
   * @default uniform weights (1.0)
   */
  weightFunction?: WeightFunction<N, E>;

  /**
   * Constraint list: nodes that must be in separate partitions
   * @default [] (no constraints)
   */
  constraints?: Array<[N, N]>;

  /**
   * Balance tolerance (max_size / min_size)
   * @default 1.2 (20% imbalance allowed)
   */
  balanceTolerance?: number;
}

/**
 * Spectral partitioning result
 */
export interface SpectralResult<N> {
  /** Resulting partitions */
  partitions: Partition<N>[];

  /** Total edge cuts across all partition boundaries */
  totalEdgeCuts: number;

  /** Balance ratio (max_size / min_size) */
  balanceRatio: number;

  /** Algorithm metadata */
  metadata: {
    algorithm: 'spectral';
    runtime: number; // milliseconds
    k: number;
    parameters: SpectralOptions<N, unknown>;
  };
}

/**
 * Partitioning error types
 */
export type PartitioningError =
  | { type: 'InvalidInput'; message: string }
  | { type: 'InvalidK'; message: string; k: number; nodeCount: number }
  | { type: 'ConstraintViolation'; message: string; constraint: [unknown, unknown] }
  | { type: 'ConvergenceFailure'; message: string };

/**
 * Partition graph using spectral clustering
 *
 * @param graph Input graph
 * @param options Partitioning options (k is required)
 * @returns Result with partitions or error
 *
 * @example
 * ```typescript
 * const graph = new Graph<string, Edge>();
 * // ... add nodes and edges ...
 *
 * const result = spectralPartition(graph, {
 *   k: 5,
 *   balanceTolerance: 1.2
 * });
 *
 * if (result.isOk()) {
 *   const { partitions, balanceRatio } = result.unwrap();
 *   console.log(`Created ${partitions.length} balanced partitions`);
 *   console.log(`Balance ratio: ${balanceRatio}`);
 * }
 * ```
 */
export function spectralPartition<N, E>(
  graph: Graph<N, E>,
  options: SpectralOptions<N, E>
): Result<SpectralResult<N>, PartitioningError>;
