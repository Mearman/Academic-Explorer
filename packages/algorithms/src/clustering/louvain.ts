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
import type { Community, LouvainConfiguration, AlteredCommunitiesState, CommunityHashTable } from '../types/clustering-types';
import type { WeightFunction } from '../types/weight-function';
import { calculateModularityDelta } from '../metrics/modularity';
import { calculateDensity } from '../metrics/cluster-quality';
import { convertToCSR, type CSRGraph } from '../utils/csr';

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
 * Get adaptive convergence threshold based on graph size.
 *
 * @param nodeCount - Number of nodes in graph
 * @returns Convergence threshold (1e-5 for large graphs, 1e-6 for small graphs)
 *
 * @remarks
 * Large graphs (>500 nodes) use looser threshold for faster convergence.
 * Small graphs (≤500 nodes) use stricter threshold for higher quality.
 *
 * @since Phase 1 (spec-027)
 */
export function getAdaptiveThreshold(nodeCount: number): number {
  return nodeCount > 500 ? 1e-5 : 1e-6;
}

/**
 * Get adaptive iteration limit based on graph size and hierarchy level.
 *
 * @param nodeCount - Number of nodes in graph
 * @param level - Hierarchy level (0 = first level)
 * @returns Maximum iterations (20, 40, or 50)
 *
 * @remarks
 * First hierarchy level (level 0) with large graphs (>200 nodes) uses lower limit (20)
 * because most node movements happen in the first iteration.
 * Subsequent levels and small graphs use higher limits (40-50) for refinement.
 *
 * @since Phase 1 (spec-027)
 */
export function getAdaptiveIterationLimit(nodeCount: number, level: number): number {
  if (level === 0 && nodeCount > 200) {
    return 20;
  }
  return nodeCount < 100 ? 50 : 40;
}

/**
 * Determine optimal neighbor selection mode based on graph size.
 *
 * @param nodeCount - Number of nodes in graph
 * @returns Neighbor selection mode ("best" or "random")
 *
 * @remarks
 * **UPDATE (Phase 4 debugging)**: Random mode disabled for citation networks.
 *
 * Testing revealed Fast Louvain random-neighbor selection causes severe quality degradation
 * for citation network graphs (Q=0.05-0.12 vs Q=0.37 with best mode), failing the minimum
 * quality threshold of Q≥0.19. Random mode also paradoxically SLOWED convergence (201 iterations
 * vs 103 with best mode), resulting in 3x slower runtime.
 *
 * Root cause: Citation networks have different structural properties than the social/web networks
 * where Fast Louvain was benchmarked in literature. Accepting first positive ΔQ leads to poor-quality
 * moves that require many iterations to correct.
 *
 * **Current strategy**: Always use best-neighbor mode for quality. Random mode remains available
 * via explicit `mode: "random"` parameter for experimentation but is not recommended.
 *
 * @since Phase 4 (spec-027, Fast Louvain)
 */
export function determineOptimalMode(nodeCount: number): "best" | "random" {
  // Always use best mode after Phase 4 debugging
  // Random mode caused quality loss (Q: 0.37 → 0.05) and slower convergence (103 → 201 iterations)
  return "best";

  // Original auto mode logic (disabled):
  // if (nodeCount < 200) return "best";
  // if (nodeCount >= 500) return "random";
  // return "best"; // Medium graphs (200-499) default to quality
}

/**
 * Shuffle an array in-place using Fisher-Yates algorithm.
 *
 * @param array - Array to shuffle (modified in-place)
 * @param seed - Optional random seed for deterministic shuffling (for tests)
 * @returns The shuffled array (same reference as input)
 *
 * @remarks
 * Fisher-Yates shuffle guarantees uniform distribution of permutations.
 * If seed is provided, uses simple linear congruential generator (LCG) for PRNG.
 * If seed is undefined, uses Math.random() (non-deterministic).
 *
 * LCG parameters: a=1664525, c=1013904223, m=2^32 (Numerical Recipes)
 *
 * @since Phase 4 (spec-027, Fast Louvain)
 */
