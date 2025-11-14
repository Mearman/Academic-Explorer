# Tasks: OpenAlex Walden Support (Data Version 2)

**Input**: Design documents from `/specs/013-walden-research/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: E2E tests are included per user story acceptance scenarios

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is an Nx monorepo with packages at repository root:
- **Packages**: `packages/types/`, `packages/client/`, `packages/utils/`, `packages/ui/`
- **Web App**: `apps/web/src/`
- **Tests**: Co-located with source (`.unit.test.ts`, `.component.test.tsx`, `.integration.test.ts`, `.e2e.test.ts`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create feature branch 013-walden-research from main
- [X] T002 Verify pnpm dependencies are installed and up to date
- [X] T003 [P] Run typecheck to establish baseline (pnpm typecheck)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core type definitions and schema extensions that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Add `is_xpac: boolean` field to Work interface in packages/types/src/work.ts
- [X] T005 [P] Add `includeXpac: boolean` field to SettingsState interface in packages/utils/src/storage/settings-types.ts (default: true)
- [X] T006 [P] Add `dataVersion: '1' | '2' | undefined` field to SettingsState interface in packages/utils/src/storage/settings-types.ts (default: undefined)
- [X] T007 [P] Create DataVersion type definition in packages/client/src/types/ as `type DataVersion = '1' | '2' | undefined`
- [X] T008 [P] Add OpenAlexQueryParams interface in packages/client/src/types/ with optional `data-version` and `include_xpac` fields
- [X] T009 Run typecheck to verify foundational changes (pnpm typecheck)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Access Latest OpenAlex Data Quality Improvements (Priority: P1) 🎯 MVP

**Goal**: Automatically deliver Data Version 2 metadata improvements to all users without configuration

**Independent Test**: Query works via Academic Explorer and verify responses include improved metadata (14% more references/locations, better language detection)

### Implementation for User Story 1

- [X] T010 [P] [US1] Modify client request builder in packages/client/src/client.ts to omit `data-version` parameter by default (sends v2)
- [X] T011 [P] [US1] Add Work schema field mappings for enhanced v2 metadata in packages/types/src/work.ts (referenced_works, locations, language, open_access, topics, keywords, license)
- [X] T012 [P] [US1] Create Badge component in packages/ui/src/atoms/Badge.tsx for metadata improvement indicators (using Mantine Badge)
- [X] T013 [US1] Add metadata improvement detection logic in packages/utils/src/ to identify works with increased references/locations
- [X] T014 [US1] Integrate Badge component into work detail pages in apps/web/src/components/ to display "New: X more references" indicators
- [X] T015 [US1] Add visual styling for improved metadata badges using Vanilla Extract CSS in apps/web/src/

### E2E Tests for User Story 1

- [X] T016 [P] [US1] E2E test: Verify default v2 data quality in apps/web/e2e/walden-v2-default.e2e.test.ts
- [X] T017 [P] [US1] E2E test: Verify metadata improvement badges display in apps/web/e2e/metadata-badges.e2e.test.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - all searches automatically use Data Version 2 with improved metadata

---

## Phase 4: User Story 2 - Explore Extended Research Outputs (xpac) (Priority: P2)

**Goal**: Include 190M xpac works by default with user control to filter them out

**Independent Test**: Verify searches include xpac works by default, and toggle in settings enables/disables them

### Implementation for User Story 2

- [ ] T018 [P] [US2] Extend settings store in apps/web/src/stores/settings-store.ts to add includeXpac field (default: true)
- [ ] T019 [P] [US2] Modify client request builder in packages/client/src/client.ts to send `include_xpac=true` when settings.includeXpac is true
- [ ] T020 [P] [US2] Create XpacToggle component in packages/ui/src/molecules/XpacToggle.tsx (Mantine Switch component)
- [ ] T021 [US2] Integrate XpacToggle into SettingsSection in apps/web/src/components/sections/SettingsSection.tsx
- [ ] T022 [US2] Add work type display logic in apps/web/src/components/ to show non-traditional types (dataset, software, specimen)
- [ ] T023 [US2] Add author name-string indicator logic in apps/web/src/components/ to flag unverified authors (when Author ID is missing)
- [ ] T024 [US2] Extend GraphNode metadata in packages/graph/src/ to include isXpac and hasUnverifiedAuthor flags
- [ ] T025 [US2] Add xpac work styling functions in apps/web/src/components/graph/ for visual distinction (dashed borders, muted colors)
- [ ] T026 [US2] Apply conditional node styling in graph renderer based on xpac metadata flags

### E2E Tests for User Story 2

- [ ] T027 [P] [US2] E2E test: Verify xpac works included by default in apps/web/e2e/xpac-default-enabled.e2e.test.ts
- [ ] T028 [P] [US2] E2E test: Verify xpac toggle disables xpac works in apps/web/e2e/xpac-toggle.e2e.test.ts
- [ ] T029 [P] [US2] E2E test: Verify work type display for non-traditional outputs in apps/web/e2e/work-type-display.e2e.test.ts
- [ ] T030 [P] [US2] E2E test: Verify author name-string indicators in apps/web/e2e/author-verification.e2e.test.ts
- [ ] T031 [P] [US2] E2E test: Verify xpac visual distinction in graphs in apps/web/e2e/graph-xpac-styling.e2e.test.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - xpac works are included by default with visual distinction

---

## Phase 5: User Story 3 - Compare Data Versions for Migration (Priority: P3)

**Goal**: Temporary v1 access during November 2025 transition period for validation

**Independent Test**: Data version selector switches between v1 and v2, and is automatically removed after November 2025

### Implementation for User Story 3

- [ ] T032 [P] [US3] Extend settings store in apps/web/src/stores/settings-store.ts to add dataVersion field (default: undefined)
- [ ] T033 [P] [US3] Modify client request builder in packages/client/src/client.ts to send `data-version=1` param when settings.dataVersion is '1'
- [ ] T034 [P] [US3] Create DataVersionSelector component in packages/ui/src/molecules/DataVersionSelector.tsx (Mantine Select component)
- [ ] T035 [US3] Add date-based visibility logic in packages/utils/src/ to determine if v1 access should be shown (before December 1, 2025)
- [ ] T036 [US3] Integrate DataVersionSelector into SettingsSection in apps/web/src/components/sections/SettingsSection.tsx with conditional rendering
- [ ] T037 [US3] Add metadata comparison display logic in apps/web/src/components/ to highlight v1/v2 differences when switching versions
- [ ] T038 [US3] Add visual indicators for version-specific improvements (e.g., "New in v2: 5 more references")

### E2E Tests for User Story 3

- [ ] T039 [P] [US3] E2E test: Verify data version selector available in November in apps/web/e2e/version-selector-november.e2e.test.ts
- [ ] T040 [P] [US3] E2E test: Verify data version selector hidden after November in apps/web/e2e/version-selector-removed.e2e.test.ts
- [ ] T041 [P] [US3] E2E test: Verify v1 parameter sent when v1 selected in apps/web/e2e/version-v1-parameter.e2e.test.ts
- [ ] T042 [P] [US3] E2E test: Verify metadata differences highlighted between versions in apps/web/e2e/version-comparison.e2e.test.ts

**Checkpoint**: All user stories should now be independently functional - users can compare v1/v2 during transition

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T043 [P] Update quickstart.md in specs/013-walden-research/ with final implementation notes
- [ ] T044 [P] Update CLAUDE.md with Walden feature context (data-version, include_xpac parameters)
- [ ] T045 Code review and refactoring for consistency across all user stories
- [ ] T046 Performance validation: Verify graph rendering under 5 seconds with xpac enabled (Success Criteria SC-007)
- [ ] T047 Accessibility audit: Verify metadata badges and xpac indicators meet WCAG standards
- [ ] T048 Run full quality pipeline: pnpm validate (typecheck + lint + test + build)
- [ ] T049 Constitution compliance verification:
  - [ ] No `any` types in implementation (Type Safety)
  - [ ] All E2E tests written and passing (Test-First)
  - [ ] Proper Nx workspace structure used (Monorepo Architecture)
  - [ ] Settings use storage provider interface (Storage Abstraction)
  - [ ] Performance requirements met; serial test execution maintained (Performance & Memory)
  - [ ] Atomic conventional commits created after each phase (Atomic Conventional Commits)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent of US1, but integrates with graph from US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent of US1/US2, but compares their metadata

### Within Each User Story

- Implementation tasks before E2E tests (tests verify implementation)
- Type definitions before client logic
- Client logic before UI components
- UI components before E2E tests
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: All setup tasks marked [P] can run in parallel
- **Phase 2**: All foundational tasks (T004-T008) can run in parallel - different files, no dependencies
- **Phase 3 (US1)**: T010, T011, T012 can run in parallel - different packages
- **Phase 3 (US1) E2E**: T016, T017 can run in parallel - different test scenarios
- **Phase 4 (US2)**: T018, T019, T020 can run in parallel - different packages
- **Phase 4 (US2) E2E**: T027-T031 can run in parallel - different test scenarios
- **Phase 5 (US3)**: T032, T033, T034 can run in parallel - different packages
- **Phase 5 (US3) E2E**: T039-T042 can run in parallel - different test scenarios
- **Phase 6**: T043, T044 can run in parallel - different documentation files
- **Cross-Story**: Once Foundational complete, all user stories (Phases 3-5) can be worked in parallel by different team members

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch all foundational type definitions together:
Task: "Add is_xpac field to Work interface in packages/types/src/work.ts"
Task: "Add includeXpac field to SettingsState in packages/utils/src/storage/settings-types.ts"
Task: "Add dataVersion field to SettingsState in packages/utils/src/storage/settings-types.ts"
Task: "Create DataVersion type in packages/client/src/types/"
Task: "Add OpenAlexQueryParams interface in packages/client/src/types/"
```

