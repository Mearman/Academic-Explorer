import { describe, it, expect, beforeEach } from 'vitest';

import { Graph } from '../../src/graph/graph';
import { dijkstra } from '../../src/pathfinding/dijkstra';
import { type Node, type Edge } from '../../src/types/graph';

interface TestNode extends Node {
  id: string;
  type: 'test';
  label: string;
}

interface TestEdge extends Edge {
  id: string;
  source: string;
  target: string;
  type: 'test-edge';
  weight?: number;
}

describe('dijkstra (Shortest Path)', () => {
  let graph: Graph<TestNode, TestEdge>;

  beforeEach(() => {
    graph = new Graph<TestNode, TestEdge>(true);
  });

  describe('Basic path finding', () => {
    it('should find shortest path in unweighted graph (fewest edges)', () => {
      // Create graph: A -> B -> D (2 edges)
      //                \\-> C -> D (2 edges)
      // Direct: A -> D (1 edge) - should be chosen
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addNode({ id: 'D', type: 'test', label: 'Node D' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'D', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'A', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E4', source: 'C', target: 'D', type: 'test-edge' });
      graph.addEdge({ id: 'E5', source: 'A', target: 'D', type: 'test-edge' }); // Direct path

      const result = dijkstra(graph, 'A', 'D');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.some).toBe(true);
        if (result.value.some) {
          const path = result.value.value;
          expect(path.nodes).toHaveLength(2); // A -> D
          expect(path.nodes[0].id).toBe('A');
          expect(path.nodes[1].id).toBe('D');
          expect(path.edges).toHaveLength(1);
          expect(path.totalWeight).toBe(1); // Default weight is 1
        }
      }
    });

    it('should find shortest path in weighted graph (minimum total weight)', () => {
      // Create weighted graph:
      // A -> B (weight 1) -> D (weight 1) = total 2
      // A -> C (weight 10) -> D (weight 1) = total 11
      // Should choose A -> B -> D
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addNode({ id: 'D', type: 'test', label: 'Node D' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge', weight: 1 });
      graph.addEdge({ id: 'E2', source: 'B', target: 'D', type: 'test-edge', weight: 1 });
      graph.addEdge({ id: 'E3', source: 'A', target: 'C', type: 'test-edge', weight: 10 });
      graph.addEdge({ id: 'E4', source: 'C', target: 'D', type: 'test-edge', weight: 1 });

      const result = dijkstra(graph, 'A', 'D');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.some).toBe(true);
        if (result.value.some) {
          const path = result.value.value;
          expect(path.nodes.map(n => n.id)).toEqual(['A', 'B', 'D']);
          expect(path.totalWeight).toBe(2);
        }
      }
    });

    it('should return None for disconnected nodes', () => {
      // Create disconnected components: A -> B, C -> D
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addNode({ id: 'D', type: 'test', label: 'Node D' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'C', target: 'D', type: 'test-edge' });

      const result = dijkstra(graph, 'A', 'D');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.some).toBe(false); // No path exists
      }
    });

    it('should return error for negative edge weights', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge', weight: -5 });

      const result = dijkstra(graph, 'A', 'B');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('negative-weight');
      }
    });
  });

  describe('Path reconstruction', () => {
    it('should reconstruct path correctly with nodes and edges', () => {
      // Create simple path: A -> B -> C
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge', weight: 5 });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge', weight: 3 });

      const result = dijkstra(graph, 'A', 'C');

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const path = result.value.value;

        // Verify nodes
        expect(path.nodes).toHaveLength(3);
        expect(path.nodes[0].id).toBe('A');
        expect(path.nodes[1].id).toBe('B');
        expect(path.nodes[2].id).toBe('C');

        // Verify edges
        expect(path.edges).toHaveLength(2);
        expect(path.edges[0].id).toBe('E1');
        expect(path.edges[1].id).toBe('E2');

        // Verify total weight
        expect(path.totalWeight).toBe(8); // 5 + 3
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle single node (trivial path)', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });

      const result = dijkstra(graph, 'A', 'A');

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const path = result.value.value;
        expect(path.nodes).toHaveLength(1);
        expect(path.nodes[0].id).toBe('A');
        expect(path.edges).toHaveLength(0);
        expect(path.totalWeight).toBe(0);
      }
    });

    it('should return error for non-existent start node', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });

      const result = dijkstra(graph, 'Z', 'A');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });

    it('should return error for non-existent end node', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });

      const result = dijkstra(graph, 'A', 'Z');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });

    it('should handle null graph', () => {
      const result = dijkstra(null as unknown as Graph<TestNode, TestEdge>, 'A', 'B');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });

    it('should handle zero-weight edges', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge', weight: 0 });

      const result = dijkstra(graph, 'A', 'B');

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        expect(result.value.value.totalWeight).toBe(0);
      }
    });
  });

  describe('Complex scenarios', () => {
    it('should choose minimum weight path when multiple paths exist', () => {
      // Create diamond graph:
      //     B (weight 2)
      //    / \\
      //   A   D
      //    \\ /
      //     C (weight 1 each)
      // Path via C should be chosen (total weight 2 vs path via B weight 4)
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addNode({ id: 'D', type: 'test', label: 'Node D' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge', weight: 2 });
      graph.addEdge({ id: 'E2', source: 'B', target: 'D', type: 'test-edge', weight: 2 });
      graph.addEdge({ id: 'E3', source: 'A', target: 'C', type: 'test-edge', weight: 1 });
      graph.addEdge({ id: 'E4', source: 'C', target: 'D', type: 'test-edge', weight: 1 });

      const result = dijkstra(graph, 'A', 'D');

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const path = result.value.value;
        expect(path.nodes.map(n => n.id)).toEqual(['A', 'C', 'D']);
        expect(path.totalWeight).toBe(2);
      }
    });

    it('should handle graph with self-loops', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'A', type: 'test-edge', weight: 5 }); // Self-loop
      graph.addEdge({ id: 'E2', source: 'A', target: 'B', type: 'test-edge', weight: 3 });

      const result = dijkstra(graph, 'A', 'B');

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const path = result.value.value;
        // Should go directly A -> B, not through self-loop
        expect(path.nodes.map(n => n.id)).toEqual(['A', 'B']);
        expect(path.totalWeight).toBe(3);
      }
    });
  });

  describe('Type preservation', () => {
    it('should preserve node and edge type information', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge', weight: 5 });

      const result = dijkstra(graph, 'A', 'B');

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const path = result.value.value;

        // Verify node types are preserved
        path.nodes.forEach(node => {
          expect(node.type).toBe('test');
          expect(node).toHaveProperty('label');
        });

        // Verify edge types are preserved
        path.edges.forEach(edge => {
          expect(edge.type).toBe('test-edge');
          expect(edge).toHaveProperty('weight');
        });
      }
    });
  });
});
