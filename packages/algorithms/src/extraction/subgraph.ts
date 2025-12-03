/**
 * Subgraph extraction utilities for graph extraction algorithms
 */
import { Graph } from '../graph/graph';
import type { InvalidInputError } from '../types/errors';
import type { Edge,Node } from '../types/graph';
import type { Result } from '../types/result';

/**
 * Extracts an induced subgraph containing only the specified nodes
 * and all edges between them.
 * @param graph - Source graph
 * @param nodeIds - Set of node IDs to include in subgraph
 * @returns A new graph containing only the specified nodes and their interconnecting edges
 *
 * Time Complexity: O(V + E) where V is nodeIds.size and E is edges in original graph
 * Space Complexity: O(V + E') where E' is edges in induced subgraph
 */
export const extractInducedSubgraph = <N extends Node, E extends Edge>(graph: Graph<N, E>, nodeIds: Set<string>): Result<Graph<N, E>, InvalidInputError> => {
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

  if (!nodeIds || nodeIds.size === 0) {
    return {
      ok: true,
      value: new Graph<N, E>(graph.isDirected()),
    };
  }

  const subgraph = new Graph<N, E>(graph.isDirected());

  // Add nodes
  for (const nodeId of nodeIds) {
    const nodeOption = graph.getNode(nodeId);
    if (nodeOption.some) {
      subgraph.addNode(nodeOption.value);
    }
  }

  // Add edges between included nodes
  const allEdges = graph.getAllEdges();
  for (const edge of allEdges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      subgraph.addEdge(edge);
    }
  }

  return { ok: true, value: subgraph };
};

/**
 * Extracts a subgraph by filtering nodes and edges based on predicates.
 * @param graph - Source graph
 * @param nodePredicate - Function to determine if a node should be included
 * @param edgePredicate - Optional function to determine if an edge should be included
 * @returns A new graph containing only nodes/edges that pass the predicates
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V' + E')
 */
export const filterGraph = <N extends Node, E extends Edge>(graph: Graph<N, E>, nodePredicate: (node: N) => boolean, edgePredicate?: (edge: E) => boolean): Result<Graph<N, E>, InvalidInputError> => {
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

  const subgraph = new Graph<N, E>(graph.isDirected());
  const includedNodes = new Set<string>();

  // Filter and add nodes
  const allNodes = graph.getAllNodes();
  for (const node of allNodes) {
    if (nodePredicate(node)) {
      subgraph.addNode(node);
      includedNodes.add(node.id);
    }
  }

  // Filter and add edges
  const allEdges = graph.getAllEdges();
  for (const edge of allEdges) {
    // Edge can only be included if both endpoints are included
    if (includedNodes.has(edge.source) && includedNodes.has(edge.target) && // Apply edge predicate if provided
      (!edgePredicate || edgePredicate(edge))) {
        subgraph.addEdge(edge);
      }
  }

  return { ok: true, value: subgraph };
};

/**
 * Creates a copy of the graph with only specific edge types.
 * @param graph - Source graph
 * @param edgeTypes - Set of edge types to include
 * @returns A new graph containing only edges of the specified types
 */
export const filterByEdgeType = <N extends Node, E extends Edge>(graph: Graph<N, E>, edgeTypes: Set<string>): Result<Graph<N, E>, InvalidInputError> => filterGraph(
    graph,
    () => true, // Include all nodes
    (edge) => edgeTypes.has(edge.type)
  );
