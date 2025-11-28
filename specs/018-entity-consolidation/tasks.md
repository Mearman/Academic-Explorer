# Tasks: OpenAlex Entity Definition Consolidation

**Feature**: 018-entity-consolidation
**Branch**: `018-entity-consolidation`
**Date**: 2025-11-21
**Input**: Design artifacts from `/speckit.plan` (plan.md, research.md, data-model.md, contracts/, quickstart.md)

---

## Task Overview

**Total Tasks**: 24 tasks across 7 phases
**Estimated Time**: 75 minutes
**Priority Order**: P1 (foundational) → P1 (metadata consistency) → P2 (type safety) → Polish

**Checklist Format**:
- `[TaskID]` = Unique identifier (T001-T024)
- `[P?]` = Priority (P1, P2, P3) mapped to user stories
- `[Story?]` = User story reference (US1, US2, US3)
- File paths included for all code changes

---

## Phase 0: Setup & Prerequisites

**Goal**: Verify environment and create feature branch

### Setup Tasks

- [x] T001 [P1] [US1] Verify clean working tree (git status)
  - **Command**: `git status`
  - **Expected**: No uncommitted changes
  - **Validation**: Zero modified files
  - **Completed**: 2025-11-21

- [x] T002 [P1] [US1] Verify all tests pass before refactoring (pnpm test)
  - **Command**: `pnpm test`
  - **Expected**: All 738 tests pass
  - **Validation**: Zero test failures
  - **Completed**: 2025-11-21

- [x] T003 [P1] [US1] Verify all packages build successfully (pnpm build)
  - **Command**: `pnpm build`
  - **Expected**: All 8 projects build
  - **Validation**: Zero build errors
  - **Completed**: 2025-11-21

- [x] T004 [P1] [US1] Create feature branch 018-entity-consolidation
  - **Command**: `git checkout -b 018-entity-consolidation`
  - **Validation**: Branch created and checked out
  - **Completed**: 2025-11-21

---

## Phase 1: Graph Package Refactoring (User Story 1 - P1)

**Goal**: Eliminate duplicate EntityType in graph package, import from types package

### Graph Package Tasks

- [x] T005 [P1] [US1] Remove duplicate EntityType definition in packages/graph/src/types/core.ts (lines 9-21)
  - **File**: `packages/graph/src/types/core.ts`
  - **Action**: Delete lines 9-21 (entire EntityType union definition)
  - **Validation**: EntityType no longer defined locally
  - **Completed**: 2025-11-21 (commit 5546ed53)

- [x] T006 [P1] [US1] Add EntityType import to packages/graph/src/types/core.ts
  - **File**: `packages/graph/src/types/core.ts`
  - **Location**: After existing imports (around line 6)
  - **Code**: `import type { EntityType } from "@bibgraph/types"`
  - **Validation**: Import statement added
  - **Completed**: 2025-11-21 (commit 5546ed53)

- [x] T007 [P1] [US1] Remove EntityType re-export from packages/graph/src/index.ts
  - **File**: `packages/graph/src/index.ts`
  - **Action**: Delete line: `export type { EntityType } from "./types/core"`
  - **Rationale**: Constitution Principle III prohibits re-exports between internal packages
  - **Note**: Consumers must import directly from @bibgraph/types
  - **Validation**: Re-export removed, no EntityType export remains in graph package
  - **Completed**: 2025-11-21 (commit 5546ed53)

- [x] T008 [P1] [US1] Verify graph package type checking passes (pnpm nx typecheck graph)
  - **Command**: `pnpm nx typecheck graph`
  - **Expected**: Zero type errors
  - **Validation**: TypeScript compilation successful
  - **Completed**: 2025-11-21 (commit 5546ed53)

- [x] T009 [P1] [US1] Verify graph package tests pass (pnpm nx test graph)
  - **Command**: `pnpm nx test graph`
  - **Expected**: All graph tests pass
  - **Validation**: Zero test failures
  - **Completed**: 2025-11-21 (commit 5546ed53)

