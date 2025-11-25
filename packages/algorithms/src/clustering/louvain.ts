/**
 * Louvain community detection algorithm implementation.
 * Detects communities in networks by optimizing modularity.
 *
 * Algorithm:
 * 1. Phase 1 (Local Moving): Iteratively move nodes to neighboring communities
 *    that maximize modularity gain
 * 2. Phase 2 (Aggregation): Merge communities into super-nodes
 * 3. Repeat until convergence (no modularity improvement)
 *
 * Time Complexity: O(n log n) for sparse graphs
 * Space Complexity: O(n + m)
 *
 * @module clustering/louvain
 */

import type { Graph } from '../graph/graph';
import type { Node, Edge } from '../types/graph';
import type { Community } from '../types/clustering-types';
import type { WeightFunction } from '../types/weight-function';
import { calculateModularityDelta } from '../metrics/modularity';
import { calculateDensity } from '../metrics/cluster-quality';

/**
 * Internal representation of a community during Louvain execution.
 */
interface LouvainCommunity {
  id: number;
  nodes: Set<string>; // Node IDs
  sigmaTot: number; // Sum of degrees of nodes in community
  sigmaIn: number; // Sum of edge weights within community
}

/**
 * Detect communities using the Louvain algorithm.
 *
 * The Louvain method is a greedy optimization method that attempts to optimize
 * the modularity of a partition of the network.
 *
 * @typeParam N - Node type
 * @typeParam E - Edge type
 * @param graph - Input graph (directed or undirected)
 * @param options - Optional configuration
 * @param options.weightFn - Weight function for edges (default: all edges weight 1.0)
 * @param options.resolution - Resolution parameter (default: 1.0, higher values favor more communities)
 * @param options.minModularityIncrease - Minimum modularity improvement to continue (default: 1e-6)
 * @param options.maxIterations - Maximum iterations per phase (default: 100)
 * @returns Array of detected communities
 *
 * @example
 * ```typescript
 * const graph = new Graph<PaperNode, CitationEdge>(true);
 * // ... add nodes and edges ...
 *
 * const communities = detectCommunities(graph);
 * console.log(`Found ${communities.length} communities`);
 * ```
 */
export function detectCommunities<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  options: {
    weightFn?: WeightFunction<N, E>;
    resolution?: number;
    minModularityIncrease?: number;
    maxIterations?: number;
  } = {}
): Community<N>[] {
  const {
    weightFn = () => 1.0,
    resolution = 1.0,
    minModularityIncrease = 1e-6,
    maxIterations = 100,
  } = options;

  // Handle empty graph
  const allNodes = graph.getAllNodes();
  if (allNodes.length === 0) {
    return [];
  }

  // Pre-calculate node degrees (optimization)
  const nodeDegrees = new Map<string, number>();
  allNodes.forEach((node) => {
    nodeDegrees.set(node.id, calculateNodeDegree(graph, node.id, weightFn));
  });

  // Initialize: Each node in its own community
  const nodeToCommunity = new Map<string, number>();
  const communities = new Map<number, LouvainCommunity>();
  let nextCommunityId = 0;

  allNodes.forEach((node) => {
    const communityId = nextCommunityId++;
    nodeToCommunity.set(node.id, communityId);

    const degree = nodeDegrees.get(node.id) || 0;
    communities.set(communityId, {
      id: communityId,
      nodes: new Set([node.id]),
      sigmaTot: degree,
      sigmaIn: 0, // No internal edges for single-node community
    });
  });

  // Calculate total edge weight (m)
  const m = calculateTotalEdgeWeight(graph, weightFn);
  if (m === 0) {
    // No edges - return each node as separate community
    return buildCommunityResults(graph, nodeToCommunity);
  }

  // Main optimization loop
  let improved = true;
  let outerIteration = 0;
  const MAX_OUTER_ITERATIONS = 10; // Limit outer loop iterations

  while (improved && outerIteration < MAX_OUTER_ITERATIONS) {
    improved = false;
    outerIteration++;

    // Phase 1: Local moving
    // Visit nodes in random order
    const nodeOrder = shuffleArray([...allNodes.map((n) => n.id)]);

    for (const nodeId of nodeOrder) {
      const currentCommunityId = nodeToCommunity.get(nodeId)!;
      const currentCommunity = communities.get(currentCommunityId)!;

      // Calculate weights to neighboring communities
      const neighborCommunities = findNeighborCommunities(
        graph,
        nodeId,
        nodeToCommunity,
        weightFn
      );

      // Find best community to move to
      let bestCommunityId = currentCommunityId;
      let bestDeltaQ = 0;

      for (const [neighborCommunityId, kIn] of neighborCommunities.entries()) {
        if (neighborCommunityId === currentCommunityId) {
          continue; // Skip current community
        }

        const neighborCommunity = communities.get(neighborCommunityId)!;
        const ki = nodeDegrees.get(nodeId) || 0;

        // Calculate modularity change
        const deltaQ = calculateModularityDelta(
          ki,
          kIn,
          neighborCommunity.sigmaTot,
          neighborCommunity.sigmaIn,
          m
        ) * resolution;

        if (deltaQ > bestDeltaQ) {
          bestDeltaQ = deltaQ;
          bestCommunityId = neighborCommunityId;
        }
      }

      // Move node if beneficial
      if (bestCommunityId !== currentCommunityId && bestDeltaQ > minModularityIncrease) {
        moveNode(
          nodeId,
          currentCommunityId,
          bestCommunityId,
          communities,
          nodeToCommunity,
          graph,
          weightFn,
          nodeDegrees
        );
        improved = true;
      }
    }

    // Remove empty communities
    removeEmptyCommunities(communities, nodeToCommunity);

    // If no improvement, we've reached a local optimum
    if (!improved) {
      break;
    }

    // Phase 2: Aggregation
    // Build super-graph where each community becomes a node
    // (For now, we'll skip multi-level optimization and return results)
    // TODO: Implement multi-level aggregation for better results
  }

  // Build final Community results
  return buildCommunityResults(graph, nodeToCommunity);
}

