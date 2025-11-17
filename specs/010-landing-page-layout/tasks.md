# Tasks: Landing Page Layout Improvements

**Input**: Design documents from `/specs/010-landing-page-layout/`
**Prerequisites**: plan.md, spec.md, quickstart.md

**Tests**: Following Test-First Development principle from constitution - E2E tests will be enhanced BEFORE layout implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: No setup needed - modifying existing landing page component

This phase is skipped as we're working with an existing component (`apps/web/src/routes/index.lazy.tsx`) that already has all necessary dependencies (React 19, Mantine 7.x, TypeScript 5.x).

---

## Phase 2: Foundational

**Purpose**: No foundational prerequisites needed

This phase is skipped as:
- No new infrastructure required
- No shared models/services needed
- No authentication/authorization changes
- Component already exists with all hooks and dependencies

**Checkpoint**: Ready to proceed directly to user story implementation

---

## Phase 3: User Story 1 - First-Time Visitor Landing Experience (Priority: P1) 🎯 MVP

**Goal**: Ensure all homepage content is visible, readable, and properly positioned with responsive layout that works across all viewport sizes (320px to 3840px)

**Independent Test**: Load homepage at various viewport sizes (320px, 768px, 1024px, 1920px, 3840px) and verify no horizontal scrolling, content is centered, and all sections are properly spaced

### E2E Tests for User Story 1 (Test-First - Red Phase)

> **CRITICAL**: Write these tests FIRST, ensure they FAIL before implementation

- [x] T001 [P] [US1] Add E2E test for mobile viewport (320px) - verify no horizontal scroll in apps/web/src/test/e2e/manual/homepage.e2e.test.ts
- [x] T002 [P] [US1] Add E2E test for tablet viewport (768px) - verify card centering in apps/web/src/test/e2e/manual/homepage.e2e.test.ts
- [x] T003 [P] [US1] Add E2E test for desktop viewport (1920px) - verify maxWidth constraint in apps/web/src/test/e2e/manual/homepage.e2e.test.ts
- [x] T004 [P] [US1] Add E2E test for 4K viewport (3840px) - verify content remains centered in apps/web/src/test/e2e/manual/homepage.e2e.test.ts
- [x] T005 [US1] Run homepage E2E tests - verify they FAIL (layout issues exist)

### Implementation for User Story 1 (Green Phase)

- [x] T006 [US1] Adjust Card maxWidth for better mobile responsiveness in apps/web/src/routes/index.lazy.tsx
- [x] T007 [US1] Implement responsive padding using Mantine breakpoints in apps/web/src/routes/index.lazy.tsx
- [x] T008 [US1] Refine Stack gap between title and description sections in apps/web/src/routes/index.lazy.tsx
- [x] T009 [US1] Ensure proper vertical spacing for all content sections in apps/web/src/routes/index.lazy.tsx
- [x] T010 [US1] Verify layout manually in Chrome DevTools at all breakpoints

### Verification for User Story 1

- [x] T011 [US1] Run homepage E2E tests - verify they PASS
- [x] T012 [US1] Check for horizontal scrolling at 320px viewport
- [x] T013 [US1] Verify content centering at 3840px viewport
- [x] T014 [US1] Run `pnpm typecheck` - ensure no type errors
- [x] T015 [US1] Create atomic commit: test(homepage): add responsive layout E2E tests
- [x] T016 [US1] Create atomic commit: fix(web): improve landing page responsive layout

**Checkpoint**: User Story 1 complete - homepage layout is responsive across all viewport sizes

---

## Phase 4: User Story 2 - Search Interaction (Priority: P2)

**Goal**: Search form components (input and button) are properly positioned, sized, and aligned with adequate spacing for easy interaction

**Independent Test**: Interact with search input and button, verify proper spacing, alignment, and that touch targets meet 44x44px minimum

### E2E Tests for User Story 2 (Test-First - Red Phase)

> **CRITICAL**: Write these tests FIRST, ensure they FAIL before implementation

- [ ] T017 [P] [US2] Add E2E test for search input touch target size (≥44px height) in apps/web/src/test/e2e/manual/homepage.e2e.test.ts
- [ ] T018 [P] [US2] Add E2E test for search button touch target size (≥44x44px) in apps/web/src/test/e2e/manual/homepage.e2e.test.ts
- [ ] T019 [P] [US2] Add E2E test for search form spacing and alignment in apps/web/src/test/e2e/manual/homepage.e2e.test.ts
- [ ] T020 [P] [US2] Add E2E test for example links spacing and wrapping in apps/web/src/test/e2e/manual/homepage.e2e.test.ts
- [ ] T021 [US2] Run search interaction E2E tests - verify they FAIL

