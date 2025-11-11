# Feature Specification: Fix Failing Catalogue E2E Tests

**Feature Branch**: `004-fix-failing-tests`
**Created**: 2025-11-11
**Status**: Draft
**Input**: User description: "resolve the failing tests"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Catalogue Entity Management Works Correctly (Priority: P1)

A developer or QA tester runs the E2E test suite and all catalogue entity management tests pass successfully. Users can add entities to catalogue lists from entity pages, view different entity types correctly, remove entities, reorder them via drag-and-drop, search/filter within lists, add notes to entities, handle empty lists gracefully, perform bulk operations, and view entity metadata accurately.

**Why this priority**: These are core catalogue features that users depend on daily. Without working entity management, the catalogue feature is essentially broken. Tests failing indicate real functionality issues that block users from managing their research collections.

**Independent Test**: Run `pnpm test:e2e catalogue-entity-management.e2e.test.ts` and verify all 9 tests pass (tests 64-72 from the suite).

**Acceptance Scenarios**:

1. **Given** a user is on an entity page (work, author, institution, etc.), **When** they click "Add to Catalogue" and select a list, **Then** the entity is successfully added to that list and appears in the catalogue
2. **Given** a user has a list with multiple entity types, **When** they view the list, **Then** each entity displays with the correct type badge and metadata
3. **Given** a user has entities in a list, **When** they drag an entity to reorder it, **Then** the entity moves to the new position and the order persists
4. **Given** a user has entities in a list, **When** they click remove on an entity, **Then** the entity is removed from the list
5. **Given** a user has many entities in a list, **When** they type in the search box, **Then** only matching entities are displayed
6. **Given** a user selects multiple entities, **When** they perform a bulk action, **Then** the action applies to all selected entities
7. **Given** a user views an entity in the catalogue, **When** they check the metadata, **Then** citation counts, publication dates, and other key fields display accurately
8. **Given** a user has an empty list, **When** they view it, **Then** an appropriate empty state message is displayed
9. **Given** a user adds a note to an entity, **When** they save it, **Then** the note persists and displays when viewing the entity

---

### User Story 2 - Catalogue Import/Export Functions Correctly (Priority: P2)

A developer or QA tester runs the E2E test suite and all catalogue import/export tests pass successfully. Users can export their lists in various formats (compressed data, JSON, etc.), import lists from compressed data or file uploads, preview import data before importing, handle invalid/malformed data gracefully, detect duplicates during import, and work with large datasets.

**Why this priority**: Import/export enables users to backup their research, share collections with collaborators, and migrate data between systems. This is critical for data portability and collaboration but secondary to basic entity management.

**Independent Test**: Run `pnpm test:e2e catalogue-import-export.e2e.test.ts` and verify all 9 tests pass (tests 73-81 from the suite).

**Acceptance Scenarios**:

1. **Given** a user has a populated list, **When** they click "Export" and choose compressed format, **Then** a compressed data file is generated successfully
2. **Given** a user has a populated list, **When** they export in different formats (JSON, CSV, etc.), **Then** each format exports correctly with all entity data
3. **Given** a user has compressed catalogue data, **When** they import it, **Then** all entities and metadata are restored accurately
4. **Given** a user attempts to import invalid/malformed data, **When** the import runs, **Then** clear error messages are displayed and the system doesn't crash
5. **Given** a user uploads a file for import, **When** they select the file, **Then** the data is parsed and imported correctly
6. **Given** a user imports data, **When** the system detects validation errors, **Then** specific validation messages guide the user to fix the data
7. **Given** a user imports a large dataset, **When** the import processes, **Then** it completes without timeouts or memory issues
8. **Given** a user imports data, **When** they preview it first, **Then** they see what entities will be imported before confirming
9. **Given** a user imports data with duplicates, **When** import runs, **Then** the system detects and handles duplicates appropriately (merge or skip)

---

### User Story 3 - Catalogue Sharing Mechanisms Function Properly (Priority: P3)

A developer or QA tester runs the E2E test suite and all catalogue sharing tests pass successfully. Users can generate share URLs for their lists, copy URLs to clipboard, display QR codes for easy sharing, import lists from shared URLs, handle invalid URLs gracefully, make lists public when sharing, and share both regular lists and bibliographies.

**Why this priority**: Sharing enables collaboration and knowledge distribution, but is less critical than core entity management and data portability. Users can still use the catalogue without sharing features.

**Independent Test**: Run `pnpm test:e2e catalogue-sharing-functionality.e2e.test.ts` and verify all 9 tests pass (tests 89-97 from the suite).

**Acceptance Scenarios**:

