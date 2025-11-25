/**
 * Citation network test fixtures for clustering algorithm testing.
 * Provides small and large citation networks with known community structures.
 *
 * @module fixtures/citation-networks
 */

import { Graph } from '../../src/graph/graph';

/**
 * Paper node for citation networks.
 */
export interface PaperNode {
  id: string;
  title: string;
  year: number;
  community?: number; // Known ground truth community assignment
}

/**
 * Citation edge (directed: citing paper → cited paper).
 */
export interface CitationEdge {
  id: string;
  source: string;
  target: string;
  year: number;
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
        let target = startIdx + Math.floor(Math.random() * 20);

        // Avoid self-loops and duplicate edges
        if (target === i) {
          target = (target + 1) % 20 + startIdx;
        }

        const edge: CitationEdge = {
          id: `E${i}-${target}`,
          source: `P${i}`,
          target: `P${target}`,
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
      let targetCommunity = (sourceCommunity + 1 + Math.floor(Math.random() * 4)) % 5;
      const targetStart = targetCommunity * 20;
      const target = targetStart + Math.floor(Math.random() * 20);

      const edge: CitationEdge = {
        id: `E${i}-${target}-inter`,
        source: `P${i}`,
        target: `P${target}`,
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
        let target = startIdx + Math.floor(Math.random() * 100);

        // Avoid self-loops and duplicate edges
        if (target === i) {
          target = (target + 1) % 100 + startIdx;
        }

        const edge: CitationEdge = {
          id: `E${i}-${target}`,
          source: `P${i}`,
          target: `P${target}`,
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
      let targetCommunity = (sourceCommunity + 1 + Math.floor(Math.random() * 9)) % 10;
      const targetStart = targetCommunity * 100;
      const target = targetStart + Math.floor(Math.random() * 100);

      const edge: CitationEdge = {
        id: `E${i}-${target}-inter`,
        source: `P${i}`,
        target: `P${target}`,
        year: 2015 + Math.floor(i / 100),
      };

      graph.addEdge(edge);
    }
  }

  return graph;
}
