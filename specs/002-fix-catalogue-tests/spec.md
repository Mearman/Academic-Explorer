# Feature Specification: Fix Catalogue E2E Test Failures

**Feature Branch**: `002-fix-catalogue-tests`
**Created**: 2025-11-11
**Status**: Obsolete
**Obsoleted**: 2025-11-17
**Input**: User description: "resolve the test failures"

**Obsolescence Note**: All catalogue tests are now passing. Issues were resolved through implementation of spec 001 (storage abstraction with InMemoryStorageProvider for E2E tests). Current status: 1,422 tests passing with zero catalogue test failures.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entity Management in Catalogue Lists (Priority: P1)

Researchers need to add, view, and manage entities (authors, works, sources) within their catalogue lists to organize their academic research materials.

**Why this priority**: Core functionality that enables the primary use case of the catalogue feature. Without this, users cannot populate or manage their research collections.

**Independent Test**: Can be fully tested by creating a list, adding an entity to it, viewing the entity details, and removing it. Delivers immediate value by allowing users to build research collections.

**Acceptance Scenarios**:

1. **Given** a user has created a catalogue list, **When** they navigate to an author page and click "Add to Catalogue", **Then** the author entity is successfully added to the selected list
2. **Given** a list contains multiple entities, **When** the user views the list, **Then** all entities are displayed with correct type indicators (Author, Work, Source)
3. **Given** a list contains entities, **When** the user clicks the remove button for an entity, **Then** the entity is removed from the list and the count updates
4. **Given** a list is empty, **When** the user views it, **Then** an appropriate empty state message is displayed
5. **Given** a user is viewing a list with entities, **When** they add notes to an entity, **Then** the notes are saved and displayed with the entity

---

### User Story 2 - Catalogue Import and Export (Priority: P2)

Researchers need to share their catalogue lists with colleagues and back up their research collections by exporting and importing list data in various formats.

**Why this priority**: Enables collaboration and data portability, which are important but not essential for basic catalogue functionality.

**Independent Test**: Can be fully tested by creating a list with entities, exporting it in different formats, then importing it back and verifying data integrity.

**Acceptance Scenarios**:

1. **Given** a user has a populated list, **When** they click the export button, **Then** the list data is exported as compressed data
2. **Given** exported list data, **When** a user imports it, **Then** the list is recreated with all entities and metadata intact
3. **Given** invalid import data, **When** a user attempts to import, **Then** an appropriate error message is displayed
4. **Given** a large list, **When** exporting, **Then** the export completes successfully and the data size is optimized
5. **Given** a user imports duplicate data, **When** the import process runs, **Then** the system detects and handles duplicates appropriately

---

### User Story 3 - Catalogue Sharing Functionality (Priority: P3)

Researchers want to share their catalogue lists with others via shareable URLs and QR codes to facilitate collaboration and knowledge dissemination.

**Why this priority**: Enhances collaboration but requires the core functionality (P1) and data portability (P2) to be working first.

**Independent Test**: Can be fully tested by creating a list, generating a share URL, accessing that URL in a different session, and verifying the list is viewable.

**Acceptance Scenarios**:

1. **Given** a user has a list, **When** they open the share modal, **Then** the modal displays sharing options
2. **Given** a user generates a share URL, **When** they copy it to clipboard, **Then** the URL is successfully copied
3. **Given** a share URL, **When** another user accesses it, **Then** the shared list is displayed correctly
4. **Given** a list is made public for sharing, **When** the share process completes, **Then** the list's visibility is updated to public
5. **Given** a user shares a bibliography, **When** accessed via share URL, **Then** the bibliography format is preserved

---

### Edge Cases

- What happens when adding an entity to a list that already contains it?
- How does the system handle exporting very large lists (1000+ entities)?
- What happens if a shared URL is accessed after the list has been deleted?
- How does the system handle importing data with missing required fields?
- What happens when trying to reorder entities in a list with only one item?
- How does the system handle concurrent edits to the same list?
- What happens when network fails during import/export operations?

## Requirements *(mandatory)*

### Functional Requirements

