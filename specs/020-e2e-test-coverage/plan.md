# Implementation Plan: E2E Test Coverage Enhancement

**Branch**: `020-e2e-test-coverage` | **Date**: 2025-11-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/020-e2e-test-coverage/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Identify and remediate gaps in E2E test coverage for the Academic Explorer web application. The feature will add missing tests for untested routes (Domains, Fields, Subfields, Browse, Search, Explore, utility pages), implement comprehensive workflow tests (search, graph interaction), add error scenario coverage (404, 500, network failures), and automate high-value manual tests. All discovered test failures will be resolved, and the test suite will achieve consistent pass rates with zero flaky tests over 10 consecutive CI runs.

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode enabled
**Primary Dependencies**: Playwright Test (E2E framework), @playwright/test, @axe-core/playwright (accessibility), fake-indexeddb (storage isolation), MSW (API mocking)
**Storage**: IndexedDB via storage provider interface (DexieStorageProvider for production, InMemoryStorageProvider for tests)
**Testing**: Playwright Test (E2E), Vitest (component/unit tests), serial execution (maxConcurrency: 1 to prevent OOM)
**Target Platform**: Chromium browser (primary), optional Firefox/WebKit for cross-browser testing
**Project Type**: Web application (React SPA with TanStack Router)
**Performance Goals**: Smoke suite <10 minutes (32 tests), full suite <30 minutes (~642 tests), individual test timeout 60 seconds
**Constraints**: Serial execution required (OOM at parallel), CI uses preview server (port 4173), local dev server (port 5173), API rate limiting (10 req/s)
**Scale/Scope**: 46 route files, 12 entity types, ~20 existing E2E test suites, 13 manual tests to review, target 20+ percentage point coverage increase

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with Academic Explorer Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ All test code will use TypeScript with strict types; Playwright's TypeScript API provides strong typing; page objects and helpers will use explicit types, no `any`
2. **Test-First Development**: ✅ New tests will be written first and verified to fail before fixes/implementations; follows Red-Green-Refactor for bug fixes discovered during audit
3. **Monorepo Architecture**: ✅ Tests reside in `apps/web/src/test/e2e/` and `apps/web/e2e/` (existing structure); no new packages required; no cross-package test dependencies
4. **Storage Abstraction**: ✅ Tests involving bookmarks/catalogues use `InMemoryStorageProvider` for isolation; no direct Dexie/IndexedDB coupling in tests
5. **Performance & Memory**: ✅ Tests run serially (existing `maxConcurrency: 1` constraint); performance targets defined in Success Criteria (SC-008, SC-009); no Web Workers needed for test execution
6. **Atomic Conventional Commits**: ✅ Each coverage gap resolution committed atomically (e.g., "test(e2e): add domains entity tests"); spec updates committed after each phase
7. **Development-Stage Pragmatism**: ✅ Existing test structure may be refactored; breaking changes to test helpers acceptable; no backward compatibility required
8. **Test-First Bug Fixes**: ✅ Any bugs discovered will have regression tests written before fixes; follows Test-First principle
9. **Deployment Readiness**: ✅ Test suite must pass completely before feature complete; no new blockers introduced; all tests green in CI
10. **Continuous Execution**: ✅ Work proceeds through all phases without pausing; spec commits after each phase; auto-invoke `/speckit.tasks` then `/speckit.implement` if no outstanding questions

**Complexity Justification Required?** No violations requiring justification. Feature adds tests within existing test infrastructure; no new packages, storage providers, or workers needed.

## Project Structure

### Documentation (this feature)

```text
specs/020-e2e-test-coverage/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - Test framework best practices, Playwright patterns
├── data-model.md        # Phase 1 output - Test case data models, coverage metrics schema
├── quickstart.md        # Phase 1 output - Running E2E tests guide
├── contracts/           # Phase 1 output - Test API contracts (page objects, helpers)
├── checklists/
│   └── requirements.md  # Quality checklist (already created during /speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/web/
├── e2e/                                    # Newer E2E tests (spec-013+)
│   ├── *.e2e.test.ts                      # Test files by feature area
│   └── [NEW] domains.e2e.test.ts          # Missing entity type tests
│   └── [NEW] fields.e2e.test.ts
│   └── [NEW] subfields.e2e.test.ts
│   └── [NEW] search-workflow.e2e.test.ts  # Workflow tests
│   └── [NEW] error-scenarios.e2e.test.ts  # Error handling tests
│
├── src/test/e2e/                          # Older E2E tests (pre-spec-013)
│   ├── *.e2e.test.ts                      # Existing test suites
│   ├── manual/                             # Manual tests (13 files)
│   │   └── [REVIEW] *.e2e.test.ts         # Candidates for automation
│   └── [NEW] browse.e2e.test.ts           # Missing route tests
│   └── [NEW] explore.e2e.test.ts
│   └── [NEW] settings.e2e.test.ts
│
├── playwright.config.ts                    # Playwright configuration (already exists)
├── playwright.global-setup.ts              # Global setup (cache warming)
├── playwright.global-teardown.ts           # Global teardown (cleanup)
│
└── test-results/                           # Test artifacts (gitignored)
    ├── playwright-report/
    ├── playwright-artifacts/
    └── storage-state/

packages/                                    # No changes to packages required
apps/web/src/components/                     # No changes to components (pure testing)
apps/web/src/routes/                         # No changes to routes (pure testing)
```

