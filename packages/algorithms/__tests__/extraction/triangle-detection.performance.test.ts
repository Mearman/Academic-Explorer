import { describe, it, expect } from 'vitest';

import { detectTriangles } from '../../src/extraction/motif';
import { createRandomGraph } from '../fixtures/extraction-graphs';

describe('triangle detection performance', () => {
  it('should detect triangles on 1000-node/5000-edge graph in <2s', () => {
    // Create random graph with moderate density
    // ~5000 edges on 1000 nodes gives density ≈ 1% (5000 / (1000 * 999 / 2))
    const graph = createRandomGraph(1000, 5000);

    const startTime = performance.now();
    const result = detectTriangles(graph);
    const endTime = performance.now();

    const elapsedMs = endTime - startTime;

    expect(result.ok).toBe(true);
    expect(elapsedMs).toBeLessThan(2000); // <2s performance requirement

    if (result.ok) {
      console.log(`Triangle detection: ${result.value.length} triangles found in ${elapsedMs.toFixed(2)}ms`);
      console.log(`Graph: ${graph.getNodeCount()} nodes, ${graph.getEdgeCount()} edges`);
    }
  });

  it('should handle dense graph efficiently', () => {
    // Smaller dense graph (100 nodes, 2000 edges ≈ 40% density)
    const graph = createRandomGraph(100, 2000);

    const startTime = performance.now();
    const result = detectTriangles(graph);
    const endTime = performance.now();

    const elapsedMs = endTime - startTime;

    expect(result.ok).toBe(true);
    expect(elapsedMs).toBeLessThan(500); // Should be fast for smaller graph

    if (result.ok) {
      console.log(`Dense graph: ${result.value.length} triangles in ${elapsedMs.toFixed(2)}ms`);
    }
  });
});
