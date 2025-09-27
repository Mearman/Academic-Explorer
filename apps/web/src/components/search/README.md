# Visual Query Builder Component

A drag-and-drop visual query builder for creating complex search queries in the Academic Explorer application.

## Overview

The `VisualQueryBuilder` component provides an intuitive interface for building complex search queries through visual drag-and-drop interactions. Users can drag filter "chips" from a palette into query groups and combine them with logical operators (AND/OR/NOT) to create sophisticated search queries.

## Features

- **Drag-and-Drop Interface**: Intuitive chip-based query building
- **Entity-Specific Filters**: Automatically adapts filter options based on entity type
- **Logical Operators**: Support for AND, OR, and NOT operations
- **Multiple Query Groups**: Organize filters into logical groups
- **Real-time Updates**: Immediate feedback as queries are built
- **TypeScript Support**: Fully typed for excellent developer experience
- **Accessible**: Keyboard navigation and screen reader support
- **Mantine Integration**: Consistent with the application's design system

## Usage

```tsx
import { VisualQueryBuilder, type VisualQuery } from './VisualQueryBuilder';

function MyComponent() {
  const [query, setQuery] = useState<VisualQuery | null>(null);

  const handleQueryChange = (newQuery: VisualQuery) => {
    setQuery(newQuery);
  };

  const handleApplyQuery = (query: VisualQuery) => {
    // Execute the query against OpenAlex API
    console.log('Executing query:', query);
  };

  return (
    <VisualQueryBuilder
      entityType="works"
      onQueryChange={handleQueryChange}
      onApply={handleApplyQuery}
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `entityType` | `EntityType` | Yes | The type of entity to build queries for (works, authors, sources, etc.) |
| `initialQuery` | `VisualQuery` | No | Initial query structure to load |
| `onQueryChange` | `(query: VisualQuery) => void` | No | Callback fired when the query structure changes |
| `onApply` | `(query: VisualQuery) => void` | No | Callback fired when the user applies the query |
| `disabled` | `boolean` | No | Disables all interactions |
| `compact` | `boolean` | No | Renders in compact mode |

## Query Structure

The component works with a structured query format:

```typescript
interface VisualQuery {
  id: string;
  groups: QueryGroup[];
  entityType: EntityType;
  name?: string;
  description?: string;
}

interface QueryGroup {
  id: string;
  operator: LogicalOperator; // "AND" | "OR" | "NOT"
  chips: QueryFilterChip[];
  label?: string;
  enabled: boolean;
}

interface QueryFilterChip {
  id: string;
  type: "field" | "operator" | "value";
  field?: string;
  operator?: FilterOperator;
  value?: unknown;
  label: string;
  category: QueryChipCategory;
  entityType?: EntityType;
  dataType: QueryDataType;
  enabled: boolean;
}
```

## Filter Categories

The component organizes filter chips into logical categories:

- **General**: Basic operators (equals, contains, etc.)
- **Temporal**: Date and time-related filters
- **Entity**: Entity-specific fields and relationships
- **Text**: Text search and content filters
- **Numeric**: Numerical comparison filters
- **Boolean**: True/false toggle filters

## Entity-Specific Filters

Different entity types expose different filter options:

### Works
- Title/Name, Publication Year, Citation Count
- Work Type, Concepts, Open Access status
- Publication date ranges, journal information

### Authors
- Name, Works Count, H-Index
- Institution affiliations, research areas
- Publication patterns, collaboration networks

### Sources
- Journal name, ISSN, Publisher
- Impact metrics, publication frequency
- Subject areas, geographical coverage

## Accessibility

The component follows WCAG 2.1 AA guidelines:

- Full keyboard navigation support
- Screen reader compatible drag-and-drop
- High contrast color schemes
- Focus management and visual indicators
- ARIA labels and descriptions

## Integration with OpenAlex API

While the component only provides the visual interface, you can convert the query structure to OpenAlex API parameters:

```typescript
function convertToOpenAlexParams(query: VisualQuery): Record<string, unknown> {
  // Implementation depends on your specific filtering needs
  // See VisualQueryBuilder.example.tsx for a basic conversion example
}
```

## Styling and Theming

The component uses Mantine's theming system and can be customized through:

- Mantine theme overrides
- CSS-in-JS styling with vanilla-extract
- Custom color schemes for different chip categories
- Responsive design tokens

## Testing

The component includes comprehensive tests covering:

- Rendering with different entity types
- Drag-and-drop interactions
- Query structure changes
- Accessibility features
- Error handling

Run tests with:
```bash
pnpm test src/components/search/VisualQueryBuilder.component.test.tsx
```

## Performance Considerations

- Efficient drag-and-drop with minimal re-renders
- Memoized chip components for large filter sets
- Debounced query change notifications
- Lazy loading of entity-specific filter options

## Browser Support

- Modern browsers with ES2020+ support
- Requires JavaScript enabled for drag-and-drop functionality
- Graceful degradation for users with disabilities
- Mobile touch support for drag operations