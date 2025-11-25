/**
 * Known community graph fixtures for validating clustering algorithm correctness.
 * Provides graphs with ground truth community labels for accuracy testing.
 *
 * @module fixtures/known-clusters
 */

import { Graph } from '../../src/graph/graph';

/**
 * Node with known ground truth community assignment.
 */
export interface ClusterNode {
  id: string;
  label: string;
  community: number; // Ground truth community assignment
}

/**
 * Edge with optional weight for weighted clustering algorithms.
 */
export interface ClusterEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

/**
 * Ground truth community structure for validation.
 */
export interface GroundTruth {
  /** Number of communities */
  numCommunities: number;

  /** Node-to-community mapping */
  assignments: Map<string, number>;

  /** Expected modularity score (approximate) */
  expectedModularity: number;

  /** Expected average conductance (approximate) */
  expectedConductance: number;

  /** Community sizes */
  communitySizes: number[];
}

/**
 * Create a graph with known community structure for validation.
 *
 * Structure:
 * - 4 communities with clear boundaries
 * - Community 0: Nodes 0-9 (10 nodes)
 * - Community 1: Nodes 10-19 (10 nodes)
 * - Community 2: Nodes 20-29 (10 nodes)
 * - Community 3: Nodes 30-39 (10 nodes)
 *
 * Edges:
 * - Intra-community: High density (90% of possible edges)
 * - Inter-community: Low density (10% of possible edges)
 *
 * This structure should produce:
 * - High modularity (Q > 0.5)
 * - Low conductance (φ < 0.2)
 * - Clear community boundaries
 *
 * @param directed - If true, creates directed graph; if false, undirected
 * @returns Graph with 40 nodes and ground truth labels
 *
 * @example
 * ```typescript
 * const { graph, groundTruth } = knownCommunityGraph();
 * console.log(`Expected modularity: ${groundTruth.expectedModularity}`);
 * ```
 */
export function knownCommunityGraph(directed = false): {
  graph: Graph<ClusterNode, ClusterEdge>;
  groundTruth: GroundTruth;
} {
  const graph = new Graph<ClusterNode, ClusterEdge>(directed);

  const numNodes = 40;
  const numCommunities = 4;
  const nodesPerCommunity = 10;

  // Create nodes with ground truth labels
  for (let i = 0; i < numNodes; i++) {
    const communityId = Math.floor(i / nodesPerCommunity);
    const node: ClusterNode = {
      id: `N${i}`,
      label: `Node ${i} (Community ${communityId})`,
      community: communityId,
    };
    graph.addNode(node);
  }

  // Add intra-community edges (90% density)
  for (let c = 0; c < numCommunities; c++) {
    const startIdx = c * nodesPerCommunity;
    const endIdx = startIdx + nodesPerCommunity;

    for (let i = startIdx; i < endIdx; i++) {
      for (let j = i + 1; j < endIdx; j++) {
        // 90% probability of edge existing
        if (Math.random() < 0.9) {
          const edge: ClusterEdge = {
            id: `E${i}-${j}`,
            source: `N${i}`,
            target: `N${j}`,
            weight: 1.0,
          };
          graph.addEdge(edge);

          // For directed graphs, add reverse edge with same probability
          if (directed && Math.random() < 0.9) {
            const reverseEdge: ClusterEdge = {
              id: `E${j}-${i}`,
              source: `N${j}`,
              target: `N${i}`,
              weight: 1.0,
            };
            graph.addEdge(reverseEdge);
          }
        }
      }
    }
  }

  // Add inter-community edges (10% density)
  for (let c1 = 0; c1 < numCommunities; c1++) {
    for (let c2 = c1 + 1; c2 < numCommunities; c2++) {
      const start1 = c1 * nodesPerCommunity;
      const end1 = start1 + nodesPerCommunity;
      const start2 = c2 * nodesPerCommunity;
      const end2 = start2 + nodesPerCommunity;

      for (let i = start1; i < end1; i++) {
        for (let j = start2; j < end2; j++) {
          // 10% probability of cross-community edge
          if (Math.random() < 0.1) {
            const edge: ClusterEdge = {
              id: `E${i}-${j}-inter`,
              source: `N${i}`,
              target: `N${j}`,
              weight: 0.5, // Lower weight for inter-community edges
            };
            graph.addEdge(edge);

            // For directed graphs, add reverse edge with same probability
            if (directed && Math.random() < 0.1) {
              const reverseEdge: ClusterEdge = {
                id: `E${j}-${i}-inter`,
                source: `N${j}`,
                target: `N${i}`,
                weight: 0.5,
              };
              graph.addEdge(reverseEdge);
            }
          }
        }
      }
    }
  }

  // Build ground truth
  const assignments = new Map<string, number>();
  for (let i = 0; i < numNodes; i++) {
    const communityId = Math.floor(i / nodesPerCommunity);
    assignments.set(`N${i}`, communityId);
  }

  const groundTruth: GroundTruth = {
    numCommunities: 4,
    assignments,
    expectedModularity: 0.6, // High modularity due to clear structure
    expectedConductance: 0.15, // Low conductance due to few boundary edges
    communitySizes: [10, 10, 10, 10],
  };

  return { graph, groundTruth };
}