export function shuffle<T>(array: T[], seed?: number): T[] {
  let rng: () => number;

  if (seed !== undefined) {
    // Deterministic PRNG for reproducible tests
    let state = seed;
    rng = () => {
      state = (1664525 * state + 1013904223) >>> 0; // LCG: a=1664525, c=1013904223, m=2^32
      return state / 0x100000000; // Normalize to [0, 1)
    };
  } else {
    // Non-deterministic for production
    rng = Math.random;
  }

  // Fisher-Yates shuffle
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

/**
 * Get nodes to visit based on altered communities heuristic.
 *
 * @param alteredState - Altered communities state tracking
 * @param superNodes - Map of super-node ID → set of original node IDs
 * @param nodeToCommunity - Map of super-node ID → community ID
 * @param graph - Input graph
 * @param nodeToSuperNode - Map of original node ID → super-node ID
 * @param incomingEdges - Pre-computed incoming edges map
 * @returns Set of super-node IDs that should be checked for movement
 *
 * @remarks
 * Returns nodes in altered communities plus their neighbors (nodes with edges to/from altered communities).
 * This reduces redundant computation by only revisiting nodes likely to move.
 *
 * **First Iteration**: alteredCommunities contains all community IDs → returns all nodes
 * **Subsequent Iterations**: Only returns nodes in changed communities + their neighbors
 *
 * @since Phase 4 (spec-027, Altered Communities)
 */
function getNodesToVisit<N extends Node, E extends Edge>(
  alteredState: AlteredCommunitiesState,
  superNodes: Map<string, Set<string>>,
  nodeToCommunity: Map<string, number>,
  graph: Graph<N, E>,
  nodeToSuperNode: Map<string, string>,
  incomingEdges: Map<string, E[]>
): Set<string> {
  const nodesToVisit = new Set<string>();

  // If no communities altered, return empty set (early termination will handle this)
  if (alteredState.alteredCommunities.size === 0) {
    return nodesToVisit;
  }

  // Add all super-nodes in altered communities
  superNodes.forEach((memberNodes, superNodeId) => {
    const communityId = nodeToCommunity.get(superNodeId);
    if (communityId !== undefined && alteredState.alteredCommunities.has(communityId)) {
      nodesToVisit.add(superNodeId);
    }
  });

  // Add neighbors of nodes in altered communities
  // For each super-node in altered communities, find its neighbors and add them
  const alteredSuperNodes = new Set(nodesToVisit);
  alteredSuperNodes.forEach((superNodeId) => {
    const memberNodes = superNodes.get(superNodeId);
    if (!memberNodes) return;

    // For each original node in this super-node, find its neighbors
    memberNodes.forEach((nodeId) => {
      // Outgoing edges
      const outgoingResult = graph.getOutgoingEdges(nodeId);
      if (outgoingResult.ok) {
        outgoingResult.value.forEach((edge) => {
          const targetSuperNode = nodeToSuperNode.get(edge.target);
          if (targetSuperNode) {
            nodesToVisit.add(targetSuperNode);
          }
        });
      }

      // Incoming edges (for directed graphs)
      if (graph.isDirected()) {
        const incoming = incomingEdges.get(nodeId) || [];
        incoming.forEach((edge) => {
          const sourceSuperNode = nodeToSuperNode.get(edge.source);
          if (sourceSuperNode) {
            nodesToVisit.add(sourceSuperNode);
          }
        });
      }
    });
  });

  return nodesToVisit;
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
 * @param options - Optional configuration (combines legacy and optimization parameters)
 * @param options.weightFn - Weight function for edges (default: all edges weight 1.0) [Legacy]
 * @param options.resolution - Resolution parameter (default: 1.0, higher values favor more communities) [Legacy]
 * @param options.mode - Neighbor selection strategy ("auto", "best", "random") [spec-027 Phase 2]
 * @param options.seed - Random seed for deterministic shuffling [spec-027 Phase 2]
 * @param options.minModularityIncrease - Minimum modularity improvement to continue (adaptive default via getAdaptiveThreshold)
 * @param options.maxIterations - Maximum iterations per phase (adaptive default via getAdaptiveIterationLimit)
 * @returns Array of detected communities
 *
 * @remarks
 * **Adaptive Defaults** (spec-027 Phase 1):
 * - `minModularityIncrease`: 1e-5 for >500 nodes, 1e-6 otherwise
 * - `maxIterations`: 20 for >200 nodes (level 0), 40-50 otherwise
 *
 * **Neighbor Selection Modes** (spec-027 Phase 2):
 * - `"auto"`: Best-neighbor for <200 nodes, random for ≥500 nodes
 * - `"best"`: Always use best-neighbor (quality-first)
 * - `"random"`: Always use random-neighbor (speed-first, Fast Louvain)
 *
 * @example
 * ```typescript
 * const graph = new Graph<PaperNode, CitationEdge>(true);
 * // ... add nodes and edges ...
 *
 * // Basic usage (adaptive defaults)
 * const communities = detectCommunities(graph);
 * console.log(`Found ${communities.length} communities`);
 *
 * // Quality-first mode
 * const qualityCommunities = detectCommunities(graph, { mode: "best" });
 *
 * // Speed-first mode for large graphs
 * const fastCommunities = detectCommunities(graph, { mode: "random", maxIterations: 10 });
 *
 * // Reproducible results
 * const deterministicCommunities = detectCommunities(graph, { seed: 42 });
 * ```
 */
export function detectCommunities<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  options: {
    weightFn?: WeightFunction<N, E>;
    resolution?: number;
    mode?: "auto" | "best" | "random";
    seed?: number;
    minModularityIncrease?: number;
    maxIterations?: number;
  } = {}
): Community<N>[] {
  // T014: Runtime tracking (spec-027 Phase 1)
  const startTime = performance.now();

  const {
    weightFn = () => 1.0,
    resolution = 1.0,
    minModularityIncrease,
    maxIterations = 100,
  } = options;

  // Handle empty graph
  const allNodes = graph.getAllNodes();
  if (allNodes.length === 0) {
    return [];
  }

  // T042: Convert to CSR format for better cache locality (spec-027 Phase 5)
  let csrGraph: CSRGraph<N, E> | null = null;
  try {
    csrGraph = convertToCSR(graph);
  } catch (error) {
    // If CSR conversion fails (e.g., graph too large for typed arrays),
    // fall back to using original Graph API
    if (error instanceof RangeError) {
      console.warn(
        `CSR conversion failed (${error.message}). ` +
        `Falling back to Map-based adjacency list.`
      );
    } else {
      // Unexpected error, re-throw
      throw error;
    }
  }

  // T015: Iteration count tracking (spec-027 Phase 1)
  let totalIterations = 0;

  // T025: Resolve neighbor selection mode (spec-027 Phase 4)
  const { mode = "auto", seed } = options;
  const resolvedMode: "best" | "random" = mode === "auto"
    ? determineOptimalMode(allNodes.length)
    : mode;

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

  // Adaptive strategy: Use hierarchical optimization only for larger graphs
  // Very small graphs (<= 50 nodes) get sufficient quality with single-level optimization
  const nodeCount = allNodes.length;
  const useHierarchicalOptimization = nodeCount > 50;

  // T010: Adaptive modularity threshold using helper function (spec-027 Phase 1)
  const adaptiveMinModularityIncrease = minModularityIncrease ??
    getAdaptiveThreshold(nodeCount);

  // Multi-level optimization: Phase 1 + Phase 2 repeated
  let hierarchyLevel = 0;
  const MAX_HIERARCHY_LEVELS = useHierarchicalOptimization ? 3 : 1;

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

    // T012: Adaptive iteration limits using helper function (spec-027 Phase 1)
    // hierarchyLevel starts at 1, but helper expects 0-based (level 0 = first iteration)
    const MAX_ITERATIONS = maxIterations ?? getAdaptiveIterationLimit(nodeCount, hierarchyLevel - 1);

    // Build reverse lookup once per hierarchy level (optimization)
    const nodeToSuperNode = new Map<string, string>();
    superNodes.forEach((members, superNodeId) => {
      members.forEach((originalNodeId) => {
        nodeToSuperNode.set(originalNodeId, superNodeId);
      });
    });

    let consecutiveNoImprovementRounds = 0;
    // Aggressive early stopping: 2 rounds for large graphs, 3 for small
    const MAX_NO_IMPROVEMENT_ROUNDS = nodeCount > 500 ? 2 : 3;

    // T051: Initialize community edge weight cache (spec-027 Phase 5)
    // DISABLED: Cache adds overhead without benefit (see spec-027 Phase 5 checkpoint)
    // const communityCache: CommunityHashTable = new Map();

    // T028-T031: Altered communities heuristic (spec-027 Phase 4) - DISABLED
    // Testing showed NO performance benefit for citation networks:
    // - Best mode only: 5.67s for 1000 nodes, Q=0.3718
    // - Best + altered communities: 11.33s for 1000 nodes, Q=0.3720
    // Overhead of tracking/filtering outweighs benefit. Community structure changes
    // too much in early iterations, keeping altered set large.
    //
    // const alteredState: AlteredCommunitiesState = {
    //   alteredCommunities: new Set(communities.keys()),
    // };

    while (improved && iteration < MAX_ITERATIONS) {
      improved = false;
      iteration++;
      let movesThisRound = 0;

      // Visit all super-nodes (altered communities disabled - no benefit)
      const nodesToVisit = new Set(superNodes.keys());

      // Visit nodes in random order
      const superNodeOrder = shuffleArray([...nodesToVisit]);

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
          incomingEdges,
          csrGraph // T046: Pass CSR graph for optimized neighbor iteration
        );

        // T022-T024: Find best community to move to (spec-027 Phase 4)
        // Mode-based neighbor selection: "best" evaluates all, "random" accepts first positive
        let bestCommunityId = currentCommunityId;
        let bestDeltaQ = 0;

        // Calculate super-node degree (sum of member degrees)
        let superNodeDegree = 0;
        memberNodes.forEach((nodeId) => {
          superNodeDegree += nodeDegrees.get(nodeId) || 0;
        });

        // Convert neighbor communities to array for mode-based processing
        const neighborList = Array.from(neighborCommunities.entries());

        if (resolvedMode === "random") {
          // T024: Random-neighbor mode (Fast Louvain) - shuffle and accept first positive ΔQ
          const shuffledNeighbors = shuffle(neighborList, seed);

          for (const [neighborCommunityId, kIn] of shuffledNeighbors) {
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

            // Accept first positive modularity gain (Fast Louvain)
            if (deltaQ > adaptiveMinModularityIncrease) {
              bestDeltaQ = deltaQ;
              bestCommunityId = neighborCommunityId;
              break; // Early exit - accept first improvement
            }
          }
        } else {
          // T023: Best-neighbor mode - evaluate all neighbors, select maximum ΔQ
          for (const [neighborCommunityId, kIn] of neighborList) {
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

            // Track best community (maximum ΔQ)
            if (deltaQ > bestDeltaQ) {
              bestDeltaQ = deltaQ;
              bestCommunityId = neighborCommunityId;
            }
          }
        }

        // Move super-node if beneficial
        if (bestCommunityId !== currentCommunityId && bestDeltaQ > adaptiveMinModularityIncrease) {
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
          movesThisRound++;

          // T053: Invalidate cache entries for affected communities (spec-027 Phase 5)
          // DISABLED: Cache not in use (see spec-027 Phase 5 checkpoint)
          // invalidateCommunityCache(communityCache, currentCommunityId);
          // invalidateCommunityCache(communityCache, bestCommunityId);

          // T030: Altered communities population (spec-027 Phase 4) - DISABLED (no benefit)
          // alteredState.alteredCommunities.add(currentCommunityId); // Source community
          // alteredState.alteredCommunities.add(bestCommunityId);    // Target community
        }
      }

      // Remove empty communities
      removeEmptyCommunities(communities, nodeToCommunity);

      // T013: Early convergence detection (spec-027 Phase 1)
      // Already implemented: aggressive early stopping for large graphs
      if (movesThisRound === 0) {
        consecutiveNoImprovementRounds++;
        if (consecutiveNoImprovementRounds >= MAX_NO_IMPROVEMENT_ROUNDS) {
          break; // Converged - no point continuing
        }
      } else {
        consecutiveNoImprovementRounds = 0;
      }
    }

    // T015: Accumulate iterations across hierarchy levels (spec-027 Phase 1)
    totalIterations += iteration;

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

  // T014 & T015: Log performance metrics (spec-027 Phase 1 & Phase 4)
  const endTime = performance.now();
  const runtime = endTime - startTime;
  console.log(`[spec-027] Louvain completed in ${runtime.toFixed(2)}ms (${(runtime / 1000).toFixed(2)}s)`);
  console.log(`[spec-027] Total iterations: ${totalIterations} across ${hierarchyLevel} hierarchy levels`);
  console.log(`[spec-027] Adaptive threshold: ${adaptiveMinModularityIncrease.toExponential(1)}`);
  console.log(`[spec-027] Neighbor selection mode: ${resolvedMode} (requested: ${mode})`);

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
 * Generate cache key for community pair edge weight lookup.
 *
 * @param fromId - Source community ID
 * @param toId - Target community ID
 * @returns Cache key string in format "fromId-toId"
 *
 * @remarks
 * Used to create unique keys for CommunityHashTable lookups.
 * Key format enables O(1) cache access for community edge weights during ΔQ calculations.
 *
 * @since Phase 5 (spec-027, T048)
 */
