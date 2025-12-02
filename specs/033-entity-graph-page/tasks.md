# Tasks: Entity Graph Page

**Input**: Design documents from `/specs/033-entity-graph-page/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in spec. Implementation tasks only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

This is an Nx monorepo:
- `apps/web/src/` - Web application source
- `apps/web/src/routes/` - TanStack Router routes
- `apps/web/src/hooks/` - React hooks
- `apps/web/src/components/` - React components

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and hook contract verification

- [ ] T001 Run `pnpm validate` to verify repository integrity before starting
- [ ] T002 [P] Verify contract files exist and match data-model.md types in `specs/033-entity-graph-page/contracts/`
- [ ] T003 [P] Review existing algorithms page state management in `apps/web/src/routes/algorithms.lazy.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extract shared hooks that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until these hooks are complete

### Hook Extraction

- [ ] T004 Create `useRepositoryGraph` hook per contract in `apps/web/src/hooks/use-repository-graph.ts`
- [ ] T005 Create `useGraphVisualization` hook per contract in `apps/web/src/hooks/use-graph-visualization.ts`
- [ ] T006 Refactor `apps/web/src/routes/algorithms.lazy.tsx` to use `useGraphVisualization` hook (verify no regression)
- [ ] T007 Run `pnpm validate` to confirm algorithms page still works after refactor
- [ ] T008 Commit foundational hooks: `git commit -m "feat(graph): add useRepositoryGraph and useGraphVisualization hooks"`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View Repository Graph (Priority: P1) 🎯 MVP

**Goal**: Display repository entities as interactive graph with empty state handling

**Independent Test**: Navigate to `/graph` with entities in repository → see graph; empty repository → see empty state

### Implementation for User Story 1

- [ ] T009 [US1] Create route definition in `apps/web/src/routes/graph.tsx`
- [ ] T010 [US1] Create GraphEmptyState component in `apps/web/src/components/graph/GraphEmptyState.tsx`
- [ ] T011 [US1] Create GraphPageContent container in `apps/web/src/components/graph/GraphPageContent.tsx`
- [ ] T012 [US1] Create lazy route with graph page implementation in `apps/web/src/routes/graph.lazy.tsx`
- [ ] T013 [US1] Wire `useRepositoryGraph` to load nodes/edges from repository store
- [ ] T014 [US1] Wire `useGraphVisualization` for display state management
- [ ] T015 [US1] Render ForceGraphVisualization with repository data
- [ ] T016 [US1] Render empty state when `isEmpty` is true
- [ ] T017 [US1] Run `pnpm validate` and verify graph page renders with repository data
- [ ] T018 [US1] Commit User Story 1: `git commit -m "feat(graph): add /graph route with repository data display"`

**Checkpoint**: User Story 1 complete - graph page shows repository data or empty state

---

## Phase 4: User Story 2 - Interactive Graph Exploration (Priority: P1)

**Goal**: Enable pan, zoom, node selection, and hover tooltips

**Independent Test**: Pan/zoom the graph; click nodes to highlight; hover for tooltips

### Implementation for User Story 2

- [ ] T019 [US2] Wire `onNodeClick` handler to highlight selected node and neighbors in `apps/web/src/routes/graph.lazy.tsx`
- [ ] T020 [US2] Wire `onBackgroundClick` handler to clear selection
- [ ] T021 [US2] Add fit-to-view controls (all nodes, selected nodes) to graph page header
- [ ] T022 [US2] Wire simulation toggle switch to `enableSimulation` state
- [ ] T023 [US2] Run `pnpm validate` and verify interaction handlers work
- [ ] T024 [US2] Commit User Story 2: `git commit -m "feat(graph): add interactive graph exploration (pan/zoom/select)"`

**Checkpoint**: User Stories 1 AND 2 complete - graph is viewable and interactive

---

## Phase 5: User Story 3 - Apply Graph Algorithms (Priority: P2)

**Goal**: Integrate AlgorithmTabs for community detection, pathfinding, etc.

**Independent Test**: Run community detection → nodes colored by community; run shortest path → path highlighted

### Implementation for User Story 3

- [ ] T025 [US3] Add AlgorithmTabs component to graph page layout in `apps/web/src/routes/graph.lazy.tsx`
- [ ] T026 [US3] Wire `onHighlightNodes` callback from AlgorithmTabs to visualization state
- [ ] T027 [US3] Wire `onHighlightPath` callback for shortest path results
- [ ] T028 [US3] Wire `onCommunitiesDetected` callback for community coloring
- [ ] T029 [US3] Wire `onSelectCommunity` callback for community selection
- [ ] T030 [US3] Wire `pathSource`/`pathTarget` state for shortest path node selection
- [ ] T031 [US3] Run `pnpm validate` and verify algorithms work on repository data
- [ ] T032 [US3] Commit User Story 3: `git commit -m "feat(graph): integrate graph algorithms (community, pathfinding)"`

**Checkpoint**: User Stories 1-3 complete - graph shows data, is interactive, and supports algorithms

---

## Phase 6: User Story 4 - Toggle Between 2D and 3D Views (Priority: P2)

**Goal**: Add 2D/3D view toggle with preference persistence

**Independent Test**: Toggle between 2D and 3D → visualization changes; refresh page → preference persists

### Implementation for User Story 4

