/**
 * Sequential ID generator utility
 */

export function generateSequentialId(prefix = "id"): () => string {
	let counter = 0;
	return () => `${prefix}-${++counter}`;
}
