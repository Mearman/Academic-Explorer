# Implementation Tasks: Fix Failing Catalogue E2E Tests

**Feature**: 004-fix-failing-tests
**Branch**: `004-fix-failing-tests`
**Created**: 2025-11-11
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

Fix 27 failing catalogue E2E tests by implementing missing functionality and correcting bugs. Tests define expected behavior - implementation must conform to test specifications. No test modifications allowed.

**Goal**: Achieve 100% E2E test pass rate (232/232 tests passing, up from 205/232)

## Task Summary

- **Total Tasks**: 47
- **Parallelizable**: 28 tasks (60%)
- **User Stories**: 4 (P1: 1, P2: 1, P3: 2)
- **Test Files**: 3 (27 failing tests total)

## Implementation Strategy

### MVP Approach (User Story 1 Only)

**Minimum Viable Product**: US1 - Catalogue Entity Management (P1)
- **Scope**: 9 tests passing (Tests 64-72)
- **Files**: 4 components + 1 hook
- **Value**: Core catalogue functionality working
- **Validation**: `pnpm test:e2e catalogue-entity-management.e2e.test.ts`

### Incremental Delivery

1. **Phase 3 (US1 - P1)**: Entity management fundamentals → 9 tests passing
2. **Phase 4 (US2 - P2)**: Import/export functionality → 18 tests passing
3. **Phase 5 (US3 - P3)**: Sharing mechanisms → 27 tests passing
4. **Phase 6 (US4 - P3)**: UI accessibility polish → All tests passing

Each phase delivers independently testable value and can be deployed separately.

## Phase 1: Setup

**Goal**: Prepare development environment for catalogue fixes

**Tasks**:

- [ ] T001 Read failing test output to understand current failures in apps/web/src/test/e2e/catalogue-entity-management.e2e.test.ts
- [ ] T002 Read failing test output to understand current failures in apps/web/src/test/e2e/catalogue-import-export.e2e.test.ts
- [ ] T003 Read failing test output to understand current failures in apps/web/src/test/e2e/catalogue-sharing-functionality.e2e.test.ts
- [ ] T004 Analyze existing catalogue hook implementation in apps/web/src/hooks/useCatalogue.ts
- [ ] T005 Review Dexie database schema and storage patterns in apps/web/src/hooks/useCatalogue.ts

**Validation**: Understanding of all 27 failing tests and current implementation gaps documented

## Phase 2: Foundational

**Goal**: Establish shared types and validation that all user stories depend on

**Tasks**:

- [X] T006 [P] Create core type definitions (EntityType, CatalogueList, CatalogueEntity) in apps/web/src/types/catalogue.ts based on specs/004-fix-failing-tests/contracts/types.ts
- [X] T007 [P] Create EntityMetadata discriminated union types (8 entity types) in apps/web/src/types/catalogue.ts
- [X] T008 [P] Create ExportFormat interface for import/export in apps/web/src/types/catalogue.ts
- [X] T009 [P] Implement type guard functions (isWorkMetadata, isAuthorMetadata, etc.) in apps/web/src/utils/catalogue-guards.ts
- [X] T010 [P] Implement validateExportFormat function with asserts in apps/web/src/utils/catalogue-validation.ts
- [X] T011 [P] Create entity type constants (ENTITY_TYPE_LABELS, ENTITY_TYPE_COLORS) in apps/web/src/constants/catalogue.ts
- [X] T012 Initialize Dexie database schema for CatalogueDatabase in apps/web/src/lib/db/catalogue-db.ts

**Validation**: TypeScript compilation succeeds, shared types available for all components

**Independent Test**: `pnpm typecheck` passes with no errors

## Phase 3: User Story 1 - Catalogue Entity Management (P1)

**Goal**: Fix 9 failing tests for core entity management functionality (Tests 64-72)

**Story**: Users can add entities to lists, view different entity types, remove entities, reorder via drag-and-drop, search/filter, add notes, handle empty lists, perform bulk operations, and view metadata accurately.

**Test File**: `apps/web/src/test/e2e/catalogue-entity-management.e2e.test.ts`

**Independent Test Criteria**: Run `pnpm test:e2e catalogue-entity-management.e2e.test.ts` → All 9 tests pass (Tests 64-72)

### 3.1 Entity Management Fundamentals

