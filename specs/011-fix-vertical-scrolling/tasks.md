# Tasks: Fix Vertical Scrolling in Layout

**Input**: Design documents from `/specs/011-fix-vertical-scrolling/`
**Prerequisites**: plan.md (complete), spec.md (complete), quickstart.md (complete)

**Tests**: Test-First Development approach - E2E tests written and verified to FAIL before CSS fixes

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Monorepo structure: `apps/web/src/` for source code, `apps/web/src/test/e2e/manual/` for E2E tests
- Paths follow Academic Explorer Nx workspace conventions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify prerequisites and environment

**Status**: No setup needed - using existing MainLayout.tsx and Playwright infrastructure

- [ ] T001 Verify Playwright E2E test infrastructure is functional by running existing homepage tests
- [ ] T002 Verify MainLayout.tsx is using Mantine 7.x AppShell components (check imports)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story implementation

**Status**: No foundational work needed - this is a CSS fix to existing component

- [ ] T003 Document current scroll behavior by taking screenshots of nested scrollbars in main content area
- [ ] T004 Verify both sidebars can be populated with 50+ items for testing (bookmarks and history)

**Checkpoint**: Foundation verified - user story implementation can begin

---

## Phase 3: User Story 1 - Seamless Content Navigation (Priority: P1) 🎯 MVP

**Goal**: Eliminate nested scrollbars in main content area so users have one clear scroll context

**Independent Test**: Open both sidebars, scroll main content area, verify no nested scrollbar appears in central section (only viewport scrollbar)

### E2E Tests for User Story 1 (Test-First - Red Phase)

> **NOTE: Write these tests FIRST, ensure they FAIL before CSS fixes**
> **NAMING**: Following pattern `layout-scrolling.e2e.test.ts` (e2e type)

- [ ] T005 [P] [US1] Create E2E test file apps/web/src/test/e2e/manual/layout-scrolling.e2e.test.ts with test suite structure
- [ ] T006 [P] [US1] Add E2E test: "main content area has no nested scrollbar" - navigate to /bookmarks, verify no overflow scrollbar in main Box in apps/web/src/test/e2e/manual/layout-scrolling.e2e.test.ts
- [ ] T007 [P] [US1] Add E2E test: "scrolling main content does not create nested scrollbars" - add long content, scroll, verify single scrollbar in apps/web/src/test/e2e/manual/layout-scrolling.e2e.test.ts
- [ ] T008 [P] [US1] Add E2E test: "main content fills viewport height correctly" - verify calc(100vh - 60px) is respected in apps/web/src/test/e2e/manual/layout-scrolling.e2e.test.ts
- [ ] T009 [US1] Run E2E tests for User Story 1 and verify they FAIL (confirming nested scrollbar bug exists)

**Verification Checkpoint**: All US1 tests should FAIL at this point (Red phase confirmed)

### CSS Fix Implementation for User Story 1 (Green Phase)

- [ ] T010 [US1] Remove overflow: "auto" from main content Box style prop (line 485) in apps/web/src/components/layout/MainLayout.tsx
- [ ] T011 [US1] Verify height calculation calc(100vh - 60px) remains unchanged (line 485) in apps/web/src/components/layout/MainLayout.tsx
- [ ] T012 [US1] Run TypeScript typecheck to ensure no type errors introduced: pnpm typecheck
- [ ] T013 [US1] Run E2E tests for User Story 1 and verify they now PASS (Green phase)

### Validation for User Story 1

- [ ] T014 [US1] Manual test: Navigate to /bookmarks with both sidebars open, verify no nested scrollbar in main content
- [ ] T015 [US1] Manual test: Navigate to /catalogue, verify layout works correctly without overflow: auto
- [ ] T016 [US1] Manual test: Resize browser window from 1920x1080 to 800x600, verify no layout breaks
- [ ] T017 [US1] Run full existing E2E test suite to ensure no regressions: pnpm test:e2e

### Commit for User Story 1

