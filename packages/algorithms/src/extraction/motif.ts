/**
 * Academic motif detection algorithms for identifying citation patterns.
 *
 * Detects common graph motifs in academic networks:
 * - Triangles (3-cliques) indicating tight collaboration or citation clusters
 * - Star patterns identifying hub papers or prolific authors
 * - Co-citation pairs showing papers cited together frequently
 * - Bibliographic coupling showing papers citing same references
 */

import { type Graph } from '../graph/graph';
import { type InvalidInputError } from '../types/errors';
import { type Edge,type Node } from '../types/graph';
import { Ok,type Result } from '../types/result';

/**
 * Triangle motif (3-clique) in undirected graph.
 * Represents three mutually connected nodes.
 */
export interface Triangle<N extends Node> {
  /** Three nodes forming the triangle */
  nodes: [N, N, N];
}

/**
 * Star pattern motif.
 * Hub node with multiple leaf connections.
 */
export interface StarPattern<N extends Node> {
  /** Central hub node */
  hub: N;
  /** Leaf nodes connected to hub */
  leaves: N[];
  /** Star type (in-star or out-star) */
  type: 'in' | 'out';
}

/**
 * Co-citation pair (papers cited together).
 * Two papers frequently cited by the same citing papers.
 */
export interface CoCitationPair<N extends Node> {
  /** First co-cited paper */
  paper1: N;
  /** Second co-cited paper */
  paper2: N;
  /** Number of papers citing both */
  count: number;
}

/**
 * Bibliographic coupling pair (papers citing same references).
 * Two papers sharing references in their bibliographies.
 */
export interface BibliographicCouplingPair<N extends Node> {
  /** First coupled paper */
  paper1: N;
  /** Second coupled paper */
  paper2: N;
  /** Number of shared references */
  sharedReferences: number;
}

/**
 * Options for star pattern detection.
 */
export interface StarPatternOptions {
  /** Minimum degree to qualify as star hub */
  minDegree: number;
  /** Star type to detect */
  type: 'in' | 'out';
}

/**
 * Options for co-citation detection.
 */
export interface CoCitationOptions {
  /** Minimum co-citation count */
  minCount: number;
}

/**
 * Options for bibliographic coupling detection.
 */
export interface BibliographicCouplingOptions {
  /** Minimum shared references */
  minShared: number;
}

/**
 * Detect all triangles (3-cliques) in an undirected graph.
 *
 * Algorithm: For each edge (u,v), find common neighbors of u and v.
 * Each common neighbor w forms a triangle (u,v,w).
 *
 * Time complexity: O(E * d^2) where E = edges, d = max degree
 * Space complexity: O(T) where T = number of triangles
 * @param graph - Undirected graph to analyze
 * @returns Array of triangles found
 * @example
 * ```typescript
 * const graph = createTriangleGraph();
 * const result = detectTriangles(graph);
 * if (result.ok) {
 *   console.log(`Found ${result.value.length} triangles`);
 * }
 * ```
 */
export const detectTriangles = <N extends Node, E extends Edge>(graph: Graph<N, E>): Result<Triangle<N>[], InvalidInputError> => {
  const triangles: Triangle<N>[] = [];
  const edges = graph.getAllEdges();
  const processedTriangles = new Set<string>();

  // For each edge, find common neighbors
  for (const edge of edges) {
    const { source, target } = edge;

    // Skip self-loops
    if (source === target) {
      continue;
    }

    // Get neighbors of both endpoints
    const sourceNeighborsResult = graph.getNeighbors(source);
    const targetNeighborsResult = graph.getNeighbors(target);

    if (!sourceNeighborsResult.ok || !targetNeighborsResult.ok) {
      continue;
    }

    const sourceNeighbors = new Set(sourceNeighborsResult.value);
    const targetNeighbors = new Set(targetNeighborsResult.value);

    // Find common neighbors
    for (const neighbor of sourceNeighbors) {
      // Skip self-loops
      if (neighbor === source || neighbor === target) {
        continue;
      }

      if (targetNeighbors.has(neighbor)) {
        // Found triangle: source-target-neighbor
        // Create sorted key to avoid duplicates
        const triangleKey = [source, target, neighbor].sort().join(',');

        if (!processedTriangles.has(triangleKey)) {
          processedTriangles.add(triangleKey);

          const sourceNode = graph.getNode(source);
          const targetNode = graph.getNode(target);
          const neighborNode = graph.getNode(neighbor);

          if (sourceNode.some && targetNode.some && neighborNode.some) {
            triangles.push({
              nodes: [sourceNode.value, targetNode.value, neighborNode.value],
            });
          }
        }
      }
    }
  }

  return Ok(triangles);
};

