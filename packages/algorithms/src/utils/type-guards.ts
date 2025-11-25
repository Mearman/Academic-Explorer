import { type Node, type Edge } from '../types/graph';
import { type Result } from '../types/result';
import { type Option } from '../types/option';
import { type GraphError } from '../types/errors';

/**
 * Type guard to check if a value is a Node.
 *
 * @param value - Value to check
 * @returns true if value is a Node
 */
export function isNode(value: unknown): value is Node {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as Node).id === 'string' &&
    'type' in value &&
    typeof (value as Node).type === 'string'
  );
}

/**
 * Type guard to check if a value is an Edge.
 *
 * @param value - Value to check
 * @returns true if value is an Edge
 */
export function isEdge(value: unknown): value is Edge {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as Edge).id === 'string' &&
    'source' in value &&
    typeof (value as Edge).source === 'string' &&
    'target' in value &&
    typeof (value as Edge).target === 'string' &&
    'type' in value &&
    typeof (value as Edge).type === 'string'
  );
}

/**
 * Type guard to check if a Result is Ok.
 *
 * @param result - Result to check
 * @returns true if Result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok === true;
}

/**
 * Type guard to check if a Result is Err.
 *
 * @param result - Result to check
 * @returns true if Result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return result.ok === false;
}

/**
 * Type guard to check if an Option is Some.
 *
 * @param option - Option to check
 * @returns true if Option is Some
 */
export function isSome<T>(option: Option<T>): option is { some: true; value: T } {
  return option.some === true;
}

/**
 * Type guard to check if an Option is None.
 *
 * @param option - Option to check
 * @returns true if Option is None
 */
export function isNone<T>(option: Option<T>): option is { some: false } {
  return option.some === false;
}

/**
 * Type guard to check if an error is a specific GraphError variant.
 *
 * @param error - Error to check
 * @param type - Error type to match
 * @returns true if error matches the specified type
 *
 * @example
 * ```typescript
 * if (isGraphErrorType(error, 'duplicate-node')) {
 *   console.log('Duplicate node:', error.nodeId);
 * }
 * ```
 */
export function isGraphErrorType<T extends GraphError['type']>(
  error: GraphError,
  type: T
): error is Extract<GraphError, { type: T }> {
  return error.type === type;
}