### Implementation for User Story 2 (Green Phase)

- [ ] T022 [US2] Ensure search input meets 44px minimum height in apps/web/src/routes/index.lazy.tsx
- [ ] T023 [US2] Ensure search button meets 44x44px minimum size in apps/web/src/routes/index.lazy.tsx
- [ ] T024 [US2] Adjust spacing between search input and button in apps/web/src/routes/index.lazy.tsx
- [ ] T025 [US2] Refine spacing for example searches section in apps/web/src/routes/index.lazy.tsx
- [ ] T026 [US2] Ensure example links wrap gracefully on narrow screens in apps/web/src/routes/index.lazy.tsx

### Verification for User Story 2

- [ ] T027 [US2] Run search interaction E2E tests - verify they PASS
- [ ] T028 [US2] Manually test touch targets on mobile device or DevTools touch emulation
- [ ] T029 [US2] Verify search form alignment across all breakpoints
- [ ] T030 [US2] Run `pnpm typecheck` - ensure no type errors
- [ ] T031 [US2] Create atomic commit: test(homepage): add search interaction touch target tests
- [ ] T032 [US2] Create atomic commit: fix(ui): improve search form sizing and spacing

**Checkpoint**: User Stories 1 AND 2 complete - homepage is responsive AND search controls are properly sized

---

## Phase 5: User Story 3 - Visual Hierarchy and Readability (Priority: P3)

**Goal**: Supporting information (technology stack, usage instructions) has clear visual hierarchy with proper spacing and alignment, accommodates larger text sizes

**Independent Test**: Visually inspect homepage to verify spacing creates clear hierarchy, test at 150% and 200% zoom levels

### E2E Tests for User Story 3 (Test-First - Red Phase)

> **CRITICAL**: Write these tests FIRST, ensure they FAIL before implementation

- [ ] T033 [P] [US3] Add E2E test for technology stack alignment and spacing in apps/web/src/test/e2e/manual/homepage.e2e.test.ts
- [ ] T034 [P] [US3] Add E2E test for feature badges wrapping behavior in apps/web/src/test/e2e/manual/homepage.e2e.test.ts
- [ ] T035 [P] [US3] Add E2E test for 150% zoom readability in apps/web/src/test/e2e/manual/homepage.e2e.test.ts
- [ ] T036 [P] [US3] Add E2E test for 200% zoom layout integrity in apps/web/src/test/e2e/manual/homepage.e2e.test.ts
- [ ] T037 [US3] Run visual hierarchy E2E tests - verify they FAIL

### Implementation for User Story 3 (Green Phase)

- [ ] T038 [US3] Ensure technology stack indicators have equal spacing in apps/web/src/routes/index.lazy.tsx
- [ ] T039 [US3] Improve Group wrapping for feature badges in apps/web/src/routes/index.lazy.tsx
- [ ] T040 [US3] Adjust line-height for usage instructions text in apps/web/src/routes/index.lazy.tsx
- [ ] T041 [US3] Verify consistent vertical rhythm using Mantine spacing scale in apps/web/src/routes/index.lazy.tsx
- [ ] T042 [US3] Test layout at 200% zoom in browser DevTools

### Verification for User Story 3

- [ ] T043 [US3] Run visual hierarchy E2E tests - verify they PASS
- [ ] T044 [US3] Verify no text overflow at 200% zoom
- [ ] T045 [US3] Verify feature badges wrap properly on narrow screens
- [ ] T046 [US3] Run `pnpm typecheck` - ensure no type errors
- [ ] T047 [US3] Create atomic commit: test(homepage): add visual hierarchy and zoom tests
- [ ] T048 [US3] Create atomic commit: fix(ui): improve visual hierarchy and zoom support

**Checkpoint**: All user stories complete - homepage has responsive layout, proper touch targets, and clear visual hierarchy

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final quality gates and cross-story improvements

- [ ] T049 [P] Run full E2E test suite for homepage 10 times - verify 100% pass rate (SC-005)
- [ ] T050 [P] Run Lighthouse audit - verify accessibility score ≥95
- [ ] T051 [P] Verify homepage load time <2 seconds in production build
- [ ] T052 Verify all edge cases from spec:
  - [ ] Viewport under 400px (extreme mobile)
  - [ ] Viewport at 3840px (4K monitors)
  - [ ] Custom browser zoom levels (150%, 200%)
  - [ ] Very long search queries
  - [ ] Increased browser default font sizes
