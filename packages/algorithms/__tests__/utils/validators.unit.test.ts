import { describe, expect, it } from 'vitest';
import { type Edge } from '../../src/types/graph';
import {
	validateEdgeWeight,
	validateNonNegativeWeight,
	validateNotNull,
} from '../../src/utils/validators';

describe('validators', () => {
	describe('validateNotNull', () => {
		it('should return Err for null input', () => {
			const result = validateNotNull(null, 'testInput');

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.type).toBe('invalid-input');
				expect(result.error.message).toBe('testInput cannot be null or undefined');
				expect(result.error.input).toBeNull();
			}
		});

		it('should return Err for undefined input', () => {
			const result = validateNotNull(undefined, 'testParam');

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.type).toBe('invalid-input');
				expect(result.error.message).toBe('testParam cannot be null or undefined');
				expect(result.error.input).toBeUndefined();
			}
		});

		it('should return Ok for valid string input', () => {
			const result = validateNotNull('validString', 'testInput');

			expect(result.ok).toBe(true);
		});

		it('should return Ok for valid number input', () => {
			const result = validateNotNull(42, 'testNumber');

			expect(result.ok).toBe(true);
		});

		it('should return Ok for valid object input', () => {
			const result = validateNotNull({ key: 'value' }, 'testObject');

			expect(result.ok).toBe(true);
		});

		it('should return Ok for zero', () => {
			const result = validateNotNull(0, 'testZero');

			expect(result.ok).toBe(true);
		});

		it('should return Ok for empty string', () => {
			const result = validateNotNull('', 'testEmptyString');

			expect(result.ok).toBe(true);
		});

		it('should return Ok for false boolean', () => {
			const result = validateNotNull(false, 'testBoolean');

			expect(result.ok).toBe(true);
		});
	});

	describe('validateEdgeWeight', () => {
		it('should return Ok for edge with undefined weight', () => {
			const edge: Edge = { id: 'e1', source: 'n1', target: 'n2', type: 'test' };
			const result = validateEdgeWeight(edge);

			expect(result.ok).toBe(true);
		});

		it('should return Err for edge with non-numeric weight', () => {
			const edge = { id: 'e1', source: 'n1', target: 'n2', type: 'test', weight: 'invalid' };
			const result = validateEdgeWeight(edge as unknown as Edge);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.type).toBe('invalid-weight');
				expect(result.error.message).toContain("Edge 'e1' has non-numeric weight: string");
				expect(result.error.edgeId).toBe('e1');
			}
		});

		it('should return Err for edge with NaN weight', () => {
			const edge: Edge = { id: 'e1', source: 'n1', target: 'n2', type: 'test', weight: NaN };
			const result = validateEdgeWeight(edge);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.type).toBe('invalid-weight');
				expect(result.error.message).toContain("Edge 'e1' has NaN weight");
				expect(result.error.edgeId).toBe('e1');
			}
		});

		it('should return Err for edge with Infinity weight', () => {
			const edge: Edge = { id: 'e1', source: 'n1', target: 'n2', type: 'test', weight: Infinity };
			const result = validateEdgeWeight(edge);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.type).toBe('invalid-weight');
				expect(result.error.message).toContain("Edge 'e1' has non-finite weight (Infinity)");
				expect(result.error.edgeId).toBe('e1');
			}
		});

		it('should return Err for edge with -Infinity weight', () => {
			const edge: Edge = { id: 'e1', source: 'n1', target: 'n2', type: 'test', weight: -Infinity };
			const result = validateEdgeWeight(edge);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.type).toBe('invalid-weight');
				expect(result.error.message).toContain("Edge 'e1' has non-finite weight (Infinity)");
				expect(result.error.edgeId).toBe('e1');
			}
		});

		it('should return Ok for edge with valid positive weight', () => {
			const edge: Edge = { id: 'e1', source: 'n1', target: 'n2', type: 'test', weight: 5.5 };
			const result = validateEdgeWeight(edge);

			expect(result.ok).toBe(true);
		});

		it('should return Ok for edge with valid negative weight', () => {
			const edge: Edge = { id: 'e1', source: 'n1', target: 'n2', type: 'test', weight: -3.5 };
			const result = validateEdgeWeight(edge);

			expect(result.ok).toBe(true);
		});

		it('should return Ok for edge with zero weight', () => {
			const edge: Edge = { id: 'e1', source: 'n1', target: 'n2', type: 'test', weight: 0 };
			const result = validateEdgeWeight(edge);

			expect(result.ok).toBe(true);
		});
	});

	describe('validateNonNegativeWeight', () => {
		it('should return Err for edge with negative weight', () => {
			const edge: Edge = { id: 'e1', source: 'n1', target: 'n2', type: 'test', weight: -5 };
			const result = validateNonNegativeWeight(edge);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.type).toBe('negative-weight');
				expect(result.error.message).toContain("Edge 'e1' has negative weight: -5");
				expect(result.error.message).toContain("Dijkstra's algorithm requires non-negative weights");
				expect(result.error.weight).toBe(-5);
				expect(result.error.edgeId).toBe('e1');
			}
		});

		it('should return Ok for edge with zero weight', () => {
			const edge: Edge = { id: 'e1', source: 'n1', target: 'n2', type: 'test', weight: 0 };
			const result = validateNonNegativeWeight(edge);

			expect(result.ok).toBe(true);
		});

		it('should return Ok for edge with positive weight', () => {
			const edge: Edge = { id: 'e1', source: 'n1', target: 'n2', type: 'test', weight: 10 };
			const result = validateNonNegativeWeight(edge);

			expect(result.ok).toBe(true);
		});

		it('should return Ok for edge with undefined weight (defaults to 1)', () => {
			const edge: Edge = { id: 'e1', source: 'n1', target: 'n2', type: 'test' };
			const result = validateNonNegativeWeight(edge);

			expect(result.ok).toBe(true);
		});

		it('should return Err for edge with fractional negative weight', () => {
			const edge: Edge = { id: 'e1', source: 'n1', target: 'n2', type: 'test', weight: -0.5 };
			const result = validateNonNegativeWeight(edge);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.type).toBe('negative-weight');
				expect(result.error.weight).toBe(-0.5);
			}
		});

		it('should return Ok for edge with fractional positive weight', () => {
			const edge: Edge = { id: 'e1', source: 'n1', target: 'n2', type: 'test', weight: 0.5 };
			const result = validateNonNegativeWeight(edge);

			expect(result.ok).toBe(true);
		});

		it('should return Ok for edge with large positive weight', () => {
			const edge: Edge = { id: 'e1', source: 'n1', target: 'n2', type: 'test', weight: 999999 };
			const result = validateNonNegativeWeight(edge);

			expect(result.ok).toBe(true);
		});
	});
});
