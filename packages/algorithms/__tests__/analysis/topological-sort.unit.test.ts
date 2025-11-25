import { describe, it, expect, beforeEach } from 'vitest';
import { Graph } from '../../src/graph/graph';
import { topologicalSort } from '../../src/analysis/topological-sort';
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
}

describe('topologicalSort', () => {
  let graph: Graph<TestNode, TestEdge>;

  beforeEach(() => {
    graph = new Graph<TestNode, TestEdge>(true); // Directed graph
  });

  describe('Valid DAG ordering', () => {
    it('should return valid topological ordering for simple DAG', () => {
      // Create DAG: A -> B -> C
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });

      const result = topologicalSort(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const order = result.value.map(n => n.id);
        expect(order).toHaveLength(3);

        // Verify A comes before B, B comes before C
        const indexA = order.indexOf('A');
        const indexB = order.indexOf('B');
        const indexC = order.indexOf('C');

        expect(indexA).toBeLessThan(indexB);
        expect(indexB).toBeLessThan(indexC);
      }
    });

    it('should handle diamond DAG correctly', () => {
      // Create diamond DAG:
      //     A
      //    / \
      //   B   C
      //    \ /
      //     D
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addNode({ id: 'D', type: 'test', label: 'Node D' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'A', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'B', target: 'D', type: 'test-edge' });
      graph.addEdge({ id: 'E4', source: 'C', target: 'D', type: 'test-edge' });

      const result = topologicalSort(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const order = result.value.map(n => n.id);

        // Verify constraints: A before B/C, B/C before D
        const indexA = order.indexOf('A');
        const indexB = order.indexOf('B');
        const indexC = order.indexOf('C');
        const indexD = order.indexOf('D');

        expect(indexA).toBeLessThan(indexB);
        expect(indexA).toBeLessThan(indexC);
        expect(indexB).toBeLessThan(indexD);
        expect(indexC).toBeLessThan(indexD);
      }
    });

    it('should verify all edges point forward in ordering', () => {
      // Create complex DAG
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addNode({ id: 'D', type: 'test', label: 'Node D' });
      graph.addNode({ id: 'E', type: 'test', label: 'Node E' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'A', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'B', target: 'D', type: 'test-edge' });
      graph.addEdge({ id: 'E4', source: 'C', target: 'D', type: 'test-edge' });
      graph.addEdge({ id: 'E5', source: 'D', target: 'E', type: 'test-edge' });

      const result = topologicalSort(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const order = result.value.map(n => n.id);
        const positions = new Map(order.map((id, i) => [id, i]));

        // Verify every edge points forward
        const edges = graph.getAllEdges();
        for (const edge of edges) {
          const sourcePos = positions.get(edge.source)!;
          const targetPos = positions.get(edge.target)!;
          expect(sourcePos).toBeLessThan(targetPos);
        }
      }
    });
  });

  describe('Cycle detection', () => {
    it('should detect simple cycle', () => {
      // Create cycle: A -> B -> C -> A
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'C', target: 'A', type: 'test-edge' });

      const result = topologicalSort(graph);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('cycle-detected');
        expect(result.error.cyclePath).toBeDefined();
        expect(result.error.cyclePath!.length).toBeGreaterThan(0);
      }
    });

    it('should detect self-loop', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'A', type: 'test-edge' });

      const result = topologicalSort(graph);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('cycle-detected');
      }
    });

    it('should detect cycle in larger graph', () => {
      // DAG with embedded cycle: A -> B -> C -> D -> B
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addNode({ id: 'D', type: 'test', label: 'Node D' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'C', target: 'D', type: 'test-edge' });
      graph.addEdge({ id: 'E4', source: 'D', target: 'B', type: 'test-edge' }); // Back edge

      const result = topologicalSort(graph);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('cycle-detected');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty graph', () => {
      const result = topologicalSort(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should handle single node', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });

      const result = topologicalSort(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].id).toBe('A');
      }
    });

    it('should handle disconnected components', () => {
      // Two disconnected components: A -> B, C -> D
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addNode({ id: 'D', type: 'test', label: 'Node D' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'C', target: 'D', type: 'test-edge' });

      const result = topologicalSort(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(4);

        const order = result.value.map(n => n.id);
        const positions = new Map(order.map((id, i) => [id, i]));

        // Verify constraints within each component
        expect(positions.get('A')).toBeLessThan(positions.get('B')!);
        expect(positions.get('C')).toBeLessThan(positions.get('D')!);
      }
    });

    it('should handle null graph', () => {
      const result = topologicalSort(null as unknown as Graph<TestNode, TestEdge>);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });

    it('should handle nodes with no edges', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });

      const result = topologicalSort(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(3);
      }
    });
  });

  describe('Type preservation', () => {
    it('should preserve node type information', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });

      const result = topologicalSort(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        result.value.forEach(node => {
          expect(node.type).toBe('test');
          expect(node).toHaveProperty('label');
        });
      }
    });
  });
});
