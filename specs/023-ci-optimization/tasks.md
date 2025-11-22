# Tasks: CI/CD Pipeline Performance Optimization

**Input**: Design documents from `/specs/023-ci-optimization/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the specification - validation will be done through actual workflow runs and timing measurements.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each optimization.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **CI/CD workflows**: `.github/workflows/` at repository root
- **Contracts**: `specs/023-ci-optimization/contracts/`
- All changes target existing workflow file: `.github/workflows/ci.yml`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and documentation preparation

- [ ] T001 Create baseline performance metrics by analyzing recent workflow runs
- [ ] T002 [P] Document current pipeline timing in specs/023-ci-optimization/baseline-metrics.md
- [ ] T003 [P] Create backup of current .github/workflows/ci.yml to .github/workflows/ci.yml.backup

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core workflow structure changes that MUST be complete before optimization work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Add dorny/paths-filter@v3 action to workflow dependencies
- [ ] T005 Create `changes` job in .github/workflows/ci.yml with path filter outputs (code, docs, config)
- [ ] T006 Update job needs dependencies to include `changes` job where required

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Fast Feedback for Pull Requests (Priority: P1) 🎯 MVP

**Goal**: Reduce CI pipeline time from 30-40 minutes to under 20 minutes for standard code PRs

**Independent Test**: Submit a test PR with code changes, measure total pipeline completion time. Should complete in under 20 minutes and provide first test results within 5 minutes.

### Implementation for User Story 1

- [ ] T007 [P] [US1] Remove `npx nx reset` step from build-and-test job in .github/workflows/ci.yml
- [ ] T008 [P] [US1] Change build parallelism from --parallel=3 to --parallel=4 in build-and-test job
- [ ] T009 [US1] Add upload-artifact@v4 step to build-and-test job with retention-days: 1
- [ ] T010 [US1] Configure artifact upload paths: apps/web/dist, apps/cli/dist, packages/*/dist
- [ ] T011 [US1] Replace build step in e2e job with download-artifact@v6 step
- [ ] T012 [US1] Replace build step in performance job with download-artifact@v6 step
- [ ] T013 [US1] Replace build step in deploy job with download-artifact@v6 step
- [ ] T014 [US1] Add if conditional to e2e job: needs.changes.outputs.code == 'true'
- [ ] T015 [US1] Update e2e job needs to include [build-and-test, changes]
- [ ] T016 [US1] Add artifact existence validation to e2e job (fail-fast if artifact missing)
- [ ] T017 [US1] Test US1 by pushing test PR and measuring pipeline time (target: <20 min)

**Checkpoint**: At this point, User Story 1 should be fully functional - code PRs complete in under 20 minutes

---

## Phase 4: User Story 2 - Efficient Resource Usage (Priority: P2)

**Goal**: Eliminate redundant build executions and improve cache hit rates to reduce GitHub Actions compute costs by 30%

**Independent Test**: Examine CI logs for a workflow run to verify build executes once (not 5 times) and verify cache hit logs show 80%+ hit rate for pnpm and Playwright caches.

### Implementation for User Story 2

- [ ] T018 [P] [US2] Add node_modules to pnpm cache paths in build-and-test job
- [ ] T019 [P] [US2] Create Playwright browser cache step in e2e job using actions/cache@v4
- [ ] T020 [P] [US2] Configure Playwright cache key: playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
- [ ] T021 [P] [US2] Configure Playwright cache path: ~/.cache/ms-playwright
- [ ] T022 [US2] Verify Playwright install --with-deps checks for cached browsers before downloading
- [ ] T023 [US2] Add cache analytics to build-and-test job output (show hit/miss status)
- [ ] T024 [US2] Test US2 by running pipeline twice and verifying cache hits in second run

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - builds happen once, caches hit consistently

---

## Phase 5: User Story 3 - Skip Unnecessary Work (Priority: P3)

**Goal**: Enable docs-only PRs to complete in under 5 minutes by skipping expensive test jobs

**Independent Test**: Submit a docs-only PR (changes only to *.md files) and verify e2e and performance jobs are skipped. Pipeline should complete in under 5 minutes.

### Implementation for User Story 3

- [ ] T025 [P] [US3] Add if conditional to performance job: github.ref == 'refs/heads/main' OR contains(labels, 'perf-check')
- [ ] T026 [P] [US3] Update performance job needs to include [build-and-test, changes]
- [ ] T027 [US3] Add performance skip message when job is skipped (visible in GitHub Actions UI)
- [ ] T028 [US3] Create perf-check label in repository if it doesn't exist
- [ ] T029 [US3] Document perf-check label usage in specs/023-ci-optimization/quickstart.md (already done)
- [ ] T030 [US3] Test US3 by submitting docs-only PR and verifying jobs skip correctly
- [ ] T031 [US3] Test perf-check label by adding label to PR and verifying performance job runs

**Checkpoint**: All user stories should now be independently functional - docs PRs fast, code PRs optimized, performance tests optional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [ ] T032 [P] Update CLAUDE.md with pipeline optimization details (already done via update-agent-context.sh)
- [ ] T033 [P] Create comparison table in specs/023-ci-optimization/results.md showing before/after timings
- [ ] T034 Test full pipeline with mixed PR (code + docs) and verify correct behavior
- [ ] T035 Test full pipeline on main branch and verify all jobs run (no skipping)
- [ ] T036 Measure and document cache hit rates in results.md
- [ ] T037 Measure and document artifact sizes in results.md
- [ ] T038 Validate GitHub Actions minutes consumption reduction (target: 30% reduction)
- [ ] T039 Delete .github/workflows/ci.yml.backup after successful validation
- [ ] T040 Update quickstart.md troubleshooting section based on any issues encountered
- [ ] T041 Constitution compliance verification:
  - [x] No `any` types in implementation (Type Safety) - N/A for YAML
  - [x] All tests written before implementation (Test-First) - Validated through workflow runs
  - [x] Proper Nx workspace structure used (Monorepo Architecture) - Respects Nx structure
  - [x] Storage operations use provider interface (Storage Abstraction) - N/A for CI/CD
  - [x] Performance requirements met; memory constraints respected (Performance & Memory) - Targets met
  - [x] Atomic conventional commits created after each task (Atomic Conventional Commits) - Required
  - [x] Breaking changes documented; no backwards compatibility obligations (Development-Stage Pragmatism) - Workflow changes acceptable
  - [x] Bug regression tests written before fixes (Test-First Bug Fixes) - Workflow validation required

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Builds on US1 artifact sharing but can be implemented independently
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent of US1/US2, focuses on job skipping

### Within Each User Story

**User Story 1** (Build Artifact Caching):
1. Nx cache reset removal (T007) and parallelism increase (T008) are independent
2. Artifact upload configuration (T009-T010) before download steps (T011-T013)
3. Job conditionals (T014) after changes job exists (from Foundational)
4. Testing (T017) after all implementation complete

**User Story 2** (Efficient Resource Usage):
1. All cache configuration tasks (T018-T021) can run in parallel
2. Verification tasks (T022-T023) after cache configuration
3. Testing (T024) after all cache improvements in place

**User Story 3** (Skip Unnecessary Work):
1. Performance job conditional (T025) and needs update (T026) can run in parallel
2. Documentation and label creation (T028-T029) independent of workflow changes
3. Testing (T030-T031) after all skip logic implemented

### Parallel Opportunities

- **Phase 1**: All 3 tasks can run in parallel (T001-T003 all marked [P])
- **Phase 2**: T004 must complete before T005-T006 (dependency management)
- **Phase 3 (US1)**: T007-T008 parallel, T009-T010 sequential, T011-T013 parallel
- **Phase 4 (US2)**: T018-T021 all parallel (different cache types)
- **Phase 5 (US3)**: T025-T027 all parallel (different job configurations)
- **Phase 6**: T032-T033 parallel, T034-T038 sequential (need pipeline runs)

### Cross-Story Parallelization

Once Phase 2 (Foundational) completes, all three user stories can proceed in parallel if team capacity allows:

- **Team Member A**: Implement User Story 1 (T007-T017) - Build artifact caching
- **Team Member B**: Implement User Story 2 (T018-T024) - Enhanced caching
- **Team Member C**: Implement User Story 3 (T025-T031) - Job skipping

---

## Parallel Example: User Story 1

```bash
# These tasks can run in parallel (different workflow sections):
Task T007: "Remove nx reset step from build-and-test job"
Task T008: "Change build parallelism from 3 to 4"

