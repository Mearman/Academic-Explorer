# @academic-explorer/ui

Reusable UI components for Academic Explorer built with Mantine and TanStack Table.

## Main Exports

- `BaseTable` - Feature-rich data table with sorting, filtering, and pagination
- `CollapsibleSection` - Expandable/collapsible content container
- `ErrorBoundary` - React error boundary for graceful error handling
- **Section Kit** - DRY components for consistent section layouts:
  - `SectionFrame` - Standardized section container with title, icon, and actions
  - `EntityCollectionList` - Reusable list component for entity collections
  - `BulkActionToolbar` - Toolbar for bulk operations on selected items
- **Theme System** - Centralized design tokens and styling utilities

## Usage

```tsx
import {
  BaseTable,
  CollapsibleSection,
  ErrorBoundary,
  SectionFrame,
  EntityCollectionList
} from '@academic-explorer/ui';

// Data table with sorting and pagination
<BaseTable data={items} columns={columnDefs} pageSize={20} />

// Standardized section layout (DRY pattern)
<SectionFrame title="Network Nodes" icon={<IconNetwork />}>
  <EntityCollectionList
    entities={nodes}
    onSelect={handleSelection}
    renderItem={(node) => <NodeItem node={node} />}
  />
</SectionFrame>

// Collapsible content section
<CollapsibleSection title="Details" defaultCollapsed={false}>
  <p>Content here...</p>
</CollapsibleSection>
```

## Package Exports

- Main: all components and types
- Tree-shaking: `DataDisplay`, `Layout`, `Feedback`, `SectionKit` namespaces