- [ ] T013 [P] [US1] Implement addEntity method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Add entity to list with duplicate check
- [ ] T014 [P] [US1] Implement removeEntity method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Remove entity from list
- [ ] T015 [P] [US1] Implement getEntityCount helper in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Count entities per list
- [ ] T016 [P] [US1] Implement updateListEntityCount helper in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Update denormalized count
- [ ] T017 [US1] Fix AddToCatalogueButton to call addEntity on click (apps/web/src/components/catalogue/AddToCatalogueButton.tsx) - Connect button to hook
- [ ] T018 [US1] Fix AddToListModal to show available lists and handle selection (apps/web/src/components/catalogue/AddToListModal.tsx) - Modal UI for list selection
- [ ] T019 [US1] Fix CatalogueEntities to display entities with remove buttons (apps/web/src/components/catalogue/CatalogueEntities.tsx) - Entity list rendering

### 3.2 Entity Type Display and Metadata

- [ ] T020 [P] [US1] Implement entity type badge rendering with correct colors in CatalogueEntities (apps/web/src/components/catalogue/CatalogueEntities.tsx) - Use ENTITY_TYPE_COLORS
- [ ] T021 [P] [US1] Implement entity metadata display (citations, dates, etc.) in CatalogueEntities (apps/web/src/components/catalogue/CatalogueEntities.tsx) - Use type guards for metadata

### 3.3 Search and Filter

- [ ] T022 [P] [US1] Implement searchEntities method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Filter by displayName and notes
- [ ] T023 [P] [US1] Implement filterByType method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Filter by entity types
- [ ] T024 [US1] Add search input to CatalogueList component (apps/web/src/components/catalogue/CatalogueList.tsx) - Search UI

### 3.4 Empty State

- [ ] T025 [P] [US1] Add empty state rendering to CatalogueList (apps/web/src/components/catalogue/CatalogueList.tsx) - Show message when no entities

### 3.5 Drag-and-Drop Reordering

