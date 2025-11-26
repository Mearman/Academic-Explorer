/**
 * Performance tests for attribute-based subgraph filtering
 */
import { describe, it, expect } from 'vitest';
import { filterSubgraph } from '../../src/extraction/filter';
import { Graph } from '../../src/graph/graph';
import type { Node, Edge } from '../../src/types/graph';

// Extended node type with academic attributes
interface WorkNode extends Node {
  type: 'work';
  year: number;
  citationCount: number;
}

interface CitationEdge extends Edge {
  type: 'cites';
}

describe('filterSubgraph - performance', () => {
  it('should filter 10k-node graph in <200ms', () => {
    // Create large citation network
    const graph = new Graph<WorkNode, CitationEdge>(true);

    // Add 10,000 nodes with random attributes
    const numNodes = 10000;
    const startYear = 1990;
    const endYear = 2024;

    for (let i = 0; i < numNodes; i++) {
      const year = startYear + Math.floor(Math.random() * (endYear - startYear));
      const citationCount = Math.floor(Math.random() * 1000);

      graph.addNode({
        id: `W${i}`,
        type: 'work',
        year,
        citationCount,
      });
    }

    // Add random edges (approximately 20,000 edges)
    const numEdges = 20000;
    let edgeId = 0;
    const addedEdges = new Set<string>();

    while (edgeId < numEdges) {
      const source = Math.floor(Math.random() * numNodes);
      const target = Math.floor(Math.random() * numNodes);

      if (source !== target) {
        const edgeKey = `${source}-${target}`;
        if (!addedEdges.has(edgeKey)) {
          addedEdges.add(edgeKey);
          graph.addEdge({
            id: `e${edgeId}`,
            source: `W${source}`,
            target: `W${target}`,
            type: 'cites',
          });
          edgeId++;
        }
      }
    }

    // Verify graph was created correctly
    expect(graph.getNodeCount()).toBe(numNodes);
    expect(graph.getEdgeCount()).toBeGreaterThanOrEqual(numEdges - 100); // Allow some variation

    // Performance test: Filter for recent high-impact papers
    const startTime = performance.now();

    const result = filterSubgraph(graph, {
      nodePredicate: (node) => {
        return node.year >= 2020 && node.citationCount >= 100;
      },
      edgePredicate: (edge) => edge.type === 'cites',
      combineMode: 'and',
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify successful filtering
    expect(result.ok).toBe(true);
    if (result.ok) {
      const filteredGraph = result.value;
      // Should have filtered down significantly
      expect(filteredGraph.getNodeCount()).toBeLessThan(numNodes);
      expect(filteredGraph.getEdgeCount()).toBeLessThan(graph.getEdgeCount());

      // Verify all filtered nodes meet criteria
      const filteredNodes = filteredGraph.getAllNodes();
      for (const node of filteredNodes) {
        expect(node.year).toBeGreaterThanOrEqual(2020);
        expect(node.citationCount).toBeGreaterThanOrEqual(100);
      }
    }

    // Performance assertion
    expect(duration).toBeLessThan(200);
    console.log(`Filtered ${numNodes} nodes and ${numEdges} edges in ${duration.toFixed(2)}ms`);
  });

  it('should handle large graphs with complex predicates efficiently', () => {
    const graph = new Graph<WorkNode, CitationEdge>(true);

    // Create a 5,000 node graph (smaller for faster test execution)
    const numNodes = 5000;
    for (let i = 0; i < numNodes; i++) {
      graph.addNode({
        id: `W${i}`,
        type: 'work',
        year: 2000 + Math.floor(Math.random() * 25),
        citationCount: Math.floor(Math.random() * 500),
      });
    }

    // Add edges
    const numEdges = 10000;
    let edgeId = 0;
    const addedEdges = new Set<string>();

    while (edgeId < numEdges) {
      const source = Math.floor(Math.random() * numNodes);
      const target = Math.floor(Math.random() * numNodes);

      if (source !== target) {
        const edgeKey = `${source}-${target}`;
        if (!addedEdges.has(edgeKey)) {
          addedEdges.add(edgeKey);
          graph.addEdge({
            id: `e${edgeId}`,
            source: `W${source}`,
            target: `W${target}`,
            type: 'cites',
          });
          edgeId++;
        }
      }
    }

    // Complex filter with multiple conditions
    const startTime = performance.now();

    const result = filterSubgraph(graph, {
      nodePredicate: (node) => {
        // Complex filtering logic
        const isRecent = node.year >= 2015;
        const hasImpact = node.citationCount >= 50;
        const isDecade = node.year % 10 === 0;
        return isRecent && (hasImpact || isDecade);
      },
      edgePredicate: (edge) => {
        // Always true but adds overhead
        return edge.type === 'cites';
      },
      combineMode: 'and',
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.getNodeCount()).toBeGreaterThan(0);
    }

    // Should complete quickly even with complex predicates
    expect(duration).toBeLessThan(150);
    console.log(
      `Filtered ${numNodes} nodes with complex predicates in ${duration.toFixed(2)}ms`
    );
  });

  it('should handle edge-only filtering efficiently on large graphs', () => {
    const graph = new Graph<WorkNode, CitationEdge>(true);

    // Create 10,000 nodes
    const numNodes = 10000;
    for (let i = 0; i < numNodes; i++) {
      graph.addNode({
        id: `W${i}`,
        type: 'work',
        year: 2020,
        citationCount: 100,
      });
    }

    // Add 20,000 edges (mix of types via attributes)
    for (let i = 0; i < 20000; i++) {
      const source = Math.floor(Math.random() * numNodes);
      const target = Math.floor(Math.random() * numNodes);

      if (source !== target) {
        graph.addEdge({
          id: `e${i}`,
          source: `W${source}`,
          target: `W${target}`,
          type: 'cites',
        });
      }
    }

    const startTime = performance.now();

    // Filter only edges (all nodes included)
    const result = filterSubgraph(graph, {
      edgePredicate: (edge) => {
        // Simple edge filter
        return edge.id.startsWith('e1');
      },
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(result.ok).toBe(true);
    if (result.ok) {
      // All nodes included
      expect(result.value.getNodeCount()).toBe(numNodes);
      // Filtered edges (those starting with 'e1')
      expect(result.value.getEdgeCount()).toBeLessThan(graph.getEdgeCount());
    }

    expect(duration).toBeLessThan(200);
    console.log(`Edge-only filtering on large graph completed in ${duration.toFixed(2)}ms`);
  });
});
