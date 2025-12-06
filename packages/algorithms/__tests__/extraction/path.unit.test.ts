import { describe, it, expect } from 'vitest';
import { Graph } from '../../src/graph/graph';
import type { Node, Edge } from '../../src/types/graph';
import { findShortestPath, extractReachabilitySubgraph } from '../../src/extraction/path';
import {
  createChainGraph,
  createDisconnectedGraph,
  createCitationNetwork,
} from '../fixtures/extraction-graphs';

describe('findShortestPath', () => {
  it('should find shortest path between two connected nodes', () => {
    // Create simple chain: A -> B -> C -> D
    const graph = createChainGraph(4);

    const result = findShortestPath(graph, 'n0', 'n3');

    expect(result.ok).toBe(true);
    if (result.ok && result.value.some) {
      const path = result.value.value;
      expect(path.nodes).toHaveLength(4);
      expect(path.nodes.map(n => n.id)).toEqual(['n0', 'n1', 'n2', 'n3']);
      expect(path.edges).toHaveLength(3);
      expect(path.totalWeight).toBe(3); // 3 edges with weight 1 each
    } else {
      expect.fail('Expected path to exist');
    }
  });

  it('should handle no path exists between disconnected nodes', () => {
    const graph = createDisconnectedGraph();

    // Try to find path between nodes in different components
    const result = findShortestPath(graph, 'A', 'D');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.some).toBe(false);
    }
  });

  it('should handle source equals target edge case', () => {
    const graph = createChainGraph(3);

    const result = findShortestPath(graph, 'n0', 'n0');

    expect(result.ok).toBe(true);
    if (result.ok && result.value.some) {
      const path = result.value.value;
      expect(path.nodes).toHaveLength(1);
      expect(path.nodes[0].id).toBe('n0');
      expect(path.edges).toHaveLength(0);
      expect(path.totalWeight).toBe(0);
    } else {
      expect.fail('Expected trivial path to exist');
    }
  });

  it('should return error for invalid graph', () => {
    const result = findShortestPath(null as any, 'n0', 'n1');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid-input');
    }
  });

  it('should return error for non-existent source node', () => {
    const graph = createChainGraph(3);

    const result = findShortestPath(graph, 'nonexistent', 'n1');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid-input');
    }
  });

  it('should return error for non-existent target node', () => {
    const graph = createChainGraph(3);

    const result = findShortestPath(graph, 'n0', 'nonexistent');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid-input');
    }
  });

  it('should find shortest path in weighted graph using Dijkstra', () => {
    const graph = new Graph<Node, Edge>(true);

    // Create diamond graph with different path weights
    graph.addNode({ id: 'A', type: 'node' });
    graph.addNode({ id: 'B', type: 'node' });
    graph.addNode({ id: 'C', type: 'node' });
    graph.addNode({ id: 'D', type: 'node' });

    // A -> B (weight 1), A -> C (weight 5)
    graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge', weight: 1 });
    graph.addEdge({ id: 'e2', source: 'A', target: 'C', type: 'edge', weight: 5 });

    // B -> D (weight 3), C -> D (weight 1)
    graph.addEdge({ id: 'e3', source: 'B', target: 'D', type: 'edge', weight: 3 });
    graph.addEdge({ id: 'e4', source: 'C', target: 'D', type: 'edge', weight: 1 });

    const result = findShortestPath(graph, 'A', 'D');

    expect(result.ok).toBe(true);
    if (result.ok && result.value.some) {
      const path = result.value.value;
      // Shortest path is A -> B -> D (weight 4) vs A -> C -> D (weight 6)
      expect(path.nodes.map(n => n.id)).toEqual(['A', 'B', 'D']);
      expect(path.totalWeight).toBe(4);
    } else {
      expect.fail('Expected path to exist');
    }
  });

  it('should find shortest path in unweighted graph using BFS', () => {
    const graph = new Graph<Node, Edge>(true);

    // Create graph where BFS and Dijkstra might differ
    graph.addNode({ id: 'A', type: 'node' });
    graph.addNode({ id: 'B', type: 'node' });
    graph.addNode({ id: 'C', type: 'node' });

    // Direct path A -> C
    graph.addEdge({ id: 'e1', source: 'A', target: 'C', type: 'edge' });
    // Indirect path A -> B -> C
    graph.addEdge({ id: 'e2', source: 'A', target: 'B', type: 'edge' });
    graph.addEdge({ id: 'e3', source: 'B', target: 'C', type: 'edge' });

    const result = findShortestPath(graph, 'A', 'C');

    expect(result.ok).toBe(true);
    if (result.ok && result.value.some) {
      const path = result.value.value;
      // Should take direct path (1 edge) vs indirect (2 edges)
      expect(path.nodes).toHaveLength(2);
      expect(path.nodes.map(n => n.id)).toEqual(['A', 'C']);
      expect(path.edges).toHaveLength(1);
    } else {
      expect.fail('Expected path to exist');
    }
  });
});