/**
 * Calculate total degree (sum of edge weights) for a node.
 */
function calculateNodeDegree<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  nodeId: string,
  weightFn: WeightFunction<N, E>
): number {
  let degree = 0;

  // Outgoing edges
  const outgoingResult = graph.getOutgoingEdges(nodeId);
  if (outgoingResult.ok) {
    outgoingResult.value.forEach((edge) => {
      const sourceOption = graph.getNode(edge.source);
      const targetOption = graph.getNode(edge.target);
      if (sourceOption.some && targetOption.some) {
        degree += weightFn(edge, sourceOption.value, targetOption.value);
      }
    });
  }

  // Incoming edges (for directed graphs)
  if (graph.isDirected()) {
    const allNodes = graph.getAllNodes();
    allNodes.forEach((node) => {
      const outgoingResult = graph.getOutgoingEdges(node.id);
      if (outgoingResult.ok) {
        outgoingResult.value.forEach((edge) => {
          if (edge.target === nodeId) {
            const sourceOption = graph.getNode(edge.source);
            const targetOption = graph.getNode(edge.target);
            if (sourceOption.some && targetOption.some) {
              degree += weightFn(edge, sourceOption.value, targetOption.value);
            }
          }
        });
      }
    });
  }

  return degree;
}

/**
 * Calculate total edge weight in graph.
 */
function calculateTotalEdgeWeight<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  weightFn: WeightFunction<N, E>
): number {
  let totalWeight = 0;

  const allNodes = graph.getAllNodes();
  allNodes.forEach((node) => {
    const outgoingResult = graph.getOutgoingEdges(node.id);
    if (outgoingResult.ok) {
      outgoingResult.value.forEach((edge) => {
        const sourceOption = graph.getNode(edge.source);
        const targetOption = graph.getNode(edge.target);
        if (sourceOption.some && targetOption.some) {
          totalWeight += weightFn(edge, sourceOption.value, targetOption.value);
        }
      });
    }
  });

  // For undirected graphs, we've counted each edge twice
  if (!graph.isDirected()) {
    totalWeight /= 2;
  }

  return totalWeight;
}

/**
 * Find neighboring communities and calculate edge weights to each.
 */
function findNeighborCommunities<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  nodeId: string,
  nodeToCommunity: Map<string, number>,
  weightFn: WeightFunction<N, E>
): Map<number, number> {
  const neighborCommunities = new Map<number, number>(); // communityId -> total weight

  // Outgoing edges
  const outgoingResult = graph.getOutgoingEdges(nodeId);
  if (outgoingResult.ok) {
    outgoingResult.value.forEach((edge) => {
      const neighborId = edge.target;
      const neighborCommunityId = nodeToCommunity.get(neighborId);
      if (neighborCommunityId !== undefined) {
        const sourceOption = graph.getNode(edge.source);
        const targetOption = graph.getNode(edge.target);
        if (sourceOption.some && targetOption.some) {
          const weight = weightFn(edge, sourceOption.value, targetOption.value);
          neighborCommunities.set(
            neighborCommunityId,
            (neighborCommunities.get(neighborCommunityId) || 0) + weight
          );
        }
      }
    });
  }

  // Incoming edges (for directed graphs)
  if (graph.isDirected()) {
    const allNodes = graph.getAllNodes();
    allNodes.forEach((node) => {
      const outgoingResult = graph.getOutgoingEdges(node.id);
      if (outgoingResult.ok) {
        outgoingResult.value.forEach((edge) => {
          if (edge.target === nodeId) {
            const neighborId = edge.source;
            const neighborCommunityId = nodeToCommunity.get(neighborId);
            if (neighborCommunityId !== undefined) {
              const sourceOption = graph.getNode(edge.source);
              const targetOption = graph.getNode(edge.target);
              if (sourceOption.some && targetOption.some) {
                const weight = weightFn(edge, sourceOption.value, targetOption.value);
                neighborCommunities.set(
                  neighborCommunityId,
                  (neighborCommunities.get(neighborCommunityId) || 0) + weight
                );
              }
            }
          }
        });
      }
    });
  }

  return neighborCommunities;
}

