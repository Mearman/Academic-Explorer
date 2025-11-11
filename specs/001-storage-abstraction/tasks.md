# Tasks: Storage Abstraction Layer

**Input**: Design documents from `/specs/001-storage-abstraction/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are explicitly requested in the specification (Success Criteria SC-001, SC-004, SC-006). Test tasks are included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a pnpm monorepo project:
- **Shared utilities**: `packages/utils/src/storage/`
- **Web application**: `apps/web/src/`
- **E2E tests**: `apps/web/src/test/e2e/`
- **Unit tests**: `packages/utils/tests/unit/`
- **Integration tests**: `packages/utils/tests/integration/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for storage abstraction

- [X] T001 Create directory structure for storage providers in packages/utils/src/storage/
- [X] T002 [P] Create directory structure for tests in packages/utils/tests/unit/ and packages/utils/tests/integration/
- [X] T003 [P] Create directory structure for React context in apps/web/src/contexts/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core storage provider interface and types that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Define CatalogueStorageProvider interface in packages/utils/src/storage/catalogue-storage-provider.ts (25+ operations from contracts/storage-provider.ts)
- [X] T005 [P] Define parameter types (CreateListParams, AddEntityParams, etc.) in packages/utils/src/storage/catalogue-storage-provider.ts
- [X] T006 [P] Define result types (ListStats, BatchAddResult, ShareAccessResult) in packages/utils/src/storage/catalogue-storage-provider.ts
- [X] T007 [P] Export storage provider types from packages/utils/src/storage/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 2 - Production Application with IndexedDB Storage (Priority: P1) 🎯 MVP

**Goal**: Maintain production catalogue functionality using IndexedDB via the abstraction layer. This story wraps the existing CatalogueService with the new provider interface.

**Why P1 First**: This story has zero implementation risk - it wraps existing, working code. Completing this first ensures production functionality is preserved while we work on testing improvements.

**Independent Test**: Create/update/delete a catalogue list in production app, refresh browser, verify data persists. Close and reopen browser, verify data still exists.

### Implementation for User Story 2

- [X] T008 [P] [US2] Implement DexieStorageProvider class in packages/utils/src/storage/dexie-storage-provider.ts (wraps CatalogueService)
- [X] T009 [P] [US2] Implement all list operations (createList, getList, getAllLists, updateList, deleteList) by delegating to CatalogueService
- [X] T010 [P] [US2] Implement all entity operations (addEntityToList, getListEntities, removeEntityFromList, updateEntityNotes, addEntitiesToList) by delegating to CatalogueService
- [X] T011 [P] [US2] Implement search and stats operations (searchLists, getListStats) by delegating to CatalogueService
- [X] T012 [P] [US2] Implement sharing operations (generateShareToken, getListByShareToken) by delegating to CatalogueService
- [X] T013 [P] [US2] Implement special lists operations (initializeSpecialLists, isSpecialList, addBookmark, removeBookmark, getBookmarks, isBookmarked, addToHistory, getHistory, clearHistory, getNonSystemLists) by delegating to CatalogueService
- [X] T014 [US2] Export DexieStorageProvider from packages/utils/src/storage/index.ts
- [X] T015 [US2] Create React StorageProviderContext in apps/web/src/contexts/storage-provider-context.tsx
- [X] T016 [US2] Implement StorageProviderWrapper component in apps/web/src/contexts/storage-provider-context.tsx
- [X] T017 [US2] Implement useStorageProvider hook with error checking in apps/web/src/contexts/storage-provider-context.tsx
- [X] T018 [US2] Update apps/web/src/main.tsx to create DexieStorageProvider and wrap app with StorageProviderWrapper
- [X] T019 [US2] Update apps/web/src/main.tsx to call initializeSpecialLists() on startup
- [X] T020 [US2] Update apps/web/src/hooks/useCatalogue.ts to use useStorageProvider() instead of direct catalogueService import
- [X] T021 [US2] Update all storage operations in useCatalogue.ts to use injected provider (refreshLists, createList, updateList, deleteList, addEntity, etc.)

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T022 [P] [US2] Write unit test for DexieStorageProvider list operations in packages/utils/tests/unit/dexie-storage-provider.test.ts
- [ ] T023 [P] [US2] Write unit test for DexieStorageProvider entity operations in packages/utils/tests/unit/dexie-storage-provider.test.ts
- [ ] T024 [P] [US2] Write unit test for DexieStorageProvider special lists operations in packages/utils/tests/unit/dexie-storage-provider.test.ts
- [ ] T025 [US2] Verify production app creates/reads/updates/deletes lists with data persistence across page refresh