## Parallel Example: User Story 1 (P1)

```bash
# Launch initial US1 implementation tasks together:
Task: "Modify client to omit data-version parameter in packages/client/src/client.ts"
Task: "Add Work schema v2 field mappings in packages/types/src/work.ts"
Task: "Create Badge component in packages/ui/src/atoms/Badge.tsx"

# Launch US1 E2E tests together:
Task: "E2E test: Verify default v2 data quality in apps/web/e2e/walden-v2-default.e2e.test.ts"
Task: "E2E test: Verify metadata badges in apps/web/e2e/metadata-badges.e2e.test.ts"
```

## Parallel Example: Cross-Story Execution

```bash
# After Phase 2 completes, launch all user stories in parallel with different developers:
Developer A: Phase 3 (User Story 1) - Data quality improvements
Developer B: Phase 4 (User Story 2) - xpac works
Developer C: Phase 5 (User Story 3) - Version comparison
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (T010-T017)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo with improved Data Version 2 metadata only

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP with v2 improvements!)
3. Add User Story 2 → Test independently → Deploy/Demo (MVP + xpac works!)
4. Add User Story 3 → Test independently → Deploy/Demo (Complete feature with v1 comparison!)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T009)
2. Once Foundational is done:
   - Developer A: User Story 1 (T010-T017)
   - Developer B: User Story 2 (T018-T031)
   - Developer C: User Story 3 (T032-T042)
3. Stories complete and integrate independently
4. Team completes Phase 6 (Polish) together

---

## Task Summary

- **Total Tasks**: 49
- **Setup**: 3 tasks
- **Foundational**: 6 tasks (BLOCKS all stories)
- **User Story 1 (P1)**: 8 tasks (6 implementation + 2 E2E)
- **User Story 2 (P2)**: 14 tasks (9 implementation + 5 E2E)
- **User Story 3 (P3)**: 11 tasks (7 implementation + 4 E2E)
- **Polish**: 7 tasks
- **Parallel Opportunities**: 32 tasks can run in parallel within phases
- **E2E Tests**: 11 E2E tests across all user stories

---

## Notes

- [P] tasks = different files/packages, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Run pnpm typecheck after each phase to catch type errors early
- Run pnpm test after implementation tasks before E2E tests
- Commit after each phase or logical group using conventional commit format
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Remember: Tests run serially in this project (memory constraints)
