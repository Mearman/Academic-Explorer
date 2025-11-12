---
description: "Task list for Bookmark Query Views feature implementation"
---

# Tasks: Bookmark Query Views

**Input**: Design documents from `/specs/008-bookmark-query-views/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo structure**: `apps/web/`, `packages/*/`
- Paths follow Nx workspace conventions
- Tests: `apps/web/src/test/` for E2E, `packages/*/src/*.test.ts` for unit tests

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create bookmark types and schemas in `packages/types/src/bookmark.ts` with Zod validation
- [X] T002 [P] Add bookmark route type definitions to TanStack Router in `apps/web/src/routes/bookmarks/`
- [ ] T003 [P] Configure ESLint rules for bookmark module consistency

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Verify CatalogueStorageProvider interface supports bookmark operations in `packages/utils/src/storage/catalogue-storage-provider.ts`
- [X] T005 Initialize Bookmarks special system catalogue with ID `bookmarks` in storage provider initialization
- [X] T006 Create bookmark entity data model extending base catalogue entity in `packages/types/src/bookmark.ts`
- [X] T007 Implement URL parameter extraction utility for preserving query parameters in `packages/utils/src/url-parser.ts`
- [X] T008 Create entity type detection utility from URL patterns in `packages/utils/src/entity-detector.ts`
- [X] T009 Add bookmark error types and validation in `packages/types/src/errors/bookmark-errors.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Bookmark Entity and Query Pages (Priority: P1) 🎯 MVP

**Goal**: Enable researchers to save and quickly return to entity pages and search query results

**Independent Test**: Bookmark an entity page, close browser, reopen, and navigate to the bookmark

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T010 [P] [US1] E2E test for bookmarking entity pages in `apps/web/src/test/e2e/bookmark-entity.e2e.test.ts`
- [ ] T011 [P] [US1] E2E test for bookmarking query pages in `apps/web/src/test/e2e/bookmark-query.e2e.test.ts`
- [ ] T012 [P] [US1] Unit test for bookmark storage operations in `packages/utils/src/storage/dexie-storage-provider.test.ts`
- [ ] T013 [P] [US1] Unit test for URL parameter extraction in `packages/utils/src/url-parser.test.ts`

### Implementation for User Story 1

- [ ] T014 [P] [US1] Create bookmark button UI component in `packages/ui/src/bookmarks/BookmarkButton.tsx`
- [ ] T015 [P] [US1] Create bookmark icon states (active/inactive) in `packages/ui/src/bookmarks/BookmarkIcon.tsx`
- [ ] T016 [US1] Implement `useBookmarks` hook in `apps/web/src/hooks/useBookmarks.ts` (uses CatalogueStorageProvider)
- [ ] T017 [US1] Create bookmark service for CRUD operations in `apps/web/src/services/bookmark-service.ts`
- [ ] T018 [US1] Add bookmark button to entity page layouts in `apps/web/src/components/layouts/EntityLayout.tsx`
- [ ] T019 [US1] Add bookmark button to search results page in `apps/web/src/routes/search/index.tsx`
- [ ] T020 [US1] Create Bookmarks catalogue view route in `apps/web/src/routes/bookmarks/index.tsx`
- [ ] T021 [US1] Implement bookmark list UI component in `packages/ui/src/bookmarks/BookmarkList.tsx`
- [ ] T022 [US1] Add delete bookmark functionality to list items in `packages/ui/src/bookmarks/BookmarkListItem.tsx`
- [ ] T023 [US1] Add timestamp formatting for bookmark creation dates in `packages/utils/src/formatters/date-formatter.ts`
- [ ] T024 [US1] Implement entity type badge component in `packages/ui/src/bookmarks/EntityTypeBadge.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Bookmark Custom Field Views (Priority: P2)

**Goal**: Enable researchers to bookmark entity pages with custom field selections using select parameter

**Independent Test**: Visit author page with custom select parameter, bookmark it, verify custom view is restored when accessing bookmark

### Tests for User Story 2 ⚠️

- [ ] T025 [P] [US2] E2E test for bookmarking custom field views in `apps/web/src/test/e2e/bookmark-custom-fields.e2e.test.ts`
- [ ] T026 [P] [US2] Unit test for select parameter preservation in `packages/utils/src/url-parser.test.ts`

### Implementation for User Story 2

- [ ] T027 [US2] Extend bookmark entity model to store select parameters in `packages/types/src/bookmark.ts`
- [ ] T028 [US2] Update URL parameter extraction to handle select parameter in `packages/utils/src/url-parser.ts`
- [ ] T029 [US2] Add field summary generation from select parameter in `packages/utils/src/field-summary.ts`
- [ ] T030 [US2] Display field selection preview in bookmark list items in `packages/ui/src/bookmarks/FieldSelectionPreview.tsx`
- [ ] T031 [US2] Update bookmark restoration to apply select parameter to entity routes in `apps/web/src/services/bookmark-service.ts`
- [ ] T032 [US2] Handle multiple bookmarks for same entity with different field selections in `apps/web/src/hooks/useBookmarks.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Organize and Search Bookmarks (Priority: P3)

**Goal**: Enable researchers to organize, tag, search, and filter large bookmark collections

**Independent Test**: Create 20+ bookmarks, add tags, then search/filter by tag, entity type, or keyword

### Tests for User Story 3 ⚠️

- [ ] T033 [P] [US3] E2E test for bookmark tagging in `apps/web/src/test/e2e/bookmark-tagging.e2e.test.ts`
- [ ] T034 [P] [US3] E2E test for bookmark search in `apps/web/src/test/e2e/bookmark-search.e2e.test.ts`
- [ ] T035 [P] [US3] Unit test for bookmark filtering logic in `packages/utils/src/bookmark-filters.test.ts`

### Implementation for User Story 3

- [ ] T036 [P] [US3] Create tag input component in `packages/ui/src/bookmarks/TagInput.tsx`
- [ ] T037 [P] [US3] Create tag badge component in `packages/ui/src/bookmarks/TagBadge.tsx`
- [ ] T038 [US3] Add tag storage to bookmark entity model in `packages/types/src/bookmark.ts`
- [ ] T039 [US3] Implement bookmark search functionality in `apps/web/src/services/bookmark-service.ts`
- [ ] T040 [US3] Create search input for bookmarks catalogue in `packages/ui/src/bookmarks/BookmarkSearch.tsx`
- [ ] T041 [US3] Add entity type filter dropdown in `packages/ui/src/bookmarks/EntityTypeFilter.tsx`
- [ ] T042 [US3] Add tag filter chips in `packages/ui/src/bookmarks/TagFilter.tsx`
- [ ] T043 [US3] Implement sort options (date, title, entity type) in `packages/ui/src/bookmarks/BookmarkSort.tsx`
- [ ] T044 [US3] Add bookmark export functionality using catalogue export in `apps/web/src/services/bookmark-service.ts`
- [ ] T045 [US3] Create export button in bookmarks catalogue toolbar in `apps/web/src/routes/bookmarks/index.tsx`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T046 [P] Add bookmark keyboard shortcuts (e.g., Cmd+D to bookmark current page) in `apps/web/src/hooks/useKeyboardShortcuts.ts`
- [ ] T047 [P] Implement bookmark list virtualization for large collections in `packages/ui/src/bookmarks/BookmarkList.tsx`
- [ ] T048 [P] Add loading states and optimistic UI updates for bookmark operations in `packages/ui/src/bookmarks/BookmarkButton.tsx`
- [ ] T049 Handle bookmark storage failures with error messages and recovery options in `apps/web/src/services/bookmark-service.ts`
- [ ] T050 Add bookmark count badge to catalogue navigation in `apps/web/src/components/navigation/CatalogueNav.tsx`
- [ ] T051 [P] Add accessibility labels and ARIA attributes to bookmark components
- [ ] T052 [P] Create bookmark documentation in `apps/web/src/docs/features/bookmarks.md`
- [ ] T053 Performance optimization: Cache URL parsing results in `packages/utils/src/url-parser.ts`
- [ ] T054 Add bookmark analytics tracking (bookmark creation, deletion, access) in `apps/web/src/services/analytics-service.ts`
- [ ] T055 Constitution compliance verification:
  - [ ] No `any` types in implementation (Type Safety)
  - [ ] All tests written before implementation (Test-First)
  - [ ] Proper Nx workspace structure used (Monorepo Architecture)
  - [ ] Bookmark storage uses CatalogueStorageProvider interface (Storage Abstraction)
  - [ ] Bookmark list virtualization implemented; performance requirements met (Performance & Memory)
  - [ ] Atomic conventional commits created after each task (Atomic Conventional Commits)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 bookmark model but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Builds on US1 bookmark operations but independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Types and models before services
- Services before UI components
- Core components before integration with routes
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- UI components within a story marked [P] can run in parallel (different files)
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "E2E test for bookmarking entity pages in apps/web/src/test/e2e/bookmark-entity.e2e.test.ts"
Task: "E2E test for bookmarking query pages in apps/web/src/test/e2e/bookmark-query.e2e.test.ts"
Task: "Unit test for bookmark storage operations in packages/utils/src/storage/dexie-storage-provider.test.ts"
Task: "Unit test for URL parameter extraction in packages/utils/src/url-parser.test.ts"

# Launch all UI components for User Story 1 together:
Task: "Create bookmark button UI component in packages/ui/src/bookmarks/BookmarkButton.tsx"
Task: "Create bookmark icon states in packages/ui/src/bookmarks/BookmarkIcon.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (core bookmarking)
   - Developer B: User Story 2 (custom field views)
   - Developer C: User Story 3 (organization and search)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group using conventional commit format: `feat(scope): description`
- Stop at any checkpoint to validate story independently
- Bookmarks leverage existing CatalogueStorageProvider - no new storage implementation needed
- Special system catalogue pattern already established for Bookmarks and History catalogues
