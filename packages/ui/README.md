# @academic-explorer/ui

Reusable UI components for Academic Explorer built with Mantine and TanStack Table.

## Main Exports

- `BaseTable` - Feature-rich data table with sorting, filtering, and pagination
- `CollapsibleSection` - Expandable/collapsible content container
- `ErrorBoundary` - React error boundary for graceful error handling

## Usage

```tsx
import { BaseTable, CollapsibleSection, ErrorBoundary } from '@academic-explorer/ui';

// Data table with sorting and pagination
<>
  <BaseTable data={items} columns={columnDefs} pageSize={20} />

  {/* Collapsible content section */}
  <CollapsibleSection title="Details" defaultCollapsed={false}>
    <p>Content here...</p>
  </CollapsibleSection>
</>
```

## Package Exports

- Main: all components and types
- Tree-shaking: `DataDisplay`, `Layout`, `Feedback` namespaces