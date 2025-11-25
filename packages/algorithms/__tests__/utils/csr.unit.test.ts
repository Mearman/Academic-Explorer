/**
 * Unit tests for CSR (Compressed Sparse Row) graph conversion.
 *
 * @module __tests__/utils/csr.unit.test
 * @since Phase 5 (spec-027)
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../src/graph/graph';
import { convertToCSR } from '../../src/utils/csr';
import { type Node, type Edge } from '../../src/types/graph';

interface TestNode extends Node {
  id: string;
  type: string;
  label: string;
}

interface TestEdge extends Edge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: number;
}

describe('CSR Graph Conversion', () => {
  describe('convertToCSR()', () => {
    it('should convert empty graph correctly', () => {
      const graph = new Graph<TestNode, TestEdge>(true);
      const csr = convertToCSR(graph);

      expect(csr.nodeIds).toEqual([]);
      expect(csr.nodeIndex.size).toBe(0);
      expect(csr.offsets).toEqual(new Uint32Array([0]));
      expect(csr.edges).toEqual(new Uint32Array([]));
      expect(csr.weights).toEqual(new Float64Array([]));
    });

    it('should convert single-node graph correctly', () => {
      const graph = new Graph<TestNode, TestEdge>(true);
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });

      const csr = convertToCSR(graph);

      expect(csr.nodeIds).toEqual(['A']);
      expect(csr.nodeIndex.get('A')).toBe(0);
      expect(csr.offsets).toEqual(new Uint32Array([0, 0])); // Node A has no neighbors
      expect(csr.edges).toEqual(new Uint32Array([]));
      expect(csr.weights).toEqual(new Float64Array([]));
    });

    it('should convert simple directed graph correctly', () => {
      const graph = new Graph<TestNode, TestEdge>(true);
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });

      // A → B (weight 1.0), A → C (weight 2.0), B → C (weight 3.0)
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test', weight: 1.0 });
      graph.addEdge({ id: 'E2', source: 'A', target: 'C', type: 'test', weight: 2.0 });
      graph.addEdge({ id: 'E3', source: 'B', target: 'C', type: 'test', weight: 3.0 });

      const csr = convertToCSR(graph);

      // Verify node mapping
      expect(csr.nodeIds).toEqual(['A', 'B', 'C']);
      expect(csr.nodeIndex.get('A')).toBe(0);
      expect(csr.nodeIndex.get('B')).toBe(1);
      expect(csr.nodeIndex.get('C')).toBe(2);

      // Verify offsets
      expect(Array.from(csr.offsets)).toEqual([
        0, // Node A starts at index 0
        2, // Node B starts at index 2 (A has 2 neighbors)
        3, // Node C starts at index 3 (B has 1 neighbor)
        3, // End sentinel (C has 0 neighbors)
      ]);

      // Verify edges (neighbor indices)
      expect(Array.from(csr.edges)).toEqual([
        1, 2, // Node A's neighbors: B(1), C(2)
        2,    // Node B's neighbors: C(2)
      ]);

      // Verify weights
      expect(Array.from(csr.weights)).toEqual([
        1.0, 2.0, // Node A's edge weights
        3.0,      // Node B's edge weights
      ]);
    });

    it('should use default weight 1.0 for unweighted edges', () => {
      const graph = new Graph<TestNode, TestEdge>(true);
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });

      // Edge without weight property
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });

      const csr = convertToCSR(graph);

      expect(Array.from(csr.weights)).toEqual([1.0]); // Default weight
    });

    it('should preserve graph topology for all edges', () => {
      const graph = new Graph<TestNode, TestEdge>(true);

      // Create larger graph: 5 nodes, 8 edges
      const nodes = ['A', 'B', 'C', 'D', 'E'];
      nodes.forEach((id) => {
        graph.addNode({ id, type: 'test', label: `Node ${id}` });
      });

      const edges: Array<[string, string, number]> = [
        ['A', 'B', 1.0],
        ['A', 'C', 2.0],
        ['B', 'C', 3.0],
        ['B', 'D', 4.0],
        ['C', 'D', 5.0],
        ['C', 'E', 6.0],
        ['D', 'E', 7.0],
        ['E', 'A', 8.0],
      ];

      edges.forEach(([source, target, weight], idx) => {
        graph.addEdge({ id: `E${idx}`, source, target, type: 'test', weight });
      });

      const csr = convertToCSR(graph);

      // Verify total edge count
      expect(csr.edges.length).toBe(8);
      expect(csr.weights.length).toBe(8);

      // Verify all edges are preserved by reconstructing adjacency list
      const reconstructed: Array<[string, string, number]> = [];

      for (let i = 0; i < csr.nodeIds.length; i++) {
        const sourceId = csr.nodeIds[i];
        const start = csr.offsets[i];
        const end = csr.offsets[i + 1];

        for (let j = start; j < end; j++) {
          const targetIdx = csr.edges[j];
          const targetId = csr.nodeIds[targetIdx];
          const weight = csr.weights[j];
          reconstructed.push([sourceId, targetId, weight]);
        }
      }

      // Sort both arrays for comparison (CSR may reorder edges per node)
      const sortEdges = (a: [string, string, number], b: [string, string, number]) => {
        if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
        if (a[1] !== b[1]) return a[1].localeCompare(b[1]);
        return a[2] - b[2];
      };

      expect(reconstructed.sort(sortEdges)).toEqual(edges.sort(sortEdges));
    });

    it('should handle self-loops correctly', () => {
      const graph = new Graph<TestNode, TestEdge>(true);
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });

      // A → A (self-loop), A → B
      graph.addEdge({ id: 'E1', source: 'A', target: 'A', type: 'test', weight: 1.0 });
      graph.addEdge({ id: 'E2', source: 'A', target: 'B', type: 'test', weight: 2.0 });

      const csr = convertToCSR(graph);

      expect(Array.from(csr.offsets)).toEqual([0, 2, 2]); // A has 2 neighbors, B has 0
      expect(Array.from(csr.edges)).toEqual([0, 1]); // A points to itself and B
      expect(Array.from(csr.weights)).toEqual([1.0, 2.0]);
    });

    it('should throw RangeError for graph exceeding Uint32Array limit', () => {
      // This test is symbolic - can't actually create 4B+ nodes in memory
      const graph = new Graph<TestNode, TestEdge>(true);

      // Mock graph with excessive node count
      // @ts-expect-error - Testing internal behavior
      graph.getAllNodes = () => new Array(0x100000000); // 2^32 nodes

      expect(() => convertToCSR(graph)).toThrow(RangeError);
      // Error message varies by engine: "Invalid array length" or "exceeding Uint32Array limit"
      expect(() => convertToCSR(graph)).toThrow(/Invalid array length|exceeding Uint32Array limit/);
    });
  });
});
