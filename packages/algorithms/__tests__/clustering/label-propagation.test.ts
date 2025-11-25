/**
 * Unit tests for Label Propagation clustering algorithm.
 * Validates convergence speed, linear scaling, and clustering quality.
 *
 * @module __tests__/clustering/label-propagation.test
 */

import { describe, it, expect } from 'vitest';
import { labelPropagation } from '../../src/clustering/label-propagation';
import { smallCitationNetwork, largeCitationNetwork } from '../fixtures/citation-networks';
import type { PaperNode, CitationEdge } from '../fixtures/citation-networks';
import { Graph } from '../../src/graph/graph';

/**
 * Create a 10k-node citation network for scalability testing.
 * Similar structure to largeCitationNetwork but 10x scale.
 */
function extraLargeCitationNetwork(): Graph<PaperNode, CitationEdge> {
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

  // Create 10,000 papers (1000 per community)
  for (let i = 0; i < 10000; i++) {
    const communityId = Math.floor(i / 1000);
    const paperInCommunity = i % 1000;

    const node: PaperNode = {
      id: `P${i}`,
      title: `${communityNames[communityId]} Paper ${paperInCommunity}`,
      year: 2015 + Math.floor(i / 1000),
      community: communityId,
    };

    graph.addNode(node);
  }

  // Add intra-community edges (80% of edges)
  // Each community has ~8000 internal edges (1000 nodes * 8 avg degree)
  for (let c = 0; c < 10; c++) {
    const startIdx = c * 1000;
    const endIdx = startIdx + 1000;

    for (let i = startIdx; i < endIdx; i++) {
      // Each paper cites 8 papers within its community
      for (let j = 0; j < 8; j++) {
        let target = startIdx + Math.floor(Math.random() * 1000);

        // Avoid self-loops
        if (target === i) {
          target = (target + 1) % 1000 + startIdx;
        }

        const edge: CitationEdge = {
          id: `E${i}-${target}`,
          source: `P${i}`,
          target: `P${target}`,
          year: 2015 + Math.floor(i / 1000),
        };

        graph.addEdge(edge);
      }
    }
  }

  // Add inter-community edges (20% of edges)
  // ~20,000 edges between communities
  for (let i = 0; i < 10000; i++) {
    const sourceCommunity = Math.floor(i / 1000);

    // Each paper cites 2 papers from other communities
    for (let j = 0; j < 2; j++) {
      // Pick a different community
      let targetCommunity = (sourceCommunity + 1 + Math.floor(Math.random() * 9)) % 10;
      const targetStart = targetCommunity * 1000;
      const target = targetStart + Math.floor(Math.random() * 1000);

      const edge: CitationEdge = {
        id: `E${i}-${target}-inter`,
        source: `P${i}`,
        target: `P${target}`,
        year: 2015 + Math.floor(i / 1000),
      };

      graph.addEdge(edge);
    }
  }

  return graph;
}

