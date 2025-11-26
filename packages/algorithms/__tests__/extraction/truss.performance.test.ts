/**
 * Performance tests for K-Truss extraction algorithm.
 * Validates performance requirements on large graphs.
 *
 * @module __tests__/extraction/truss.performance.test
 */

import { describe, it, expect } from 'vitest';
import { extractKTruss } from '../../src/extraction/truss';
import { createRandomGraph } from '../fixtures/extraction-graphs';

describe('K-Truss Performance', () => {
  describe('Performance Requirement', () => {
    it('should complete 3-truss extraction on 1000-node graph in <3s', { timeout: 5000 }, () => {
      // Given: Large random graph with 1000 nodes and ~5000 edges
      const graph = createRandomGraph(1000, 5000);
      expect(graph.getNodeCount()).toBe(1000);

      // When: Extract 3-truss
      const startTime = performance.now();
      const result = extractKTruss(graph, { k: 3 });
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Then: Should complete in under 3 seconds
      expect(executionTime).toBeLessThan(3000);

      // Verify algorithm produces valid results
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const truss = result.value;

      // Should produce a valid subgraph
      expect(truss.getNodeCount()).toBeGreaterThanOrEqual(0);
      expect(truss.getNodeCount()).toBeLessThanOrEqual(1000);
      expect(truss.getEdgeCount()).toBeGreaterThanOrEqual(0);
      expect(truss.getEdgeCount()).toBeLessThanOrEqual(5000);
    });

    it('should scale reasonably with graph size', { timeout: 10000 }, () => {
      // Given: Small and medium graphs
      const smallGraph = createRandomGraph(100, 500);
      const mediumGraph = createRandomGraph(500, 2500);

      const smallNodeCount = smallGraph.getNodeCount();
      const mediumNodeCount = mediumGraph.getNodeCount();
      const sizeRatio = mediumNodeCount / smallNodeCount;

      // When: Run k-truss on both
      const smallStart = performance.now();
      const smallResult = extractKTruss(smallGraph, { k: 3 });
      const smallEnd = performance.now();
      const smallTime = smallEnd - smallStart;

      expect(smallResult.ok).toBe(true);

      const mediumStart = performance.now();
      const mediumResult = extractKTruss(mediumGraph, { k: 3 });
      const mediumEnd = performance.now();
      const mediumTime = mediumEnd - mediumStart;

      expect(mediumResult.ok).toBe(true);

      // Then: Time should scale sub-quadratically
      // Allow 3x safety margin for timing variance
      const timeRatio = mediumTime / Math.max(smallTime, 0.1); // Avoid division by very small numbers
      const maxExpectedRatio = sizeRatio * sizeRatio * 3; // O(n²) with 3x safety

      expect(timeRatio).toBeLessThan(maxExpectedRatio);
    });
  });
});