- [ ] T018 [US1] Create atomic commit for tests: git add apps/web/src/test/e2e/manual/layout-scrolling.e2e.test.ts && git commit -m "test(layout): add E2E tests for scroll behavior isolation"
- [ ] T019 [US1] Create atomic commit for CSS fix: git add apps/web/src/components/layout/MainLayout.tsx && git commit -m "fix(layout): eliminate nested scrollbar in main content area"

**Checkpoint**: User Story 1 complete - main content area has no nested scrollbars ✅

---

## Phase 4: User Story 2 - Sidebar Content Access (Priority: P2)

**Goal**: Verify sidebars scroll independently without affecting main content or creating visual glitches

**Independent Test**: Populate sidebars with 50+ items, scroll each sidebar independently, verify main content scroll position unchanged and no glitches

### E2E Tests for User Story 2 (Test-First - Red Phase)

> **NAMING**: Adding to existing `layout-scrolling.e2e.test.ts` file

- [ ] T020 [P] [US2] Add E2E test: "left sidebar scrolls independently with 50+ bookmarks" - populate left sidebar, scroll it, verify main content position unchanged in apps/web/src/test/e2e/manual/layout-scrolling.e2e.test.ts
- [ ] T021 [P] [US2] Add E2E test: "right sidebar scrolls independently with 50+ history items" - populate right sidebar, scroll it, verify main content position unchanged in apps/web/src/test/e2e/manual/layout-scrolling.e2e.test.ts
- [ ] T022 [P] [US2] Add E2E test: "scroll context switches seamlessly between sections" - scroll left sidebar, then main, then right, verify no double-scrolling in apps/web/src/test/e2e/manual/layout-scrolling.e2e.test.ts
- [ ] T023 [P] [US2] Add E2E test: "keyboard navigation works across scroll contexts" - Tab through focusable elements, verify no focus trapping in apps/web/src/test/e2e/manual/layout-scrolling.e2e.test.ts
- [ ] T024 [US2] Run new E2E tests for User Story 2 and verify they PASS (should pass after US1 fix)

**Verification Checkpoint**: All US2 tests should PASS (sidebar overflow was already correct)

### Verification for User Story 2

- [ ] T025 [US2] Verify left sidebar has overflowY: "auto" at line 287 in apps/web/src/components/layout/MainLayout.tsx (no changes needed)
- [ ] T026 [US2] Verify right sidebar has overflowY: "auto" at line 429 in apps/web/src/components/layout/MainLayout.tsx (no changes needed)
- [ ] T027 [US2] Manual test: Create 50+ bookmarks, scroll left sidebar, verify smooth scrolling without glitches
- [ ] T028 [US2] Manual test: Browse 50+ entities to populate history, scroll right sidebar, verify isolation from main content
- [ ] T029 [US2] Manual test: Small viewport (1024x600), verify all three scroll contexts work correctly

### Commit for User Story 2

- [ ] T030 [US2] Create atomic commit for sidebar tests: git add apps/web/src/test/e2e/manual/layout-scrolling.e2e.test.ts && git commit -m "test(layout): add E2E tests for independent sidebar scrolling"

**Checkpoint**: User Story 2 complete - sidebars scroll independently ✅

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation updates

- [ ] T031 Run all quickstart.md manual test procedures (7 test scenarios)
- [ ] T032 [P] Update specs/011-fix-vertical-scrolling/plan.md with implementation notes if needed
- [ ] T033 [P] Take after-fix screenshots showing corrected scroll behavior for documentation
- [ ] T034 Run full test suite to verify no regressions: pnpm validate
- [ ] T035 Constitution compliance verification:
  - [ ] No `any` types in implementation (Type Safety) ✅
  - [ ] Tests written before CSS fix (Test-First) ✅
  - [ ] Changes confined to apps/web structure (Monorepo Architecture) ✅
  - [ ] N/A - no storage operations (Storage Abstraction) ✅
  - [ ] No memory leaks, improved scroll performance (Performance & Memory) ✅
  - [ ] Two atomic commits created after task completion (Atomic Conventional Commits) ✅

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verify existing infrastructure
- **Foundational (Phase 2)**: Depends on Setup - document current state
- **User Story 1 (Phase 3)**: Depends on Foundational - can start immediately after
- **User Story 2 (Phase 4)**: Depends on US1 completion (tests rely on fixed main content)
- **Polish (Phase 5)**: Depends on US1 and US2 completion