function communityKey(fromId: number, toId: number): string {
  return `${fromId}-${toId}`;
}

/**
 * Get total edge weight from one community to another with lazy caching.
 *
 * @param cache - Community edge weight cache
 * @param fromCommunity - Source community ID
 * @param toCommunity - Target community ID
 * @param csrGraph - CSR graph representation
 * @param nodeToCommunity - Map from node ID to community ID
 * @param communities - Map from community ID to set of node IDs
 * @returns Total weight of edges from fromCommunity to toCommunity
 *
 * @remarks
 * **Cache Strategy**:
 * - Cache hit: Return cached value (O(1))
 * - Cache miss: Calculate via CSR iteration, populate cache, return value
 *
 * **Algorithm** (on cache miss):
 * 1. For each node in fromCommunity
 * 2. Iterate through CSR neighbors using offsets/edges/weights
 * 3. Sum weights for neighbors in toCommunity
 * 4. Store result in cache for future lookups
 *
 * **Performance**:
 * - Expected cache hit rate: >80% after first iteration
 * - Cache hit: O(1), Cache miss: O(E_community) where E_community = edges from fromCommunity
 *
 * @since Phase 5 (spec-027, T049)
 */
function getCommunityEdgeWeight<N extends Node, E extends Edge>(
  cache: CommunityHashTable,
  fromCommunity: number,
  toCommunity: number,
  csrGraph: CSRGraph<N, E>,
  nodeToCommunity: Map<string, number>,
  communities: Map<number, Set<string>>
): number {
  // Check cache first
  const key = communityKey(fromCommunity, toCommunity);
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  // Cache miss: calculate edge weight
  let totalWeight = 0;

  const fromNodes = communities.get(fromCommunity);
  if (!fromNodes) {
    // Empty community - cache and return 0
    cache.set(key, 0);
    return 0;
  }

  // For each node in source community
  for (const nodeId of fromNodes) {
    const nodeIdx = csrGraph.nodeIndex.get(nodeId);
    if (nodeIdx === undefined) continue;

    const start = csrGraph.offsets[nodeIdx];
    const end = csrGraph.offsets[nodeIdx + 1];

    // Iterate through CSR-packed neighbors
    for (let i = start; i < end; i++) {
      const targetIdx = csrGraph.edges[i];
      const targetNodeId = csrGraph.nodeIds[targetIdx];
      const targetCommunity = nodeToCommunity.get(targetNodeId);

      // If neighbor is in target community, add edge weight
      if (targetCommunity === toCommunity) {
        totalWeight += csrGraph.weights[i];
      }
    }
  }

  // Populate cache and return
  cache.set(key, totalWeight);
  return totalWeight;
}

