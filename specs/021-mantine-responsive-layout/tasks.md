# Tasks: Mantine Responsive Layout Configuration

**Input**: Design documents from `/specs/021-mantine-responsive-layout/`
**Prerequisites**: plan.md (tech stack), spec.md (user stories), research.md (decisions), data-model.md (entities), contracts/ (component interfaces), quickstart.md (implementation guide)

**Tests**: Test-First Development is enabled per Constitution Principle II. Tests will be written BEFORE implementation to verify they FAIL before fixes.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a web application (existing monorepo):
- **Layout Components**: `apps/web/src/components/layout/`
- **Test Files**: `apps/web/test/component/` and `apps/web/test/e2e/`
- **Routes**: `apps/web/src/routes/`

All paths relative to repository root: `/Users/joe/Documents/Research/PhD/BibGraph/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify existing project structure and prepare for responsive configuration changes

- [x] T001 Verify Mantine 7.x is installed with responsive system available in apps/web/package.json
- [x] T002 Verify @mantine/core exports AppShell, Box, Stack, Group, Flex, Menu components
- [x] T003 [P] Verify @tabler/icons-react exports IconMenu icon for mobile navigation
- [x] T004 [P] Review current MainLayout.tsx to understand existing structure in apps/web/src/components/layout/MainLayout.tsx
- [x] T005 [P] Review current HeaderSearchInput.tsx implementation in apps/web/src/components/layout/HeaderSearchInput.tsx
- [x] T006 [P] Verify Playwright and @axe-core/playwright are installed for E2E and accessibility testing
- [x] T007 [P] Verify Vitest and @testing-library/react are configured for component tests

**Checkpoint**: Project structure verified, dependencies confirmed, ready for user story implementation

---

## Phase 2: User Story 1 - Mobile-First Header Navigation (Priority: P1) 🎯 MVP

**Goal**: Fix header overflow on mobile devices by implementing collapsible hamburger menu navigation

**Independent Test**: Load application on 375px viewport (iPhone SE) and verify all navigation options accessible through menu button without horizontal scrolling

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**
> **NAMING**: Tests MUST follow pattern `foo.[type].test.ts[x]` where type = unit/integration/component/e2e

- [x] T008 [P] [US1] Create component test file for responsive header in apps/web/test/component/MainLayout.responsive.component.test.tsx
- [x] T009 [P] [US1] Write test: "hides navigation buttons on mobile viewport (<768px)" - MUST FAIL initially
- [x] T010 [P] [US1] Write test: "shows navigation buttons on desktop viewport (≥768px)" - MUST FAIL initially
- [x] T011 [P] [US1] Write test: "shows mobile menu icon on mobile viewport (<768px)" - MUST FAIL initially
- [x] T012 [P] [US1] Write test: "hides mobile menu icon on desktop viewport (≥768px)" - MUST FAIL initially
- [x] T013 [P] [US1] Create E2E test file in apps/web/test/e2e/mobile-navigation.e2e.test.ts
- [x] T014 [P] [US1] Write E2E test: "mobile menu opens and closes on icon click" - MUST FAIL initially
- [x] T015 [P] [US1] Write E2E test: "navigation works from mobile menu and closes after selection" - MUST FAIL initially
- [x] T016 [P] [US1] Write E2E test: "no horizontal scrolling on 375px viewport" - MUST FAIL initially
- [x] T017 [US1] Run all US1 tests to verify they FAIL (expected behavior before implementation)

### Implementation for User Story 1

- [x] T018 [US1] Add mobileMenuOpen state to MainLayout component in apps/web/src/components/layout/MainLayout.tsx
- [x] T019 [US1] Add responsive header height configuration: `header={{ height: { base: 50, sm: 60 } }}` in apps/web/src/components/layout/MainLayout.tsx
- [x] T020 [US1] Wrap desktop navigation buttons with `<Group visibleFrom="md">` in apps/web/src/components/layout/MainLayout.tsx
- [x] T021 [US1] Add mobile Menu component with IconMenu button and `hiddenFrom="md"` prop in apps/web/src/components/layout/MainLayout.tsx
- [x] T022 [US1] Implement Menu.Dropdown with navigation items (Home, About, History, Bookmarks, Catalogue) in apps/web/src/components/layout/MainLayout.tsx
- [x] T023 [US1] Add onClick handlers to Menu.Item components to close menu after navigation in apps/web/src/components/layout/MainLayout.tsx
- [x] T024 [US1] Wrap HeaderSearchInput with `<Box visibleFrom="sm">` to hide on mobile in apps/web/src/components/layout/MainLayout.tsx
- [x] T025 [US1] Add responsive padding to header Group: `px={{ base: 'xs', sm: 'md' }}` in apps/web/src/components/layout/MainLayout.tsx
- [x] T026 [US1] Add responsive gap to header Groups: `gap={{ base: 'xs', sm: 'md' }}` in apps/web/src/components/layout/MainLayout.tsx
- [x] T027 [US1] Run component tests to verify they now PASS (tests should transition from RED to GREEN)
- [x] T028 [US1] Run E2E tests on 375px, 768px, 1920px viewports to verify responsive behavior
- [x] T029 [US1] Commit US1 implementation: `fix(web): add mobile-first header navigation with collapsible menu`

**Checkpoint**: User Story 1 complete - mobile header navigation functional, no overflow on small screens, all tests passing

---

## Phase 3: User Story 2 - Responsive Sidebar Behavior (Priority: P2)

**Goal**: Implement adaptive sidebar widths and collapse behavior across breakpoints for optimal content viewing

**Independent Test**: Resize browser from 375px to 1920px and verify sidebars collapse on mobile, reduce width on tablet, and use full width on desktop

### Tests for User Story 2 ⚠️

> **NAMING**: Tests MUST follow pattern `foo.[type].test.ts[x]` where type = unit/integration/component/e2e

- [x] T030 [P] [US2] Add component tests to apps/web/test/component/MainLayout.responsive.component.test.tsx
- [x] T031 [P] [US2] Write test: "sidebars collapsed on mobile viewport (<576px)" - MUST FAIL initially
- [x] T032 [P] [US2] Write test: "sidebar widths reduced on tablet viewport (576-992px)" - MUST FAIL initially
- [x] T033 [P] [US2] Write test: "sidebar widths full on desktop viewport (≥992px)" - MUST FAIL initially
- [x] T034 [P] [US2] Create E2E test file in apps/web/test/e2e/sidebar-responsive.e2e.test.ts
- [x] T035 [P] [US2] Write E2E test: "sidebars remain collapsed on mobile regardless of state" - MUST FAIL initially
- [x] T036 [P] [US2] Write E2E test: "sidebar opens with reduced width on tablet" - MUST FAIL initially
- [x] T037 [P] [US2] Write E2E test: "sidebar opens with full custom width on desktop" - MUST FAIL initially
- [x] T038 [P] [US2] Write E2E test: "layout adapts smoothly on viewport resize without reload" - MUST FAIL initially
- [x] T039 [US2] Run all US2 tests to verify they FAIL (expected behavior before implementation)

### Implementation for User Story 2

- [x] T040 [US2] Add responsive width config to navbar: `width: leftSidebarOpen ? { base: 280, sm: leftSidebarWidth + 60 } : 60` in apps/web/src/components/layout/MainLayout.tsx
- [x] T041 [US2] Update navbar collapsed config: `collapsed: { mobile: true, desktop: !leftSidebarOpen }` in apps/web/src/components/layout/MainLayout.tsx
- [x] T042 [US2] Add responsive width config to aside: `width: rightSidebarOpen ? { base: 280, sm: rightSidebarWidth + 60 } : 60` in apps/web/src/components/layout/MainLayout.tsx
- [x] T043 [US2] Update aside collapsed config: `collapsed: { mobile: true, desktop: !rightSidebarOpen }` in apps/web/src/components/layout/MainLayout.tsx
- [x] T044 [US2] Add responsive padding to AppShell: `padding={{ base: 0, sm: 'xs', md: 'sm' }}` in apps/web/src/components/layout/MainLayout.tsx
- [x] T045 [US2] Wrap left drag handle with `visibleFrom="md"` to hide on mobile/tablet in apps/web/src/components/layout/MainLayout.tsx
- [x] T046 [US2] Wrap right drag handle with `visibleFrom="md"` to hide on mobile/tablet in apps/web/src/components/layout/MainLayout.tsx
- [x] T047 [US2] Add responsive padding to sidebar content boxes: `p={{ base: 'xs', sm: 'sm' }}` in apps/web/src/components/layout/MainLayout.tsx
- [x] T048 [US2] Run component tests to verify they now PASS (tests should transition from RED to GREEN)
- [x] T049 [US2] Run E2E tests on 375px, 768px, 1920px viewports to verify sidebar responsive behavior
- [x] T050 [US2] Commit US2 implementation: `fix(web): add responsive sidebar widths and collapse behavior`

**Checkpoint**: User Story 2 complete - sidebars adapt to viewport size, optimal screen space usage, drag handles hidden on mobile

---

## Phase 4: User Story 3 - Content Layout Auto-Adaptation (Priority: P3)

**Goal**: Implement responsive spacing, padding, and UI element sizing for optimal readability across devices

**Independent Test**: Load entity detail pages on 375px, 768px, 1920px viewports and verify appropriate spacing and element sizing

### Tests for User Story 3 ⚠️

> **NAMING**: Tests MUST follow pattern `foo.[type].test.ts[x]` where type = unit/integration/component/e2e

- [x] T051 [P] [US3] Add component tests to apps/web/test/component/MainLayout.responsive.component.test.tsx
- [x] T052 [P] [US3] Write test: "applies minimal spacing on mobile viewport" - MUST FAIL initially
- [x] T053 [P] [US3] Write test: "applies moderate spacing on tablet viewport" - MUST FAIL initially
- [x] T054 [P] [US3] Write test: "applies generous spacing on desktop viewport" - MUST FAIL initially
- [x] T055 [P] [US3] Create E2E test file in apps/web/test/e2e/layout-adaptation.e2e.test.ts
- [x] T056 [P] [US3] Write E2E test: "content area uses ≥80% width on mobile" - MUST FAIL initially
- [x] T057 [P] [US3] Write E2E test: "UI elements sized appropriately for viewport" - MUST FAIL initially
- [x] T058 [P] [US3] Write E2E test: "no layout overflow on 375px-2560px range" - MUST FAIL initially
- [x] T059 [US3] Run all US3 tests to verify they FAIL (expected behavior before implementation)

### Implementation for User Story 3

- [x] T060 [US3] Add responsive gap to sidebar Stack components: `gap={{ base: 'xs', sm: 'sm', md: 'md' }}` in apps/web/src/components/layout/MainLayout.tsx
- [x] T061 [US3] Add responsive gap to header control Groups: `gap={{ base: 'xs', sm: 'md' }}` in apps/web/src/components/layout/MainLayout.tsx
- [x] T062 [US3] Add responsive size to ActionIcon components: `size={{ base: 'md', sm: 'lg' }}` for touch-friendly mobile targets in apps/web/src/components/layout/MainLayout.tsx
- [x] T063 [US3] Add responsive padding to AppShell.Main styles (verify existing styles property) in apps/web/src/components/layout/MainLayout.tsx
- [x] T064 [US3] Review BookmarksSidebar and HistorySidebar for responsive spacing opportunities (if needed) in apps/web/src/components/layout/
- [x] T065 [US3] Review RightSidebarDynamic for responsive spacing opportunities (if needed) in apps/web/src/components/layout/
- [x] T066 [US3] Run component tests to verify they now PASS (tests should transition from RED to GREEN)
- [x] T067 [US3] Run E2E tests on 375px, 768px, 1920px viewports to verify content layout adaptation
- [x] T068 [US3] Commit US3 implementation: `fix(web): add responsive spacing and UI element sizing`

**Checkpoint**: User Story 3 complete - content layout optimized for all viewport sizes, spacing adapts appropriately

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility validation, performance verification, deployment readiness

- [x] T069 [P] Create accessibility test file in apps/web/test/e2e/responsive-accessibility.e2e.test.ts
- [x] T070 [P] Write accessibility test: "touch targets ≥44px on mobile" using @axe-core/playwright
- [x] T071 [P] Write accessibility test: "WCAG 2.1 AA compliance for responsive layouts" using @axe-core/playwright
- [x] T072 [P] Write accessibility test: "keyboard navigation works in mobile menu"
- [x] T073 [P] Write accessibility test: "screen reader announces responsive state changes"
- [x] T074 Run all accessibility tests and verify WCAG 2.1 AA compliance
- [x] T075 [P] Create performance test file in apps/web/test/component/MainLayout.performance.component.test.tsx
- [x] T076 [P] Write performance test: "layout adapts within 100ms on viewport resize" (SC-002)
- [x] T077 [P] Write performance test: "sidebar drag responds within 100ms" (SC-006)
- [x] T078 Run all performance tests and verify targets met
- [x] T079 Manually test on real devices: iPhone SE (375px), iPad (768px), Desktop (1920px)
- [x] T080 Manually test browser zoom: 50%, 100%, 200% levels
- [x] T081 Manually test orientation changes: portrait ↔ landscape on tablet
- [x] T082 Manually test with custom browser font sizes
- [x] T083 Run full test suite: `pnpm nx test web` (all component tests)
- [x] T084 Run full E2E suite: `pnpm nx e2e web` (all E2E tests)
- [x] T085 Run typecheck: `pnpm typecheck` - MUST pass with zero errors
- [x] T086 Run lint: `pnpm lint` - MUST pass with zero violations
- [x] T087 Run build: `pnpm build` - MUST succeed for all packages
- [x] T088 Run full validation pipeline: `pnpm validate` - MUST pass completely
- [x] T089 Resolve any pre-existing deployment blockers identified during validation
- [x] T090 Update CLAUDE.md with responsive layout patterns and lessons learned (if needed)
- [x] T091 Commit Phase 5 completion: `docs(spec-021): complete Phase 5 - polish and cross-cutting concerns`
- [x] T092 Final commit for spec: `docs(spec-021): mark feature complete - all user stories implemented and tested`

**Checkpoint**: All phases complete - responsive layout fully functional, all tests passing, deployment ready

---

## Dependencies & Execution Order

### User Story Dependencies

- **US1 (Mobile Header)**: No dependencies - can start immediately after Phase 1
- **US2 (Responsive Sidebars)**: No dependencies - can start immediately after Phase 1 (independent of US1)
- **US3 (Content Adaptation)**: No dependencies - can start immediately after Phase 1 (independent of US1 and US2)

**All user stories are INDEPENDENT** - they modify different aspects of the same file but don't depend on each other's completion

### Suggested Execution Order (Sequential)

1. **Phase 1**: Setup (T001-T007) - Complete first
2. **Phase 2**: US1 - Mobile Header (T008-T029) - P1 priority, MVP
3. **Phase 3**: US2 - Responsive Sidebars (T030-T050) - P2 priority
4. **Phase 4**: US3 - Content Adaptation (T051-T068) - P3 priority
5. **Phase 5**: Polish & Deployment (T069-T092) - Final validation

### Parallel Execution Opportunities

**Within Phase 1** (all can run in parallel):
- T002, T003, T004, T005, T006, T007

**Within User Story Test Phases** (all can run in parallel):
- US1: T008-T016 (all test writing tasks)
- US2: T030-T038 (all test writing tasks)
- US3: T051-T058 (all test writing tasks)

**Within Phase 5** (accessibility & performance tests can run in parallel):
- T069-T073 (accessibility test writing)
- T075-T077 (performance test writing)

**IMPORTANT**: Implementation tasks within each user story MUST run sequentially due to modifying the same file (MainLayout.tsx)

---

## Implementation Strategy

### MVP Definition (User Story 1 Only)

**Minimum Viable Product**: Implement US1 (Mobile-First Header Navigation) only
- Fixes critical mobile usability blocker
- Enables mobile users to access all navigation
- Can be deployed independently
- Estimated: 1-2 hours implementation + 30 minutes testing

**Tasks for MVP**: T001-T029 (29 tasks)

### Incremental Delivery

**Iteration 1** (MVP): US1 - Mobile Header Navigation
- Deliverable: Functional mobile navigation menu
- Test: No horizontal scrolling on 375px viewport
- Deploy: Mobile users can navigate the application

**Iteration 2** (MVP + US2): Add Responsive Sidebars
- Deliverable: Sidebars adapt to viewport size
- Test: Optimal screen space usage on all devices
- Deploy: Improved UX on tablets and small laptops

**Iteration 3** (Complete): Add Content Adaptation
- Deliverable: Responsive spacing and sizing
- Test: Optimal readability on all devices
- Deploy: Polished responsive experience

### Constitution Compliance

- ✅ **Test-First**: All user stories have tests written BEFORE implementation (RED → GREEN workflow)
- ✅ **Atomic Commits**: Each user story gets separate commit after completion
- ✅ **Type Safety**: All responsive props use Mantine's typed interfaces, no `any` types
- ✅ **Deployment Readiness**: Phase 5 ensures full validation pipeline passes
- ✅ **Continuous Execution**: Tasks flow directly from planning to implementation without pausing

---

## Task Summary

**Total Tasks**: 92
- Phase 1 (Setup): 7 tasks
- Phase 2 (US1 - Mobile Header): 22 tasks (10 tests + 12 implementation)
- Phase 3 (US2 - Responsive Sidebars): 21 tasks (10 tests + 11 implementation)
- Phase 4 (US3 - Content Adaptation): 18 tasks (9 tests + 9 implementation)
- Phase 5 (Polish & Cross-Cutting): 24 tasks

**Parallel Opportunities**: 35 tasks marked [P] (38% of total)

**Independent Test Criteria**:
- US1: Load on 375px viewport, verify menu accessible without scrolling
- US2: Resize 375px → 1920px, verify sidebar adaptation at breakpoints
- US3: Load pages on 375px/768px/1920px, verify spacing and sizing

**MVP Scope**: Phase 1 + Phase 2 (29 tasks) - delivers critical mobile navigation fix

**Estimated Time**:
- MVP (US1): 2-3 hours
- US2: 1-2 hours
- US3: 1-2 hours
- Polish: 2-3 hours
- **Total**: 6-10 hours for complete implementation

---

## Format Validation ✅

All tasks follow required format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- ✅ All tasks have checkboxes
- ✅ All tasks have sequential IDs (T001-T092)
- ✅ User story tasks have [US1], [US2], or [US3] labels
- ✅ Parallelizable tasks marked with [P]
- ✅ All tasks include file paths in descriptions
- ✅ Test naming convention documented (foo.[type].test.tsx)
- ✅ RED → GREEN workflow emphasized for Test-First Development
