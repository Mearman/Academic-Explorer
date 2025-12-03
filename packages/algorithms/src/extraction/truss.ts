/**
 * K-Truss extraction algorithm for dense collaboration cluster detection.
 *
 * K-truss: maximal subgraph where every edge participates in at least (k-2) triangles.
 * Provides stronger cohesion guarantees than k-core decomposition.
 *
 * Algorithm:
 * 1. Compute triangle support for all edges (count triangles per edge)
 * 2. Iteratively remove edges with support < (k-2)
 * 3. Update triangle support for affected edges after each removal
 * 4. Repeat until no more edges can be removed
 *
 * Time Complexity: O(m^1.5) in worst case, where m = edges
 * Space Complexity: O(n + m) where n = nodes, m = edges
 *
 * References:
 * - Cohen, J. (2008). "Trusses: Cohesive subgraphs for social network analysis"
 * - Wang, J., & Cheng, J. (2012). "Truss decomposition in massive networks"
 * @module extraction/truss
 */

import { Graph } from '../graph/graph';
import type { ExtractionError } from '../types/errors';
import type { Edge,Node } from '../types/graph';
import type { Result } from '../types/result';
import { Ok } from '../types/result';
import { type KTrussOptions,validateKTrussOptions } from './validators';


/**
 * Computes triangle support for all edges in the graph.
 *
 * Triangle support = number of triangles an edge participates in.
 * For undirected graph: edge (u,v) is in triangle with node w if edges (u,w) and (v,w) exist.
 * For directed graph: treat all edges as undirected for triangle counting.
 *
 * Algorithm:
 * 1. For each edge (u,v), find common neighbors of u and v
 * 2. Each common neighbor w forms a triangle (u,v,w)
 * 3. Count triangles = |neighbors(u) ∩ neighbors(v)|
 * @param graph - Input graph (directed or undirected)
 * @returns Result containing map of edge ID to triangle count
 * @example
 * ```typescript
 * const result = computeTriangleSupport(graph);
 * if (result.ok) {
 *   const support = result.value;
 *   console.log(`Edge e1 participates in ${support.get('e1')} triangles`);
 * }
 * ```
 */
export const computeTriangleSupport = <N extends Node, E extends Edge>(graph: Graph<N, E>): Result<Map<string, number>, ExtractionError> => {
  const support = new Map<string, number>();

  // Build adjacency map for efficient neighbor lookup
  // Treat directed graphs as undirected for triangle counting
  const adjacency = new Map<string, Set<string>>();
  const allNodes = graph.getAllNodes();

  // Initialize adjacency sets
  allNodes.forEach((node) => {
    adjacency.set(node.id, new Set<string>());
  });

  // Populate adjacency sets (bidirectional for directed graphs)
  const allEdges = graph.getAllEdges();
  allEdges.forEach((edge) => {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });

  // For each edge, count triangles
  allEdges.forEach((edge) => {
    const { source, target } = edge;
    const sourceNeighbors = adjacency.get(source) || new Set<string>();
    const targetNeighbors = adjacency.get(target) || new Set<string>();

    // Count common neighbors (each forms a triangle)
    let triangleCount = 0;
    sourceNeighbors.forEach((neighbor) => {
      if (targetNeighbors.has(neighbor)) {
        triangleCount++;
      }
    });

    support.set(edge.id, triangleCount);
  });

  return Ok(support);
};

/**
 * Extracts k-truss subgraph from the input graph.
 *
 * K-truss: maximal subgraph where every edge participates in at least (k-2) triangles.
 * - 2-truss = entire graph (k-2=0, all edges included)
 * - 3-truss = edges in at least 1 triangle
 * - 4-truss = edges in at least 2 triangles
 *
 * Algorithm (iterative edge removal):
 * 1. Compute initial triangle support for all edges
 * 2. Create a working copy of the graph
 * 3. While edges with support < (k-2) exist:
 *    a. Remove edge with insufficient support
 *    b. Update triangle support for affected edges
 *    c. Mark affected edges for recheck
 * 4. Return remaining subgraph
 * @param graph - Input graph (directed or undirected)
 * @param options - K-truss options (k value, hierarchy flag)
 * @returns Result containing k-truss subgraph or error
 * @example
 * ```typescript
 * // Extract 3-truss (edges in at least 1 triangle)
 * const result = extractKTruss(graph, { k: 3 });
 * if (result.ok) {
 *   const truss = result.value;
 *   console.log(`3-truss has ${truss.getNodeCount()} nodes`);
 * }
 * ```
 */
