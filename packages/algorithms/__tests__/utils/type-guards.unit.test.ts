import { describe, expect, it } from 'vitest';
import { Err, Ok } from '../../src/types/result';
import { None, Some } from '../../src/types/option';
import type { Edge, Node } from '../../src/types/graph';
import type { GraphError } from '../../src/types/errors';
import {
	isNode,
	isEdge,
	isOk,
	isErr,
	isSome,
	isNone,
	isGraphErrorType,
} from '../../src/utils/type-guards';

describe('type-guards', () => {
	describe('isNode', () => {
		it('should return true for valid Node', () => {
			const node: Node = { id: 'n1', type: 'test' };
			const result = isNode(node);

			expect(result).toBe(true);
		});

		it('should return true for Node with additional properties', () => {
			const node = { id: 'n1', type: 'test', label: 'Test Node', weight: 5 };
			const result = isNode(node);

			expect(result).toBe(true);
		});

		it('should return false for null', () => {
			const result = isNode(null);

			expect(result).toBe(false);
		});

		it('should return false for undefined', () => {
			const result = isNode(undefined);

			expect(result).toBe(false);
		});

		it('should return false for non-object values', () => {
			expect(isNode('string')).toBe(false);
			expect(isNode(123)).toBe(false);
			expect(isNode(true)).toBe(false);
		});

		it('should return false for object missing id', () => {
			const obj = { type: 'test' };
			const result = isNode(obj);

			expect(result).toBe(false);
		});

		it('should return false for object missing type', () => {
			const obj = { id: 'n1' };
			const result = isNode(obj);

			expect(result).toBe(false);
		});

		it('should return false for object with non-string id', () => {
			const obj = { id: 123, type: 'test' };
			const result = isNode(obj);

			expect(result).toBe(false);
		});

		it('should return false for object with non-string type', () => {
			const obj = { id: 'n1', type: 123 };
			const result = isNode(obj);

			expect(result).toBe(false);
		});

		it('should return false for array', () => {
			const result = isNode(['n1', 'test']);

			expect(result).toBe(false);
		});
	});

	describe('isEdge', () => {
		it('should return true for valid Edge', () => {
			const edge: Edge = { id: 'e1', source: 'n1', target: 'n2', type: 'test' };
			const result = isEdge(edge);

			expect(result).toBe(true);
		});

		it('should return true for Edge with additional properties', () => {
			const edge = {
				id: 'e1',
				source: 'n1',
				target: 'n2',
				type: 'test',
				weight: 5,
				label: 'Test Edge',
			};
			const result = isEdge(edge);

			expect(result).toBe(true);
		});

		it('should return false for null', () => {
			const result = isEdge(null);

			expect(result).toBe(false);
		});

		it('should return false for undefined', () => {
			const result = isEdge(undefined);

			expect(result).toBe(false);
		});

		it('should return false for non-object values', () => {
			expect(isEdge('string')).toBe(false);
			expect(isEdge(123)).toBe(false);
			expect(isEdge(true)).toBe(false);
		});

		it('should return false for object missing id', () => {
			const obj = { source: 'n1', target: 'n2', type: 'test' };
			const result = isEdge(obj);

			expect(result).toBe(false);
		});

		it('should return false for object missing source', () => {
			const obj = { id: 'e1', target: 'n2', type: 'test' };
			const result = isEdge(obj);

			expect(result).toBe(false);
		});

		it('should return false for object missing target', () => {
			const obj = { id: 'e1', source: 'n1', type: 'test' };
			const result = isEdge(obj);

			expect(result).toBe(false);
		});

		it('should return false for object missing type', () => {
			const obj = { id: 'e1', source: 'n1', target: 'n2' };
			const result = isEdge(obj);

			expect(result).toBe(false);
		});

		it('should return false for object with non-string id', () => {
			const obj = { id: 123, source: 'n1', target: 'n2', type: 'test' };
			const result = isEdge(obj);

			expect(result).toBe(false);
		});

		it('should return false for object with non-string source', () => {
			const obj = { id: 'e1', source: 123, target: 'n2', type: 'test' };
			const result = isEdge(obj);

			expect(result).toBe(false);
		});

		it('should return false for object with non-string target', () => {
			const obj = { id: 'e1', source: 'n1', target: 123, type: 'test' };
			const result = isEdge(obj);

			expect(result).toBe(false);
		});

		it('should return false for object with non-string type', () => {
			const obj = { id: 'e1', source: 'n1', target: 'n2', type: 123 };
			const result = isEdge(obj);

			expect(result).toBe(false);
		});

		it('should return false for array', () => {
			const result = isEdge(['e1', 'n1', 'n2', 'test']);

			expect(result).toBe(false);
		});
	});

	describe('isOk', () => {
		it('should return true for Ok result', () => {
			const result = Ok('success');
			const check = isOk(result);

			expect(check).toBe(true);
		});

		it('should return true for Ok result with number value', () => {
			const result = Ok(42);
			const check = isOk(result);

			expect(check).toBe(true);
		});

		it('should return true for Ok result with object value', () => {
			const result = Ok({ data: 'test' });
			const check = isOk(result);

			expect(check).toBe(true);
		});

		it('should return true for Ok result with null value', () => {
			const result = Ok(null);
			const check = isOk(result);

			expect(check).toBe(true);
		});

		it('should return false for Err result', () => {
			const result = Err('error');
			const check = isOk(result);

			expect(check).toBe(false);
		});

		it('should narrow type correctly when true', () => {
			const result = Ok('success');

			if (isOk(result)) {
				// TypeScript should know result.value exists
				expect(result.value).toBe('success');
			}
		});
	});

	describe('isErr', () => {
		it('should return true for Err result', () => {
			const result = Err('error');
			const check = isErr(result);

			expect(check).toBe(true);
		});

		it('should return true for Err result with object error', () => {
			const result = Err({ type: 'invalid-input', message: 'Test error' });
			const check = isErr(result);

			expect(check).toBe(true);
		});

		it('should return false for Ok result', () => {
			const result = Ok('success');
			const check = isErr(result);

			expect(check).toBe(false);
		});

		it('should narrow type correctly when true', () => {
			const result = Err('error');

			if (isErr(result)) {
				// TypeScript should know result.error exists
				expect(result.error).toBe('error');
			}
		});
	});

	describe('isSome', () => {
		it('should return true for Some option', () => {
			const option = Some('value');
			const check = isSome(option);

			expect(check).toBe(true);
		});

		it('should return true for Some option with number value', () => {
			const option = Some(42);
			const check = isSome(option);

			expect(check).toBe(true);
		});

		it('should return true for Some option with object value', () => {
			const option = Some({ data: 'test' });
			const check = isSome(option);

			expect(check).toBe(true);
		});

		it('should return true for Some option with null value', () => {
			const option = Some(null);
			const check = isSome(option);

			expect(check).toBe(true);
		});

		it('should return false for None option', () => {
			const option = None();
			const check = isSome(option);

			expect(check).toBe(false);
		});

		it('should narrow type correctly when true', () => {
			const option = Some('value');

			if (isSome(option)) {
				// TypeScript should know option.value exists
				expect(option.value).toBe('value');
			}
		});
	});

	describe('isNone', () => {
		it('should return true for None option', () => {
			const option = None();
			const check = isNone(option);

			expect(check).toBe(true);
		});

		it('should return false for Some option', () => {
			const option = Some('value');
			const check = isNone(option);

			expect(check).toBe(false);
		});

		it('should return false for Some option with falsy value', () => {
			expect(isNone(Some(0))).toBe(false);
			expect(isNone(Some(''))).toBe(false);
			expect(isNone(Some(false))).toBe(false);
			expect(isNone(Some(null))).toBe(false);
		});
	});

	describe('isGraphErrorType', () => {
		it('should return true for matching error type', () => {
			const error: GraphError = {
				type: 'invalid-input',
				message: 'Test error',
			};
			const check = isGraphErrorType(error, 'invalid-input');

			expect(check).toBe(true);
		});

		it('should return false for non-matching error type', () => {
			const error: GraphError = {
				type: 'invalid-input',
				message: 'Test error',
			};
			const check = isGraphErrorType(error, 'invalid-weight');

			expect(check).toBe(false);
		});

		it('should work with invalid-weight error', () => {
			const error: GraphError = {
				type: 'invalid-weight',
				message: 'Invalid weight',
				weight: 'invalid',
				edgeId: 'e1',
			};
			const check = isGraphErrorType(error, 'invalid-weight');

			expect(check).toBe(true);
		});

		it('should work with negative-weight error', () => {
			const error: GraphError = {
				type: 'negative-weight',
				message: 'Negative weight',
				weight: -5,
				edgeId: 'e1',
			};
			const check = isGraphErrorType(error, 'negative-weight');

			expect(check).toBe(true);
		});

		it('should work with cycle-detected error', () => {
			const error: GraphError = {
				type: 'cycle-detected',
				message: 'Cycle found',
				cyclePath: ['n1', 'n2', 'n1'],
			};
			const check = isGraphErrorType(error, 'cycle-detected');

			expect(check).toBe(true);
		});

		it('should work with duplicate-node error', () => {
			const error: GraphError = {
				type: 'duplicate-node',
				message: 'Duplicate node',
				nodeId: 'n1',
			};
			const check = isGraphErrorType(error, 'duplicate-node');

			expect(check).toBe(true);
		});

		it('should narrow type correctly when true', () => {
			const error: GraphError = {
				type: 'invalid-weight',
				message: 'Invalid weight',
				weight: 'invalid',
				edgeId: 'e1',
			};

			if (isGraphErrorType(error, 'invalid-weight')) {
				// TypeScript should know error has weight and edgeId properties
				expect(error.weight).toBe('invalid');
				expect(error.edgeId).toBe('e1');
			}
		});
	});
});
