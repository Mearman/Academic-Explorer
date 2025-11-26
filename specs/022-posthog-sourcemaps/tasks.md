# Implementation Tasks: PostHog Source Map Upload

**Feature**: 022-posthog-sourcemaps
**Branch**: `022-posthog-sourcemaps`
**Generated**: 2025-11-21
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

This task list implements automated PostHog source map upload for production error tracking in Academic Explorer. Tasks are organized by user story priority (P1 → P2 → P3) to enable independent, incremental implementation and testing.

**Key Deliverables**:
1. **User Story 1 (P1)**: Readable stack traces in production errors
2. **User Story 2 (P2)**: Automated CI/CD source map upload
3. **User Story 3 (P3)**: Source map upload verification in PostHog dashboard

**Implementation Strategy**: MVP-first (US1 manual verification) → Automation (US2 CI/CD) → Observability (US3 verification)

---

## Task Checklist Format

All tasks follow this format:
```
- [ ] [TaskID] [P?] [Story?] Description with file path
```

- **[P]**: Parallelizable task (can run concurrently with other [P] tasks in same phase)
- **[Story]**: User story label ([US1], [US2], [US3]) for phases 3-5 only
- **File paths**: Absolute or relative to repository root

---

## Phase 1: Setup & Prerequisites

**Goal**: Establish branch, verify prerequisites, document initial state

**Duration**: ~10 minutes

### Tasks

- [X] T001 Verify on correct feature branch `022-posthog-sourcemaps`
- [X] T002 [P] Verify PostHog account has project created with EU instance
- [X] T003 [P] Locate existing Vite configuration file at `apps/web/vite.config.ts`
- [X] T004 [P] Locate existing GitHub Actions workflow file at `.github/workflows/ci.yml`
- [X] T005 [P] Verify pnpm and Node.js versions match plan.md requirements (Node 20+, pnpm 10.18.3)
- [X] T006 Run `pnpm build --filter=web` to verify baseline build works without source maps

**Acceptance Criteria**:
- ✅ On correct branch
- ✅ All prerequisite files located
- ✅ Baseline build completes successfully
- ✅ PostHog account accessible

---

## Phase 2: Foundational Configuration

**Goal**: Enable Vite source map generation and verify build output

**Duration**: ~15 minutes

**Why Phase 2**: Source map generation is a prerequisite for ALL user stories. Must complete before any upload/verification tasks.

### Tasks

- [X] T007 Read existing Vite configuration at `apps/web/vite.config.ts`
- [X] T008 Add `sourcemap: true` to `build` section in `apps/web/vite.config.ts` (already enabled)
- [X] T009 Run `pnpm build --filter=web` to generate source maps
- [X] T010 Verify `.map` files exist in `apps/web/dist/assets/` directory
- [X] T011 Verify each `.js` file in `apps/web/dist/assets/` ends with `//# sourceMappingURL=<filename>.map` comment
- [X] T012 Verify source map files contain original package source paths (e.g., `packages/graph/src/types.ts`)
- [X] T013 Run `pnpm typecheck` to ensure Vite config change doesn't break type checking
- [X] T014 Create atomic commit with message `feat(web): enable Vite source map generation for production builds` (no changes needed - already enabled)

**Acceptance Criteria**:
- ✅ Vite config modified with `sourcemap: true`
- ✅ Build generates `.map` files (expected 10-50 files)
- ✅ Each JS bundle has `sourceMappingURL` comment
- ✅ Source maps include monorepo package paths
- ✅ Type checking passes
- ✅ Changes committed atomically

**Parallel Opportunities**: None (sequential build verification required)

---

## Phase 3: User Story 1 - Production Error Debugging with Readable Stack Traces (P1)

**User Story**: When a production error occurs in Academic Explorer, developers need to see the original source code context (file names, line numbers, function names) rather than minified/bundled code references.

**Goal**: Enable PostHog to deobfuscate production errors using source maps

**Duration**: ~30 minutes

**Independent Test**: Trigger an error in production, view it in PostHog dashboard, verify stack traces show original TypeScript file paths instead of minified bundle references.

### Setup: PostHog API Token Creation