1. **Given** a user has a list, **When** they click "Share", **Then** a share modal opens with sharing options
2. **Given** the share modal is open, **When** the user requests a share URL, **Then** a unique URL is generated for the list
3. **Given** a share URL is displayed, **When** the user clicks "Copy", **Then** the URL is copied to their clipboard
4. **Given** the share modal is open, **When** the user requests a QR code, **Then** a QR code representing the share URL is displayed
5. **Given** a user has a share URL, **When** they visit it or paste it into the import field, **Then** they can import the shared list
6. **Given** a user receives a share URL in query parameters, **When** they load the page, **Then** the list is automatically imported
7. **Given** a user enters an invalid/malformed share URL, **When** they attempt to import, **Then** a clear error message is displayed
8. **Given** a user shares a list, **When** they confirm sharing, **Then** the list is marked as public and accessible via the share URL
9. **Given** a user has a bibliography, **When** they share it, **Then** the sharing works the same as for regular lists

---

### User Story 4 - UI Components Render Correctly (Priority: P3)

A developer or QA tester runs the E2E test suite and the Mantine UI components test passes. All catalogue-related Mantine UI components (modals, buttons, inputs, tables, dropdowns, etc.) render correctly and are accessible.

**Why this priority**: UI component rendering is important for user experience, but if basic functionality works, minor UI issues are lower priority. This ensures visual consistency and accessibility.

**Independent Test**: Run the single test "should have proper Mantine UI components for catalogue" (test 87) and verify it passes.

**Acceptance Scenarios**:

1. **Given** catalogue pages are loaded, **When** inspecting the DOM, **Then** all Mantine components have proper ARIA labels and roles
2. **Given** modals are opened, **When** viewing them, **Then** they render with correct styling, positioning, and focus management
3. **Given** forms are displayed, **When** interacting with inputs, **Then** they follow Mantine design system patterns consistently
4. **Given** tables display entities, **When** viewing them, **Then** Mantine Table components render correctly with proper column headers and data

---

### Edge Cases

- What happens when a user tries to add the same entity to a list multiple times? (Should detect duplicate or allow with warning)
- How does the system handle importing extremely large files (>10MB)? (Should show progress indicator or chunked processing)
- What happens when share URLs expire or become invalid? (Should show appropriate error message)
- How does drag-and-drop behave on touch devices or with keyboard navigation? (Should support alternative reordering methods)
- What happens when network fails during import/export operations? (Should show retry option or save progress)
- How does the system handle entity metadata that has changed since export? (Should update or flag conflicts)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to add entities from entity pages to catalogue lists via "Add to Catalogue" button
- **FR-002**: System MUST display different entity types (works, authors, institutions, sources, topics, funders, publishers, concepts) with correct type badges and metadata
- **FR-003**: Users MUST be able to remove entities from lists with immediate visual feedback
- **FR-004**: Users MUST be able to reorder entities within lists via drag-and-drop interaction
- **FR-005**: System MUST provide search/filter functionality within individual lists to find specific entities
- **FR-006**: Users MUST be able to add, edit, and persist notes on entities within lists
- **FR-007**: System MUST display appropriate empty state messaging when lists contain no entities
- **FR-008**: Users MUST be able to select multiple entities and perform bulk operations (delete, move, export)
- **FR-009**: System MUST display accurate entity metadata including citation counts, publication dates, author information, etc.
- **FR-010**: Users MUST be able to export lists in compressed data format
- **FR-011**: Users MUST be able to export lists in multiple formats (JSON, CSV, etc.) with all entity data preserved
- **FR-012**: System MUST allow users to import catalogue data from compressed format
- **FR-013**: System MUST validate import data and display clear error messages for invalid/malformed data
- **FR-014**: System MUST support file upload for importing catalogue data
- **FR-015**: System MUST validate the structure of imported data and reject invalid schemas
- **FR-016**: System MUST handle large import datasets without timeouts or memory failures
- **FR-017**: System MUST provide preview capability for import data before final import
- **FR-018**: System MUST detect duplicate entities during import and handle them appropriately
- **FR-019**: Users MUST be able to generate shareable URLs for their catalogue lists
- **FR-020**: System MUST provide clipboard copy functionality for share URLs
- **FR-021**: System MUST generate QR codes for share URLs to enable mobile sharing
- **FR-022**: Users MUST be able to import lists by visiting or entering share URLs
- **FR-023**: System MUST import lists from URL query parameters automatically
- **FR-024**: System MUST handle invalid/malformed share URLs with clear error messaging
- **FR-025**: System MUST mark lists as public when shared and enforce appropriate access controls
- **FR-026**: System MUST support sharing for both regular lists and bibliographies
- **FR-027**: All catalogue-related Mantine UI components MUST render with proper styling, accessibility attributes, and responsive behavior

### Key Entities

