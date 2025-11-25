/**
 * API Contract: K-Core Decomposition
 *
 * Identifies densely connected cores using Batagelj-Zaversnik algorithm.
 * Priority: P4 (Research core identification)
 */

import type { Graph } from '../../../packages/algorithms/src/graph/graph';
import type { Result } from '../../../packages/algorithms/src/types/result';
import type { Core } from '../../../packages/algorithms/src/types/clustering-types';

/**
 * K-core decomposition options
 */
export interface KCoreOptions {
  /**
   * Specific k value to extract (optional)
   * If omitted, returns all cores from k=1 to k=degeneracy
   * @default undefined (return all cores)
   */
  k?: number;
}

/**
 * K-core decomposition result
 */
export interface KCoreResult<N> {
  /** Map from k-value to k-core */
  cores: Map<number, Core<N>>;

  /** Graph degeneracy (maximum k value) */
  degeneracy: number;

  /** Per-node core numbers */
  coreNumbers: Map<N, number>;

  /** Algorithm metadata */
  metadata: {
    algorithm: 'k-core';
    runtime: number; // milliseconds
  };
}

/**
 * K-core error types
 */
export type KCoreError =
  | { type: 'InvalidInput'; message: string }
  | { type: 'InvalidK'; message: string; k: number; degeneracy: number };

/**
 * Compute k-core decomposition using Batagelj-Zaversnik algorithm
 *
 * Time complexity: O(V + E)
 * Space complexity: O(V)
 *
 * @param graph Input graph
 * @param options Decomposition options
 * @returns Result with cores or error
 *
 * @example
 * ```typescript
 * const graph = new Graph<string, CitationEdge>();
 * // ... add citation network ...
 *
 * const result = kCoreDecomposition(graph);
 * if (result.isOk()) {
 *   const { cores, degeneracy, coreNumbers } = result.unwrap();
 *
 *   console.log(`Graph degeneracy: ${degeneracy}`);
 *
 *   // Extract 5-core (highly cited papers)
 *   const core5 = cores.get(5);
 *   if (core5) {
 *     console.log(`${core5.size} papers in 5-core`);
 *   }
 * }
 * ```
 */
export function kCoreDecomposition<N, E>(
  graph: Graph<N, E>,
  options?: KCoreOptions
): Result<KCoreResult<N>, KCoreError>;