**Checkpoint**: At this point, User Story 2 should be fully functional - production app uses abstraction layer with zero regression

---

## Phase 4: User Story 1 - E2E Test Execution with In-Memory Storage (Priority: P1) 🎯 Critical Blocker

**Goal**: Enable 28+ Playwright E2E tests to run without hanging by using in-memory storage instead of IndexedDB.

**Why This Priority**: This story resolves the critical blocker preventing E2E tests from running. IndexedDB operations hang in Playwright contexts, blocking CI/CD pipelines.

**Independent Test**: Run existing catalogue E2E tests (catalogue-entity-management.e2e.test.ts) and verify they complete successfully within 2 seconds per operation, with no hanging.

### Implementation for User Story 1

- [X] T026 [P] [US1] Implement InMemoryStorageProvider class in packages/utils/src/storage/in-memory-storage-provider.ts
- [X] T027 [P] [US1] Implement storage using JavaScript Maps (lists: Map, entities: Map, shares: Map) in InMemoryStorageProvider
- [X] T028 [P] [US1] Implement all list operations (createList, getList, getAllLists, updateList, deleteList) using Map operations
- [X] T029 [P] [US1] Implement all entity operations (addEntityToList, getListEntities, removeEntityFromList, updateEntityNotes, addEntitiesToList) using Map operations
- [X] T030 [P] [US1] Implement search and stats operations (searchLists, getListStats) using in-memory filtering
- [X] T031 [P] [US1] Implement sharing operations (generateShareToken, getListByShareToken) using Map storage
- [X] T032 [P] [US1] Implement special lists operations (initializeSpecialLists, isSpecialList, bookmarks, history) using special list IDs
- [X] T033 [P] [US1] Implement clear() method for test isolation in InMemoryStorageProvider
- [X] T034 [US1] Export InMemoryStorageProvider from packages/utils/src/storage/index.ts
- [X] T035 [US1] Remove manual IndexedDB initialization code from apps/web/src/test/e2e/catalogue-entity-management.e2e.test.ts (lines 17-66)
- [X] T036 [US1] Update apps/web/playwright.global-setup.ts to keep IndexedDB persistence enabled (storageState with indexedDB: true)
- [X] T037 [US1] Remove commented-out IndexedDB deletion code from apps/web/playwright.global-setup.ts (lines 89-153)

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T038 [P] [US1] Write contract test suite in packages/utils/tests/integration/storage-provider-contract.test.ts that both providers must pass
- [ ] T039 [P] [US1] Implement contract tests for list operations (create, get, update, delete) that work with any provider
- [ ] T040 [P] [US1] Implement contract tests for entity operations (add, get, remove, update notes) that work with any provider
- [ ] T041 [P] [US1] Implement contract tests for special lists (bookmarks, history) that work with any provider
- [ ] T042 [P] [US1] Write unit tests for InMemoryStorageProvider list operations in packages/utils/tests/unit/in-memory-storage-provider.test.ts
- [ ] T043 [P] [US1] Write unit tests for InMemoryStorageProvider entity operations in packages/utils/tests/unit/in-memory-storage-provider.test.ts
- [ ] T044 [P] [US1] Write unit tests for InMemoryStorageProvider test isolation (clear() method) in packages/utils/tests/unit/in-memory-storage-provider.test.ts
- [ ] T045 [US1] Run contract test suite with DexieStorageProvider and verify all tests pass
- [ ] T046 [US1] Run contract test suite with InMemoryStorageProvider and verify all tests pass
- [ ] T047 [US1] Run apps/web/src/test/e2e/catalogue-entity-management.e2e.test.ts and verify all 9 tests pass without hanging
- [ ] T048 [US1] Run apps/web/src/test/e2e/catalogue-basic-functionality.e2e.test.ts and verify tests pass
- [ ] T049 [US1] Run apps/web/src/test/e2e/catalogue-import-export.e2e.test.ts and verify tests pass
- [ ] T050 [US1] Run apps/web/src/test/e2e/catalogue-sharing.e2e.test.ts and verify tests pass
- [ ] T051 [US1] Verify all 28+ catalogue E2E tests complete in under 2 seconds per operation (Success Criteria SC-001)
- [ ] T052 [US1] Verify E2E test suite execution time improves by 50%+ (Success Criteria SC-003)