/**
 * Detect star patterns (hub nodes with high degree).
 *
 * For directed graphs:
 * - in-star: hub has high in-degree (many nodes point to it)
 * - out-star: hub has high out-degree (hub points to many nodes)
 *
 * For undirected graphs: only out-star makes sense (total degree)
 *
 * Time complexity: O(N + E) where N = nodes, E = edges
 * Space complexity: O(S) where S = number of stars
 * @param graph - Graph to analyze
 * @param options - Detection options
 * @returns Array of star patterns found
 * @example
 * ```typescript
 * const result = detectStarPatterns(graph, { minDegree: 10, type: 'out' });
 * if (result.ok) {
 *   result.value.forEach(star => {
 *     console.log(`Hub ${star.hub.id} has ${star.leaves.length} connections`);
 *   });
 * }
 * ```
 */
export const detectStarPatterns = <N extends Node, E extends Edge>(graph: Graph<N, E>, options: StarPatternOptions): Result<StarPattern<N>[], InvalidInputError> => {
  const stars: StarPattern<N>[] = [];
  const nodes = graph.getAllNodes();
  const { minDegree, type } = options;

  for (const node of nodes) {
    const nodeId = node.id;
    let leaves: N[] = [];

    if (type === 'out') {
      // Out-star: node points to many others (or has many undirected neighbors)
      const neighborsResult = graph.getNeighbors(nodeId);
      if (!neighborsResult.ok) {
        continue;
      }

      const neighbors = neighborsResult.value.filter(n => n !== nodeId); // Exclude self-loops

      if (neighbors.length >= minDegree) {
        leaves = neighbors
          .map(id => graph.getNode(id))
          .filter(opt => opt.some)
          .map(opt => opt.value);

        stars.push({
          hub: node,
          leaves,
          type: 'out',
        });
      }
    } else {
      // In-star: many nodes point to this node (directed graphs only)
      if (!graph.isDirected()) {
        continue;
      }

      const edges = graph.getAllEdges();
      const incomingNodes: N[] = [];

      for (const edge of edges) {
        if (edge.target === nodeId && edge.source !== nodeId) {
          const sourceNode = graph.getNode(edge.source);
          if (sourceNode.some) {
            incomingNodes.push(sourceNode.value);
          }
        }
      }

      if (incomingNodes.length >= minDegree) {
        stars.push({
          hub: node,
          leaves: incomingNodes,
          type: 'in',
        });
      }
    }
  }

  return Ok(stars);
};

/**
 * Detect co-citation pairs in directed citation graph.
 *
 * Two papers are co-cited when multiple papers cite both of them.
 * Identifies papers with similar research impact.
 *
 * Algorithm:
 * 1. For each citing paper, find all its references
 * 2. Count pairs of references cited together
 * 3. Return pairs meeting minimum threshold
 *
 * Time complexity: O(N * R^2) where N = papers, R = avg references per paper
 * Space complexity: O(P^2) where P = unique papers
 * @param graph - Directed citation graph
 * @param options - Detection options
 * @returns Array of co-citation pairs
 * @example
 * ```typescript
 * const result = detectCoCitations(graph, { minCount: 5 });
 * if (result.ok) {
 *   result.value.forEach(pair => {
 *     console.log(`${pair.paper1.id} and ${pair.paper2.id} co-cited ${pair.count} times`);
 *   });
 * }
 * ```
 */
