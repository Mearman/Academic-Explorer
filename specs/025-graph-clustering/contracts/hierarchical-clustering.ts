/**
 * API Contract: Hierarchical Clustering
 *
 * Produces hierarchical dendrogram structure for multi-resolution clustering.
 * Priority: P3 (Topic taxonomy visualization)
 */

import type { Graph } from '../../../packages/algorithms/src/graph/graph';
import type { WeightFunction } from '../../../packages/algorithms/src/types/weight-function';
import type { Result } from '../../../packages/algorithms/src/types/result';
import type { Dendrogram } from '../../../packages/algorithms/src/types/clustering-types';

/**
 * Hierarchical clustering options
 */
export interface HierarchicalOptions<N, E> {
  /**
   * Linkage method for merging clusters
   * @default 'average'
   */
  linkage?: 'average' | 'single' | 'complete';

  /**
   * Custom weight function for edges
   * @default uniform weights (1.0)
   */
  weightFunction?: WeightFunction<N, E>;

  /**
   * Distance metric for dissimilarity
   * @default 'euclidean' (based on adjacency matrix)
   */
  distanceMetric?: 'euclidean' | 'manhattan' | 'cosine';
}

/**
 * Hierarchical clustering result
 */
export interface HierarchicalResult<N> {
  /** Dendrogram tree structure */
  dendrogram: Dendrogram<N>;

  /** Algorithm metadata */
  metadata: {
    algorithm: 'hierarchical';
    runtime: number; // milliseconds
    linkage: 'average' | 'single' | 'complete';
    parameters: HierarchicalOptions<N, unknown>;
  };
}

/**
 * Hierarchical clustering error types
 */
export type HierarchicalError =
  | { type: 'InvalidInput'; message: string }
  | { type: 'InsufficientNodes'; message: string; required: number; actual: number };

/**
 * Perform hierarchical clustering on graph
 *
 * @param graph Input graph
 * @param options Algorithm options
 * @returns Result with dendrogram or error
 *
 * @example
 * ```typescript
 * const graph = new Graph<string, TopicEdge>();
 * // ... add topic nodes and edges ...
 *
 * const result = hierarchicalClustering(graph, { linkage: 'average' });
 * if (result.isOk()) {
 *   const { dendrogram } = result.unwrap();
 *
 *   // Cut at height 0.5 to get flat clustering
 *   const clusters = dendrogram.cutAtHeight(0.5);
 *   console.log(`${clusters.length} clusters at height 0.5`);
 * }
 * ```
 */
export function hierarchicalClustering<N, E>(
  graph: Graph<N, E>,
  options?: HierarchicalOptions<N, E>
): Result<HierarchicalResult<N>, HierarchicalError>;