**Checkpoint**: At this point, User Story 1 should be fully functional - all E2E tests run successfully without IndexedDB hanging

---

## Phase 5: User Story 3 - Development and Unit Testing with Mock Storage (Priority: P2)

**Goal**: Enable developers to write fast, isolated unit tests for catalogue features using in-memory storage without IndexedDB setup.

**Why This Priority**: Lower priority than P1 stories because developers can work around issues more easily than automated test suites. Provides developer productivity improvements.

**Independent Test**: Write a new unit test for a catalogue component using InMemoryStorageProvider, run test, verify it completes in under 100ms with full isolation.

### Implementation for User Story 3

- [X] T053 [P] [US3] Create test utility helper in packages/utils/tests/setup.ts for creating InMemoryStorageProvider instances
- [ ] T054 [P] [US3] Add example unit test in packages/utils/tests/unit/catalogue-operations.test.ts demonstrating fast, isolated testing pattern
- [X] T055 [P] [US3] Document test patterns in specs/001-storage-abstraction/quickstart.md with beforeEach/afterEach examples
- [ ] T056 [US3] Update apps/web/src/test/setup.ts to export createTestStorageProvider utility
- [ ] T057 [US3] Create example component test in apps/web/src/components/catalogue/__tests__/CatalogueManager.test.tsx using StorageProviderWrapper
- [ ] T058 [US3] Document React component testing pattern in quickstart.md

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T059 [P] [US3] Write unit test verifying InMemoryStorageProvider operations complete in under 100ms in packages/utils/tests/unit/in-memory-storage-provider.test.ts
- [ ] T060 [P] [US3] Write unit test verifying test isolation (multiple tests with clean state) in packages/utils/tests/unit/in-memory-storage-provider.test.ts
- [ ] T061 [US3] Run example unit tests and verify each completes in under 100ms (Success Criteria SC-004)
- [ ] T062 [US3] Verify test isolation with 100% clean state between tests (Success Criteria SC-006)

**Checkpoint**: All user stories should now be independently functional - production works, E2E tests pass, unit tests are fast

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T063 [P] Update packages/utils/README.md with storage provider usage guide
- [ ] T064 [P] Add JSDoc comments to all storage provider interface methods in catalogue-storage-provider.ts
- [ ] T065 [P] Update specs/001-storage-abstraction/quickstart.md with production and testing examples
- [ ] T066 Code cleanup: Remove unused imports from updated files
- [ ] T067 Code cleanup: Ensure consistent error handling across all providers
- [ ] T068 Performance verification: Benchmark production storage operations (no regression from current implementation)
- [ ] T069 Performance verification: Measure E2E test suite execution time improvement (target: 50%+)
- [ ] T070 [P] Add error handling examples to quickstart.md
- [ ] T071 [P] Document troubleshooting scenarios in quickstart.md
- [ ] T072 Run full catalogue E2E test suite and verify 100% pass rate
- [ ] T073 Verify zero production incidents after deployment (Success Criteria SC-005)
- [ ] T074 Constitution compliance verification:
  - [ ] No `any` types in implementation (TypeScript strict typing)
  - [ ] All tests pass before merging (Test-First TDD where applicable)
  - [ ] Proper monorepo structure maintained (pnpm workspaces)
  - [ ] Storage operations use provider interface (Storage Abstraction)
  - [ ] Performance requirements met (SC-001: <2s, SC-004: <100ms)
  - [ ] Memory constraints respected (in-memory storage cleared in tests)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 2 (Phase 3)**: Depends on Foundational phase completion