- [ ] T015 [US1] Open PostHog dashboard → Settings → Personal API Keys
- [ ] T016 [US1] Create new API key named "GitHub Actions Source Maps" with scopes: `error tracking write` + `organization read`
- [ ] T017 [US1] Copy API token (starts with `phx_`) and store securely for next phase
- [ ] T018 [US1] Copy PostHog project ID (starts with `phc_`) from PostHog → Project Settings → General

### PostHog CLI Local Testing (Manual Verification)

- [ ] T019 [US1] Install PostHog CLI globally: `npm install -g @posthog/cli`
- [ ] T020 [US1] Inject source map metadata: `posthog-cli sourcemap inject --version test-release ./apps/web/dist`
- [ ] T021 [US1] Verify JS bundles in `apps/web/dist/assets/*.js` now contain `//# postHogRelease=test-release` and `//# postHogChunkId=<chunk>` comments
- [ ] T022 [US1] Upload source maps manually: `posthog-cli sourcemap upload --project-id <PROJECT_ID> --api-token <API_TOKEN> --host https://eu.posthog.com ./apps/web/dist`
- [ ] T023 [US1] Verify upload succeeds without errors in terminal output
- [ ] T024 [US1] Open PostHog dashboard → Project Settings → Symbol Sets
- [ ] T025 [US1] Verify Symbol Set for release "test-release" appears with expected file count

### Production Error Testing

- [ ] T026 [US1] Create temporary test error component at `apps/web/src/routes/TestErrorSourceMaps.tsx` with error throw
- [ ] T027 [US1] Add route for test error component in routing configuration
- [ ] T028 [US1] Build with source maps: `pnpm build --filter=web`
- [ ] T029 [US1] Run inject + upload commands manually (same as T020, T022 but with new release version)
- [ ] T030 [US1] Start preview server: `pnpm nx preview web`
- [ ] T031 [US1] Open browser, navigate to test error route, trigger error
- [ ] T032 [US1] Open PostHog dashboard → Errors, find test error
- [ ] T033 [US1] Verify stack trace shows original source file path (e.g., `apps/web/src/routes/TestErrorSourceMaps.tsx:2`) NOT minified reference
- [ ] T034 [US1] Delete test error component and route (cleanup)
- [ ] T035 [US1] Create atomic commit with message `test(web): verify PostHog source map deobfuscation works locally`

**Acceptance Criteria**:
- ✅ PostHog API token created with correct scopes
- ✅ PostHog CLI installed and operational
- ✅ Manual inject + upload workflow successful
- ✅ Symbol Set appears in PostHog dashboard
- ✅ Production error shows readable stack trace with original source paths
- ✅ Test error component cleanup committed

**Success Criteria Met**:
- **SC-001**: Production errors display original source file paths ✅ (verified by T033)
- **SC-004**: Error location identified in <2 minutes ✅ (compared to 15+ minutes with minified code)

**Parallel Opportunities**:
- T015-T018 (PostHog setup) can run in parallel
- T026-T027 (test component creation) can run in parallel with T028 (build)

---

## Phase 4: User Story 2 - Automated Source Map Upload in CI/CD (P2)

**User Story**: The CI/CD pipeline automatically uploads source maps to PostHog after each successful production build, ensuring that newly deployed code has corresponding source maps available for error debugging.

**Goal**: Automate source map upload in GitHub Actions deployment workflow

**Duration**: ~45 minutes

**Independent Test**: Merge code to main branch, observe GitHub Actions workflow, verify source maps appear in PostHog dashboard's symbol sets without manual intervention.

**Dependencies**: Requires Phase 3 (US1) completion - PostHog API token created, manual workflow verified

### GitHub Secrets Configuration

- [ ] T036 [US2] Navigate to GitHub repository → Settings → Secrets and variables → Actions
- [ ] T037 [US2] Create new repository secret `POSTHOG_CLI_ENV_ID` with PostHog project ID from T018
- [ ] T038 [US2] Create new repository secret `POSTHOG_CLI_TOKEN` with API token from T017
- [ ] T039 [US2] Verify secrets are saved and hidden in GitHub UI