- **Catalogue List**: A named collection of entities with metadata (title, description, creation date, entity count, public/private status)
- **Catalogue Entity**: Reference to an OpenAlex entity stored in a list with additional metadata (position/order, user notes, date added)
- **Entity Type**: Classification of entities (Work, Author, Institution, Source, Topic, Funder, Publisher, Concept)
- **Share URL**: Unique identifier for publicly accessible catalogue lists with encoded list data
- **Import/Export Format**: Structured data representation of catalogue lists supporting compression, validation, and version compatibility

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of catalogue entity management E2E tests (9 tests) pass consistently across test runs
- **SC-002**: 100% of catalogue import/export E2E tests (9 tests) pass consistently across test runs
- **SC-003**: 100% of catalogue sharing E2E tests (9 tests) pass consistently across test runs
- **SC-004**: 100% of catalogue UI component tests (1 test) pass consistently across test runs
- **SC-005**: Total E2E test pass rate improves from current ~88% (205/232) to ~100% (232/232)
- **SC-006**: All catalogue operations complete within acceptable time limits (add entity <500ms, export list <2s, import list <5s for typical datasets)
- **SC-007**: Import/export maintains data integrity - exported and re-imported lists contain identical entity data with zero data loss
- **SC-008**: Share URLs remain valid and functional for the lifetime of the public list
- **SC-009**: Drag-and-drop reordering operations persist correctly and maintain order across page reloads
- **SC-010**: Bulk operations scale to handle 100+ entities without performance degradation or UI freezing

## Constitution Alignment *(recommended)*

- **Type Safety**: Feature fixes should maintain strict TypeScript typing; no new `any` types; use type guards where needed for entity type discrimination
- **Test-First**: All fixes should be validated by the existing E2E tests passing; fixes should not modify test expectations unless tests are incorrect
- **Monorepo Architecture**: Fixes apply to apps/web catalogue components and potentially shared packages (client, utils, ui)
- **Storage Abstraction**: Catalogue uses IndexedDB via Dexie; fixes should maintain existing storage abstraction patterns
- **Performance & Memory**: Success criteria include performance targets; fixes should not degrade existing performance benchmarks

## Scope & Boundaries *(recommended)*

### In Scope

- Fixing functionality bugs causing the 27 failing catalogue E2E tests
- Ensuring entity management operations (add, remove, reorder, search, bulk ops) work correctly
- Fixing import/export functionality for all supported formats
- Fixing share URL generation, QR codes, and import from shared URLs
- Ensuring Mantine UI components render correctly with proper accessibility
- Maintaining data integrity during all operations
- Ensuring proper error handling and user feedback

### Out of Scope

- Adding new catalogue features beyond what tests expect
- Changing test specifications or lowering test expectations
- Refactoring catalogue architecture or storage mechanisms
- Adding new entity types or changing entity metadata schemas
- Improving performance beyond meeting success criteria
- Redesigning UI/UX of catalogue features
- Adding new import/export formats not tested by existing tests
- Changing the 6 skipped bulk bookmark tests (those are intentionally skipped/not implemented)

## Assumptions *(recommended)*

- The E2E tests correctly specify expected behavior (tests are not wrong, implementation is)
- The TypeScript/Vite compilation fix (feature 003) has resolved any compilation-related test issues
- Catalogue feature was previously working but has regressed or was never fully implemented
- Test environment (Playwright, Vite dev server, IndexedDB) is configured correctly
- The 6 skipped tests in bulk-bookmarks-management represent unimplemented features (not bugs to fix)
- Entity data comes from OpenAlex API and follows OpenAlex schema
- Users have modern browsers supporting IndexedDB, drag-and-drop APIs, and clipboard APIs
- Share URLs encode list data in a format that supports versioning/migration

## Dependencies *(recommended)*

### Technical Dependencies

- Playwright E2E testing framework (existing test suite)
- Vite dev server running correctly (fixed in feature 003)
- Dexie IndexedDB wrapper for catalogue storage
- Mantine UI component library (v8.3.x)
- @dnd-kit for drag-and-drop functionality
- OpenAlex client package for entity data
- Clipboard API for copy-to-clipboard functionality
- QR code generation library (qrcode package)
- Compression library for export data (pako package)

### External Dependencies

- None - this is fixing existing functionality

## Risks & Mitigations *(optional)*

### Risk 1: Root Cause Unknown

**Impact**: High - without understanding why tests fail, fixes may be incomplete or wrong
**Probability**: Medium - tests could fail due to timing issues, missing implementation, or logic bugs
**Mitigation**: Analyze each failing test individually; run tests in isolation; examine test expectations vs actual behavior; check browser console for errors

### Risk 2: Tests May Be Flaky

**Impact**: Medium - flaky tests could pass/fail inconsistently making validation difficult
**Probability**: Low - tests failed consistently in observed run
**Mitigation**: Run test suite multiple times; check for race conditions or timing dependencies; ensure proper test isolation and cleanup

### Risk 3: Multiple Root Causes

**Impact**: High - different tests may fail for different reasons requiring separate fixes
**Probability**: High - 27 tests across 3 feature areas suggests multiple underlying issues
**Mitigation**: Group tests by failure pattern; prioritize by user story; fix one category at a time; validate incrementally

### Risk 4: Breaking Other Tests

**Impact**: High - fixes could introduce regressions in passing tests
**Probability**: Medium - changes to shared components could affect multiple features
**Mitigation**: Run full test suite after each fix; use TypeScript for compile-time safety; follow existing patterns; avoid large refactors

## Open Questions *(optional)*

None - test specifications clearly define expected behavior. Implementation needs to match test expectations.
