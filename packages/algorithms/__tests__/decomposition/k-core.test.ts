/**
 * Unit tests for K-Core Decomposition using Batagelj-Zaversnik algorithm.
 * Validates degree constraints, nested hierarchy, and performance on large graphs.
 *
 * @module __tests__/decomposition/k-core.test
 */

import { describe, it, expect } from 'vitest';
import { kCoreDecomposition } from '../../src/decomposition/k-core';
import { smallCitationNetwork, largeCitationNetwork } from '../fixtures/citation-networks';

describe('K-Core Decomposition (User Story 4)', () => {
  describe('Scenario 1: Degree Constraint Validation', () => {
    it('should ensure all nodes in k-core have degree >= k within the subgraph', () => {
      // Given: Citation network with 100 papers
      const graph = smallCitationNetwork();

      // When: Run k-core decomposition
      const result = kCoreDecomposition(graph);

      // Then: Algorithm succeeds
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { cores, coreNumbers } = result.value;

      // Verify each core satisfies degree constraint
      cores.forEach((core, k) => {
        if (k === 0) return; // Skip k=0 (trivial core with all nodes)

        // For each node in k-core, count its neighbors also in the k-core
        core.nodes.forEach((nodeId) => {
          const neighborsResult = graph.getNeighbors(typeof nodeId === 'string' ? nodeId : nodeId.id);
          expect(neighborsResult.ok).toBe(true);
          if (!neighborsResult.ok) return;

          const neighbors = neighborsResult.value;

          // Count neighbors that are also in this k-core
          let degreeInCore = 0;
          neighbors.forEach((neighborId) => {
            if (core.nodes.has(neighborId)) {
              degreeInCore++;
            }
          });

          // Degree in k-core must be >= k
          expect(degreeInCore).toBeGreaterThanOrEqual(k);
        });
      });

      // Verify coreNumbers map is complete (all nodes assigned)
      expect(coreNumbers.size).toBe(graph.getNodeCount());
    });

    it('should assign correct core numbers to all nodes', () => {
      // Given: Citation network
      const graph = smallCitationNetwork();

      // When: Run k-core decomposition
      const result = kCoreDecomposition(graph);

      // Then: All nodes have valid core numbers
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { coreNumbers, degeneracy } = result.value;

      // All core numbers should be in range [0, degeneracy]
      coreNumbers.forEach((coreNumber, nodeId) => {
        expect(coreNumber).toBeGreaterThanOrEqual(0);
        expect(coreNumber).toBeLessThanOrEqual(degeneracy);
      });
    });
  });

  describe('Scenario 2: Nested Core Hierarchy', () => {
    it('should produce nested k-cores where (k+1)-core is subset of k-core', () => {
      // Given: Citation network
      const graph = smallCitationNetwork();

      // When: Run k-core decomposition
      const result = kCoreDecomposition(graph);

      // Then: Cores form nested hierarchy
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { cores, degeneracy } = result.value;

      // Verify nesting property: cores[k+1] ⊆ cores[k]
      for (let k = 1; k < degeneracy; k++) {
        const kCore = cores.get(k);
        const kPlusOneCore = cores.get(k + 1);

        if (!kCore || !kPlusOneCore) continue;

        // Every node in (k+1)-core must also be in k-core
        kPlusOneCore.nodes.forEach((nodeId) => {
          expect(kCore.nodes.has(nodeId)).toBe(true);
        });

        // (k+1)-core should be smaller than or equal to k-core
        expect(kPlusOneCore.size).toBeLessThanOrEqual(kCore.size);
      }
    });

    it('should compute correct degeneracy (maximum k)', () => {
      // Given: Citation network
      const graph = smallCitationNetwork();

      // When: Run k-core decomposition
      const result = kCoreDecomposition(graph);

      // Then: Degeneracy equals maximum core number
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { cores, degeneracy, coreNumbers } = result.value;

      // Degeneracy should be the highest k value with non-empty core
      expect(cores.has(degeneracy)).toBe(true);
      const maxCore = cores.get(degeneracy);
      expect(maxCore).toBeDefined();
      if (maxCore) {
        expect(maxCore.size).toBeGreaterThan(0);
      }

      // No core should exist for k > degeneracy
      expect(cores.has(degeneracy + 1)).toBe(false);

      // At least one node should have core number = degeneracy
      let foundMaxCoreNode = false;
      coreNumbers.forEach((coreNumber) => {
        if (coreNumber === degeneracy) {
          foundMaxCoreNode = true;
        }
      });
      expect(foundMaxCoreNode).toBe(true);
    });

    it('should maintain core hierarchy metadata', () => {
      // Given: Citation network
      const graph = smallCitationNetwork();

      // When: Run k-core decomposition
      const result = kCoreDecomposition(graph);

      // Then: Each core has complete metadata
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { cores } = result.value;

      cores.forEach((core, k) => {
        // Core structure validation
        expect(core.k).toBe(k);
        expect(core.nodes).toBeInstanceOf(Set);
        expect(core.size).toBe(core.nodes.size);
        expect(core.degeneracy).toBeGreaterThanOrEqual(k);
        expect(core.coreNumbers).toBeInstanceOf(Map);
      });
    });
  });

  describe('Scenario 3: Performance Requirement', () => {
    it('should complete in under 15 seconds for 1000-node graph', { timeout: 20000 }, () => {
      // Given: Large citation network with 1000+ papers
      const graph = largeCitationNetwork();
      expect(graph.getNodeCount()).toBeGreaterThanOrEqual(1000);

      // When: K-core decomposition runs
      const startTime = performance.now();
      const result = kCoreDecomposition(graph);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Then: Algorithm completes in under 15 seconds
      expect(executionTime).toBeLessThan(15000); // 15 seconds in milliseconds

      // Verify algorithm still produces valid results at scale
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { cores, coreNumbers, degeneracy } = result.value;

      // All nodes should be assigned core numbers
      expect(coreNumbers.size).toBe(graph.getNodeCount());

      // Should have at least some non-trivial cores
      expect(degeneracy).toBeGreaterThan(0);
      expect(cores.size).toBeGreaterThan(1);

      // Verify largest core size is reasonable (not all nodes)
      const maxCore = cores.get(degeneracy);
      expect(maxCore).toBeDefined();
      if (maxCore) {
        expect(maxCore.size).toBeLessThan(graph.getNodeCount());
      }
    });

    it('should scale linearly with graph size', { timeout: 25000 }, () => {
      // Given: Both small and large networks
      const smallGraph = smallCitationNetwork();
      const largeGraph = largeCitationNetwork();

      const smallNodeCount = smallGraph.getNodeCount();
      const largeNodeCount = largeGraph.getNodeCount();
      const sizeRatio = largeNodeCount / smallNodeCount;

      // When: Run k-core decomposition on both
      const smallStartTime = performance.now();
      const smallResult = kCoreDecomposition(smallGraph);
      const smallEndTime = performance.now();
      const smallTime = smallEndTime - smallStartTime;

      expect(smallResult.ok).toBe(true);

      const largeStartTime = performance.now();
      const largeResult = kCoreDecomposition(largeGraph);
      const largeEndTime = performance.now();
      const largeTime = largeEndTime - largeStartTime;

      expect(largeResult.ok).toBe(true);

      // Then: Runtime should scale linearly (O(n + m))
      // With 2x safety margin: 10x size should be < 20x time
      const timeRatio = largeTime / smallTime;
      const maxExpectedRatio = sizeRatio * 2; // Linear scaling with 2x safety

      expect(timeRatio).toBeLessThan(maxExpectedRatio);
    });
  });
});
