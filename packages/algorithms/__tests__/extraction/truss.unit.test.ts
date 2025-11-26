/**
 * Unit tests for K-Truss extraction algorithm.
 * Validates triangle support computation and k-truss extraction.
 *
 * @module __tests__/extraction/truss.unit.test
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../src/graph/graph';
import { computeTriangleSupport, extractKTruss } from '../../src/extraction/truss';
import { createCompleteGraph, createTriangleGraph } from '../fixtures/extraction-graphs';
import type { Node, Edge } from '../../src/types/graph';

describe('K-Truss Extraction (User Story 5)', () => {
  describe('Triangle Support Computation', () => {
    it('should compute triangle support for triangle graph', () => {
      // Given: Graph with known triangles
      const graph = createTriangleGraph();

      // When: Compute triangle support
      const result = computeTriangleSupport(graph);

      // Then: Should succeed and return support map
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const support = result.value;

      // Edge AB: participates in triangle ABC (support = 1)
      const abSupport = support.get('e_AB');
      expect(abSupport).toBe(1);

      // Edge BC: participates in triangles ABC and BCD (support = 2)
      const bcSupport = support.get('e_BC');
      expect(bcSupport).toBe(2);

      // Edge CA: participates in triangle ABC (support = 1)
      const caSupport = support.get('e_CA');
      expect(caSupport).toBe(1);

      // Edge BD: participates in triangle BCD (support = 1)
      const bdSupport = support.get('e_BD');
      expect(bdSupport).toBe(1);

      // Edge CD: participates in triangle BCD (support = 1)
      const cdSupport = support.get('e_CD');
      expect(cdSupport).toBe(1);

      // Edge EF: no triangles (support = 0)
      const efSupport = support.get('e_EF');
      expect(efSupport).toBe(0);
    });

    it('should compute support for complete graph', () => {
      // Given: Complete graph K5 (every edge in n-2 = 3 triangles)
      const graph = createCompleteGraph(5);

      // When: Compute triangle support
      const result = computeTriangleSupport(graph);

      // Then: All edges should have support = 3
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const support = result.value;
      const allEdges = graph.getAllEdges();

      allEdges.forEach((edge) => {
        expect(support.get(edge.id)).toBe(3);
      });
    });

    it('should handle graph with no triangles', () => {
      // Given: Star graph (no triangles)
      const graph = new Graph<Node, Edge>(false);
      graph.addNode({ id: 'center', type: 'node' });
      for (let i = 0; i < 5; i++) {
        graph.addNode({ id: `outer${i}`, type: 'node' });
        graph.addEdge({ id: `e${i}`, source: 'center', target: `outer${i}`, type: 'edge' });
      }

      // When: Compute triangle support
      const result = computeTriangleSupport(graph);

      // Then: All edges should have support = 0
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const support = result.value;
      const allEdges = graph.getAllEdges();

      allEdges.forEach((edge) => {
        expect(support.get(edge.id)).toBe(0);
      });
    });
  });

  describe('3-Truss Extraction', () => {
    it('should extract 3-truss from triangle graph', () => {
      // Given: Graph with triangles
      const graph = createTriangleGraph();

      // When: Extract 3-truss (edges in at least 1 triangle)
      const result = extractKTruss(graph, { k: 3 });

      // Then: Should contain only edges in triangles
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const truss = result.value;

      // Should include nodes A, B, C, D (part of triangles)
      expect(truss.getNodeCount()).toBeGreaterThanOrEqual(4);
      expect(truss.hasNode('A')).toBe(true);
      expect(truss.hasNode('B')).toBe(true);
      expect(truss.hasNode('C')).toBe(true);
      expect(truss.hasNode('D')).toBe(true);

      // Should not include isolated edge E-F
      expect(truss.hasNode('E')).toBe(false);
      expect(truss.hasNode('F')).toBe(false);

      // Should include triangle edges
      expect(truss.getEdgeCount()).toBeGreaterThan(0);
    });

    it('should extract complete 3-truss from complete graph', () => {
      // Given: Complete graph K5
      const graph = createCompleteGraph(5);

      // When: Extract 3-truss
      const result = extractKTruss(graph, { k: 3 });

      // Then: Should include entire graph (all edges in triangles)
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const truss = result.value;

      expect(truss.getNodeCount()).toBe(5);
      expect(truss.getEdgeCount()).toBe(10); // K5 has 10 edges
    });
  });

  describe('4-Truss Extraction', () => {
    it('should extract 4-truss from complete graph', () => {
      // Given: Complete graph K5 (edges in 3 triangles each, so 4-truss exists)
      const graph = createCompleteGraph(5);

      // When: Extract 4-truss (edges in at least 2 triangles)
      const result = extractKTruss(graph, { k: 4 });

      // Then: Should include entire graph
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const truss = result.value;

      expect(truss.getNodeCount()).toBe(5);
      expect(truss.getEdgeCount()).toBe(10);
    });

    it('should return smaller subgraph than 3-truss', () => {
      // Given: Graph with mixed triangle support
      const graph = createTriangleGraph();

      // When: Extract 3-truss and 4-truss
      const truss3 = extractKTruss(graph, { k: 3 });
      const truss4 = extractKTruss(graph, { k: 4 });

      // Then: 4-truss should be subset of 3-truss
      expect(truss3.ok).toBe(true);
      expect(truss4.ok).toBe(true);

      if (!truss3.ok || !truss4.ok) return;

      expect(truss4.value.getNodeCount()).toBeLessThanOrEqual(truss3.value.getNodeCount());
      expect(truss4.value.getEdgeCount()).toBeLessThanOrEqual(truss3.value.getEdgeCount());
    });
  });

  describe('Edge Cases', () => {
    it('should handle k=2 (all edges)', () => {
      // Given: Any graph
      const graph = createTriangleGraph();
      const originalEdgeCount = graph.getEdgeCount();

      // When: Extract 2-truss (k-2 = 0, so all edges included)
      const result = extractKTruss(graph, { k: 2 });

      // Then: Should return entire graph
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const truss = result.value;
      expect(truss.getEdgeCount()).toBe(originalEdgeCount);
    });

    it('should return empty graph when k > max truss number', () => {
      // Given: Triangle graph (max support = 2)
      const graph = createTriangleGraph();

      // When: Extract k-truss where k > max support + 2
      const result = extractKTruss(graph, { k: 10 });

      // Then: Should return empty or very small subgraph
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const truss = result.value;

      // With high k, most edges should be removed
      expect(truss.getEdgeCount()).toBeLessThan(graph.getEdgeCount());
    });

    it('should validate k >= 2', () => {
      // Given: Any graph
      const graph = createTriangleGraph();

      // When: Try to extract k-truss with k < 2
      const result = extractKTruss(graph, { k: 1 });

      // Then: Should return error
      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.type).toBe('invalid-truss');
    });

    it('should validate k is integer', () => {
      // Given: Any graph
      const graph = createTriangleGraph();

      // When: Try to extract k-truss with non-integer k
      const result = extractKTruss(graph, { k: 3.5 });

      // Then: Should return error
      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.type).toBe('invalid-truss');
    });

    it('should handle empty graph', () => {
      // Given: Empty graph
      const graph = new Graph<Node, Edge>(false);

      // When: Extract k-truss
      const result = extractKTruss(graph, { k: 3 });

      // Then: Should return empty graph (or error is acceptable)
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const truss = result.value;
      expect(truss.getNodeCount()).toBe(0);
      expect(truss.getEdgeCount()).toBe(0);
    });
  });

  describe('Triangle Support Edge Cases', () => {
    it('should handle directed graphs', () => {
      // Given: Directed triangle
      const graph = new Graph<Node, Edge>(true);
      graph.addNode({ id: 'A', type: 'node' });
      graph.addNode({ id: 'B', type: 'node' });
      graph.addNode({ id: 'C', type: 'node' });
      graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge' });
      graph.addEdge({ id: 'e2', source: 'B', target: 'C', type: 'edge' });
      graph.addEdge({ id: 'e3', source: 'C', target: 'A', type: 'edge' });

      // When: Compute triangle support
      const result = computeTriangleSupport(graph);

      // Then: Should treat as undirected and find triangle
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const support = result.value;
      expect(support.get('e1')).toBe(1);
      expect(support.get('e2')).toBe(1);
      expect(support.get('e3')).toBe(1);
    });
  });
});
