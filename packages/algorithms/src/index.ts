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