- [x] T010 [P1] [US1] Commit graph package changes
  - **Files**: `packages/graph/src/types/core.ts`, `packages/graph/src/index.ts`
  - **Message**: `refactor(graph): import EntityType from types package`
  - **Body**:
    ```
    Remove duplicate EntityType definition in packages/graph/src/types/core.ts.
    Import from canonical source @bibgraph/types instead.

    Remove EntityType re-export from index.ts per Constitution Principle III
    (no re-exports between internal packages) and Principle VII (no backward
    compatibility during development).

    BREAKING CHANGE: Consumers importing EntityType from @bibgraph/graph
    must update imports to @bibgraph/types
    ```
  - **Validation**: Commit created successfully
  - **Completed**: 2025-11-21 (commit 5546ed53)

---

## Phase 2: Utils Package - Catalogue DB (User Story 1 - P1)

**Goal**: Eliminate duplicate EntityType in catalogue-db, import from types package

### Catalogue DB Tasks

- [x] T011 [P1] [US1] Remove duplicate EntityType definition in packages/utils/src/storage/catalogue-db.ts (lines 62-72)
  - **File**: `packages/utils/src/storage/catalogue-db.ts`
  - **Action**: Delete lines 62-72 (EntityType union definition)
  - **Note**: Old definition was subset (missing "concepts", "keywords")
  - **Validation**: EntityType no longer defined locally

- [x] T012 [P1] [US1] Add EntityType import to packages/utils/src/storage/catalogue-db.ts
  - **File**: `packages/utils/src/storage/catalogue-db.ts`
  - **Location**: After existing imports (around line 8)
  - **Code**: `import type { EntityType } from "@bibgraph/types"`
  - **Validation**: Import statement added

- [x] T013 [P1] [US1] Verify catalogue-db type checking passes
  - **Command**: `pnpm nx typecheck utils`
  - **Expected**: Zero type errors
  - **Note**: Stricter type checking (subset → superset) is intentional improvement
  - **Validation**: TypeScript compilation successful

---

## Phase 3: Utils Package - Cache Browser (User Story 1 - P1)

**Goal**: Split cache storage types, import EntityType from types package

### Cache Browser Tasks

- [x] T014 [P1] [US1] Replace EntityType definition in packages/utils/src/cache-browser/types.ts
  - **File**: `packages/utils/src/cache-browser/types.ts`
  - **Find**: Lines 6-16 (EntityType union including "autocomplete")
  - **Replace**:
    ```typescript
    import type { EntityType } from "@bibgraph/types"

    /**
     * Cache storage types include entity types + special "autocomplete" cache
     */
    export type CacheStorageType = EntityType | "autocomplete"
    ```
  - **Validation**: EntityType imported, CacheStorageType created

- [x] T015 [P1] [US1] Update CachedEntityMetadata interface to use CacheStorageType
  - **File**: `packages/utils/src/cache-browser/types.ts`
  - **Find**: `type: EntityType` (line 18)
  - **Replace**: `type: CacheStorageType`
  - **Validation**: Interface updated

- [x] T016 [P1] [US1] Update CacheBrowserStats interface to use CacheStorageType
  - **File**: `packages/utils/src/cache-browser/types.ts`
  - **Find**: `entitiesByType: Record<EntityType, number>` (line 37)
  - **Replace**: `entitiesByType: Record<CacheStorageType, number>`
  - **Validation**: Interface updated

- [x] T017 [P1] [US1] Update CacheBrowserFilters interface to use CacheStorageType
  - **File**: `packages/utils/src/cache-browser/types.ts`
  - **Find**: `entityTypes: Set<EntityType>` (line 46)
  - **Replace**: `entityTypes: Set<CacheStorageType>`
  - **Validation**: Interface updated

- [x] T018 [P1] [US1] Verify utils package type checking passes (pnpm nx typecheck utils)
  - **Command**: `pnpm nx typecheck utils`
  - **Expected**: Zero type errors
  - **Validation**: TypeScript compilation successful

- [x] T019 [P1] [US1] Verify utils package tests pass (pnpm nx test utils)
  - **Command**: `pnpm nx test utils`
  - **Expected**: All utils tests pass
  - **Validation**: Zero test failures

