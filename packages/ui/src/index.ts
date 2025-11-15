/**
 * Academic Explorer UI Package
 * Pure UI components built with Mantine and TypeScript
 */

// Atoms - Foundational Components
export { Badge, type BadgeProps } from "./atoms/Badge";

// Entity View Components
export { RichEntityView } from "./components/entity-views";
export type { RichEntityViewProps } from "./components/entity-views";

// Entity View Matchers
export {
	createMatcher,
	defaultMatchers,
	convertToRelativeUrl,
	type EntityMatcher,
} from "./components/entity-views/matchers";

// View Toggle Component
export { ViewToggle, type ViewToggleProps } from "./components/ViewToggle";

// Data Display Components
export { BaseTable, type BaseTableProps } from "./components/data-display/BaseTable"
export { EntityCard, type EntityCardProps } from "./components/data-display/EntityCard"

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

// Bookmark Components
export { BookmarkButton, type BookmarkButtonProps } from "./bookmarks/BookmarkButton"
export { BookmarkIcon, type BookmarkIconProps } from "./bookmarks/BookmarkIcon"
export { BookmarkList, type BookmarkListProps } from "./bookmarks/BookmarkList"
export { BookmarkListItem, type BookmarkListItemProps } from "./bookmarks/BookmarkListItem"
export { EntityTypeBadge, type EntityTypeBadgeProps } from "./bookmarks/EntityTypeBadge"
export {
	FieldSelectionPreview,
	CompactFieldBadge,
	type FieldSelectionPreviewProps,
} from "./bookmarks/FieldSelectionPreview"
export { TagInput, type TagInputProps } from "./bookmarks/TagInput"
export { TagBadge, TagList, type TagBadgeProps, type TagListProps } from "./bookmarks/TagBadge"
export {
	BookmarkSearchFilters,
	type BookmarkSearchFiltersProps,
} from "./bookmarks/BookmarkSearchFilters"

// Hooks
export {
	useAsyncOperation,
	type AsyncOperationState,
	type AsyncOperationResult,
	type UseAsyncOperationOptions,
} from "./hooks/use-async-operation"

// Settings Components
export { XpacToggle, type XpacToggleProps } from "./components/settings/XpacToggle"

// Component category exports for tree-shaking
export * as Atoms from "./atoms"
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