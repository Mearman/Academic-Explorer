import { type GraphError } from '../types/errors';
import { type Edge,type Node } from '../types/graph';
import { type Option } from '../types/option';
import { type Result } from '../types/result';

/**
 * Type guard to check if a value is a Node.
 * @param value - Value to check
 * @returns true if value is a Node
 */
export const isNode = (value: unknown): value is Node => typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as Node).id === 'string' &&
    'type' in value &&
    typeof (value as Node).type === 'string';

/**
 * Type guard to check if a value is an Edge.
 * @param value - Value to check
 * @returns true if value is an Edge
 */
export const isEdge = (value: unknown): value is Edge => typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as Edge).id === 'string' &&
    'source' in value &&
    typeof (value as Edge).source === 'string' &&
    'target' in value &&
    typeof (value as Edge).target === 'string' &&
    'type' in value &&
    typeof (value as Edge).type === 'string';

/**
 * Type guard to check if a Result is Ok.
 * @param result - Result to check
 * @returns true if Result is Ok
 */
export const isOk = <T, E>(result: Result<T, E>): result is { ok: true; value: T } => result.ok === true;

/**
 * Type guard to check if a Result is Err.
 * @param result - Result to check
 * @returns true if Result is Err
 */
export const isErr = <T, E>(result: Result<T, E>): result is { ok: false; error: E } => result.ok === false;

/**
 * Type guard to check if an Option is Some.
 * @param option - Option to check
 * @returns true if Option is Some
 */
export const isSome = <T>(option: Option<T>): option is { some: true; value: T } => option.some === true;

/**
 * Type guard to check if an Option is None.
 * @param option - Option to check
 * @returns true if Option is None
 */
export const isNone = <T>(option: Option<T>): option is { some: false } => option.some === false;

/**
 * Type guard to check if an error is a specific GraphError variant.
 * @param error - Error to check
 * @param type - Error type to match
 * @returns true if error matches the specified type
 * @example
 * ```typescript
 * if (isGraphErrorType(error, 'duplicate-node')) {
 *   console.log('Duplicate node:', error.nodeId);
 * }
 * ```
 */
export const isGraphErrorType = <T extends GraphError['type']>(error: GraphError, type: T): error is Extract<GraphError, { type: T }> => error.type === type;
