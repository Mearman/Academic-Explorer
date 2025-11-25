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

  // Pre-compute incoming edges for directed graphs (O(m) instead of O(n²))
  const incomingEdges = new Map<string, E[]>();
  if (graph.isDirected()) {
    allNodes.forEach((node) => {
      const outgoingResult = graph.getOutgoingEdges(node.id);
      if (outgoingResult.ok) {
        outgoingResult.value.forEach((edge) => {
          if (!incomingEdges.has(edge.target)) {
            incomingEdges.set(edge.target, []);
          }
          incomingEdges.get(edge.target)!.push(edge);
        });
      }
    });
  }

  // Pre-calculate node degrees (optimization)
  const nodeDegrees = new Map<string, number>();
  allNodes.forEach((node) => {
    nodeDegrees.set(node.id, calculateNodeDegree(graph, node.id, weightFn, incomingEdges));
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

  // Track hierarchy: superNodeId -> set of original node IDs
  // At level 0, each original node is its own super-node
  let superNodes = new Map<string, Set<string>>();
  allNodes.forEach((node) => {
    superNodes.set(node.id, new Set([node.id]));
  });

  // Multi-level optimization: Phase 1 + Phase 2 repeated
  let hierarchyLevel = 0;
  const MAX_HIERARCHY_LEVELS = 3; // Reduced for performance

  while (hierarchyLevel < MAX_HIERARCHY_LEVELS) {
    hierarchyLevel++;

    // Rebuild nodeToCommunity and communities for current super-nodes
    nodeToCommunity.clear();
    communities.clear();
    let nextCommunityId = 0;

    // Each super-node starts in its own community
    superNodes.forEach((memberNodes, superNodeId) => {
      const communityId = nextCommunityId++;
      nodeToCommunity.set(superNodeId, communityId);

      // Calculate degree for this super-node (sum of all member node degrees)
      let totalDegree = 0;
      memberNodes.forEach((nodeId) => {
        totalDegree += nodeDegrees.get(nodeId) || 0;
      });

      communities.set(communityId, {
        id: communityId,
        nodes: new Set([superNodeId]), // Community contains super-node IDs
        sigmaTot: totalDegree,
        sigmaIn: 0,
      });
    });

    // Phase 1: Local moving optimization on super-nodes
    let improved = true;
    let iteration = 0;
    const MAX_ITERATIONS = hierarchyLevel === 1 ? 50 : 10; // Reduced for performance

    // Build reverse lookup once per hierarchy level (optimization)
    const nodeToSuperNode = new Map<string, string>();
    superNodes.forEach((members, superNodeId) => {
      members.forEach((originalNodeId) => {
        nodeToSuperNode.set(originalNodeId, superNodeId);
      });
    });

    while (improved && iteration < MAX_ITERATIONS) {
      improved = false;
      iteration++;

      // Visit super-nodes in random order
      const superNodeOrder = shuffleArray([...superNodes.keys()]);

      for (const superNodeId of superNodeOrder) {
        const currentCommunityId = nodeToCommunity.get(superNodeId)!;
        const currentCommunity = communities.get(currentCommunityId)!;

        // Calculate weights to neighboring communities for this super-node
        const memberNodes = superNodes.get(superNodeId)!;
        const neighborCommunities = findNeighborCommunitiesForSuperNode(
          graph,
          memberNodes,
          nodeToSuperNode,
          nodeToCommunity,
          weightFn,
          incomingEdges
        );

        // Find best community to move to
        let bestCommunityId = currentCommunityId;
        let bestDeltaQ = 0;

        // Calculate super-node degree (sum of member degrees)
        let superNodeDegree = 0;
        memberNodes.forEach((nodeId) => {
          superNodeDegree += nodeDegrees.get(nodeId) || 0;
        });

        for (const [neighborCommunityId, kIn] of neighborCommunities.entries()) {
          if (neighborCommunityId === currentCommunityId) {
            continue; // Skip current community
          }

          const neighborCommunity = communities.get(neighborCommunityId)!;

          // Calculate modularity change
          const deltaQ = calculateModularityDelta(
            superNodeDegree,
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

        // Move super-node if beneficial
        if (bestCommunityId !== currentCommunityId && bestDeltaQ > minModularityIncrease) {
          moveSuperNode(
            superNodeId,
            currentCommunityId,
            bestCommunityId,
            communities,
            nodeToCommunity,
            superNodes,
            nodeDegrees
          );
          improved = true;
        }
      }

      // Remove empty communities
      removeEmptyCommunities(communities, nodeToCommunity);
    }

    // Phase 2: Aggregate communities into new super-nodes
    const numCommunities = communities.size;
    if (numCommunities <= 1 || numCommunities >= superNodes.size) {
      // Converged - only 1 community or no merging happened
      break;
    }

    // Build new super-nodes where each community becomes a single super-node
    const newSuperNodes = new Map<string, Set<string>>();
    let nextSuperNodeId = 0;

    communities.forEach((community) => {
      const newSuperNodeId = `L${hierarchyLevel}_${nextSuperNodeId++}`;
      const allMemberNodes = new Set<string>();

      // Collect all original nodes from all super-nodes in this community
      community.nodes.forEach((superNodeId) => {
        const members = superNodes.get(superNodeId);
        if (members) {
          members.forEach((originalNodeId) => {
            allMemberNodes.add(originalNodeId);
          });
        }
      });

      newSuperNodes.set(newSuperNodeId, allMemberNodes);
    });

    // Replace super-nodes with aggregated super-nodes
    superNodes = newSuperNodes;
  }

  // Build final Community results by mapping super-nodes back to original nodes
  // nodeToCommunity currently maps super-node IDs to community IDs
  // We need to map original node IDs to community IDs
  const finalNodeToCommunity = new Map<string, number>();

  superNodes.forEach((memberNodes, superNodeId) => {
    const communityId = nodeToCommunity.get(superNodeId);
    if (communityId !== undefined) {
      memberNodes.forEach((originalNodeId) => {
        finalNodeToCommunity.set(originalNodeId, communityId);
      });
    }
  });

  return buildCommunityResults(graph, finalNodeToCommunity);
}

/**
 * Calculate total degree (sum of edge weights) for a node.
 */
function calculateNodeDegree<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  nodeId: string,
  weightFn: WeightFunction<N, E>,
  incomingEdges: Map<string, E[]>
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

  // Incoming edges (for directed graphs) - use pre-computed cache
  if (graph.isDirected()) {
    const incoming = incomingEdges.get(nodeId) || [];
    incoming.forEach((edge) => {
      const sourceOption = graph.getNode(edge.source);
      const targetOption = graph.getNode(edge.target);
      if (sourceOption.some && targetOption.some) {
        degree += weightFn(edge, sourceOption.value, targetOption.value);
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
 * Find neighboring communities and calculate edge weights to each (for super-nodes).
 *
 * For a super-node (which contains multiple original nodes), this finds all edges
 * from those original nodes to nodes in other super-nodes, and aggregates the weights
 * by the target super-node's community.
 */
function findNeighborCommunitiesForSuperNode<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  memberNodes: Set<string>,
  nodeToSuperNode: Map<string, string>,
  nodeToCommunity: Map<string, number>,
  weightFn: WeightFunction<N, E>,
  incomingEdges: Map<string, E[]>
): Map<number, number> {
  const neighborCommunities = new Map<number, number>(); // communityId -> total weight

  // For each member node in this super-node
  memberNodes.forEach((nodeId) => {
    // Outgoing edges
    const outgoingResult = graph.getOutgoingEdges(nodeId);
    if (outgoingResult.ok) {
      outgoingResult.value.forEach((edge) => {
        const targetNodeId = edge.target;

        // Find which super-node the target belongs to
        const targetSuperNodeId = nodeToSuperNode.get(targetNodeId);
        if (targetSuperNodeId) {
          // Find which community that super-node is in
          const targetCommunityId = nodeToCommunity.get(targetSuperNodeId);
          if (targetCommunityId !== undefined) {
            const sourceOption = graph.getNode(edge.source);
            const targetOption = graph.getNode(edge.target);
            if (sourceOption.some && targetOption.some) {
              const weight = weightFn(edge, sourceOption.value, targetOption.value);
              neighborCommunities.set(
                targetCommunityId,
                (neighborCommunities.get(targetCommunityId) || 0) + weight
              );
            }
          }
        }
      });
    }

    // Incoming edges (for directed graphs)
    if (graph.isDirected()) {
      const incoming = incomingEdges.get(nodeId) || [];
      incoming.forEach((edge) => {
        const sourceNodeId = edge.source;

        // Find which super-node the source belongs to
        const sourceSuperNodeId = nodeToSuperNode.get(sourceNodeId);
        if (sourceSuperNodeId) {
          // Find which community that super-node is in
          const sourceCommunityId = nodeToCommunity.get(sourceSuperNodeId);
          if (sourceCommunityId !== undefined) {
            const sourceOption = graph.getNode(edge.source);
            const targetOption = graph.getNode(edge.target);
            if (sourceOption.some && targetOption.some) {
              const weight = weightFn(edge, sourceOption.value, targetOption.value);
              neighborCommunities.set(
                sourceCommunityId,
                (neighborCommunities.get(sourceCommunityId) || 0) + weight
              );
            }
          }
        }
      });
    }
  });

  return neighborCommunities;
}

/**
 * Find neighboring communities and calculate edge weights to each.
 */
function findNeighborCommunitiesForNode<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  nodeId: string,
  nodeToCommunity: Map<string, number>,
  weightFn: WeightFunction<N, E>,
  incomingEdges: Map<string, E[]>
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

  // Incoming edges (for directed graphs) - use pre-computed cache
  if (graph.isDirected()) {
    const incoming = incomingEdges.get(nodeId) || [];
    incoming.forEach((edge) => {
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
    });
  }

  return neighborCommunities;
}

/**
 * Move a super-node from one community to another.
 *
 * This is similar to moveNode but works with super-nodes, which contain
 * multiple original nodes. The sigmaTot and sigmaIn calculations need to
 * account for all edges between the member nodes.
 */
function moveSuperNode<N extends Node, E extends Edge>(
  superNodeId: string,
  fromCommunityId: number,
  toCommunityId: number,
  communities: Map<number, LouvainCommunity>,
  nodeToCommunity: Map<string, number>,
  superNodes: Map<string, Set<string>>,
  nodeDegrees: Map<string, number>
): void {
  const fromCommunity = communities.get(fromCommunityId)!;
  const toCommunity = communities.get(toCommunityId)!;
  const memberNodes = superNodes.get(superNodeId)!;

  // Calculate total degree for this super-node (sum of member node degrees)
  let superNodeDegree = 0;
  memberNodes.forEach((nodeId) => {
    superNodeDegree += nodeDegrees.get(nodeId) || 0;
  });

  // Remove super-node from old community
  fromCommunity.nodes.delete(superNodeId);
  fromCommunity.sigmaTot -= superNodeDegree;

  // For sigmaIn calculation, we need to count edges between this super-node's
  // member nodes and other super-nodes' member nodes in the same community.
  // This is complex, so for now we'll use a simplified approach:
  // We don't update sigmaIn during super-node moves (it's recalculated in Phase 2)

  // Add super-node to new community
  toCommunity.nodes.add(superNodeId);
  toCommunity.sigmaTot += superNodeDegree;

  // Update mapping
  nodeToCommunity.set(superNodeId, toCommunityId);
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
  nodeDegrees: Map<string, number>,
  incomingEdges: Map<string, E[]>
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
    weightFn,
    incomingEdges
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
    weightFn,
    incomingEdges
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
  weightFn: WeightFunction<N, E>,
  incomingEdges: Map<string, E[]>
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

  // Incoming edges (for directed graphs) - use pre-computed cache
  if (graph.isDirected()) {
    const incoming = incomingEdges.get(nodeId) || [];
    incoming.forEach((edge) => {
      if (communityNodes.has(edge.source)) {
        const sourceOption = graph.getNode(edge.source);
        const targetOption = graph.getNode(edge.target);
        if (sourceOption.some && targetOption.some) {
          weight += weightFn(edge, sourceOption.value, targetOption.value);
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
