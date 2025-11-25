/**
 * API Contract: Infomap Clustering
 *
 * Information-theoretic clustering based on map equation minimization.
 * Priority: P7 (Citation flow analysis)
 */

import type { Graph } from '../../../packages/algorithms/src/graph/graph';
import type { WeightFunction } from '../../../packages/algorithms/src/types/weight-function';
import type { Result } from '../../../packages/algorithms/src/types/result';
import type { InfomapModule, ClusterMetrics } from '../../../packages/algorithms/src/types/clustering-types';

/**
 * Infomap clustering options
 */
export interface InfomapOptions<N, E> {
  /**
   * Custom weight function for edges (transition probabilities)
   * @default uniform weights (1.0)
   */
  weightFunction?: WeightFunction<N, E>;

  /**
   * Maximum number of optimization iterations
   * @default 100
   */
  maxIterations?: number;

  /**
   * Number of random walk trials for convergence
   * @default 10
   */
  numTrials?: number;

  /**
   * Random seed for reproducibility
   * @default undefined (non-deterministic)
   */
  seed?: number;
}

/**
 * Infomap clustering result
 */
export interface InfomapResult<N> {
  /** Detected modules (information-theoretic communities) */
  modules: InfomapModule<N>[];

  /** Quality metrics */
  metrics: ClusterMetrics;

  /** Total description length (bits) */
  descriptionLength: number;

  /** Compression ratio (initial_length / final_length) */
  compressionRatio: number;

  /** Algorithm metadata */
  metadata: {
    algorithm: 'infomap';
    runtime: number; // milliseconds
    iterations: number;
    parameters: InfomapOptions<N, unknown>;
  };
}

/**
 * Infomap clustering error types
 */
export type InfomapError =
  | { type: 'InvalidInput'; message: string }
  | { type: 'EmptyGraph'; message: string }
  | { type: 'ConvergenceFailure'; message: string; iterations: number };

/**
 * Cluster graph using Infomap algorithm
 *
 * Optimizes map equation: L = H(X) + Σ p_i H(X_i)
 * where H is Shannon entropy and p_i is visit probability
 *
 * @param graph Input graph (directed edges respected)
 * @param options Algorithm options
 * @returns Result with modules or error
 *
 * @example
 * ```typescript
 * const graph = new Graph<string, CitationEdge>();
 * // ... add directed citation network ...
 *
 * const result = infomap(graph, { numTrials: 10 });
 * if (result.isOk()) {
 *   const { modules, compressionRatio, descriptionLength } = result.unwrap();
 *
 *   console.log(`Found ${modules.length} modules`);
 *   console.log(`Compression ratio: ${compressionRatio.toFixed(2)}x`);
 *   console.log(`Description length: ${descriptionLength.toFixed(2)} bits`);
 *
 *   // Modules with high visit probability are important
 *   modules.sort((a, b) => b.visitProbability - a.visitProbability);
 * }
 * ```
 */
export function infomap<N, E>(
  graph: Graph<N, E>,
  options?: InfomapOptions<N, E>
): Result<InfomapResult<N>, InfomapError>;
