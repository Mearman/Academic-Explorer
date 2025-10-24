// State module re-export
export * from "./state"

// Cache utilities
export * from "./cache"

// Cache browser utilities
export * from "./cache-browser"

// Logger
export { logger } from "./logger"

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

// Entity route hook
export {
	useEntityRoute,
	type EntityRouteConfig,
	type UseEntityRouteOptions,
	type UseEntityRouteResult,
} from "./hooks/use-entity-route"

// Error handling utilities
export {
	ErrorHandler,
	createErrorHandler,
	withErrorBoundary,
	type ErrorContext,
	type ErrorHandlerOptions,
} from "./error-handling"

// Navigation utilities
export { NavigationHelper, type NavigationConfig } from "./navigation"

// UI components - loading-states
export {
	LoadingState,
	ErrorState,
	EmptyState,
	DataState,
	type LoadingStateProps,
	type ErrorStateProps,
	type EmptyStateProps,
	type DataStateProps,
} from "./ui/loading-states"

// UI components - base filters and form components
export type { FilterOperator, FilterFieldConfig } from "./ui/filter-base"

export { BaseFilter, createFilter, createEnumOptions, FILTER_WIDTHS } from "./ui/filter-base"

// Async operation hook
export {
	useAsyncOperation,
	type AsyncOperationState,
	type AsyncOperationResult,
	type UseAsyncOperationOptions,
} from "./hooks/use-async-operation"

// Search state hook
export {
	useSearchState,
	type UseSearchStateOptions,
	type UseSearchStateResult,
	type SearchFilters,
} from "./hooks/use-search-state"

// Base search component
export { BaseSearch, type BaseSearchProps } from "./ui/base-search"

// Entity fetching hooks with Zod validation
// Temporarily disabled due to circular dependency with client package
// export {
//   useEntityFetch,
//   useEntityList,
//   type UseEntityFetchOptions,
//   type UseEntityFetchResult,
// } from "./hooks/use-entity-fetch";

// Base section component
export {
	BaseSection,
	SectionWithLoading,
	SectionWithError,
	type BaseSectionProps,
	type SectionWithLoadingProps,
	type SectionWithErrorProps,
} from "./ui/base-section"

// Store utilities
export {
	createProgressUpdater,
	type BaseActivity,
	type ProgressTracking,
	type StatusTracking,
} from "./stores/activity-tracking"

// Network tracking store temporarily disabled (uses Zustand, migrating to React Context)
// export {
//   useNetworkStore,
//   type NetworkRequest,
//   type NetworkStats,
// } from "./stores/network-tracking";

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