- [ ] T026 [US1] Install @dnd-kit dependencies (if not present) - `pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- [ ] T027 [P] [US1] Implement reorderEntity method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Atomic position updates
- [ ] T028 [US1] Integrate DndContext in CatalogueEntities component (apps/web/src/components/catalogue/CatalogueEntities.tsx) - Setup drag-and-drop context
- [ ] T029 [US1] Make entity items sortable with useSortable hook (apps/web/src/components/catalogue/CatalogueEntities.tsx) - Individual sortable items
- [ ] T030 [US1] Add keyboard navigation support for reordering (apps/web/src/components/catalogue/CatalogueEntities.tsx) - Accessibility

### 3.6 Entity Notes

- [ ] T031 [P] [US1] Implement updateEntityNote method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Update note field
- [ ] T032 [US1] Add note editing UI to entity items in CatalogueEntities (apps/web/src/components/catalogue/CatalogueEntities.tsx) - Inline note editor

### 3.7 Bulk Operations

- [ ] T033 [P] [US1] Implement bulkRemoveEntities method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Transaction-based bulk delete
- [ ] T034 [P] [US1] Implement bulkMoveEntities method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Move entities between lists
- [ ] T035 [US1] Add multi-select UI to CatalogueEntities (apps/web/src/components/catalogue/CatalogueEntities.tsx) - Checkbox selection
- [ ] T036 [US1] Add bulk action buttons (delete, move) to CatalogueList (apps/web/src/components/catalogue/CatalogueList.tsx) - Bulk operation UI

**Phase Validation**: Run `pnpm test:e2e catalogue-entity-management.e2e.test.ts` → 9/9 tests pass

## Phase 4: User Story 2 - Catalogue Import/Export (P2)

**Goal**: Fix 9 failing tests for import/export functionality (Tests 73-81)

**Story**: Users can export lists in various formats, import from files/compressed data, preview import data, handle validation errors, detect duplicates, and process large datasets.

**Test File**: `apps/web/src/test/e2e/catalogue-import-export.e2e.test.ts`

**Independent Test Criteria**: Run `pnpm test:e2e catalogue-import-export.e2e.test.ts` → All 9 tests pass (Tests 73-81)

**Dependencies**: US1 complete (needs working entity management to test import/export)

### 4.1 Export Functionality

- [ ] T037 [US2] Install pako compression library (if not present) - `pnpm add pako` and `pnpm add -D @types/pako`
- [ ] T038 [P] [US2] Implement exportList method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Convert list to ExportFormat
- [ ] T039 [P] [US2] Implement exportListCompressed method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Compress with pako + Base64URL encoding
- [ ] T040 [P] [US2] Implement exportListAsFile method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Trigger file download
- [ ] T041 [US2] Implement ExportModal component UI (apps/web/src/components/catalogue/ExportModal.tsx) - Format selection and export buttons

### 4.2 Import Functionality

- [ ] T042 [P] [US2] Implement importList method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Import from ExportFormat
- [ ] T043 [P] [US2] Implement importListCompressed method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Decompress and import
- [ ] T044 [P] [US2] Implement importListFromFile method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Handle file upload
- [ ] T045 [US2] Implement ImportModal component UI (apps/web/src/components/catalogue/ImportModal.tsx) - File upload and URL input

### 4.3 Validation and Preview

- [ ] T046 [P] [US2] Implement validateImportData method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Schema validation with errors
- [ ] T047 [P] [US2] Implement previewImport method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Preview metadata and duplicates
- [ ] T048 [US2] Add import preview UI to ImportModal (apps/web/src/components/catalogue/ImportModal.tsx) - Show preview before confirming

### 4.4 Error Handling

- [ ] T049 [P] [US2] Add error handling for malformed import data in importListCompressed (apps/web/src/hooks/useCatalogue.ts) - Try/catch with clear messages
- [ ] T050 [US2] Add error display in ImportModal (apps/web/src/components/catalogue/ImportModal.tsx) - Show validation errors to user

### 4.5 Large Dataset Support

- [ ] T051 [P] [US2] Add progress indicator for large imports (>100 entities) in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Chunked processing
- [ ] T052 [US2] Add loading state UI to ImportModal (apps/web/src/components/catalogue/ImportModal.tsx) - Progress bar

**Phase Validation**: Run `pnpm test:e2e catalogue-import-export.e2e.test.ts` → 9/9 tests pass

## Phase 5: User Story 3 - Catalogue Sharing (P3)

**Goal**: Fix 9 failing tests for sharing functionality (Tests 89-97)

**Story**: Users can generate share URLs, copy to clipboard, display QR codes, import from shared URLs, handle invalid URLs, and share both lists and bibliographies.

**Test File**: `apps/web/src/test/e2e/catalogue-sharing-functionality.e2e.test.ts`

**Independent Test Criteria**: Run `pnpm test:e2e catalogue-sharing-functionality.e2e.test.ts` → All 9 tests pass (Tests 89-97)

**Dependencies**: US2 complete (sharing uses export/import infrastructure)

### 5.1 Share URL Generation

- [ ] T053 [US3] Install qrcode library (if not present) - `pnpm add qrcode` and `pnpm add -D @types/qrcode`
- [ ] T054 [P] [US3] Implement generateShareURL method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Create share token, export, compress, encode
- [ ] T055 [P] [US3] Implement share token generation logic in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - UUID generation and storage
- [ ] T056 [P] [US3] Mark list as public when shared in generateShareURL (apps/web/src/hooks/useCatalogue.ts) - Update isPublic field
- [ ] T057 [US3] Implement ShareModal component UI (apps/web/src/components/catalogue/ShareModal.tsx) - Share URL display

### 5.2 QR Code Generation

- [ ] T058 [P] [US3] Implement generateQRCode method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Use qrcode library
- [ ] T059 [US3] Add QR code display to ShareModal (apps/web/src/components/catalogue/ShareModal.tsx) - Show QR code image

### 5.3 Clipboard Integration

- [ ] T060 [P] [US3] Implement copyToClipboard method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Use Clipboard API
- [ ] T061 [US3] Add copy button to ShareModal (apps/web/src/components/catalogue/ShareModal.tsx) - Mantine CopyButton component

### 5.4 Import from Share URL

- [ ] T062 [P] [US3] Implement importFromShareURL method in useCatalogue hook (apps/web/src/hooks/useCatalogue.ts) - Parse URL, extract data, import
- [ ] T063 [US3] Add share URL input to ImportModal (apps/web/src/components/catalogue/ImportModal.tsx) - URL paste field
- [ ] T064 [US3] Implement URL query parameter detection in catalogue route (apps/web/src/routes/catalogue.tsx) - Auto-import from ?data= parameter

### 5.5 URL Validation

- [ ] T065 [P] [US3] Add URL validation in importFromShareURL (apps/web/src/hooks/useCatalogue.ts) - Check format and decompress safely
- [ ] T066 [US3] Add error handling for invalid URLs in ImportModal (apps/web/src/components/catalogue/ImportModal.tsx) - Display clear error messages

### 5.6 Bibliography Support

- [ ] T067 [P] [US3] Ensure sharing works for bibliography lists (isBibliography flag) in generateShareURL (apps/web/src/hooks/useCatalogue.ts) - Include flag in export

**Phase Validation**: Run `pnpm test:e2e catalogue-sharing-functionality.e2e.test.ts` → 9/9 tests pass

## Phase 6: User Story 4 - UI Components (P3)

**Goal**: Fix 1 failing test for Mantine UI component accessibility (Test 87)

**Story**: All catalogue-related Mantine UI components render with proper ARIA labels, roles, and accessibility attributes.

**Independent Test Criteria**: Run test 87 "should have proper Mantine UI components for catalogue" → Pass

**Dependencies**: US1, US2, US3 complete (needs all UI components implemented)

### 6.1 Accessibility Audit

- [ ] T068 [P] [US4] Audit all catalogue modals for ARIA attributes (apps/web/src/components/catalogue/) - Check Modal components
- [ ] T069 [P] [US4] Audit all catalogue forms for proper labels (apps/web/src/components/catalogue/) - Check TextInput, Textarea
- [ ] T070 [P] [US4] Audit all catalogue buttons for accessible labels (apps/web/src/components/catalogue/) - Check Button, ActionIcon
- [ ] T071 [P] [US4] Audit catalogue tables for proper structure (apps/web/src/components/catalogue/CatalogueEntities.tsx) - Check Table, th, td

### 6.2 Accessibility Fixes

- [ ] T072 [US4] Add missing ARIA labels to catalogue components (apps/web/src/components/catalogue/) - Fix any gaps found in audit
- [ ] T073 [US4] Ensure focus management in modals (apps/web/src/components/catalogue/) - Mantine handles this, verify it works
- [ ] T074 [US4] Add keyboard navigation hints (apps/web/src/components/catalogue/) - aria-describedby for complex interactions

**Phase Validation**: Run test 87 → Pass

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Final polish, performance optimization, and full test suite validation

### 7.1 Performance Optimization

- [ ] T075 [P] Add virtual scrolling for large entity lists (>100 entities) using @tanstack/react-virtual in CatalogueEntities (apps/web/src/components/catalogue/CatalogueEntities.tsx)
- [ ] T076 [P] Optimize Dexie queries with proper indexing (apps/web/src/lib/db/catalogue-db.ts) - Verify compound indexes work
- [ ] T077 [P] Add loading states to all async operations in catalogue components (apps/web/src/components/catalogue/)

### 7.2 Error Handling

- [ ] T078 [P] Implement error boundaries for catalogue components (apps/web/src/components/catalogue/CatalogueErrorBoundary.tsx) - Catch rendering errors
- [ ] T079 [P] Add user-friendly error messages for storage failures (apps/web/src/hooks/useCatalogue.ts) - Improve error feedback

### 7.3 Final Validation

- [ ] T080 Run full E2E test suite (`pnpm test:e2e`) → 232/232 tests passing
- [ ] T081 Run TypeScript compilation (`pnpm typecheck`) → No errors
- [ ] T082 Run full validation pipeline (`pnpm verify`) → All checks pass
- [ ] T083 Manual testing of catalogue feature end-to-end - Add, reorder, export, import, share
- [ ] T084 Performance testing with 100+ entity list - Verify no UI freezing

**Phase Validation**: All 232 E2E tests pass, no TypeScript errors, full feature working

---

## Task Dependencies

### User Story Completion Order

```
Phase 1: Setup (no dependencies)
  ↓