- **User Story 1 (Phase 4)**: Depends on Foundational phase completion AND User Story 2 completion (needs DexieProvider to test contract suite)
- **User Story 3 (Phase 5)**: Depends on User Story 1 completion (uses InMemoryProvider created in US1)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories - **RECOMMENDED FIRST** (lowest risk)
- **User Story 1 (P1)**: Needs User Story 2 complete for contract tests - Can start implementation in parallel with US2 but testing depends on US2
- **User Story 3 (P2)**: Needs User Story 1 complete (uses InMemoryProvider) - Sequential after US1

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Interface/types before implementations
- Implementations before integration
- Contract tests verify both providers
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**:
- T001, T002, T003 can all run in parallel (different directories)

**Phase 2 (Foundational)**:
- T005, T006 can run in parallel with T004 (same file but different sections)
- T007 waits for T004-T006

**Phase 3 (User Story 2)**:
- T008-T013 can run in parallel (implementing different method groups)
- T015-T017 can run in parallel (React Context in one file)
- T022-T024 can run in parallel (different test files)

**Phase 4 (User Story 1)**:
- T026-T032 can run in parallel (implementing different method groups in InMemoryProvider)
- T038-T044 can run in parallel (different test files)

**Phase 5 (User Story 3)**:
- T053-T055 can run in parallel (different files)
- T059-T060 can run in parallel (same test file but different test cases)

**Phase 6 (Polish)**:
- T063-T065, T070-T071 can run in parallel (different documentation files)

---

## Parallel Example: User Story 2 (Production IndexedDB)

```bash
# After Phase 2 completes, launch all DexieProvider implementations together:
Task T008: "Implement DexieStorageProvider class in packages/utils/src/storage/dexie-storage-provider.ts"
Task T009: "Implement list operations by delegating to CatalogueService"
Task T010: "Implement entity operations by delegating to CatalogueService"
Task T011: "Implement search and stats operations by delegating to CatalogueService"
Task T012: "Implement sharing operations by delegating to CatalogueService"
Task T013: "Implement special lists operations by delegating to CatalogueService"

# Then launch all tests together:
Task T022: "Write unit test for DexieStorageProvider list operations"
Task T023: "Write unit test for DexieStorageProvider entity operations"
Task T024: "Write unit test for DexieStorageProvider special lists operations"
```

---

## Parallel Example: User Story 1 (E2E Testing)

```bash
# After Phase 3 completes, launch all InMemoryProvider implementations together:
Task T026: "Implement InMemoryStorageProvider class"
Task T027: "Implement storage using JavaScript Maps"
Task T028: "Implement list operations using Map operations"
Task T029: "Implement entity operations using Map operations"
Task T030: "Implement search and stats operations"
Task T031: "Implement sharing operations"
Task T032: "Implement special lists operations"
Task T033: "Implement clear() method for test isolation"

# Then launch all contract tests together:
Task T038: "Write contract test suite that both providers must pass"
Task T039: "Implement contract tests for list operations"
Task T040: "Implement contract tests for entity operations"
Task T041: "Implement contract tests for special lists"

# Then launch all InMemory unit tests together:
Task T042: "Write unit tests for InMemoryStorageProvider list operations"
Task T043: "Write unit tests for InMemoryStorageProvider entity operations"
Task T044: "Write unit tests for InMemoryStorageProvider test isolation"
```

---

## Implementation Strategy