export const detectCoCitations = <N extends Node, E extends Edge>(graph: Graph<N, E>, options: CoCitationOptions): Result<CoCitationPair<N>[], InvalidInputError> => {
  const { minCount } = options;
  const coCitationMap = new Map<string, number>(); // "paper1,paper2" -> count
  const nodes = graph.getAllNodes();

  // For each citing paper, find pairs of references cited together
  for (const citingPaper of nodes) {
    const outgoingEdgesResult = graph.getOutgoingEdges(citingPaper.id);
    if (!outgoingEdgesResult.ok) {
      continue;
    }

    const references = outgoingEdgesResult.value
      .map(e => e.target)
      .filter(target => target !== citingPaper.id); // Exclude self-citations

    // Find all pairs of references
    for (let i = 0; i < references.length; i++) {
      for (let j = i + 1; j < references.length; j++) {
        const ref1 = references[i];
        const ref2 = references[j];

        // Create sorted key to avoid duplicates
        const key = ref1 < ref2 ? `${ref1},${ref2}` : `${ref2},${ref1}`;

        coCitationMap.set(key, (coCitationMap.get(key) || 0) + 1);
      }
    }
  }

  // Convert map to array and filter by threshold
  const pairs: CoCitationPair<N>[] = [];

  for (const [key, count] of coCitationMap.entries()) {
    if (count >= minCount) {
      const [id1, id2] = key.split(',');
      const node1 = graph.getNode(id1);
      const node2 = graph.getNode(id2);

      if (node1.some && node2.some) {
        pairs.push({
          paper1: node1.value,
          paper2: node2.value,
          count,
        });
      }
    }
  }

  return Ok(pairs);
};

/**
 * Detect bibliographic coupling pairs in directed citation graph.
 *
 * Two papers are bibliographically coupled when they cite the same references.
 * Identifies papers with similar research topics.
 *
 * Algorithm:
 * 1. Build reference sets for each paper
 * 2. Compare reference sets pairwise
 * 3. Return pairs with sufficient overlap
 *
 * Time complexity: O(N^2 * R) where N = papers, R = avg references
 * Space complexity: O(N * R) for reference sets
 * @param graph - Directed citation graph
 * @param options - Detection options
 * @returns Array of bibliographic coupling pairs
 * @example
 * ```typescript
 * const result = detectBibliographicCoupling(graph, { minShared: 3 });
 * if (result.ok) {
 *   result.value.forEach(pair => {
 *     console.log(`${pair.paper1.id} and ${pair.paper2.id} share ${pair.sharedReferences} refs`);
 *   });
 * }
 * ```
 */
export const detectBibliographicCoupling = <N extends Node, E extends Edge>(graph: Graph<N, E>, options: BibliographicCouplingOptions): Result<BibliographicCouplingPair<N>[], InvalidInputError> => {
  const { minShared } = options;
  const nodes = graph.getAllNodes();

  // Build reference sets for each paper
  const referenceSets = new Map<string, Set<string>>();

  for (const paper of nodes) {
    const outgoingEdgesResult = graph.getOutgoingEdges(paper.id);
    if (!outgoingEdgesResult.ok) {
      continue;
    }

    const references = new Set(
      outgoingEdgesResult.value
        .map(e => e.target)
        .filter(target => target !== paper.id) // Exclude self-citations
    );

    referenceSets.set(paper.id, references);
  }

  // Compare papers pairwise
  const pairs: BibliographicCouplingPair<N>[] = [];
  const nodeIds = Array.from(referenceSets.keys());

  for (let i = 0; i < nodeIds.length; i++) {
    for (let j = i + 1; j < nodeIds.length; j++) {
      const id1 = nodeIds[i];
      const id2 = nodeIds[j];

      const refs1 = referenceSets.get(id1);
      const refs2 = referenceSets.get(id2);

      if (!refs1 || !refs2) {
        continue;
      }

      // Count shared references
      let sharedCount = 0;
      for (const ref of refs1) {
        if (refs2.has(ref)) {
          sharedCount++;
        }
      }

      if (sharedCount >= minShared) {
        const node1 = graph.getNode(id1);
        const node2 = graph.getNode(id2);

        if (node1.some && node2.some) {
          pairs.push({
            paper1: node1.value,
            paper2: node2.value,
            sharedReferences: sharedCount,
          });
        }
      }
    }
  }

  return Ok(pairs);
};