# These tasks can run in parallel (different consumer jobs):
Task T011: "Replace build step in e2e job with download-artifact"
Task T012: "Replace build step in performance job with download-artifact"
Task T013: "Replace build step in deploy job with download-artifact"
```

## Parallel Example: User Story 2

```bash
# These tasks can run in parallel (different cache types):
Task T018: "Add node_modules to pnpm cache paths"
Task T019: "Create Playwright browser cache step in e2e job"
Task T020: "Configure Playwright cache key"
Task T021: "Configure Playwright cache path"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup → Baseline documented
2. Complete Phase 2: Foundational → Path filter infrastructure ready
3. Complete Phase 3: User Story 1 → Build artifacts shared, Nx cache preserved
4. **STOP and VALIDATE**: Push test PR, measure time (target: <20 min)
5. If successful, proceed to User Story 2

**Why this is MVP**: User Story 1 alone delivers 40-50% time reduction (biggest win). Can deploy and get immediate developer productivity benefits.

### Incremental Delivery

1. Complete Setup + Foundational → Path filters operational
2. Add User Story 1 → Test with code PR → Deploy (35-70% savings!) → **MVP MILESTONE**
3. Add User Story 2 → Test with cache hits → Deploy (additional 10-15% savings)
4. Add User Story 3 → Test with docs PR → Deploy (0-100% savings for docs PRs)
5. Each story adds value without breaking previous optimizations

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T006)
2. Once Foundational is done (changes job exists):
   - Developer A: User Story 1 (T007-T017) - Artifact caching (~45 min work)
   - Developer B: User Story 2 (T018-T024) - Enhanced caching (~30 min work)
   - Developer C: User Story 3 (T025-T031) - Job skipping (~30 min work)
