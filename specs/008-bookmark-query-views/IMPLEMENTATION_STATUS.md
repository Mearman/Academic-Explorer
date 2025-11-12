# Bookmark Query Views - Implementation Status

**Feature Branch**: `008-bookmark-query-views`
**Last Updated**: 2025-11-12
**Status**: Foundation Complete (Phase 1 & 2) - Ready for UI Implementation

## 📊 Progress Overview

**Completed**: 8/55 tasks (15%)
**Commit**: `116be5553` - feat(bookmarks): implement foundational bookmark infrastructure

### Phase Completion

- ✅ **Phase 1 - Setup**: 2/3 tasks (67%)
- ✅ **Phase 2 - Foundational**: 6/6 tasks (100%)
- ⏳ **Phase 3 - User Story 1**: 0/14 tasks (0%)
- ⏳ **Phase 4 - User Story 2**: 0/6 tasks (0%)
- ⏳ **Phase 5 - User Story 3**: 0/10 tasks (0%)
- ⏳ **Phase 6 - Polish**: 0/10 tasks (0%)

## ✅ What's Been Built

### 1. Type System (`packages/types/src/`)

**File**: `bookmark.ts`
```typescript
interface BookmarkMetadata {
  url: string
  title: string
  entityType?: EntityType
  entityId?: string
  queryParams?: Record<string, string>
  selectFields?: string[]
  tags?: string[]
  timestamp: Date
}

interface Bookmark extends CatalogueEntity {
  metadata: BookmarkMetadata
}
```

**Validation**: Full Zod schemas with runtime validation

### 2. Error Handling (`packages/types/src/errors/`)

**File**: `bookmark-errors.ts`

5 error classes:
- `BookmarkNotFoundError`
- `BookmarkValidationError`
- `BookmarkStorageError`
- `DuplicateBookmarkError`
- `BookmarkLimitExceededError`

2 validation functions:
- `validateBookmarkMetadata(metadata: unknown): void`
- `validateBookmarkUrl(url: string): void`

### 3. URL Utilities (`packages/utils/src/`)

**File**: `url-parser.ts` (28 tests ✅)

Functions:
- `parseURL(urlString: string): ParsedURL` - Extracts URL components, query params, entity type/ID
- `extractSelectFields(input: string): string[]` - Parses select parameter
- `reconstructURL(basePath, queryParams?, selectFields?): string` - Rebuilds URL (OpenAlex compliant)

**File**: `entity-detector.ts` (30 tests ✅)

Functions:
- `detectEntityTypeFromURL(url: string): EntityType | undefined`
- `extractEntityId(url: string, entityType: EntityType): string | undefined`
- `isEntityPage(url: string): boolean`
- `parseEntityUrl(url: string): { entityType, entityId }`

### 4. Router Structure (`apps/web/src/routes/bookmarks/`)

**Files**:
- `index.tsx` - Route definition with TanStack Router
- `index.lazy.tsx` - Lazy-loaded component skeleton (TODO comments for implementation)

**Route**: `/bookmarks/`

### 5. Storage Verification

**Result**: ✅ Production-ready

The `CatalogueStorageProvider` interface already has complete bookmark support:
- `addBookmark(params)` - Add entity to bookmarks list
- `removeBookmark(entityRecordId)` - Remove bookmark
- `getBookmarks()` - Get all bookmarked entities
- `isBookmarked(entityType, entityId)` - Check bookmark status
- `initializeSpecialLists()` - Creates special system lists including bookmarks

**Special List ID**: `"bookmarks-list"` (constant: `SPECIAL_LIST_IDS.BOOKMARKS`)

## 🎯 What Needs to Be Built (47 tasks)

### Phase 3: User Story 1 - Core Bookmarking (14 tasks)

**Goal**: Enable users to bookmark entity/query pages and view their bookmarks

#### UI Components Needed

1. **BookmarkButton** (`packages/ui/src/bookmarks/BookmarkButton.tsx`)
   - Toggle button for bookmark state
   - Handles click to add/remove bookmark
   - Shows active/inactive state
   - Accessibility support

2. **BookmarkIcon** (`packages/ui/src/bookmarks/BookmarkIcon.tsx`)
   - Visual icon component
   - Active state (filled bookmark icon)
   - Inactive state (outline bookmark icon)
   - Animation on state change

