# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Fix 27 failing E2E tests (232 total) by implementing MSW (Mock Service Worker) to mock OpenAlex API responses. Current failures are caused by HTTP 403 errors from api.openalex.org, not implementation bugs. Solution: MSW Node.js server intercepts HTTP requests during Playwright test execution and returns static JSON fixtures.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, ES2022 target, ESNext modules)
**Primary Dependencies**: MSW 2.x (Node.js server mode), Playwright (E2E testing), pako (compression, already installed)
**Storage**: IndexedDB via Dexie 4.x (production), InMemoryStorageProvider (E2E tests, already implemented)
**Testing**: Playwright E2E tests (232 tests, serial execution per constitution)
**Target Platform**: Chromium browser via Playwright on Node.js 18+
**Project Type**: Nx monorepo web application (apps/web)
**Performance Goals**: All tests complete in <5 minutes; MSW adds <100ms overhead per test
**Constraints**: Tests run serially (constitution requirement); no real API calls; fixtures must match OpenAlex schema
**Scale/Scope**: 232 E2E tests, 27 failing tests to fix, 4 OpenAlex entity types (works, authors, institutions, sources)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with Academic Explorer Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ MSW handlers will be fully typed with TypeScript interfaces; fixture types will match OpenAlex schema; no `any` types
2. **Test-First Development**: ✅ Tests already exist and are failing; this feature fixes test infrastructure (not modifying test logic)
3. **Monorepo Architecture**: ✅ Changes confined to apps/web/test directory; follows Nx workspace structure
4. **Storage Abstraction**: ✅ No storage changes; tests already use InMemoryStorageProvider per constitution
5. **Performance & Memory**: ✅ Tests continue running serially (constitution requirement); MSW adds minimal overhead (<100ms per test)

**Complexity Justification Required?** YES - Adding MSW dependency and test fixtures infrastructure

**Justification**:
- MSW is standard industry practice for E2E test API mocking
- Enables reliable, deterministic tests without external API dependencies
- Aligns with constitution's test-first and performance principles
- Fixes 27 failing tests blocking research workflow validation
- No simpler alternative: real API calls fail with 403 errors; skipping tests defeats purpose

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/web/
├── test/
│   ├── fixtures/                    # NEW: Test data fixtures (JSON files)
│   │   ├── works/
│   │   │   ├── work-bioplastics.json
│   │   │   └── work-sample.json
│   │   ├── authors/
│   │   │   └── author-sample.json
│   │   ├── institutions/
│   │   │   └── institution-sample.json
│   │   ├── sources/
│   │   │   └── source-sample.json
│   │   └── README.md               # NEW: Fixture documentation
│   ├── mocks/                      # NEW: MSW request handlers
│   │   ├── handlers.ts             # NEW: MSW handlers for OpenAlex API
│   │   ├── fixtures-loader.ts      # NEW: Load fixture data
│   │   └── README.md               # NEW: Mock setup documentation
│   ├── setup/
│   │   ├── msw-setup.ts            # NEW: MSW server initialization
│   │   └── global-setup.ts         # MODIFIED: Add MSW initialization
│   └── e2e/                        # EXISTING: No changes to test files
├── playwright.config.ts            # MODIFIED: Add MSW lifecycle hooks
└── package.json                    # MODIFIED: Add msw dependency
```

**Structure Decision**: Nx monorepo web application structure. All changes confined to apps/web/test directory to maintain separation of concerns. Test infrastructure (MSW) is isolated from production code. Fixtures are organized by OpenAlex entity type for maintainability.

## Complexity Tracking

| Addition | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|-------------------------------------|
| MSW dependency | Mock OpenAlex API responses in E2E tests | Real API returns HTTP 403; skipping tests defeats validation purpose |
| Test fixtures infrastructure | Deterministic, version-controlled test data | Dynamic fixture generation adds complexity; manual creation is simpler |
| MSW handlers layer | Intercept HTTP requests before they reach network | Playwright request interception is lower-level and requires more boilerplate |

**Rationale**: All additions serve test reliability (constitution principle II). MSW is industry-standard practice for E2E API mocking. The complexity is justified by fixing 27 failing tests that block research workflow validation.

---

## Phase 0: Research (COMPLETE)

**Output**: `research.md`

**Key Findings**:
1. MSW handlers already exist in `apps/web/src/test/msw/handlers.ts`
2. Handlers not integrated into Playwright lifecycle (causing 403 errors)
3. Use `setupServer` from `msw/node` in global setup (Node.js pattern)
4. Mock factories cover all required entities (Work, Author, Institution)
5. No static fixtures needed initially (factories sufficient)
6. No test ID changes required (factories work with any ID)

**Decision**: Integrate existing MSW handlers into Playwright global setup/teardown.

---

## Phase 1: Design (COMPLETE)

**Outputs**:
1. `data-model.md` - Entity schemas and relationships
2. `contracts/msw-setup.interface.ts` - TypeScript contracts for MSW lifecycle
3. `quickstart.md` - Developer guide for MSW integration

**Key Design Decisions**:
1. **Reuse existing handlers**: No new mock factories needed
2. **Global lifecycle management**: Start MSW in globalSetup, stop in globalTeardown
3. **No fixture files**: Programmatic factories sufficient for current tests
4. **Type-safe contracts**: MSWServerManager, HandlerValidator interfaces

---

## Phase 2: Implementation Tasks

**Goal**: Integrate MSW into Playwright test lifecycle to fix 27 failing tests

### Task 1: Create MSW Setup Module

**File**: `apps/web/test/setup/msw-setup.ts`

**Implementation**:
```typescript
import { setupServer } from 'msw/node';
import { openalexHandlers } from '../msw/handlers';