**Entity Management (P1)**:

- **FR-001**: System MUST allow users to add entities (authors, works, sources) from entity pages to catalogue lists
- **FR-002**: System MUST display all entities within a list with correct type indicators and metadata
- **FR-003**: System MUST allow users to remove entities from lists
- **FR-004**: System MUST update entity counts in real-time when entities are added or removed
- **FR-005**: System MUST display appropriate empty state messages when lists contain no entities
- **FR-006**: System MUST allow users to add and edit notes for individual entities within lists
- **FR-007**: System MUST support reordering entities within lists via drag-and-drop
- **FR-008**: System MUST provide search and filter capabilities for entities within a list
- **FR-009**: System MUST support bulk operations (select multiple entities for removal)

**Import/Export (P2)**:

- **FR-010**: System MUST allow users to export lists as compressed data
- **FR-011**: System MUST support export in JSON format with optional compression
- **FR-012**: System MUST allow users to import previously exported list data
- **FR-013**: System MUST validate imported data structure and display errors for invalid data
- **FR-014**: System MUST handle large dataset imports without performance degradation
- **FR-015**: System MUST provide preview of data before finalizing import
- **FR-016**: System MUST detect and handle duplicate entities during import

**Sharing (P3)**:

- **FR-017**: System MUST allow users to open a sharing modal for any list
- **FR-018**: System MUST generate unique shareable URLs for lists
- **FR-019**: System MUST allow users to copy share URLs to clipboard
- **FR-020**: System MUST display QR codes for share URLs
- **FR-021**: System MUST allow import of lists from shared URLs
- **FR-022**: System MUST support URL parameter-based list importing
- **FR-023**: System MUST handle invalid or expired shared URLs gracefully
- **FR-024**: System MUST update list visibility to public when sharing is enabled
- **FR-025**: System MUST support sharing of both regular lists and bibliographies

### Key Entities

- **CatalogueList**: Represents a collection of academic entities; attributes include title, description, type (list/bibliography), creation date, visibility (public/private)
- **CatalogueEntity**: Represents an academic resource added to a list; attributes include entity type (author/work/source), entity ID, notes, position in list, date added
- **ShareToken**: Represents a shareable link to a list; attributes include token string, list ID, creation date, expiration date
- **ExportData**: Represents exported catalogue data; attributes include list metadata, entity collection, export format, compression status

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of entity management E2E tests pass (9 tests)
- **SC-002**: 100% of import/export E2E tests pass (9 tests)
- **SC-003**: 100% of sharing functionality E2E tests pass (8 tests)
- **SC-004**: Users can add an entity to a list in under 5 seconds
- **SC-005**: Export of a list with 100 entities completes in under 10 seconds
- **SC-006**: Share URL generation completes in under 2 seconds
- **SC-007**: Import of a previously exported list completes with 100% data accuracy
- **SC-008**: All test operations complete without any timeout or hanging issues

## Constitution Alignment *(recommended)*

- **Type Safety**: Test fixtures and helpers will use proper TypeScript types; no `any` types in test utilities
- **Test-First**: Fixing tests follows Red-Green-Refactor - understand why tests fail, implement fix, verify green
- **Storage Abstraction**: Tests interact with catalogue through storage provider interface (not direct IndexedDB)
- **Performance & Memory**: Success criteria include timing constraints; tests verify no memory leaks or hanging
- **Monorepo Architecture**: Test fixes confined to apps/web/src/test/e2e/ directory structure

## Assumptions

- Export formats will default to JSON with compression
- Share URLs will remain valid indefinitely unless explicitly revoked by user
- Duplicate detection during import will be based on entity ID matching
- Authentication requirements for shared lists follow existing application patterns
- UI selectors in tests may need updates to match current component structure
- Test failures are primarily due to UI changes or missing features, not storage layer issues (storage abstraction implementation already complete)

## Dependencies

- Storage abstraction layer (001-storage-abstraction) must be complete and functional
- Catalogue UI components must exist in the application
- E2E test infrastructure (Playwright) must be properly configured
- Test utilities for creating test data must be available