- [ ] T033 [US4] Add ViewModeToggle component to graph page header in `apps/web/src/routes/graph.lazy.tsx`
- [ ] T034 [US4] Wire `viewMode` state to conditionally render ForceGraphVisualization or ForceGraph3DVisualization
- [ ] T035 [US4] Ensure `useViewModePreference` hook persists view mode to localStorage
- [ ] T036 [US4] Run `pnpm validate` and verify 2D/3D toggle works with persistence
- [ ] T037 [US4] Commit User Story 4: `git commit -m "feat(graph): add 2D/3D view mode toggle with persistence"`

**Checkpoint**: User Stories 1-4 complete - full visualization with view modes

---

## Phase 7: User Story 5 - Filter Graph Contents (Priority: P3)

**Goal**: Add entity type and relationship type filtering

**Independent Test**: Uncheck "Authors" filter → author nodes disappear; re-check → they reappear

### Implementation for User Story 5

- [ ] T038 [US5] Add display mode toggle (Highlight/Filter) to graph page controls in `apps/web/src/routes/graph.lazy.tsx`
- [ ] T039 [US5] Wire `displayMode` state from `useGraphVisualization` to ForceGraphVisualization
- [ ] T040 [US5] Verify filter mode hides non-highlighted nodes vs highlight mode dims them
- [ ] T041 [US5] Run `pnpm validate` and verify filtering works correctly
- [ ] T042 [US5] Commit User Story 5: `git commit -m "feat(graph): add highlight/filter display modes"`

**Checkpoint**: All user stories complete - full feature implemented

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Navigation integration, final validation, and documentation

- [ ] T043 [P] Add "Graph" navigation link to header in `apps/web/src/components/layout/MainLayout.tsx` or equivalent
- [ ] T044 [P] Add "Graph" link to sidebar navigation if applicable
- [ ] T045 Run final `pnpm validate` to ensure all checks pass
- [ ] T046 Verify performance with 500+ nodes (if repository data available)
- [ ] T047 Update `specs/README.md` to mark spec 033 as complete
- [ ] T048 Constitution compliance verification:
  - [ ] No `any` types in implementation (Type Safety)
  - [ ] Proper Nx workspace structure used (Monorepo Architecture)
  - [ ] Storage operations use repository-store interface (Storage Abstraction)
  - [ ] Performance requirements met (<2s load, 30+ FPS for 500 nodes)
  - [ ] Atomic conventional commits created after each task (Atomic Conventional Commits)
  - [ ] ALL issues resolved (tests, lint, build)—"pre-existing" is not an excuse (Repository Integrity)
  - [ ] Full feature implemented as specified; no simplified fallbacks (Complete Implementation)
  - [ ] specs/README.md updated with spec status (Spec Index Maintenance)
  - [ ] TypeScript builds output to dist/, not alongside source files (Build Output Isolation)
  - [ ] Working files cleaned up before commit (Working Files Hygiene)
  - [ ] No duplicate logic; hooks extracted from algorithms page (DRY Code & Configuration)
  - [ ] Business logic in hooks; rendering in components (Presentation/Functionality Decoupling)
- [ ] T049 Final commit: `git commit -m "feat(graph): complete entity graph page feature"`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase
  - US1 + US2 are P1 priority - complete first
  - US3 + US4 are P2 priority - complete after P1
  - US5 is P3 priority - complete last
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P1)**: Builds on US1 (same page, different functionality)
- **User Story 3 (P2)**: Can start after US2 (needs working visualization)
- **User Story 4 (P2)**: Independent of US3 (can run in parallel if needed)
- **User Story 5 (P3)**: Independent (enhances existing functionality)

### Within Each User Story

- Route definition before lazy component
- Container component before page integration
- Hook wiring before UI completion
- Validation before commit

### Parallel Opportunities

- T002, T003 can run in parallel (different files)
- T043, T044 can run in parallel (different navigation files)
- US4 and parts of US3 could potentially run in parallel

---

## Parallel Example: Foundational Phase

```bash
# These tasks modify different files and can run in parallel if needed:
# However, T004 and T005 should complete before T006 (which depends on them)

# Task T002 and T003 can run together:
Task: "Verify contract files in specs/033-entity-graph-page/contracts/"
Task: "Review algorithms page state management in apps/web/src/routes/algorithms.lazy.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (view graph/empty state)
4. Complete Phase 4: User Story 2 (interactive exploration)
5. **STOP and VALIDATE**: Test US1+US2 independently
6. Deploy/demo if ready - users can see and interact with their repository graph

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Repository data visible → MVP!
3. Add User Story 2 → Interactive exploration → Enhanced MVP
4. Add User Story 3 → Algorithm support → Analysis capability
5. Add User Story 4 → 2D/3D toggle → Better visualization
6. Add User Story 5 → Filtering → Power user feature
7. Each story adds value without breaking previous stories

### Sequential Execution Order

For single developer:
1. T001 → T002 (parallel with T003) → T003
2. T004 → T005 → T006 → T007 → T008
3. T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018
4. T019 → T020 → T021 → T022 → T023 → T024
5. T025 → T026 → T027 → T028 → T029 → T030 → T031 → T032
6. T033 → T034 → T035 → T036 → T037
7. T038 → T039 → T040 → T041 → T042
8. T043 (parallel with T044) → T045 → T046 → T047 → T048 → T049

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Run `pnpm validate` frequently to catch issues early
