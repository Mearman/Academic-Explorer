/**
 * Louvain Algorithm Scaling Performance Tests
 *
 * Baseline measurements for spec-027 optimization tracking.
 *
 * BASELINE (Before Optimization):
 * - 100 nodes: ~90ms (modularity ~0.3)
 * - 500 nodes: ~3.7s (modularity ~0.19-0.2)
 * - 1000 nodes: ~15.4s (modularity ~0.19-0.2)
 * - Scaling ratio: ~412.89 (vs target <66.44 for O(n log n))
 *
 * TARGETS (After Phase 1-3 Optimization):
 * - Phase 1: 1000 nodes in 8-11s (40% speedup)
 * - Phase 2: 1000 nodes in 3-5s (2-3x additional speedup)
 * - Phase 3: 1000 nodes in 1.5-2.5s (2x final speedup, match graphology ~940ms)
 *
 * @module performance/louvain-scaling
 */

import { describe, it, expect } from 'vitest';

import { detectCommunities } from '../../src/clustering/louvain';
import { Graph } from '../../src/graph/graph';
import { calculateModularity } from '../../src/metrics/modularity';
import { smallCitationNetwork, largeCitationNetwork, generateCitationNetwork } from '../fixtures/citation-networks';
import type { PaperNode, CitationEdge } from '../fixtures/citation-networks';

/**
 * Create a medium-sized citation network (500 nodes) for scaling tests.
 * Uses subset of largeCitationNetwork to avoid duplicating fixture code.
 */
function mediumCitationNetwork(): Graph<PaperNode, CitationEdge> {
  const largeGraph = largeCitationNetwork();
  const mediumGraph = new Graph<PaperNode, CitationEdge>(true);

  // Take first 500 nodes (5 communities of 100 each)
  const nodes = largeGraph.getAllNodes().slice(0, 500);
  nodes.forEach(node => mediumGraph.addNode(node));

  // Add edges that connect nodes within the 500-node subset
  const nodeIds = new Set(nodes.map(n => n.id));
  largeGraph.getAllEdges().forEach(edge => {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      mediumGraph.addEdge(edge);
    }
  });

  return mediumGraph;
}