- [x] T020 [P1] [US1] Commit utils package changes
  - **Files**: `packages/utils/src/storage/catalogue-db.ts`, `packages/utils/src/cache-browser/types.ts`
  - **Message**: `refactor(utils): import EntityType from types package`
  - **Body**:
    ```
    Remove duplicate EntityType definitions in:
    - packages/utils/src/storage/catalogue-db.ts
    - packages/utils/src/cache-browser/types.ts

    Create CacheStorageType union for cache browser (EntityType | 'autocomplete').

    Utils package does not re-export EntityType per Constitution Principle III
    (no re-exports between internal packages). Consumers must import directly
    from @bibgraph/types.

    BREAKING CHANGE: CachedEntityMetadata.type changed from EntityType to
    CacheStorageType (internal change, affects cache browser only)
    ```
  - **Validation**: Commit created successfully

---

## Phase 4: Apps/Web Import Path Updates (User Story 2 - P1)

**Goal**: Update all EntityType imports in web app to use types package

### Web App Tasks

- [x] T021 [P1] [US2] Find all EntityType imports in apps/web/src
  - **Command**: `grep -r "import.*EntityType.*from" apps/web/src --include="*.ts" --include="*.tsx"`
  - **Expected**: List of files importing EntityType from graph or utils
  - **Validation**: Files identified for update

- [x] T022 [P1] [US2] Replace all EntityType import paths in apps/web/src
  - **Find**: `import type { EntityType } from "@bibgraph/graph"`
  - **Replace**: `import type { EntityType } from "@bibgraph/types"`
  - **Find**: `import type { EntityType } from "@bibgraph/utils"`
  - **Replace**: `import type { EntityType } from "@bibgraph/types"`
  - **Files**: Estimated ~10 files in components/, routes/, services/
  - **Manual Review**: Verify no unintended replacements
  - **Validation**: All imports updated

- [x] T023 [P1] [US2] Verify web app type checking passes (pnpm nx typecheck web)
  - **Command**: `pnpm nx typecheck web`
  - **Expected**: Zero type errors
  - **Validation**: TypeScript compilation successful

- [x] T024 [P1] [US2] Verify web app tests pass (pnpm nx test web)
  - **Command**: `pnpm nx test web`
  - **Expected**: All web tests pass
  - **Validation**: Zero test failures

- [x] T025 [P1] [US2] Verify web app builds successfully (pnpm nx build web)
  - **Command**: `pnpm nx build web`
  - **Expected**: Build succeeds
  - **Validation**: Web app compiles

- [x] T026 [P1] [US2] Commit web app changes
  - **Files**: All files in apps/web/src with EntityType imports
  - **Message**: `refactor(web): import EntityType from types package`
  - **Body**:
    ```
    Update all EntityType imports to use canonical source @bibgraph/types.

    Replaced imports from:
    - @bibgraph/graph
    - @bibgraph/utils

    BREAKING CHANGE: None (type-only imports, no runtime impact)
    ```
  - **Validation**: Commit created successfully

---

## Phase 5: Apps/CLI Import Path Updates (User Story 1 - P1)

**Goal**: Update all EntityType imports in CLI to use types package

### CLI Tasks

- [x] T027 [P1] [US1] Find all EntityType imports in apps/cli/src
  - **Command**: `grep -r "import.*EntityType.*from" apps/cli/src --include="*.ts"`
  - **Expected**: List of files importing EntityType
  - **Note**: CLI uses EntityType sparingly (cache stats commands)
  - **Validation**: Files identified for update

- [x] T028 [P1] [US1] Replace all EntityType import paths in apps/cli/src
  - **Find**: `import type { EntityType } from "@bibgraph/graph"`
  - **Replace**: `import type { EntityType } from "@bibgraph/types"`
  - **Files**: Estimated ~3 files in src/commands/
  - **Validation**: All imports updated

- [x] T029 [P1] [US1] Verify CLI type checking passes (pnpm nx typecheck cli)
  - **Command**: `pnpm nx typecheck cli`
  - **Expected**: Zero type errors
  - **Validation**: TypeScript compilation successful

- [x] T030 [P1] [US1] Verify CLI builds successfully (pnpm nx build cli)
  - **Command**: `pnpm nx build cli`
  - **Expected**: Build succeeds
  - **Validation**: CLI compiles

- [x] T031 [P1] [US1] Commit CLI changes
  - **Files**: All files in apps/cli/src with EntityType imports
  - **Message**: `refactor(cli): import EntityType from types package`
  - **Body**:
    ```
    Update EntityType imports to use canonical source @bibgraph/types.

    BREAKING CHANGE: None (type-only imports)
    ```
  - **Validation**: Commit created successfully

