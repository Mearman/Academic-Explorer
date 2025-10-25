// State module re-export
export * from "./state"

// Cache utilities
export * from "./cache"

// Cache browser utilities
export { cacheBrowserService } from "./cache-browser"
export type {
	CachedEntityMetadata,
	CacheBrowserStats,
	EntityType,
	CacheBrowserFilters,
	CacheBrowserOptions,
	CacheBrowserResult,
} from "./cache-browser"

// Static data utilities - only export what's needed to avoid conflicts
export type {
	EntityType as StaticEntityType,
	DirectoryIndex,
	FileEntry,
} from "./static-data/cache-utilities"

// Logger
export { logger, logError } from "./logger"
export type { LogCategory } from "./logger"

// Utility functions
export {
	isNonEmptyString,
	isString,
	safeParseRelationType,
	safeParseExpansionTarget,
	type RelationType,
	type ExpansionTarget,
} from "./validation"

// Data utilities
export {
	debouncedSearch,
	isValidSearchQuery,
	normalizeSearchQuery,
	formatLargeNumber,
} from "./data"

// Worker message schemas and types
export * from "./workers/messages"

// Build info utilities
export {
	getBuildInfo,
	formatBuildTimestamp,
	getCommitUrl,
	getReleaseUrl,
	getRelativeBuildTime,
	type BuildInfo,
} from "./build-info"

// Entity route hook (moved to UI package)
// export {
// 	useEntityRoute,
// 	type EntityRouteConfig,
// 	type UseEntityRouteOptions,
// 	type UseEntityRouteResult,
// } from "./hooks/use-entity-route"

// Error handling utilities (moved to UI package)
// export {
// 	ErrorHandler,
// 	createErrorHandler,
// 	withErrorBoundary,
// 	type ErrorContext,
// 	type ErrorHandlerOptions,
// } from "./error-handling"

// Navigation utilities - temporarily excluded due to complex dependencies
// export { NavigationHelper, type NavigationConfig } from "./navigation"

// UI components and hooks moved to UI package
// export {
// 	LoadingState,
// 	ErrorState,
// 	EmptyState,
// 	type LoadingStateProps,
// 	type ErrorStateProps,
// 	type EmptyStateProps,
// } from "./ui/loading-states"

// UI components - base filters and form components
// export type { FilterOperator, FilterFieldConfig } from "./ui/filter-base"
// export { BaseFilter, createFilter, createEnumOptions, FILTER_WIDTHS } from "./ui/filter-base"

// Async operation hook and Data state moved to UI package
// These can be imported from @academic-explorer/ui

// Search state hook
// export {
// 	useSearchState,
// 	type UseSearchStateOptions,
// 	type UseSearchStateResult,
// 	type SearchFilters,
// } from "./hooks/use-search-state"

// Base search component
// export { BaseSearch, type BaseSearchProps } from "./ui/base-search"

// Entity fetching hooks with Zod validation
// Temporarily disabled due to circular dependency with client package
// export {
//   useEntityFetch,
//   useEntityList,
//   type UseEntityFetchOptions,
//   type UseEntityFetchResult,
// } from "./hooks/use-entity-fetch";

// Base section component
// export {
// 	BaseSection,
// 	SectionWithLoading,
// 	SectionWithError,
// 	type BaseSectionProps,
// 	type SectionWithLoadingProps,
// 	type SectionWithErrorProps,
// } from "./ui/base-section"

// Store utilities
export {
	createProgressUpdater,
	type BaseActivity,
	type ProgressTracking,
	type StatusTracking,
} from "./stores/activity-tracking"

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
} from "./data-evaluation"

// Entity type inference utilities
export {
	inferEntityType,
	inferEntityTypeFromOpenAlexId,
	inferEntityTypeFromExternalId,
	getEntityTypeFromEntity,
} from "./entity-type-inference"
