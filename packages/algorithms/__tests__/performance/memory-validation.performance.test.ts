import { describe, it, expect } from 'vitest';

import { Graph, dfs, bfs, dijkstra, connectedComponents, type Node, type Edge } from '../../src/index';

describe('memory validation (SC-007)', () => {
  it('should handle 10,000 nodes with 50,000 edges using <100MB memory', () => {
    const startMemory = process.memoryUsage().heapUsed;

    // Build large graph: 10,000 nodes, 50,000 edges
    const nodeCount = 10000;
    const edgeCount = 50000;

    const graph = new Graph<Node, Edge>(true);

    // Add nodes
    for (let i = 0; i < nodeCount; i++) {
      graph.addNode({ id: `N${i}`, type: 'node' });
    }

    // Add edges (random connections to create realistic graph)
    for (let i = 0; i < edgeCount; i++) {
      const source = `N${Math.floor(Math.random() * nodeCount)}`;
      const target = `N${Math.floor(Math.random() * nodeCount)}`;
      graph.addEdge({
        id: `e${i}`,
        source,
        target,
        type: 'edge',
        weight: 1,
      });
    }

    expect(graph.getNodeCount()).toBe(nodeCount);
    expect(graph.getEdgeCount()).toBe(edgeCount);

    // Measure memory after graph construction
    const graphMemory = process.memoryUsage().heapUsed;
    const graphMemoryMB = (graphMemory - startMemory) / 1024 / 1024;

    console.log(`Graph memory: ${graphMemoryMB.toFixed(2)}MB`);
    expect(graphMemoryMB).toBeLessThan(100);

    // Run traversal algorithm to ensure graph is usable
    const dfsResult = dfs(graph, 'N0');
    expect(dfsResult.ok).toBe(true);

    // Measure total memory after operations
    const totalMemory = process.memoryUsage().heapUsed;
    const totalMemoryMB = (totalMemory - startMemory) / 1024 / 1024;

    console.log(`Total memory: ${totalMemoryMB.toFixed(2)}MB`);
    expect(totalMemoryMB).toBeLessThan(100);
  });

  it('should handle deep recursion without stack overflow', () => {
    // Create linear graph with 1000 nodes (tests iterative DFS)
    const graph = new Graph<Node, Edge>(true);

    const nodeCount = 1000;
    for (let i = 0; i < nodeCount; i++) {
      graph.addNode({ id: `N${i}`, type: 'node' });
    }

    // Create linear chain: N0 → N1 → N2 → ... → N999
    for (let i = 0; i < nodeCount - 1; i++) {
      graph.addEdge({
        id: `e${i}`,
        source: `N${i}`,
        target: `N${i + 1}`,
        type: 'edge',
      });
    }

    // Should not cause stack overflow (iterative implementation)
    const dfsResult = dfs(graph, 'N0');
    expect(dfsResult.ok).toBe(true);
    if (dfsResult.ok) {
      expect(dfsResult.value.visitOrder).toHaveLength(nodeCount);
    }

    const bfsResult = bfs(graph, 'N0');
    expect(bfsResult.ok).toBe(true);
    if (bfsResult.ok) {
      expect(bfsResult.value.visitOrder).toHaveLength(nodeCount);
    }
  });

  it('should handle dense graphs efficiently', () => {
    const startMemory = process.memoryUsage().heapUsed;

    // Create dense graph: 500 nodes with high connectivity
    const nodeCount = 500;
    const graph = new Graph<Node, Edge>(false);

    for (let i = 0; i < nodeCount; i++) {
      graph.addNode({ id: `N${i}`, type: 'node' });
    }

    // Add many edges (create dense connectivity)
    let edgeId = 0;
    for (let i = 0; i < nodeCount; i++) {
      // Connect each node to 10 random other nodes
      for (let j = 0; j < 10; j++) {
        const target = Math.floor(Math.random() * nodeCount);
        if (target !== i) {
          graph.addEdge({
            id: `e${edgeId++}`,
            source: `N${i}`,
            target: `N${target}`,
            type: 'edge',
          });
        }
      }
    }

    const graphMemory = process.memoryUsage().heapUsed;
    const graphMemoryMB = (graphMemory - startMemory) / 1024 / 1024;

    console.log(`Dense graph memory (500 nodes, ~5000 edges): ${graphMemoryMB.toFixed(2)}MB`);
    expect(graphMemoryMB).toBeLessThan(50); // Should be well under 100MB

    // Verify graph is usable
    const componentsResult = connectedComponents(graph);
    expect(componentsResult.ok).toBe(true);
  });

  it('should handle pathfinding on large graphs', () => {
    // Create moderately large graph for pathfinding
    const nodeCount = 1000;
    const graph = new Graph<Node, Edge>(true);

    for (let i = 0; i < nodeCount; i++) {
      graph.addNode({ id: `N${i}`, type: 'node' });
    }

    // Create connected graph with multiple paths
    for (let i = 0; i < nodeCount - 1; i++) {
      // Primary path
      graph.addEdge({
        id: `e${i}`,
        source: `N${i}`,
        target: `N${i + 1}`,
        type: 'edge',
        weight: 1,
      });

      // Add some shortcuts (every 10 nodes)
      if (i % 10 === 0 && i + 20 < nodeCount) {
        graph.addEdge({
          id: `shortcut${i}`,
          source: `N${i}`,
          target: `N${i + 20}`,
          type: 'edge',
          weight: 15, // Slightly worse than taking the path
        });
      }
    }

    const startMemory = process.memoryUsage().heapUsed;

    // Find path from start to end
    const pathResult = dijkstra(graph, 'N0', 'N999');
    expect(pathResult.ok).toBe(true);
    if (pathResult.ok && pathResult.value.some) {
      expect(pathResult.value.value.nodes.length).toBeGreaterThan(1);
      expect(pathResult.value.value.totalWeight).toBeGreaterThan(0);
    }

    const pathMemory = process.memoryUsage().heapUsed;
    const pathMemoryMB = (pathMemory - startMemory) / 1024 / 1024;

    console.log(`Pathfinding memory (1000 nodes): ${pathMemoryMB.toFixed(2)}MB`);
    expect(pathMemoryMB).toBeLessThan(20); // Should use minimal additional memory
  });
});
