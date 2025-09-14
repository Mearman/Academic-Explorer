/**
 * Cache configuration for Academic Explorer
 * Defines caching strategies optimized for different OpenAlex entity types
 */

export const CACHE_CONFIG = {
	// Maximum cache age for persistence (7 days)
	maxAge: 1000 * 60 * 60 * 24 * 7,

	// Maximum cache size in bytes (100MB)
	maxSize: 100 * 1024 * 1024,

	// Compress responses larger than this threshold (1KB)
	compressionThreshold: 1024,

	// Default retry configuration
	defaultRetries: 3,

	// Default stale time (5 minutes)
	defaultStaleTime: 1000 * 60 * 5,
} as const;

/**
 * Entity-specific cache times optimized for data stability
 * Stale time: When data is considered stale and should be refetched
 * GC time: How long to keep data in cache after last access
 */
export const ENTITY_CACHE_TIMES = {
	work: {
		stale: 1000 * 60 * 60 * 24,       // 1 day - works rarely change after publication
		gc: 1000 * 60 * 60 * 24 * 7,      // 7 days - keep for a week
	},
	author: {
		stale: 1000 * 60 * 60 * 12,       // 12 hours - author info updates moderately
		gc: 1000 * 60 * 60 * 24 * 3,      // 3 days - keep for 3 days
	},
	source: {
		stale: 1000 * 60 * 60 * 24 * 7,   // 7 days - journals/sources very stable
		gc: 1000 * 60 * 60 * 24 * 30,     // 30 days - keep for a month
	},
	institution: {
		stale: 1000 * 60 * 60 * 24 * 30,  // 30 days - institutions very stable
		gc: 1000 * 60 * 60 * 24 * 90,     // 90 days - keep for 3 months
	},
	topic: {
		stale: 1000 * 60 * 60 * 24 * 7,   // 7 days - topics fairly stable
		gc: 1000 * 60 * 60 * 24 * 30,     // 30 days - keep for a month
	},
	publisher: {
		stale: 1000 * 60 * 60 * 24 * 30,  // 30 days - publishers very stable
		gc: 1000 * 60 * 60 * 24 * 90,     // 90 days - keep for 3 months
	},
	funder: {
		stale: 1000 * 60 * 60 * 24 * 30,  // 30 days - funders very stable
		gc: 1000 * 60 * 60 * 24 * 90,     // 90 days - keep for 3 months
	},
	search: {
		stale: 1000 * 60 * 5,              // 5 minutes - search results need freshness
		gc: 1000 * 60 * 60,                // 1 hour - don't keep search results long
	},
	related: {
		stale: 1000 * 60 * 60 * 6,         // 6 hours - related entities update occasionally
		gc: 1000 * 60 * 60 * 24,           // 1 day - related data doesn't need long storage
	},
} as const;

export type EntityType = keyof typeof ENTITY_CACHE_TIMES;

/**
 * Get cache configuration for a specific entity type
 */
export function getCacheConfig(entityType: EntityType) {
	return ENTITY_CACHE_TIMES[entityType];
}