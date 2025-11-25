/**
 * Invalid input error (null, undefined, or malformed input).
 */
export type InvalidInputError = {
  type: 'invalid-input';
  message: string;
  input?: unknown;
};

/**
 * Invalid weight error (non-numeric, NaN, or Infinity).
 */
export type InvalidWeightError = {
  type: 'invalid-weight';
  message: string;
  weight: unknown;
  edgeId: string;
};

/**
 * Negative weight error (for algorithms requiring non-negative weights).
 */
export type NegativeWeightError = {
  type: 'negative-weight';
  message: string;
  weight: number;
  edgeId: string;
};

/**
 * Cycle detected error (for DAG-only algorithms like topological sort).
 */
export type CycleDetectedError = {
  type: 'cycle-detected';
  message: string;
  cyclePath: string[];
};

/**
 * Duplicate node ID error (attempting to add node with existing ID).
 */
export type DuplicateNodeError = {
  type: 'duplicate-node';
  message: string;
  nodeId: string;
};

/**
 * Base discriminated union for all graph operation errors.
 * Pattern match using the `type` discriminator field.
 *
 * @example
 * ```typescript
 * const handleError = (error: GraphError) => {
 *   switch (error.type) {
 *     case 'invalid-input':
 *       console.error('Invalid input:', error.message);
 *       break;
 *     case 'negative-weight':
 *       console.error('Negative weight on edge:', error.edgeId);
 *       break;
 *     case 'cycle-detected':
 *       console.error('Cycle found:', error.cyclePath);
 *       break;
 *     case 'duplicate-node':
 *       console.error('Duplicate node:', error.nodeId);
 *       break;
 *     case 'invalid-weight':
 *       console.error('Invalid weight type:', typeof error.weight);
 *       break;
 *   }
 * };
 * ```
 */
export type GraphError =
  | InvalidInputError
  | InvalidWeightError
  | NegativeWeightError
  | CycleDetectedError
  | DuplicateNodeError;
