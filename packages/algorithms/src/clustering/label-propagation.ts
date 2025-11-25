/**
 * Label Propagation clustering algorithm implementation.
 * Fast clustering via asynchronous label propagation with majority voting.
 *
 * Algorithm:
 * 1. Initialize: Assign unique label to each node
 * 2. Iterate: Each node adopts most frequent label among neighbors
 * 3. Random ordering: Process nodes in random order each iteration
 * 4. Convergence: Stop when no labels change or max iterations reached
 *
 * Time Complexity: O(m) per iteration, typically 3-5 iterations → O(m)
 * Space Complexity: O(n)
 *
 * @module clustering/label-propagation
 */

import type { Graph } from '../graph/graph';
import type { Node, Edge } from '../types/graph';
import type {
  LabelCluster,
  ClusterId,
  ClusteringError,
  LabelPropagationResult,
} from '../types/clustering-types';
import type { WeightFunction } from '../types/weight-function';
import { Ok, Err } from '../types/result';

/**
 * Label Propagation clustering algorithm.
 *
 * Fast semi-supervised clustering algorithm that propagates labels through
 * the network based on neighbor voting. Nodes iteratively adopt the most
 * frequent label among their neighbors.
 *
 * @typeParam N - Node type
 * @typeParam E - Edge type
 * @param graph - Input graph (directed or undirected)
 * @param options - Optional configuration
 * @param options.weightFn - Weight function for edges (default: all edges weight 1.0)
 * @param options.maxIterations - Maximum iterations (default: 100)
 * @param options.seed - Random seed for reproducibility (default: Date.now())
 * @returns Result containing clusters or error
 *
 * @example
 * ```typescript
 * const graph = new Graph<PaperNode, CitationEdge>(true);
 * // ... add nodes and edges ...
 *
 * const result = labelPropagation(graph);
 * if (result.ok) {
 *   console.log(`Found ${result.value.clusters.length} clusters`);
 *   console.log(`Converged: ${result.value.metadata.converged}`);
 *   console.log(`Iterations: ${result.value.metadata.iterations}`);
 * }
 * ```
 */
export function labelPropagation<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  options: {
    weightFn?: WeightFunction<N, E>;
    maxIterations?: number;
    seed?: number;
  } = {}
): LabelPropagationResult<N> {
  const startTime = performance.now();

  const {
    weightFn = () => 1.0,
    maxIterations = 10, // Label propagation typically converges in 3-5 iterations
    seed = Date.now(),
  } = options;

  // Validate input
  const allNodes = graph.getAllNodes();
  if (allNodes.length === 0) {
    return Err<ClusteringError>({
      type: 'EmptyGraph',
      message: 'Cannot perform label propagation on empty graph',
    });
  }

  // Initialize: Each node gets unique label (use node index as label)
  const nodeToLabel = new Map<string, ClusterId>();
  const nodeIds: string[] = [];

  allNodes.forEach((node, index) => {
    nodeIds.push(node.id);
    nodeToLabel.set(node.id, index); // Node index as initial label
  });

  // Pre-compute adjacency lists for fast neighbor lookup (critical optimization)
  const outgoingNeighbors = new Map<string, string[]>();
  const incomingNeighbors = new Map<string, string[]>();

  allNodes.forEach((node) => {
    const outgoing: string[] = [];
    const outgoingResult = graph.getOutgoingEdges(node.id);
    if (outgoingResult.ok) {
      outgoingResult.value.forEach((edge) => {
        outgoing.push(edge.target);
        // Build incoming map simultaneously
        if (!incomingNeighbors.has(edge.target)) {
          incomingNeighbors.set(edge.target, []);
        }
        incomingNeighbors.get(edge.target)!.push(edge.source);
      });
    }
    outgoingNeighbors.set(node.id, outgoing);
  });

  // Seed random number generator for reproducibility
  let rngState = seed;
  const seededRandom = (): number => {
    // Linear congruential generator (simple PRNG)
    rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
    return rngState / 0x7fffffff;
  };

  // Fisher-Yates shuffle with seeded RNG
  const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Iterate: Asynchronous label propagation
  let iteration = 0;
  let converged = false;

  while (!converged && iteration < maxIterations) {
    iteration++;
    let changedCount = 0;

    // Process nodes in random order (asynchronous updates)
    const randomOrder = shuffleArray(nodeIds);

    for (const nodeId of randomOrder) {
      const currentLabel = nodeToLabel.get(nodeId)!;

      // Count neighbor labels (use uniform weights for performance)
      const labelCounts = new Map<ClusterId, number>();

      // Collect neighbor labels from outgoing edges (using cached adjacency list)
      const outgoing = outgoingNeighbors.get(nodeId) || [];
      for (const neighborId of outgoing) {
        const neighborLabel = nodeToLabel.get(neighborId);
        if (neighborLabel !== undefined) {
          labelCounts.set(
            neighborLabel,
            (labelCounts.get(neighborLabel) || 0) + 1.0
          );
        }
      }

      // Collect neighbor labels from incoming edges (for directed graphs)
      if (graph.isDirected()) {
        const incoming = incomingNeighbors.get(nodeId) || [];
        for (const neighborId of incoming) {
          const neighborLabel = nodeToLabel.get(neighborId);
          if (neighborLabel !== undefined) {
            labelCounts.set(
              neighborLabel,
              (labelCounts.get(neighborLabel) || 0) + 1.0
            );
          }
        }
      }

      // Find most frequent label (majority voting)
      if (labelCounts.size > 0) {
        let maxWeight = 0;
        let bestLabel = currentLabel;
        const tiedLabels: ClusterId[] = [];

        labelCounts.forEach((weight, label) => {
          if (weight > maxWeight) {
            maxWeight = weight;
            bestLabel = label;
            tiedLabels.length = 0; // Clear ties
            tiedLabels.push(label);
          } else if (weight === maxWeight) {
            tiedLabels.push(label);
          }
        });

        // Tie-breaking: Choose randomly among tied labels
        if (tiedLabels.length > 1) {
          const randomIndex = Math.floor(seededRandom() * tiedLabels.length);
          bestLabel = tiedLabels[randomIndex];
        }

        // Update label if changed
        if (bestLabel !== currentLabel) {
          nodeToLabel.set(nodeId, bestLabel);
          changedCount++;
        }
      }
    }

    // Convergence check: No labels changed
    if (changedCount === 0) {
      converged = true;
    }
  }

  // Build clusters from final label assignments
  const labelToNodes = new Map<ClusterId, Set<N>>();

  allNodes.forEach((node) => {
    const label = nodeToLabel.get(node.id)!;
    if (!labelToNodes.has(label)) {
      labelToNodes.set(label, new Set());
    }
    labelToNodes.get(label)!.add(node);
  });

  // Convert to LabelCluster array
  const clusters: LabelCluster<N>[] = [];

  labelToNodes.forEach((nodes, label) => {
    clusters.push({
      label,
      nodes,
      size: nodes.size,
      iterations: iteration,
      stable: converged,
    });
  });

  const endTime = performance.now();
  const runtime = endTime - startTime;

  return Ok({
    clusters,
    metadata: {
      algorithm: 'label-propagation',
      runtime,
      converged,
      iterations: iteration,
      parameters: {
        maxIterations,
        seed,
      },
    },
  });
}
