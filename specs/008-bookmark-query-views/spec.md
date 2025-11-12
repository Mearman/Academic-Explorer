# Feature Specification: Bookmark Query Views

**Feature Branch**: `008-bookmark-query-views`
**Created**: 2025-11-12
**Status**: Draft
**Input**: User description: "the ability to bookmark any page that corresponds to an entity or query. as well separately query views of that entity or query, such as with the select parameter"

## User Scenarios & Testing

### User Story 1 - Bookmark Entity and Query Pages (Priority: P1)

Researchers need to save and quickly return to specific entity pages (works, authors, institutions) and search query results they frequently reference during literature reviews.

**Why this priority**: Core functionality - enables researchers to build personal research trails and quickly access frequently-used data without re-searching or re-navigating complex URL structures.

**Independent Test**: Can be fully tested by bookmarking an entity page (e.g., author profile), closing the browser, reopening, and navigating to the bookmark. Delivers immediate value by eliminating repetitive searches.

**Acceptance Scenarios**:

1. **Given** a user views a work detail page, **When** they click the bookmark button, **Then** the page is saved to their Bookmarks catalogue with title and timestamp
2. **Given** a user performs a search query, **When** they bookmark the results page, **Then** the exact query parameters and filters are preserved in the bookmark entry within the Bookmarks catalogue
3. **Given** a user has bookmarked pages, **When** they open the Bookmarks catalogue, **Then** they see a list of all bookmarked items organized by entity type and date

---

### User Story 2 - Bookmark Custom Field Views (Priority: P2)

Researchers working with specific data subsets need to bookmark entity pages with custom field selections (using the `select` parameter) to focus on relevant metadata without visual clutter.

**Why this priority**: Enhances usability for advanced users who craft specific views of entities. Important for specialized workflows but builds on P1 core bookmarking.

**Independent Test**: Can be tested by visiting an author page with a custom select parameter (e.g., `?select=display_name,works_count`), bookmarking it, and verifying the custom view is restored when accessing the bookmark.

**Acceptance Scenarios**:

1. **Given** a user views an entity with custom field selection, **When** they bookmark the page, **Then** the select parameter is preserved in the bookmark entry within the catalogue
2. **Given** a user accesses a bookmark with custom fields from the catalogue, **When** the page loads, **Then** only the specified fields are displayed matching the bookmarked view
3. **Given** a user has multiple bookmarks for the same entity with different field selections in the catalogue, **When** viewing the Bookmarks catalogue, **Then** each bookmark shows a preview of which fields are included

---

### User Story 3 - Organize and Search Bookmarks (Priority: P3)

Researchers with large bookmark collections need to organize, tag, search, and filter bookmarks to quickly find specific saved items within their research workflow.

**Why this priority**: Quality-of-life feature that scales bookmark utility for power users. Less critical than basic bookmark creation and retrieval but improves long-term usability.

**Independent Test**: Can be tested by creating 20+ bookmarks, adding tags, then searching/filtering by tag, entity type, or keyword. Delivers value by making large bookmark sets manageable.

**Acceptance Scenarios**:

1. **Given** a user has multiple bookmarks in the catalogue, **When** they add custom tags to bookmarks, **Then** they can filter the Bookmarks catalogue by tag
2. **Given** a user searches the Bookmarks catalogue, **When** they enter keywords, **Then** results show bookmarks matching title, URL, or tags
3. **Given** a user has bookmarks across entity types in the catalogue, **When** they filter by entity type, **Then** only bookmarks for that entity type are displayed

---

### Edge Cases

- What happens when a bookmarked entity or query returns no results or errors (e.g., entity deleted, API changes)?
- How does the system handle bookmarks with very long or complex URLs containing many parameters?
- What happens when a user bookmarks the same page multiple times?
- How are bookmarks migrated or exported if a user switches browsers or devices?
- What happens when query parameters in a bookmarked URL become invalid due to API changes?
- How does the system handle bookmark storage limits (e.g., browser storage quotas)?
- What happens when a bookmark references an entity ID that no longer exists in the data source?

## Requirements

### Functional Requirements

#### Core Bookmarking (P1 - MVP)

- **FR-001**: Users MUST be able to bookmark any entity detail page (works, authors, sources, institutions, publishers, funders, topics)
- **FR-002**: Users MUST be able to bookmark search query pages with all filter and sort parameters preserved
- **FR-003**: System MUST capture the complete URL including all query parameters when creating a bookmark
- **FR-004**: System MUST store bookmark title, URL, timestamp, and entity type for each bookmark
- **FR-005**: Users MUST be able to view a list of all their bookmarks
- **FR-006**: Users MUST be able to access bookmarked pages by clicking on bookmarks in the list
- **FR-007**: Users MUST be able to delete individual bookmarks

