import { type Graph } from '../graph/graph';
import { type Component } from '../types/algorithm-results';
import { type InvalidInputError } from '../types/errors';
import { type Node, type Edge } from '../types/graph';
import { type Result, Ok, Err } from '../types/result';

/**
 * Find all connected components in an undirected graph (or weakly connected components in directed graph).
 *
 * Uses DFS to traverse each component. For directed graphs, treats edges as undirected.
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V)
 *
 * @param graph - The graph to analyze
 * @returns Result containing array of components
 */
export function connectedComponents<N extends Node, E extends Edge = Edge>(
  graph: Graph<N, E>
): Result<Component<N>[], InvalidInputError> {
  if (!graph) {
    return Err({
      type: 'invalid-input',
      message: 'Graph cannot be null or undefined',
    });
  }

  const nodes = graph.getAllNodes();
  const visited = new Set<string>();
  const components: Component<N>[] = [];
  let componentId = 0;

  function dfs(nodeId: string, componentNodes: N[]): void {
    visited.add(nodeId);

    const node = graph.getNode(nodeId);
    if (node.some) {
      componentNodes.push(node.value);
    }

    // Get neighbors (treats directed graph as undirected for connectivity)
    const neighborsResult = graph.getNeighbors(nodeId);
    if (neighborsResult.ok) {
      for (const neighborId of neighborsResult.value) {
        if (!visited.has(neighborId)) {
          dfs(neighborId, componentNodes);
        }
      }
    }

    // For directed graphs, also check reverse edges (incoming edges)
    if (graph.isDirected()) {
      const allEdges = graph.getAllEdges();
      for (const edge of allEdges) {
        if (edge.target === nodeId && !visited.has(edge.source)) {
          dfs(edge.source, componentNodes);
        }
      }
    }
  }

  // Find all components
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const componentNodes: N[] = [];
      dfs(node.id, componentNodes);

      components.push({
        id: componentId++,
        nodes: componentNodes,
        size: componentNodes.length,
      });
    }
  }

  return Ok(components);
}
