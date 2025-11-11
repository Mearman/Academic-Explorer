# Implementation Plan: Fix Remaining 27 Test Failures

**Branch**: `004-fix-failing-tests` | **Date**: 2025-11-11 | **Spec**: [spec.md](./spec.md)
**Input**: Fix test environment to achieve 232/232 passing E2E tests

## Summary

The catalogue feature implementation is complete (81/84 tasks, 96%), but 27 E2E tests are failing due to **test environment configuration issues**, not implementation bugs. All failing tests attempt real OpenAlex API calls that return HTTP 403 Forbidden errors. This plan addresses the test infrastructure to enable all tests to pass using Mock Service Worker (MSW) for API mocking.

**Current Status**: 205/232 passing (88.4%)
**Target**: 232/232 passing (100%)
**Root Cause**: Missing API mocks in E2E test environment
**Solution**: Implement MSW with test fixtures for OpenAlex entities

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, ES2022, ESNext modules)
**Primary Dependencies**:
- MSW (Mock Service Worker) 2.x - API mocking
- Playwright - E2E testing framework (already installed)
- pako - compression (already installed)

**Storage**: IndexedDB via Dexie 4.x (in-memory for tests)
**Testing**: Playwright E2E tests (232 tests total)
**Target Platform**: Chromium browser in Playwright
**Project Type**: Nx monorepo (web app in apps/web)
**Performance Goals**: All tests complete in <5 minutes
**Constraints**: Tests must run serially, no real API calls
**Scale/Scope**: 232 E2E tests, 27 failing tests to fix

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with Academic Explorer Constitution:

1. **Type Safety**: ✓ MSW handlers will be fully typed with TypeScript
2. **Test-First Development**: ✓ Tests already exist and failing, fixing environment
3. **Monorepo Architecture**: ✓ Changes in apps/web/test directory structure
4. **Storage Abstraction**: ✓ Tests use InMemoryStorageProvider (already compliant)
5. **Performance & Memory**: ✓ Tests run serially (already configured)

**Complexity Justification**: APPROVED
- Adding MSW aligns with constitution's testing principles
- Reduces external dependencies (no real API calls)
- Enables reliable, deterministic E2E tests
- Standard practice for modern web testing

## Project Structure

### Test Infrastructure (apps/web/test/)

```
apps/web/test/
├── fixtures/                    # Test data fixtures
│   ├── works/
│   │   ├── work-bioplastics.json
│   │   └── work-sample.json
│   ├── authors/
│   │   └── author-sample.json
│   ├── institutions/
│   │   └── institution-sample.json
│   ├── sources/
│   │   └── source-sample.json
│   └── README.md               # Fixture documentation
├── mocks/
│   ├── handlers.ts             # MSW request handlers
│   ├── fixtures-loader.ts      # Load fixture data
│   └── README.md               # Mock setup documentation
├── setup/
│   ├── msw-setup.ts            # MSW server initialization
│   └── global-setup.ts         # Update Playwright global setup
└── e2e/                        # Existing E2E tests (no changes)
```

### Modified Files

- `apps/web/playwright.config.ts` - Add MSW server lifecycle
- `apps/web/playwright.global-setup.ts` - Initialize MSW before tests
- `apps/web/package.json` - Add msw dependency

## Phase 0: Research

**Goal**: Resolve all NEEDS CLARIFICATION and establish best practices

### Research Tasks

1. **MSW 2.x Integration with Playwright**
   - Decision: How to initialize MSW in Playwright global setup
   - Rationale: MSW 2.x has different Node.js integration than v1
   - Alternatives: Service Worker vs Node.js server (choose Node for Playwright)

2. **OpenAlex Entity Structure**
   - Decision: Which entity fields are required for tests
   - Rationale: Fixtures must match real API response structure
   - Alternatives: Full entities vs minimal test doubles (choose minimal)

3. **Fixture Management Strategy**
   - Decision: Static JSON files vs programmatic generation
   - Rationale: Need maintainable, version-controllable fixtures
   - Alternatives: JSON files, TypeScript factories, Faker.js (choose JSON + factories)

4. **Test Data IDs**
   - Decision: Use specific fixture IDs in tests vs dynamic lookup
   - Rationale: Tests currently reference real OpenAlex IDs
   - Alternatives: Update tests to use fixture IDs vs map real IDs to fixtures

**Output**: research-test-environment.md documenting all decisions

## Phase 1: Design & Contracts

**Prerequisites**: research-test-environment.md complete

### 1. Data Model (data-model-test-fixtures.md)

**Entities**:

1. **WorkFixture**
   - Fields: id, title, publication_year, cited_by_count, open_access, authorships
   - Validation: Must match OpenAlex Work schema
   - Used by: Tests 64-72, 73-81 (entity management, import/export)

2. **AuthorFixture**
   - Fields: id, display_name, works_count, cited_by_count, h_index, affiliations
   - Validation: Must match OpenAlex Author schema
   - Used by: Tests 64-72 (entity management)

