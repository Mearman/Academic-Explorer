/**
 * Ego network extraction utilities for graph extraction algorithms.
 *
 * Ego networks (k-hop neighborhoods) are subgraphs containing all nodes
 * within k hops of one or more seed nodes, useful for citation context
 * exploration and local network analysis.
 */
import type { Graph } from '../graph/graph';
import type { ExtractionError } from '../types/errors';
import type { Edge,Node } from '../types/graph';
import type { Result } from '../types/result';
import { extractInducedSubgraph } from './subgraph';
import { type EgoNetworkOptions,validateEgoNetworkOptions } from './validators';

/**
 * Extracts a k-hop ego network around one or more seed nodes.
 *
 * An ego network includes all nodes within k hops (radius) of the seed nodes,
 * along with all edges between those nodes. This is useful for exploring
 * citation contexts, local neighborhoods, and relationship patterns.
 *
 * Algorithm:
 * 1. Validate input parameters (radius, seed nodes exist)
 * 2. For each seed node, perform BFS limited to k hops
 * 3. Collect union of all nodes discovered within k hops
 * 4. Extract induced subgraph containing those nodes
 *
 * Time Complexity: O(V + E) where V is nodes in ego network, E is edges
 * Space Complexity: O(V) for visited set and result graph
 * @param graph - Source graph to extract from
 * @param options - Ego network extraction options
 * @returns Result containing extracted subgraph or validation error
 * @example
 * ```typescript
 * // Extract 2-hop neighborhood around a paper
 * const graph = createCitationNetwork();
 * const result = extractEgoNetwork(graph, {
 *   radius: 2,
 *   seedNodes: ['P123'],
 * });
 *
 * if (result.ok) {
 *   console.log(`Found ${result.value.getNodeCount()} papers in 2-hop neighborhood`);
 * }
 * ```
 */
export const extractEgoNetwork = <N extends Node, E extends Edge>(graph: Graph<N, E>, options: EgoNetworkOptions): Result<Graph<N, E>, ExtractionError> => {
  // Validate options
  const validationResult = validateEgoNetworkOptions(graph, options);
  if (!validationResult.ok) {
    return validationResult as Result<Graph<N, E>, ExtractionError>;
  }

  const validatedOptions = validationResult.value;
  const { radius, seedNodes, includeSeed } = validatedOptions;

  // Collect all nodes within k hops of any seed node
  const egoNodes = new Set<string>();

  // Handle radius 0 special case (only seed nodes)
  if (radius === 0) {
    if (includeSeed) {
      for (const seedId of seedNodes) {
        egoNodes.add(seedId);
      }
    }
    return extractInducedSubgraph(graph, egoNodes);
  }

  // For each seed node, perform BFS to discover k-hop neighborhood
  for (const seedId of seedNodes) {
    const nodesAtDistance = discoverNodesWithinRadius(graph, seedId, radius);

    // Add discovered nodes to ego network
    for (const [nodeId, distance] of Array.from(nodesAtDistance.entries())) {
      // Include seed node based on includeSeed option
      if (distance === 0 && !includeSeed) {
        continue;
      }
      egoNodes.add(nodeId);
    }
  }

  // Extract induced subgraph containing all ego nodes
  return extractInducedSubgraph(graph, egoNodes);
};

/**
 * Discovers all nodes within a given radius using BFS with distance tracking.
 * @param graph - Graph to traverse
 * @param startId - Starting node ID
 * @param maxRadius - Maximum distance (number of hops)
 * @returns Map of node IDs to their distance from start
 */
const discoverNodesWithinRadius = <N extends Node, E extends Edge>(graph: Graph<N, E>, startId: string, maxRadius: number): Map<string, number> => {
  const distances = new Map<string, number>();
  const queue: Array<{ nodeId: string; distance: number }> = [
    { nodeId: startId, distance: 0 },
  ];

  distances.set(startId, 0);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    const { nodeId, distance } = current;

    // Stop expanding if we've reached the radius limit
    if (distance >= maxRadius) {
      continue;
    }

    // Explore neighbors
    const neighborsResult = graph.getNeighbors(nodeId);
    if (neighborsResult.ok) {
      for (const neighborId of neighborsResult.value) {
        // Skip if already visited
        if (distances.has(neighborId)) {
          continue;
        }

        // Mark distance and enqueue for exploration
        distances.set(neighborId, distance + 1);
        queue.push({ nodeId: neighborId, distance: distance + 1 });
      }
    }
  }

  return distances;
};

/**
 * Convenience wrapper for extracting multi-source ego network.
 *
 * Extracts the union of ego networks around multiple seed nodes.
 * This is a simplified API for the common case of multi-source extraction.
 * @param graph - Source graph
 * @param seedNodes - Array of seed node IDs
 * @param radius - Number of hops to include
 * @param includeSeed - Whether to include seed nodes (default: true)
 * @returns Result containing extracted subgraph or error
 * @example
 * ```typescript
 * // Extract 1-hop neighborhoods around multiple authors
 * const result = extractMultiSourceEgoNetwork(
 *   graph,
 *   ['A123', 'A456', 'A789'],
 *   1
 * );
 * ```
 */
export const extractMultiSourceEgoNetwork = <N extends Node, E extends Edge>(graph: Graph<N, E>, seedNodes: string[], radius: number, includeSeed: boolean = true): Result<Graph<N, E>, ExtractionError> => extractEgoNetwork(graph, {
    radius,
    seedNodes,
    includeSeed,
  });
