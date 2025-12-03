import { type Graph } from '../graph/graph';
import { type TraversalResult } from '../types/algorithm-results';
import { type InvalidInputError } from '../types/errors';
import { type Edge,type Node } from '../types/graph';
import { Err,Ok, type Result } from '../types/result';

/**
 * Depth-First Search (DFS) traversal algorithm.
 *
 * Traverses a graph in depth-first order starting from a given node.
 * Uses an iterative approach with explicit stack to avoid stack overflow.
 *
 * Time Complexity: O(V + E) where V = vertices, E = edges
 * Space Complexity: O(V) for visited set and parent tracking
 * @param graph - The graph to traverse
 * @param startId - ID of the starting node
 * @returns Result containing traversal information or error
 * @example
 * ```typescript
 * const graph = new Graph<MyNode, MyEdge>(true);
 * graph.addNode({ id: 'A', type: 'test' });
 * graph.addNode({ id: 'B', type: 'test' });
 * graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'edge' });
 *
 * const result = dfs(graph, 'A');
 * if (result.ok) {
 *   console.log('Visit order:', result.value.visitOrder);
 *   console.log('Parents:', result.value.parents);
 * }
 * ```
 */
export const dfs = <N extends Node, E extends Edge = Edge>(graph: Graph<N, E>, startId: string): Result<TraversalResult<N>, InvalidInputError> => {
  // Validate inputs
  if (!graph) {
    return Err({
      type: 'invalid-input',
      message: 'Graph cannot be null or undefined',
    });
  }

  const startNode = graph.getNode(startId);
  if (!startNode.some) {
    return Err({
      type: 'invalid-input',
      message: `Start node '${startId}' not found in graph`,
    });
  }

  // Initialize tracking structures
  const visited = new Set<string>();
  const visitOrder: N[] = [];
  const parents = new Map<string, string | null>();
  const discovered = new Map<string, number>();
  const finished = new Map<string, number>();
  let time = 0;

  // Stack for iterative DFS: [nodeId, isReturning]
  // isReturning=false means we're discovering the node
  // isReturning=true means we're finishing the node (all children visited)
  const stack: Array<[string, boolean]> = [[startId, false]];
  parents.set(startId, null); // Root has no parent

  while (stack.length > 0) {
    const entry = stack.pop();
    if (entry === undefined) break;
    const [currentId, isReturning] = entry;

    if (isReturning) {
      // Finishing the node - record finish time
      time++;
      finished.set(currentId, time);
      continue;
    }

    // Skip if already visited
    if (visited.has(currentId)) {
      continue;
    }

    // Mark as visited and record discovery time
    visited.add(currentId);
    time++;
    discovered.set(currentId, time);

    const currentNode = graph.getNode(currentId);
    if (currentNode.some) {
      visitOrder.push(currentNode.value);
    }

    // Push finishing marker for current node
    stack.push([currentId, true]);

    // Get neighbors and push to stack (in reverse order for left-to-right traversal)
    const neighborsResult = graph.getNeighbors(currentId);
    if (neighborsResult.ok) {
      const neighbors = Array.from(neighborsResult.value);

      // Push in reverse order so first neighbor is processed first (LIFO)
      for (let i = neighbors.length - 1; i >= 0; i--) {
        const neighborId = neighbors[i];

        // Skip if already visited
        if (visited.has(neighborId)) {
          continue;
        }

        // Set parent if not already set
        if (!parents.has(neighborId)) {
          parents.set(neighborId, currentId);
        }

        // Push for discovery
        stack.push([neighborId, false]);
      }
    }
  }

  return Ok({
    visitOrder,
    parents,
    discovered,
    finished,
  });
};