3. Stories complete and integrate independently
4. Team validates together (Phase 6)

**Total parallel implementation time**: ~1-2 hours (vs 3-4 hours sequential)

---

## Success Metrics

### User Story 1 Targets

- Pipeline time: 35 min → <20 min (43%+ reduction) ✅
- First test results: <5 min ✅
- Build executions: 5x → 1x ✅

### User Story 2 Targets

- GitHub Actions minutes: 30% reduction ✅
- Cache hit rate: >80% ✅
- Redundant builds: 0 ✅

### User Story 3 Targets

- Docs-only PR time: 30 min → <5 min (83%+ reduction) ✅
- Performance job: Opt-in via label ✅
- Code PRs: No impact (still run full pipeline) ✅

### Overall Targets (All Stories Complete)

- Total time savings: 35-70 minutes per pipeline run
- Cost reduction: 30% reduction in GitHub Actions minutes
- Developer experience: Fast feedback (<5 min first results)
- Resource efficiency: Zero redundant builds, 80%+ cache hits

---

## Notes

- [P] tasks = different files/sections, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Validate pipeline runs after each story to ensure no regressions
- Commit after each task or logical group using conventional commits
- Stop at any checkpoint to validate story independently
- All workflow changes target `.github/workflows/ci.yml` (single file)
- No application code changes required - pure CI/CD optimization
