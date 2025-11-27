import { describe, it, expect } from 'vitest';

import { Graph } from '../../src/graph/graph';
import { bfs } from '../../src/traversal/bfs';
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

describe('bfs (Performance)', () => {
  it('should traverse 1000-node graph in <100ms (SC-001)', () => {
    const graph = new Graph<TestNode, TestEdge>(true);
    const nodeCount = 1000;

    // Create linear chain: 0 -> 1 -> 2 -> ... -> 999
    for (let i = 0; i < nodeCount; i++) {
      graph.addNode({
        id: `N${i}`,
        type: 'test',
        label: `Node ${i}`,
      });
    }

    for (let i = 0; i < nodeCount - 1; i++) {
      graph.addEdge({
        id: `E${i}`,
        source: `N${i}`,
        target: `N${i + 1}`,
        type: 'test-edge',
      });
    }

    const start = performance.now();
    const result = bfs(graph, 'N0');
    const duration = performance.now() - start;

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.visitOrder).toHaveLength(nodeCount);
    }

    expect(duration).toBeLessThan(100); // SC-001: <100ms for 1000 nodes
    console.log(`BFS 1000 nodes: ${duration.toFixed(2)}ms`);
  });

  it('should handle dense graph efficiently', () => {
    const graph = new Graph<TestNode, TestEdge>(true);
    const nodeCount = 100;

    // Create nodes
    for (let i = 0; i < nodeCount; i++) {
      graph.addNode({
        id: `N${i}`,
        type: 'test',
        label: `Node ${i}`,
      });
    }

    // Create dense connections (each node connects to next 5 nodes)
    let edgeId = 0;
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < Math.min(i + 6, nodeCount); j++) {
        graph.addEdge({
          id: `E${edgeId++}`,
          source: `N${i}`,
          target: `N${j}`,
          type: 'test-edge',
        });
      }
    }

    const start = performance.now();
    const result = bfs(graph, 'N0');
    const duration = performance.now() - start;

    expect(result.ok).toBe(true);
    expect(duration).toBeLessThan(100);
    console.log(`BFS dense graph (${nodeCount} nodes, ${edgeId} edges): ${duration.toFixed(2)}ms`);
  });
});
