import { describe, it, expect } from 'vitest';
import { extractEgoNetwork, extractMultiSourceEgoNetwork } from '../../src/extraction/ego-network';
import {
  createStarGraph,
  createChainGraph,
  createDisconnectedGraph,
} from '../fixtures/extraction-graphs';
import { Graph } from '../../src/graph/graph';
import type { Node, Edge } from '../../src/types/graph';

describe('extractEgoNetwork', () => {
  describe('radius-1 ego network', () => {
    it('should extract 1-hop neighborhood from star graph center', () => {
      const graph = createStarGraph(5); // center + 5 outer nodes
      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: ['center'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const subgraph = result.value;
        expect(subgraph.getNodeCount()).toBe(6); // center + 5 neighbors
        expect(subgraph.getEdgeCount()).toBe(5); // 5 edges from center

        // Verify center node is included
        expect(subgraph.getNode('center').some).toBe(true);

        // Verify all outer nodes are included
        for (let i = 0; i < 5; i++) {
          expect(subgraph.getNode(`outer_${i}`).some).toBe(true);
        }
      }
    });

    it('should extract 1-hop neighborhood from star graph leaf', () => {
      const graph = createStarGraph(5);
      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: ['outer_0'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const subgraph = result.value;
        expect(subgraph.getNodeCount()).toBe(2); // outer_0 + center
        expect(subgraph.getEdgeCount()).toBe(1); // 1 edge to center
      }
    });

    it('should exclude seed node when includeSeed is false', () => {
      const graph = createStarGraph(3);
      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: ['center'],
        includeSeed: false,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const subgraph = result.value;
        expect(subgraph.getNodeCount()).toBe(3); // only outer nodes
        expect(subgraph.getNode('center').some).toBe(false);

        // Verify outer nodes are included
        for (let i = 0; i < 3; i++) {
          expect(subgraph.getNode(`outer_${i}`).some).toBe(true);
        }
      }
    });
  });

  describe('radius-2 ego network', () => {
    it('should extract 2-hop neighborhood from chain graph', () => {
      const graph = createChainGraph(5); // n0 -> n1 -> n2 -> n3 -> n4 (directed)
      const result = extractEgoNetwork(graph, {
        radius: 2,
        seedNodes: ['n2'], // middle node
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const subgraph = result.value;
        // In directed graph: n2 + 2 hops downstream only (n3, n4)
        // Directed traversal only follows outgoing edges
        expect(subgraph.getNodeCount()).toBe(3);

        // Verify downstream nodes are included
        expect(subgraph.getNode('n2').some).toBe(true);
        expect(subgraph.getNode('n3').some).toBe(true);
        expect(subgraph.getNode('n4').some).toBe(true);
      }
    });

    it('should extract 2-hop neighborhood from chain graph start', () => {
      const graph = createChainGraph(5); // n0 -> n1 -> n2 -> n3 -> n4
      const result = extractEgoNetwork(graph, {
        radius: 2,
        seedNodes: ['n0'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const subgraph = result.value;
        // n0 + n1 + n2 (2 hops downstream only)
        expect(subgraph.getNodeCount()).toBe(3);
        expect(subgraph.getNode('n0').some).toBe(true);
        expect(subgraph.getNode('n1').some).toBe(true);
        expect(subgraph.getNode('n2').some).toBe(true);
        expect(subgraph.getNode('n3').some).toBe(false);
      }
    });

    it('should extract 2-hop undirected neighborhood', () => {
      // Create undirected chain: A-B-C-D-E
      const graph = new Graph<Node, Edge>(false);
      graph.addNode({ id: 'A', type: 'node' });
      graph.addNode({ id: 'B', type: 'node' });
      graph.addNode({ id: 'C', type: 'node' });
      graph.addNode({ id: 'D', type: 'node' });
      graph.addNode({ id: 'E', type: 'node' });
      graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge' });
      graph.addEdge({ id: 'e2', source: 'B', target: 'C', type: 'edge' });
      graph.addEdge({ id: 'e3', source: 'C', target: 'D', type: 'edge' });
      graph.addEdge({ id: 'e4', source: 'D', target: 'E', type: 'edge' });

      const result = extractEgoNetwork(graph, {
        radius: 2,
        seedNodes: ['C'], // middle
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const subgraph = result.value;
        // C + 2 hops both directions: A, B, D, E
        expect(subgraph.getNodeCount()).toBe(5);
      }
    });
  });

  describe('multi-source ego network', () => {
    it('should extract union of multiple ego networks', () => {
      const graph = createStarGraph(5);
      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: ['outer_0', 'outer_1'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const subgraph = result.value;
        // outer_0, outer_1, and center (their common neighbor)
        expect(subgraph.getNodeCount()).toBe(3);
        expect(subgraph.getNode('outer_0').some).toBe(true);
        expect(subgraph.getNode('outer_1').some).toBe(true);
        expect(subgraph.getNode('center').some).toBe(true);
      }
    });

    it('should merge overlapping neighborhoods', () => {
      // Create chain: n0 -> n1 -> n2 -> n3 -> n4 (directed)
      const graph = createChainGraph(5);
      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: ['n1', 'n3'], // Both with 1-hop downstream
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const subgraph = result.value;
        // n1 (seed) + n2 (1-hop downstream)
        // n3 (seed) + n4 (1-hop downstream)
        // Union: n1, n2, n3, n4
        expect(subgraph.getNodeCount()).toBe(4);
      }
    });
  });

  describe('disconnected graph handling', () => {
    it('should only extract from connected component', () => {
      const graph = createDisconnectedGraph();
      // Component 1: A-B-C, Component 2: D-E, Component 3: F
      const result = extractEgoNetwork(graph, {
        radius: 2,
        seedNodes: ['A'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const subgraph = result.value;
        // Only nodes from component 1
        expect(subgraph.getNodeCount()).toBe(3);
        expect(subgraph.getNode('A').some).toBe(true);
        expect(subgraph.getNode('B').some).toBe(true);
        expect(subgraph.getNode('C').some).toBe(true);
        expect(subgraph.getNode('D').some).toBe(false);
        expect(subgraph.getNode('E').some).toBe(false);
        expect(subgraph.getNode('F').some).toBe(false);
      }
    });

    it('should extract from multiple disconnected components', () => {
      const graph = createDisconnectedGraph();
      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: ['A', 'D'], // From different components
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const subgraph = result.value;
        // Component 1: A + B, Component 2: D + E
        expect(subgraph.getNodeCount()).toBe(4);
        expect(subgraph.getNode('A').some).toBe(true);
        expect(subgraph.getNode('B').some).toBe(true);
        expect(subgraph.getNode('D').some).toBe(true);
        expect(subgraph.getNode('E').some).toBe(true);
        expect(subgraph.getNode('F').some).toBe(false);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle radius 0 (only seed nodes)', () => {
      const graph = createStarGraph(5);
      const result = extractEgoNetwork(graph, {
        radius: 0,
        seedNodes: ['center'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const subgraph = result.value;
        expect(subgraph.getNodeCount()).toBe(1);
        expect(subgraph.getNode('center').some).toBe(true);
        expect(subgraph.getEdgeCount()).toBe(0);
      }
    });

    it('should handle empty graph', () => {
      const graph = new Graph<Node, Edge>(true);
      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: ['nonexistent'],
      });

      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.error.type).toBe('node-not-found');
      }
    });

    it('should preserve graph directedness', () => {
      const directedGraph = createChainGraph(3);
      const result = extractEgoNetwork(directedGraph, {
        radius: 1,
        seedNodes: ['n0'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.isDirected()).toBe(true);
      }

      const undirectedGraph = createStarGraph(3);
      const result2 = extractEgoNetwork(undirectedGraph, {
        radius: 1,
        seedNodes: ['center'],
      });

      expect(result2.ok).toBe(true);
      if (result2.ok) {
        expect(result2.value.isDirected()).toBe(false);
      }
    });

    it('should preserve edge information', () => {
      const graph = new Graph<Node, Edge>(false);
      graph.addNode({ id: 'A', type: 'node' });
      graph.addNode({ id: 'B', type: 'node' });
      graph.addEdge({
        id: 'e1',
        source: 'A',
        target: 'B',
        type: 'special',
        weight: 5,
      });

      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: ['A'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const edges = result.value.getAllEdges();
        expect(edges).toHaveLength(1);
        expect(edges[0].id).toBe('e1');
        expect(edges[0].type).toBe('special');
        expect(edges[0].weight).toBe(5);
      }
    });
  });

  describe('validation errors', () => {
    it('should return error for invalid seed node', () => {
      const graph = createStarGraph(3);
      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: ['nonexistent'],
      });

      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.error.type).toBe('node-not-found');
        expect(result.error.message).toContain('nonexistent');
      }
    });

    it('should return error for negative radius', () => {
      const graph = createStarGraph(3);
      const result = extractEgoNetwork(graph, {
        radius: -1,
        seedNodes: ['center'],
      });

      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.error.type).toBe('invalid-radius');
        expect(result.error.message).toContain('non-negative');
      }
    });

    it('should return error for non-integer radius', () => {
      const graph = createStarGraph(3);
      const result = extractEgoNetwork(graph, {
        radius: 1.5,
        seedNodes: ['center'],
      });

      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.error.type).toBe('invalid-radius');
        expect(result.error.message).toContain('integer');
      }
    });

    it('should return error for empty seed nodes', () => {
      const graph = createStarGraph(3);
      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: [],
      });

      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.error.type).toBe('invalid-input');
        expect(result.error.message).toContain('At least one seed node');
      }
    });
  });
});

describe('extractMultiSourceEgoNetwork', () => {
  it('should extract multi-source ego network', () => {
    const graph = createStarGraph(5);
    const result = extractMultiSourceEgoNetwork(
      graph,
      ['outer_0', 'outer_1'],
      1
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const subgraph = result.value;
      expect(subgraph.getNodeCount()).toBe(3); // outer_0, outer_1, center
    }
  });

  it('should use default includeSeed=true', () => {
    const graph = createChainGraph(3);
    const result = extractMultiSourceEgoNetwork(graph, ['n0'], 1);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const subgraph = result.value;
      expect(subgraph.getNode('n0').some).toBe(true);
    }
  });

  it('should support optional includeSeed parameter', () => {
    const graph = createChainGraph(3);
    const result = extractMultiSourceEgoNetwork(graph, ['n0'], 1, false);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const subgraph = result.value;
      expect(subgraph.getNode('n0').some).toBe(false);
      expect(subgraph.getNode('n1').some).toBe(true);
    }
  });
});
