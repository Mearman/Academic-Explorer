import { type Graph } from '../graph/graph';
import { type Path } from '../types/algorithm-results';
import {
  type GraphError,
  type InvalidInputError,
  type NegativeWeightError,
} from '../types/errors';
import { type Node, type Edge } from '../types/graph';
import { type Option, Some, None } from '../types/option';
import { type Result, Ok, Err } from '../types/result';
import { type WeightFunction, defaultWeightFunction } from '../types/weight-function';
import { validateNonNegativeWeight } from '../utils/validators';

import { MinHeap } from './priority-queue';

/**
 * Dijkstra's shortest path algorithm.
 *
 * Finds the shortest path between two nodes in a weighted graph.
 * Uses a min-heap priority queue for efficient selection of next node to process.
 *
 * Time Complexity: O((V + E) log V) where V = vertices, E = edges
 * Space Complexity: O(V) for distances, predecessors, and priority queue
 *
 * **Important**: Does not work with negative edge weights. Use Bellman-Ford for graphs
 * with negative weights.
 *
 * @param graph - The graph to search
 * @param startId - ID of the start node
 * @param endId - ID of the end node
 * @param weightFn - Optional function to extract weight from edges/nodes. Defaults to edge.weight ?? 1
 * @returns Result containing Option<Path> or error
 *   - Ok(Some(path)) if path exists
 *   - Ok(None) if no path exists (disconnected)
 *   - Err(NegativeWeightError) if negative weights detected
 *   - Err(InvalidInputError) if start/end nodes not found
 *
 * @example
 * ```typescript
 * const graph = new Graph<MyNode, MyEdge>(true);
 * graph.addNode({ id: 'A', type: 'test', elevation: 100 });
 * graph.addNode({ id: 'B', type: 'test', elevation: 200 });
 * graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'edge', weight: 5 });
 *
 * // Use default edge weights
 * const result1 = dijkstra(graph, 'A', 'B');
 *
 * // Use custom edge attribute
 * const result2 = dijkstra(graph, 'A', 'B', (edge) => edge.customCost);
 *
 * // Use node elevation difference
 * const result3 = dijkstra(graph, 'A', 'B', (edge, source, target) =>
 *   Math.abs(source.elevation - target.elevation)
 * );
 * ```
 */
export function dijkstra<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  startId: string,
  endId: string,
  weightFn: WeightFunction<N, E> = defaultWeightFunction
): Result<Option<Path<N, E>>, GraphError> {
  // Validate inputs
  if (!graph) {
    return Err({
      type: 'invalid-input',
      message: 'Graph cannot be null or undefined',
    });
  }

  // Check if start node exists
  const startNode = graph.getNode(startId);
  if (!startNode.some) {
    return Err({
      type: 'invalid-input',
      message: `Start node '${startId}' not found in graph`,
    });
  }

  // Check if end node exists
  const endNode = graph.getNode(endId);
  if (!endNode.some) {
    return Err({
      type: 'invalid-input',
      message: `End node '${endId}' not found in graph`,
    });
  }

  // Validate all edge weights are non-negative
  const allEdges = graph.getAllEdges();
  for (const edge of allEdges) {
    const validation = validateNonNegativeWeight(edge);
    if (!validation.ok) {
      return Err(validation.error);
    }
  }

  // Trivial case: start == end
  if (startId === endId) {
    return Ok(
      Some({
        nodes: [startNode.value],
        edges: [],
        totalWeight: 0,
      })
    );
  }

  // Initialize data structures
  const distances = new Map<string, number>();
  const predecessors = new Map<string, { nodeId: string; edgeId: string } | null>();
  const visited = new Set<string>();
  const pq = new MinHeap<string>();

  // Initialize all nodes with infinite distance except start
  const allNodes = graph.getAllNodes();
  for (const node of allNodes) {
    distances.set(node.id, Infinity);
    predecessors.set(node.id, null);
  }

  distances.set(startId, 0);
  pq.insert(startId, 0);

  // Main loop: process nodes in order of distance
  while (!pq.isEmpty()) {
    const currentResult = pq.extractMin();
    if (!currentResult.some) {
      break;
    }

    const currentId = currentResult.value;

    // Skip if already visited (can happen due to decreaseKey)
    if (visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);

    // If we reached the end node, we can stop
    if (currentId === endId) {
      break;
    }

    const currentDistance = distances.get(currentId)!;

    // Get all outgoing edges
    const edgesResult = graph.getOutgoingEdges(currentId);
    if (!edgesResult.ok) {
      continue;
    }

    // Relax all edges
    for (const edge of edgesResult.value) {
      const neighborId = edge.target;

      // Get source and target nodes for weight function
      const sourceNodeResult = graph.getNode(currentId);
      const targetNodeResult = graph.getNode(neighborId);

      if (!sourceNodeResult.some || !targetNodeResult.some) {
        continue;
      }

      const edgeWeight = weightFn(edge, sourceNodeResult.value, targetNodeResult.value);

      const tentativeDistance = currentDistance + edgeWeight;
      const currentNeighborDistance = distances.get(neighborId)!;

      if (tentativeDistance < currentNeighborDistance) {
        distances.set(neighborId, tentativeDistance);
        predecessors.set(neighborId, { nodeId: currentId, edgeId: edge.id });

        if (!visited.has(neighborId)) {
          pq.insert(neighborId, tentativeDistance);
        }
      }
    }
  }

  // Check if path exists
  if (distances.get(endId) === Infinity) {
    return Ok(None()); // No path exists
  }

  // Reconstruct path
  const path = reconstructPath(graph, startId, endId, predecessors, weightFn);

  return Ok(Some(path));
}

/**
 * Reconstruct the path from start to end using predecessors.
 * @internal
 */
function reconstructPath<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  startId: string,
  endId: string,
  predecessors: Map<string, { nodeId: string; edgeId: string } | null>,
  weightFn: WeightFunction<N, E>
): Path<N, E> {
  const pathNodes: N[] = [];
  const pathEdges: E[] = [];
  let totalWeight = 0;

  // Walk backwards from end to start
  let currentId = endId;

  while (currentId !== startId) {
    const nodeResult = graph.getNode(currentId);
    if (nodeResult.some) {
      pathNodes.unshift(nodeResult.value);
    }

    const pred = predecessors.get(currentId);
    if (!pred) {
      break; // Should never happen if path exists
    }

    const edgeResult = graph.getEdge(pred.edgeId);
    if (edgeResult.some) {
      const edge = edgeResult.value;
      pathEdges.unshift(edge);

      // Calculate weight using the weight function
      const sourceNodeResult = graph.getNode(pred.nodeId);
      const targetNodeResult = graph.getNode(currentId);

      if (sourceNodeResult.some && targetNodeResult.some) {
        totalWeight += weightFn(edge, sourceNodeResult.value, targetNodeResult.value);
      }
    }

    currentId = pred.nodeId;
  }

  // Add start node
  const startNodeResult = graph.getNode(startId);
  if (startNodeResult.some) {
    pathNodes.unshift(startNodeResult.value);
  }

  return {
    nodes: pathNodes,
    edges: pathEdges,
    totalWeight,
  };
}
