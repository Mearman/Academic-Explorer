/**
 * @academic-explorer/algorithms
 *
 * Generic graph traversal and analysis algorithms for Academic Explorer.
 * Zero runtime dependencies - pure TypeScript implementation.
 *
 * @packageDocumentation
 */

// Core types
export { type Result, Ok, Err } from './types/result';
export { type Option, Some, None } from './types/option';
export { type Node, type Edge } from './types/graph';
export {
  type GraphError,
  type InvalidInputError,
  type InvalidWeightError,
  type NegativeWeightError,
  type CycleDetectedError,
  type DuplicateNodeError,
} from './types/errors';
export {
  type TraversalResult,
  type Path,
  type Component,
  type CycleInfo,
} from './types/algorithm-results';
export { type WeightFunction, defaultWeightFunction } from './types/weight-function';
export { type Community, type ClusterMetrics, type Dendrogram, type Partition, type LeidenCommunity, type Core, type CorePeripheryStructure, type CorePeripheryResult, type BiconnectedComponent } from './types/clustering-types';

// Graph data structure
export { Graph } from './graph/graph';

// Utilities
export * from './utils/validators';
export * from './utils/type-guards';

// Traversal algorithms
export { dfs } from './traversal/dfs';
export { bfs } from './traversal/bfs';

// Pathfinding algorithms
export { dijkstra } from './pathfinding/dijkstra';

// Analysis algorithms
export { topologicalSort } from './analysis/topological-sort';
export { detectCycle } from './analysis/cycle-detection';
export { connectedComponents } from './analysis/connected-components';
export { stronglyConnectedComponents } from './analysis/scc';

// Clustering algorithms
export { detectCommunities } from './clustering/louvain';
export { labelPropagation } from './clustering/label-propagation';
export { leiden } from './clustering/leiden';
export { infomap } from './clustering/infomap';

// Clustering metrics
export {
  calculateModularity,
  calculateCommunityModularity,
  calculateModularityDelta,
} from './metrics/modularity';
export {
  calculateConductance,
  calculateAverageConductance,
  calculateWeightedAverageConductance,
} from './metrics/conductance';
export {
  calculateDensity,
  calculateAverageDensity,
  calculateCoverageRatio,
  calculateClusterMetrics,
  updateCommunityDensities,
} from './metrics/cluster-quality';

// Partitioning algorithms
export { spectralPartition } from './partitioning/spectral';
// Decomposition algorithms
export { corePeripheryDecomposition } from './decomposition/core-periphery';
export { kCoreDecomposition } from './decomposition/k-core';
export { biconnectedComponents } from './decomposition/biconnected';

// Hierarchical clustering algorithms
export { hierarchicalClustering } from './hierarchical/clustering';
