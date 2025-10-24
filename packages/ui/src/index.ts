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
