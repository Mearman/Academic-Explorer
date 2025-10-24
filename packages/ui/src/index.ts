// Data Display Components
export { BaseTable, type BaseTableProps } from "./components/data-display/BaseTable"

// Layout Components
export {
	CollapsibleSection,
	type CollapsibleSectionProps,
} from "./components/layout/CollapsibleSection"

// Section Kit Components
export {
	SectionKit,
	SectionFrame,
	EntityCollectionList,
	BulkActionToolbar,
} from "./components/section-kit"
export type {
	SectionKitProps,
	SectionFrameProps,
	EntityCollectionListProps,
	BulkActionToolbarProps,
	FilterChip,
} from "./components/section-kit"

// Feedback Components
export { ErrorBoundary, type ErrorBoundaryProps } from "./components/feedback/ErrorBoundary"

// Moved React Components from utils package
export {
	LoadingState,
	ErrorState as LoadingErrorState,
	EmptyState,
	DataState,
	type LoadingStateProps,
	type ErrorStateProps as LoadingErrorStateProps,
	type EmptyStateProps,
	type DataStateProps,
} from "./components/ui/loading-states"

export {
	BaseFilter,
	createFilter,
	createEnumOptions,
	FILTER_WIDTHS,
	type FilterOperator,
	type FilterFieldConfig,
} from "./components/ui/filter-base"

export { BaseSearch, type BaseSearchProps } from "./components/ui/base-search"

export {
	BaseSection,
	SectionWithLoading,
	SectionWithError,
	type BaseSectionProps,
	type SectionWithLoadingProps,
	type SectionWithErrorProps,
} from "./components/ui/base-section"

export {
	ErrorHandling,
	type ErrorHandlingProps,
} from "./error-handling"

// React Context Store
export {
	createContextStore,
	createCombinedContext,
	createSimpleContext,
	createAsyncAction,
	type ContextStore,
	type ActionCreator,
} from "./react-context-store"

// React Hooks
export { useSearchState, type UseSearchStateProps } from "./hooks/use-search-state"
export { useEntityFetch, type UseEntityFetchProps } from "./hooks/use-entity-fetch"
export { useEntityRoute, type UseEntityRouteProps } from "./hooks/use-entity-route"
export { useAsyncOperation, type UseAsyncOperationProps } from "./hooks/use-async-operation"

// Entity View Components
export { FieldRenderer, RichEntityView } from "./components/entity-views"
export { ViewToggle, type ViewToggleProps } from "./components/ViewToggle"

// Entity Types Configuration
export {
	ENTITY_TYPE_CONFIGS,
	ENTITY_TYPE_OPTIONS,
	getEntityIconComponent,
	type EntityTypeConfig,
} from "./entity-types"

// Entity Card Components
export {
	AuthorCard,
	EntityCard,
	EntityCardGrid,
	FunderCard,
	InstitutionCard,
	PublisherCard,
	SourceCard,
	TopicCard,
	WorkCard,
	type AuthorCardProps,
	type EntityCardGridProps,
	type EntityCardProps,
	type FunderCardProps,
	type InstitutionCardProps,
	type PublisherCardProps,
	type SourceCardProps,
	type TopicCardProps,
	type WorkCardProps,
} from "./components/cards"

// Types
export * from "./types/common"

// Component category exports for tree-shaking
export * as Cards from "./components/cards"
export * as DataDisplay from "./components/data-display"
export * as Feedback from "./components/feedback"
export * as Layout from "./components/layout"

// Theme exports
export * from "./theme/tokens"
