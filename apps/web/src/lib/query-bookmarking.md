# Query Bookmarking Implementation

This document describes the query bookmarking functionality implemented for Academic Explorer, which allows users to bookmark complex OpenAlex API queries while intelligently handling pagination parameters.

## Overview

The query bookmarking system extends the existing bookmark infrastructure to support complex queries with the following key features:

- **Pagination-aware filtering**: Automatically excludes pagination parameters (`page`, `per_page`, `cursor`, `sample`, `seed`) from bookmark identification
- **Semantic query matching**: Two queries are considered equivalent if they have the same semantic parameters, regardless of pagination state
- **Unified API URL storage**: Uses the existing API URL-based bookmark system for consistency
- **Dual bookmarking support**: Entity pages support both entity bookmarks and query bookmarks

## Architecture

### Core Components

1. **Query Bookmarking Library** (`/lib/query-bookmarking.ts`)
   - Core logic for filtering pagination parameters
   - Query ID generation and equivalence checking
   - Title generation and URL construction

2. **Query Bookmarking Hook** (`/hooks/use-query-bookmarking.ts`)
   - React hook that integrates query bookmarking with the UI
   - Provides bookmark status and actions for current query
   - Handles bookmark creation and deletion

3. **Query Bookmark Button** (`/components/QueryBookmarkButton.tsx`)
   - Reusable button component for query bookmarking
   - Shows bookmark status and handles toggle actions
   - Includes loading states and tooltips

4. **Enhanced Entity List** (`/components/EntityListWithQueryBookmarking.tsx`)
   - Wrapper around EntityList with integrated query bookmarking
   - Shows query information and bookmark controls
   - Supports multiple bookmark button positions

### Integration Points

- **Entity List Pages**: Works, Authors, Sources, etc. now show query bookmark buttons
- **Entity Detail Pages**: Support both entity and query bookmarking (when query parameters exist)
- **Existing Bookmark System**: Uses `userInteractionsService` and `bookmarkEventEmitter`

## URL Examples and Bookmark Behavior

### Example 1: Filtered Works List
```
URL: http://localhost:5173/#/works?filter=author.id:A5017898742&page=2&per_page=25

Bookmark Stored: https://api.openalex.org/works?filter=author.id:A5017898742
Title: "Works by author sorted publication_date:desc"
```

### Example 2: Author with Select Parameters
```
URL: http://localhost:5173/#/authors/A5017898742?select=id,display_name,works_count

Bookmark Stored: https://api.openalex.org/authors/A5017898742?select=id,display_name,works_count
Title: "John Doe (Query)"
```

### Example 3: Complex Search Query
```
URL: http://localhost:5173/#/works?search=machine%20learning&filter=publication_year:2023&sort=cited_by_count:desc&group_by=year

Bookmark Stored: https://api.openalex.org/works?search=machine%20learning&filter=publication_year:2023&sort=cited_by_count:desc&group_by=year
Title: "Works \"machine learning\" filtered by year sorted cited_by_count:desc grouped by year"
```

## Parameter Handling

### Pagination Parameters (Excluded from Bookmark ID)
- `page`: Current page number
- `per_page`: Results per page
- `cursor`: Pagination cursor
- `sample`: Sample size
- `seed`: Random seed for sampling

### Semantic Parameters (Included in Bookmark ID)
- `filter`: OpenAlex filter expressions
- `search`: Full-text search query
- `sort`: Sort order
- `group_by`: Grouping parameter
- `mailto`: Email for API access

## Usage in Components

### Entity List Integration
```tsx
import { EntityListWithQueryBookmarking } from "@/components/EntityListWithQueryBookmarking";

function WorksListRoute() {
  const search = useSearch({ from: "/works/" }) as OpenAlexSearchParams;

  return (
    <EntityListWithQueryBookmarking
      entityType="works"
      columns={worksColumns}
      searchParams={search}
      showBookmarkButton={true}
      bookmarkButtonPosition="header"
    />
  );
}
```

### Query Bookmark Button
```tsx
import { QueryBookmarkButton } from "@/components/QueryBookmarkButton";

function MyComponent() {
  return (
    <QueryBookmarkButton
      entityType="works"
      entityId="W123456789"
      size="sm"
      showLabel={false}
      onBookmark={() => console.log("Bookmarked!")}
    />
  );
}
```

### Custom Query Bookmarking
```tsx
import { useQueryBookmarking } from "@/hooks/use-query-bookmarking";

function MyCustomComponent() {
  const {
    isQueryBookmarked,
    bookmarkCurrentQuery,
    unbookmarkCurrentQuery,
    currentQueryParams,
    queryId
  } = useQueryBookmarking({
    entityType: "works",
    entityId: "W123456789"
  });

  return (
    <button onClick={() =>
      isQueryBookmarked
        ? unbookmarkCurrentQuery()
        : bookmarkCurrentQuery({ title: "Custom Title" })
    }>
      {isQueryBookmarked ? "Bookmarked" : "Bookmark"}
    </button>
  );
}
```

## Testing

The query bookmarking functionality includes comprehensive tests covering:

- Parameter filtering logic
- Query ID generation and consistency
- Query equivalence detection
- Title generation
- Edge cases and error handling

Run tests with:
```bash
pnpm test lib/__tests__/query-bookmarking.test.ts
```

## Database Storage

Query bookmarks are stored using the existing bookmark system:

- **Table**: `bookmarks` in IndexedDB
- **Request Format**: `StoredNormalizedRequest` with API URL as cacheKey
- **Tags**: Automatic tagging with entity type and "query" category
- **Event System**: Real-time updates via `bookmarkEventEmitter`

## Future Enhancements

Potential improvements to the query bookmarking system:

1. **Query Templates**: Save query parameter templates for reuse
2. **Bulk Query Operations**: Apply/remove multiple query bookmarks at once
3. **Query Sharing**: Export/import query bookmarks
4. **Query Analytics**: Track query bookmark usage patterns
5. **Smart Suggestions**: Recommend related queries based on bookmarks

## Technical Notes

- **Hash-based Routing**: Works with TanStack Router's hash-based routing for GitHub Pages
- **TypeScript Support**: Full type safety with Zod schemas for parameter validation
- **Performance**: Efficient query parameter filtering and memoization
- **Compatibility**: Fully backward compatible with existing entity bookmarks
- **Error Handling**: Graceful degradation and comprehensive error logging

## Migration Guide

No migration is required for existing bookmarks. The new query bookmarking system:

1. **Preserves existing bookmarks**: All current entity bookmarks continue to work
2. **Extends functionality**: Adds new query-specific bookmarking capabilities
3. **Maintains consistency**: Uses same storage and event systems
4. **Incremental adoption**: Can be enabled per-component as needed