#### Custom View Bookmarking (P2 - Enhanced)

- **FR-008**: System MUST preserve the `select` query parameter when bookmarking entity pages with custom field views
- **FR-009**: System MUST restore the exact field selection when navigating to a bookmark with custom fields
- **FR-010**: System MUST display a field summary or indicator in the bookmark list showing which fields are included in custom views
- **FR-011**: Users MUST be able to bookmark multiple views of the same entity with different field selections

#### Bookmark Organization (P3 - Advanced)

- **FR-012**: Users MUST be able to add custom tags to bookmarks
- **FR-013**: Users MUST be able to search bookmarks by title, URL, or tags
- **FR-014**: Users MUST be able to filter bookmarks by entity type
- **FR-015**: Users MUST be able to sort bookmarks by date created, title, or entity type
- **FR-016**: System MUST support exporting bookmarks to a file format (JSON or CSV)

### Key Entities

- **Bookmark**: A catalogue entity representing a saved page reference; includes URL, title, entity type, entity ID, timestamp, custom tags, field selection parameters; stored in the Bookmarks catalogue as a special system list
- **Bookmarks Catalogue**: The special system catalogue (similar to existing Bookmarks and History catalogues) that stores all user bookmarks; supports catalogue operations (add, remove, search, filter, sort, export)
- **QueryBookmark**: Specialized bookmark entity for search queries; preserves query string, filters, sort order, pagination state; stored in Bookmarks catalogue
- **FieldView**: Custom field selection configuration saved with entity bookmarks; specifies which fields to display via select parameter; embedded in bookmark entity metadata

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can bookmark any entity or query page in under 2 seconds (single click/button press)
- **SC-002**: Users can access bookmarked pages with 100% parameter preservation (all query parameters restored)
- **SC-003**: Bookmark creation success rate of 99%+ (successfully saved to storage)
- **SC-004**: Users can search/filter a collection of 100+ bookmarks and see results in under 1 second
- **SC-005**: 90%+ of users successfully create their first bookmark on first attempt without instructions
- **SC-006**: System handles bookmark storage failures gracefully with clear error messages and recovery options
- **SC-007**: Custom field view bookmarks restore exact field selection with 100% fidelity

## Constitution Alignment

- **Type Safety**: Bookmark data structures will use strict TypeScript types with Zod validation; URL parsing and query parameter extraction will be type-safe; no `any` types
- **Test-First**: Each bookmark operation (create, retrieve, delete, search, filter) will have unit tests; E2E tests for full bookmark workflow; edge case tests for storage failures and invalid URLs
- **Monorepo Architecture**: Bookmark management logic in `packages/utils/src/bookmarks/`; bookmark UI components in `packages/ui/src/bookmarks/`; integration with existing catalogue system in `apps/web/src/hooks/useBookmarks.ts`
- **Storage Abstraction**: Bookmarks persist using existing storage provider interface (`CatalogueStorageProvider`); bookmarks stored as a special system list similar to existing Bookmarks and History lists; no direct IndexedDB/localStorage access
- **Performance & Memory**: Bookmark list virtualization for large collections; lazy loading of bookmark metadata; query parameter parsing cached to avoid repeated URL parsing; success criteria include specific performance targets
- **Atomic Conventional Commits**: Implementation commits will be atomic per feature: `feat(utils): add bookmark data structures and validation`, `feat(ui): add bookmark panel component`, `feat(web): integrate bookmarks with routing system`

## Assumptions

1. **Catalogue Integration**: Bookmarks will be integrated into the existing catalogue system, stored as entities within a special Bookmarks catalogue using the `CatalogueStorageProvider` interface
2. **URL Stability**: Assumes current entity URL patterns (`/authors/A123`, `/works/W456`, etc.) remain stable during feature implementation
3. **Query Parameter Format**: Assumes OpenAlex-style query parameters (filter, search, select, sort, page) continue to be the primary query mechanism
4. **Storage Capacity**: Assumes typical users will have 10-500 bookmarks; system designed to handle up to 1,000 bookmarks without performance degradation
5. **Bookmark Scope**: Bookmarks are per-user, per-browser (not synced across devices or browsers); stored in client-side IndexedDB via existing storage provider
6. **Special System Catalogue**: Leverages existing special system catalogue pattern (similar to current Bookmarks and History catalogues) for bookmark storage with standard catalogue operations
7. **Entity Type Detection**: System can reliably detect entity type from URL patterns for automatic bookmark categorization
8. **Catalogue Export**: Existing catalogue export functionality will support bookmark export without requiring separate implementation
