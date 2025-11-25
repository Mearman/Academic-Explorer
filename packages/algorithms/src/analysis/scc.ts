import { type Graph } from '../graph/graph';
import { type Node, type Edge } from '../types/graph';
import { type Component } from '../types/algorithm-results';
import { type Result, Ok, Err } from '../types/result';
import { type InvalidInputError } from '../types/errors';

/**
 * Find all strongly connected components using Tarjan's algorithm.
 *
 * A strongly connected component (SCC) is a maximal set of vertices where
 * every vertex is reachable from every other vertex in the set.
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V)
 *
 * @param graph - The directed graph to analyze
 * @returns Result containing array of SCCs
 */
export function stronglyConnectedComponents<N extends Node, E extends Edge = Edge>(
  graph: Graph<N, E>
): Result<Component<N>[], InvalidInputError> {
  if (!graph) {
    return Err({
      type: 'invalid-input',
      message: 'Graph cannot be null or undefined',
    });
  }

  const nodes = graph.getAllNodes();
  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const components: Component<N>[] = [];
  let currentIndex = 0;
  let componentId = 0;

  function strongConnect(nodeId: string): void {
    // Set depth index for node
    index.set(nodeId, currentIndex);
    lowlink.set(nodeId, currentIndex);
    currentIndex++;
    stack.push(nodeId);
    onStack.add(nodeId);

    // Consider successors
    const neighborsResult = graph.getNeighbors(nodeId);
    if (neighborsResult.ok) {
      for (const neighborId of neighborsResult.value) {
        if (!index.has(neighborId)) {
          // Successor not yet visited; recurse
          strongConnect(neighborId);
          lowlink.set(nodeId, Math.min(lowlink.get(nodeId)!, lowlink.get(neighborId)!));
        } else if (onStack.has(neighborId)) {
          // Successor is on stack and hence in current SCC
          lowlink.set(nodeId, Math.min(lowlink.get(nodeId)!, index.get(neighborId)!));
        }
      }
    }

    // If nodeId is a root node, pop the stack and create SCC
    if (lowlink.get(nodeId) === index.get(nodeId)) {
      const sccNodes: N[] = [];
      let w: string;

      do {
        w = stack.pop()!;
        onStack.delete(w);

        const node = graph.getNode(w);
        if (node.some) {
          sccNodes.push(node.value);
        }
      } while (w !== nodeId);

      components.push({
        id: componentId++,
        nodes: sccNodes,
        size: sccNodes.length,
      });
    }
  }

  // Run Tarjan's algorithm from all unvisited nodes
  for (const node of nodes) {
    if (!index.has(node.id)) {
      strongConnect(node.id);
    }
  }

  return Ok(components);
}