---

## Phase 6: Global Validation (User Stories 1, 2, 3 - All Priorities)

**Goal**: Verify all success criteria are met across entire monorepo

### Global Validation Tasks

- [x] T032 [P1] [US1] Verify zero duplicate EntityType definitions (SC-001)
  - **Command**: `grep -r "export type EntityType =" packages/ apps/ --include="*.ts" --include="*.tsx" | grep -v "packages/types/src/entities/entities.ts"`
  - **Expected**: Zero matches (no output)
  - **Success Criteria**: SC-001
  - **Validation**: Only canonical definition exists

- [x] T033 [P1] [US2] Verify all EntityType imports use types package (SC-002)
  - **Command**: `grep -r "import.*EntityType.*from" packages/ apps/ --include="*.ts" --include="*.tsx" | grep -v "@bibgraph/types" | grep -v "node_modules"`
  - **Expected**: Zero matches (all imports from types package)
  - **Success Criteria**: SC-002
  - **Validation**: Single source of truth enforced

- [x] T034 [P2] [US3] Verify full monorepo type check passes (SC-003)
  - **Command**: `pnpm typecheck`
  - **Expected**: Zero type errors across all 8 packages
  - **Success Criteria**: SC-003
  - **Validation**: TypeScript compilation successful

- [x] T035 [P1] [US1] Verify all 738 tests pass (SC-004)
  - **Command**: `pnpm test`
  - **Expected**: All 738 tests pass (zero failures)
  - **Success Criteria**: SC-004
  - **Validation**: Test suite unchanged

- [x] T036 [P1] [US1] Verify full monorepo build succeeds (SC-005)
  - **Command**: `pnpm build`
  - **Expected**: All 8 projects build successfully
  - **Success Criteria**: SC-005
  - **Validation**: Production-ready code

- [x] T037 [P2] [US3] Verify no hardcoded entity type strings outside types package (SC-006)
  - **Command**: `grep -rE "type.*=.*[\"']works[\"']" packages/ apps/ --include="*.ts" --include="*.tsx" | grep -v "packages/types" | grep -v "test" | grep -v ".spec.ts"`
  - **Expected**: Minimal matches (only test fixtures, MSW handlers)
  - **Success Criteria**: SC-006
  - **Note**: Test files may have hardcoded strings (acceptable)
  - **Validation**: Entity types centralized

---

## Phase 7: Documentation & Finalization (Polish)

**Goal**: Update documentation and verify deployment readiness

### Documentation Tasks

- [x] T038 [P2] [US1] Update CLAUDE.md with entity type consolidation notes
  - **File**: `CLAUDE.md`
  - **Section**: Add under "Recent Changes" or "Entity Type Consolidation"
  - **Content**:
    ```markdown
    ## Entity Type Consolidation (spec-018)

    **Status**: ✅ Complete (2025-11-21)

    All duplicate `EntityType` definitions have been consolidated into `@bibgraph/types`.

    **Import Pattern**:
    ```typescript
    import type { EntityType } from "@bibgraph/types"
    ```

    **Deprecated Imports** (removed):
    - ~~`import type { EntityType } from "@bibgraph/graph"`~~
    - ~~`import type { EntityType } from "@bibgraph/utils"`~~

    **Special Types**:
    - `CacheStorageType = EntityType | "autocomplete"` (cache browser only)
    ```
  - **Validation**: Documentation updated

- [x] T039 [P1] [US1] Generate verification report
  - **File**: Create `verification-report.txt` in feature directory
  - **Content**:
    ```bash
    echo "=== Entity Type Consolidation Verification Report ===" > verification-report.txt
    echo "" >> verification-report.txt
    echo "## Duplicate Definitions Check" >> verification-report.txt
    grep -r "export type EntityType =" packages/ apps/ --include="*.ts" --include="*.tsx" | grep -v "packages/types/src/entities/entities.ts" | wc -l >> verification-report.txt
    echo "" >> verification-report.txt
    echo "## Import Path Check" >> verification-report.txt
    grep -r "import.*EntityType.*from.*@bibgraph/types" packages/ apps/ --include="*.ts" --include="*.tsx" | wc -l >> verification-report.txt
    echo "" >> verification-report.txt
    echo "## Type Check Results" >> verification-report.txt
    pnpm typecheck 2>&1 | tail -5 >> verification-report.txt
    echo "" >> verification-report.txt
    echo "## Test Results" >> verification-report.txt
    pnpm test 2>&1 | grep -E "Tests.*passed|PASS|FAIL" >> verification-report.txt
    echo "" >> verification-report.txt
    echo "## Build Results" >> verification-report.txt
    pnpm build 2>&1 | grep -E "Successfully ran target build" >> verification-report.txt
    ```
  - **Validation**: Report generated and reviewed

