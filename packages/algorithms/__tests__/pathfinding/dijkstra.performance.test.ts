import { describe, it, expect } from 'vitest';

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

describe('dijkstra (Performance)', () => {
  it('should find path in 500-node, 2000-edge graph in <200ms (SC-002)', () => {
    const graph = new Graph<TestNode, TestEdge>(true);
    const nodeCount = 500;
    const edgeCount = 2000;

    // Create nodes
    for (let i = 0; i < nodeCount; i++) {
      graph.addNode({
        id: `N${i}`,
        type: 'test',
        label: `Node ${i}`,
      });
    }

    // Create edges (random connections with random weights)
    let edgesCreated = 0;
    let edgeId = 0;

    while (edgesCreated < edgeCount) {
      const source = Math.floor(Math.random() * nodeCount);
      const target = Math.floor(Math.random() * nodeCount);

      // Avoid self-loops for this test
      if (source !== target) {
        const weight = Math.floor(Math.random() * 100) + 1; // 1-100
        graph.addEdge({
          id: `E${edgeId++}`,
          source: `N${source}`,
          target: `N${target}`,
          type: 'test-edge',
          weight,
        });
        edgesCreated++;
      }
    }

    // Find path from first to last node
    const start = performance.now();
    const result = dijkstra(graph, 'N0', `N${nodeCount - 1}`);
    const duration = performance.now() - start;

    expect(result.ok).toBe(true);

    // SC-002: Must complete in <200ms
    expect(duration).toBeLessThan(200);
    console.log(`Dijkstra (${nodeCount} nodes, ${edgeCount} edges): ${duration.toFixed(2)}ms`);
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

    // Create dense connections (each node connects to next 10 nodes)
    let edgeId = 0;
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < Math.min(i + 11, nodeCount); j++) {
        graph.addEdge({
          id: `E${edgeId++}`,
          source: `N${i}`,
          target: `N${j}`,
          type: 'test-edge',
          weight: Math.floor(Math.random() * 10) + 1,
        });
      }
    }

    const start = performance.now();
    const result = dijkstra(graph, 'N0', `N${nodeCount - 1}`);
    const duration = performance.now() - start;

    expect(result.ok).toBe(true);
    expect(duration).toBeLessThan(50); // Dense but smaller graph should be fast
    console.log(`Dijkstra dense graph (${nodeCount} nodes, ${edgeId} edges): ${duration.toFixed(2)}ms`);
  });

  it('should handle long path efficiently', () => {
    const graph = new Graph<TestNode, TestEdge>(true);
    const nodeCount = 1000;

    // Create linear chain with random weights: 0 -> 1 -> 2 -> ... -> 999
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
        weight: Math.floor(Math.random() * 10) + 1,
      });
    }

    const start = performance.now();
    const result = dijkstra(graph, 'N0', `N${nodeCount - 1}`);
    const duration = performance.now() - start;

    expect(result.ok).toBe(true);
    if (result.ok && result.value.some) {
      const path = result.value.value;
      expect(path.nodes).toHaveLength(nodeCount); // All nodes in path
    }

    expect(duration).toBeLessThan(100); // Linear path should be very fast
    console.log(`Dijkstra long path (${nodeCount} nodes linear): ${duration.toFixed(2)}ms`);
  });
});
