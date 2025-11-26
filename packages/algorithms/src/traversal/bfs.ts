import { type Graph } from '../graph/graph';
import { type TraversalResult } from '../types/algorithm-results';
import { type InvalidInputError } from '../types/errors';
import { type Node, type Edge } from '../types/graph';
import { type Result, Ok, Err } from '../types/result';

/**
 * Breadth-First Search (BFS) traversal algorithm.
 *
 * Traverses a graph in breadth-first order starting from a given node.
 * Visits all nodes at distance k before visiting nodes at distance k+1.
 * Uses a queue for level-order traversal.
 *
 * Time Complexity: O(V + E) where V = vertices, E = edges
 * Space Complexity: O(V) for visited set and queue
 *
 * @param graph - The graph to traverse
 * @param startId - ID of the starting node
 * @returns Result containing traversal information or error
 *
 * @example
 * ```typescript
 * const graph = new Graph<MyNode, MyEdge>(true);
 * graph.addNode({ id: 'A', type: 'test' });
 * graph.addNode({ id: 'B', type: 'test' });
 * graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'edge' });
 *
 * const result = bfs(graph, 'A');
 * if (result.ok) {
 *   console.log('Visit order (level-by-level):', result.value.visitOrder);
 *   console.log('Parents:', result.value.parents);
 * }
 * ```
 */
export function bfs<N extends Node, E extends Edge = Edge>(
  graph: Graph<N, E>,
  startId: string
): Result<TraversalResult<N>, InvalidInputError> {
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

  // Queue for BFS: simple array with FIFO operations
  const queue: string[] = [startId];
  visited.add(startId);
  parents.set(startId, null); // Root has no parent

  while (queue.length > 0) {
    // Dequeue from front (FIFO)
    const currentId = queue.shift();
    if (currentId === undefined) break;

    // Add current node to visit order
    const currentNode = graph.getNode(currentId);
    if (currentNode.some) {
      visitOrder.push(currentNode.value);
    }

    // Get neighbors and enqueue unvisited ones
    const neighborsResult = graph.getNeighbors(currentId);
    if (neighborsResult.ok) {
      for (const neighborId of neighborsResult.value) {
        // Skip if already visited
        if (visited.has(neighborId)) {
          continue;
        }

        // Mark as visited and set parent
        visited.add(neighborId);
        parents.set(neighborId, currentId);

        // Enqueue for later processing
        queue.push(neighborId);
      }
    }
  }

  return Ok({
    visitOrder,
    parents,
    // Note: BFS does not track discovery/finish times
    // These are DFS-specific properties
  });
}
