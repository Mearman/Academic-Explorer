# Tasks: shadcn Styling Standardization

**Input**: Design documents from `/specs/029-shadcn-styling/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in specification - focusing on implementation tasks

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Nx Web App**: `apps/web/src/`, `packages/ui/src/` for shared components
- **Monorepo Structure**: Uses packages/ for shared utilities, apps/ for deployable code
- **Vanilla Extract**: CSS-in-JS with .css.ts file extensions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Install Vanilla Extract ecosystem packages in apps/web/package.json
- [ ] T002 [P] Configure Vite for Vanilla Extract compilation in apps/web/vite.config.ts
- [ ] T003 [P] Update ESLint configuration to recognize .css.ts files in eslint.config.base.ts
- [ ] T004 [P] Add TypeScript declarations for Vanilla Extract modules in apps/web/src/vite-env.d.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core theming infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create Mantine theme configuration with Vanilla Extract in apps/web/src/styles/theme.css.ts
- [ ] T006 [P] Create global CSS variables for theme switching in apps/web/src/styles/vars.css.ts
- [ ] T007 [P] Setup academic color palettes from research theme in apps/web/src/styles/academic-colors.css.ts
- [ ] T008 Create base component recipes directory structure in packages/ui/src/recipes/
- [ ] T009 [P] Install enhanced Vanilla Extract packages (@vanilla-extract/recipes, @vanilla-extract/dynamic, @vanilla-extract/css-utils, @vanilla-extract/sprinkles)
- [ ] T010 Configure theme provider wrapper in apps/web/src/providers/theme-provider.tsx
- [ ] T011 Create shared styling utilities directory in packages/ui/src/utils/

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Broken UI Component Fix (Priority: P1) 🎯 MVP

**Goal**: Fix broken DataState and other UI components that display styling artifacts

**Independent Test**: Load the application and verify that DataState components display without broken styling or missing visual elements

### Implementation for User Story 1

- [ ] T012 [P] [US1] Analyze current DataState component styling issues in apps/web/src/components/data-display/DataState.tsx
- [ ] T013 [P] [US1] Create button recipe with shadcn-inspired variants in packages/ui/src/recipes/button.recipe.css.ts
- [ ] T014 [P] [US1] Create card recipe with academic color integration in packages/ui/src/recipes/card.recipe.css.ts
- [ ] T015 [US1] Fix DataState component styling using Vanilla Extract recipes in apps/web/src/components/data-display/DataState.tsx
- [ ] T016 [P] [US1] Migrate DataState component to use button recipe in apps/web/src/components/data-display/DataState.tsx
- [ ] T017 [US1] Remove Tailwind classes from DataState component in apps/web/src/components/data-display/DataState.tsx
- [ ] T018 [P] [US1] Update DataState component imports to use Vanilla Extract styles in apps/web/src/components/data-display/DataState.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Consistent Visual Design Language (Priority: P2)

**Goal**: Establish consistent visual design language across all components using academic color palettes

**Independent Test**: Navigate different sections of the application and verify visual consistency across components

### Implementation for User Story 2

- [ ] T019 [P] [US2] Create input field recipe with academic color variants in packages/ui/src/recipes/input.recipe.css.ts
- [ ] T020 [P] [US2] Create modal/overlay recipe with consistent styling in packages/ui/src/recipes/modal.recipe.css.ts
- [ ] T021 [P] [US2] Create navigation recipe with academic entity colors in packages/ui/src/recipes/navigation.recipe.css.ts
- [ ] T022 [P] [US2] Create badge recipe for entity type indicators in packages/ui/src/recipes/badge.recipe.css.ts
- [ ] T023 [US2] Migrate EntityCard component to use consistent recipes in apps/web/src/components/entities/EntityCard.tsx
- [ ] T024 [US2] Migrate SearchResults component styling to Vanilla Extract in apps/web/src/components/search/SearchResults.tsx
- [ ] T025 [P] [US2] Apply consistent hover and focus states across migrated components in apps/web/src/components/
- [ ] T026 [US2] Remove Tailwind classes from migrated components in apps/web/src/components/

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Theme Consistency (Priority: P3)

**Goal**: Ensure theme switching works consistently across all UI components while preserving entity color mappings

**Independent Test**: Toggle theme settings and verify all components adapt correctly while maintaining entity color consistency

### Implementation for User Story 3

- [ ] T027 [P] [US3] Create theme switching utility functions in packages/ui/src/utils/theme-switcher.css.ts
- [ ] T028 [US3] Implement dynamic theme variant system using @vanilla-extract/dynamic in packages/ui/src/utils/dynamic-theme.ts
- [ ] T029 [P] [US3] Create academic entity color mapping utilities in packages/ui/src/utils/entity-colors.css.ts
- [ ] T030 [US3] Update theme provider to support dynamic theme switching in apps/web/src/providers/theme-provider.tsx
- [ ] T031 [P] [US3] Apply academic entity color consistency to all migrated components in apps/web/src/components/
- [ ] T032 [US3] Test theme switching performance and optimize CSS generation in apps/web/src/styles/theme.css.ts
- [ ] T033 [US3] Verify academic entity colors remain consistent in both light and dark modes in apps/web/src/components/

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Migration Completion & Cleanup

**Purpose**: Complete migration of remaining components and remove legacy styling systems

- [ ] T034 [P] Audit remaining components for Tailwind classes and Mantine CSS variables in apps/web/src/components/
- [ ] T035 [P] Migrate remaining high-priority components to Vanilla Extract recipes in apps/web/src/components/
- [ ] T036 [P] Remove unused Tailwind CSS imports from components in apps/web/src/components/
- [ ] T037 [P] Remove legacy Mantine CSS variable usage in apps/web/src/components/
- [ ] T038 [P] Update component documentation with new styling patterns in apps/web/src/components/

---

## Phase 7: Performance Optimization & Validation

**Purpose**: Ensure performance requirements are met and validate success criteria

- [ ] T039 [P] Analyze bundle size impact and ensure <5% increase constraint in apps/web/
- [ ] T040 [P] Test theme switching performance and ensure <100ms target in apps/web/src/providers/theme-provider.tsx
- [ ] T041 [P] Validate zero Tailwind classes remain in production code in apps/web/src/
- [ ] T042 [P] Verify all Mantine CSS variables replaced with theme variables in apps/web/src/components/
- [ ] T043 [P] Confirm graph visualization colors remain completely unchanged in apps/web/src/components/graph/
- [ ] T044 [P] Validate academic entity color consistency across UI elements in apps/web/src/

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements and Constitution compliance verification

- [ ] T045 [P] Add comprehensive TypeScript types for theming system in packages/ui/src/types/
- [ ] T046 Create developer documentation for styling patterns in apps/web/src/styles/README.md
- [ ] T047 [P] Code cleanup and refactoring of styling utilities in packages/ui/src/utils/
- [ ] T048 Performance optimization across all migrated components in apps/web/src/components/
- [ ] T049 Create component story examples for styling patterns in apps/web/.storybook/
- [ ] T050 Update main layout theme integration in apps/web/src/components/layout/MainLayout.tsx
- [ ] T051 Run quickstart.md validation scenarios
- [ ] T052 Constitution compliance verification:
  - [ ] No `any` types in implementation (Type Safety)
  - [ ] Proper Nx workspace structure used (Monorepo Architecture)
  - [ ] Performance requirements met; memory constraints respected (Performance & Memory)
  - [ ] Atomic conventional commits created after each task (Atomic Conventional Commits)
  - [ ] Breaking changes documented; no backwards compatibility obligations (Development-Stage Pragmatism)
  - [ ] ALL issues resolved (tests, lint, build, audit, errors, warnings)—"pre-existing" is not an excuse (Repository Integrity)
  - [ ] Full feature implemented as specified; no simplified fallbacks (Complete Implementation)
  - [ ] specs/README.md updated with spec status (Spec Index Maintenance)
  - [ ] TypeScript builds output to dist/, not alongside source files (Build Output Isolation)
  - [ ] Working files cleaned up before commit (Working Files Hygiene)
  - [ ] No duplicate logic; shared code extracted; configuration extends base; cruft cleaned (DRY Code & Configuration)
  - [ ] Web app components separate presentation from logic; business logic in hooks/services (Presentation/Functionality Decoupling)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Migration Completion (Phase 6)**: Depends on all user stories being complete
- **Performance Optimization (Phase 7)**: Depends on migration completion
- **Polish (Final Phase 8)**: Depends on all previous phases

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Recipe creation before component migration
- Component migration before legacy cleanup
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Recipe creation tasks within stories marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members
- Component migration tasks marked [P] can run in parallel within their story

---

## Parallel Example: User Story 1

```bash
# Launch all recipe creation for User Story 1 together:
Task: "Create button recipe with shadcn-inspired variants in packages/ui/src/recipes/button.recipe.css.ts"
Task: "Create card recipe with academic color integration in packages/ui/src/recipes/card.recipe.css.ts"

# Launch all component analysis tasks for User Story 1 together:
Task: "Analyze current DataState component styling issues in apps/web/src/components/data-display/DataState.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (critical bug fixes)
   - Developer B: User Story 2 (visual consistency)
   - Developer C: User Story 3 (theme switching)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Hash-based graph visualization colors must remain completely untouched
- Focus on UI component styling only, not graph styling
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Task Summary

**Total Tasks**: 52
**Tasks per User Story**:
- User Story 1: 7 tasks (critical bug fixes)
- User Story 2: 8 tasks (visual consistency)
- User Story 3: 7 tasks (theme switching)
- Infrastructure: 30 tasks (setup, foundation, migration, optimization)

**MVP Scope**: User Story 1 (Tasks T012-T018) - Fix broken UI components
**Estimated Effort**: High-impact visual improvements with preserved functionality