### MVP First (User Story 2 Only - Production Preservation)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T007) - CRITICAL
3. Complete Phase 3: User Story 2 (T008-T025)
4. **STOP and VALIDATE**: Test production app independently
   - Create/update/delete lists in browser
   - Refresh page, verify data persists
   - Close and reopen browser, verify data still exists
   - Zero regression from current implementation
5. Deploy/demo if ready - **Production functionality preserved!**

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 2 (Production) → Test independently → Deploy (MVP - zero risk)
3. Add User Story 1 (E2E Tests) → Test independently → **28+ E2E tests unblocked!**
4. Add User Story 3 (Unit Tests) → Test independently → Developer productivity improved
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T007)
2. Once Foundational is done:
   - **Developer A**: User Story 2 (T008-T025) - Production provider
   - **Developer B**: Can start User Story 1 implementation (T026-T034) in parallel
   - **Developer C**: Prepares test infrastructure updates (T035-T037)
3. After US2 completes:
   - Developer A joins US1 for contract testing (T038-T046)
   - Developer B completes InMemory implementation
   - Developer C runs E2E validation (T047-T052)
4. After US1 completes:
   - Any developer tackles US3 (fast, independent)
5. Polish phase (T063-T074) divided among team

### Critical Path

The critical path for unblocking E2E tests is:
1. T001-T003 (Setup) → T004-T007 (Foundational) → T008-T025 (US2 Production) → T026-T052 (US1 E2E Testing)

**Estimated Time to Unblock E2E Tests**:
- Phase 1: 1 hour
- Phase 2: 2 hours
- Phase 3: 8 hours (US2 implementation + testing)
- Phase 4: 12 hours (US1 implementation + testing + E2E validation)
- **Total: ~23 hours to unblock all 28+ E2E tests**

---

## Notes

- [P] tasks = different files/sections, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD where applicable)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US2 (Production) is recommended first despite both being P1 - lowest risk, wraps existing code
- US1 (E2E Testing) is the critical blocker but depends on US2 for contract testing
- Contract tests ensure both providers behave identically
- In-memory provider must implement clear() for test isolation (SC-006)
- Performance targets: <2s per E2E operation (SC-001), <100ms per unit test (SC-004)

---

## Success Criteria Validation

After completing all tasks, verify:

- ✅ **SC-001**: All 28+ catalogue E2E tests execute successfully in Playwright without hanging, with each storage operation completing in under 2 seconds (Tasks T047-T051)
- ✅ **SC-002**: Production catalogue functionality maintains 100% feature parity with current implementation, with zero data loss during migration (Task T025)
- ✅ **SC-003**: E2E test suite execution time improves by at least 50% due to faster in-memory operations (Task T052)
- ✅ **SC-004**: Developers can run unit tests with mock storage where each test completes in under 100ms (Task T061)
- ✅ **SC-005**: Zero production incidents related to storage operations after abstraction layer implementation (Task T073)
- ✅ **SC-006**: Test isolation is guaranteed with 100% of tests starting with clean storage state (Task T062)
- ✅ **SC-007**: Storage provider switching requires changing only configuration, not application code (Tasks T018-T019 for production, T036-T037 for E2E tests)

**Total Tasks**: 74 tasks across 6 phases
**Parallelizable Tasks**: 41 tasks marked with [P]
**User Story Breakdown**:
- Phase 1 (Setup): 3 tasks
- Phase 2 (Foundational): 4 tasks
- Phase 3 (US2 - Production): 18 tasks (4 implementation + 4 tests + 10 integration)
- Phase 4 (US1 - E2E Testing): 27 tasks (12 implementation + 15 tests)
- Phase 5 (US3 - Unit Testing): 10 tasks (6 implementation + 4 tests)
- Phase 6 (Polish): 12 tasks

**Recommended MVP Scope**: Complete through Phase 3 (User Story 2) - preserves production functionality with new abstraction layer. This provides a safe foundation before tackling the E2E test unblocking in Phase 4.
