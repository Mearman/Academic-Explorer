import { describe, it, expect, beforeEach } from 'vitest';

import { connectedComponents } from '../../src/analysis/connected-components';
import { Graph } from '../../src/graph/graph';
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

describe('connectedComponents', () => {
  let graph: Graph<TestNode, TestEdge>;

  beforeEach(() => {
    graph = new Graph<TestNode, TestEdge>(false); // Undirected graph
  });

  describe('Basic component detection', () => {
    it('should find single component in fully connected graph', () => {
      // Fully connected: A - B - C - D (all connected)
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addNode({ id: 'D', type: 'test', label: 'Node D' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'C', target: 'D', type: 'test-edge' });

      const result = connectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].nodes).toHaveLength(4);
        expect(result.value[0].id).toBe(0);
      }
    });

    it('should find three disconnected components', () => {
      // Component 1: A - B
      // Component 2: C - D - E
      // Component 3: F
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addNode({ id: 'D', type: 'test', label: 'Node D' });
      graph.addNode({ id: 'E', type: 'test', label: 'Node E' });
      graph.addNode({ id: 'F', type: 'test', label: 'Node F' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'C', target: 'D', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'D', target: 'E', type: 'test-edge' });

      const result = connectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(3);

        // Find components by size
        const componentSizes = result.value.map(c => c.nodes.length).sort();
        expect(componentSizes).toEqual([1, 2, 3]);
      }
    });

    it('should assign each node to exactly one component', () => {
      // Two components: A - B - C, D - E
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });
      graph.addNode({ id: 'D', type: 'test', label: 'Node D' });
      graph.addNode({ id: 'E', type: 'test', label: 'Node E' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'D', target: 'E', type: 'test-edge' });

      const result = connectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const allNodes = result.value.flatMap(c => c.nodes);
        const nodeIds = allNodes.map(n => n.id).sort();

        // Verify all nodes are present
        expect(nodeIds).toEqual(['A', 'B', 'C', 'D', 'E']);

        // Verify no duplicates
        expect(new Set(nodeIds).size).toBe(5);
      }
    });

    it('should assign unique IDs to each component', () => {
      // Three isolated nodes
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });

      const result = connectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(3);

        const componentIds = result.value.map(c => c.id);
        expect(new Set(componentIds).size).toBe(3); // All unique
        expect(componentIds).toContain(0);
        expect(componentIds).toContain(1);
        expect(componentIds).toContain(2);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty graph', () => {
      const result = connectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should handle single node', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });

      const result = connectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].nodes).toHaveLength(1);
        expect(result.value[0].nodes[0].id).toBe('A');
      }
    });

    it('should handle null graph', () => {
      const result = connectedComponents(null as unknown as Graph<TestNode, TestEdge>);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });

    it('should handle nodes with no edges (all isolated)', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });

      const result = connectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(3); // 3 components of size 1
        result.value.forEach(component => {
          expect(component.nodes).toHaveLength(1);
        });
      }
    });
  });

  describe('Directed graph handling', () => {
    it('should treat directed graph as undirected for connectivity', () => {
      const directedGraph = new Graph<TestNode, TestEdge>(true);

      directedGraph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      directedGraph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      directedGraph.addNode({ id: 'C', type: 'test', label: 'Node C' });

      // Directed edges: A -> B, B -> C (would be one component in undirected view)
      directedGraph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      directedGraph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });

      const result = connectedComponents(directedGraph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should find 1 weakly connected component (treating as undirected)
        expect(result.value).toHaveLength(1);
        expect(result.value[0].nodes).toHaveLength(3);
      }
    });
  });

  describe('Component properties', () => {
    it('should include size property in each component', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addNode({ id: 'C', type: 'test', label: 'Node C' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });

      const result = connectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        result.value.forEach(component => {
          expect(component.size).toBe(component.nodes.length);
        });
      }
    });
  });

  describe('Type preservation', () => {
    it('should preserve node type information', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A' });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });

      const result = connectedComponents(graph);

      expect(result.ok).toBe(true);
      if (result.ok) {
        result.value.forEach(component => {
          component.nodes.forEach(node => {
            expect(node.type).toBe('test');
            expect(node).toHaveProperty('label');
          });
        });
      }
    });
  });
});