### Workflow Integration

- [X] T040 [US2] Read existing GitHub Actions workflow at `.github/workflows/ci.yml`
- [X] T041 [US2] Locate the `deploy` job in workflow (lines 348-401)
- [X] T042 [US2] Identify the "Build application" step (line 381-386) where source maps are generated
- [X] T043 [US2] Add new workflow step "Install PostHog CLI" after "Build application" step: `run: npm install -g @posthog/cli`
- [X] T044 [US2] Add new workflow step "Inject source map metadata": `run: posthog-cli sourcemap inject --version ${{ github.sha }} ./apps/web/dist`
- [X] T045 [US2] Add new workflow step "Upload source maps to PostHog" with full command (see research.md Decision 3 for exact YAML)
- [X] T046 [US2] Ensure new steps are positioned AFTER "Build application" and BEFORE "Upload build artifacts" (line 388)
- [X] T047 [US2] Verify workflow YAML syntax is valid (indentation, formatting)
- [X] T048 [US2] Run `pnpm typecheck` to ensure no breaking changes
- [X] T049 [US2] Create atomic commit with message `ci: add PostHog source map upload to deployment workflow`

### Workflow Testing

- [ ] T050 [US2] Push commit to trigger GitHub Actions workflow
- [ ] T051 [US2] Navigate to GitHub repository → Actions tab → Watch workflow run
- [ ] T052 [US2] Verify "Install PostHog CLI" step succeeds with output `added 1 package`
- [ ] T053 [US2] Verify "Inject source map metadata" step succeeds with output `Injected release metadata into X bundles`
- [ ] T054 [US2] Verify "Upload source maps to PostHog" step succeeds (silent success, exit code 0)
- [ ] T055 [US2] Check workflow does NOT fail if source map upload succeeds
- [ ] T056 [US2] Open PostHog dashboard → Project Settings → Symbol Sets
- [ ] T057 [US2] Verify new Symbol Set appears with git commit SHA matching `${{ github.sha }}` from workflow
- [ ] T058 [US2] Verify file count in Symbol Set matches expected number of source maps (10-50)
- [ ] T059 [US2] Verify deployment completes successfully after source map upload

### Error Handling Testing

- [ ] T060 [US2] Temporarily modify workflow to use invalid PostHog API token (add "INVALID" suffix to secret reference)
- [ ] T061 [US2] Push commit to trigger workflow with invalid token
- [ ] T062 [US2] Verify "Upload source maps to PostHog" step FAILS with authentication error
- [ ] T063 [US2] Verify entire workflow FAILS (deployment does NOT proceed)
- [ ] T064 [US2] Verify GitHub Actions log shows clear error message about authentication
- [ ] T065 [US2] Revert workflow to use correct API token secret
- [ ] T066 [US2] Push commit to verify workflow succeeds again
- [ ] T067 [US2] Create atomic commit with message `ci: verify source map upload error handling prevents deployment`

**Acceptance Criteria**:
- ✅ GitHub Secrets configured correctly
- ✅ Workflow steps added in correct order
- ✅ Workflow YAML syntax valid
- ✅ Workflow succeeds on push to main
- ✅ PostHog Symbol Set created automatically with correct release version
- ✅ Authentication errors fail workflow and block deployment
- ✅ Error handling committed

**Success Criteria Met**:
- **SC-002**: Source map upload completes within 2 minutes ✅ (measured in T052-T054)
- **SC-003**: 100% of deployments upload source maps ✅ (automated in workflow)
- **SC-005**: Symbol Sets show source maps within 5 minutes ✅ (verified by T057)
- **SC-006**: Zero deployments succeed with failed uploads ✅ (verified by T063)

**Parallel Opportunities**:
- T036-T039 (GitHub Secrets) can run in parallel
- T048 (typecheck) can run concurrently with YAML edits if using separate terminal

---

## Phase 5: User Story 3 - Source Map Upload Verification (P3)

**User Story**: Developers can verify that source maps were successfully uploaded for a specific release by checking PostHog's symbol sets page and confirming the presence of the correct release version and uploaded files.

**Goal**: Document verification procedures and create monitoring checklist

