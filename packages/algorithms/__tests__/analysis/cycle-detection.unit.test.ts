import { describe, it, expect, beforeEach } from 'vitest';
import { Graph } from '../../src/graph/graph';
import { detectCycle } from '../../src/analysis/cycle-detection';
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

describe('detectCycle', () => {
  describe('Directed graphs', () => {
    let graph: Graph<TestNode, TestEdge>;

    beforeEach(() => {
      graph = new Graph<TestNode, TestEdge>(true);
    });

    it('should detect simple cycle', () => {
      // Create cycle: A -> B -> C -> A
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'C', target: 'A', type: 'test-edge' });

      const result = detectCycle(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.some).toBe(true);
        if (result.value.some) {
          const cycle = result.value.value;
          expect(cycle.nodes.length).toBeGreaterThanOrEqual(2);
          // Verify it's a cycle (first and last node should be same)
          expect(cycle.nodes[0].id).toBe(cycle.nodes[cycle.nodes.length - 1].id);
        }
      }
    });

    it('should detect self-loop', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'A', type: 'test-edge' });

      const result = detectCycle(graph);

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const cycle = result.value.value;
        expect(cycle.nodes).toHaveLength(2); // [A, A]
        expect(cycle.nodes[0].id).toBe('A');
        expect(cycle.edges).toHaveLength(1);
      }
    });

    it('should return None for acyclic graph', () => {
      // Create DAG: A -> B -> C
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });

      const result = detectCycle(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.some).toBe(false);
      }
    });

    it('should detect cycle in one component of disconnected graph', () => {
      // Component 1 (cyclic): A -> B -> A
      // Component 2 (acyclic): C -> D
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addNode({ id: 'D', type: 'test', label: 'Node D' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'A', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'C', target: 'D', type: 'test-edge' });

      const result = detectCycle(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.some).toBe(true); // Cycle exists in component 1
      }
    });

    it('should include edge information in cycle', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'C', target: 'A', type: 'test-edge' });

      const result = detectCycle(graph);

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const cycle = result.value.value;
        expect(cycle.edges.length).toBe(3);
        expect(cycle.edges.map(e => e.id)).toContain('E1');
        expect(cycle.edges.map(e => e.id)).toContain('E2');
        expect(cycle.edges.map(e => e.id)).toContain('E3');
      }
    });
  });

  describe('Undirected graphs', () => {
    let graph: Graph<TestNode, TestEdge>;

    beforeEach(() => {
      graph = new Graph<TestNode, TestEdge>(false); // Undirected
    });

    it('should detect cycle in undirected graph', () => {
      // Triangle: A - B - C - A
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'C', target: 'A', type: 'test-edge' });

      const result = detectCycle(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.some).toBe(true);
      }
    });

    it('should return None for tree (no cycles)', () => {
      // Tree: A - B - C
      //           |
      //           D
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addNode({ id: 'D', type: 'test', label: 'Node D' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'B', target: 'D', type: 'test-edge' });

      const result = detectCycle(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.some).toBe(false);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty graph', () => {
      const graph = new Graph<TestNode, TestEdge>(true);
      const result = detectCycle(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.some).toBe(false);
      }
    });

    it('should handle single node', () => {
      const graph = new Graph<TestNode, TestEdge>(true);
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });

      const result = detectCycle(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.some).toBe(false);
      }
    });

    it('should handle null graph', () => {
      const result = detectCycle(null as unknown as Graph<TestNode, TestEdge>);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });
  });

  describe('Type preservation', () => {
    it('should preserve node and edge types in cycle', () => {
      const graph = new Graph<TestNode, TestEdge>(true);

      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'A', type: 'test-edge' });

      const result = detectCycle(graph);

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const cycle = result.value.value;
        cycle.nodes.forEach(node => {
          expect(node.type).toBe('test');
          expect(node).toHaveProperty('label');
        });
        cycle.edges.forEach(edge => {
          expect(edge.type).toBe('test-edge');
        });
      }
    });
  });
});
