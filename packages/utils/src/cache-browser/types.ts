/**
 * Types for cache browser functionality
 * UI-agnostic interfaces for browsing cached entities
 */

import type { EntityType } from "@academic-explorer/types"

/**
 * Cache storage types include entity types + special "autocomplete" cache
 */
export type CacheStorageType = EntityType | "autocomplete"

export interface CachedEntityMetadata {
	id: string
	type: CacheStorageType
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
	entitiesByType: Record<CacheStorageType, number>
	entitiesByStorage: Record<string, number>
	totalCacheSize: number
	oldestEntry: number
	newestEntry: number
}

export interface CacheBrowserFilters {
	searchQuery: string
	entityTypes: Set<CacheStorageType>
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