Phase 2: Foundational (depends on Setup)
  ↓
Phase 3: US1 - Entity Management (depends on Foundational) [INDEPENDENT]
  ↓
Phase 4: US2 - Import/Export (depends on US1)
  ↓
Phase 5: US3 - Sharing (depends on US2)
  ↓
Phase 6: US4 - UI Components (depends on US1, US2, US3)
  ↓
Phase 7: Polish (depends on all user stories)
```

### Story Independence

- **US1**: Fully independent after Foundational phase complete
- **US2**: Requires US1 (needs working entities to import/export)
- **US3**: Requires US2 (sharing uses export/import)
- **US4**: Requires US1, US2, US3 (validates all UI components)

### Parallel Execution Opportunities

**Within Each Phase**: Tasks marked `[P]` can run in parallel

**Phase 2 Example** (all parallelizable):
```bash
# Run all Phase 2 tasks in parallel
T006, T007, T008, T009, T010, T011 in parallel (type definitions, guards, validation)
Then T012 (database schema depends on types)
```

**Phase 3.1 Example** (some parallel):
```bash
# Hook methods in parallel
T013 [P], T014 [P], T015 [P], T016 [P] in parallel (different methods)

# Then component fixes (depend on hook)
T017, T018, T019 sequentially or carefully parallelized
```

**Phase 4.1 Example** (highly parallelizable):
```bash
T037 (install pako) first
Then T038 [P], T039 [P], T040 [P] in parallel (different methods)
Then T041 (modal depends on methods)
```

---

## Success Criteria

### Per-Phase Validation

Each phase has independent test criteria to validate completion before moving to next phase:

1. **Phase 2**: `pnpm typecheck` passes
2. **Phase 3**: `pnpm test:e2e catalogue-entity-management.e2e.test.ts` → 9/9 tests pass
3. **Phase 4**: `pnpm test:e2e catalogue-import-export.e2e.test.ts` → 9/9 tests pass
4. **Phase 5**: `pnpm test:e2e catalogue-sharing-functionality.e2e.test.ts` → 9/9 tests pass
5. **Phase 6**: Test 87 passes
6. **Phase 7**: `pnpm test:e2e` → 232/232 tests pass

### Final Success Criteria (from spec.md)

- **SC-001**: 100% catalogue entity management tests pass (9/9) ✓
- **SC-002**: 100% catalogue import/export tests pass (9/9) ✓
- **SC-003**: 100% catalogue sharing tests pass (9/9) ✓
- **SC-004**: 100% catalogue UI component tests pass (1/1) ✓
- **SC-005**: Total test pass rate 100% (232/232 vs 205/232 initial) ✓
- **SC-006**: Performance targets met (<500ms add, <2s export, <5s import) ✓
- **SC-007**: Import/export maintains data integrity (zero data loss) ✓
- **SC-008**: Share URLs remain valid for public list lifetime ✓
- **SC-009**: Drag-and-drop order persists across reloads ✓
- **SC-010**: Bulk operations handle 100+ entities without freezing ✓

---

## Implementation Notes

### Test-Driven Repair Workflow

For each task:
1. **Run test** → Identify specific failure
2. **Read test code** → Understand expectation
3. **Fix implementation** → Match expectation exactly
4. **Re-run test** → Verify it passes
5. **Check regressions** → Full suite still passes

### DO NOT Modify Tests

Tests define expected behavior. If implementation doesn't match test expectations, **fix the implementation, not the test**.

### Constitution Compliance

All tasks must maintain:
- **Type Safety**: Use discriminated unions, no `any` types
- **Test-First**: Tests exist and failing, implementation follows
- **Monorepo**: All changes in apps/web
- **Storage Abstraction**: Use useCatalogue hook, not direct Dexie
- **Performance**: Serial test execution, <2s storage ops

### File Paths

All file paths are absolute from repository root:
- Components: `apps/web/src/components/catalogue/*.tsx`
- Hook: `apps/web/src/hooks/useCatalogue.ts`
- Types: `apps/web/src/types/catalogue.ts`
- Utils: `apps/web/src/utils/catalogue-*.ts`
- Tests: `apps/web/src/test/e2e/catalogue-*.e2e.test.ts`

### References

- [Feature Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Technical Research](./research.md)
- [Data Model](./data-model.md)
- [API Contracts](./contracts/)
- [Developer Quickstart](./quickstart.md)

---

**Task Generation Complete**: 2025-11-11

**Total Tasks**: 84
**Parallelizable Tasks**: 42 (50%)
**User Stories**: 4
**MVP Scope**: Phase 3 (US1) - 24 tasks
**Ready for**: `/speckit.implement` or manual implementation per quickstart guide
