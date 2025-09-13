# OpenAlex Query Builder Utilities

A comprehensive set of utilities for building OpenAlex API queries with type safety and validation.

## Overview

The Query Builder provides a fluent, type-safe interface for constructing OpenAlex API queries. It handles:

- **Type-safe filters** for all OpenAlex entity types
- **Array handling** with automatic OR logic using pipe separators
- **Date range validation** with normalization
- **Search query escaping** for special characters
- **Logical operators** for complex filter combinations
- **Utility functions** for manual query construction

## Quick Start

```typescript
import { createWorksQuery, buildSortString, SELECT_PRESETS } from './query-builder';

// Create a query for open access machine learning papers from 2023
const query = createWorksQuery()
  .addFilter('publication_year', 2023)
  .addFilter('is_oa', true)
  .addSearch('default.search', 'machine learning')
  .addFilter('cited_by_count', 10, '>');

// Get the filter string for the API
const filterString = query.buildFilterString();
// Result: "publication_year:2023,is_oa:true,default.search:\"machine learning\",cited_by_count:>10"

// Create complete API parameters
const apiParams = {
  filter: filterString,
  sort: buildSortString({ field: 'cited_by_count', direction: 'desc' }),
  select: SELECT_PRESETS.WORKS_DETAILED.join(','),
  per_page: 25
};
```

## Core Classes

### QueryBuilder<T>

The main class for building queries with method chaining:

```typescript
const query = new QueryBuilder<WorksFilters>()
  .addFilter('publication_year', 2023)
  .addFilters({ 'is_oa': true, 'has_doi': true })
  .addDateRange('from_publication_date', 'to_publication_date', '2023-01-01', '2023-12-31')
  .addSearch('title.search', 'artificial intelligence');
```

### Factory Functions

Type-specific query builders for convenience:

```typescript
// Specialized builders for each entity type
const worksQuery = createWorksQuery({ 'publication_year': 2023 });
const authorsQuery = createAuthorsQuery({ 'works_count': '>100' });
const sourcesQuery = createSourcesQuery({ 'is_oa': true });
// ... etc for all entity types
```

## Utility Functions

### buildFilterString(filters)

Converts filter objects to OpenAlex API format:

```typescript
const filters: WorksFilters = {
  'publication_year': 2023,
  'is_oa': true,
  'authorships.author.id': ['A1234', 'A5678'] // Becomes: A1234|A5678
};
const filterString = buildFilterString(filters);
// Result: "publication_year:2023,is_oa:true,authorships.author.id:A1234|A5678"
```

### buildSortString(sorts)

Handles sorting parameters:

```typescript
const sortString = buildSortString([
  { field: 'publication_year', direction: 'desc' },
  { field: 'cited_by_count', direction: 'desc' }
]);
// Result: "publication_year:desc,cited_by_count:desc"
```

### buildSelectString(fields)

Creates field selection strings:

```typescript
const selectString = buildSelectString(['id', 'display_name', 'publication_year']);
// Result: "id,display_name,publication_year"
```

### validateDateRange(from, to)

Validates and normalizes date ranges:

```typescript
const validation = validateDateRange('2020-01-01', '2023-12-31');
if (validation.isValid) {
  console.log('Valid range:', validation.normalizedFrom, 'to', validation.normalizedTo);
}
```

### escapeFilterValue(value)

Escapes special characters in filter values:

```typescript
const escaped = escapeFilterValue('machine "learning" & AI');
// Handles quotes, spaces, and special characters properly
```

## Constants

### SORT_FIELDS

Common sort field names:

```typescript
import { SORT_FIELDS } from './query-builder';

const sort = buildSortString({
  field: SORT_FIELDS.CITED_BY_COUNT,
  direction: 'desc'
});
```

### SELECT_PRESETS

Predefined field selection sets:

```typescript
import { SELECT_PRESETS } from './query-builder';

// Use predefined field selections
const basicFields = SELECT_PRESETS.BASIC; // ['id', 'display_name', 'cited_by_count']
const detailedFields = SELECT_PRESETS.WORKS_DETAILED; // Comprehensive field list
```

## Advanced Features

### Numeric Operators

Support for comparison operators:

```typescript
const query = createWorksQuery()
  .addFilter('cited_by_count', 100, '>') // Greater than
  .addFilter('publication_year', 2020, '>=') // Greater than or equal
  .addFilter('is_oa', false, '!='); // Not equal
```

### Array Handling

Arrays are automatically converted to OR logic:

```typescript
const query = createWorksQuery()
  .addFilter('authorships.author.id', ['A1234', 'A5678', 'A9012']);
// Result: authorships.author.id:A1234|A5678|A9012
```

### Date Range Handling

Automatic date validation and normalization:

```typescript
const query = createWorksQuery()
  .addDateRange('from_publication_date', 'to_publication_date',
    '2020-01-01T00:00:00Z', // ISO format
    '2023-12-31' // Simple format
  );
// Both dates normalized to YYYY-MM-DD format
```

### Query Chaining and Cloning

Build base queries and create variants:

```typescript
const baseQuery = createWorksQuery({ 'is_oa': true });

const recentQuery = baseQuery.clone()
  .addFilter('publication_year', 2023);

const highImpactQuery = baseQuery.clone()
  .addFilter('cited_by_count', 100, '>');
```

### Error Handling

Graceful handling of invalid inputs:

```typescript
const query = createWorksQuery()
  .addFilter('publication_year', null) // Ignored
  .addSearch('title.search', '') // Ignored
  .addFilter('cited_by_count', 0); // Valid zero value

// Invalid date ranges throw errors
try {
  query.addDateRange('from_date', 'to_date', '2023-12-31', '2020-01-01');
} catch (error) {
  console.error('Invalid date range:', error.message);
}
```

## Integration with OpenAlex Client

The query builder integrates seamlessly with the OpenAlex client:

```typescript
import { OpenAlexBaseClient } from '../client';
import { createWorksQuery, buildSortString, SELECT_PRESETS } from './query-builder';

const client = new OpenAlexBaseClient();

const query = createWorksQuery()
  .addFilter('publication_year', 2023)
  .addFilter('is_oa', true);

const params = {
  filter: query.buildFilterString(),
  sort: buildSortString({ field: 'cited_by_count', direction: 'desc' }),
  select: buildSelectString(SELECT_PRESETS.WORKS_DETAILED),
  per_page: 25
};

const response = await client.request('works', params);
```

## Examples

See `query-builder-examples.ts` for comprehensive usage examples including:

- Basic and complex queries
- Date range handling
- Error handling patterns
- Client integration
- Query chaining and modification

## Type Safety

All query builders are fully typed for their respective entity filters:

```typescript
// TypeScript will enforce valid field names and value types
const worksQuery = createWorksQuery()
  .addFilter('publication_year', 2023) // ✓ Valid
  .addFilter('invalid_field', 'value'); // ✗ TypeScript error

const authorsQuery = createAuthorsQuery()
  .addFilter('works_count', '>100') // ✓ Valid for authors
  .addFilter('publication_year', 2023); // ✗ Not valid for authors
```

This ensures compile-time validation of all query parameters and prevents runtime errors from invalid field names or value types.