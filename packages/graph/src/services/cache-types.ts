/**
 * TypeScript types and interfaces for the smart caching system
 * Provides intelligent field-level caching for OpenAlex entities with context-aware optimization
 */

import type { EntityType } from "../types/core"

// Re-export core entity types for convenience
export type { EntityType } from "../types/core"

/**
 * Generic type for entity data - can be any OpenAlex entity type
 * Uses unknown for maximum flexibility while maintaining type safety
 */
export type EntityData = Record<string, unknown>

/**
 * Core cached entity representation with field-level granularity
 * Tracks completeness, access patterns, and dependencies
 */
export interface CachedEntity {
	/** Unique entity identifier (OpenAlex ID) */
	id: string

	/** OpenAlex entity type */
	entityType: EntityType

	/** Set of fields currently cached for this entity */
	fields: Set<string>

	/** Partial entity data - only contains requested/cached fields */
	data: Partial<EntityData>

	/** Map of field names to their last updated timestamps */
	lastUpdated: Map<string, Date>

	/** Completeness score (0-1) based on typical field usage patterns */
	completeness: number

	/** Number of times this entity has been accessed */
	accessCount: number

	/** Set of entity IDs that this entity depends on (for cache invalidation) */
	dependencies: Set<string>

	/** When this entity was first cached */
	createdAt: Date

	/** When this entity was last accessed */
	lastAccessed: Date
}

/**
 * Request for specific fields from an entity
 * Used for batch optimization and priority handling
 */
export interface FieldRequest {
	/** Entity identifier */
	id: string

	/** Entity type for API routing */
	entityType: EntityType

	/** List of field names to request */
	fields: string[]

	/** Request priority (higher = more urgent) */
	priority: number
}

/**
 * Optimized batch request combining multiple field requests
 * Reduces API calls through intelligent field merging
 */
interface BatchRequest {
	/** Target entity type for the batch */
	entityType: EntityType

	/** Individual field requests in this batch */
	requests: FieldRequest[]

	/** Optimized set of fields to request for all entities */
	optimizedFields: string[]
}

/**
 * Cache performance and usage statistics
 * Used for monitoring and optimization decisions
 */
export interface CacheStats {
	/** Total number of entities in cache */
	totalEntities: number

	/** Total number of cached fields across all entities */
	totalFields: number

	/** Cache hit rate (0-1) */
	hitRate: number

	/** Cache miss rate (0-1) */
	missRate: number

	/** Average entity completeness score */
	averageCompleteness: number

	/** Current memory usage in bytes */
	memoryUsage: number

	/** Map of entity IDs to their staleness scores */
	staleness: Map<string, number>
}

/**
 * Context enumeration for cache optimization strategies
 * Different contexts have different field priorities and access patterns
 */
export enum CacheContext {
	/** Graph traversal operations - prioritize relationship fields */
	TRAVERSAL = "traversal",

	/** Data analysis and statistics - prioritize metadata fields */
	ANALYSIS = "analysis",

	/** UI display rendering - prioritize display fields */
	UI_DISPLAY = "ui_display",

	/** Data export operations - prioritize complete field sets */
	EXPORT = "export",

	/** Search and discovery - prioritize searchable fields */
	SEARCH = "search",
}

/**
 * Cache configuration and behavior settings
 * Controls TTL, preloading, batch sizes, and persistence
 */
export interface CacheConfig {
	/** Maximum number of entities to keep in cache */
	maxCacheSize: number

	/** Field-specific time-to-live settings in milliseconds */
	fieldTTL: Map<string, number>

	/** Default TTL for fields not specified in fieldTTL */
	defaultTTL: number

	/** Active preloading strategies */
	preloadStrategies: PreloadStrategy[]

	/** Batch sizes per entity type for optimal API usage */
	batchSizes: Map<string, number>

	/** Whether to enable compression for stored data */
	compressionEnabled: boolean

	/** Storage backend configuration */
	persistenceLayer: "memory" | "localStorage" | "indexedDB" | "hybrid"
}

/**
 * Preloading strategy definition
 * Defines when and what to preload based on usage patterns
 */