/**
 * Move a node from one community to another.
 */
function moveNode<N extends Node, E extends Edge>(
  nodeId: string,
  fromCommunityId: number,
  toCommunityId: number,
  communities: Map<number, LouvainCommunity>,
  nodeToCommunity: Map<string, number>,
  graph: Graph<N, E>,
  weightFn: WeightFunction<N, E>,
  nodeDegrees: Map<string, number>
): void {
  const fromCommunity = communities.get(fromCommunityId)!;
  const toCommunity = communities.get(toCommunityId)!;

  // Remove node from old community
  fromCommunity.nodes.delete(nodeId);

  // Update sigma_tot for old community
  const nodeDegree = nodeDegrees.get(nodeId) || 0;
  fromCommunity.sigmaTot -= nodeDegree;

  // Update sigma_in for old community (remove internal edges)
  const internalEdgesToOldCommunity = calculateInternalEdgeWeight(
    graph,
    nodeId,
    fromCommunity.nodes,
    weightFn
  );
  fromCommunity.sigmaIn -= internalEdgesToOldCommunity;

  // Add node to new community
  toCommunity.nodes.add(nodeId);
  toCommunity.sigmaTot += nodeDegree;

  // Update sigma_in for new community (add internal edges)
  const internalEdgesToNewCommunity = calculateInternalEdgeWeight(
    graph,
    nodeId,
    toCommunity.nodes,
    weightFn
  );
  toCommunity.sigmaIn += internalEdgesToNewCommunity;

  // Update node mapping
  nodeToCommunity.set(nodeId, toCommunityId);
}

/**
 * Calculate weight of edges from a node to nodes in a community.
 */
function calculateInternalEdgeWeight<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  nodeId: string,
  communityNodes: Set<string>,
  weightFn: WeightFunction<N, E>
): number {
  let weight = 0;

  // Outgoing edges
  const outgoingResult = graph.getOutgoingEdges(nodeId);
  if (outgoingResult.ok) {
    outgoingResult.value.forEach((edge) => {
      if (communityNodes.has(edge.target)) {
        const sourceOption = graph.getNode(edge.source);
        const targetOption = graph.getNode(edge.target);
        if (sourceOption.some && targetOption.some) {
          weight += weightFn(edge, sourceOption.value, targetOption.value);
        }
      }
    });
  }

  // Incoming edges (for directed graphs)
  if (graph.isDirected()) {
    const allNodes = graph.getAllNodes();
    allNodes.forEach((node) => {
      if (communityNodes.has(node.id)) {
        const outgoingResult = graph.getOutgoingEdges(node.id);
        if (outgoingResult.ok) {
          outgoingResult.value.forEach((edge) => {
            if (edge.target === nodeId) {
              const sourceOption = graph.getNode(edge.source);
              const targetOption = graph.getNode(edge.target);
              if (sourceOption.some && targetOption.some) {
                weight += weightFn(edge, sourceOption.value, targetOption.value);
              }
            }
          });
        }
      }
    });
  }

  return weight;
}

/**
 * Remove empty communities from the map.
 */
function removeEmptyCommunities(
  communities: Map<number, LouvainCommunity>,
  nodeToCommunity: Map<string, number>
): void {
  const emptyCommunityIds: number[] = [];

  communities.forEach((community, id) => {
    if (community.nodes.size === 0) {
      emptyCommunityIds.push(id);
    }
  });

  emptyCommunityIds.forEach((id) => {
    communities.delete(id);
  });
}

/**
 * Build final Community results from node-to-community mapping.
 */
function buildCommunityResults<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  nodeToCommunity: Map<string, number>
): Community<N>[] {
  // Group nodes by community
  const communityMap = new Map<number, Set<N>>();

  nodeToCommunity.forEach((communityId, nodeId) => {
    if (!communityMap.has(communityId)) {
      communityMap.set(communityId, new Set());
    }

    const nodeOption = graph.getNode(nodeId);
    if (nodeOption.some) {
      communityMap.get(communityId)!.add(nodeOption.value);
    }
  });

  // Build Community objects
  const communities: Community<N>[] = [];
  let communityIndex = 0;

  communityMap.forEach((nodes, originalId) => {
    const community: Community<N> = {
      id: communityIndex++,
      nodes,
      size: nodes.size,
      density: calculateDensity(graph, nodes),
      internalEdges: 0, // TODO: Calculate actual internal edges
      externalEdges: 0, // TODO: Calculate actual external edges
      modularity: 0, // TODO: Calculate per-community modularity
    };

    communities.push(community);
  });

  return communities;
}

/**
 * Fisher-Yates shuffle algorithm.
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
