/**
 * Attribute-based subgraph filtering utilities
 */
import { Graph } from '../graph/graph';
import type { ExtractionError } from '../types/errors';
import type { Node, Edge } from '../types/graph';
import type { Result } from '../types/result';

import { filterGraph } from './subgraph';
import type { SubgraphFilter } from './validators';
import { validateSubgraphFilter } from './validators';

/**
 * Filters a graph based on node and edge attributes.
 *
 * Supports multiple filtering modes:
 * - Node predicates: Filter nodes by custom logic
 * - Edge predicates: Filter edges by custom logic
 * - Node attributes: Filter nodes by attribute values
 * - Edge types: Filter edges by type set
 * - Combine modes: AND (default) or OR for multiple filters
 *
 * @param graph - Source graph to filter
 * @param filter - Filter specification with predicates and options
 * @returns Result containing filtered subgraph or error
 *
 * Time Complexity: O(V + E) where V = nodes, E = edges
 * Space Complexity: O(V' + E') where V', E' are filtered counts
 *
 * @example
 * ```typescript
 * // Filter for recent high-impact papers
 * const result = filterSubgraph(graph, {
 *   nodePredicate: (node) => node.year >= 2020 && node.citationCount >= 100,
 *   edgeTypes: new Set(['cites']),
 *   combineMode: 'and'
 * });
 * ```
 */
export function filterSubgraph<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  filter: SubgraphFilter<N, E>
): Result<Graph<N, E>, ExtractionError> {
  // Validate input graph
  if (!graph) {
    return {
      ok: false,
      error: {
        type: 'invalid-input',
        message: 'Graph is null or undefined',
        input: graph,
      },
    };
  }

  // Validate filter specification
  const validationResult = validateSubgraphFilter(filter);
  if (!validationResult.ok) {
    // InvalidFilterError is part of ExtractionError union
    // Type narrowing doesn't work across Result types, so we manually construct
    return {
      ok: false,
      error: (validationResult as { ok: false; error: ExtractionError }).error,
    };
  }

  const validatedFilter = validationResult.value;

  // Build combined node predicate
  const combinedNodePredicate = buildNodePredicate(validatedFilter);

  // Build combined edge predicate
  const combinedEdgePredicate = buildEdgePredicate(validatedFilter);

  // Handle OR mode - needs special logic
  if (validatedFilter.combineMode === 'or') {
    return filterGraphOr(graph, validatedFilter, combinedNodePredicate, combinedEdgePredicate);
  }

  // AND mode (default) - use existing filterGraph function
  return filterGraph(graph, combinedNodePredicate, combinedEdgePredicate);
}

/**
 * Builds a combined node predicate from filter specification.
 * Handles nodePredicate and nodeAttributes with AND logic.
 */
function buildNodePredicate<N extends Node, E extends Edge>(
  filter: SubgraphFilter<N, E>
): (node: N) => boolean {
  const predicates: Array<(node: N) => boolean> = [];

  // Add custom node predicate if provided
  if (filter.nodePredicate) {
    predicates.push(filter.nodePredicate);
  }

  // Add node attributes filter if provided
  if (filter.nodeAttributes && Object.keys(filter.nodeAttributes).length > 0) {
    const nodeAttributes = filter.nodeAttributes;
    predicates.push((node: N) => {
      for (const [key, value] of Object.entries(nodeAttributes)) {
        if (node[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  // If no predicates, include all nodes
  if (predicates.length === 0) {
    return () => true;
  }

  // Combine predicates with AND logic
  return (node: N) => predicates.every((pred) => pred(node));
}

/**
 * Builds a combined edge predicate from filter specification.
 * Handles edgePredicate and edgeTypes with AND logic.
 */
function buildEdgePredicate<N extends Node, E extends Edge>(
  filter: SubgraphFilter<N, E>
): (edge: E) => boolean {
  const predicates: Array<(edge: E) => boolean> = [];

  // Add custom edge predicate if provided
  if (filter.edgePredicate) {
    predicates.push(filter.edgePredicate);
  }

  // Add edge types filter if provided
  if (filter.edgeTypes && filter.edgeTypes.size > 0) {
    const edgeTypes = filter.edgeTypes;
    predicates.push((edge: E) => edgeTypes.has(edge.type));
  }

  // If no predicates, include all edges
  if (predicates.length === 0) {
    return () => true;
  }

  // Combine predicates with AND logic
  return (edge: E) => predicates.every((pred) => pred(edge));
}

/**
 * Filters graph using OR mode - includes nodes/edges that pass either filter.
 *
 * OR mode logic:
 * 1. Include all nodes that pass node predicate
 * 2. For edges that pass edge predicate, also include their endpoint nodes
 * 3. Include all edges that pass edge predicate AND have both endpoints included
 */
function filterGraphOr<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  filter: SubgraphFilter<N, E>,
  nodePredicate: (node: N) => boolean,
  edgePredicate: (edge: E) => boolean
): Result<Graph<N, E>, ExtractionError> {
  const subgraph = new Graph<N, E>(graph.isDirected());
  const includedNodes = new Set<string>();

  // First pass: Add nodes that pass node predicate
  const allNodes = graph.getAllNodes();
  for (const node of allNodes) {
    if (nodePredicate(node)) {
      subgraph.addNode(node);
      includedNodes.add(node.id);
    }
  }

  // Second pass: Process edges
  // Include edges that pass edge predicate, and add their endpoints if needed
  const allEdges = graph.getAllEdges();
  for (const edge of allEdges) {
    if (edgePredicate(edge)) {
      // Add source node if not already included
      if (!includedNodes.has(edge.source)) {
        const sourceNode = graph.getNode(edge.source);
        if (sourceNode.some) {
          subgraph.addNode(sourceNode.value);
          includedNodes.add(edge.source);
        }
      }

      // Add target node if not already included
      if (!includedNodes.has(edge.target)) {
        const targetNode = graph.getNode(edge.target);
        if (targetNode.some) {
          subgraph.addNode(targetNode.value);
          includedNodes.add(edge.target);
        }
      }

      // Add the edge
      subgraph.addEdge(edge);
    }
  }

  return { ok: true, value: subgraph };
}
