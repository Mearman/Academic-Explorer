# Implementation Tasks: Fix Catalogue E2E Test Failures

**Feature**: Fix Catalogue E2E Test Failures
**Branch**: `002-fix-catalogue-tests`
**Created**: 2025-11-11
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Summary

Fix 27 failing E2E tests across three catalogue test suites by implementing missing UI functionality, updating component selectors, and completing feature implementations. Tests are already written and failing (Red-Green-Refactor approach). No storage layer changes needed—feature 001 storage abstraction is complete.

**Total Tasks**: 56
**Parallelizable Tasks**: 28
**User Stories**: 3 (P1: Entity Management, P2: Import/Export, P3: Sharing)

## Task Organization

Tasks are organized by user story to enable independent implementation and testing. Each user story phase can be completed independently and has clear test criteria.

## Phase 1: Setup (1 task)

**Goal**: Verify environment and dependencies

- [ ] T001 Verify feature 001 storage abstraction is complete and E2E tests run without IndexedDB hanging

## Phase 2: Foundational (0 tasks)

No foundational tasks required. Storage abstraction layer (feature 001) already provides all necessary infrastructure.

## Phase 3: User Story 1 - Entity Management (Priority P1)

**Story Goal**: Researchers can add, view, remove, reorder, search, and manage entities within catalogue lists.

**Independent Test Criteria**:
- Can create a list and add an entity from an entity page
- Can view list with multiple entity types (Author, Work, Source)
- Can remove entities from list with confirmation
- Can reorder entities via drag-and-drop
- Can search/filter entities within a list
- Can add and edit notes on entities
- Can perform bulk operations (select all, bulk remove)
- Empty lists show appropriate empty state

**Tests**: 9 E2E tests in `apps/web/src/test/e2e/catalogue-entity-management.e2e.test.ts`

### Entity Display & Basic Operations

- [ ] T002 [P] [US1] Add data-testid="entity-item" to EntityItem component in apps/web/src/components/catalogue/EntityItem.tsx
- [ ] T003 [P] [US1] Add className="entity-card" to EntityItem Card wrapper in apps/web/src/components/catalogue/EntityItem.tsx
- [ ] T004 [P] [US1] Add entity type Badge display to EntityItem in apps/web/src/components/catalogue/EntityItem.tsx
- [ ] T005 [P] [US1] Add entity metadata display (title, ID) to EntityItem in apps/web/src/components/catalogue/EntityItem.tsx
- [ ] T006 [P] [US1] Add entity count display by type to CatalogueEntities in apps/web/src/components/catalogue/CatalogueEntities.tsx
- [ ] T007 [US1] Run entity display tests and verify FR-002 (display entities with type indicators)

### Entity Removal

- [ ] T008 [P] [US1] Add Remove button with aria-label="Remove entity" to EntityItem in apps/web/src/components/catalogue/EntityItem.tsx
- [ ] T009 [US1] Implement removal confirmation modal in CatalogueEntities in apps/web/src/components/catalogue/CatalogueEntities.tsx
- [ ] T010 [US1] Wire up removeEntityFromList storage operation in CatalogueEntities in apps/web/src/components/catalogue/CatalogueEntities.tsx
- [ ] T011 [US1] Add success notification after entity removal in CatalogueEntities in apps/web/src/components/catalogue/CatalogueEntities.tsx
- [ ] T012 [US1] Run entity removal tests and verify FR-003 (remove entities from lists)

### Drag-and-Drop Reordering

- [ ] T013 [US1] Wrap CatalogueEntities with DndContext from @dnd-kit/core in apps/web/src/components/catalogue/CatalogueEntities.tsx
- [ ] T014 [US1] Add SortableContext with vertical strategy in CatalogueEntities in apps/web/src/components/catalogue/CatalogueEntities.tsx
- [ ] T015 [P] [US1] Implement useSortable hook in EntityItem in apps/web/src/components/catalogue/EntityItem.tsx
- [ ] T016 [P] [US1] Add drag handle with GripVertical icon to EntityItem in apps/web/src/components/catalogue/EntityItem.tsx
- [ ] T017 [US1] Implement onDragEnd handler to update entity positions in CatalogueEntities in apps/web/src/components/catalogue/CatalogueEntities.tsx
- [ ] T018 [US1] Run drag-and-drop tests and verify FR-007 (reorder entities via drag-and-drop)

### Entity Search and Filtering

