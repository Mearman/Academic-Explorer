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
import type { Node, Edge } from '../types/graph';
import { type Result, Ok, Err } from '../types/result';
import type { Core, KCoreResult, DecompositionError } from '../types/clustering-types';

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

  // Step 2: Compute initial degrees
  let maxDegree = 0;
  nodeIds.forEach((nodeId) => {
    const neighborsResult = graph.getNeighbors(nodeId);
    if (!neighborsResult.ok) {
      degrees.set(nodeId, 0);
      return;
    }

    const degree = neighborsResult.value.length;
    degrees.set(nodeId, degree);
    maxDegree = Math.max(maxDegree, degree);
  });

  // Step 3: Bin sort nodes by degree (O(n) sorting)
  // bins[d] = array of nodes with degree d
  const bins: string[][] = Array.from({ length: maxDegree + 1 }, () => []);
  nodeIds.forEach((nodeId) => {
    const degree = degrees.get(nodeId) || 0;
    bins[degree].push(nodeId);
  });

  // Create sorted array of nodes by degree
  const sortedNodes: string[] = [];
  bins.forEach((bin) => {
    bin.forEach((nodeId) => {
      position.set(nodeId, sortedNodes.length);
      sortedNodes.push(nodeId);
    });
  });

  // Step 4: Process nodes in degree order (Batagelj-Zaversnik algorithm)
  let degeneracy = 0;

  sortedNodes.forEach((nodeId) => {
    const currentDegree = degrees.get(nodeId) || 0;

    // Assign core number to this node (= degree at removal time)
    coreNumbers.set(nodeId, currentDegree);
    degeneracy = Math.max(degeneracy, currentDegree);

    // Mark as removed
    removed.add(nodeId);

    // Update degrees of remaining neighbors
    const neighborsResult = graph.getNeighbors(nodeId);
    if (!neighborsResult.ok) return;

    neighborsResult.value.forEach((neighborId) => {
      // Skip if neighbor already removed
      if (removed.has(neighborId)) return;

      const neighborDegree = degrees.get(neighborId) || 0;

      // Decrement neighbor's degree
      if (neighborDegree > 0) {
        degrees.set(neighborId, neighborDegree - 1);
      }
    });
  });

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