### User Story Dependencies

- **User Story 1 (P1)**: BLOCKS User Story 2 - must fix main content before verifying sidebar isolation
- **User Story 2 (P2)**: Depends on US1 - can only verify sidebar independence after main content fix

### Within Each User Story

- Tests MUST be written and verified to FAIL before CSS implementation (Test-First)
- CSS fix before validation
- Manual testing before commits
- Both atomic commits (test + fix) before moving to next story

### Parallel Opportunities

**Phase 1 - Setup (Parallel)**:
- T001 and T002 can run in parallel (verification tasks)

**Phase 2 - Foundational (Parallel)**:
- T003 and T004 can run in parallel (documentation tasks)

**Phase 3 - User Story 1 Tests (Parallel)**:
- T006, T007, T008 can be written in parallel (different test cases)

**Phase 4 - User Story 2 Tests (Parallel)**:
- T020, T021, T022, T023 can be written in parallel (different test cases)

**Phase 5 - Polish (Parallel)**:
- T032 and T033 can run in parallel (documentation updates)

---

## Parallel Example: User Story 1 E2E Tests

```bash
# Launch all test writing tasks for User Story 1 together:
Task 1: "Add E2E test: main content area has no nested scrollbar in apps/web/src/test/e2e/manual/layout-scrolling.e2e.test.ts"
Task 2: "Add E2E test: scrolling main content does not create nested scrollbars in apps/web/src/test/e2e/manual/layout-scrolling.e2e.test.ts"
Task 3: "Add E2E test: main content fills viewport height correctly in apps/web/src/test/e2e/manual/layout-scrolling.e2e.test.ts"

# After all three tests written, run verification:
Task 4: "Run E2E tests and verify they FAIL (Red phase)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify infrastructure)
2. Complete Phase 2: Foundational (document current state)
3. Complete Phase 3: User Story 1 (eliminate nested scrollbar in main content)
4. **STOP and VALIDATE**: Run all US1 E2E tests, verify they pass
5. **STOP and VALIDATE**: Manual testing per quickstart.md
6. Deploy/demo if ready - this fixes the critical UX bug

### Incremental Delivery

1. Setup + Foundational → Environment verified
2. User Story 1 → Test independently → Deploy/Demo (MVP - fixes main scrollbar bug!) ✅
3. User Story 2 → Test independently → Deploy/Demo (confirms sidebar independence)
4. Polish → Final validation → Production ready

### Sequential Execution (Recommended)

Since this is a small bug fix affecting a single component:

1. One developer completes phases 1-5 sequentially
2. User Story 2 depends on User Story 1 completion
3. Total estimated time: 2-4 hours for complete fix + tests + validation

---

## Notes

- [P] tasks = different test cases or documentation files, no dependencies
- [Story] label maps task to specific user story (US1 or US2)
- US1 BLOCKS US2 - main content fix must be complete before sidebar tests meaningful
- Verify E2E tests fail before implementing CSS fix (Test-First principle)
- Two atomic commits: one for tests, one for fix (per constitution)
- Each user story independently testable after completion
- Stop at any checkpoint to validate story before proceeding
- quickstart.md provides detailed manual testing procedures for each checkpoint

---

## Total Task Summary

**Total Tasks**: 35
**Setup Tasks**: 2
**Foundational Tasks**: 2
**User Story 1 Tasks**: 15 (5 tests + 4 implementation + 4 validation + 2 commits)
**User Story 2 Tasks**: 11 (5 tests + 2 verification + 3 validation + 1 commit)
**Polish Tasks**: 5

**Parallel Opportunities**: 12 tasks marked [P] can run in parallel within their phases

**MVP Scope**: Phases 1-3 (User Story 1 only) - fixes critical nested scrollbar bug

**Independent Test Criteria**:
- US1: Open both sidebars, scroll main content, verify no nested scrollbar in central section
- US2: Populate sidebars with 50+ items, scroll each independently, verify main content unchanged