- [ ] T019 [P] [US1] Add search TextInput with placeholder "Search entities..." in CatalogueEntities in apps/web/src/components/catalogue/CatalogueEntities.tsx
- [ ] T020 [P] [US1] Add data-testid="entity-search-input" to search input in CatalogueEntities in apps/web/src/components/catalogue/CatalogueEntities.tsx
- [ ] T021 [US1] Implement useMemo filter logic for search query in CatalogueEntities in apps/web/src/components/catalogue/CatalogueEntities.tsx
- [ ] T022 [US1] Add useDebouncedValue hook for search performance in CatalogueEntities in apps/web/src/components/catalogue/CatalogueEntities.tsx
- [ ] T023 [US1] Run search/filter tests and verify FR-008 (search and filter entities)

### Entity Notes Editing

- [ ] T024 [P] [US1] Add Edit button with aria-label="Edit notes" to EntityItem in apps/web/src/components/catalogue/EntityItem.tsx
- [ ] T025 [P] [US1] Create EditNotesModal component in apps/web/src/components/catalogue/EditNotesModal.tsx
- [ ] T026 [US1] Add Textarea for notes input in EditNotesModal in apps/web/src/components/catalogue/EditNotesModal.tsx
- [ ] T027 [US1] Wire up updateEntityNotes storage operation in EditNotesModal in apps/web/src/components/catalogue/EditNotesModal.tsx
- [ ] T028 [US1] Add notes display to EntityItem when notes exist in apps/web/src/components/catalogue/EntityItem.tsx
- [ ] T029 [US1] Run notes editing tests and verify FR-006 (add and edit notes)

### Bulk Operations

- [ ] T030 [P] [US1] Add checkbox to EntityItem with isSelected prop in apps/web/src/components/catalogue/EntityItem.tsx
- [ ] T031 [P] [US1] Add "Select All" button to CatalogueEntities in apps/web/src/components/catalogue/CatalogueEntities.tsx
- [ ] T032 [P] [US1] Add data-testid="select-all-button" to Select All button in CatalogueEntities in apps/web/src/components/catalogue/CatalogueEntities.tsx
- [ ] T033 [US1] Implement selectedEntityIds Set state in CatalogueEntities in apps/web/src/components/catalogue/CatalogueEntities.tsx
- [ ] T034 [P] [US1] Add "Remove Selected" button to CatalogueEntities in apps/web/src/components/catalogue/CatalogueEntities.tsx
- [ ] T035 [P] [US1] Add data-testid="bulk-remove-button" to Remove Selected button in CatalogueEntities in apps/web/src/components/catalogue/CatalogueEntities.tsx
- [ ] T036 [US1] Implement bulk remove handler with confirmation in CatalogueEntities in apps/web/src/components/catalogue/CatalogueEntities.tsx
- [ ] T037 [US1] Run bulk operations tests and verify FR-009 (bulk entity operations)

### Empty State

- [ ] T038 [P] [US1] Add empty state message "No entities yet" to CatalogueEntities in apps/web/src/components/catalogue/CatalogueEntities.tsx
- [ ] T039 [US1] Run empty list test and verify FR-005 (display empty state messages)

### User Story 1 Validation

- [ ] T040 [US1] Run all entity management E2E tests (9 tests) and verify 100% pass rate for SC-001

## Phase 4: User Story 2 - Import/Export (Priority P2)

**Story Goal**: Researchers can export lists as compressed/JSON data and import previously exported lists with validation.

**Independent Test Criteria**:
- Can export list as compressed data
- Can export list as JSON format
- Can import list from compressed data with validation
- Can import list from file upload
- Invalid import data shows clear error messages
- Import preview displays list metadata before confirmation
- Large datasets import without performance issues

**Tests**: 9 E2E tests in `apps/web/src/test/e2e/catalogue-import-export.e2e.test.ts`

### Export Functionality

- [ ] T041 [P] [US2] Fix Export button selector in CatalogueManager to match test expectations in apps/web/src/components/catalogue/CatalogueManager.tsx
- [ ] T042 [P] [US2] Add data-testid="export-button" to Export button in CatalogueManager in apps/web/src/components/catalogue/CatalogueManager.tsx
- [ ] T043 [P] [US2] Add data-testid="export-list-button" to export submit button in ExportModal in apps/web/src/components/catalogue/ExportModal.tsx
- [ ] T044 [US2] Implement JSON export case in ExportModal in apps/web/src/components/catalogue/ExportModal.tsx
- [ ] T045 [US2] Add exportListAsJSON method to useCatalogue hook in apps/web/src/hooks/useCatalogue.ts
- [ ] T046 [US2] Test export with 100 entities and verify SC-005 (export completes <10 seconds)
- [ ] T047 [US2] Run export tests and verify FR-010, FR-011 (export as compressed and JSON)

