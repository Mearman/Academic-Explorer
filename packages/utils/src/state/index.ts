/**
 * React Context-based state management utilities
 */

export {
	createContextStore,
	createCombinedContext,
	createSimpleContext,
	createAsyncAction,
	type ContextStore,
	type ActionCreator,
} from "./react-context-store.js"

// Pagination utilities
export { computePagedItems, type PaginationState, type PagedResult } from "./react-context-store.js"

// Filter manager
export { createFilterManager, type FilterManager } from "./react-context-store.js"

// Sequential ID generator
export function generateSequentialId(prefix = "id"): () => string {
	let counter = 0
	return () => `${prefix}-${++counter}`
}
