/**
 * Entity cache service for batch preloading related entities
 * Provides resilient batch preloading for relationship expansion
 *
 * Supports FR-036: Batch preloading for related entities
 * See research.md Section 2 (lines 114-125) for implementation guidance
 */

import { CacheContext } from '../types/cache'

/**
 * ContextualFieldSelector interface for selecting fields based on cache context
 * Used to optimize batch preload requests by selecting only needed fields
 */
export interface ContextualFieldSelector {
	/**
	 * Select fields appropriate for the given cache context and entity type
	 * @param entityType Entity type identifier (e.g., 'work', 'author', 'institution')
	 * @param context Cache context enum value
	 * @returns Array of selected field names
	 */
	selectFieldsForContext(entityType: string, context: CacheContext): string[]
}

/**
 * Cache context object for batch preloading operations
 * Tracks depth and operation type to optimize field selection
 */
export interface CacheContextType {
	/** Current expansion depth in entity graph */
	depth?: number
	/** Operation type being performed (e.g., 'expand', 'search') */
	operation?: string
	/** Cache context enum for field selection */
	context?: CacheContext
	/** Additional metadata for cache optimization */
	[key: string]: unknown
}

/**
 * SmartEntityCache interface for batch preloading
 * Represents the cache instance that handles batch entity preloading
 */
export interface SmartEntityCache {
	/**
	 * Batch preload multiple entities into cache
	 * @param entityIds Array of entity IDs to preload
	 * @param context Cache context with depth and operation info
	 * @returns Promise resolving when preload completes
	 * @throws May throw errors during preload which should be caught gracefully
	 */
	batchPreloadEntities(entityIds: string[], context: CacheContextType): Promise<void>
}

/**
 * Batch preloading for related entities
 * Implements resilient batch loading strategy with graceful error handling
 *
 * FR-036: Batch preloading for related entities (see research.md Section 2)
 *
 * Usage pattern:
 * ```typescript
 * const relatedIds = ['A123', 'A456', 'A789'] // Entity IDs to preload
 * const context = {
 *   operation: 'expand',
 *   depth: 1,
 *   context: CacheContext.ENTITY_EXPANDED
 * }
 * await batchPreloadEntities(cache, relatedIds, context)
 * // Cache errors logged but don't block expansion
 * ```
 *
 * @param cache SmartEntityCache instance (may be null/undefined)
 * @param entityIds Array of entity IDs to preload
 * @param context Cache context with depth and operation tracking
 * @param fieldSelector Optional field selection strategy for context-aware loading
 * @returns Promise resolving when preload completes or is skipped
 */
export async function batchPreloadEntities(
	cache: SmartEntityCache | null | undefined,
	entityIds: string[],
	context: CacheContextType,
	fieldSelector?: ContextualFieldSelector
): Promise<void> {
	// Graceful early exit if cache unavailable or no entities to preload
	if (!cache || entityIds.length === 0) {
		return
	}

	try {
		// Delegate batch preload to cache implementation
		// Cache handles field selection and batch optimization internally
		await cache.batchPreloadEntities(entityIds, context)
	} catch (error: unknown) {
		// Log warning but don't throw - resilient failure handling
		// Expansion continues even if preload fails
		// Individual entity fetches will provide fallback
		const errorInfo = error instanceof Error ? error.message : String(error)
		console.warn('Failed to preload related entities', {
			error: errorInfo,
			entityIds,
			context,
		})
	}
}
