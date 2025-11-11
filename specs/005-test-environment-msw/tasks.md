# Tasks: Test Environment MSW Setup

**Input**: Design documents from `/specs/005-test-environment-msw/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: NOT requested in feature specification. This is test infrastructure work, not feature development.

**Organization**: Tasks organized by user story (US1, US2, US3) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Nx monorepo web application structure
- Test infrastructure: `apps/web/test/`
- MSW handlers: `apps/web/src/test/msw/`
- Playwright config: `apps/web/playwright*.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify MSW installation and review existing infrastructure

- [ ] T001 Verify MSW 2.x is installed as devDependency in apps/web/package.json
- [ ] T002 Review existing MSW handlers in apps/web/src/test/msw/handlers.ts
- [ ] T003 Review existing Playwright global setup in apps/web/playwright.global-setup.ts
- [ ] T004 Review existing Playwright global teardown in apps/web/playwright.global-teardown.ts

**Checkpoint**: Existing infrastructure understood, MSW installed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create MSW setup module that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create directory structure: apps/web/test/setup/
- [ ] T006 Create MSW setup module in apps/web/test/setup/msw-setup.ts with startMSWServer() and stopMSWServer() functions
- [ ] T007 Import openalexHandlers from ../msw/handlers in apps/web/test/setup/msw-setup.ts
- [ ] T008 Initialize setupServer from msw/node with openalexHandlers in apps/web/test/setup/msw-setup.ts

**Checkpoint**: MSW setup module created and ready for integration

---

## Phase 3: User Story 1 - E2E Tests Run Reliably Without External API Dependencies (Priority: P1) 🎯 MVP

**Goal**: All 232 E2E tests pass consistently without HTTP 403 errors from OpenAlex API

**Independent Test**: Run `pnpm test:e2e` and verify 232/232 tests pass with zero HTTP 403 errors

### Implementation for User Story 1

- [ ] T009 [US1] Update apps/web/playwright.global-setup.ts to import startMSWServer from ./test/setup/msw-setup
- [ ] T010 [US1] Call startMSWServer() at beginning of globalSetup function in apps/web/playwright.global-setup.ts (before browser launch)
- [ ] T011 [US1] Update apps/web/playwright.global-teardown.ts to import stopMSWServer from ./test/setup/msw-setup
- [ ] T012 [US1] Call stopMSWServer() at end of globalTeardown function in apps/web/playwright.global-teardown.ts
- [ ] T013 [US1] Run single test to verify MSW integration: `cd apps/web && pnpm playwright test src/test/e2e/bookmarking.e2e.test.ts`
- [ ] T014 [US1] Verify MSW server starts before test (check console output for "✅ MSW server started")
- [ ] T015 [US1] Verify test passes without HTTP 403 errors
- [ ] T016 [US1] Run full E2E test suite: `cd apps/web && pnpm test:e2e`
- [ ] T017 [US1] Validate 232/232 tests pass (up from 205/232)
- [ ] T018 [US1] Validate zero HTTP 403 errors in test output
- [ ] T019 [US1] Validate test execution time remains under 5 minutes

**Checkpoint**: All E2E tests now pass reliably using MSW mocks. User Story 1 complete and independently testable.

**Success Criteria Validation**:
- ✅ SC-001: 232/232 tests pass (T017)
- ✅ SC-002: Zero HTTP 403 errors (T018)
- ✅ SC-003: Zero real API calls to api.openalex.org (verified by MSW interception)
- ✅ SC-004: Tests complete <5 minutes (T019)
- ✅ SC-005: MSW adds <100ms overhead per test (implicit in T019)
- ✅ SC-006: 100% requests mocked (no "Request not mocked" warnings in T016)
- ✅ SC-007: Tests pass in local environment (T016-T019)

---

## Phase 4: User Story 2 - Test Fixtures Are Easy to Create and Maintain (Priority: P2)

**Goal**: Developers can easily create and register test fixtures for new test scenarios

**Independent Test**: Developer can create new fixture in apps/web/test/fixtures/works/my-test-work.json, register it, and use it in a test

### Implementation for User Story 2