export interface PreloadStrategy {
	/** Strategy identifier */
	name: string

	/** Contexts where this strategy applies */
	contexts: CacheContext[]

	/** Function to determine if preloading should trigger for an entity */
	trigger: (entity: CachedEntity) => boolean

	/** Function to determine which fields to preload */
	getFieldsToPreload: (entity: CachedEntity) => string[]
}

/**
 * Result of a single cache operation
 * Provides detailed information about what was loaded and from where
 */
export interface CacheOperationResult {
	/** Whether the operation succeeded */
	success: boolean

	/** Fields that were successfully loaded */
	fieldsLoaded: string[]

	/** Fields that came from cache */
	fieldsFromCache: string[]

	/** Fields that required API calls */
	fieldsFromAPI: string[]

	/** Total operation duration in milliseconds */
	duration: number

	/** Error information if operation failed */
	error?: Error
}

/**
 * Result of a batch operation
 * Aggregates results from multiple cache operations with optimization metrics
 */
export interface BatchOperationResult {
	/** Map of entity IDs to their individual operation results */
	results: Map<string, CacheOperationResult>

	/** Total duration for the entire batch operation */
	totalDuration: number

	/** Optimization statistics for the batch */
	optimizations: {
		/** Number of duplicate requests that were merged */
		requestsDeduped: number

		/** Number of separate batches that were merged */
		batchesMerged: number

		/** Number of fields optimized through intelligent selection */
		fieldsOptimized: number
	}
}

/**
 * Cache event types for monitoring and debugging
 * Emitted during cache operations for observability
 */
export interface CacheEvent {
	/** Type of cache event */
	type: "hit" | "miss" | "load" | "invalidate" | "evict"

	/** Entity ID involved in the event */
	entityId: string

	/** Fields involved in the event */
	fields: string[]

	/** Context in which the event occurred */
	context?: CacheContext

	/** When the event occurred */
	timestamp: Date

	/** Duration of the operation (for load events) */
	duration?: number
}

/**
 * Field dependency definition for cache invalidation
 * Defines which fields depend on others across entity types
 */
export interface FieldDependency {
	/** Field name that has dependencies */
	field: string

	/** List of fields this field depends on */
	dependsOn: string[]

	/** Entity types where this dependency applies */
	entityTypes: EntityType[]
}

/**
 * Cache priority levels for different operations
 * Used to prioritize cache operations during high load
 */
export enum CachePriority {
	/** Critical operations that should never be deferred */
	CRITICAL = 100,

	/** High priority operations for immediate user needs */
	HIGH = 75,

	/** Normal priority for typical operations */
	NORMAL = 50,

	/** Low priority for background operations */
	LOW = 25,

	/** Background operations that can be deferred indefinitely */
	BACKGROUND = 0,
}

/**
 * Cache eviction policies for memory management
 * Determines which entities to remove when cache is full
 */
export enum EvictionPolicy {
	/** Least Recently Used - remove oldest accessed entities */
	LRU = "lru",

	/** Least Frequently Used - remove least accessed entities */
	LFU = "lfu",

	/** Time To Live - remove expired entities */
	TTL = "ttl",

	/** Lowest completeness - remove entities with fewest fields */
	COMPLETENESS = "completeness",

	/** Hybrid policy combining multiple factors */
	HYBRID = "hybrid",
}

/**
 * Cache warming strategy for proactive loading
 * Defines how to pre-populate cache based on usage patterns
 */
export interface CacheWarmingStrategy {
	/** Strategy identifier */
	name: string

	/** Entity types this strategy applies to */
	entityTypes: EntityType[]

	/** Function to determine entities to warm */
	getEntitiesToWarm: (context: CacheContext) => string[]

	/** Function to determine fields to warm for each entity */
	getFieldsToWarm: (entityId: string, entityType: EntityType) => string[]

	/** Maximum number of entities to warm in one operation */
	maxEntities: number

	/** Whether to warm in background or block user operations */
	background: boolean
}

/**
 * Cache invalidation event for reactive cache management
 * Defines how cache should respond to data changes
 */
export interface CacheInvalidationEvent {
	/** Type of invalidation */
	type: "entity_updated" | "field_changed" | "dependency_changed" | "manual"