describe('extractReachabilitySubgraph', () => {
  it('should extract forward reachability subgraph', () => {
    // Create chain: n0 -> n1 -> n2 -> n3
    const graph = createChainGraph(4);

    const result = extractReachabilitySubgraph(graph, 'n0', 'forward');

    expect(result.ok).toBe(true);
    if (result.ok) {
      const subgraph = result.value;
      // Should include all nodes reachable from n0
      expect(subgraph.getAllNodes()).toHaveLength(4);
      expect(subgraph.getAllEdges()).toHaveLength(3);
    }
  });

  it('should extract backward reachability subgraph', () => {
    // Create chain: n0 -> n1 -> n2 -> n3
    const graph = createChainGraph(4);

    const result = extractReachabilitySubgraph(graph, 'n3', 'backward');

    expect(result.ok).toBe(true);
    if (result.ok) {
      const subgraph = result.value;
      // Should include all nodes that can reach n3 (all nodes in chain)
      expect(subgraph.getAllNodes()).toHaveLength(4);
      expect(subgraph.getAllEdges()).toHaveLength(3);
    }
  });

  it('should respect max depth parameter', () => {
    // Create chain: n0 -> n1 -> n2 -> n3
    const graph = createChainGraph(4);

    const result = extractReachabilitySubgraph(graph, 'n0', 'forward', 2);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const subgraph = result.value;
      // With depth 2, should reach n0, n1, n2 (but not n3)
      expect(subgraph.getAllNodes()).toHaveLength(3);
      const nodeIds = new Set(subgraph.getAllNodes().map(n => n.id));
      expect(nodeIds).toContain('n0');
      expect(nodeIds).toContain('n1');
      expect(nodeIds).toContain('n2');
      expect(nodeIds).not.toContain('n3');
    }
  });

  it('should handle multi-source reachability (forward)', () => {
    const graph = new Graph<Node, Edge>(true);

    // Create branching structure
    //     A
    //    / \
    //   B   C
    //    \ /
    //     D
    graph.addNode({ id: 'A', type: 'node' });
    graph.addNode({ id: 'B', type: 'node' });
    graph.addNode({ id: 'C', type: 'node' });
    graph.addNode({ id: 'D', type: 'node' });

    graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge' });
    graph.addEdge({ id: 'e2', source: 'A', target: 'C', type: 'edge' });
    graph.addEdge({ id: 'e3', source: 'B', target: 'D', type: 'edge' });
    graph.addEdge({ id: 'e4', source: 'C', target: 'D', type: 'edge' });

    const result = extractReachabilitySubgraph(graph, 'A', 'forward');

    expect(result.ok).toBe(true);
    if (result.ok) {
      const subgraph = result.value;
      expect(subgraph.getAllNodes()).toHaveLength(4);
      expect(subgraph.getAllEdges()).toHaveLength(4);
    }
  });

  it('should handle multi-source reachability (backward)', () => {
    const graph = new Graph<Node, Edge>(true);

    // Create converging structure
    //     A
    //    / \
    //   B   C
    //    \ /
    //     D
    graph.addNode({ id: 'A', type: 'node' });
    graph.addNode({ id: 'B', type: 'node' });
    graph.addNode({ id: 'C', type: 'node' });
    graph.addNode({ id: 'D', type: 'node' });

    graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge' });
    graph.addEdge({ id: 'e2', source: 'A', target: 'C', type: 'edge' });
    graph.addEdge({ id: 'e3', source: 'B', target: 'D', type: 'edge' });
    graph.addEdge({ id: 'e4', source: 'C', target: 'D', type: 'edge' });

    const result = extractReachabilitySubgraph(graph, 'D', 'backward');

    expect(result.ok).toBe(true);
    if (result.ok) {
      const subgraph = result.value;
      // All nodes can reach D
      expect(subgraph.getAllNodes()).toHaveLength(4);
      expect(subgraph.getAllEdges()).toHaveLength(4);
    }
  });

  it('should return error for invalid graph', () => {
    const result = extractReachabilitySubgraph(null as any, 'n0', 'forward');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid-input');
    }
  });

  it('should return error for non-existent source node', () => {
    const graph = createChainGraph(3);

    const result = extractReachabilitySubgraph(graph, 'nonexistent', 'forward');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('node-not-found');
    }
  });

  it('should handle isolated node', () => {
    const graph = createDisconnectedGraph();

    const result = extractReachabilitySubgraph(graph, 'F', 'forward');

    expect(result.ok).toBe(true);
    if (result.ok) {
      const subgraph = result.value;
      // Isolated node should only contain itself
      expect(subgraph.getAllNodes()).toHaveLength(1);
      expect(subgraph.getAllNodes()[0].id).toBe('F');
      expect(subgraph.getAllEdges()).toHaveLength(0);
    }
  });

  it('should handle citation network forward reachability', () => {
    const graph = createCitationNetwork(10, 3);

    // Pick a paper from the middle
    const result = extractReachabilitySubgraph(graph, 'P5', 'forward');

    expect(result.ok).toBe(true);
    if (result.ok) {
      const subgraph = result.value;
      // Should include P5 and all papers it cites
      expect(subgraph.getAllNodes().length).toBeGreaterThan(1);
      expect(subgraph.getAllNodes().length).toBeLessThanOrEqual(6); // P5 + up to 5 cited papers
    }
  });

  it('should handle citation network backward reachability', () => {
    const graph = createCitationNetwork(10, 3);

    // Pick a middle paper that's likely to have both inbound and outbound citations
    // Use P5 as it's in the middle of the network
    const result = extractReachabilitySubgraph(graph, 'P5', 'backward');

    expect(result.ok).toBe(true);
    if (result.ok) {
      const subgraph = result.value;
      // Should include P5 and all papers that cite it (directly or indirectly)
      // At minimum, it should include the source node itself
      expect(subgraph.getAllNodes().length).toBeGreaterThanOrEqual(1);
      // The source node should always be included
      const nodeIds = subgraph.getAllNodes().map(n => n.id);
      expect(nodeIds).toContain('P5');
    }
  });

  it('should handle depth 0 (only source node)', () => {
    const graph = createChainGraph(4);

    const result = extractReachabilitySubgraph(graph, 'n1', 'forward', 0);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const subgraph = result.value;
      expect(subgraph.getAllNodes()).toHaveLength(1);
      expect(subgraph.getAllNodes()[0].id).toBe('n1');
      expect(subgraph.getAllEdges()).toHaveLength(0);
    }
  });

  it('should handle unlimited depth (undefined)', () => {
    const graph = createChainGraph(4);

    const result = extractReachabilitySubgraph(graph, 'n0', 'forward', undefined);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const subgraph = result.value;
      // Should reach all nodes
      expect(subgraph.getAllNodes()).toHaveLength(4);
    }
  });
});