/**
 * Create a karate club graph (Zachary's karate club network).
 *
 * Classic social network with 34 nodes (club members) and 78 edges (friendships).
 * Known to split into 2 communities (instructor's faction vs. administrator's faction).
 *
 * This is a standard benchmark dataset for community detection algorithms.
 *
 * @returns Graph with 34 nodes and ground truth 2-community split
 *
 * @example
 * ```typescript
 * const { graph, groundTruth } = karateClubGraph();
 * console.log(`Communities: ${groundTruth.numCommunities}`); // 2
 * ```
 */
export function karateClubGraph(): {
  graph: Graph<ClusterNode, ClusterEdge>;
  groundTruth: GroundTruth;
} {
  const graph = new Graph<ClusterNode, ClusterEdge>(false); // Undirected

  // Zachary's karate club split: 0 = instructor's faction, 1 = administrator's faction
  const communityAssignments = [
    0, 0, 0, 0, 0, 0, 0, 0, 1, 1, // Nodes 0-9
    0, 0, 0, 0, 1, 1, 0, 0, 1, 0, // Nodes 10-19
    1, 0, 1, 1, 1, 1, 1, 1, 1, 1, // Nodes 20-29
    1, 1, 1, 1, // Nodes 30-33
  ];

  // Add nodes
  for (let i = 0; i < 34; i++) {
    const node: ClusterNode = {
      id: `M${i}`,
      label: `Member ${i}`,
      community: communityAssignments[i],
    };
    graph.addNode(node);
  }

  // Add edges (Zachary's original edge list)
  const edges = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8],
    [0, 10], [0, 11], [0, 12], [0, 13], [0, 17], [0, 19], [0, 21], [0, 31],
    [1, 2], [1, 3], [1, 7], [1, 13], [1, 17], [1, 19], [1, 21], [1, 30],
    [2, 3], [2, 7], [2, 8], [2, 9], [2, 13], [2, 27], [2, 28], [2, 32],
    [3, 7], [3, 12], [3, 13],
    [4, 6], [4, 10],
    [5, 6], [5, 10], [5, 16],
    [6, 16],
    [8, 30], [8, 32], [8, 33],
    [9, 33],
    [13, 33],
    [14, 32], [14, 33],
    [15, 32], [15, 33],
    [18, 32], [18, 33],
    [19, 33],
    [20, 32], [20, 33],
    [22, 32], [22, 33],
    [23, 25], [23, 27], [23, 29], [23, 32], [23, 33],
    [24, 25], [24, 27], [24, 31],
    [25, 31],
    [26, 29], [26, 33],
    [27, 33],
    [28, 31], [28, 33],
    [29, 32], [29, 33],
    [30, 32], [30, 33],
    [31, 32], [31, 33],
    [32, 33],
  ];

  edges.forEach(([i, j]) => {
    const edge: ClusterEdge = {
      id: `E${i}-${j}`,
      source: `M${i}`,
      target: `M${j}`,
      weight: 1.0,
    };
    graph.addEdge(edge);
  });

  // Build ground truth
  const assignments = new Map<string, number>();
  for (let i = 0; i < 34; i++) {
    assignments.set(`M${i}`, communityAssignments[i]);
  }

  const groundTruth: GroundTruth = {
    numCommunities: 2,
    assignments,
    expectedModularity: 0.42, // Well-documented modularity for karate club
    expectedConductance: 0.21, // Moderate conductance due to some cross-faction friendships
    communitySizes: [18, 16], // Instructor: 18, Administrator: 16
  };

  return { graph, groundTruth };
}

