import { describe, it, expect } from 'vitest';
import { findShortestPath } from '../../src/extraction/path';
import { createCitationNetwork } from '../fixtures/extraction-graphs';

describe('findShortestPath performance', () => {
  it('should find shortest path on 1000-node graph in <100ms', () => {
    // Create large citation network
    const graph = createCitationNetwork(1000, 3);

    // Pick nodes from different parts of the network
    const startTime = performance.now();
    const result = findShortestPath(graph, 'P100', 'P50');
    const endTime = performance.now();

    const duration = endTime - startTime;

    expect(result.ok).toBe(true);
    expect(duration).toBeLessThan(100);
  });

  it('should handle multiple path queries efficiently', () => {
    const graph = createCitationNetwork(500, 3);

    const startTime = performance.now();

    // Perform multiple path queries
    const queries = [
      ['P100', 'P50'],
      ['P200', 'P10'],
      ['P300', 'P25'],
      ['P400', 'P75'],
      ['P450', 'P100'],
    ];

    for (const [source, target] of queries) {
      const result = findShortestPath(graph, source, target);
      expect(result.ok).toBe(true);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // All queries should complete in reasonable time
    expect(duration).toBeLessThan(250); // 5 queries * 50ms average
  });

  it('should handle no-path queries efficiently', () => {
    const graph = createCitationNetwork(1000, 3);

    // In citation networks, newer papers don't cite each other
    // so path from P999 to P998 likely doesn't exist
    const startTime = performance.now();
    const result = findShortestPath(graph, 'P999', 'P998');
    const endTime = performance.now();

    const duration = endTime - startTime;

    expect(result.ok).toBe(true);
    expect(duration).toBeLessThan(100);
  });
});
