# Tasks: E2E Test Coverage Enhancement

**Input**: Design documents from `/specs/020-e2e-test-coverage/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Feature**: Identify and remediate gaps in E2E test coverage for the Academic Explorer web application. Add missing tests for untested routes, implement workflow tests, add error scenario coverage, and automate high-value manual tests. All discovered test failures will be resolved, and the test suite will achieve consistent pass rates with zero flaky tests over 10 consecutive CI runs.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. Each user story represents an independently testable increment that delivers measurable value.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **E2E tests (newer, spec-013+)**: `apps/web/e2e/*.e2e.test.ts`
- **E2E tests (legacy, pre-spec-013)**: `apps/web/src/test/e2e/*.e2e.test.ts`
- **Test helpers**: `apps/web/src/test/helpers/`
- **Page objects**: `apps/web/src/test/page-objects/`
- **Playwright config**: `apps/web/playwright.config.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and test infrastructure setup

- [x] T001 Audit existing E2E test suite for failures in apps/web/e2e/ and apps/web/src/test/e2e/
- [x] T002 Document all failing tests in specs/020-e2e-test-coverage/audit-results.md
- [x] T003 Update playwright.config.ts to enforce serial execution (workers: 1, maxConcurrency: 1)
- [x] T004 [P] Create BasePageObject implementation in apps/web/src/test/page-objects/BasePageObject.ts
- [x] T005 [P] Create BaseSPAPageObject implementation in apps/web/src/test/page-objects/BaseSPAPageObject.ts
- [x] T006 [P] Create BaseEntityPageObject implementation in apps/web/src/test/page-objects/BaseEntityPageObject.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core test infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 [P] Implement NavigationHelper in apps/web/src/test/helpers/NavigationHelper.ts
- [x] T008 [P] Implement StorageTestHelper in apps/web/src/test/helpers/StorageTestHelper.ts
- [x] T009 [P] Implement AssertionHelper in apps/web/src/test/helpers/AssertionHelper.ts
- [x] T010 [P] Implement ApiMockHelper in apps/web/src/test/helpers/ApiMockHelper.ts
- [x] T011 [P] Implement PerformanceHelper in apps/web/src/test/helpers/PerformanceHelper.ts
- [x] T012 Create app-ready check helper in apps/web/src/test/helpers/app-ready.ts
- [x] T013 Fix all pre-existing test failures documented in audit-results.md
- [x] T014 Verify smoke suite passes (32 tests) with pnpm nx e2e web
- [ ] T015 Create route manifest in apps/web/coverage/route-manifest.ts with all 46 route patterns

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Critical Route Coverage (Priority: P1) 🎯 MVP

**Goal**: Add E2E tests for all untested entity routes (Domains, Fields, Subfields, Browse, Search, Explore, utility pages). Ensure all 12 entity type index routes and detail pages have basic test coverage.

**Independent Test**: Run `E2E_FULL_SUITE=true pnpm nx e2e web --grep="@entity"` - all entity routes should have passing tests showing title display, metadata rendering, and relationship visualization.

**Coverage Gap Addressed**: 12 untested routes (domains, fields, subfields, browse, search, explore, about, settings, cache, history, privacy, terms)

### Page Objects for User Story 1

- [x] T016 [P] [US1] Create DomainsDetailPage in apps/web/src/test/page-objects/DomainsDetailPage.ts
- [x] T017 [P] [US1] Create FieldsDetailPage in apps/web/src/test/page-objects/FieldsDetailPage.ts
- [x] T018 [P] [US1] Create SubfieldsDetailPage in apps/web/src/test/page-objects/SubfieldsDetailPage.ts
- [x] T019 [P] [US1] Create BrowsePage in apps/web/src/test/page-objects/BrowsePage.ts
- [x] T020 [P] [US1] Create SearchPage in apps/web/src/test/page-objects/SearchPage.ts
- [x] T021 [P] [US1] Create ExplorePage in apps/web/src/test/page-objects/ExplorePage.ts
- [x] T022 [P] [US1] Create SettingsPage in apps/web/src/test/page-objects/SettingsPage.ts

### Entity Detail Tests (P1 - Critical)

- [x] T023 [P] [US1] Create domains.e2e.test.ts in apps/web/e2e/ with tests for domain title, metadata, relationships
- [x] T024 [P] [US1] Create fields.e2e.test.ts in apps/web/e2e/ with tests for field title, metadata, relationships
- [x] T025 [P] [US1] Create subfields.e2e.test.ts in apps/web/e2e/ with tests for subfield title, metadata, relationships
- [ ] T026 [US1] Verify all 12 entity types have detail page tests (run coverage check)

### Utility Page Tests (P1 - Critical)

- [x] T027 [P] [US1] Create browse.e2e.test.ts in apps/web/src/test/e2e/ with tests for entity type grid, navigation
- [x] T028 [P] [US1] Create search.e2e.test.ts in apps/web/src/test/e2e/ with tests for search input, basic results display
- [x] T029 [P] [US1] Create explore.e2e.test.ts in apps/web/src/test/e2e/ with tests for explore page rendering
- [x] T030 [P] [US1] Create settings.e2e.test.ts in apps/web/src/test/e2e/ with tests for settings toggles, persistence
- [x] T031 [P] [US1] Create about.e2e.test.ts in apps/web/src/test/e2e/ with tests for about page content
- [x] T032 [P] [US1] Create cache.e2e.test.ts in apps/web/src/test/e2e/ with tests for cache management UI
- [x] T033 [P] [US1] Create history.e2e.test.ts in apps/web/src/test/e2e/ with tests for history catalogue display

### Validation for User Story 1

- [ ] T034 [US1] Run route coverage script (create if needed) to verify 20+ percentage point increase
- [ ] T035 [US1] Verify all US1 tests pass in isolation with pnpm exec playwright test --grep="@entity|@utility"
- [x] T036 [US1] Commit US1 tests with conventional commit message: test(e2e): add critical route coverage tests

**Checkpoint**: At this point, User Story 1 should be fully functional - all entity routes and utility pages have basic E2E test coverage. Route coverage should increase by 20+ percentage points.

---

## Phase 4: User Story 2 - Workflow Coverage (Priority: P2)

**Goal**: Add E2E tests for multi-step workflows including search (query → results → filtering), browse (navigation → entity selection), and graph interaction (pan, zoom, node selection, edge filtering).

**Independent Test**: Run `pnpm exec playwright test --grep="@workflow"` - all workflow tests should pass showing complete user journeys from start to finish.

**Coverage Gap Addressed**: 5 workflow gaps (search workflow, browse workflow, graph pan/zoom, graph node selection, graph filtering)

### Workflow Tests for User Story 2

- [x] T037 [P] [US2] Create search-workflow.e2e.test.ts in apps/web/e2e/ with tests for: query entry → results display → entity type filtering → result click → detail page
- [x] T038 [P] [US2] Create browse-workflow.e2e.test.ts in apps/web/e2e/ with tests for: browse page load → entity type selection → index page → entity selection → detail page
- [x] T039 [P] [US2] Create graph-interaction.e2e.test.ts in apps/web/e2e/ with tests for: pan, zoom, node selection, node drag, edge filtering
- [x] T040 [P] [US2] Create catalogue-workflow.e2e.test.ts in apps/web/e2e/ with tests for: create list → add entities → view list → remove entities → delete list
- [x] T041 [P] [US2] Create bookmark-workflow.e2e.test.ts in apps/web/e2e/ with tests for: bookmark entity → view bookmarks → unbookmark entity

### Multi-Viewport Tests for User Story 2

- [x] T042 [P] [US2] Add mobile viewport tests to search-workflow.e2e.test.ts (viewport: 375x667)
- [x] T043 [P] [US2] Add tablet viewport tests to graph-interaction.e2e.test.ts (viewport: 768x1024)
- [x] T044 [P] [US2] Add desktop viewport tests to browse-workflow.e2e.test.ts (viewport: 1920x1080)

### Validation for User Story 2

- [x] T045 [US2] Verify all US2 workflow tests pass with pnpm exec playwright test --grep="@workflow"
- [x] T046 [US2] Verify workflow tests complete within performance targets (search <5s, graph <10s)
- [x] T047 [US2] Commit US2 tests with conventional commit message: test(e2e): add workflow coverage tests

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. All major user workflows are tested end-to-end.

---

## Phase 5: User Story 3 - Error Scenario Coverage (Priority: P2)

**Goal**: Add E2E tests for error handling including 404 errors, 500 errors, network failures, timeouts, and malformed URLs. Ensure error UI displays correctly with retry buttons and recovery actions.

**Independent Test**: Run `pnpm exec playwright test --grep="@error"` - all error scenario tests should pass showing proper error UI display and recovery mechanisms.

**Coverage Gap Addressed**: 5 error scenarios (404 errors, 500 errors, network failures, timeouts, malformed URLs)

### Page Objects for User Story 3

- [x] T048 [P] [US3] Create ErrorPage implementation in apps/web/src/test/page-objects/ErrorPage.ts

### Error Scenario Tests for User Story 3

- [x] T049 [P] [US3] Create error-404.e2e.test.ts in apps/web/e2e/ with tests for: non-existent work, non-existent author, non-existent institution, error message, retry button, back to home link
- [x] T050 [P] [US3] Create error-500.e2e.test.ts in apps/web/e2e/ with tests for: server error response, error message, retry button (mocked with ApiMockHelper)
- [x] T051 [P] [US3] Create error-network.e2e.test.ts in apps/web/e2e/ with tests for: network disconnection, network failure message, retry button, offline mode (mocked with ApiMockHelper)
- [x] T052 [P] [US3] Create error-timeout.e2e.test.ts in apps/web/e2e/ with tests for: request timeout, timeout error message, retry button (mocked with ApiMockHelper)
- [x] T053 [P] [US3] Create error-malformed-url.e2e.test.ts in apps/web/e2e/ with tests for: invalid entity ID format, malformed DOI, collapsed protocol URLs (https:/doi.org), error handling

### Error Recovery Tests for User Story 3

- [x] T054 [US3] Add retry mechanism tests to error-404.e2e.test.ts (click retry → navigate back)
- [x] T055 [US3] Add retry mechanism tests to error-500.e2e.test.ts (click retry → reload page)
- [x] T056 [US3] Add retry mechanism tests to error-network.e2e.test.ts (click retry → reattempt request)

### Validation for User Story 3

- [x] T057 [US3] Verify all US3 error tests pass with pnpm exec playwright test --grep="@error"
- [x] T058 [US3] Verify error UI accessibility with @axe-core/playwright scans
- [ ] T059 [US3] Commit US3 tests with conventional commit message: test(e2e): add error scenario coverage tests

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently. All error scenarios are tested with proper recovery mechanisms.

---

## Phase 6: User Story 4 - Manual Test Automation (Priority: P3)

**Goal**: Review 13 manual test files in apps/web/src/test/e2e/manual/ and automate high-value tests based on ROI scoring (Impact × Frequency × Speed - Maintenance). Only automate tests with ROI score > 15.

**Independent Test**: Run `pnpm exec playwright test --grep="@automated-manual"` - all automated manual tests should pass showing previously manual workflows are now fully automated.

**Coverage Gap Addressed**: Manual test automation (13 files to review, estimate 5-8 worth automating)

### Manual Test Review for User Story 4

- [ ] T060 [US4] Review all 13 manual test files in apps/web/src/test/e2e/manual/ and score each using ROI formula
- [ ] T061 [US4] Document ROI scores in specs/020-e2e-test-coverage/manual-test-roi.md
- [ ] T062 [US4] Identify 5-8 high-ROI tests for automation (score > 15)

### Manual Test Automation for User Story 4

- [ ] T063 [P] [US4] Automate manual test #1 (highest ROI) in apps/web/e2e/automated-manual-01.e2e.test.ts
- [ ] T064 [P] [US4] Automate manual test #2 in apps/web/e2e/automated-manual-02.e2e.test.ts
- [ ] T065 [P] [US4] Automate manual test #3 in apps/web/e2e/automated-manual-03.e2e.test.ts
- [ ] T066 [P] [US4] Automate manual test #4 in apps/web/e2e/automated-manual-04.e2e.test.ts
- [ ] T067 [P] [US4] Automate manual test #5 in apps/web/e2e/automated-manual-05.e2e.test.ts
- [ ] T068 [P] [US4] Automate manual test #6 (if ROI > 15) in apps/web/e2e/automated-manual-06.e2e.test.ts
- [ ] T069 [P] [US4] Automate manual test #7 (if ROI > 15) in apps/web/e2e/automated-manual-07.e2e.test.ts
- [ ] T070 [P] [US4] Automate manual test #8 (if ROI > 15) in apps/web/e2e/automated-manual-08.e2e.test.ts

### Validation for User Story 4

- [ ] T071 [US4] Verify all US4 automated tests pass with pnpm exec playwright test --grep="@automated-manual"
- [ ] T072 [US4] Update manual test files with "AUTOMATED" marker and reference to automated test file
- [ ] T073 [US4] Commit US4 tests with conventional commit message: test(e2e): automate high-ROI manual tests

**Checkpoint**: All user stories should now be independently functional. Manual testing burden reduced by automating high-value tests.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

### Accessibility Scans

- [ ] T074 [P] Add @axe-core/playwright scans to all entity detail tests (T023-T025)
- [ ] T075 [P] Add @axe-core/playwright scans to all utility page tests (T027-T033)
- [ ] T076 [P] Add @axe-core/playwright scans to all workflow tests (T037-T041)
- [ ] T077 Create accessibility-report.md in specs/020-e2e-test-coverage/ with scan results

### Performance Benchmarks

- [ ] T078 [P] Add performance measurements to graph rendering in graph-interaction.e2e.test.ts (target: <5s for 50 nodes)
- [ ] T079 [P] Add performance measurements to search workflow in search-workflow.e2e.test.ts (target: <3s)
- [ ] T080 [P] Add performance measurements to entity detail page load in domains.e2e.test.ts (target: <2s)

### Flakiness Elimination

- [ ] T081 Run full test suite 10 consecutive times in CI to identify flaky tests
- [ ] T082 Document any flaky tests in specs/020-e2e-test-coverage/flaky-tests.md
- [ ] T083 Fix all flaky tests using deterministic waits (app-ready checks, not networkidle)
- [ ] T084 Verify zero flaky tests over 10 consecutive CI runs (SC-012)

### Coverage Reporting

- [ ] T085 Create route coverage script in apps/web/coverage/calculate-route-coverage.ts
- [ ] T086 Generate route coverage report showing before/after percentages
- [ ] T087 Verify 20+ percentage point increase in route coverage (SC-011)
- [ ] T088 Generate V8 code coverage report with @bgotink/playwright-coverage
- [ ] T089 Document coverage results in specs/020-e2e-test-coverage/coverage-report.md

### Documentation Updates

- [ ] T090 [P] Update quickstart.md with final test commands and examples
- [ ] T091 [P] Update CLAUDE.md with E2E test patterns and best practices
- [ ] T092 [P] Create test-writing-guide.md in apps/web/e2e/ with page object examples
- [ ] T093 Update playwright.config.ts comments with serial execution rationale

### Constitution Compliance Verification

- [ ] T094 Verify no `any` types in test code (Type Safety - Principle I)
- [ ] T095 Verify all tests written before fixes where applicable (Test-First - Principle II)
- [ ] T096 Verify tests reside in apps/web/e2e/ or apps/web/src/test/e2e/ (Monorepo Architecture - Principle III)
- [ ] T097 Verify storage operations use InMemoryStorageProvider in tests (Storage Abstraction - Principle IV)
- [ ] T098 Verify serial execution enforced in playwright.config.ts (Performance & Memory - Principle V)
- [ ] T099 Verify atomic conventional commits created for each coverage gap (Atomic Commits - Principle VI)
- [ ] T100 Verify breaking changes documented, no backwards compatibility obligations (Development-Stage Pragmatism - Principle VII)
- [ ] T101 Verify bug regression tests written before fixes (Test-First Bug Fixes - Principle VIII)
- [ ] T102 Verify all tests pass in CI before feature completion (Deployment Readiness - Principle IX)

### Final Validation

- [ ] T103 Run smoke suite: pnpm nx e2e web (should complete in <10 minutes with 100% pass rate)
- [ ] T104 Run full suite: E2E_FULL_SUITE=true pnpm nx e2e web (should complete in <30 minutes with 100% pass rate)
- [ ] T105 Verify all 12 success criteria met (SC-001 through SC-012)
- [ ] T106 Update specs/020-e2e-test-coverage/spec.md with implementation status
- [ ] T107 Commit spec updates with conventional commit message: docs(spec-020): mark E2E test coverage enhancement as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P2 → P3)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - Critical Route Coverage)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2 - Workflow Coverage)**: Can start after Foundational (Phase 2) - Independent of US1, but may reuse entity pages tested in US1
- **User Story 3 (P2 - Error Scenario Coverage)**: Can start after Foundational (Phase 2) - Independent of US1/US2
- **User Story 4 (P3 - Manual Test Automation)**: Can start after Foundational (Phase 2) - Independent of US1/US2/US3

### Within Each User Story

**User Story 1 (Critical Route Coverage)**:
1. Page objects (T016-T022) can run in parallel
2. Entity detail tests (T023-T025) can run in parallel after page objects complete
3. Utility page tests (T027-T033) can run in parallel after page objects complete
4. Validation tasks (T034-T036) run sequentially after all tests complete

**User Story 2 (Workflow Coverage)**:
1. Workflow tests (T037-T041) can run in parallel
2. Multi-viewport tests (T042-T044) can run in parallel
3. Validation tasks (T045-T047) run sequentially after all tests complete

**User Story 3 (Error Scenario Coverage)**:
1. ErrorPage object (T048) must complete first
2. Error scenario tests (T049-T053) can run in parallel after ErrorPage completes
3. Error recovery tests (T054-T056) can run in parallel
4. Validation tasks (T057-T059) run sequentially after all tests complete

**User Story 4 (Manual Test Automation)**:
1. Manual test review (T060-T062) runs sequentially
2. Automation tasks (T063-T070) can run in parallel after review completes
3. Validation tasks (T071-T073) run sequentially after all automation complete

### Parallel Opportunities

- All Setup page object tasks (T004-T006) can run in parallel
- All Foundational helper tasks (T007-T012) can run in parallel
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Within each user story, most test creation tasks can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1 (Critical Route Coverage)

```bash
# Launch all page objects for User Story 1 together:
Task: "T016 - Create DomainsDetailPage in apps/web/src/test/page-objects/DomainsDetailPage.ts"
Task: "T017 - Create FieldsDetailPage in apps/web/src/test/page-objects/FieldsDetailPage.ts"
Task: "T018 - Create SubfieldsDetailPage in apps/web/src/test/page-objects/SubfieldsDetailPage.ts"
Task: "T019 - Create BrowsePage in apps/web/src/test/page-objects/BrowsePage.ts"
Task: "T020 - Create SearchPage in apps/web/src/test/page-objects/SearchPage.ts"
Task: "T021 - Create ExplorePage in apps/web/src/test/page-objects/ExplorePage.ts"
Task: "T022 - Create SettingsPage in apps/web/src/test/page-objects/SettingsPage.ts"

# Then launch all entity detail tests together:
Task: "T023 - Create domains.e2e.test.ts in apps/web/e2e/"
Task: "T024 - Create fields.e2e.test.ts in apps/web/e2e/"
Task: "T025 - Create subfields.e2e.test.ts in apps/web/e2e/"

# Then launch all utility page tests together:
Task: "T027 - Create browse.e2e.test.ts in apps/web/src/test/e2e/"
Task: "T028 - Create search.e2e.test.ts in apps/web/src/test/e2e/"
Task: "T029 - Create explore.e2e.test.ts in apps/web/src/test/e2e/"
Task: "T030 - Create settings.e2e.test.ts in apps/web/src/test/e2e/"
Task: "T031 - Create about.e2e.test.ts in apps/web/src/test/e2e/"
Task: "T032 - Create cache.e2e.test.ts in apps/web/src/test/e2e/"
Task: "T033 - Create history.e2e.test.ts in apps/web/src/test/e2e/"
```

---

## Parallel Example: User Story 2 (Workflow Coverage)

```bash
# Launch all workflow tests together:
Task: "T037 - Create search-workflow.e2e.test.ts in apps/web/e2e/"
Task: "T038 - Create browse-workflow.e2e.test.ts in apps/web/e2e/"
Task: "T039 - Create graph-interaction.e2e.test.ts in apps/web/e2e/"
Task: "T040 - Create catalogue-workflow.e2e.test.ts in apps/web/e2e/"
Task: "T041 - Create bookmark-workflow.e2e.test.ts in apps/web/e2e/"

# Then launch all multi-viewport tests together:
Task: "T042 - Add mobile viewport tests to search-workflow.e2e.test.ts"
Task: "T043 - Add tablet viewport tests to graph-interaction.e2e.test.ts"
Task: "T044 - Add desktop viewport tests to browse-workflow.e2e.test.ts"
```

---

## Parallel Example: User Story 3 (Error Scenario Coverage)

```bash
# After ErrorPage object completes (T048), launch all error scenario tests together:
Task: "T049 - Create error-404.e2e.test.ts in apps/web/e2e/"
Task: "T050 - Create error-500.e2e.test.ts in apps/web/e2e/"
Task: "T051 - Create error-network.e2e.test.ts in apps/web/e2e/"
Task: "T052 - Create error-timeout.e2e.test.ts in apps/web/e2e/"
Task: "T053 - Create error-malformed-url.e2e.test.ts in apps/web/e2e/"

# Then launch all error recovery tests together:
Task: "T054 - Add retry mechanism tests to error-404.e2e.test.ts"
Task: "T055 - Add retry mechanism tests to error-500.e2e.test.ts"
Task: "T056 - Add retry mechanism tests to error-network.e2e.test.ts"
```

---

## Parallel Example: User Story 4 (Manual Test Automation)

```bash
# After manual test review completes (T060-T062), launch all automation tasks together:
Task: "T063 - Automate manual test #1 in apps/web/e2e/automated-manual-01.e2e.test.ts"
Task: "T064 - Automate manual test #2 in apps/web/e2e/automated-manual-02.e2e.test.ts"
Task: "T065 - Automate manual test #3 in apps/web/e2e/automated-manual-03.e2e.test.ts"
Task: "T066 - Automate manual test #4 in apps/web/e2e/automated-manual-04.e2e.test.ts"
Task: "T067 - Automate manual test #5 in apps/web/e2e/automated-manual-05.e2e.test.ts"
Task: "T068 - Automate manual test #6 in apps/web/e2e/automated-manual-06.e2e.test.ts"
Task: "T069 - Automate manual test #7 in apps/web/e2e/automated-manual-07.e2e.test.ts"
Task: "T070 - Automate manual test #8 in apps/web/e2e/automated-manual-08.e2e.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T015) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T016-T036)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Run: `pnpm exec playwright test --grep="@entity|@utility"`
   - Verify: All entity routes and utility pages have passing tests
   - Verify: Route coverage increased by 20+ percentage points
5. Deploy/demo if ready

**Estimated Task Count for MVP**: 36 tasks (Setup: 6, Foundational: 9, US1: 21)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (15 tasks)
2. Add User Story 1 → Test independently → Deploy/Demo (36 tasks total) - **MVP!**
3. Add User Story 2 → Test independently → Deploy/Demo (47 tasks total)
4. Add User Story 3 → Test independently → Deploy/Demo (59 tasks total)
5. Add User Story 4 → Test independently → Deploy/Demo (73 tasks total)
6. Add Polish → Final validation → Deploy/Demo (107 tasks total)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (15 tasks)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (Critical Route Coverage) - 21 tasks
   - **Developer B**: User Story 2 (Workflow Coverage) - 11 tasks
   - **Developer C**: User Story 3 (Error Scenario Coverage) - 12 tasks
   - **Developer D**: User Story 4 (Manual Test Automation) - 14 tasks
3. Stories complete and integrate independently
4. Team reconvenes for Phase 7 (Polish) - 34 tasks

---

## Notes

- [P] tasks = different files, no dependencies within same phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests written using Test-First approach (Red-Green-Refactor)
- Commit after each logical group of tasks (per user story or per phase)
- Stop at any checkpoint to validate story independently
- Serial execution enforced to prevent OOM errors (workers: 1, maxConcurrency: 1)
- Use deterministic waits (app-ready checks) instead of networkidle to prevent flakiness
- All storage operations in tests use InMemoryStorageProvider for isolation
- Accessibility scans added to all major routes for WCAG 2.1 AA compliance
- Performance benchmarks ensure smoke suite <10min, full suite <30min
- Zero flaky tests required over 10 consecutive CI runs

---

## Task Count Summary

- **Total Tasks**: 107
- **Phase 1 (Setup)**: 6 tasks
- **Phase 2 (Foundational)**: 9 tasks
- **Phase 3 (User Story 1 - P1)**: 21 tasks
- **Phase 4 (User Story 2 - P2)**: 11 tasks
- **Phase 5 (User Story 3 - P2)**: 12 tasks
- **Phase 6 (User Story 4 - P3)**: 14 tasks
- **Phase 7 (Polish)**: 34 tasks

**Parallel Opportunities**: 72 tasks marked with [P] can run in parallel within their phases

**Independent Test Criteria**:
- **US1**: `pnpm exec playwright test --grep="@entity|@utility"` - all entity routes tested
- **US2**: `pnpm exec playwright test --grep="@workflow"` - all workflows tested
- **US3**: `pnpm exec playwright test --grep="@error"` - all error scenarios tested
- **US4**: `pnpm exec playwright test --grep="@automated-manual"` - manual tests automated

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1 only) = 36 tasks

This delivers critical route coverage with 20+ percentage point increase in coverage, which is the highest priority outcome.
