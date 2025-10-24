/**
 * Types for cache browser functionality
 * UI-agnostic interfaces for browsing cached entities
 */

export type EntityType =
	| "works"
	| "authors"
	| "sources"
	| "institutions"
	| "topics"
	| "publishers"
	| "funders"
	| "keywords"
	| "concepts"
	| "autocomplete"

export interface CachedEntityMetadata {
	id: string
	type: EntityType
	label: string
	cacheTimestamp: number
	storageLocation: "indexeddb" | "localstorage" | "memory" | "repository"
	dataSize: number
	lastAccessed?: number
	externalIds?: Record<string, string>
	basicInfo?: {
		displayName?: string
		description?: string
		url?: string
		citationCount?: number
		worksCount?: number
	}
}

export interface CacheBrowserStats {
	totalEntities: number
	entitiesByType: Record<EntityType, number>
	entitiesByStorage: Record<string, number>
	totalCacheSize: number
	oldestEntry: number
	newestEntry: number
}

export interface CacheBrowserFilters {
	searchQuery: string
	entityTypes: Set<EntityType>
	storageLocations: Set<string>
	dateRange?: {
		start: number
		end: number
	}
	sizeRange?: {
		min: number
		max: number
	}
}

export interface CacheBrowserOptions {
	includeRepositoryData: boolean
	includeBasicInfo: boolean
	sortBy: "timestamp" | "type" | "label" | "size" | "lastAccessed"
	sortDirection: "asc" | "desc"
	limit?: number
	offset?: number
}

export interface CacheBrowserResult {
	entities: CachedEntityMetadata[]
	stats: CacheBrowserStats
	hasMore: boolean
	totalMatching: number
}