3. **InstitutionFixture**
   - Fields: id, display_name, works_count, cited_by_count, country_code, type
   - Validation: Must match OpenAlex Institution schema
   - Used by: Tests 64-72 (entity management)

4. **SourceFixture** (if needed)
   - Fields: id, display_name, type, works_count
   - Validation: Must match OpenAlex Source schema

**Relationships**:
- Work → Authors (authorships array)
- Author → Institutions (affiliations array)

### 2. API Contracts (contracts/msw-handlers.interface.ts)

```typescript
interface MSWHandler {
  // GET /works/:id
  getWork(workId: string): WorkResponse;

  // GET /authors/:id
  getAuthor(authorId: string): AuthorResponse;

  // GET /institutions/:id
  getInstitution(institutionId: string): InstitutionResponse;

  // GET /autocomplete?q=...
  autocomplete(query: string, filter?: string): AutocompleteResponse;
}

interface FixtureLoader {
  loadWork(id: string): Work | null;
  loadAuthor(id: string): Author | null;
  loadInstitution(id: string): Institution | null;
  loadAll(type: EntityType): Entity[];
}
```

### 3. Quickstart (quickstart-test-mocking.md)

**For developers needing to add new test fixtures**:

1. Create fixture JSON in `test/fixtures/{type}/`
2. Follow OpenAlex schema structure
3. Add fixture ID to `fixtures-loader.ts`
4. Run tests to verify mock works
5. Document fixture purpose in README

## Phase 2: Implementation Plan

### Overview

7 phases, ~25 tasks total, estimated 4-6 hours for experienced developer

**Dependencies**:
- Phase 1 → Phase 2 (research before setup)
- Phase 2 → Phase 3 (MSW installed before handlers)
- Phase 3 → Phase 4 (handlers before fixtures)
- Phase 4 → Phase 5 (fixtures before test updates)
- Phase 5 → Phase 6 (working mocks before validation)

### Phase 1: MSW Installation & Setup

**Goal**: Install MSW and configure Playwright integration

**Tasks**:
1. T001: Install MSW 2.x: `pnpm add -D msw@latest` (apps/web)
2. T002: Create `test/setup/msw-setup.ts` with Node.js server
3. T003: Update `playwright.config.ts` to include MSW setup/teardown
4. T004: Update `playwright.global-setup.ts` to initialize MSW server
5. T005: Verify MSW server starts/stops correctly with test run

**Validation**: Run `pnpm test:e2e` and verify MSW server initializes (no tests passing yet)

### Phase 2: OpenAlex API Handlers

**Goal**: Create MSW handlers for OpenAlex API endpoints

**Tasks**:
6. T006: Create `test/mocks/handlers.ts` with base structure
7. T007: Add handler for GET /works/:id
8. T008: Add handler for GET /authors/:id
9. T009: Add handler for GET /institutions/:id
10. T010: Add handler for GET /sources/:id (if needed)
11. T011: Add handler for GET /autocomplete (if needed)
12. T012: Add 404 handler for unknown IDs
13. T013: Add error handlers for testing error states

**Validation**: Verify handlers compile, respond with empty fixtures temporarily

### Phase 3: Test Fixtures Creation

**Goal**: Create realistic OpenAlex entity fixtures for test data

**Tasks**:
14. T014: Create `test/fixtures/README.md` documenting fixture structure
15. T015: Create work fixtures (work-bioplastics.json, work-sample-1.json, work-sample-2.json)
16. T016: Create author fixtures (author-sample-1.json, author-sample-2.json)
17. T017: Create institution fixtures (institution-sample-1.json, institution-sample-2.json)
18. T018: Create source fixture (source-sample.json) if needed
19. T019: Create `test/mocks/fixtures-loader.ts` to load fixtures
20. T020: Wire fixtures-loader into MSW handlers

**Validation**: Verify fixtures load correctly, handlers return fixture data

### Phase 4: Test ID Mapping

**Goal**: Update failing tests to use fixture IDs instead of real OpenAlex IDs

**Tasks**:
21. T021: Document current test IDs in use (grep for OpenAlex IDs in test files)
22. T022: Create ID mapping: real ID → fixture ID
23. T023: Update catalogue-entity-management.e2e.test.ts with fixture IDs
24. T024: Update catalogue-import-export.e2e.test.ts with fixture IDs
25. T025: Update catalogue-sharing-functionality.e2e.test.ts with fixture IDs

**Validation**: Verify tests use fixture IDs, no real OpenAlex IDs remain

### Phase 5: Test Validation

**Goal**: Run tests and verify all 232 pass

**Tasks**:
26. T026: Run entity management tests (T064-T072) → verify 9/9 pass
27. T027: Run import/export tests (T073-T081) → verify 9/9 pass
28. T028: Run sharing tests (T089-T097) → verify 9/9 pass
29. T029: Run UI components test (T087) → verify 1/1 pass
30. T030: Run full test suite (`pnpm test:e2e`) → verify 232/232 pass

