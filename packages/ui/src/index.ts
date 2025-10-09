// Data Display Components
export {
  BaseTable,
  type BaseTableProps,
} from "./components/data-display/BaseTable";

// Layout Components
export {
  CollapsibleSection,
  type CollapsibleSectionProps,
} from "./components/layout/CollapsibleSection";

// Feedback Components
export {
  ErrorBoundary,
  type ErrorBoundaryProps,
} from "./components/feedback/ErrorBoundary";

// Entity View Components
export { RichEntityView, FieldRenderer } from "./components/entity-views";
export { ViewToggle, type ViewToggleProps } from "./components/ViewToggle";

// Entity Card Components
export {
  EntityCard,
  type EntityCardProps,
  WorkCard,
  type WorkCardProps,
  AuthorCard,
  type AuthorCardProps,
  SourceCard,
  type SourceCardProps,
  InstitutionCard,
  type InstitutionCardProps,
  TopicCard,
  type TopicCardProps,
  PublisherCard,
  type PublisherCardProps,
  FunderCard,
  type FunderCardProps,
  EntityCardGrid,
  type EntityCardGridProps,
} from "./components/cards";

// Types
export * from "./types/common";

// Component category exports for tree-shaking
export * as DataDisplay from "./components/data-display";
export * as Layout from "./components/layout";
export * as Feedback from "./components/feedback";
export * as Cards from "./components/cards";
