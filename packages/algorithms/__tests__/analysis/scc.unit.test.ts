import { describe, it, expect, beforeEach } from 'vitest';
import { Graph } from '../../src/graph/graph';
import { stronglyConnectedComponents } from '../../src/analysis/scc';
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

describe('stronglyConnectedComponents (Tarjan\'s Algorithm)', () => {
  let graph: Graph<TestNode, TestEdge>;

  beforeEach(() => {
    graph = new Graph<TestNode, TestEdge>(true); // Directed graph
  });

  describe('Basic SCC detection', () => {
    it('should find single SCC in strongly connected graph', () => {
      // Strongly connected: A -> B -> C -> A
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'C', target: 'A', type: 'test-edge' });

      const result = stronglyConnectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].nodes).toHaveLength(3);
        expect(result.value[0].size).toBe(3);
      }
    });

    it('should find multiple SCCs in graph', () => {
      // SCC1: A <-> B (bidirectional)
      // SCC2: C (no cycle)
      // SCC3: D <-> E (bidirectional)
      // Connections: A -> C -> D
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addNode({ id: 'D', type: 'test', label: 'Node D' });
      graph.addNode({ id: 'E', type: 'test', label: 'Node E' });

      // SCC1: A <-> B
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'A', type: 'test-edge' });

      // SCC2: C (connects to D but no back edge)
      graph.addEdge({ id: 'E3', source: 'A', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E4', source: 'C', target: 'D', type: 'test-edge' });

      // SCC3: D <-> E
      graph.addEdge({ id: 'E5', source: 'D', target: 'E', type: 'test-edge' });
      graph.addEdge({ id: 'E6', source: 'E', target: 'D', type: 'test-edge' });

      const result = stronglyConnectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(3);

        // Find components by size
        const componentSizes = result.value.map(c => c.size).sort();
        expect(componentSizes).toEqual([1, 2, 2]); // One single node, two pairs
      }
    });

    it('should find each node as separate SCC in DAG', () => {
      // DAG: A -> B -> C (no cycles, each node is its own SCC)
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });

      const result = stronglyConnectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(3);
        result.value.forEach(scc => {
          expect(scc.size).toBe(1); // Each node is its own SCC
        });
      }
    });

    it('should handle self-loop as SCC', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'A', type: 'test-edge' }); // Self-loop

      const result = stronglyConnectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // A is in SCC (with itself), B is separate SCC
        expect(result.value).toHaveLength(2);
      }
    });
  });

  describe('Complex SCC structures', () => {
    it('should correctly identify nested SCCs', () => {
      // Create graph with two SCCs connected by one-way edge
      // SCC1: A -> B -> C -> A
      // SCC2: D -> E -> D
      // Connection: C -> D (one-way, doesn't create larger SCC)
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addNode({ id: 'D', type: 'test', label: 'Node D' });
      graph.addNode({ id: 'E', type: 'test', label: 'Node E' });

      // SCC1
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'C', target: 'A', type: 'test-edge' });

      // SCC2
      graph.addEdge({ id: 'E4', source: 'D', target: 'E', type: 'test-edge' });
      graph.addEdge({ id: 'E5', source: 'E', target: 'D', type: 'test-edge' });

      // One-way connection
      graph.addEdge({ id: 'E6', source: 'C', target: 'D', type: 'test-edge' });

      const result = stronglyConnectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);

        // Verify sizes
        const sizes = result.value.map(c => c.size).sort();
        expect(sizes).toEqual([2, 3]);
      }
    });

    it('should assign each node to exactly one SCC', () => {
      // Create graph with multiple components
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addNode({ id: 'D', type: 'test', label: 'Node D' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'C', target: 'A', type: 'test-edge' });

      const result = stronglyConnectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const allNodes = result.value.flatMap(scc => scc.nodes);
        const nodeIds = allNodes.map(n => n.id).sort();

        // Verify no duplicates
        expect(new Set(nodeIds).size).toBe(nodeIds.length);

        // Verify all nodes accounted for
        expect(nodeIds).toContain('A');
        expect(nodeIds).toContain('B');
        expect(nodeIds).toContain('C');
        expect(nodeIds).toContain('D');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty graph', () => {
      const result = stronglyConnectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should handle single node', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });

      const result = stronglyConnectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].nodes).toHaveLength(1);
        expect(result.value[0].nodes[0].id).toBe('A');
      }
    });

    it('should handle null graph', () => {
      const result = stronglyConnectedComponents(null as unknown as Graph<TestNode, TestEdge>);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });

    it('should handle disconnected nodes', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      // No edges

      const result = stronglyConnectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(3); // Each node is its own SCC
        result.value.forEach(scc => {
          expect(scc.size).toBe(1);
        });
      }
    });
  });

  describe('Component properties', () => {
    it('should assign unique IDs to each SCC', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });

      const result = stronglyConnectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const ids = result.value.map(scc => scc.id);
        expect(new Set(ids).size).toBe(ids.length); // All unique
      }
    });

    it('should include size property matching node count', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'A', type: 'test-edge' });

      const result = stronglyConnectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        result.value.forEach(scc => {
          expect(scc.size).toBe(scc.nodes.length);
        });
      }
    });
  });

  describe('Type preservation', () => {
    it('should preserve node type information', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });

      const result = stronglyConnectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        result.value.forEach(scc => {
          scc.nodes.forEach(node => {
            expect(node.type).toBe('test');
            expect(node).toHaveProperty('label');
          });
        });
      }
    });
  });
});
