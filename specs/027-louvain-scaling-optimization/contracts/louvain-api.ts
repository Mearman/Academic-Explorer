/**
 * API Contract: Louvain Algorithm Optimization
 *
 * Defines the public interface for the optimized Louvain community detection algorithm.
 * This contract remains stable across all three optimization phases.
 */

import type { Graph } from '../../../packages/algorithms/src/graph/graph';
import type { Node, Edge } from '../../../packages/algorithms/src/types/graph';
import type { Result } from '../../../packages/algorithms/src/types/result';
import type { Community, ClusteringError } from '../../../packages/algorithms/src/types/clustering-types';

/**
 * Configuration for Louvain algorithm optimization.
 *
 * @remarks
 * All fields are optional. If not provided, adaptive defaults are used based on graph size.
 *
 * @since Phase 1 (Parameter Tuning)
 */
export interface LouvainConfiguration {
  /**
   * Neighbor selection strategy.
   *
   * - `"auto"` (default): Best-neighbor for <200 nodes, random for ≥500 nodes
   * - `"best"`: Always evaluate all neighbors, select maximum ΔQ (quality-first)
   * - `"random"`: Accept first neighbor with positive ΔQ after shuffle (speed-first, Fast Louvain)
   *
   * @default "auto"
   * @since Phase 2 (Fast Louvain)
   */
  mode?: "auto" | "best" | "random";

  /**
   * Random seed for deterministic neighbor shuffling.
   *
   * @remarks
   * If provided, enables reproducible test results by seeding the PRNG.
   * If undefined, uses Math.random() (non-deterministic).
   *
   * @since Phase 1 (Parameter Tuning)
   */
  seed?: number;

  /**
   * Modularity convergence threshold override.
   *
   * @remarks
   * Adaptive default (if undefined):
   * - 1e-5 for graphs >500 nodes
   * - 1e-6 for graphs ≤500 nodes
   *
   * Lower values = stricter convergence, higher quality, slower performance
   * Higher values = looser convergence, lower quality, faster performance
   *
   * @since Phase 1 (Parameter Tuning)
   */
  minModularityIncrease?: number;

  /**
   * Maximum iterations override.
   *
   * @remarks
   * Adaptive default (if undefined):
   * - 20 iterations for graphs >200 nodes (first hierarchy level)
   * - 40-50 iterations for graphs ≤200 nodes
   *
   * @since Phase 1 (Parameter Tuning)
   */
  maxIterations?: number;
}

/**
 * Result of Louvain community detection.
 *
 * @typeParam T - Node identifier type (typically string)
 */
export interface LouvainResult<T = string> {
  /** Map of community ID → community structure */
  communities: Map<number, Community<T>>;

  /** Modularity score (range: [-0.5, 1.0], higher is better) */
  modularity: number;

  /** Number of hierarchy levels (typically 2-4 for citation networks) */
  levels: number;

  /** Metadata about algorithm execution */
  metadata: {
    /** Algorithm name (always "louvain") */
    algorithm: string;

    /** Total runtime in milliseconds */
    runtime: number;

    /** Total iterations across all hierarchy levels */
    totalIterations: number;

    /** Configuration used (with resolved adaptive defaults) */
    configuration: Required<LouvainConfiguration>;
  };
}

/**
 * Louvain community detection with multi-phase optimizations.
 *
 * @typeParam N - Node type (must extend Node interface)
 * @typeParam E - Edge type (must extend Edge interface)
 *
 * @param graph - Input graph (directed or undirected)
 * @param config - Optional configuration for optimization control
 *
 * @returns Result containing communities and modularity score, or error
 *
 * @remarks
 * **Performance Characteristics** (1000-node graph):
 * - Phase 1 (Parameter Tuning): ~10-12 seconds
 * - Phase 2 (Fast Louvain): ~3-5 seconds
 * - Phase 3 (CSR + Caching): ~1.5-2.5 seconds
 *
 * **Quality Trade-offs**:
 * - Best mode: Modularity ~0.2 (baseline)
 * - Auto mode (large graphs): Modularity ~0.19 (5% loss for 3-6x speedup)
 * - Random mode: Modularity ~0.18-0.19 (acceptable for speed-critical use cases)
 *
 * **Backward Compatibility**:
 * - Existing calls without config continue working (adaptive defaults)
 * - All 9 existing Louvain tests pass unchanged
 * - Breaking changes acceptable per Principle VII (development stage)
 *
 * @example Basic usage (adaptive defaults)
 * ```typescript
 * const result = louvain(graph);
 * if (result.ok) {
 *   const { communities, modularity } = result.value;
 *   console.log(`Found ${communities.size} communities with Q=${modularity}`);
 * }
 * ```
 *
 * @example Quality-first mode (small graphs)
 * ```typescript
 * const result = louvain(graph, { mode: "best" });
 * ```
 *
 * @example Speed-first mode (large graphs)
 * ```typescript
 * const result = louvain(graph, { mode: "random", maxIterations: 10 });
 * ```
 *
 * @example Reproducible testing
 * ```typescript
 * const result = louvain(graph, { seed: 42 });
 * // Same graph + same seed = identical communities
 * ```
 *
 * @since Phase 1 (baseline optimization)
 */
export function louvain<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  config?: LouvainConfiguration
): Result<LouvainResult<string>, ClusteringError>;

/**
 * Helper: Determine optimal mode based on graph size.
 *
 * @param nodeCount - Number of nodes in graph
 * @returns Recommended mode ("best" or "random")
 *
 * @remarks
 * Used internally by "auto" mode configuration.
 * Exposed for testing and advanced use cases.
 *
 * @since Phase 2 (Fast Louvain)
 */
export function determineOptimalMode(nodeCount: number): "best" | "random";

/**
 * Helper: Get adaptive threshold for graph size.
 *
 * @param nodeCount - Number of nodes in graph
 * @returns Convergence threshold (1e-5 or 1e-6)
 *
 * @remarks
 * Used internally when minModularityIncrease not explicitly provided.
 * Exposed for testing and transparency.
 *
 * @since Phase 1 (Parameter Tuning)
 */
export function getAdaptiveThreshold(nodeCount: number): number;

/**
 * Helper: Get adaptive iteration limit for graph size.
 *
 * @param nodeCount - Number of nodes in graph
 * @param level - Hierarchy level (0 = first level)
 * @returns Maximum iterations (20, 40, or 50)
 *
 * @remarks
 * First hierarchy level uses lower limit for large graphs (where most moves happen).
 * Subsequent levels use higher limit for refinement.
 *
 * @since Phase 1 (Parameter Tuning)
 */
export function getAdaptiveIterationLimit(nodeCount: number, level: number): number;