3. **BookmarkList** (`packages/ui/src/bookmarks/BookmarkList.tsx`)
   - Display list of all bookmarks
   - Group by entity type
   - Sort by date/title
   - Virtualization for performance

4. **BookmarkListItem** (`packages/ui/src/bookmarks/BookmarkListItem.tsx`)
   - Single bookmark display
   - Entity type badge
   - Delete button
   - Click to navigate to bookmarked page
   - Show timestamp

5. **EntityTypeBadge** (`packages/ui/src/bookmarks/EntityTypeBadge.tsx`)
   - Visual badge showing entity type (Works, Authors, etc.)
   - Color-coded by type

#### Services & Hooks Needed

6. **useBookmarks** (`apps/web/src/hooks/useBookmarks.ts`)
   - React hook for bookmark operations
   - Uses `CatalogueStorageProvider`
   - Returns: `{ bookmarks, addBookmark, removeBookmark, isBookmarked, loading, error }`
   - Reactive updates when bookmarks change

7. **bookmark-service.ts** (`apps/web/src/services/bookmark-service.ts`)
   - Business logic for bookmark operations
   - URL parsing and metadata extraction
   - Integration with storage provider
   - Error handling and validation

#### Integration Points

8. **Entity Page Layouts** (`apps/web/src/components/layouts/EntityLayout.tsx`)
   - Add BookmarkButton to page header/toolbar
   - Pass current entity type and ID
   - Show bookmark state

9. **Search Results** (`apps/web/src/routes/search/index.tsx`)
   - Add BookmarkButton to each result item
   - Handle bookmarking query pages

10. **Bookmarks Route** (`apps/web/src/routes/bookmarks/index.lazy.tsx`)
    - Implement full bookmarks catalogue view
    - Use `CatalogueManager` component with bookmarks list
    - Empty state when no bookmarks
    - Navigation to bookmarked entities

#### Utilities

11. **Date Formatter** (`packages/utils/src/formatters/date-formatter.ts`)
    - Format bookmark timestamps
    - Relative time display ("2 hours ago")
    - Absolute time display

### Phase 4: User Story 2 - Custom Field Views (6 tasks)

**Goal**: Preserve and restore custom field selections (select parameter)

1. Extend bookmark model to store select parameters (already done in T001)
2. Update URL parameter extraction (already handles select in T007)
3. Add field summary generation utility
4. Display field selection preview in bookmark list
5. Restore select parameter when navigating to bookmark
6. Handle multiple bookmarks for same entity with different field selections

### Phase 5: User Story 3 - Organization & Search (10 tasks)

**Goal**: Tag, search, and filter large bookmark collections

1. Tag input component
2. Tag badge component
3. Tag storage in bookmark entity
4. Search functionality
5. Search input UI
6. Entity type filter
7. Tag filter
8. Sort options
9. Export functionality
10. Export button UI

### Phase 6: Polish & Compliance (10 tasks)

**Goal**: Performance, error handling, and constitution compliance

1. Keyboard shortcuts (Cmd+D to bookmark)
2. List virtualization for large collections
3. Loading states and optimistic UI
4. Error handling and recovery
5. Bookmark count badge
6. Accessibility audit
7. Documentation
8. Performance optimization (cache URL parsing)
9. Analytics tracking
10. Constitution compliance verification

## 🔧 Technical Details

### Storage Provider Methods

Already implemented and tested:

```typescript
// Initialize special lists (including bookmarks)
await provider.initializeSpecialLists()

// Add bookmark
const recordId = await provider.addBookmark({
  entityType: 'works',
  entityId: 'W2741809807',
  url: 'https://openalex.org/W2741809807',
  title: 'Paper Title',
  notes: 'Optional notes'
})

// Check if bookmarked
const isBookmarked = await provider.isBookmarked('works', 'W2741809807')

// Get all bookmarks
const bookmarks = await provider.getBookmarks()

// Remove bookmark
await provider.removeBookmark(recordId)
```

### URL Parsing Examples

```typescript
import { parseURL, reconstructURL } from '@academic-explorer/utils'

// Parse current page URL
const parsed = parseURL(window.location.href)
// {
//   url: "/works/W123?select=id,title&filter=is_oa:true",
//   basePath: "/works/W123",
//   queryParams: { select: "id,title", filter: "is_oa:true" },
//   selectFields: ["id", "title"],
//   entityType: "works",
//   entityId: "W123"
// }

// Reconstruct URL with select parameter
const url = reconstructURL('/works/W123', {}, ['id', 'title'])
// "/works/W123?select=id,title" (commas NOT encoded for OpenAlex)
```

