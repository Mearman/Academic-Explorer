/**
 * Unit tests for attribute-based subgraph filtering
 */
import { describe, it, expect } from 'vitest';

import { filterSubgraph } from '../../src/extraction/filter';
import { Graph } from '../../src/graph/graph';
import type { Node, Edge } from '../../src/types/graph';

// Extended node type with academic attributes
interface WorkNode extends Node {
  type: 'work';
  year?: number;
  citationCount?: number;
  title?: string;
}

interface AuthorNode extends Node {
  type: 'author';
  name?: string;
}

type AcademicNode = WorkNode | AuthorNode;

// Extended edge type with relationship attributes
interface CitationEdge extends Edge {
  type: 'cites';
  year?: number;
}

interface AuthorshipEdge extends Edge {
  type: 'authored_by';
  position?: number;
}

type AcademicEdge = CitationEdge | AuthorshipEdge;

describe('filterSubgraph', () => {
  describe('node filtering by attributes', () => {
    it('should filter nodes by year range', () => {
      const graph = new Graph<AcademicNode, AcademicEdge>(true);

      // Add nodes with different years
      graph.addNode({ id: 'W1', type: 'work', year: 2020, citationCount: 10 });
      graph.addNode({ id: 'W2', type: 'work', year: 2021, citationCount: 20 });
      graph.addNode({ id: 'W3', type: 'work', year: 2022, citationCount: 30 });
      graph.addNode({ id: 'W4', type: 'work', year: 2023, citationCount: 40 });

      // Add edges
      graph.addEdge({ id: 'e1', source: 'W4', target: 'W3', type: 'cites' });
      graph.addEdge({ id: 'e2', source: 'W3', target: 'W2', type: 'cites' });
      graph.addEdge({ id: 'e3', source: 'W2', target: 'W1', type: 'cites' });

      // Filter for years 2021-2022
      const result = filterSubgraph(graph, {
        nodePredicate: (node) => {
          if (node.type === 'work' && node.year !== undefined) {
            return node.year >= 2021 && node.year <= 2022;
          }
          return false;
        },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const filteredGraph = result.value;
        expect(filteredGraph.getNodeCount()).toBe(2);
        expect(filteredGraph.getEdgeCount()).toBe(1);

        // Verify correct nodes included
        expect(filteredGraph.getNode('W2').some).toBe(true);
        expect(filteredGraph.getNode('W3').some).toBe(true);
        expect(filteredGraph.getNode('W1').some).toBe(false);
        expect(filteredGraph.getNode('W4').some).toBe(false);

        // Verify edge between W3->W2 is included
        expect(filteredGraph.getEdge('e2').some).toBe(true);
      }
    });

    it('should filter nodes by citation count', () => {
      const graph = new Graph<AcademicNode, AcademicEdge>(true);

      // Add nodes with different citation counts
      graph.addNode({ id: 'W1', type: 'work', year: 2020, citationCount: 5 });
      graph.addNode({ id: 'W2', type: 'work', year: 2021, citationCount: 50 });
      graph.addNode({ id: 'W3', type: 'work', year: 2022, citationCount: 100 });
      graph.addNode({ id: 'W4', type: 'work', year: 2023, citationCount: 500 });

      // Add edges
      graph.addEdge({ id: 'e1', source: 'W4', target: 'W3', type: 'cites' });
      graph.addEdge({ id: 'e2', source: 'W3', target: 'W2', type: 'cites' });
      graph.addEdge({ id: 'e3', source: 'W2', target: 'W1', type: 'cites' });

      // Filter for high-impact papers (citation count >= 100)
      const result = filterSubgraph(graph, {
        nodePredicate: (node) => {
          if (node.type === 'work' && node.citationCount !== undefined) {
            return node.citationCount >= 100;
          }
          return false;
        },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const filteredGraph = result.value;
        expect(filteredGraph.getNodeCount()).toBe(2);
        expect(filteredGraph.getEdgeCount()).toBe(1);

        // Verify high-impact papers included
        expect(filteredGraph.getNode('W3').some).toBe(true);
        expect(filteredGraph.getNode('W4').some).toBe(true);
        expect(filteredGraph.getNode('W1').some).toBe(false);
        expect(filteredGraph.getNode('W2').some).toBe(false);
      }
    });

    it('should filter nodes by entity type', () => {
      const graph = new Graph<AcademicNode, AcademicEdge>(true);

      // Add mixed node types
      graph.addNode({ id: 'W1', type: 'work', year: 2020 });
      graph.addNode({ id: 'A1', type: 'author', name: 'Alice' });
      graph.addNode({ id: 'W2', type: 'work', year: 2021 });
      graph.addNode({ id: 'A2', type: 'author', name: 'Bob' });

      // Add edges
      graph.addEdge({ id: 'e1', source: 'W1', target: 'A1', type: 'authored_by' });
      graph.addEdge({ id: 'e2', source: 'W2', target: 'A2', type: 'authored_by' });
      graph.addEdge({ id: 'e3', source: 'W2', target: 'W1', type: 'cites' });

      // Filter for only work nodes
      const result = filterSubgraph(graph, {
        nodePredicate: (node) => node.type === 'work',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const filteredGraph = result.value;
        expect(filteredGraph.getNodeCount()).toBe(2);
        expect(filteredGraph.getEdgeCount()).toBe(1);

        // Verify only work nodes included
        expect(filteredGraph.getNode('W1').some).toBe(true);
        expect(filteredGraph.getNode('W2').some).toBe(true);
        expect(filteredGraph.getNode('A1').some).toBe(false);
        expect(filteredGraph.getNode('A2').some).toBe(false);

        // Verify only W2->W1 citation edge included
        expect(filteredGraph.getEdge('e3').some).toBe(true);
      }
    });
  });

  describe('edge filtering by relationship type', () => {
    it('should filter edges by relationship type', () => {
      const graph = new Graph<AcademicNode, AcademicEdge>(true);

      // Add nodes
      graph.addNode({ id: 'W1', type: 'work', year: 2020 });
      graph.addNode({ id: 'W2', type: 'work', year: 2021 });
      graph.addNode({ id: 'A1', type: 'author', name: 'Alice' });

      // Add edges of different types
      graph.addEdge({ id: 'e1', source: 'W2', target: 'W1', type: 'cites' });
      graph.addEdge({ id: 'e2', source: 'W1', target: 'A1', type: 'authored_by' });
      graph.addEdge({ id: 'e3', source: 'W2', target: 'A1', type: 'authored_by' });

      // Filter for only citation edges
      const result = filterSubgraph(graph, {
        edgePredicate: (edge) => edge.type === 'cites',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const filteredGraph = result.value;
        // All nodes should be included (node predicate not specified)
        expect(filteredGraph.getNodeCount()).toBe(3);
        // Only citation edges included
        expect(filteredGraph.getEdgeCount()).toBe(1);
        expect(filteredGraph.getEdge('e1').some).toBe(true);
        expect(filteredGraph.getEdge('e2').some).toBe(false);
        expect(filteredGraph.getEdge('e3').some).toBe(false);
      }
    });

    it('should filter edges using edgeTypes set', () => {
      const graph = new Graph<AcademicNode, AcademicEdge>(true);

      // Add nodes
      graph.addNode({ id: 'W1', type: 'work', year: 2020 });
      graph.addNode({ id: 'W2', type: 'work', year: 2021 });
      graph.addNode({ id: 'A1', type: 'author', name: 'Alice' });

      // Add edges of different types
      graph.addEdge({ id: 'e1', source: 'W2', target: 'W1', type: 'cites' });
      graph.addEdge({ id: 'e2', source: 'W1', target: 'A1', type: 'authored_by' });
      graph.addEdge({ id: 'e3', source: 'W2', target: 'A1', type: 'authored_by' });

      // Filter for authored_by edges using edgeTypes
      const result = filterSubgraph(graph, {
        edgeTypes: new Set(['authored_by']),
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const filteredGraph = result.value;
        expect(filteredGraph.getNodeCount()).toBe(3);
        expect(filteredGraph.getEdgeCount()).toBe(2);
        expect(filteredGraph.getEdge('e1').some).toBe(false);
        expect(filteredGraph.getEdge('e2').some).toBe(true);
        expect(filteredGraph.getEdge('e3').some).toBe(true);
      }
    });
  });

  describe('combined filtering', () => {
    it('should apply node AND edge filters together (combineMode: and)', () => {
      const graph = new Graph<AcademicNode, AcademicEdge>(true);

      // Add nodes
      graph.addNode({ id: 'W1', type: 'work', year: 2020 });
      graph.addNode({ id: 'W2', type: 'work', year: 2021 });
      graph.addNode({ id: 'W3', type: 'work', year: 2022 });
      graph.addNode({ id: 'A1', type: 'author', name: 'Alice' });

      // Add edges
      graph.addEdge({ id: 'e1', source: 'W3', target: 'W2', type: 'cites' });
      graph.addEdge({ id: 'e2', source: 'W2', target: 'W1', type: 'cites' });
      graph.addEdge({ id: 'e3', source: 'W1', target: 'A1', type: 'authored_by' });

      // Filter for works from 2021+ AND citation edges only
      const result = filterSubgraph(graph, {
        nodePredicate: (node) => {
          if (node.type === 'work' && node.year !== undefined) {
            return node.year >= 2021;
          }
          return false;
        },
        edgePredicate: (edge) => edge.type === 'cites',
        combineMode: 'and',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const filteredGraph = result.value;
        // Only W2, W3 pass node filter
        expect(filteredGraph.getNodeCount()).toBe(2);
        // Only e1 (W3->W2) passes both node and edge filters
        expect(filteredGraph.getEdgeCount()).toBe(1);
        expect(filteredGraph.getNode('W2').some).toBe(true);
        expect(filteredGraph.getNode('W3').some).toBe(true);
        expect(filteredGraph.getEdge('e1').some).toBe(true);
      }
    });

    it('should apply node OR edge filters (combineMode: or)', () => {
      const graph = new Graph<AcademicNode, AcademicEdge>(true);

      // Add nodes
      graph.addNode({ id: 'W1', type: 'work', year: 2020 });
      graph.addNode({ id: 'W2', type: 'work', year: 2021 });
      graph.addNode({ id: 'A1', type: 'author', name: 'Alice' });

      // Add edges
      graph.addEdge({ id: 'e1', source: 'W2', target: 'W1', type: 'cites' });
      graph.addEdge({ id: 'e2', source: 'W1', target: 'A1', type: 'authored_by' });

      // Filter for year >= 2021 OR citation edges
      const result = filterSubgraph(graph, {
        nodePredicate: (node) => {
          if (node.type === 'work' && node.year !== undefined) {
            return node.year >= 2021;
          }
          return false;
        },
        edgePredicate: (edge) => edge.type === 'cites',
        combineMode: 'or',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const filteredGraph = result.value;
        // W2 passes node filter, W1 included because it's an endpoint of e1 (citation edge)
        // A1 is NOT included because it's only connected via e2 (authored_by) which doesn't pass edge filter
        expect(filteredGraph.getNodeCount()).toBe(2);
        // Citation edge e1 passes edge filter
        expect(filteredGraph.getEdgeCount()).toBe(1);
        expect(filteredGraph.getEdge('e1').some).toBe(true);
        // Verify correct nodes included
        expect(filteredGraph.getNode('W2').some).toBe(true);
        expect(filteredGraph.getNode('W1').some).toBe(true);
        expect(filteredGraph.getNode('A1').some).toBe(false);
      }
    });

    it('should combine multiple filter criteria with AND mode', () => {
      const graph = new Graph<AcademicNode, AcademicEdge>(true);

      // Add nodes with various attributes
      graph.addNode({ id: 'W1', type: 'work', year: 2020, citationCount: 50 });
      graph.addNode({ id: 'W2', type: 'work', year: 2021, citationCount: 100 });
      graph.addNode({ id: 'W3', type: 'work', year: 2022, citationCount: 150 });

      // Add edges
      graph.addEdge({ id: 'e1', source: 'W3', target: 'W2', type: 'cites' });
      graph.addEdge({ id: 'e2', source: 'W2', target: 'W1', type: 'cites' });

      // Filter for recent (>= 2021) AND high-impact (>= 100 citations)
      const result = filterSubgraph(graph, {
        nodePredicate: (node) => {
          if (node.type === 'work') {
            const recentEnough = node.year !== undefined && node.year >= 2021;
            const highImpact = node.citationCount !== undefined && node.citationCount >= 100;
            return recentEnough && highImpact;
          }
          return false;
        },
        edgeTypes: new Set(['cites']),
        combineMode: 'and',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const filteredGraph = result.value;
        // Only W2 and W3 meet both criteria
        expect(filteredGraph.getNodeCount()).toBe(2);
        expect(filteredGraph.getEdgeCount()).toBe(1);
        expect(filteredGraph.getNode('W2').some).toBe(true);
        expect(filteredGraph.getNode('W3').some).toBe(true);
        expect(filteredGraph.getEdge('e1').some).toBe(true);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty filter (returns full graph)', () => {
      const graph = new Graph<AcademicNode, AcademicEdge>(true);

      graph.addNode({ id: 'W1', type: 'work', year: 2020 });
      graph.addNode({ id: 'W2', type: 'work', year: 2021 });
      graph.addEdge({ id: 'e1', source: 'W2', target: 'W1', type: 'cites' });

      // Empty filter
      const result = filterSubgraph(graph, {});

      expect(result.ok).toBe(true);
      if (result.ok) {
        const filteredGraph = result.value;
        expect(filteredGraph.getNodeCount()).toBe(2);
        expect(filteredGraph.getEdgeCount()).toBe(1);
      }
    });

    it('should return empty graph when no nodes match filter', () => {
      const graph = new Graph<AcademicNode, AcademicEdge>(true);

      graph.addNode({ id: 'W1', type: 'work', year: 2020 });
      graph.addNode({ id: 'W2', type: 'work', year: 2021 });
      graph.addEdge({ id: 'e1', source: 'W2', target: 'W1', type: 'cites' });

      // Filter for non-existent year
      const result = filterSubgraph(graph, {
        nodePredicate: (node) => {
          if (node.type === 'work' && node.year !== undefined) {
            return node.year >= 2030;
          }
          return false;
        },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const filteredGraph = result.value;
        expect(filteredGraph.getNodeCount()).toBe(0);
        expect(filteredGraph.getEdgeCount()).toBe(0);
      }
    });

    it('should return error for null graph', () => {
      const result = filterSubgraph(null as unknown as Graph<AcademicNode, AcademicEdge>, {
        nodePredicate: (node) => node.type === 'work',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
        expect(result.error.message).toContain('Graph is null or undefined');
      }
    });

    it('should return error for invalid filter', () => {
      const graph = new Graph<AcademicNode, AcademicEdge>(true);
      graph.addNode({ id: 'W1', type: 'work', year: 2020 });

      const result = filterSubgraph(
        graph,
        null as unknown as { nodePredicate?: (node: AcademicNode) => boolean }
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-filter');
      }
    });

    it('should preserve graph directedness', () => {
      const directedGraph = new Graph<AcademicNode, AcademicEdge>(true);
      directedGraph.addNode({ id: 'W1', type: 'work', year: 2020 });
      directedGraph.addNode({ id: 'W2', type: 'work', year: 2021 });

      const result1 = filterSubgraph(directedGraph, {
        nodePredicate: (node) => node.type === 'work',
      });

      expect(result1.ok).toBe(true);
      if (result1.ok) {
        expect(result1.value.isDirected()).toBe(true);
      }

      const undirectedGraph = new Graph<AcademicNode, AcademicEdge>(false);
      undirectedGraph.addNode({ id: 'W1', type: 'work', year: 2020 });
      undirectedGraph.addNode({ id: 'W2', type: 'work', year: 2021 });

      const result2 = filterSubgraph(undirectedGraph, {
        nodePredicate: (node) => node.type === 'work',
      });

      expect(result2.ok).toBe(true);
      if (result2.ok) {
        expect(result2.value.isDirected()).toBe(false);
      }
    });
  });
});
