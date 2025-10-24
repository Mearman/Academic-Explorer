/**
 * State management utilities
 *
 * Note: React Context-based utilities have been moved to @academic-explorer/ui
 * This module now only contains non-React state utilities.
 */

// Sequential ID generator
export function generateSequentialId(prefix = "id"): () => string {
	let counter = 0
	return () => `${prefix}-${++counter}`
}
