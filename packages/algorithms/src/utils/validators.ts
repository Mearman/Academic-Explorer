import { type InvalidInputError, type InvalidWeightError, type NegativeWeightError } from '../types/errors';
import { type Edge } from '../types/graph';
import { Err, Ok,type Result } from '../types/result';

/**
 * Validate that input is not null or undefined.
 * @param input - Input to validate
 * @param name - Name of input for error message
 * @returns Ok(void) if valid, Err(InvalidInputError) if null/undefined
 */
export const validateNotNull = (input: unknown, name: string): Result<void, InvalidInputError> => {
  if (input === null || input === undefined) {
    return Err({
      type: 'invalid-input',
      message: `${name} cannot be null or undefined`,
      input,
    });
  }
  return Ok(void 0);
};

/**
 * Validate edge weight is a valid number (not NaN, not Infinity).
 * @param edge - Edge to validate
 * @returns Ok(void) if valid, Err(InvalidWeightError) if invalid
 */
export const validateEdgeWeight = (edge: Edge): Result<void, InvalidWeightError> => {
  if (edge.weight === undefined) {
    return Ok(void 0); // Optional weight is valid
  }

  if (typeof edge.weight !== 'number') {
    return Err({
      type: 'invalid-weight',
      message: `Edge '${edge.id}' has non-numeric weight: ${typeof edge.weight}`,
      weight: edge.weight,
      edgeId: edge.id,
    });
  }

  if (Number.isNaN(edge.weight)) {
    return Err({
      type: 'invalid-weight',
      message: `Edge '${edge.id}' has NaN weight`,
      weight: edge.weight,
      edgeId: edge.id,
    });
  }

  if (!Number.isFinite(edge.weight)) {
    return Err({
      type: 'invalid-weight',
      message: `Edge '${edge.id}' has non-finite weight (Infinity)`,
      weight: edge.weight,
      edgeId: edge.id,
    });
  }

  return Ok(void 0);
};

/**
 * Validate edge weight is non-negative (for Dijkstra's algorithm).
 * @param edge - Edge to validate
 * @returns Ok(void) if valid, Err(NegativeWeightError) if negative
 */
export const validateNonNegativeWeight = (edge: Edge): Result<void, NegativeWeightError> => {
  const weight = edge.weight ?? 1; // Default weight is 1

  if (weight < 0) {
    return Err({
      type: 'negative-weight',
      message: `Edge '${edge.id}' has negative weight: ${weight}. Dijkstra's algorithm requires non-negative weights.`,
      weight,
      edgeId: edge.id,
    });
  }

  return Ok(void 0);
};
