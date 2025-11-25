/**
 * API Contract: Core-Periphery Decomposition
 *
 * Identifies dense core and sparse periphery structure.
 * Priority: P8 (Influence identification)
 */

import type { Graph } from '../../../packages/algorithms/src/graph/graph';
import type { WeightFunction } from '../../../packages/algorithms/src/types/weight-function';
import type { Result } from '../../../packages/algorithms/src/types/result';
import type { CorePeripheryStructure } from '../../../packages/algorithms/src/types/clustering-types';

/**
 * Core-periphery decomposition options
 */
export interface CorePeripheryOptions<N, E> {
  /**
   * Custom weight function for edges
   * @default uniform weights (1.0)
   */
  weightFunction?: WeightFunction<N, E>;

  /**
   * Coreness threshold for core membership
   * @default 0.7
   * Nodes with coreness > threshold are assigned to core
   */
  coreThreshold?: number;

  /**
   * Maximum number of optimization iterations
   * @default 100
   */
  maxIterations?: number;

  /**
   * Convergence epsilon (stop when coreness changes < epsilon)
   * @default 0.001
   */
  epsilon?: number;
}

/**
 * Core-periphery decomposition result
 */
export interface CorePeripheryResult<N> {
  /** Core-periphery structure */
  structure: CorePeripheryStructure<N>;

  /** Algorithm metadata */
  metadata: {
    algorithm: 'core-periphery';
    runtime: number; // milliseconds
    iterations: number;
    converged: boolean; // True if converged, false if hit maxIterations
    parameters: CorePeripheryOptions<N, unknown>;
  };
}

/**
 * Core-periphery error types
 */
export type CorePeripheryError =
  | { type: 'InvalidInput'; message: string }
  | { type: 'EmptyGraph'; message: string }
  | { type: 'InsufficientNodes'; message: string; required: number; actual: number };

/**
 * Decompose graph into core and periphery
 *
 * Uses Borgatti-Everett model with iterative coreness optimization.
 *
 * @param graph Input graph
 * @param options Algorithm options
 * @returns Result with core-periphery structure or error
 *
 * @example
 * ```typescript
 * const graph = new Graph<string, CitationEdge>();
 * // ... add citation network ...
 *
 * const result = corePeripheryDecomposition(graph, {
 *   coreThreshold: 0.7
 * });
 *
 * if (result.isOk()) {
 *   const { structure, metadata } = result.unwrap();
 *   const { coreNodes, peripheryNodes, corenessScores } = structure;
 *
 *   console.log(`Core: ${coreNodes.size} papers (influential)`);
 *   console.log(`Periphery: ${peripheryNodes.size} papers (derivative)`);
 *
 *   // Find most influential papers (highest coreness)
 *   const sortedCore = Array.from(coreNodes).sort((a, b) =>
 *     (corenessScores.get(b) || 0) - (corenessScores.get(a) || 0)
 *   );
 * }
 * ```
 */
export function corePeripheryDecomposition<N, E>(
  graph: Graph<N, E>,
  options?: CorePeripheryOptions<N, E>
): Result<CorePeripheryResult<N>, CorePeripheryError>;
