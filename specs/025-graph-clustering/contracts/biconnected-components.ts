/**
 * API Contract: Biconnected Component Decomposition
 *
 * Identifies articulation points and biconnected components using Tarjan's algorithm.
 * Priority: P9 (Critical paper identification)
 */

import type { Graph } from '../../../packages/algorithms/src/graph/graph';
import type { Result } from '../../../packages/algorithms/src/types/result';
import type { BiconnectedComponent } from '../../../packages/algorithms/src/types/clustering-types';

/**
 * Biconnected component decomposition result
 */
export interface BiconnectedResult<N> {
  /** Biconnected components (maximal subgraphs with no articulation points) */
  components: BiconnectedComponent<N>[];

  /** Articulation points (cut vertices) */
  articulationPoints: Set<N>;

  /** Algorithm metadata */
  metadata: {
    algorithm: 'biconnected';
    runtime: number; // milliseconds
  };
}

/**
 * Biconnected decomposition error types
 */
export type BiconnectedError =
  | { type: 'InvalidInput'; message: string }
  | { type: 'EmptyGraph'; message: string };

/**
 * Decompose graph into biconnected components
 *
 * Uses Tarjan's DFS-based algorithm.
 * Time complexity: O(V + E) - linear time, single DFS traversal
 * Space complexity: O(V) - for DFS stack and tracking arrays
 *
 * @param graph Input graph
 * @returns Result with components and articulation points or error
 *
 * @example
 * ```typescript
 * const graph = new Graph<string, CitationEdge>();
 * // ... add citation network ...
 *
 * const result = biconnectedComponents(graph);
 * if (result.isOk()) {
 *   const { components, articulationPoints } = result.unwrap();
 *
 *   console.log(`Found ${components.length} biconnected components`);
 *   console.log(`Found ${articulationPoints.size} articulation points`);
 *
 *   // Articulation points are bridge papers connecting research communities
 *   if (articulationPoints.size > 0) {
 *     console.log('Bridge papers (critical for connectivity):');
 *     articulationPoints.forEach((paperId) => {
 *       console.log(`  - ${paperId}`);
 *     });
 *   }
 *
 *   // Find largest biconnected component (most robust subnetwork)
 *   const largest = components.sort((a, b) => b.size - a.size)[0];
 *   console.log(`Largest component: ${largest.size} papers`);
 * }
 * ```
 */
export function biconnectedComponents<N, E>(
  graph: Graph<N, E>
): Result<BiconnectedResult<N>, BiconnectedError>;
