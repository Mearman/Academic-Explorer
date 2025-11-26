/**
 * K-Core Decomposition using Batagelj-Zaversnik algorithm.
 *
 * K-core: maximal subgraph where all nodes have degree ≥ k within the subgraph.
 * Algorithm removes nodes in degree-sorted order, updating degrees incrementally.
 *
 * Time Complexity: O(n + m) where n = nodes, m = edges
 * Space Complexity: O(n + m)
 *
 * References:
 * - Batagelj, V., & Zaversnik, M. (2003). "An O(m) Algorithm for Cores Decomposition of Networks"
 *   arXiv:cs/0310049
 *
 * @module decomposition/k-core
 */

import type { Graph } from '../graph/graph';
import type { Core, KCoreResult, DecompositionError } from '../types/clustering-types';
import type { Node, Edge } from '../types/graph';
import { type Result, Ok, Err } from '../types/result';

/**
 * K-Core Decomposition using Batagelj-Zaversnik algorithm.
 *
 * Computes the core number for each node and extracts all k-cores from k=1 to degeneracy.
 * Core number = highest k such that node belongs to k-core.
 *
 * Algorithm:
 * 1. Compute initial degrees for all nodes
 * 2. Sort nodes by degree (using bin sort for O(n) complexity)
 * 3. Process nodes in degree order, removing each and updating neighbors
 * 4. Track core number when node is removed (= current degree at removal time)
 * 5. Construct nested k-core hierarchy from core numbers
 *
 * @param graph - Input graph (directed or undirected)
 * @returns Result containing cores map, degeneracy, and core numbers
 *
 * @example
 * ```typescript
 * const result = kCoreDecomposition(graph);
 * if (result.ok) {
 *   const { cores, degeneracy, coreNumbers } = result.value;
 *   console.log(`Graph degeneracy: ${degeneracy}`);
 *   const core3 = cores.get(3);
 *   if (core3) {
 *     console.log(`3-core has ${core3.size} nodes`);
 *   }
 * }
 * ```
 */