### Import Data Validation

- [ ] T048 [P] [US2] Create validateImportData function with type guards in apps/web/src/utils/import-validation.ts
- [ ] T049 [P] [US2] Add ImportedListData TypeScript interface in apps/web/src/types/catalogue.ts
- [ ] T050 [US2] Implement validation error message display in ImportModal in apps/web/src/components/catalogue/ImportModal.tsx
- [ ] T051 [US2] Add data-testid="validation-error" to error alerts in ImportModal in apps/web/src/components/catalogue/ImportModal.tsx
- [ ] T052 [US2] Run import validation tests and verify FR-013 (validate and display errors)

### Import Functionality

- [ ] T053 [P] [US2] Add file upload input with data-testid="import-file-input" in ImportModal in apps/web/src/components/catalogue/ImportModal.tsx
- [ ] T054 [P] [US2] Add paste textarea with data-testid="import-data-textarea" in ImportModal in apps/web/src/components/catalogue/ImportModal.tsx
- [ ] T055 [US2] Implement file reader logic in ImportModal in apps/web/src/components/catalogue/ImportModal.tsx
- [ ] T056 [US2] Add import preview section with data-testid="import-preview" in ImportModal in apps/web/src/components/catalogue/ImportModal.tsx
- [ ] T057 [US2] Display list title and entity count in preview in ImportModal in apps/web/src/components/catalogue/ImportModal.tsx
- [ ] T058 [US2] Implement duplicate detection logic in ImportModal in apps/web/src/components/catalogue/ImportModal.tsx
- [ ] T059 [US2] Add data-testid="import-submit-button" to import button in ImportModal in apps/web/src/components/catalogue/ImportModal.tsx
- [ ] T060 [US2] Implement createList and addEntitiesToList operations in ImportModal in apps/web/src/components/catalogue/ImportModal.tsx
- [ ] T061 [US2] Add success notification after import in ImportModal in apps/web/src/components/catalogue/ImportModal.tsx
- [ ] T062 [US2] Test import with large dataset and verify FR-014 (handle large datasets)
- [ ] T063 [US2] Run all import tests and verify FR-012, FR-015, FR-016 (import, preview, duplicates)

### User Story 2 Validation

- [ ] T064 [US2] Run all import/export E2E tests (9 tests) and verify 100% pass rate for SC-002
- [ ] T065 [US2] Verify import data accuracy with SC-007 (100% data integrity)

## Phase 5: User Story 3 - Sharing (Priority P3)

**Story Goal**: Researchers can share catalogue lists via URLs and QR codes, and import lists from shared URLs.

**Independent Test Criteria**:
- Can open share modal for any list
- Share URL is generated correctly with token
- Can copy share URL to clipboard
- QR code displays for mobile scanning
- Can access shared list via URL in different session
- Can import list from shared URL
- Invalid share URLs show error messages
- Both lists and bibliographies can be shared

**Tests**: 8 E2E tests in `apps/web/src/test/e2e/catalogue-sharing-functionality.e2e.test.ts`

### Share Button and Modal Integration

- [ ] T066 [P] [US3] Add Share button to CatalogueManager when list selected in apps/web/src/components/catalogue/CatalogueManager.tsx
- [ ] T067 [P] [US3] Add handleShare function to CatalogueManager in apps/web/src/components/catalogue/CatalogueManager.tsx
- [ ] T068 [US3] Wire up generateShareUrl from useCatalogue in CatalogueManager in apps/web/src/components/catalogue/CatalogueManager.tsx
- [ ] T069 [US3] Add showShareModal state to CatalogueManager in apps/web/src/components/catalogue/CatalogueManager.tsx
- [ ] T070 [US3] Add ShareModal rendering to CatalogueManager in apps/web/src/components/catalogue/CatalogueManager.tsx
- [ ] T071 [US3] Test share URL generation and verify SC-006 (<2 seconds)
- [ ] T072 [US3] Run share modal tests and verify FR-017 (open sharing modal)

### Share URL Generation

- [ ] T073 [P] [US3] Implement generateShareUrl in useCatalogue hook in apps/web/src/hooks/useCatalogue.ts
- [ ] T074 [US3] Call storage.generateShareToken in generateShareUrl in apps/web/src/hooks/useCatalogue.ts
- [ ] T075 [US3] Construct share URL with window.location.origin and token in apps/web/src/hooks/useCatalogue.ts
- [ ] T076 [US3] Run share URL generation tests and verify FR-018 (generate unique URLs)