	/** Entity ID that triggered the invalidation */
	entityId: string

	/** Specific fields that need invalidation (empty = all fields) */
	fields: string[]

	/** Whether to cascade invalidation to dependent entities */
	cascade: boolean

	/** Timestamp of the invalidation */
	timestamp: Date
}

/**
 * Smart cache interface definition
 * Main interface for interacting with the smart caching system
 */
export interface SmartCache {
	/**
	 * Get cached fields for an entity, loading from API if necessary
	 */
	getFields(
		entityId: string,
		entityType: EntityType,
		fields: string[],
		context?: CacheContext
	): Promise<CacheOperationResult>

	/**
	 * Batch get fields for multiple entities with optimization
	 */
	batchGetFields(requests: FieldRequest[], context?: CacheContext): Promise<BatchOperationResult>

	/**
	 * Check if specific fields are cached without loading
	 */
	hasFields(entityId: string, entityType: EntityType, fields: string[]): boolean

	/**
	 * Invalidate cached data for an entity or specific fields
	 */
	invalidate(entityId: string, fields?: string[], cascade?: boolean): void

	/**
	 * Get current cache statistics
	 */
	getStats(): CacheStats

	/**
	 * Configure cache behavior
	 */
	configure(config: Partial<CacheConfig>): void

	/**
	 * Clear all cached data
	 */
	clear(): void

	/**
	 * Add event listener for cache operations
	 */
	addEventListener(eventType: CacheEvent["type"], listener: (event: CacheEvent) => void): void

	/**
	 * Remove event listener
	 */
	removeEventListener(eventType: CacheEvent["type"], listener: (event: CacheEvent) => void): void
}

/**
 * Field usage pattern tracking for optimization
 * Tracks which fields are commonly requested together
 */
export interface FieldUsagePattern {
	/** Primary field that triggers the pattern */
	primaryField: string

	/** Fields commonly requested with the primary field */
	coRequestedFields: Map<string, number>

	/** Entity types where this pattern applies */
	entityTypes: EntityType[]

	/** Contexts where this pattern is most common */
	contexts: CacheContext[]

	/** Confidence score for this pattern (0-1) */
	confidence: number
}

/**
 * Cache health metrics for monitoring
 * Provides insights into cache performance and potential issues
 */
export interface CacheHealth {
	/** Overall health score (0-1, where 1 is perfect) */
	healthScore: number

	/** Cache hit rate over recent operations */
	recentHitRate: number

	/** Average response time for cached vs uncached requests */
	responseTimeComparison: {
		cached: number
		uncached: number
		improvement: number
	}

	/** Memory usage efficiency metrics */
	memoryEfficiency: {
		utilizationRate: number
		fragmentationScore: number
		averageEntitySize: number
	}

	/** Potential issues detected */
	issues: Array<{
		type: "memory_pressure" | "low_hit_rate" | "high_staleness" | "fragmentation"
		severity: "low" | "medium" | "high" | "critical"
		description: string
		recommendation: string
	}>
}

/**
 * Type guard functions for runtime type checking
 */
export const isEntityType = (value: unknown): value is EntityType => {
	const entityTypes = [
		"works",
		"authors",
		"sources",
		"institutions",
		"publishers",
		"funders",
		"topics",
		"concepts",
		"keywords",
	]
	return typeof value === "string" && entityTypes.includes(value)
}

export const isCacheContext = (value: unknown): value is CacheContext => {
	return Object.values(CacheContext).includes(value as CacheContext)
}

export const isCachedEntity = (value: unknown): value is CachedEntity => {
	if (!value || typeof value !== "object") return false
	const obj = value as Record<string, unknown>
	return (
		typeof obj.id === "string" &&
		isEntityType(obj.entityType) &&
		obj.fields instanceof Set &&
		typeof obj.data === "object" &&
		obj.lastUpdated instanceof Map &&
		typeof obj.completeness === "number" &&
		typeof obj.accessCount === "number" &&
		obj.dependencies instanceof Set &&
		obj.createdAt instanceof Date &&
		obj.lastAccessed instanceof Date
	)
}