/**
 * Invalidate cache entries involving a specific community.
 *
 * @param cache - Community edge weight cache
 * @param communityId - Community ID whose cache entries should be invalidated
 *
 * @remarks
 * When a node moves from one community to another, edge weights to/from both
 * affected communities change. This function removes all cache entries where
 * communityId appears as either source or target.
 *
 * **Algorithm**:
 * 1. Iterate through all cache keys in format "fromId-toId"
 * 2. Parse fromId and toId from each key
 * 3. Delete entry if either fromId or toId equals communityId
 *
 * **Performance**: O(C²) where C = number of communities (cache size)
 * - Typically C << N (nodes), so this is acceptable
 * - Called once per node move in local moving phase
 *
 * @since Phase 5 (spec-027, T050)
 */
function invalidateCommunityCache(
  cache: CommunityHashTable,
  communityId: number
): void {
  const keysToDelete: string[] = [];

  // Collect keys to delete (can't delete during iteration)
  for (const key of cache.keys()) {
    const parts = key.split('-');
    if (parts.length === 2) {
      const fromId = parseInt(parts[0], 10);
      const toId = parseInt(parts[1], 10);

      // Delete if communityId appears in either position
      if (fromId === communityId || toId === communityId) {
        keysToDelete.push(key);
      }
    }
  }

  // Delete collected keys
  for (const key of keysToDelete) {
    cache.delete(key);
  }
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
  incomingEdges: Map<string, E[]>,
  csrGraph: CSRGraph<N, E> | null = null
): Map<number, number> {
  const neighborCommunities = new Map<number, number>(); // communityId -> total weight

  // For each member node in this super-node
  memberNodes.forEach((nodeId) => {
    // T044-T046: Use CSR for neighbor iteration when available (spec-027 Phase 5)
    if (csrGraph) {
      const nodeIdx = csrGraph.nodeIndex.get(nodeId);
      if (nodeIdx !== undefined) {
        const start = csrGraph.offsets[nodeIdx];
        const end = csrGraph.offsets[nodeIdx + 1];

        // Iterate through CSR-packed neighbors
        for (let i = start; i < end; i++) {
          const targetIdx = csrGraph.edges[i];
          const targetNodeId = csrGraph.nodeIds[targetIdx];
          const weight = csrGraph.weights[i]; // Use CSR weight (assumes weightFn returns edge.weight)

          // Find which super-node the target belongs to
          const targetSuperNodeId = nodeToSuperNode.get(targetNodeId);
          if (targetSuperNodeId) {
            const targetCommunityId = nodeToCommunity.get(targetSuperNodeId);
            if (targetCommunityId !== undefined) {
              neighborCommunities.set(
                targetCommunityId,
                (neighborCommunities.get(targetCommunityId) || 0) + weight
              );
            }
          }
        }
      }
    } else {
      // Fallback: Original Map-based iteration
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

  // Calculate internal edges for each community efficiently (O(E) instead of O(V²))
  // sigmaIn[communityId] = sum of edge weights within community
  const sigmaIn = new Map<number, number>();
  communityMap.forEach((_, communityId) => {
    sigmaIn.set(communityId, 0);
  });

  // Iterate through all edges once
  const allEdges = graph.getAllEdges();
  allEdges.forEach((edge) => {
    const sourceCommunity = nodeToCommunity.get(edge.source);
    const targetCommunity = nodeToCommunity.get(edge.target);

    if (sourceCommunity === undefined || targetCommunity === undefined) {
      return; // Skip edges with unmapped nodes
    }

    if (sourceCommunity === targetCommunity) {
      // Internal edge - count it
      const weight = (edge as { weight?: number }).weight ?? 1.0;
      sigmaIn.set(sourceCommunity, sigmaIn.get(sourceCommunity)! + weight);
    }
  });

  // Build Community objects
  const communities: Community<N>[] = [];
  let communityIndex = 0;

  communityMap.forEach((nodes, originalId) => {
    const n = nodes.size;
    const internalEdgeWeight = sigmaIn.get(originalId) ?? 0;

    // Calculate density from cached edge counts
    // density = actualEdges / possibleEdges
    // For undirected: actualEdges = sigmaIn / 2, possibleEdges = n * (n - 1) / 2
    // Simplified: density = sigmaIn / (n * (n - 1))
    let density = 0.0;
    if (n > 1) {
      const possibleEdges = graph.isDirected()
        ? n * (n - 1)              // Directed: all ordered pairs
        : (n * (n - 1)) / 2;       // Undirected: combinations

      const actualEdges = graph.isDirected()
        ? internalEdgeWeight       // Directed: count as-is
        : internalEdgeWeight / 2;  // Undirected: each edge counted twice

      density = actualEdges / possibleEdges;
      density = Math.max(0.0, Math.min(1.0, density)); // Clamp to [0, 1]
    }

    const community: Community<N> = {
      id: communityIndex++,
      nodes,
      size: n,
      density,
      internalEdges: 0, // TODO: Calculate actual internal edges count
      externalEdges: 0, // TODO: Calculate actual external edges count
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