- [ ] T053 Constitution compliance verification:
  - [ ] No `any` types in implementation (Type Safety)
  - [ ] All tests written before implementation (Test-First) ✅
  - [ ] Proper Nx workspace structure used (Monorepo Architecture)
  - [ ] No storage operations (Storage Abstraction - N/A)
  - [ ] Performance requirements met (Performance & Memory)
  - [ ] Atomic conventional commits created (Atomic Conventional Commits) ✅
- [ ] T054 Run full quality pipeline: `pnpm validate`
- [ ] T055 Review quickstart.md verification checklist - ensure all items complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: SKIPPED - no setup needed
- **Foundational (Phase 2)**: SKIPPED - no prerequisites
- **User Story 1 (Phase 3)**: Can start immediately - No dependencies
- **User Story 2 (Phase 4)**: Can start after US1 OR in parallel (independent)
- **User Story 3 (Phase 5)**: Can start after US1 OR in parallel (independent)
- **Polish (Phase 6)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: NO dependencies - completely independent
- **User Story 2 (P2)**: NO dependencies on US1 - can run in parallel
- **User Story 3 (P3)**: NO dependencies on US1/US2 - can run in parallel

**All three user stories are independently testable and can be implemented in parallel by different developers!**

### Within Each User Story

- E2E tests (T001-T005, T017-T021, T033-T037) - Must be written FIRST
- Verify tests FAIL (T005, T021, T037) - Before any implementation
- Implementation tasks - After tests fail
- Verification tasks - After implementation
- Atomic commits - After verification passes

### Parallel Opportunities

**Maximum parallelization** - All user stories can run simultaneously:

```bash
# Developer A implements User Story 1:
# T001-T016 (responsive layout)

# Developer B implements User Story 2:
# T017-T032 (search interaction)

# Developer C implements User Story 3:
# T033-T048 (visual hierarchy)

# All work independently, merge when complete
```

Within each user story, test tasks marked [P] can run in parallel:
- US1: T001, T002, T003, T004 (viewport tests)
- US2: T017, T018, T019, T020 (interaction tests)
- US3: T033, T034, T035, T036 (hierarchy tests)

Polish tasks T049, T050, T051 can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Launch all viewport tests together (T001-T004):
Task: "Add E2E test for mobile viewport (320px)"
Task: "Add E2E test for tablet viewport (768px)"
Task: "Add E2E test for desktop viewport (1920px)"
Task: "Add E2E test for 4K viewport (3840px)"

# Then sequential:
Task: "Run homepage E2E tests - verify they FAIL"
Task: "Adjust Card maxWidth for better mobile responsiveness"
# ... etc
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Skip Phase 1: Setup (not needed)
2. Skip Phase 2: Foundational (not needed)
3. Complete Phase 3: User Story 1 (T001-T016)
4. **STOP and VALIDATE**: Test US1 independently
5. Deploy/demo if ready - basic responsive layout is functional!

**MVP Deliverable**: Responsive landing page that works across all viewport sizes without horizontal scrolling.

### Incremental Delivery

1. **MVP**: User Story 1 → Responsive layout works → Deploy
2. **Increment 2**: Add User Story 2 → Search controls properly sized → Deploy
3. **Increment 3**: Add User Story 3 → Visual hierarchy improved → Deploy
4. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. No setup phase needed - everyone can start immediately
2. Assign stories:
   - Developer A: User Story 1 (T001-T016)
   - Developer B: User Story 2 (T017-T032)
   - Developer C: User Story 3 (T033-T048)
3. All developers work in parallel on the SAME FILE
4. Coordinate merges (story-based feature flags if needed)
5. Or: complete sequentially to avoid merge conflicts in single component

**Recommended for single file**: Sequential implementation (P1 → P2 → P3) to avoid merge conflicts.

---

## Notes

- [P] tasks = different test files or can run in parallel without conflicts
- [US1], [US2], [US3] labels map tasks to user stories for traceability
- Each user story is independently testable
- Follow Test-First: Red (failing tests) → Green (implementation) → Refactor
- Single file modifications (`apps/web/src/routes/index.lazy.tsx`) - sequential execution recommended
- E2E test file modifications (`apps/web/src/test/e2e/manual/homepage.e2e.test.ts`) - can parallelize within story
- Commit after each verification phase per user story
- Total of 55 tasks across 3 independent user stories
- No NEEDS CLARIFICATION - all requirements are clear from spec