**Structure Decision**: Tests added to existing `apps/web/e2e/` and `apps/web/src/test/e2e/` directories following established patterns. Newer tests use `apps/web/e2e/` (spec-013 convention), older/legacy areas use `apps/web/src/test/e2e/`. No new directory structure required; work within established Playwright setup.

## Complexity Tracking

No violations requiring justification. All Constitution principles satisfied.

## Phase 0: Research & Unknowns

**Goal**: Resolve all NEEDS CLARIFICATION markers from Technical Context. Research best practices for test organization, Playwright patterns, and coverage measurement strategies.

### Research Tasks

1. **Playwright Test Organization Best Practices**
   - **Question**: What are the best practices for organizing large Playwright test suites with 600+ tests?
   - **Why needed**: Current structure has tests split between two directories (`apps/web/e2e/` and `apps/web/src/test/e2e/`); need guidance on consolidation strategy
   - **Sources**: Playwright documentation, Nx + Playwright integration guides, monorepo E2E testing patterns

2. **Page Object Model Patterns for React Router v7**
   - **Question**: What are effective page object patterns for TanStack Router v7 applications?
   - **Why needed**: Tests need to navigate between routes efficiently; current tests use direct URL navigation, but page objects could improve maintainability
   - **Sources**: Playwright page object documentation, TanStack Router testing guides, React SPA testing patterns

3. **Flaky Test Prevention Strategies**
   - **Question**: What are proven strategies for preventing flaky tests in Playwright, especially with IndexedDB and API mocking?
   - **Why needed**: SC-012 requires zero flaky tests over 10 consecutive CI runs; need concrete techniques
   - **Sources**: Playwright best practices, IndexedDB testing patterns, MSW integration guides

4. **Coverage Measurement for E2E Tests**
   - **Question**: How to measure route coverage and component coverage for E2E tests in Playwright?
   - **Why needed**: SC-011 requires measuring 20+ percentage point increase in coverage; need tooling recommendations
   - **Sources**: Playwright code coverage features, Istanbul/NYC integration, coverage reporting tools

5. **Manual Test Automation Criteria**
   - **Question**: What criteria should be used to decide which manual tests are worth automating vs. keeping as exploratory tests?
   - **Why needed**: 13 manual test files need review; need objective criteria to avoid over-automation
   - **Sources**: Test automation ROI frameworks, exploratory testing guidelines, cost-benefit analysis patterns

### Expected Outputs (research.md)

For each research task:
- **Decision**: Chosen approach with concrete examples
- **Rationale**: Why chosen over alternatives
- **Alternatives Considered**: Other options evaluated with pros/cons
- **Implementation Notes**: Specific technical details for implementation phase

## Phase 1: Design & Data Models

**Goal**: Define test case data models, coverage metrics schema, test API contracts (page objects, helpers), and quickstart documentation.

### 1.1 Data Models (data-model.md)

**Test Case Entity**:
- Fields: testId (string), description (string), routePattern (string), entityType (EntityType?), expectedElements (string[]), priority (P1|P2|P3), status (pending|pass|fail), executionTime (number), retries (number)
- Relationships: Belongs to TestSuite, has TestSteps, produces TestReport
- Validation: testId must be unique, routePattern must be valid route, executionTime <60s
- State transitions: pending → running → (pass|fail) → (retry?) → final

**Coverage Gap Entity**:
- Fields: gapId (string), route (string), gapType (route|workflow|error), description (string), priority (P1|P2|P3), remediationStatus (identified|planned|in-progress|resolved)
- Relationships: Maps to TestCase when remediation planned
- Validation: route must exist in route manifest, priority must match spec priorities

**Test Suite Entity**:
- Fields: suiteId (string), name (string), category (entity|workflow|error|accessibility), testCount (number), passRate (number), avgExecutionTime (number)
- Relationships: Contains multiple TestCases
- Validation: passRate 0-100%, testCount > 0

**Test Report Entity**:
- Fields: reportId (string), runDate (ISO string), totalTests (number), passedTests (number), failedTests (number), skippedTests (number), flakyTests (number), executionTime (number), coveragePercentage (number)
- Relationships: Aggregates TestCase results
- Validation: totalTests = passed + failed + skipped, executionTime > 0, coveragePercentage 0-100%

### 1.2 API Contracts (contracts/)

**Page Objects** (`contracts/page-objects.ts`):
```typescript
// Base page object for entity detail pages
interface EntityDetailPage {
  goto(entityId: string): Promise<void>;
  getEntityTitle(): Promise<string>;
  getEntityInfo(): Promise<Record<string, unknown>>;
  hasRelationships(): Promise<boolean>;
  getIncomingRelationshipCount(): Promise<number>;
  getOutgoingRelationshipCount(): Promise<number>;
}

// Base page object for entity index pages
interface EntityIndexPage {
  goto(): Promise<void>;
  hasSearchInput(): Promise<boolean>;
  hasFilterControls(): Promise<boolean>;
  getResultCount(): Promise<number>;
  clickFirstResult(): Promise<void>;
}

// Error page object
interface ErrorPage {
  isErrorPage(): Promise<boolean>;
  getErrorType(): Promise<'404' | '500' | 'network' | 'unknown'>;
  hasRetryButton(): Promise<boolean>;
  clickRetry(): Promise<void>;
}
```