/**
 * Create a ring of cliques graph.
 *
 * Structure:
 * - 5 cliques of 5 nodes each (25 nodes total)
 * - Each clique is fully connected (complete graph K5)
 * - Adjacent cliques connected by a single bridge edge
 *
 * This structure has:
 * - Clear community boundaries (cliques)
 * - Bridge edges as articulation points
 * - High modularity within cliques
 *
 * @returns Graph with 25 nodes in 5 cliques
 *
 * @example
 * ```typescript
 * const { graph, groundTruth } = ringOfCliquesGraph();
 * console.log(`Communities: ${groundTruth.numCommunities}`); // 5
 * ```
 */
export function ringOfCliquesGraph(): {
  graph: Graph<ClusterNode, ClusterEdge>;
  groundTruth: GroundTruth;
} {
  const graph = new Graph<ClusterNode, ClusterEdge>(false); // Undirected

  const numCliques = 5;
  const cliqueSize = 5;
  const totalNodes = numCliques * cliqueSize;

  // Create nodes
  for (let c = 0; c < numCliques; c++) {
    for (let i = 0; i < cliqueSize; i++) {
      const nodeIdx = c * cliqueSize + i;
      const node: ClusterNode = {
        id: `C${c}N${i}`,
        label: `Clique ${c} Node ${i}`,
        community: c,
      };
      graph.addNode(node);
    }
  }

  // Add intra-clique edges (complete graph K5 within each clique)
  for (let c = 0; c < numCliques; c++) {
    const startIdx = c * cliqueSize;
    const endIdx = startIdx + cliqueSize;

    for (let i = startIdx; i < endIdx; i++) {
      for (let j = i + 1; j < endIdx; j++) {
        const edge: ClusterEdge = {
          id: `E-C${c}-${i}-${j}`,
          source: `C${c}N${i - startIdx}`,
          target: `C${c}N${j - startIdx}`,
          weight: 1.0,
        };
        graph.addEdge(edge);
      }
    }
  }

  // Add bridge edges between adjacent cliques (ring structure)
  for (let c = 0; c < numCliques; c++) {
    const nextClique = (c + 1) % numCliques;

    // Connect last node of current clique to first node of next clique
    const bridgeEdge: ClusterEdge = {
      id: `E-Bridge-${c}-${nextClique}`,
      source: `C${c}N${cliqueSize - 1}`,
      target: `C${nextClique}N0`,
      weight: 1.0,
    };
    graph.addEdge(bridgeEdge);
  }

  // Build ground truth
  const assignments = new Map<string, number>();
  for (let c = 0; c < numCliques; c++) {
    for (let i = 0; i < cliqueSize; i++) {
      assignments.set(`C${c}N${i}`, c);
    }
  }

  const groundTruth: GroundTruth = {
    numCommunities: 5,
    assignments,
    expectedModularity: 0.8, // Very high modularity due to clique structure
    expectedConductance: 0.05, // Very low conductance (only bridge edges)
    communitySizes: [5, 5, 5, 5, 5],
  };

  return { graph, groundTruth };
}