- [ ] T020 [P] [US2] Create directory structure: apps/web/test/fixtures/works/, apps/web/test/fixtures/authors/, apps/web/test/fixtures/institutions/
- [ ] T021 [P] [US2] Create fixture documentation in apps/web/test/fixtures/README.md explaining fixture structure and usage
- [ ] T022 [US2] Create FixtureLoader utility in apps/web/test/mocks/fixtures-loader.ts with loadWork(), loadAuthor(), loadInstitution() functions
- [ ] T023 [US2] Implement fixture file system loading in apps/web/test/mocks/fixtures-loader.ts (read JSON files from fixtures/ directory)
- [ ] T024 [US2] Add hasFixture() method to FixtureLoader in apps/web/test/mocks/fixtures-loader.ts
- [ ] T025 [US2] Update MSW handlers in apps/web/src/test/msw/handlers.ts to check for static fixtures first before using factories
- [ ] T026 [US2] Add example fixture: apps/web/test/fixtures/works/work-bioplastics.json (if needed for catalogue tests)
- [ ] T027 [US2] Test fixture loader by creating test fixture and verifying MSW returns it

**Checkpoint**: Fixture system in place. Developers can add static fixtures for specific test scenarios.

**Success Criteria Validation**:
- ✅ SC-008: Developers can create new fixtures in <5 minutes following README (T021, T027)

---

## Phase 5: User Story 3 - MSW Setup Is Documented and Troubleshooting Is Clear (Priority: P3)

**Goal**: Developers can understand MSW setup and troubleshoot issues without external help

**Independent Test**: New developer can read documentation and add new MSW handler successfully

### Implementation for User Story 3

- [ ] T028 [P] [US3] Create MSW setup documentation in apps/web/test/setup/README.md explaining architecture and lifecycle
- [ ] T029 [P] [US3] Create troubleshooting guide section in apps/web/test/setup/README.md covering common issues
- [ ] T030 [P] [US3] Document how to add new MSW handlers in apps/web/test/setup/README.md
- [ ] T031 [P] [US3] Document how to override handlers for specific tests in apps/web/test/setup/README.md
- [ ] T032 [P] [US3] Create test infrastructure overview in apps/web/test/README.md
- [ ] T033 [US3] Update quickstart.md with verification steps for new developers
- [ ] T034 [US3] Add common error scenarios and solutions to troubleshooting guide
- [ ] T035 [US3] Validate documentation clarity by reviewing against spec.md acceptance scenarios

**Checkpoint**: Full documentation in place. New developers can understand and work with MSW setup.

**Success Criteria Validation**:
- ✅ SC-009: Troubleshooting guide resolves 90% of MSW issues (T029, T034)
- ✅ SC-010: Test failures provide clear indication of issue (T028, T035)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements and validation across all user stories

- [ ] T036 [P] Update apps/web/CLAUDE.md to add MSW 2.x to Active Technologies list
- [ ] T037 [P] Add MSW integration note to apps/web/CLAUDE.md test infrastructure section
- [ ] T038 [P] Reference quickstart.md in apps/web/CLAUDE.md for MSW usage
- [ ] T039 Run full test suite validation: verify 232/232 tests still pass
- [ ] T040 Verify MSW server lifecycle logging is clear (startup/shutdown messages)
- [ ] T041 Check for any "Request not mocked" warnings in test output
- [ ] T042 Measure test execution time and confirm <5 minutes
- [ ] T043 Constitution compliance verification:
  - [ ] No `any` types in MSW setup code (Type Safety)
  - [ ] Tests were already failing before implementation (Test-First)
  - [ ] Changes confined to apps/web/test directory (Monorepo Architecture)
  - [ ] No storage changes (Storage Abstraction)
  - [ ] Tests remain serial, minimal overhead <100ms (Performance & Memory)
- [ ] T044 Run quickstart.md validation: follow guide and verify 15-20 minute completion time
- [ ] T045 Create final validation report documenting all success criteria met

**Checkpoint**: Feature complete, documented, and validated

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001-T004) - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (T005-T008)
- **User Story 2 (Phase 4)**: Depends on Foundational (T005-T008) - Independent of US1
- **User Story 3 (Phase 5)**: Depends on US1 completion for accurate documentation - NOT independently testable without US1
- **Polish (Phase 6)**: Depends on US1, US2, US3 completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent of US1 (but less useful without US1 working)
- **User Story 3 (P3)**: Depends on US1 - Documentation requires working MSW integration to be accurate

### Within Each User Story

**User Story 1**:
- T009-T012: Can run in parallel (different files)
- T013: Depends on T009-T012 (single test validation)
- T014-T015: Depends on T013 (verify single test)
- T016: Depends on T013-T015 (full suite)
- T017-T019: Depends on T016 (validation)