- [x] T040 [P1] [US1] Commit documentation updates
  - **Files**: `CLAUDE.md`, `verification-report.txt`
  - **Message**: `docs(docs): update CLAUDE.md with entity type consolidation notes`
  - **Body**:
    ```
    Add import pattern documentation and deprecation notices.
    Include verification report showing zero duplicate definitions.

    Refs: spec-018
    ```
  - **Validation**: Commit created successfully

---

## Task Dependency Graph

```
Phase 0 (Setup)
  T001 → T002 → T003 → T004

Phase 1 (Graph)
  T004 → T005 → T006 → T007 → T008 → T009 → T010

Phase 2 (Utils - Catalogue)
  T010 → T011 → T012 → T013

Phase 3 (Utils - Cache Browser)
  T013 → T014 → T015 → T016 → T017 → T018 → T019 → T020

Phase 4 (Web)
  T020 → T021 → T022 → T023 → T024 → T025 → T026

Phase 5 (CLI)
  T026 → T027 → T028 → T029 → T030 → T031

Phase 6 (Validation)
  T031 → T032 → T033 → T034 → T035 → T036 → T037

Phase 7 (Documentation)
  T037 → T038 → T039 → T040
```

---

## Success Criteria Mapping

| Success Criteria | Tasks | Validation |
|-----------------|-------|------------|
| SC-001: Zero duplicate EntityType definitions | T005, T011, T014, T032 | grep validation |
| SC-002: All metadata resolves to ENTITY_METADATA | T033 | import path check |
| SC-003: TypeScript compilation passes | T008, T013, T018, T023, T029, T034 | pnpm typecheck |
| SC-004: All 738 tests pass | T009, T019, T024, T035 | pnpm test |
| SC-005: Build succeeds for all 8 projects | T003, T025, T030, T036 | pnpm build |
| SC-006: No hardcoded entity type strings | T037 | grep with regex |
| SC-007: New entity type requires 1 file change | T038 | documentation |
| SC-008: IDE autocomplete suggests valid types | T034 | manual VSCode/WebStorm test |

---

## Rollback Plan

If any task fails and cannot be resolved:

1. **Revert commits in reverse order**:
   - `git reset --hard HEAD~1` (undo last commit)
   - Repeat for each commit in reverse dependency order

2. **Clear Nx cache**:
   - `nx reset`

3. **Verify rollback**:
   - `pnpm typecheck` (should pass)
   - `pnpm test` (should pass all 738 tests)

4. **Investigate failure**:
   - Review error messages
   - Check type mismatches
   - Verify import paths

5. **Retry with fix**:
   - Apply fix to specific task
   - Re-run from failed task onwards

---

## Execution Notes

**Estimated Execution Time**: 75 minutes
- Phase 0 (Setup): 5 minutes
- Phase 1 (Graph): 15 minutes
- Phase 2 (Catalogue): 10 minutes
- Phase 3 (Cache Browser): 10 minutes
- Phase 4 (Web): 20 minutes
- Phase 5 (CLI): 10 minutes
- Phase 6 (Validation): 5 minutes
- Phase 7 (Documentation): 5 minutes

**Parallelization Opportunities**: None - tasks must run sequentially due to dependencies

**Quality Gates**:
- TypeScript compilation after each package
- Test suite after each package
- Build verification before final commit
- Global validation before documentation

**Constitution Compliance**:
- ✅ Atomic conventional commits (one per package)
- ✅ Test-first (existing tests validate behavior)
- ✅ Type safety (strict TypeScript, no `any` types)
- ✅ Monorepo architecture (proper Nx workspace usage)
- ✅ Continuous execution (automatic workflow progression)