**Duration**: ~20 minutes

**Independent Test**: Navigate to PostHog's project settings, view symbol sets, confirm presence of recently deployed release with expected file count.

**Dependencies**: Requires Phase 4 (US2) completion - automated workflow must be operational

### Verification Documentation

- [ ] T068 [US3] Create verification checklist in `specs/022-posthog-sourcemaps/verification-checklist.md`
- [ ] T069 [US3] Document step-by-step PostHog Symbol Sets verification process in checklist
- [ ] T070 [US3] Add screenshot locations for PostHog dashboard navigation (Project Settings → Symbol Sets)
- [ ] T071 [US3] Document expected Symbol Set attributes: release version (git SHA), file count (10-50), upload timestamp
- [ ] T072 [US3] Document how to verify specific source files are included (both apps/web and packages/*)
- [ ] T073 [US3] Document how to identify missing Symbol Sets (gap in release versions)
- [ ] T074 [US3] Add troubleshooting section for common verification issues

### Verification Smoke Test

- [ ] T075 [US3] Trigger a deployment by pushing a commit to main branch
- [ ] T076 [US3] Wait for GitHub Actions workflow to complete (check Actions tab)
- [ ] T077 [US3] Follow verification checklist from T068 to verify Symbol Set
- [ ] T078 [US3] Verify release version in PostHog matches commit SHA from GitHub Actions
- [ ] T079 [US3] Verify file count in Symbol Set is within expected range (10-50)
- [ ] T080 [US3] Verify at least one file from `apps/web/src/` is listed
- [ ] T081 [US3] Verify at least one file from `packages/*/src/` is listed (monorepo coverage)
- [ ] T082 [US3] Verify upload timestamp is within 5 minutes of deployment completion

### Negative Testing (Missing Symbol Set Detection)

- [ ] T083 [US3] Simulate missing Symbol Set by checking PostHog for a non-existent git commit SHA
- [ ] T084 [US3] Verify PostHog dashboard shows clear indication that Symbol Set is absent (empty state or "no data")
- [ ] T085 [US3] Document in verification checklist how to detect and respond to missing Symbol Sets

### Documentation Finalization

- [ ] T086 [US3] Update README.md with link to verification checklist
- [ ] T087 [US3] Update quickstart.md "Next Steps After Implementation" section with reference to verification checklist
- [ ] T088 [US3] Create atomic commit with message `docs(spec-018): add PostHog source map verification checklist`

**Acceptance Criteria**:
- ✅ Verification checklist created with step-by-step instructions
- ✅ Checklist tested against live deployment
- ✅ Symbol Set verification confirmed for actual release
- ✅ Missing Symbol Set detection documented
- ✅ Documentation updated and committed

**Success Criteria Met**:
- **SC-005**: PostHog shows uploaded source maps within 5 minutes ✅ (verified by T082)
- All verification scenarios documented for future reference

**Parallel Opportunities**:
- T068-T074 (documentation creation) can happen in parallel if using separate editors
- T080-T081 (file verification) can be checked simultaneously

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Clean up, validate deployment readiness, update project documentation

**Duration**: ~30 minutes

### Build Time Verification

- [ ] T089 Measure baseline build time WITHOUT source maps (git stash Vite config change, run build, record time)
- [ ] T090 Measure build time WITH source maps (git stash pop, run build, record time)
- [ ] T091 Verify build time increase is less than 2 minutes (per SC-002)
- [ ] T092 Document build time impact in quickstart.md FAQ section

### Security Verification

- [ ] T093 Build production bundle with source map upload: `pnpm build --filter=web`
- [ ] T094 Run manual source map upload with `--delete-after` flag (from T022)
- [ ] T095 Verify `.map` files are DELETED from `apps/web/dist/assets/` after upload
- [ ] T096 Verify `.js` files still contain `//# sourceMappingURL=` comments (but files don't exist)
- [ ] T097 Deploy to test environment and verify `.map` files return 404 errors
- [ ] T098 Document source map security model in quickstart.md "Understanding the Workflow" section

### Deployment Readiness

- [ ] T099 Run full quality pipeline: `pnpm validate` (typecheck + lint + test + build)
- [ ] T100 Verify all packages pass typecheck with zero errors
- [ ] T101 Verify all packages pass lint with zero errors
- [ ] T102 Verify all tests pass with zero failures
- [ ] T103 Verify production build completes successfully
- [ ] T104 Check for any pre-existing deployment blockers in other packages
- [ ] T105 Resolve any deployment blockers found in T104 (or document explicit deferral)

### Documentation Updates

- [ ] T106 [P] Update main README.md with brief description of PostHog source map integration
- [ ] T107 [P] Update CHANGELOG.md with feature addition entry (use semantic-release format)
- [ ] T108 [P] Verify all spec documents are up-to-date (spec.md, plan.md, tasks.md, research.md, data-model.md, contracts/*, quickstart.md)
- [ ] T109 [P] Create final atomic commit with message `docs(spec-018): finalize PostHog source map implementation documentation`

### Final Integration Test

- [ ] T110 Trigger full deployment to production (push to main or merge PR)
- [ ] T111 Monitor GitHub Actions workflow end-to-end
- [ ] T112 Verify all workflow steps succeed: build → inject → upload → deploy
- [ ] T113 Verify Symbol Set appears in PostHog with correct release version
- [ ] T114 Visit production site and trigger a test error (browser console: `throw new Error('Final integration test')`)
- [ ] T115 Open PostHog dashboard → Errors, find integration test error
- [ ] T116 Verify stack trace shows readable source paths (NOT minified)
- [ ] T117 Confirm feature is fully operational per quickstart.md success criteria checklist

**Acceptance Criteria**:
- ✅ Build time impact within acceptable range (<2 minutes increase)
- ✅ Source maps deleted before deployment (security verified)
- ✅ Full quality pipeline passes (pnpm validate)
- ✅ All pre-existing deployment blockers resolved
- ✅ Documentation complete and accurate
- ✅ End-to-end integration test passes
- ✅ Feature operational in production

**Success Criteria Met**:
- **SC-001**: Production errors display original source paths ✅
- **SC-002**: Upload completes within 2 minutes ✅
- **SC-003**: 100% deployment coverage ✅
- **SC-004**: Error identification <2 minutes ✅
- **SC-005**: Symbol Sets visible within 5 minutes ✅
- **SC-006**: Zero deployments succeed with failed uploads ✅

**Parallel Opportunities**:
- T099-T103 (quality gates) run in parallel via Nx
- T106-T108 (documentation) can be edited in parallel

---

## Task Dependencies

### Phase Dependency Graph

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKS all other phases
    ↓
Phase 3 (US1: P1) ← Manual verification
    ↓
Phase 4 (US2: P2) ← Depends on US1 (API token, verified workflow)
    ↓
Phase 5 (US3: P3) ← Depends on US2 (automated workflow operational)
    ↓
Phase 6 (Polish) ← Depends on all user stories complete
```

### User Story Dependencies

- **US1 (P1)**: No dependencies (can start immediately after Phase 2)
- **US2 (P2)**: Depends on US1 (requires API token from T017, verified manual workflow)
- **US3 (P3)**: Depends on US2 (requires automated workflow from Phase 4)

### Critical Path

T001-T006 (Setup) → T007-T014 (Vite config) → T015-T035 (US1 manual verification) → T036-T067 (US2 automation) → T068-T088 (US3 verification) → T089-T117 (Polish)

**Estimated Total Duration**: ~2.5 hours (assuming single developer, sequential execution)

**With Parallelization**: ~2 hours (parallel tasks in Phases 3, 4, 6)

---

## Parallel Execution Examples

### Phase 3 (US1) Parallel Opportunities

**Group 1 - PostHog Setup** (run in parallel):
```bash
# Terminal 1
# T015-T016: Create API token in PostHog dashboard (web browser)

# Terminal 2
# T018: Copy project ID from PostHog dashboard (web browser, different tab)
```

**Group 2 - Test Component + Build** (run in parallel):
```bash
# Terminal 1
# T026-T027: Create test error component and route

# Terminal 2
pnpm build --filter=web  # T028: Build with source maps
```

### Phase 4 (US2) Parallel Opportunities

**Group 1 - GitHub Secrets** (run in parallel):
```bash
# All in web browser, multiple tabs:
# T036: Navigate to Secrets page
# T037: Create POSTHOG_CLI_ENV_ID secret
# T038: Create POSTHOG_CLI_TOKEN secret
# T039: Verify secrets saved
```

### Phase 6 (Polish) Parallel Opportunities

**Group 1 - Quality Gates** (run concurrently via Nx):
```bash
pnpm validate  # T099: Runs typecheck + lint + test + build in parallel
```

**Group 2 - Documentation Updates** (run in parallel):
```bash
# Terminal 1
# T106: Update README.md

# Terminal 2
# T107: Update CHANGELOG.md

# Terminal 3
# T108: Review spec documents
```

---

## MVP Scope

**Minimum Viable Product**: User Story 1 (Phase 3) only

**Rationale**: US1 provides immediate value (readable stack traces) even with manual source map upload. US2 and US3 add automation and observability but are not strictly required for debugging capability.

**MVP Tasks**: T001-T035 (Setup → Vite config → Manual verification)

**MVP Duration**: ~55 minutes

**MVP Success Criteria**:
- Source maps generated during build
- Manual PostHog CLI workflow operational
- Production errors show readable stack traces

---

## Incremental Delivery Strategy

1. **Sprint 1** (MVP): Deliver US1 (P1) - Manual verification, immediate debugging capability
2. **Sprint 2** (Automation): Deliver US2 (P2) - CI/CD automation, eliminate manual steps
3. **Sprint 3** (Observability): Deliver US3 (P3) - Verification procedures, monitoring

**Benefits**:
- Immediate value from readable stack traces (Sprint 1)
- Reduced risk of CI/CD breaking changes (Sprint 2 tested in isolation)
- Comprehensive monitoring added after core functionality stable (Sprint 3)

---

## Task Summary

**Total Tasks**: 117
- **Phase 1** (Setup): 6 tasks
- **Phase 2** (Foundational): 8 tasks
- **Phase 3** (US1 - P1): 21 tasks
- **Phase 4** (US2 - P2): 32 tasks
- **Phase 5** (US3 - P3): 21 tasks
- **Phase 6** (Polish): 29 tasks

**Parallelizable Tasks**: 15 tasks marked with [P]

**User Story Breakdown**:
- **US1 (P1)**: 21 tasks (T015-T035)
- **US2 (P2)**: 32 tasks (T036-T067)
- **US3 (P3)**: 21 tasks (T068-T088)

**Estimated Completion**:
- **Sequential**: ~2.5 hours
- **With Parallelization**: ~2 hours
- **MVP Only**: ~55 minutes

---

## Validation Checklist

**Format Validation**:
- ✅ All tasks follow checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
- ✅ Task IDs are sequential (T001-T117)
- ✅ [P] markers only on parallelizable tasks
- ✅ [Story] labels (US1, US2, US3) present on Phase 3-5 tasks
- ✅ File paths specified for all file-related tasks

**Completeness Validation**:
- ✅ All functional requirements (FR-001 through FR-012) covered
- ✅ All user stories (US1, US2, US3) have complete task coverage
- ✅ All success criteria (SC-001 through SC-006) have verification tasks
- ✅ Independent test criteria defined for each user story phase

**Constitution Compliance**:
- ✅ Atomic commits planned (T014, T035, T049, T067, T088, T109)
- ✅ Deployment readiness verified (T099-T105)
- ✅ Type safety checked (T013, T048)
- ✅ No test-first tasks (per Constitution Check in plan.md - verification testing only)

---

## Next Steps

1. **Start Implementation**: Begin with Phase 1 (T001-T006)
2. **Track Progress**: Mark tasks complete as you go
3. **Commit Frequently**: Follow atomic commit strategy (T014, T035, T049, T067, T088, T109)
4. **Test Incrementally**: Verify each phase's acceptance criteria before proceeding
5. **Monitor Quality Gates**: Run `pnpm validate` regularly (especially before commits)

**Ready to implement**: All tasks are specific, testable, and executable without additional context.