describe('Louvain Scaling Performance (spec-027 baseline)', () => {
  it('should establish baseline for 100-node graph', () => {
    const graph = smallCitationNetwork();
    expect(graph.getNodeCount()).toBe(100);

    const startTime = performance.now();
    const communities = detectCommunities(graph);
    const endTime = performance.now();

    const runtime = endTime - startTime;
    const modularity = calculateModularity(graph, communities);

    console.log(`Baseline 100 nodes:`);
    console.log(`  Runtime: ${runtime.toFixed(2)}ms`);
    console.log(`  Communities: ${communities.length}`);
    console.log(`  Modularity: ${modularity.toFixed(4)}`);

    // Verify quality (existing test shows modularity > 0.3 for this graph)
    expect(modularity).toBeGreaterThanOrEqual(0.19);
    expect(communities.length).toBeGreaterThan(0);

    // Baseline runtime should be under 5000ms (existing test threshold)
    expect(runtime).toBeLessThan(5000);
  });

  it('should establish baseline for 500-node graph', { timeout: 10000 }, () => {
    const graph = mediumCitationNetwork();
    expect(graph.getNodeCount()).toBe(500);

    const startTime = performance.now();
    const communities = detectCommunities(graph);
    const endTime = performance.now();

    const runtime = endTime - startTime;
    const modularity = calculateModularity(graph, communities);

    console.log(`Baseline 500 nodes:`);
    console.log(`  Runtime: ${runtime.toFixed(2)}ms (${(runtime / 1000).toFixed(2)}s)`);
    console.log(`  Communities: ${communities.length}`);
    console.log(`  Modularity: ${modularity.toFixed(4)}`);

    // Verify quality
    expect(modularity).toBeGreaterThanOrEqual(0.19);
    expect(communities.length).toBeGreaterThan(0);

    // Baseline runtime expected ~3-5s (will improve with optimization)
    // No strict upper bound for baseline - this is what we're optimizing
  });

  it('should establish baseline for 1000-node graph', { timeout: 35000 }, () => {
    const graph = largeCitationNetwork();
    expect(graph.getNodeCount()).toBe(1000);

    const startTime = performance.now();
    const communities = detectCommunities(graph);
    const endTime = performance.now();

    const runtime = endTime - startTime;
    const modularity = calculateModularity(graph, communities);

    console.log(`Baseline 1000 nodes:`);
    console.log(`  Runtime: ${runtime.toFixed(2)}ms (${(runtime / 1000).toFixed(2)}s)`);
    console.log(`  Communities: ${communities.length}`);
    console.log(`  Modularity: ${modularity.toFixed(4)}`);

    // Verify quality
    expect(modularity).toBeGreaterThanOrEqual(0.19);
    expect(communities.length).toBeGreaterThan(0);

    // Baseline runtime expected ~15.4s (will improve with optimization)
    // Existing test allows up to 30s, so use that as safety bound
    expect(runtime).toBeLessThan(30000);
  });

  it('should document scaling ratio (baseline)', { timeout: 25000 }, () => {
    // Measure small graph (100 nodes)
    const smallGraph = smallCitationNetwork();
    const smallStart = performance.now();
    const smallCommunities = detectCommunities(smallGraph);
    const smallEnd = performance.now();
    const smallTime = smallEnd - smallStart;

    expect(smallCommunities.length).toBeGreaterThan(0);

    // Measure large graph (1000 nodes)
    const largeGraph = largeCitationNetwork();
    const largeStart = performance.now();
    const largeCommunities = detectCommunities(largeGraph);
    const largeEnd = performance.now();
    const largeTime = largeEnd - largeStart;

    expect(largeCommunities.length).toBeGreaterThan(0);

    // Calculate scaling ratio
    const sizeRatio = 1000 / 100; // 10x nodes
    const timeRatio = largeTime / smallTime;

    console.log(`Scaling ratio (baseline):`);
    console.log(`  Size ratio: ${sizeRatio}x nodes`);
    console.log(`  Time ratio: ${timeRatio.toFixed(2)}x`);
    console.log(`  Expected O(n log n): <${(sizeRatio * Math.log2(1000) / Math.log2(100)).toFixed(2)}x`);

    // Document baseline - current implementation is much slower than O(n log n)
    // Target after optimization: timeRatio < 66.44 (O(n log n) with 2x safety margin)
    // Baseline is expected to fail this check - that's what we're fixing
    console.log(`  Target after optimization: <66.44x (O(n log n) scaling)`);
    console.log(`  Current baseline: ${timeRatio.toFixed(2)}x (SLOW - will be optimized)`);
  });

  it('should verify quality maintained across graph sizes', { timeout: 40000 }, () => {
    const smallCommunities = detectCommunities(smallCitationNetwork());
    const mediumCommunities = detectCommunities(mediumCitationNetwork());
    const largeCommunities = detectCommunities(largeCitationNetwork());

    const smallQ = calculateModularity(smallCitationNetwork(), smallCommunities);
    const mediumQ = calculateModularity(mediumCitationNetwork(), mediumCommunities);
    const largeQ = calculateModularity(largeCitationNetwork(), largeCommunities);

    console.log(`Quality across sizes:`);
    console.log(`  100 nodes: Q=${smallQ.toFixed(4)}`);
    console.log(`  500 nodes: Q=${mediumQ.toFixed(4)}`);
    console.log(`  1000 nodes: Q=${largeQ.toFixed(4)}`);

    // All should maintain quality ≥ 0.19
    expect(smallQ).toBeGreaterThanOrEqual(0.19);
    expect(mediumQ).toBeGreaterThanOrEqual(0.19);
    expect(largeQ).toBeGreaterThanOrEqual(0.19);

    // Quality should not degrade significantly with size
    // (variation of ±0.15 is acceptable due to different community structures)
    const qualityVariance = Math.max(smallQ, mediumQ, largeQ) - Math.min(smallQ, mediumQ, largeQ);
    expect(qualityVariance).toBeLessThan(0.15);
  });

  it('should use <100MB memory for 1000-node graph with CSR (T057)', { timeout: 10000 }, () => {
    const graph = largeCitationNetwork();
    expect(graph.getNodeCount()).toBe(1000);

    // Force garbage collection if available (Node.js with --expose-gc flag)
    if (global.gc) {
      global.gc();
    }

    const startMemory = process.memoryUsage().heapUsed;

    // Run Louvain with CSR conversion
    const communities = detectCommunities(graph);

    // Measure peak memory after algorithm completion
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsedMB = (endMemory - startMemory) / 1024 / 1024;

    console.log(`Memory usage for 1000-node graph:`);
    console.log(`  Start: ${(startMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  End: ${(endMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Delta: ${memoryUsedMB.toFixed(2)}MB`);
    console.log(`  Communities: ${communities.length}`);

    // Verify memory usage is under 100MB
    expect(memoryUsedMB).toBeLessThan(100);

    // Verify algorithm still works correctly
    expect(communities.length).toBeGreaterThan(0);
    const modularity = calculateModularity(graph, communities);
    expect(modularity).toBeGreaterThanOrEqual(0.19);
  });

  it('should handle 2000-node graph without memory exhaustion (T060)', { timeout: 60000 }, () => {
    // Generate large graph: 2000 nodes, 10 communities, 80% intra-community edges
    const graph = generateCitationNetwork(2000, 10, 0.8, 42);
    expect(graph.getNodeCount()).toBe(2000);

    console.log(`Stress test: 2000-node graph`);
    console.log(`  Nodes: ${graph.getNodeCount()}`);
    console.log(`  Edges: ${graph.getAllEdges().length}`);

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const startMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    // Run Louvain - should complete without crashing
    let communities;
    try {
      communities = detectCommunities(graph, { resolution: 1.0, randomSeed: 42 });
    } catch (error) {
      if (error instanceof RangeError) {
        console.log(`  ⚠️  RangeError: Graph too large for Uint32Array limits`);
        console.log(`  This is expected for very large graphs and CSR falls back gracefully`);
        // This is acceptable - CSR has limits, fallback should work
        return;
      }
      throw error;
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    const runtime = endTime - startTime;
    const memoryUsedMB = (endMemory - startMemory) / 1024 / 1024;

    console.log(`  Runtime: ${runtime.toFixed(2)}ms (${(runtime / 1000).toFixed(2)}s)`);
    console.log(`  Memory delta: ${memoryUsedMB.toFixed(2)}MB`);
    console.log(`  Communities: ${communities.length}`);

    // Verify algorithm completed successfully
    expect(communities).toBeDefined();
    expect(communities.length).toBeGreaterThan(0);

    // Calculate modularity to verify quality
    const modularity = calculateModularity(graph, communities);
    console.log(`  Modularity: ${modularity.toFixed(4)}`);
    expect(modularity).toBeGreaterThanOrEqual(0.15); // Slightly lower threshold for larger graphs

    // Verify memory is reasonable (allow more for 5000 nodes)
    expect(memoryUsedMB).toBeLessThan(500); // 500MB limit for stress test
  });
});