**Test Helpers** (`contracts/test-helpers.ts`):
```typescript
// Navigation helper
interface NavigationHelper {
  navigateToEntity(entityType: EntityType, entityId: string): Promise<void>;
  navigateToIndex(entityType: EntityType): Promise<void>;
  goBack(): Promise<void>;
  goForward(): Promise<void>;
}

// Storage helper (uses InMemoryStorageProvider for test isolation)
interface StorageTestHelper {
  clearStorage(): Promise<void>;
  seedBookmarks(count: number): Promise<void>;
  seedCatalogueList(listId: string, entityCount: number): Promise<void>;
  verifyStorageState(expected: Record<string, unknown>): Promise<void>;
}

// Assertion helper
interface AssertionHelper {
  waitForEntityData(timeout?: number): Promise<void>;
  waitForNoError(timeout?: number): Promise<void>;
  waitForSearchResults(minCount: number, timeout?: number): Promise<void>;
  verifyAccessibility(): Promise<void>; // Uses @axe-core/playwright
}
```

### 1.3 Quickstart (quickstart.md)

**Running E2E Tests**:
```bash
# Run smoke suite (32 tests, ~2 minutes)
pnpm nx e2e web

# Run full suite (~642 tests, ~30 minutes)
E2E_FULL_SUITE=true pnpm nx e2e web

# Run specific test file
pnpm exec playwright test domains.e2e.test.ts

# Run with UI mode (debugging)
pnpm exec playwright test --ui

# Generate coverage report
E2E_FULL_SUITE=true pnpm nx e2e web --reporter=html
```

**Test Development Workflow**:
1. Identify coverage gap from spec.md Coverage Gap Analysis
2. Create test file in `apps/web/e2e/` (newer) or `apps/web/src/test/e2e/` (legacy)
3. Use page objects from `contracts/page-objects.ts`
4. Write test following Red-Green-Refactor (fail first)
5. Run test locally: `pnpm exec playwright test your-test.e2e.test.ts`
6. Verify test fails as expected
7. Implement fix/feature to make test pass
8. Commit atomically with conventional commit message

**Debugging Failed Tests**:
```bash
# Run test with headed browser (see what's happening)
pnpm exec playwright test --headed your-test.e2e.test.ts

# Run test with debugging (step through)
pnpm exec playwright test --debug your-test.e2e.test.ts

# View test report
pnpm exec playwright show-report

# Check trace for failed test
pnpm exec playwright show-trace test-results/.../trace.zip
```

## Phase 2: Task Breakdown (NOT DONE BY /speckit.plan)

**Note**: Task breakdown is generated by `/speckit.tasks` command, not `/speckit.plan`. This section documents the expected task organization for reference.

### Expected Task Organization

**Phase 1: Foundation (P1 - Critical)**
- T001: Audit existing E2E test suite for failures
- T002: Create page object models for entity pages
- T003: Create test helpers (navigation, storage, assertions)
- T004: Add missing entity type tests (Domains, Fields, Subfields)

**Phase 2: Core Workflows (P1 - Critical)**
- T005: Add search workflow tests (query → results → filtering)
- T006: Add browse page tests
- T007: Add explore page tests
- T008: Fix any discovered test failures from audit

**Phase 3: Error Scenarios (P2 - Important)**
- T009: Add 404 error scenario tests
- T010: Add 500 error scenario tests
- T011: Add network failure tests
- T012: Add malformed URL tests

**Phase 4: Workflow Enhancement (P2 - Important)**
- T013: Add graph interaction workflow tests
- T014: Add multi-viewport tests (mobile, tablet, desktop)
- T015: Review manual tests for automation candidates
- T016: Automate high-value manual tests

**Phase 5: Polish & Verification (P3 - Nice to Have)**
- T017: Add accessibility scans for all major routes
- T018: Add utility page tests (About, Settings, Cache, History)
- T019: Add performance benchmarks for graph rendering
- T020: Verify zero flaky tests over 10 consecutive CI runs

**Phase 6: Documentation & Deployment**
- T021: Update test documentation
- T022: Generate coverage report
- T023: Commit spec updates
- T024: Verify all tests pass in CI

## Next Steps

1. ✅ Constitution Check passed - proceed to Phase 0
2. ⏭️ Execute Phase 0: Create `research.md` with findings from research tasks
3. ⏭️ Execute Phase 1: Create `data-model.md`, `contracts/`, and `quickstart.md`
4. ⏭️ Update agent context via `.specify/scripts/bash/update-agent-context.sh`
5. ⏭️ Re-validate Constitution compliance after design complete
6. ⏭️ Command completion: Report branch, plan path, and generated artifacts

**Status**: Ready for Phase 0 research.
