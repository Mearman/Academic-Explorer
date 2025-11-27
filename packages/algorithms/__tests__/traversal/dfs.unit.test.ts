import { describe, it, expect, beforeEach } from 'vitest';

import { Graph } from '../../src/graph/graph';
import { dfs } from '../../src/traversal/dfs';
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

describe('dfs (Depth-First Search)', () => {
  let graph: Graph<TestNode, TestEdge>;

  beforeEach(() => {
    graph = new Graph<TestNode, TestEdge>(true);
  });

  describe('Basic traversal', () => {
    it('should traverse connected graph in depth-first order', () => {
      // Create graph: A -> B -> C
      //                \-> D
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addNode({ id: 'D', type: 'test', label: 'Node D' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'A', target: 'D', type: 'test-edge' });

      const result = dfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.visitOrder).toHaveLength(4);
        expect(result.value.visitOrder[0].id).toBe('A'); // Start node
        expect(result.value.visitOrder.map(n => n.id)).toContain('B');
        expect(result.value.visitOrder.map(n => n.id)).toContain('C');
        expect(result.value.visitOrder.map(n => n.id)).toContain('D');
      }
    });

    it('should visit each node exactly once', () => {
      // Create graph with cycle: A -> B -> C -> A
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'C', target: 'A', type: 'test-edge' });

      const result = dfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.visitOrder).toHaveLength(3); // Each node visited once
        const ids = result.value.visitOrder.map(n => n.id);
        expect(new Set(ids).size).toBe(3); // All unique
      }
    });

    it('should only visit reachable nodes from start', () => {
      // Create graph with disconnected component: A -> B, C -> D
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addNode({ id: 'D', type: 'test', label: 'Node D' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'C', target: 'D', type: 'test-edge' });

      const result = dfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.visitOrder).toHaveLength(2); // Only A and B
        const ids = result.value.visitOrder.map(n => n.id);
        expect(ids).toContain('A');
        expect(ids).toContain('B');
        expect(ids).not.toContain('C');
        expect(ids).not.toContain('D');
      }
    });
  });

  describe('Parent tracking', () => {
    it('should track parent relationships correctly', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });

      const result = dfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.parents.get('A')).toBeNull(); // Root has no parent
        expect(result.value.parents.get('B')).toBe('A');
        expect(result.value.parents.get('C')).toBe('B');
      }
    });
  });

  describe('Discovery and finish times', () => {
    it('should record discovery and finish times', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });

      const result = dfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.discovered).toBeDefined();
        expect(result.value.finished).toBeDefined();
        expect(result.value.discovered!.get('A')).toBeLessThan(result.value.discovered!.get('B')!);
        expect(result.value.finished!.get('B')).toBeLessThan(result.value.finished!.get('A')!);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle single node graph', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });

      const result = dfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.visitOrder).toHaveLength(1);
        expect(result.value.visitOrder[0].id).toBe('A');
      }
    });

    it('should return error for non-existent start node', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });

      const result = dfs(graph, 'Z');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });

    it('should handle null graph', () => {
      const result = dfs(null as unknown as Graph<TestNode, TestEdge>, 'A');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });

    it('should handle self-loops correctly', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'A', type: 'test-edge' });

      const result = dfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.visitOrder).toHaveLength(1); // Visit A once
      }
    });
  });

  describe('Type preservation', () => {
    it('should preserve node type information in visit order', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });

      const result = dfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        result.value.visitOrder.forEach(node => {
          expect(node.type).toBe('test');
          expect(node).toHaveProperty('label');
        });
      }
    });
  });
});
