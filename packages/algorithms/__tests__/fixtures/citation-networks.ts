/**
 * Citation network test fixtures for clustering algorithm testing.
 * Provides small and large citation networks with known community structures.
 *
 * @module fixtures/citation-networks
 */

import { Graph } from '../../src/graph/graph';

/**
 * Simple seeded PRNG using Mulberry32 algorithm.
 * Provides deterministic random numbers for reproducible test graphs.
 *
 * @param seed - Seed value for reproducibility
 * @returns Function that returns random numbers in [0, 1)
 */
function seededRandom(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Paper node for citation networks.
 */
export interface PaperNode {
  id: string;
  type: 'paper';
  title: string;
  year: number;
  community?: number; // Known ground truth community assignment
  [key: string]: unknown; // Index signature for Node compatibility
}

/**
 * Citation edge (directed: citing paper → cited paper).
 */
export interface CitationEdge {
  id: string;
  source: string;
  target: string;
  type: 'citation';
  year: number;
  [key: string]: unknown; // Index signature for Edge compatibility
}

/**
 * Generate a citation network with specified size and community structure.
 *
 * @param nodeCount - Total number of papers in the network
 * @param communityCount - Number of communities to create
 * @param inCommunityProb - Probability of intra-community edges (0.0-1.0)
 * @param seed - Random seed for deterministic generation (default: 42)
 * @returns Graph with specified structure and known community assignments
 *
 * @remarks
 * **Algorithm**:
 * - Nodes distributed evenly across communities (nodeCount / communityCount per community)
 * - Each node creates ~10 edges total (8 intra + 2 inter for 0.8 probability)
 * - Intra-community edges: Each node cites inCommunityProb * 10 papers within its community
 * - Inter-community edges: Each node cites (1 - inCommunityProb) * 10 papers from other communities
 *
 * **Performance**:
 * - Time: O(V * degree) where V = nodeCount, degree = 10
 * - Space: O(V + E) where E ≈ nodeCount * 10
 *
 * @example
 * ```typescript
 * // 500-node network, 5 communities, 80% intra-community edges
 * const graph = generateCitationNetwork(500, 5, 0.8);
 * console.log(`Nodes: ${graph.getNodeCount()}`); // 500
 * console.log(`Edges: ${graph.getEdgeCount()}`); // ~5000
 * ```
 *
 * @since Phase 5 (spec-027 profiling tests)
 */
export function generateCitationNetwork(
  nodeCount: number,
  communityCount: number,
  inCommunityProb: number,
  seed: number = 42
): Graph<PaperNode, CitationEdge> {
  const graph = new Graph<PaperNode, CitationEdge>(true); // Directed graph
  const random = seededRandom(seed);

  const nodesPerCommunity = Math.floor(nodeCount / communityCount);
  const avgDegree = 10; // Target average degree
  const intraEdgesPerNode = Math.floor(avgDegree * inCommunityProb);
  const interEdgesPerNode = Math.floor(avgDegree * (1 - inCommunityProb));

  const communityNames = [
    'Machine Learning',
    'Natural Language Processing',
    'Computer Vision',
    'Databases',
    'Networks',
    'Human-Computer Interaction',
    'Software Engineering',
    'Theory',
    'Security',
    'Systems',
  ];

  // Create nodes
  for (let i = 0; i < nodeCount; i++) {
    const communityId = Math.floor(i / nodesPerCommunity);
    const paperInCommunity = i % nodesPerCommunity;

    const node: PaperNode = {
      id: `P${i}`,
      type: 'paper',
      title: `${communityNames[communityId % communityNames.length]} Paper ${paperInCommunity}`,
      year: 2015 + Math.floor(i / nodesPerCommunity),
      community: communityId,
    };

    graph.addNode(node);
  }

  // Add intra-community edges
  for (let i = 0; i < nodeCount; i++) {
    const communityId = Math.floor(i / nodesPerCommunity);
    const startIdx = communityId * nodesPerCommunity;
    const endIdx = Math.min(startIdx + nodesPerCommunity, nodeCount);

    for (let j = 0; j < intraEdgesPerNode; j++) {
      let target = startIdx + Math.floor(random() * (endIdx - startIdx));

      // Avoid self-loops
      if (target === i) {
        target = (target + 1 - startIdx) % (endIdx - startIdx) + startIdx;
      }

      const edge: CitationEdge = {
        id: `E${i}-${target}`,
        source: `P${i}`,
        target: `P${target}`,
        type: 'citation',
        year: 2015 + Math.floor(i / nodesPerCommunity),
      };

      graph.addEdge(edge);
    }
  }

  // Add inter-community edges
  for (let i = 0; i < nodeCount; i++) {
    const sourceCommunity = Math.floor(i / nodesPerCommunity);

    for (let j = 0; j < interEdgesPerNode; j++) {
      // Pick a different community
      const targetCommunity = (sourceCommunity + 1 + Math.floor(random() * (communityCount - 1))) % communityCount;
      const targetStart = targetCommunity * nodesPerCommunity;
      const targetEnd = Math.min(targetStart + nodesPerCommunity, nodeCount);
      const target = targetStart + Math.floor(random() * (targetEnd - targetStart));

      const edge: CitationEdge = {
        id: `E${i}-${target}-inter`,
        source: `P${i}`,
        target: `P${target}`,
        type: 'citation',
        year: 2015 + Math.floor(i / nodesPerCommunity),
      };

      graph.addEdge(edge);
    }
  }

  return graph;
}

/**
 * Create a small citation network with 100 papers and 5 known communities.
 *
 * Community structure:
 * - Community 0: Papers 0-19 (Machine Learning)
 * - Community 1: Papers 20-39 (Natural Language Processing)
 * - Community 2: Papers 40-59 (Computer Vision)
 * - Community 3: Papers 60-79 (Databases)
 * - Community 4: Papers 80-99 (Networks)
 *
 * Intra-community edges: ~80% of edges within same community
 * Inter-community edges: ~20% of edges between communities
 *
 * Average degree: ~10 (1000 total edges)
 *
 * @returns Graph with 100 papers and known community assignments
 *
 * @example
 * ```typescript
 * const graph = smallCitationNetwork();
 * console.log(`Nodes: ${graph.getNodeCount()}`); // 100
 * console.log(`Edges: ${graph.getEdgeCount()}`); // ~1000
 * ```
 */
export function smallCitationNetwork(): Graph<PaperNode, CitationEdge> {
  const graph = new Graph<PaperNode, CitationEdge>(true); // Directed graph

  // Use seeded RNG for deterministic graph generation
  const random = seededRandom(12345);

  const communityNames = [
    'Machine Learning',
    'Natural Language Processing',
    'Computer Vision',
    'Databases',
    'Networks',
  ];

  // Create 100 papers (20 per community)
  for (let i = 0; i < 100; i++) {
    const communityId = Math.floor(i / 20);
    const paperInCommunity = i % 20;

    const node: PaperNode = {
      id: `P${i}`,
      type: 'paper',
      title: `${communityNames[communityId]} Paper ${paperInCommunity}`,
      year: 2020 + Math.floor(i / 10),
      community: communityId,
    };

    graph.addNode(node);
  }

  // Add intra-community edges (80% of edges)
  // Each community has ~160 internal edges (20 nodes * 8 avg degree)
  for (let c = 0; c < 5; c++) {
    const startIdx = c * 20;
    const endIdx = startIdx + 20;

    for (let i = startIdx; i < endIdx; i++) {
      // Each paper cites 8 papers within its community
      for (let j = 0; j < 8; j++) {
        let target = startIdx + Math.floor(random() * 20);

        // Avoid self-loops and duplicate edges
        if (target === i) {
          target = (target + 1) % 20 + startIdx;
        }

        const edge: CitationEdge = {
          id: `E${i}-${target}`,
          source: `P${i}`,
          target: `P${target}`,
          type: 'citation',
          year: 2020 + Math.floor(i / 10),
        };

        graph.addEdge(edge);
      }
    }
  }

  // Add inter-community edges (20% of edges)
  // ~200 edges between communities
  for (let i = 0; i < 100; i++) {
    const sourceCommunity = Math.floor(i / 20);

    // Each paper cites 2 papers from other communities
    for (let j = 0; j < 2; j++) {
      // Pick a different community
      const targetCommunity = (sourceCommunity + 1 + Math.floor(random() * 4)) % 5;
      const targetStart = targetCommunity * 20;
      const target = targetStart + Math.floor(random() * 20);

      const edge: CitationEdge = {
        id: `E${i}-${target}-inter`,
        source: `P${i}`,
        target: `P${target}`,
        type: 'citation',
        year: 2020 + Math.floor(i / 10),
      };

      graph.addEdge(edge);
    }
  }

  return graph;
}

/**
 * Create a large citation network with 1000 papers for performance testing.
 *
 * Community structure:
 * - 10 communities with 100 papers each
 * - Similar structure to small network but scaled up
 *
 * Intra-community edges: ~80% of edges within same community
 * Inter-community edges: ~20% of edges between communities
 *
 * Average degree: ~10 (10,000 total edges)
 *
 * @returns Graph with 1000 papers
 *
 * @example
 * ```typescript
 * const graph = largeCitationNetwork();
 * console.log(`Nodes: ${graph.getNodeCount()}`); // 1000
 * console.log(`Edges: ${graph.getEdgeCount()}`); // ~10,000
 * ```
 */
export function largeCitationNetwork(): Graph<PaperNode, CitationEdge> {
  const graph = new Graph<PaperNode, CitationEdge>(true); // Directed graph

  // Use seeded RNG for deterministic graph generation
  const random = seededRandom(67890);

  const communityNames = [
    'Machine Learning',
    'Natural Language Processing',
    'Computer Vision',
    'Databases',
    'Networks',
    'Human-Computer Interaction',
    'Software Engineering',
    'Theory',
    'Security',
    'Systems',
  ];

  // Create 1000 papers (100 per community)
  for (let i = 0; i < 1000; i++) {
    const communityId = Math.floor(i / 100);
    const paperInCommunity = i % 100;

    const node: PaperNode = {
      id: `P${i}`,
      type: 'paper',
      title: `${communityNames[communityId]} Paper ${paperInCommunity}`,
      year: 2015 + Math.floor(i / 100),
      community: communityId,
    };

    graph.addNode(node);
  }

  // Add intra-community edges (80% of edges)
  // Each community has ~800 internal edges (100 nodes * 8 avg degree)
  for (let c = 0; c < 10; c++) {
    const startIdx = c * 100;
    const endIdx = startIdx + 100;

    for (let i = startIdx; i < endIdx; i++) {
      // Each paper cites 8 papers within its community
      for (let j = 0; j < 8; j++) {
        let target = startIdx + Math.floor(random() * 100);

        // Avoid self-loops and duplicate edges
        if (target === i) {
          target = (target + 1) % 100 + startIdx;
        }

        const edge: CitationEdge = {
          id: `E${i}-${target}`,
          source: `P${i}`,
          target: `P${target}`,
          type: 'citation',
          year: 2015 + Math.floor(i / 100),
        };

        graph.addEdge(edge);
      }
    }
  }

  // Add inter-community edges (20% of edges)
  // ~2000 edges between communities
  for (let i = 0; i < 1000; i++) {
    const sourceCommunity = Math.floor(i / 100);

    // Each paper cites 2 papers from other communities
    for (let j = 0; j < 2; j++) {
      // Pick a different community
      const targetCommunity = (sourceCommunity + 1 + Math.floor(random() * 9)) % 10;
      const targetStart = targetCommunity * 100;
      const target = targetStart + Math.floor(random() * 100);

      const edge: CitationEdge = {
        id: `E${i}-${target}-inter`,
        source: `P${i}`,
        target: `P${target}`,
        type: 'citation',
        year: 2015 + Math.floor(i / 100),
      };

      graph.addEdge(edge);
    }
  }

  return graph;
}
