import { type Graph } from '../graph/graph';
import { type CycleInfo } from '../types/algorithm-results';
import { type InvalidInputError } from '../types/errors';
import { type Node, type Edge } from '../types/graph';
import { type Option, Some, None } from '../types/option';
import { type Result, Ok, Err } from '../types/result';

/**
 * Detect cycles in a graph using DFS.
 *
 * For directed graphs: detects back edges (edges to ancestors in DFS tree)
 * For undirected graphs: detects any edge except parent edge
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V)
 *
 * @param graph - The graph to check for cycles
 * @returns Result containing Option with cycle info if found
 */
export function detectCycle<N extends Node, E extends Edge>(
  graph: Graph<N, E>
): Result<Option<CycleInfo<N, E>>, InvalidInputError> {
  if (!graph) {
    return Err({
      type: 'invalid-input',
      message: 'Graph cannot be null or undefined',
    });
  }

  const nodes = graph.getAllNodes();
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const parent = new Map<string, string | null>();

  function dfsDirected(nodeId: string): Option<CycleInfo<N, E>> {
    visited.add(nodeId);
    inStack.add(nodeId);

    const neighborsResult = graph.getNeighbors(nodeId);
    if (neighborsResult.ok) {
      for (const neighborId of neighborsResult.value) {
        if (inStack.has(neighborId)) {
          // Back edge - cycle found!
          return reconstructCycle(nodeId, neighborId);
        }

        if (!visited.has(neighborId)) {
          parent.set(neighborId, nodeId);
          const cycleResult = dfsDirected(neighborId);
          if (cycleResult.some) {
            return cycleResult;
          }
        }
      }
    }

    inStack.delete(nodeId);
    return None();
  }

  function dfsUndirected(nodeId: string, parentId: string | null): Option<CycleInfo<N, E>> {
    visited.add(nodeId);

    const neighborsResult = graph.getNeighbors(nodeId);
    if (neighborsResult.ok) {
      for (const neighborId of neighborsResult.value) {
        if (!visited.has(neighborId)) {
          parent.set(neighborId, nodeId);
          const cycleResult = dfsUndirected(neighborId, nodeId);
          if (cycleResult.some) {
            return cycleResult;
          }
        } else if (neighborId !== parentId) {
          // Back edge (not to parent) - cycle found!
          return reconstructCycle(nodeId, neighborId);
        }
      }
    }

    return None();
  }

  function reconstructCycle(fromId: string, toId: string): Option<CycleInfo<N, E>> {
    const cycleNodes: N[] = [];
    const cycleEdges: E[] = [];

    // Build path from 'from' back to 'to'
    let current = fromId;
    const path: string[] = [current];

    // Trace back through parents until we find 'to'
    while (current !== toId && parent.has(current)) {
      const parentId = parent.get(current);
      if (parentId) {
        path.unshift(parentId);
        current = parentId;
      } else {
        break;
      }
    }

    // Add closing edge
    path.push(toId);

    // Convert to nodes and edges
    for (let i = 0; i < path.length; i++) {
      const node = graph.getNode(path[i]);
      if (node.some) {
        cycleNodes.push(node.value);
      }

      if (i < path.length - 1) {
        const edges = graph.getOutgoingEdges(path[i]);
        if (edges.ok) {
          const edge = edges.value.find(e => e.target === path[i + 1]);
          if (edge) {
            cycleEdges.push(edge);
          }
        }
      }
    }

    return Some({ nodes: cycleNodes, edges: cycleEdges });
  }

  // Run DFS from all unvisited nodes
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      parent.set(node.id, null);

      const cycleResult = graph.isDirected()
        ? dfsDirected(node.id)
        : dfsUndirected(node.id, null);

      if (cycleResult.some) {
        return Ok(cycleResult);
      }
    }
  }

  return Ok(None());
}
