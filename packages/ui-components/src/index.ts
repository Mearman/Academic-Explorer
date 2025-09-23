// Data Display Components
export { BaseTable, type BaseTableProps } from './components/data-display/BaseTable';

// Layout Components
export { CollapsibleSection, type CollapsibleSectionProps } from './components/layout/CollapsibleSection';

// Feedback Components
export { ErrorBoundary, type ErrorBoundaryProps } from './components/feedback/ErrorBoundary';

// Types
export * from './types/common';

// Component category exports for tree-shaking
export * as DataDisplay from './components/data-display';
export * as Layout from './components/layout';
export * as Feedback from './components/feedback';