export const mswServer = setupServer(...openalexHandlers);

export function startMSWServer() {
  mswServer.listen({ onUnhandledRequest: 'warn' });
  console.log('✅ MSW server started');
}

export function stopMSWServer() {
  mswServer.close();
  console.log('🛑 MSW server stopped');
}
```

**Validation**: File compiles without TypeScript errors

**Dependencies**: None (imports existing handlers)

---

### Task 2: Update Playwright Global Setup

**File**: `apps/web/playwright.global-setup.ts`

**Changes**:
1. Import `startMSWServer` from `./test/setup/msw-setup`
2. Call `startMSWServer()` at beginning of `globalSetup` function (before browser launch)

**Validation**:
- Global setup runs without errors
- Console shows "✅ MSW server started"

**Dependencies**: Task 1 complete

---

### Task 3: Update Playwright Global Teardown

**File**: `apps/web/playwright.global-teardown.ts`

**Changes**:
1. Import `stopMSWServer` from `./test/setup/msw-setup`
2. Call `stopMSWServer()` at end of `globalTeardown` function

**Validation**:
- Global teardown runs without errors
- Console shows "🛑 MSW server stopped"

**Dependencies**: Task 1 complete

---

### Task 4: Verify MSW Installation

**Command**: `cd apps/web && pnpm list msw`

**Expected**: MSW 2.x listed as devDependency

**If missing**: `pnpm add -D msw@latest`

**Validation**: MSW package installed

**Dependencies**: None

---

### Task 5: Run Single Test for Integration Verification

**Command**: `cd apps/web && pnpm playwright test src/test/e2e/bookmarking.e2e.test.ts`

**Expected**:
- MSW server starts before test
- Test passes without HTTP 403 errors
- MSW server stops after test
- Console shows MSW lifecycle messages

**Validation**: Single test passes with MSW active

**Dependencies**: Tasks 1-4 complete

---

### Task 6: Run Full E2E Test Suite

**Command**: `cd apps/web && pnpm test:e2e`

**Expected**:
- 232/232 tests pass (up from 205/232)
- Zero HTTP 403 errors in output
- Test execution time <5 minutes
- MSW intercepts all api.openalex.org requests

**Validation**: All tests pass

**Dependencies**: Task 5 passes

---

### Task 7: Create Documentation

**Files**:
- `apps/web/test/README.md` - Test infrastructure overview
- `apps/web/test/setup/README.md` - MSW setup documentation

**Content**:
- MSW integration architecture
- Troubleshooting guide
- How to add new handlers
- How to override handlers in specific tests

**Validation**: Documentation is clear and accurate

**Dependencies**: Task 6 passes

---

### Task 8: Update CLAUDE.md

**File**: `apps/web/CLAUDE.md` (project-level documentation)

**Add**:
- MSW 2.x to Active Technologies list
- Test infrastructure note about MSW integration
- Reference to quickstart.md for MSW usage

**Validation**: CLAUDE.md accurately reflects new MSW integration

**Dependencies**: Tasks 1-7 complete

---

## Success Criteria Mapping

From spec.md, validation against implementation:

| Success Criterion | Implementation Task | Validation Method |
|-------------------|---------------------|-------------------|
| SC-001: 232/232 tests pass | Task 6 | Run full test suite |
| SC-002: Zero HTTP 403 errors | Task 6 | Check test output logs |
| SC-003: Zero real API calls | Task 5-6 | MSW intercepts all openalex.org requests |
| SC-004: Tests complete <5 min | Task 6 | Measure test execution time |
| SC-005: MSW adds <100ms per test | Task 6 | Compare with/without MSW (estimate) |
| SC-006: 100% requests mocked | Task 6 | No "Request not mocked" warnings |
| SC-007: Tests pass in all envs | Task 6 | Local + CI validation |
| SC-008: Fixture creation <5 min | Task 7 | Documentation clarity |
| SC-009: Troubleshooting guide | Task 7 | Documentation completeness |
| SC-010: Clear error messages | Task 5-6 | Test failure diagnosis |

---

## Implementation Timeline

**Total Effort**: 1-2 hours for experienced developer

**Task Breakdown**:
- Task 1: 15 minutes (create msw-setup.ts)
- Task 2: 10 minutes (update global-setup.ts)
- Task 3: 10 minutes (update global-teardown.ts)
- Task 4: 5 minutes (verify MSW installed)
- Task 5: 10 minutes (run single test)
- Task 6: 5 minutes (run full suite)
- Task 7: 20 minutes (create documentation)
- Task 8: 5 minutes (update CLAUDE.md)

**Critical Path**: Tasks 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 (sequential)

**Parallelization**: None (tasks are dependent)

---

## Risk Mitigation

### Risk: MSW doesn't intercept requests in Playwright

**Probability**: Low (setupServer works in Node.js)

**Impact**: High (tests still fail)

**Mitigation**:
- Verify MSW started before browser contexts created
- Check handler patterns match request URLs exactly
- Use verbose logging to debug interception

---

### Risk: Mock data doesn't match test expectations

**Probability**: Medium (mock factories are generic)

**Impact**: Medium (some tests may fail)

**Mitigation**:
- Review test failures and identify specific data needs
- Add static fixtures for tests requiring specific entities
- Update mock factories to include missing fields

---

### Risk: MSW adds significant performance overhead

**Probability**: Low (MSW is fast in Node.js mode)

**Impact**: Low (tests still run in <5 minutes)

**Mitigation**:
- Measure baseline test execution time (current: ~4 minutes for passing tests)
- Compare after MSW integration
- If >10% slowdown, investigate handler optimization

---

## Post-Implementation Constitution Re-Check

After Task 6 complete (all tests passing):

1. **Type Safety**: ✅ MSW handlers fully typed, no `any` types used
2. **Test-First Development**: ✅ Tests unchanged, infrastructure fixed
3. **Monorepo Architecture**: ✅ Changes in apps/web/test only
4. **Storage Abstraction**: ✅ No storage changes
5. **Performance & Memory**: ✅ Tests remain serial, minimal overhead

**Constitution Compliance**: PASS

---

## Next Steps

1. Run `/speckit.tasks` to generate detailed task breakdown
2. Run `/speckit.implement` to execute implementation
3. Validate all 232 tests pass
4. Commit changes to branch `005-test-environment-msw`
5. Create PR for review

---

**Plan Complete**
**Phase 0**: Research complete (research.md)
**Phase 1**: Design complete (data-model.md, contracts/, quickstart.md)
**Phase 2**: Implementation tasks defined (8 tasks, 1-2 hours)
**Ready for**: `/speckit.tasks` command
