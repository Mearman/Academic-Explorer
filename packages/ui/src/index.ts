// Minimal UI Package - Pure UI Components Only
// All business logic components with complex dependencies have been removed
// This package now only contains basic reusable UI components

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

// Component category exports for tree-shaking
// Note: Cards export removed as components were deleted due to complex dependencies
export * as DataDisplay from "./components/data-display"
export * as Feedback from "./components/feedback"
export * as Layout from "./components/layout"