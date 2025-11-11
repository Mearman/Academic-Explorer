# Tasks: Fix Vite/TypeScript In-Place Compilation Issue

**Input**: Design documents from `/specs/003-fix-vite-compilation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: No test tasks - this is a configuration-only fix verified through existing E2E tests

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is an Nx monorepo with the following structure:
- **Root configs**: `tsconfig.base.json`, `tsconfig.app.json`, `.gitignore`
- **App configs**: `apps/web/tsconfig.json`, `apps/web/tsconfig.build.json` (to be created), `apps/web/package.json`
- **Package configs**: `packages/*/tsconfig.json`, `tools/tsconfig.json`
- **Build artifacts**: Should only exist in `apps/web/dist/`, `packages/*/dist/`, `node_modules/.vite/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify current state and prepare for configuration changes

- [ ] T001 Verify current problem state by checking for in-place .js artifacts in apps/web/src/ using `find apps/web/src -name "*.js" -o -name "*.d.ts" | head -10`
- [ ] T002 Check git status for untracked compiled artifacts using `git status --porcelain | grep "??" | grep "src/" | head -10`
- [ ] T003 Verify apps/web/tsconfig.json has noEmit setting by running `jq '.compilerOptions.noEmit' apps/web/tsconfig.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Backup .gitignore file using `cp .gitignore .gitignore.backup`
- [ ] T005 Add TypeScript in-place compilation artifact patterns to .gitignore (apps/web/src/**/*.js, apps/web/src/**/*.js.map, apps/web/src/**/*.d.ts, apps/web/src/**/*.d.ts.map with exceptions for *.test.js and *.config.js)
- [ ] T006 Verify .gitignore patterns work correctly using `git check-ignore apps/web/src/components/Button.js` and `git check-ignore apps/web/src/components/Button.test.js`
- [ ] T007 Commit .gitignore changes with message "chore(config): ignore TypeScript in-place compilation artifacts"

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Developer Running E2E Tests Sees Latest Code Changes (Priority: P1) 🎯 MVP

**Goal**: Fix TypeScript configuration so Vite dev server serves fresh compiled code, not stale in-place .js files, enabling E2E tests to see latest changes

**Independent Test**: Make a visible change to a React component (e.g., change button text in AddToListModal.tsx), run E2E tests, verify tests see the new text

### Implementation for User Story 1

- [ ] T008 [US1] Create apps/web/tsconfig.build.json by copying apps/web/tsconfig.json using `cp apps/web/tsconfig.json apps/web/tsconfig.build.json`
- [ ] T009 [US1] Update apps/web/tsconfig.build.json to add build-specific compiler options: noEmit: false, composite: true, declaration: true, declarationMap: true, outDir: "./dist", rootDir: "./src", sourceMap: true, incremental: true, tsBuildInfoFile: "./dist/.tsbuildinfo"
- [ ] T010 [US1] Update apps/web/tsconfig.build.json to exclude test files: add exclude array with "src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.spec.ts", "src/**/*.spec.tsx", "src/test/**/*"
- [ ] T011 [US1] Verify apps/web/tsconfig.json has noEmit: true in compilerOptions (ensure dev config prevents emission)
- [ ] T012 [US1] Update apps/web/package.json build script from "vite build" to "tsc -p tsconfig.build.json && vite build"
- [ ] T013 [US1] Verify typecheck script in apps/web/package.json uses "tsc --noEmit" (should already be correct)
- [ ] T014 [US1] Preview files to be cleaned using `git clean -fdxn apps/web/src/ | grep -E "\.(js|d\.ts|js\.map)"`
- [ ] T015 [US1] Clean existing in-place artifacts from apps/web/src/ using `git clean -fdX apps/web/src/`
- [ ] T016 [US1] Verify no .js files remain in src/ using `find apps/web/src -name "*.js" | wc -l` (expect 0)
- [ ] T017 [US1] Commit configuration changes with message "fix(config): separate TypeScript dev and build configurations" including detailed commit body from quickstart.md

**Checkpoint**: At this point, User Story 1 should be fully functional - Vite serves fresh code, E2E tests see latest changes

---

## Phase 4: User Story 2 - Developer Can Build Project Successfully (Priority: P2)

**Goal**: Ensure production build completes successfully with TypeScript project references working correctly

**Independent Test**: Run `pnpm build` or `nx run-many -t build` and verify all packages build without tsconfig emit errors

### Implementation for User Story 2

- [ ] T018 [US2] Remove existing dist/ directory using `rm -rf apps/web/dist/` to start fresh
- [ ] T019 [US2] Run typecheck command in apps/web using `pnpm typecheck` and verify it completes without creating files
- [ ] T020 [US2] Verify no .js files created in src/ after typecheck using `find apps/web/src -name "*.js" | wc -l` (expect 0)
- [ ] T021 [US2] Verify dist/ is still empty after typecheck using `ls apps/web/dist/ 2>/dev/null` (expect empty or not found)
- [ ] T022 [US2] Run build command in apps/web using `pnpm build` and verify it completes successfully
- [ ] T023 [US2] Verify dist/ contains .js artifacts using `ls apps/web/dist/*.js | head -5` (expect list of files)
- [ ] T024 [US2] Verify dist/ contains .d.ts files using `ls apps/web/dist/*.d.ts | head -5` (expect list of files)
- [ ] T025 [US2] Verify dist/ contains .tsbuildinfo using `ls apps/web/dist/.tsbuildinfo` (expect file exists)
- [ ] T026 [US2] Verify src/ is still clean after build using `find apps/web/src -name "*.js" | wc -l` (expect 0)
- [ ] T027 [US2] Navigate to tools package and run typecheck using `cd tools && pnpm typecheck` to verify project references work
- [ ] T028 [US2] If tools typecheck fails, rebuild apps/web using `cd apps/web && pnpm build` and retry tools typecheck

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - dev server serves fresh code AND production builds succeed

---

## Phase 5: User Story 3 - Developer Works with Clean File Structure (Priority: P3)

**Goal**: Ensure src/ directories contain only source files with no compiled artifacts, verified through git status

**Independent Test**: Search for .js files in src/ directories and verify git status shows no untracked compiled artifacts

### Implementation for User Story 3

- [ ] T029 [US3] Run final verification that no .js files exist in src/ using `find apps/web/src -name "*.js" -o -name "*.d.ts" | wc -l` (expect 0)
- [ ] T030 [US3] Verify git status shows no untracked .js files in src/ using `git status --porcelain | grep "src/.*\.js"` (expect empty)
- [ ] T031 [US3] Test .gitignore pattern validation using `git check-ignore apps/web/src/components/Button.js` (should match) and `git check-ignore apps/web/src/components/Button.test.js` (should not match)
- [ ] T032 [US3] Make a visible change to AddToListModal.tsx by adding a test comment: `echo "// Test change $(date)" >> apps/web/src/components/catalogue/AddToListModal.tsx`
- [ ] T033 [US3] Run E2E tests using `pnpm test:e2e catalogue-entity-management.e2e.test.ts -g "should add entities"` and verify Vite shows "optimized dependencies changed"
- [ ] T034 [US3] Revert test change using `git checkout apps/web/src/components/catalogue/AddToListModal.tsx`
- [ ] T035 [US3] Run final git status check to confirm clean working directory

**Checkpoint**: All user stories should now be independently functional - fresh code in tests, successful builds, clean file structure

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation

- [ ] T036 [P] Run verification checklist from quickstart.md: verify find returns 0 .js files in src/, git status clean, typecheck works, build succeeds, dist/ has artifacts, tools typecheck passes, E2E tests see changes
- [ ] T037 [P] Verify performance benchmarks: typecheck ~2-3s, build ~9-10s (within 10% baseline per SC-001), dev server <2s (per SC-007)
- [ ] T038 [P] Update repository CLAUDE.md if needed to document the two-config pattern (tsconfig.json for dev, tsconfig.build.json for build)
- [ ] T039 Constitution compliance verification:
  - [ ] No `any` types in implementation (Type Safety) ✅ N/A - config only
  - [ ] All tests written before implementation (Test-First) ✅ Verified - existing E2E tests fail, fix makes them pass
  - [ ] Proper Nx workspace structure used (Monorepo Architecture) ✅ Verified - no architectural changes
  - [ ] Storage operations use provider interface (Storage Abstraction) ✅ N/A - no storage
  - [ ] Performance requirements met; memory constraints respected (Performance & Memory) ✅ Verified - SC-001, SC-007 met

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Creates tsconfig.build.json and cleans artifacts
- **User Story 2 (P2)**: Can start after US1 - Requires tsconfig.build.json to exist for build verification
- **User Story 3 (P3)**: Can start after US1 - Requires clean src/ directory for verification

### Within Each User Story

**User Story 1**:
1. T008 → T009, T010 (create and edit tsconfig.build.json)
2. T011 → runs independently (verify dev config)
3. T012, T013 → run independently (update package.json)
4. T014 → T015 (preview then clean artifacts)
5. T016 → depends on T015 (verify clean)
6. T017 → depends on all above (commit)

**User Story 2**:
1. T018 → T019, T020, T021 (clean and typecheck verification)
2. T022 → T023, T024, T025, T026 (build and verify artifacts)
3. T027 → T028 (project reference verification)

**User Story 3**:
1. T029, T030, T031 → run independently in parallel (file system checks)
2. T032 → T033 → T034 (test change workflow)
3. T035 → depends on T034 (final check)

### Parallel Opportunities

- **Phase 1**: All Setup tasks (T001, T002, T003) can run in parallel
- **Phase 2**: T004, T005 must be sequential, but T006 can overlap with T005 after patterns added
- **Phase 3 (US1)**: T009 and T010 can run in parallel after T008; T012 and T013 can run in parallel; T011 runs independently
- **Phase 4 (US2)**: T019, T020, T021 can run in parallel after T018; T023, T024, T025, T026 can run in parallel after T022
- **Phase 5 (US3)**: T029, T030, T031 can all run in parallel
- **Phase 6**: T036, T037, T038 can all run in parallel

---

## Parallel Example: User Story 1 (Configuration Setup)

```bash
# After T008 (create tsconfig.build.json), these can run together:
Task: "Update apps/web/tsconfig.build.json compiler options" (T009)
Task: "Update apps/web/tsconfig.build.json exclude array" (T010)
Task: "Verify apps/web/tsconfig.json has noEmit: true" (T011)

# After base config complete, these can run together:
Task: "Update apps/web/package.json build script" (T012)
Task: "Verify typecheck script in apps/web/package.json" (T013)
```

---

## Parallel Example: User Story 2 (Build Verification)

```bash
# After typecheck (T019), these can run together:
Task: "Verify no .js files after typecheck" (T020)
Task: "Verify dist/ empty after typecheck" (T021)

# After build (T022), these can run together:
Task: "Verify dist/ contains .js files" (T023)
Task: "Verify dist/ contains .d.ts files" (T024)
Task: "Verify dist/ contains .tsbuildinfo" (T025)
Task: "Verify src/ still clean" (T026)
```

---

## Parallel Example: User Story 3 (Clean Structure Verification)

```bash
# All verification checks can run together:
Task: "Verify no .js files in src/" (T029)
Task: "Verify git status clean" (T030)
Task: "Test .gitignore patterns" (T031)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify problem state)
2. Complete Phase 2: Foundational (.gitignore patterns)
3. Complete Phase 3: User Story 1 (fix TypeScript config)
4. **STOP and VALIDATE**: Make a test change, run E2E tests, verify they see fresh code
5. This alone fixes the blocking issue - tests now run against current code

### Incremental Delivery

1. Complete Setup + Foundational → Git ignores in-place artifacts
2. Add User Story 1 → Test independently → **Tests see fresh code! (MVP)**
3. Add User Story 2 → Test independently → Production builds work correctly
4. Add User Story 3 → Test independently → Clean file structure confirmed
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers (though this feature is small enough for one developer):

1. Team completes Setup + Foundational together (~10 minutes)
2. Once Foundational is done:
   - Developer A: User Story 1 (config changes) - **MUST finish first**
   - Developer B: Waits for US1, then does User Story 2 (build verification)
   - Developer C: Waits for US1, then does User Story 3 (structure verification)
3. Stories complete sequentially due to dependencies

**Recommended**: Single developer, sequential execution in priority order (P1 → P2 → P3), estimated 30-45 minutes total

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently testable
- Commit after completing each user story phase
- Stop at any checkpoint to validate story independently
- This is primarily a configuration fix - most tasks are quick edits and verification commands
- Estimated time: 30-45 minutes for complete implementation (per quickstart.md)
- Critical success indicator: E2E tests see code changes immediately after this fix