export function kCoreDecomposition<N extends Node, E extends Edge>(
  graph: Graph<N, E>
): KCoreResult<string> {
  const startTime = performance.now();

  // Validation: Empty graph
  if (graph.getNodeCount() === 0) {
    return Err({
      type: 'EmptyGraph',
      message: 'Cannot perform k-core decomposition on empty graph',
    });
  }

  // Step 1: Initialize data structures
  const nodes = graph.getAllNodes();
  const nodeIds = nodes.map((node) => node.id);
  const degrees = new Map<string, number>(); // Current degree of each node
  const coreNumbers = new Map<string, number>(); // Core number of each node
  const position = new Map<string, number>(); // Position in sorted array
  const removed = new Set<string>(); // Nodes that have been removed

  // Step 2: Compute initial degrees (treat directed graphs as undirected)
  // For directed graphs, degree = in-degree + out-degree
  const inDegrees = new Map<string, Set<string>>(); // Nodes that point to this node
  const outDegrees = new Map<string, Set<string>>(); // Nodes this node points to

  // Initialize degree maps
  nodeIds.forEach((nodeId) => {
    inDegrees.set(nodeId, new Set());
    outDegrees.set(nodeId, new Set());
  });

  // Compute in-degree and out-degree for each node
  const allEdges = graph.getAllEdges();
  allEdges.forEach((edge) => {
    const { source, target } = edge;
    outDegrees.get(source)?.add(target);
    inDegrees.get(target)?.add(source);
  });

  // Compute undirected degree (union of in-neighbors and out-neighbors)
  let maxDegree = 0;
  nodeIds.forEach((nodeId) => {
    const inNeighbors = inDegrees.get(nodeId) || new Set();
    const outNeighbors = outDegrees.get(nodeId) || new Set();

    // Combine both directions (treat as undirected)
    const allNeighbors = new Set([...inNeighbors, ...outNeighbors]);
    const degree = allNeighbors.size;

    degrees.set(nodeId, degree);
    maxDegree = Math.max(maxDegree, degree);
  });

  // Step 3: Bin sort nodes by degree (O(n) sorting)
  // bins[d] = array of node indices with degree d
  const bins: number[][] = Array.from({ length: maxDegree + 1 }, () => []);

  // Map node IDs to array indices for efficient lookup
  const nodeIndex = new Map<string, number>();
  // Map node index -> position within its current bin for O(1) removal (instead of indexOf)
  const binPosition = new Map<number, number>();

  nodeIds.forEach((nodeId, idx) => {
    nodeIndex.set(nodeId, idx);
    const degree = degrees.get(nodeId) || 0;
    const posInBin = bins[degree].length;
    bins[degree].push(idx);
    binPosition.set(idx, posInBin);
  });

  // Step 4: Process nodes in degree order (Batagelj-Zaversnik algorithm)
  let degeneracy = 0;
  let processedCount = 0;

  for (let i = 0; i < nodeIds.length; i++) {
    // Find the minimum non-empty bin
    // Note: We must search from 0 each time because when we decrement neighbor degrees,
    // we may move nodes to bins lower than the current minBin
    let currentBin = -1;
    for (let b = 0; b < bins.length; b++) {
      if (bins[b].length > 0) {
        currentBin = b;
        break;
      }
    }

    // All nodes processed
    if (currentBin === -1) {
      break;
    }

    // Get node with minimum degree from current bin
    const nodeIdx = bins[currentBin].pop()!;
    const nodeId = nodeIds[nodeIdx];
    const currentDegree = degrees.get(nodeId) || 0;
    processedCount++;

    // Verify that degree map and bin position are in sync
    if (currentDegree !== currentBin) {
      console.warn(`Mismatch: node ${nodeId} in bin ${currentBin} has degree ${currentDegree}`);
    }

    // Assign core number to this node
    // Core number must be at least as high as previously removed nodes
    // This ensures nodes in the same k-core get the same core number
    const coreNumber = Math.max(currentDegree, degeneracy);
    coreNumbers.set(nodeId, coreNumber);
    degeneracy = coreNumber;

    // Mark as removed
    removed.add(nodeId);

    // Update degrees of remaining neighbors (both in-neighbors and out-neighbors)
    const inNeighbors = inDegrees.get(nodeId) || new Set();
    const outNeighbors = outDegrees.get(nodeId) || new Set();
    const allNeighbors = new Set([...inNeighbors, ...outNeighbors]);

    allNeighbors.forEach((neighborId) => {
      // Skip if neighbor already removed
      if (removed.has(neighborId)) return;

      const neighborDegree = degrees.get(neighborId) || 0;

      if (neighborDegree > 0) {
        // Decrement neighbor's degree
        const newDegree = neighborDegree - 1;
        degrees.set(neighborId, newDegree);

        // Move neighbor to lower bin using O(1) position lookup
        const neighborIdx = nodeIndex.get(neighborId)!;
        const neighborPos = binPosition.get(neighborIdx);

        if (neighborPos !== undefined) {
          const oldBin = bins[neighborDegree];

          // Remove from old bin using swap-and-pop for O(1) removal
          const lastIdx = oldBin[oldBin.length - 1];
          oldBin[neighborPos] = lastIdx;
          oldBin.pop();

          // Update position of swapped node (if different)
          if (lastIdx !== neighborIdx) {
            binPosition.set(lastIdx, neighborPos);
          }

          // Add to new bin and update position
          const newPos = bins[newDegree].length;
          bins[newDegree].push(neighborIdx);
          binPosition.set(neighborIdx, newPos);
        }
      }
    });
  }

  // Step 5: Construct k-cores from core numbers
  const cores = new Map<number, Core<string>>();

  // For each k from 0 to degeneracy, create k-core
  for (let k = 0; k <= degeneracy; k++) {
    const coreNodes = new Set<string>();

    // Nodes with core number >= k belong to k-core
    coreNumbers.forEach((coreNumber, nodeId) => {
      if (coreNumber >= k) {
        coreNodes.add(nodeId);
      }
    });

    const core: Core<string> = {
      k,
      nodes: coreNodes,
      size: coreNodes.size,
      degeneracy,
      coreNumbers,
    };

    cores.set(k, core);
  }

  const endTime = performance.now();

  return Ok({
    cores,
    degeneracy,
    coreNumbers,
    metadata: {
      algorithm: 'k-core',
      runtime: endTime - startTime,
    },
  });
}
