import { type Graph } from '../graph/graph';
import { type Node, type Edge } from '../types/graph';
import { type Result, Ok, Err } from '../types/result';
import { type CycleDetectedError, type InvalidInputError } from '../types/errors';

/**
 * Topological sort using DFS-based reverse postorder.
 *
 * Returns a linear ordering of vertices such that for every directed edge (u, v),
 * u comes before v in the ordering. Only works on Directed Acyclic Graphs (DAGs).
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V)
 *
 * @param graph - The directed graph to sort
 * @returns Result containing ordered nodes or cycle error
 */
export function topologicalSort<N extends Node, E extends Edge = Edge>(
  graph: Graph<N, E>
): Result<N[], CycleDetectedError | InvalidInputError> {
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
  const postorder: N[] = [];

  // DFS with cycle detection and path reconstruction
  function dfs(nodeId: string, parentId: string | null): Result<void, CycleDetectedError> {
    if (inStack.has(nodeId)) {
      // Back edge detected - reconstruct cycle path from parent chain
      const cyclePath: string[] = [];
      let current: string | null | undefined = parentId;

      // Trace back from parent to the node where cycle starts
      while (current !== null && current !== undefined && current !== nodeId) {
        cyclePath.push(current);
        current = parent.get(current);
      }

      // Add the cycle start node to complete the cycle
      cyclePath.push(nodeId);

      // Reverse to get path from cycle start to back edge
      cyclePath.reverse();

      return Err({
        type: 'cycle-detected',
        message: `Cycle detected: ${cyclePath.join(' → ')} → ${cyclePath[0]}`,
        cyclePath,
      });
    }

    if (visited.has(nodeId)) {
      return Ok(undefined);
    }

    visited.add(nodeId);
    inStack.add(nodeId);
    parent.set(nodeId, parentId);

    // Visit all neighbors
    const neighborsResult = graph.getNeighbors(nodeId);
    if (neighborsResult.ok) {
      for (const neighborId of neighborsResult.value) {
        const result = dfs(neighborId, nodeId);
        if (!result.ok) {
          return result;
        }
      }
    }

    inStack.delete(nodeId);

    // Add to postorder after visiting all descendants
    const node = graph.getNode(nodeId);
    if (node.some) {
      postorder.push(node.value);
    }

    return Ok(undefined);
  }

  // Run DFS from all unvisited nodes
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const result = dfs(node.id, null);
      if (!result.ok) {
        return Err(result.error);
      }
    }
  }

  // Reverse postorder gives topological order
  return Ok(postorder.reverse());
}