**User Story 2**:
- T020-T021: Can run in parallel [P] (different files)
- T022-T024: Sequential (same file: fixtures-loader.ts)
- T025: Depends on T022-T024 (integrate loader with handlers)
- T026-T027: Depends on T025 (test fixtures)

**User Story 3**:
- T028-T032: Can run in parallel [P] (different files)
- T033-T035: Sequential (validation and refinement)

### Parallel Opportunities

- **Phase 1**: T001-T004 are review tasks, sequential
- **Phase 2**: T005-T008 sequential (same file: msw-setup.ts)
- **User Story 1**: T009-T012 can run in parallel (4 different files)
- **User Story 2**: T020-T021 can run in parallel (2 different operations)
- **User Story 3**: T028-T032 can run in parallel (5 different documentation files)
- **Polish**: T036-T038 can run in parallel (CLAUDE.md updates)

---

## Parallel Example: User Story 1

```bash
# Launch global setup/teardown updates together:
Task: "Update apps/web/playwright.global-setup.ts to import and call startMSWServer()"
Task: "Update apps/web/playwright.global-teardown.ts to import and call stopMSWServer()"

# These are independent file modifications and can run in parallel
```

---

## Parallel Example: User Story 2

```bash
# Launch fixture infrastructure together:
Task: "Create directory structure for fixtures (works/, authors/, institutions/)"
Task: "Create fixture documentation in apps/web/test/fixtures/README.md"

# These are independent operations and can run in parallel
```

---

## Parallel Example: User Story 3

```bash
# Launch all documentation tasks together:
Task: "Create apps/web/test/setup/README.md"
Task: "Create apps/web/test/README.md"
Task: "Update quickstart.md"
Task: "Add troubleshooting guide"

# These are independent documentation files and can run in parallel
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T008) - CRITICAL
3. Complete Phase 3: User Story 1 (T009-T019)
4. **STOP and VALIDATE**: Run full test suite, verify 232/232 pass
5. Commit and validate MVP: All tests now pass reliably

**MVP Delivery**: After T019, all E2E tests work. Core problem solved.

### Incremental Delivery

1. Complete Setup + Foundational → MSW infrastructure ready
2. Add User Story 1 (T009-T019) → **MVP: All tests pass!**
3. Add User Story 2 (T020-T027) → Fixture system available for future tests
4. Add User Story 3 (T028-T035) → Documentation complete
5. Polish (T036-T045) → Production ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup (T001-T004) together
2. Team completes Foundational (T005-T008) together
3. Once Foundational is done:
   - **Developer A**: User Story 1 (T009-T019) - PRIORITY
   - **Developer B**: User Story 2 (T020-T027) - Can start in parallel
   - **Developer C**: Prepare User Story 3 draft docs (wait for US1 to complete for accuracy)
4. US1 completes → All tests pass (MVP achieved)
5. US2 completes → Fixture system ready
6. Developer C finalizes US3 docs based on working US1
7. Team validates Polish tasks together

---

## Task Summary

**Total Tasks**: 45

### By Phase:
- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundational): 4 tasks
- Phase 3 (User Story 1): 11 tasks
- Phase 4 (User Story 2): 8 tasks
- Phase 5 (User Story 3): 8 tasks
- Phase 6 (Polish): 10 tasks

### By User Story:
- US1 (P1 - Reliable test execution): 11 tasks
- US2 (P2 - Fixture maintainability): 8 tasks
- US3 (P3 - Documentation): 8 tasks

### Parallel Opportunities:
- Phase 1: 0 parallel tasks (review/analysis)
- Phase 2: 0 parallel tasks (same file)
- User Story 1: 4 parallel tasks (T009-T012)
- User Story 2: 2 parallel tasks (T020-T021)
- User Story 3: 5 parallel tasks (T028-T032)
- Polish: 3 parallel tasks (T036-T038)

**Total Parallel Opportunities**: 14 tasks can run in parallel (31% of total)

### MVP Scope (User Story 1 Only):
- 8 tasks (Setup + Foundational)
- 11 tasks (User Story 1)
- **19 tasks total for MVP**
- Estimated time: 1-2 hours

### Full Feature Scope:
- 45 tasks total
- Estimated time: 3-4 hours

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- User Story 1 is independently completable and testable (MVP)
- User Story 2 is independently completable and testable
- User Story 3 depends on US1 for accurate documentation
- No tests to write (this IS test infrastructure)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Focus on MVP first (US1) to get tests passing