### QR Code Fix

- [ ] T077 [P] [US3] Change data-testid from "toggle-qr-code-button" to "qr-code-button" in ShareModal in apps/web/src/components/catalogue/ShareModal.tsx
- [ ] T078 [US3] Run QR code tests and verify FR-020 (display QR codes)

### Shared List Viewing

- [ ] T079 [P] [US3] Create SharedListViewer component in apps/web/src/components/catalogue/SharedListViewer.tsx
- [ ] T080 [P] [US3] Add data-testid="shared-list-viewer" to SharedListViewer container in apps/web/src/components/catalogue/SharedListViewer.tsx
- [ ] T081 [US3] Create TanStack Router route for /catalogue/shared/$shareToken in apps/web/src/routes/catalogue/shared/$shareToken.tsx
- [ ] T082 [US3] Extract shareToken from route params in SharedListViewer in apps/web/src/components/catalogue/SharedListViewer.tsx
- [ ] T083 [US3] Call storage.getListByShareToken in SharedListViewer in apps/web/src/components/catalogue/SharedListViewer.tsx
- [ ] T084 [US3] Display shared list content in SharedListViewer in apps/web/src/components/catalogue/SharedListViewer.tsx
- [ ] T085 [US3] Add "Import This List" button to SharedListViewer in apps/web/src/components/catalogue/SharedListViewer.tsx
- [ ] T086 [US3] Run shared URL access tests and verify FR-021 (import from shared URLs)

### Import from URL Parameters

- [ ] T087 [US3] Detect URL parameters in CatalogueManager on mount in apps/web/src/components/catalogue/CatalogueManager.tsx
- [ ] T088 [US3] Trigger import modal with URL data in CatalogueManager in apps/web/src/components/catalogue/CatalogueManager.tsx
- [ ] T089 [US3] Run URL parameter import tests and verify FR-022 (URL parameter-based importing)

### Error Handling

- [ ] T090 [P] [US3] Add error handling for invalid share tokens in SharedListViewer in apps/web/src/components/catalogue/SharedListViewer.tsx
- [ ] T091 [P] [US3] Display "Not Found" or "Invalid" message for bad tokens in SharedListViewer in apps/web/src/components/catalogue/SharedListViewer.tsx
- [ ] T092 [US3] Run invalid URL tests and verify FR-023 (handle invalid URLs gracefully)

### User Story 3 Validation

- [ ] T093 [US3] Run all sharing E2E tests (8 tests) and verify 100% pass rate for SC-003
- [ ] T094 [US3] Verify both lists and bibliographies can be shared per FR-025

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Final verification and performance validation

- [ ] T095 Run full E2E test suite (232 tests) and verify 27 catalogue tests now pass
- [ ] T096 Verify all success criteria SC-001 through SC-008 are met
- [ ] T097 Check TypeScript strict mode passes with no any types
- [ ] T098 Run pnpm typecheck and fix any type errors
- [ ] T099 Verify storage operations use CatalogueStorageProvider interface only
- [ ] T100 Test entity operations complete <5 seconds per SC-004
- [ ] T101 Test export operations complete <10 seconds per SC-005
- [ ] T102 Test share URL generation completes <2 seconds per SC-006
- [ ] T103 Verify no memory leaks or hanging issues per SC-008
- [ ] T104 Run pnpm build and verify successful production build
- [ ] T105 Update IMPLEMENTATION_SUMMARY.md with completion status

## Dependencies & Execution Order

### User Story Dependencies

```
Phase 1 (Setup) → Phase 3 (US1: Entity Management) [INDEPENDENT]
                ↓
                Phase 4 (US2: Import/Export) [INDEPENDENT]
                ↓
                Phase 5 (US3: Sharing) [INDEPENDENT]
                ↓
                Phase 6 (Polish)
```

**Independent Stories**: US1, US2, and US3 are fully independent and can be implemented in any order or in parallel by different developers. The priority order (P1 → P2 → P3) is recommended for single-developer workflow but not technically required.

### Task Dependencies Within User Stories

**User Story 1** (T002-T040):
- T002-T006 [P] can run in parallel
- T007 depends on T002-T006
- T008 [P] independent
- T009-T012 sequential (depends on T008)
- T013-T018 sequential (drag-and-drop setup)
- T019-T023 sequential (search/filter)
- T024-T029 sequential (notes editing)
- T030-T037 mixed (T030-T032 [P], then T033-T037 sequential)
- T038-T040 sequential (empty state)