**Validation**: All 232 E2E tests pass without HTTP 403 errors

### Phase 6: Documentation

**Goal**: Document MSW setup for future developers

**Tasks**:
31. T031: Create `test/mocks/README.md` with MSW architecture
32. T032: Create `test/fixtures/README.md` with fixture guidelines
33. T033: Update main README with test setup instructions
34. T034: Add troubleshooting guide for common MSW issues

**Validation**: Documentation is clear and complete

### Phase 7: Cleanup & Optimization

**Goal**: Optimize test performance and remove unused code

**Tasks**:
35. T035: Review MSW handler performance (should add <100ms per test)
36. T036: Remove any debug logging from MSW setup
37. T037: Verify test isolation (no state leaks between tests)
38. T038: Add test for MSW itself (verify mocks are active)

**Validation**: Tests run in same time as before, no regressions

## Success Criteria

From spec.md, mapped to implementation tasks:

- **SC-001**: 100% catalogue entity management tests pass (9/9) → Phase 5, T026
- **SC-002**: 100% catalogue import/export tests pass (9/9) → Phase 5, T027
- **SC-003**: 100% catalogue sharing tests pass (9/9) → Phase 5, T028
- **SC-004**: 100% catalogue UI component tests pass (1/1) → Phase 5, T029
- **SC-005**: Total test pass rate 100% (232/232) → Phase 5, T030
- **SC-006**: No HTTP 403 errors in test output → Phase 3, T020
- **SC-007**: Test execution time remains <5 minutes → Phase 7, T035
- **SC-008**: MSW setup documented for future developers → Phase 6

## Implementation Approach

### Test-Driven Repair Workflow

This is a **test infrastructure fix**, not feature development:

1. **Current state**: Tests exist and failing due to environment issues
2. **Goal**: Fix test environment to make existing tests pass
3. **Approach**: Add MSW layer between tests and external APIs
4. **Validation**: All 232 tests pass without modifying test logic

### Parallelization Strategy

Tasks marked `[P]` can run in parallel:

**Phase 2** (handlers):
- T007-T011 [P]: Different entity type handlers can be written concurrently

**Phase 3** (fixtures):
- T015-T018 [P]: Different entity type fixtures can be created concurrently

**Phase 4** (test updates):
- T023-T025 [P]: Different test files can be updated concurrently

**Phase 5** (validation):
- T026-T029: Must run sequentially to validate each category

## Risk Assessment

### High Risk: Breaking Existing Passing Tests

**Mitigation**:
- Run full test suite after each phase
- MSW only mocks OpenAlex API, not internal APIs
- Use `http.get('https://api.openalex.org/*')` to scope handlers

### Medium Risk: Fixture Data Mismatch

**Mitigation**:
- Copy real OpenAlex responses as fixture starting point
- Validate fixture schema against OpenAlex documentation
- Test with minimal fixtures first, expand as needed

### Low Risk: MSW Performance Overhead

**Mitigation**:
- MSW adds <1ms per request in Node.js mode
- Caching can reduce overhead further
- Monitor test execution time in Phase 7

## Dependencies

### External Dependencies

- MSW 2.x (to be installed)
- Existing: Playwright, Dexie, pako, qrcode

### Internal Dependencies

- InMemoryStorageProvider (already implemented)
- Catalogue components (already implemented)
- E2E test suite (already written)

## Rollback Plan

If MSW causes issues:

1. Remove MSW from `playwright.config.ts`
2. Revert test ID changes (restore real OpenAlex IDs)
3. Mark 27 tests as `test.skip()` temporarily
4. Document MSW issues for future investigation

## Post-Implementation Constitution Re-Check

After Phase 1 design (contracts created):

1. **Type Safety**: ✓ MSW handlers fully typed, fixtures match OpenAlex schemas
2. **Test-First Development**: ✓ Tests remain unchanged, infrastructure added
3. **Monorepo Architecture**: ✓ Changes in apps/web/test structure only
4. **Storage Abstraction**: ✓ No changes to storage layer
5. **Performance & Memory**: ✓ MSW adds minimal overhead, tests still serial

**No constitution violations introduced.**

## Complexity Tracking

**Additions**:
- MSW dependency (justified: standard testing practice)
- Test fixtures directory structure (justified: required for deterministic tests)
- MSW handler files (justified: API mocking layer)

**Rationale**: All additions serve test infrastructure needs, align with industry best practices for E2E testing, and enable reliable CI/CD pipelines without external API dependencies.

---

**Plan Complete**
**Next Step**: Execute Phase 0 (Research) to resolve all NEEDS CLARIFICATION
**After Research**: Execute Phase 1 (Design) to create contracts and quickstart
**After Design**: Ready for `/speckit.tasks` to generate detailed task breakdown