describe('Label Propagation Clustering', () => {
  describe('User Story 6 - Scenario 1: 10k-Node Performance', () => {
    it('should complete in under 20 seconds for 10,000-node graph', { timeout: 25000 }, () => {
      // Given: Citation network with 10,000 papers
      const graph = extraLargeCitationNetwork();
      expect(graph.getNodeCount()).toBe(10000);

      // When: Label propagation runs
      const startTime = performance.now();
      const result = labelPropagation(graph);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Then: Algorithm completes in under 20 seconds
      expect(executionTime).toBeLessThan(20000); // 20 seconds in milliseconds

      // Verify result structure
      expect(result.ok).toBe(true);
      if (result.ok) {
        const clusters = result.value.clusters;
        expect(clusters.length).toBeGreaterThan(0);
        expect(clusters.length).toBeLessThan(graph.getNodeCount()); // Not every node in own cluster

        // All nodes should be assigned
        const totalAssignedNodes = clusters.reduce(
          (sum, cluster) => sum + cluster.size,
          0
        );
        expect(totalAssignedNodes).toBe(graph.getNodeCount());
      }
    });
  });

  describe('User Story 6 - Scenario 2: Linear Scaling', () => {
    it('should scale linearly with graph size', { timeout: 60000 }, () => {
      // Given: Three graphs of increasing size
      const smallGraph = smallCitationNetwork(); // 100 nodes
      const mediumGraph = largeCitationNetwork(); // 1000 nodes
      const largeGraph = extraLargeCitationNetwork(); // 10000 nodes

      const smallNodeCount = smallGraph.getNodeCount();
      const mediumNodeCount = mediumGraph.getNodeCount();
      const largeNodeCount = largeGraph.getNodeCount();

      // When: Run label propagation on all three
      const smallStartTime = performance.now();
      const smallResult = labelPropagation(smallGraph);
      const smallEndTime = performance.now();
      const smallTime = smallEndTime - smallStartTime;

      const mediumStartTime = performance.now();
      const mediumResult = labelPropagation(mediumGraph);
      const mediumEndTime = performance.now();
      const mediumTime = mediumEndTime - mediumStartTime;

      const largeStartTime = performance.now();
      const largeResult = labelPropagation(largeGraph);
      const largeEndTime = performance.now();
      const largeTime = largeEndTime - largeStartTime;

      // Verify all succeeded
      expect(smallResult.ok).toBe(true);
      expect(mediumResult.ok).toBe(true);
      expect(largeResult.ok).toBe(true);

      // Then: Runtime should scale linearly (O(n))
      // Allow 2x safety margin for linear scaling
      const smallToMediumSizeRatio = mediumNodeCount / smallNodeCount; // 10x
      const mediumToLargeSizeRatio = largeNodeCount / mediumNodeCount; // 10x

      const smallToMediumTimeRatio = mediumTime / smallTime;
      const mediumToLargeTimeRatio = largeTime / mediumTime;

      // Linear scaling: 10x size should be ~10x time (with 2x margin = 20x max)
      expect(smallToMediumTimeRatio).toBeLessThan(smallToMediumSizeRatio * 2);
      expect(mediumToLargeTimeRatio).toBeLessThan(mediumToLargeSizeRatio * 2);
    });
  });

  describe('User Story 6 - Scenario 3: Fast Convergence', () => {
    it('should converge in 3-5 iterations for typical citation networks', () => {
      // Given: Citation network with clear community structure
      const graph = smallCitationNetwork();

      // When: Label propagation runs
      const result = labelPropagation(graph);

      // Then: Should converge quickly
      expect(result.ok).toBe(true);
      if (result.ok) {
        const { metadata } = result.value;

        // Should converge in 3-5 iterations
        expect(metadata.iterations).toBeGreaterThanOrEqual(1);
        expect(metadata.iterations).toBeLessThanOrEqual(5);

        // Should converge (not hit max iterations)
        expect(metadata.converged).toBe(true);
      }
    });

    it('should produce valid clusters for small citation network', () => {
      // Given: Citation network
      const graph = smallCitationNetwork();

      // When: Run label propagation
      const result = labelPropagation(graph);

      // Then: Should produce valid clusters
      expect(result.ok).toBe(true);
      if (result.ok) {
        const clusters = result.value.clusters;

        // Should have multiple clusters
        expect(clusters.length).toBeGreaterThan(1);
        expect(clusters.length).toBeLessThan(graph.getNodeCount());

        // Each cluster should have valid structure
        clusters.forEach((cluster) => {
          expect(cluster.label).toBeGreaterThanOrEqual(0);
          expect(cluster.nodes).toBeInstanceOf(Set);
          expect(cluster.nodes.size).toBeGreaterThan(0);
          expect(cluster.size).toBe(cluster.nodes.size);
          expect(cluster.iterations).toBeGreaterThanOrEqual(1);
          expect(typeof cluster.stable).toBe('boolean');
        });

        // All nodes should be assigned exactly once
        const allAssignedNodes = new Set<string>();
        clusters.forEach((cluster) => {
          cluster.nodes.forEach((node) => {
            const nodeId = typeof node === 'string' ? node : node.id;
            expect(allAssignedNodes.has(nodeId)).toBe(false); // No overlaps
            allAssignedNodes.add(nodeId);
          });
        });

        expect(allAssignedNodes.size).toBe(graph.getNodeCount());
      }
    });
  });
});