export const extractKTruss = <N extends Node, E extends Edge>(graph: Graph<N, E>, options: KTrussOptions): Result<Graph<N, E>, ExtractionError> => {
  // Validate options
  const validationResult = validateKTrussOptions(options);
  if (!validationResult.ok) {
    return validationResult as Result<Graph<N, E>, ExtractionError>;
  }

  const { k } = validationResult.value;
  const minSupport = k - 2; // Edges must be in at least (k-2) triangles

  // Handle empty graph
  if (graph.getNodeCount() === 0) {
    return Ok(new Graph<N, E>(graph.isDirected()));
  }

  // Compute initial triangle support
  const supportResult = computeTriangleSupport(graph);
  if (!supportResult.ok) {
    return supportResult as Result<Graph<N, E>, ExtractionError>;
  }

  const support = supportResult.value;

  // Create working copy of graph
  const truss = new Graph<N, E>(graph.isDirected());

  // Add all nodes
  graph.getAllNodes().forEach((node) => {
    truss.addNode(node);
  });

  // Add all edges initially
  const edgeMap = new Map<string, E>();
  graph.getAllEdges().forEach((edge) => {
    truss.addEdge(edge);
    edgeMap.set(edge.id, edge);
  });

  // Build edge-to-triangles mapping for efficient updates
  // For each edge, store the set of triangles it participates in
  const edgeTriangles = new Map<string, Set<string>>();
  const adjacency = new Map<string, Set<string>>();

  // Initialize adjacency map
  graph.getAllNodes().forEach((node) => {
    adjacency.set(node.id, new Set<string>());
  });

  graph.getAllEdges().forEach((edge) => {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
    edgeTriangles.set(edge.id, new Set<string>());
  });

  // Populate edge-to-triangles mapping
  graph.getAllEdges().forEach((edge) => {
    const { source, target, id } = edge;
    const sourceNeighbors = adjacency.get(source) || new Set<string>();
    const targetNeighbors = adjacency.get(target) || new Set<string>();

    // For each common neighbor, record the triangle
    sourceNeighbors.forEach((neighbor) => {
      if (targetNeighbors.has(neighbor)) {
        // Triangle: source-target-neighbor
        const triangleId = [source, target, neighbor].sort().join('-');
        edgeTriangles.get(id)?.add(triangleId);
      }
    });
  });

  // Iteratively remove edges with insufficient support
  let changed = true;
  while (changed) {
    changed = false;

    const edgesToRemove: string[] = [];

    // Find edges with support < minSupport
    truss.getAllEdges().forEach((edge) => {
      const currentSupport = support.get(edge.id) || 0;
      if (currentSupport < minSupport) {
        edgesToRemove.push(edge.id);
      }
    });

    if (edgesToRemove.length === 0) {
      break;
    }

    // Remove edges and update support
    edgesToRemove.forEach((edgeId) => {
      const edge = edgeMap.get(edgeId);
      if (!edge) return;

      const { source, target } = edge;

      // Remove edge from truss
      truss.removeEdge(edgeId);
      changed = true;

      // Update adjacency
      adjacency.get(source)?.delete(target);
      adjacency.get(target)?.delete(source);

      // Update support for affected edges
      // Any edge that shared a triangle with this edge needs support decremented
      const triangles = edgeTriangles.get(edgeId) || new Set<string>();

      triangles.forEach((triangleId) => {
        const nodes = triangleId.split('-');
        if (nodes.length !== 3) return;

        // Find the other two edges in this triangle
        const [n1, n2, n3] = nodes;

        // Generate edge IDs for the other two edges of the triangle
        const otherEdgePairs = [
          [n1, n2],
          [n2, n3],
          [n1, n3],
        ];

        otherEdgePairs.forEach(([a, b]) => {
          if ((a === source && b === target) || (a === target && b === source)) {
            return; // Skip the removed edge itself
          }

          // Find the actual edge ID for this pair
          truss.getAllEdges().forEach((otherEdge) => {
            const match =
              (otherEdge.source === a && otherEdge.target === b) ||
              (otherEdge.source === b && otherEdge.target === a);

            if (match) {
              // Decrement support for this edge
              const currentSupport = support.get(otherEdge.id) || 0;
              if (currentSupport > 0) {
                support.set(otherEdge.id, currentSupport - 1);
              }

              // Remove this triangle from the edge's triangle set
              edgeTriangles.get(otherEdge.id)?.delete(triangleId);
            }
          });
        });
      });

      // Clear triangles for removed edge
      edgeTriangles.delete(edgeId);
    });
  }

  // Remove isolated nodes (nodes with no remaining edges)
  const nodesToRemove: string[] = [];
  truss.getAllNodes().forEach((node) => {
    const hasEdges = truss.getAllEdges().some((edge) => edge.source === node.id || edge.target === node.id);
    if (!hasEdges) {
      nodesToRemove.push(node.id);
    }
  });

  nodesToRemove.forEach((nodeId) => {
    truss.removeNode(nodeId);
  });

  return Ok(truss);
};
