/**
 * Academic Explorer UI Package
 * Pure UI components built with Mantine and TypeScript
 */

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

// Data Components
export { DataState, type DataStateProps } from "./components/DataState"

// Hooks
export {
	useAsyncOperation,
	type AsyncOperationState,
	type AsyncOperationResult,
	type UseAsyncOperationOptions,
} from "./hooks/use-async-operation"

// Component category exports for tree-shaking
export * as DataDisplay from "./components/data-display"
export * as Feedback from "./components/feedback"
export * as Layout from "./components/layout"

// Re-export Mantine dependencies for peer dependencies
export type {
	MantineColor,
	MantineSize,
	MantineRadius,
	MantineTheme,
} from "@mantine/core"