### Entity Type Detection

```typescript
import { detectEntityTypeFromURL, isEntityPage } from '@academic-explorer/utils'

detectEntityTypeFromURL('/works/W123') // 'works'
detectEntityTypeFromURL('/authors/A456') // 'authors'
detectEntityTypeFromURL('/works?filter=...') // undefined (query page)

isEntityPage('/works/W123') // true
isEntityPage('/works') // false (listing page)
```

## 📝 Implementation Guidelines

### UI Component Patterns

All UI components should:
1. Use Mantine UI library for consistency
2. Follow Vanilla Extract for styling
3. Include proper TypeScript types (no `any`)
4. Have accessibility attributes (ARIA labels, roles)
5. Include loading and error states
6. Use `data-testid` for E2E testing

### State Management

Bookmarks should use:
1. `useBookmarks` hook for reactive state
2. Zustand store if global state needed
3. localStorage for persistence (via CatalogueStorageProvider)
4. Event emitter for cross-component updates

### Testing Strategy

Each component/service should have:
1. Unit tests (Vitest)
2. Integration tests for bookmark operations
3. E2E tests for full user flows (Playwright)
4. Tests written FIRST (TDD approach)

### Commit Strategy

Follow atomic commits:
```bash
feat(ui): add BookmarkButton component
feat(hooks): implement useBookmarks hook
feat(web): integrate bookmarks with entity pages
```

## 🚀 Recommended Implementation Order

### Iteration 1: Core Functionality (MVP)

1. `useBookmarks` hook - Foundation for all bookmark operations
2. `bookmark-service.ts` - Business logic layer
3. `BookmarkButton` + `BookmarkIcon` - Basic UI
4. Integration with entity pages - Make bookmarking work
5. Basic `BookmarkList` - View saved bookmarks
6. Bookmarks route implementation - Access bookmarks

**Deliverable**: Users can bookmark pages and see their bookmarks

### Iteration 2: Polish Core Features

7. `BookmarkListItem` with delete functionality
8. `EntityTypeBadge` for visual organization
9. `date-formatter` utility
10. Empty states and loading states
11. Error handling

**Deliverable**: Polished bookmark management experience

### Iteration 3: Enhanced Features

12-17. User Story 2 tasks (custom field views)
18-27. User Story 3 tasks (tags, search, filters)

**Deliverable**: Power user features

### Iteration 4: Production Ready

28-37. Phase 6 tasks (performance, accessibility, compliance)

**Deliverable**: Production-grade feature

## 📚 Reference Documentation

- **Spec**: `specs/008-bookmark-query-views/spec.md`
- **Tasks**: `specs/008-bookmark-query-views/tasks.md`
- **Constitution**: `.specify/memory/constitution.md`
- **Storage Provider**: `packages/utils/src/storage/catalogue-storage-provider.ts`
- **Existing Catalogue UI**: `apps/web/src/components/CatalogueManager.tsx` (reference for bookmarks view)

## ✅ Next Session Checklist

Before starting implementation:

- [ ] Review foundation code (types, utilities, errors)
- [ ] Run tests to verify foundation: `pnpm test`
- [ ] Check storage provider methods in dev console
- [ ] Review `CatalogueManager` component for UI patterns
- [ ] Review Mantine UI documentation for button/list components
- [ ] Plan bookmark button placement in entity pages

To start implementation:

```bash
# 1. Pull latest code
git pull origin 008-bookmark-query-views

# 2. Run tests
pnpm test

# 3. Start dev server (generates TanStack Router types)
pnpm dev

# 4. Begin with useBookmarks hook
# File: apps/web/src/hooks/useBookmarks.ts
```

## 🐛 Known Issues

1. **TanStack Router Types**: Routes will generate types automatically when dev server runs. The `/bookmarks/` route is defined but types need regeneration.

2. **OpenAlex Data Files**: Some autocomplete data files were modified but not committed. These are unrelated to bookmarks and can be ignored or committed separately.

## 💡 Tips

- Leverage existing catalogue system - bookmarks are just a special catalogue list
- Reuse `CatalogueManager` component patterns for the bookmarks view
- The storage provider is production-ready - no modifications needed
- All URL handling is done - just use the utility functions
- Follow Test-First: Write failing tests, then implement
