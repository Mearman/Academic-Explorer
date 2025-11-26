import { describe, it, expect } from 'vitest';
import { extractEgoNetwork } from '../../src/extraction/ego-network';
import { createRandomGraph } from '../fixtures/extraction-graphs';

describe('extractEgoNetwork - Performance', () => {
  it('should extract radius-3 ego network from 1000-node graph in <500ms', () => {
    // Create random graph with ~2000 edges (avg degree ~4)
    const graph = createRandomGraph(1000, 2000);

    // Pick a random node as seed
    const allNodes = graph.getAllNodes();
    const seedNode = allNodes[Math.floor(allNodes.length / 2)];

    const startTime = performance.now();

    const result = extractEgoNetwork(graph, {
      radius: 3,
      seedNodes: [seedNode.id],
    });

    const duration = performance.now() - startTime;

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Verify we extracted a reasonable subgraph
      expect(result.value.getNodeCount()).toBeGreaterThan(0);
      expect(result.value.getNodeCount()).toBeLessThanOrEqual(1000);
    }

    // Performance assertion: <500ms for radius-3 on 1000 nodes
    expect(duration).toBeLessThan(500);
  });

  it('should handle large radius efficiently', () => {
    // Create smaller graph for large radius test
    const graph = createRandomGraph(100, 300);

    const allNodes = graph.getAllNodes();
    const seedNode = allNodes[0];

    const startTime = performance.now();

    const result = extractEgoNetwork(graph, {
      radius: 10, // Large radius that likely covers entire graph
      seedNodes: [seedNode.id],
    });

    const duration = performance.now() - startTime;

    expect(result.ok).toBe(true);
    expect(duration).toBeLessThan(100); // Should be very fast for 100 nodes
  });

  it('should handle multi-source extraction efficiently', () => {
    const graph = createRandomGraph(500, 1000);

    // Pick 5 random seed nodes
    const allNodes = graph.getAllNodes();
    const seedNodes = [0, 100, 200, 300, 400].map(i => allNodes[i].id);

    const startTime = performance.now();

    const result = extractEgoNetwork(graph, {
      radius: 2,
      seedNodes,
    });

    const duration = performance.now() - startTime;

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Should extract a substantial portion of the graph
      expect(result.value.getNodeCount()).toBeGreaterThan(5);
    }

    // Multi-source extraction should still be fast
    expect(duration).toBeLessThan(300);
  });
});
