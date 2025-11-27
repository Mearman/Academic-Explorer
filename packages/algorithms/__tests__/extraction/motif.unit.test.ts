import { describe, it, expect } from 'vitest';

import {
  detectTriangles,
  detectStarPatterns,
  detectCoCitations,
  detectBibliographicCoupling,
} from '../../src/extraction/motif';
import { Graph } from '../../src/graph/graph';
import { type Node, type Edge } from '../../src/types/graph';
import {
  createTriangleGraph,
  createCoCitationGraph,
  createBibliographicCouplingGraph,
  createStarGraph,
} from '../fixtures/extraction-graphs';

interface TestNode extends Node {
  id: string;
  type: string;
}

interface TestEdge extends Edge {
  id: string;
  source: string;
  target: string;
  type: string;
}

describe('motif detection', () => {
  describe('detectTriangles', () => {
    it('should detect all triangles in known graph', () => {
      const graph = createTriangleGraph();
      const result = detectTriangles(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const triangles = result.value;

        // Should find exactly 2 triangles: [A,B,C] and [B,C,D]
        expect(triangles).toHaveLength(2);

        // Convert to sorted sets for easier comparison
        const triangleSets = triangles.map(t =>
          new Set(t.nodes.map(n => n.id).sort())
        );

        // Check for triangle ABC
        const hasABC = triangleSets.some(set =>
          set.size === 3 && set.has('A') && set.has('B') && set.has('C')
        );
        expect(hasABC).toBe(true);

        // Check for triangle BCD
        const hasBCD = triangleSets.some(set =>
          set.size === 3 && set.has('B') && set.has('C') && set.has('D')
        );
        expect(hasBCD).toBe(true);
      }
    });

    it('should return empty array for graph with no triangles', () => {
      const graph = new Graph<TestNode, TestEdge>(false);

      // Create a star (no triangles)
      graph.addNode({ id: 'center', type: 'node' });
      graph.addNode({ id: 'a', type: 'node' });
      graph.addNode({ id: 'b', type: 'node' });
      graph.addNode({ id: 'c', type: 'node' });
      graph.addEdge({ id: 'e1', source: 'center', target: 'a', type: 'edge' });
      graph.addEdge({ id: 'e2', source: 'center', target: 'b', type: 'edge' });
      graph.addEdge({ id: 'e3', source: 'center', target: 'c', type: 'edge' });

      const result = detectTriangles(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should handle empty graph', () => {
      const graph = new Graph<TestNode, TestEdge>(false);
      const result = detectTriangles(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should handle self-loops', () => {
      const graph = new Graph<TestNode, TestEdge>(false);

      graph.addNode({ id: 'A', type: 'node' });
      graph.addNode({ id: 'B', type: 'node' });
      graph.addNode({ id: 'C', type: 'node' });

      // Add triangle
      graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge' });
      graph.addEdge({ id: 'e2', source: 'B', target: 'C', type: 'edge' });
      graph.addEdge({ id: 'e3', source: 'C', target: 'A', type: 'edge' });

      // Add self-loop
      graph.addEdge({ id: 'e4', source: 'A', target: 'A', type: 'edge' });

      const result = detectTriangles(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should still find the triangle, self-loop ignored
        expect(result.value).toHaveLength(1);
      }
    });
  });

  describe('detectStarPatterns', () => {
    it('should detect in-star patterns (high in-degree)', () => {
      const graph = new Graph<TestNode, TestEdge>(true);

      // Create in-star: multiple nodes point to center
      graph.addNode({ id: 'center', type: 'node' });
      graph.addNode({ id: 'a', type: 'node' });
      graph.addNode({ id: 'b', type: 'node' });
      graph.addNode({ id: 'c', type: 'node' });
      graph.addEdge({ id: 'e1', source: 'a', target: 'center', type: 'edge' });
      graph.addEdge({ id: 'e2', source: 'b', target: 'center', type: 'edge' });
      graph.addEdge({ id: 'e3', source: 'c', target: 'center', type: 'edge' });

      const result = detectStarPatterns(graph, { minDegree: 3, type: 'in' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const stars = result.value;
        expect(stars).toHaveLength(1);
        expect(stars[0].hub.id).toBe('center');
        expect(stars[0].leaves).toHaveLength(3);

        const leafIds = stars[0].leaves.map(n => n.id).sort();
        expect(leafIds).toEqual(['a', 'b', 'c']);
      }
    });

    it('should detect out-star patterns (high out-degree)', () => {
      const graph = new Graph<TestNode, TestEdge>(true);

      // Create out-star: center points to multiple nodes
      graph.addNode({ id: 'center', type: 'node' });
      graph.addNode({ id: 'a', type: 'node' });
      graph.addNode({ id: 'b', type: 'node' });
      graph.addNode({ id: 'c', type: 'node' });
      graph.addNode({ id: 'd', type: 'node' });
      graph.addEdge({ id: 'e1', source: 'center', target: 'a', type: 'edge' });
      graph.addEdge({ id: 'e2', source: 'center', target: 'b', type: 'edge' });
      graph.addEdge({ id: 'e3', source: 'center', target: 'c', type: 'edge' });
      graph.addEdge({ id: 'e4', source: 'center', target: 'd', type: 'edge' });

      const result = detectStarPatterns(graph, { minDegree: 4, type: 'out' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const stars = result.value;
        expect(stars).toHaveLength(1);
        expect(stars[0].hub.id).toBe('center');
        expect(stars[0].leaves).toHaveLength(4);

        const leafIds = stars[0].leaves.map(n => n.id).sort();
        expect(leafIds).toEqual(['a', 'b', 'c', 'd']);
      }
    });

    it('should detect stars in undirected graph', () => {
      const graph = createStarGraph(5);

      const result = detectStarPatterns(graph, { minDegree: 5, type: 'out' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const stars = result.value;
        expect(stars).toHaveLength(1);
        expect(stars[0].hub.id).toBe('center');
        expect(stars[0].leaves).toHaveLength(5);
      }
    });

    it('should return empty array when no stars meet threshold', () => {
      const graph = new Graph<TestNode, TestEdge>(true);

      graph.addNode({ id: 'a', type: 'node' });
      graph.addNode({ id: 'b', type: 'node' });
      graph.addEdge({ id: 'e1', source: 'a', target: 'b', type: 'edge' });

      const result = detectStarPatterns(graph, { minDegree: 3, type: 'out' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should handle self-loops in degree calculation', () => {
      const graph = new Graph<TestNode, TestEdge>(true);

      graph.addNode({ id: 'center', type: 'node' });
      graph.addNode({ id: 'a', type: 'node' });
      graph.addNode({ id: 'b', type: 'node' });
      graph.addEdge({ id: 'e1', source: 'center', target: 'a', type: 'edge' });
      graph.addEdge({ id: 'e2', source: 'center', target: 'b', type: 'edge' });
      graph.addEdge({ id: 'e3', source: 'center', target: 'center', type: 'edge' }); // self-loop

      const result = detectStarPatterns(graph, { minDegree: 2, type: 'out' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const stars = result.value;
        expect(stars).toHaveLength(1);
        expect(stars[0].hub.id).toBe('center');
        // Self-loop should be excluded from leaves
        expect(stars[0].leaves).toHaveLength(2);
      }
    });
  });

  describe('detectCoCitations', () => {
    it('should detect co-citation pairs in known graph', () => {
      const graph = createCoCitationGraph();
      const result = detectCoCitations(graph, { minCount: 3 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const pairs = result.value;

        // Should find R1-R2 pair cited together by P1, P2, P3
        expect(pairs.length).toBeGreaterThanOrEqual(1);

        const r1r2Pair = pairs.find(p =>
          (p.paper1.id === 'R1' && p.paper2.id === 'R2') ||
          (p.paper1.id === 'R2' && p.paper2.id === 'R1')
        );

        expect(r1r2Pair).toBeDefined();
        if (r1r2Pair) {
          expect(r1r2Pair.count).toBe(3); // Cited together by P1, P2, P3
        }
      }
    });

    it('should respect minimum count threshold', () => {
      const graph = createCoCitationGraph();

      // With high threshold, should find fewer pairs
      const result = detectCoCitations(graph, { minCount: 4 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // No pairs cited together 4+ times
        expect(result.value).toHaveLength(0);
      }
    });

    it('should return empty array for graph with no co-citations', () => {
      const graph = new Graph<TestNode, TestEdge>(true);

      graph.addNode({ id: 'P1', type: 'paper' });
      graph.addNode({ id: 'R1', type: 'paper' });
      graph.addNode({ id: 'R2', type: 'paper' });
      graph.addEdge({ id: 'e1', source: 'P1', target: 'R1', type: 'cites' });

      const result = detectCoCitations(graph, { minCount: 1 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should handle parallel edges', () => {
      const graph = new Graph<TestNode, TestEdge>(true);

      graph.addNode({ id: 'P1', type: 'paper' });
      graph.addNode({ id: 'P2', type: 'paper' });
      graph.addNode({ id: 'R1', type: 'paper' });
      graph.addNode({ id: 'R2', type: 'paper' });

      // Both papers cite both references
      graph.addEdge({ id: 'e1', source: 'P1', target: 'R1', type: 'cites' });
      graph.addEdge({ id: 'e2', source: 'P1', target: 'R2', type: 'cites' });
      graph.addEdge({ id: 'e3', source: 'P2', target: 'R1', type: 'cites' });
      graph.addEdge({ id: 'e4', source: 'P2', target: 'R2', type: 'cites' });

      // Duplicate edge (parallel edge)
      graph.addEdge({ id: 'e5', source: 'P2', target: 'R1', type: 'cites' });

      const result = detectCoCitations(graph, { minCount: 2 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should handle gracefully (count papers, not edges)
        expect(result.value.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('detectBibliographicCoupling', () => {
    it('should detect bibliographic coupling in known graph', () => {
      const graph = createBibliographicCouplingGraph();
      const result = detectBibliographicCoupling(graph, { minShared: 2 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const pairs = result.value;

        // Should find citing1-citing2 pair (both cite ref1 and ref2)
        expect(pairs).toHaveLength(1);

        const coupling = pairs[0];
        const ids = new Set([coupling.paper1.id, coupling.paper2.id]);
        expect(ids.has('citing1')).toBe(true);
        expect(ids.has('citing2')).toBe(true);
        expect(coupling.sharedReferences).toBe(2); // ref1 and ref2
      }
    });

    it('should respect minimum shared references threshold', () => {
      const graph = createBibliographicCouplingGraph();

      // With high threshold, should find no pairs
      const result = detectBibliographicCoupling(graph, { minShared: 3 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should return empty array for graph with no coupling', () => {
      const graph = new Graph<TestNode, TestEdge>(true);

      graph.addNode({ id: 'P1', type: 'paper' });
      graph.addNode({ id: 'P2', type: 'paper' });
      graph.addNode({ id: 'R1', type: 'reference' });
      graph.addNode({ id: 'R2', type: 'reference' });
      graph.addEdge({ id: 'e1', source: 'P1', target: 'R1', type: 'cites' });
      graph.addEdge({ id: 'e2', source: 'P2', target: 'R2', type: 'cites' });

      const result = detectBibliographicCoupling(graph, { minShared: 1 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should handle papers citing themselves', () => {
      const graph = new Graph<TestNode, TestEdge>(true);

      graph.addNode({ id: 'P1', type: 'paper' });
      graph.addNode({ id: 'P2', type: 'paper' });
      graph.addNode({ id: 'R1', type: 'reference' });

      graph.addEdge({ id: 'e1', source: 'P1', target: 'R1', type: 'cites' });
      graph.addEdge({ id: 'e2', source: 'P1', target: 'P1', type: 'cites' }); // self-citation
      graph.addEdge({ id: 'e3', source: 'P2', target: 'R1', type: 'cites' });

      const result = detectBibliographicCoupling(graph, { minShared: 1 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should find coupling on R1
        expect(result.value).toHaveLength(1);
        expect(result.value[0].sharedReferences).toBe(1);
      }
    });
  });
});
