import { describe, it, expect, beforeEach } from 'vitest';

import { Graph } from '../../src/graph/graph';
import { type Node, type Edge } from '../../src/types/graph';

// Test node and edge types
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

describe('Graph<N, E>', () => {
  let graph: Graph<TestNode, TestEdge>;

  beforeEach(() => {
    graph = new Graph<TestNode, TestEdge>(true); // directed graph
  });

  describe('Constructor', () => {
    it('should create directed graph', () => {
      const directedGraph = new Graph<TestNode, TestEdge>(true);
      expect(directedGraph.isDirected()).toBe(true);
    });

    it('should create undirected graph', () => {
      const undirectedGraph = new Graph<TestNode, TestEdge>(false);
      expect(undirectedGraph.isDirected()).toBe(false);
    });

    it('should initialize with zero nodes and edges', () => {
      expect(graph.getNodeCount()).toBe(0);
      expect(graph.getEdgeCount()).toBe(0);
    });
  });

  describe('addNode()', () => {
    it('should add node successfully', () => {
      const node: TestNode = { id: 'N1', type: 'test', label: 'Node 1' };
      const result = graph.addNode(node);

      expect(result.ok).toBe(true);
      expect(graph.getNodeCount()).toBe(1);
    });

    it('should return DuplicateNodeError for duplicate ID', () => {
      const node1: TestNode = { id: 'N1', type: 'test', label: 'Node 1' };
      const node2: TestNode = { id: 'N1', type: 'test', label: 'Node 1 Duplicate' };

      graph.addNode(node1);
      const result = graph.addNode(node2);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('duplicate-node');
        expect(result.error.nodeId).toBe('N1');
      }
    });

    it('should maintain node ID uniqueness', () => {
      graph.addNode({ id: 'N1', type: 'test', label: 'Node 1' });
      graph.addNode({ id: 'N2', type: 'test', label: 'Node 2' });
      graph.addNode({ id: 'N1', type: 'test', label: 'Duplicate' });

      expect(graph.getNodeCount()).toBe(2); // Only 2 unique nodes
    });
  });

  describe('hasNode()', () => {
    it('should return true for existing node', () => {
      graph.addNode({ id: 'N1', type: 'test', label: 'Node 1' });
      expect(graph.hasNode('N1')).toBe(true);
    });

    it('should return false for non-existent node', () => {
      expect(graph.hasNode('N999')).toBe(false);
    });
  });

  describe('getNode()', () => {
    it('should return Some(node) for existing node', () => {
      const node: TestNode = { id: 'N1', type: 'test', label: 'Node 1' };
      graph.addNode(node);

      const result = graph.getNode('N1');
      expect(result.some).toBe(true);
      if (result.some) {
        expect(result.value).toEqual(node);
      }
    });

    it('should return None for non-existent node', () => {
      const result = graph.getNode('N999');
      expect(result.some).toBe(false);
    });
  });

  describe('removeNode()', () => {
    it('should remove node successfully', () => {
      graph.addNode({ id: 'N1', type: 'test', label: 'Node 1' });
      const result = graph.removeNode('N1');

      expect(result.ok).toBe(true);
      expect(graph.getNodeCount()).toBe(0);
      expect(graph.hasNode('N1')).toBe(false);
    });

    it('should return error for non-existent node', () => {
      const result = graph.removeNode('N999');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });

    it('should remove incident edges when removing node', () => {
      graph.addNode({ id: 'N1', type: 'test', label: 'Node 1' });
      graph.addNode({ id: 'N2', type: 'test', label: 'Node 2' });
      graph.addEdge({ id: 'E1', source: 'N1', target: 'N2', type: 'test-edge' });

      graph.removeNode('N1');

      expect(graph.getEdgeCount()).toBe(0); // Edge should be removed
    });
  });

  describe('addEdge()', () => {
    beforeEach(() => {
      graph.addNode({ id: 'N1', type: 'test', label: 'Node 1' });
      graph.addNode({ id: 'N2', type: 'test', label: 'Node 2' });
    });

    it('should add edge successfully', () => {
      const edge: TestEdge = { id: 'E1', source: 'N1', target: 'N2', type: 'test-edge' };
      const result = graph.addEdge(edge);

      expect(result.ok).toBe(true);
      expect(graph.getEdgeCount()).toBe(1);
    });

    it('should return error if source node does not exist', () => {
      const edge: TestEdge = { id: 'E1', source: 'N999', target: 'N2', type: 'test-edge' };
      const result = graph.addEdge(edge);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });

    it('should return error if target node does not exist', () => {
      const edge: TestEdge = { id: 'E1', source: 'N1', target: 'N999', type: 'test-edge' };
      const result = graph.addEdge(edge);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });

    it('should support weighted edges', () => {
      const edge: TestEdge = { id: 'E1', source: 'N1', target: 'N2', type: 'test-edge', weight: 5 };
      const result = graph.addEdge(edge);

      expect(result.ok).toBe(true);
    });
  });

  describe('removeEdge()', () => {
    beforeEach(() => {
      graph.addNode({ id: 'N1', type: 'test', label: 'Node 1' });
      graph.addNode({ id: 'N2', type: 'test', label: 'Node 2' });
      graph.addEdge({ id: 'E1', source: 'N1', target: 'N2', type: 'test-edge' });
    });

    it('should remove edge successfully', () => {
      const result = graph.removeEdge('E1');

      expect(result.ok).toBe(true);
      expect(graph.getEdgeCount()).toBe(0);
    });

    it('should return error for non-existent edge', () => {
      const result = graph.removeEdge('E999');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });
  });

  describe('getNeighbors()', () => {
    beforeEach(() => {
      graph.addNode({ id: 'N1', type: 'test', label: 'Node 1' });
      graph.addNode({ id: 'N2', type: 'test', label: 'Node 2' });
      graph.addNode({ id: 'N3', type: 'test', label: 'Node 3' });
      graph.addEdge({ id: 'E1', source: 'N1', target: 'N2', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'N1', target: 'N3', type: 'test-edge' });
    });

    it('should return neighbor IDs for node with edges', () => {
      const result = graph.getNeighbors('N1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toContain('N2');
        expect(result.value).toContain('N3');
        expect(result.value.length).toBe(2);
      }
    });

    it('should return empty array for node with no edges', () => {
      graph.addNode({ id: 'N4', type: 'test', label: 'Node 4' });
      const result = graph.getNeighbors('N4');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it('should return error for non-existent node', () => {
      const result = graph.getNeighbors('N999');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });
  });

  describe('Directed vs Undirected', () => {
    it('should maintain directed edges in directed graph', () => {
      const directedGraph = new Graph<TestNode, TestEdge>(true);
      directedGraph.addNode({ id: 'N1', type: 'test', label: 'Node 1' });
      directedGraph.addNode({ id: 'N2', type: 'test', label: 'Node 2' });
      directedGraph.addEdge({ id: 'E1', source: 'N1', target: 'N2', type: 'test-edge' });

      const n1Neighbors = directedGraph.getNeighbors('N1');
      const n2Neighbors = directedGraph.getNeighbors('N2');

      if (n1Neighbors.ok) {
        expect(n1Neighbors.value).toContain('N2'); // N1 -> N2
      }

      if (n2Neighbors.ok) {
        expect(n2Neighbors.value).toEqual([]); // N2 has no outgoing edges
      }
    });

    it('should maintain bidirectional edges in undirected graph', () => {
      const undirectedGraph = new Graph<TestNode, TestEdge>(false);
      undirectedGraph.addNode({ id: 'N1', type: 'test', label: 'Node 1' });
      undirectedGraph.addNode({ id: 'N2', type: 'test', label: 'Node 2' });
      undirectedGraph.addEdge({ id: 'E1', source: 'N1', target: 'N2', type: 'test-edge' });

      const n1Neighbors = undirectedGraph.getNeighbors('N1');
      const n2Neighbors = undirectedGraph.getNeighbors('N2');

      if (n1Neighbors.ok) {
        expect(n1Neighbors.value).toContain('N2'); // N1 <-> N2
      }

      if (n2Neighbors.ok) {
        expect(n2Neighbors.value).toContain('N1'); // N2 <-> N1
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle self-loops', () => {
      graph.addNode({ id: 'N1', type: 'test', label: 'Node 1' });
      const result = graph.addEdge({ id: 'E1', source: 'N1', target: 'N1', type: 'test-edge' });

      expect(result.ok).toBe(true);
    });

    it('should handle multiple edges between same nodes', () => {
      graph.addNode({ id: 'N1', type: 'test', label: 'Node 1' });
      graph.addNode({ id: 'N2', type: 'test', label: 'Node 2' });

      graph.addEdge({ id: 'E1', source: 'N1', target: 'N2', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'N1', target: 'N2', type: 'test-edge' });

      expect(graph.getEdgeCount()).toBe(2); // Multiple edges allowed
    });
  });
});