**User Story 2** (T041-T065):
- T041-T043 [P] can run in parallel
- T044-T047 sequential (export implementation)
- T048-T052 mixed (T048-T049 [P], then T050-T052 sequential)
- T053-T063 mixed (T053-T054 [P], then T055-T063 sequential)
- T064-T065 final validation

**User Story 3** (T066-T094):
- T066-T067 [P] can run in parallel
- T068-T072 sequential (share button integration)
- T073-T076 sequential (URL generation)
- T077-T078 independent fix
- T079-T086 mixed (T079-T080 [P], then T081-T086 sequential)
- T087-T089 sequential (URL parameters)
- T090-T092 mixed (T090-T091 [P], then T092 sequential)
- T093-T094 final validation

## Parallel Execution Examples

### Single Developer: Sequential by Story

```bash
# Week 1: User Story 1 (Entity Management)
# Complete T002-T040 (39 tasks)
# Run 9 entity management tests → 100% pass

# Week 2: User Story 2 (Import/Export)
# Complete T041-T065 (25 tasks)
# Run 9 import/export tests → 100% pass

# Week 3: User Story 3 (Sharing)
# Complete T066-T094 (29 tasks)
# Run 8 sharing tests → 100% pass

# Week 4: Polish
# Complete T095-T105 (11 tasks)
# All 27 tests passing
```

### Two Developers: Parallel Stories

```bash
# Developer A: User Story 1 (T002-T040)
# Developer B: User Story 2 (T041-T065)
# Both can work simultaneously - no conflicts
# After 2 weeks: 18 tests passing

# Developer A: User Story 3 (T066-T094)
# Developer B: Polish (T095-T105)
# After 3 weeks: All 27 tests passing
```

### Three Developers: All Parallel

```bash
# Developer A: User Story 1 (T002-T040)
# Developer B: User Story 2 (T041-T065)
# Developer C: User Story 3 (T066-T094)
# All work simultaneously - complete independence
# After 2 weeks: All 27 tests passing
# Final week: Collaborative polish (T095-T105)
```

## Implementation Strategy

### MVP Scope (Week 1)

**Minimum Viable Product = User Story 1 (Entity Management)**

Complete T002-T040 to deliver core catalogue functionality:
- Add/view/remove entities
- Display entity types and counts
- Basic entity operations work

**Value Delivered**:
- 9/27 tests passing (33%)
- Core catalogue feature functional
- Users can build research collections

### Incremental Delivery

**Week 2: Add Import/Export (US2)**
- Complete T041-T065
- 18/27 tests passing (67%)
- Users can back up and share data

**Week 3: Add Sharing (US3)**
- Complete T066-T094
- 26/27 tests passing (96%)
- Users can collaborate via URLs

**Week 4: Polish & Validation**
- Complete T095-T105
- 27/27 tests passing (100%)
- Production ready

## Testing Strategy

### Red-Green-Refactor Approach

1. **Red**: Run failing test, understand error
2. **Green**: Implement minimal fix to pass test
3. **Refactor**: Clean up code, improve quality

### Test Execution

```bash
# Run specific user story tests
pnpm test:e2e catalogue-entity-management.e2e.test.ts  # US1
pnpm test:e2e catalogue-import-export.e2e.test.ts     # US2
pnpm test:e2e catalogue-sharing-functionality.e2e.test.ts  # US3

# Run all catalogue tests
pnpm test:e2e --grep "Catalogue"

# Run with UI for debugging
pnpm test:e2e:ui
```

### Validation Checkpoints

After each user story phase:
1. Run story-specific E2E tests → 100% pass
2. Verify success criteria for that story
3. Check TypeScript strict mode passes
4. Verify no storage abstraction violations
5. Test performance benchmarks

## Progress Tracking

**Completion Criteria**:
- [ ] Phase 1: Setup (1 task)
- [ ] Phase 3: User Story 1 (39 tasks) → 9 tests passing
- [ ] Phase 4: User Story 2 (25 tasks) → 9 tests passing
- [ ] Phase 5: User Story 3 (29 tasks) → 8 tests passing
- [ ] Phase 6: Polish (11 tasks) → All 27 tests passing

**Total**: 105 tasks to pass 27 E2E tests

## Notes

- Tests are already written and failing - no new test creation needed
- Storage abstraction layer (feature 001) is complete - no backend changes needed
- All changes confined to apps/web/src/components/catalogue/ directory
- No new dependencies required - all libraries already installed
- Follow Red-Green-Refactor: understand test failure → implement fix → verify pass
- Each user story is independently testable and deliverable
- Parallel development possible across all three user stories
