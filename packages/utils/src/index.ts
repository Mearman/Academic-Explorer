// State module re-export
export * from "./state/index.js"

// Cache utilities
export * from "./cache/index.js"

// Cache browser utilities
export { cacheBrowserService } from "./cache-browser/index.js"
export type {
	CachedEntityMetadata,
	CacheBrowserStats,
	EntityType,
	CacheBrowserFilters,
	CacheBrowserOptions,
	CacheBrowserResult,
} from "./cache-browser/index.js"

// Static data utilities - only export what's needed to avoid conflicts
export type {
	EntityType as StaticEntityType,
	DirectoryIndex,
	FileEntry,
} from "./static-data/cache-utilities.js"

// Logger
export { logger, logError } from "./logger.js"
export type { LogCategory } from "./logger.js"

// Utility functions
export {
	isNonEmptyString,
	isString,
	safeParseRelationType,
	safeParseExpansionTarget,
	type RelationType,
	type ExpansionTarget,
} from "./validation.js"

// Data utilities
export {
	debouncedSearch,
	isValidSearchQuery,
	normalizeSearchQuery,
	formatLargeNumber,
} from "./data.js"

// Worker message schemas and types
export * from "./workers/messages.js"

// Build info utilities
export {
	getBuildInfo,
	formatBuildTimestamp,
	getCommitUrl,
	getReleaseUrl,
	getRelativeBuildTime,
	type BuildInfo,
} from "./build-info.js"

// Entity route hook
export {
	useEntityRoute,
	type EntityRouteConfig,
	type UseEntityRouteOptions,
	type UseEntityRouteResult,
} from "./hooks/use-entity-route.js"

// Navigation utilities
export { NavigationHelper, type NavigationConfig } from "./navigation.js"

// UI components and hooks moved to UI package
// export {
// 	LoadingState,
// 	ErrorState,
// 	EmptyState,
// 	type LoadingStateProps,
// 	type ErrorStateProps,
// 	type EmptyStateProps,
// } from "./ui/loading-states.js"

// UI components - base filters and form components
export type { FilterOperator, FilterFieldConfig } from "./ui/filter-base.js"
export { BaseFilter, createFilter, createEnumOptions, FILTER_WIDTHS } from "./ui/filter-base.js"

// Async operation hook and Data state moved to UI package
// These can be imported from @academic-explorer/ui

// Search state hook
// export {
// 	useSearchState,
// 	type UseSearchStateOptions,
// 	type UseSearchStateResult,
// 	type SearchFilters,
// } from "./hooks/use-search-state.js"

// Base search component
// export { BaseSearch, type BaseSearchProps } from "./ui/base-search.js"

// Entity fetching hooks with Zod validation
// Temporarily disabled due to circular dependency with client package
// export {
//   useEntityFetch,
//   useEntityList,
//   type UseEntityFetchOptions,
//   type UseEntityFetchResult,
// } from "./hooks/use-entity-fetch.js";

// Base section component
// export {
// 	BaseSection,
// 	SectionWithLoading,
// 	SectionWithError,
// 	type BaseSectionProps,
// 	type SectionWithLoadingProps,
// 	type SectionWithErrorProps,
// } from "./ui/base-section.js"

// Store utilities
export {
	createProgressUpdater,
	type BaseActivity,
	type ProgressTracking,
	type StatusTracking,
} from "./stores/activity-tracking.js"

// Network tracking store disabled (React-dependent, moved to UI package)
// The network tracking functionality has been moved to the UI package since it relies on React Context

// Data evaluation utilities
export {
	parseSTARFile,
	createSTARDatasetFromParseResult,
	compareAcademicExplorerResults,
	searchBasedOnSTARDataset,
	calculateSearchCoverage,
	detectMissingPapers,
	DEFAULT_COLUMN_MAPPINGS,
	DEFAULT_MATCHING_CONFIG,
	DEFAULT_SEARCH_CONFIG,
	type STARDataset,
	type ParseResult,
	type WorkReference,
	type ComparisonResults,
	type ComparisonProgress,
	type SearchCoverage,
	type MissingPaperDetectionConfig,
	type DetectionProgress,
	type MissingPaperDetectionResults,
} from "./data-evaluation.js"

// Entity type inference utilities
export {
	inferEntityType,
	inferEntityTypeFromOpenAlexId,
	inferEntityTypeFromExternalId,
	getEntityTypeFromEntity,
} from "./entity-type-inference.js"

// Storage utilities
export {
	createIndexedDBStorage,
	defaultStorageConfig,
	userInteractionsService,
	type StorageConfig,
	type StateStorage,
	type BookmarkRecord,
	type PageVisitRecord,
	type UserInteractionsService,
} from "./storage/index.js"
