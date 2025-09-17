/**
 * Cache system exports
 * Provides version-aware cache invalidation and management utilities
 */

// Version-aware cache initialization
export {
	initializeQueryClient,
	createStandardQueryClient,
	setupBasicPersistence
} from "./cache-init";

// Cache invalidation system
export {
	checkAndInvalidateCache,
	forceInvalidateCache,
	getCacheInvalidationStats,
	CacheLayer,
	type InvalidationResult
} from "./cache-invalidator";

// Version management
export {
	getCurrentAppVersion,
	getCurrentBuildInfo,
	createAppMetadata,
	isVersionChange,
	shouldInvalidateCache,
	logVersionComparison,
	type AppMetadata
} from "./version-manager";

// Metadata storage
export {
	storeAppMetadata,
	getStoredAppMetadata,
	clearAppMetadata,
	updateLastInvalidationTime,
	getMetadataStats,
	closeMetadataDB
} from "./metadata-store";

// Existing cache utilities
export { createHybridPersister, getCacheStats, clearExpiredCache } from "./persister";
export {
	createQueryKey,
	createEntityQueryKey,
	createSearchQueryKey,
	createRelatedQueryKey,
	createAutocompleteQueryKey,
	parseQueryKey,
	isValidQueryKey,
	type QueryKeyConfig,
	type EntityQueryKeyParams,
	type SearchQueryKeyParams
} from "./query-keys";
export { GraphCache, type GraphCacheEntry, type GraphCacheStats } from "./graph-cache";