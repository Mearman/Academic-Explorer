# Tasks: Enhanced Weighted Traversal

**Input**: Design documents from `/specs/036-enhanced-weighted-traversal/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in spec - optional tests noted where applicable.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3 (maps to user stories from spec.md)
- Exact file paths included in descriptions

## Path Conventions

- **Types package**: `packages/types/src/`
- **Web app services**: `apps/web/src/services/`
- **Web app components**: `apps/web/src/components/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch already created, verify project builds

- [ ] T001 Verify clean build with `pnpm validate` from repository root

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core type definitions and utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 [P] Add `edgeTypes?: RelationType[]` to TraversalOptions interface in packages/types/src/traversal-types.ts
- [ ] T003 [P] Add `WeightableNodeProperty` type ('cited_by_count' | 'works_count' | 'h_index' | 'i10_index' | 'publication_year') to packages/types/src/traversal-types.ts
- [ ] T004 [P] Add node property weight config to WeightConfig interface (nodeProperty, nodePropertyTarget, nodeDefaultValue) in packages/types/src/traversal-types.ts
- [ ] T005 Add `weightPropertiesSchema` Zod schema for type-safe node property extraction in apps/web/src/services/graph-algorithms.ts
- [ ] T006 Add `getNodePropertyWeight()` function using Zod safeParse in apps/web/src/services/graph-algorithms.ts
- [ ] T007 Add constants MIN_POSITIVE_WEIGHT, DEFAULT_NODE_PROPERTY_VALUE in apps/web/src/services/graph-algorithms.ts

**Checkpoint**: Foundation ready - type definitions and utilities available for user story implementation

---

## Phase 3: User Story 1 - Filter Paths by Relationship Type (Priority: P1) 🎯 MVP

**Goal**: Enable filtering paths to only traverse specific edge types (e.g., only CITES or AUTHORSHIP)

**Independent Test**: Select two nodes, choose edge types in filter, verify returned path only uses those edge types

### Implementation for User Story 1

- [ ] T008 [US1] Add `applyEdgeTypeFilter()` function in apps/web/src/services/graph-algorithms.ts
- [ ] T009 [US1] Update `buildAdjacencyGraph()` to apply edge type filter before graph construction in apps/web/src/services/graph-algorithms.ts
- [ ] T010 [US1] Update `findShortestPath()` to accept and use edgeTypes option in apps/web/src/services/graph-algorithms.ts
- [ ] T011 [P] [US1] Add EDGE_TYPE_OPTIONS constant array with all RelationType values in apps/web/src/components/algorithms/items/ShortestPathItem.tsx
- [ ] T012 [US1] Add edgeTypes state and MultiSelect UI control for edge type filtering in apps/web/src/components/algorithms/items/ShortestPathItem.tsx
- [ ] T013 [US1] Pass edgeTypes option through to findShortestPath call in apps/web/src/components/algorithms/items/ShortestPathItem.tsx
- [ ] T014 [US1] Update Advanced Options badge indicator to show when edge type filter is active in apps/web/src/components/algorithms/items/ShortestPathItem.tsx

**Checkpoint**: US1 complete - edge type filtering works end-to-end

---

## Phase 4: User Story 2 - Weight Paths by Node Properties (Priority: P2)

**Goal**: Enable weighting paths by numeric node properties (cited_by_count, h-index, etc.)

**Independent Test**: Select source/target, choose node property weight (e.g., cited_by_count with invert), verify path routes through high/low-impact nodes

### Implementation for User Story 2

- [ ] T015 [US2] Update `buildWeightFunction()` to check for nodeProperty in WeightConfig and use getNodePropertyWeight() in apps/web/src/services/graph-algorithms.ts
- [ ] T016 [US2] Implement nodePropertyTarget logic ('source' | 'target' | 'average') in weight calculation in apps/web/src/services/graph-algorithms.ts
- [ ] T017 [P] [US2] Add NODE_PROPERTY_OPTIONS constant array with weight property choices in apps/web/src/components/algorithms/items/ShortestPathItem.tsx
- [ ] T018 [US2] Add nodeProperty and nodePropertyTarget state variables in apps/web/src/components/algorithms/items/ShortestPathItem.tsx
- [ ] T019 [US2] Add Select UI for node property weight source in Advanced Options panel in apps/web/src/components/algorithms/items/ShortestPathItem.tsx
- [ ] T020 [US2] Add SegmentedControl for nodePropertyTarget (source/target/average) in apps/web/src/components/algorithms/items/ShortestPathItem.tsx
- [ ] T021 [US2] Pass nodeProperty weight config through to findShortestPath call in apps/web/src/components/algorithms/items/ShortestPathItem.tsx

**Checkpoint**: US2 complete - node property weighting works end-to-end

---

## Phase 5: User Story 3 - Custom Composite Weight Functions (Priority: P3)

**Goal**: Enable custom weight calculations combining edge and node properties

**Independent Test**: Select composite weight preset, execute pathfinding, verify path reflects combined calculation

### Implementation for User Story 3

- [ ] T022 [US3] Verify existing weightFn support handles composite calculations with full node access in apps/web/src/services/graph-algorithms.ts
- [ ] T023 [P] [US3] Add COMPOSITE_WEIGHT_PRESETS constant with preset weight function options in apps/web/src/components/algorithms/items/ShortestPathItem.tsx
- [ ] T024 [US3] Add compositePreset state and Select UI for composite weight presets in apps/web/src/components/algorithms/items/ShortestPathItem.tsx
- [ ] T025 [US3] Implement preset-to-weightFn conversion when composite preset selected in apps/web/src/components/algorithms/items/ShortestPathItem.tsx
- [ ] T026 [US3] Pass composite weightFn through to findShortestPath call in apps/web/src/components/algorithms/items/ShortestPathItem.tsx

**Checkpoint**: US3 complete - composite weights work end-to-end

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation

- [ ] T027 [P] Update specs/README.md with spec-036 completion status
- [ ] T028 Run `pnpm validate` to verify all quality gates pass
- [ ] T029 Constitution compliance verification:
  - [ ] No `any` types in implementation (Type Safety)
  - [ ] Proper Nx workspace structure used (Monorepo Architecture)
  - [ ] Performance requirements met (< 500ms for 5k nodes) (Performance & Memory)
  - [ ] Atomic conventional commits created after each task (Atomic Conventional Commits)
  - [ ] ALL issues resolved - tests, lint, build pass (Repository Integrity)
  - [ ] Full feature implemented as specified (Complete Implementation)
  - [ ] specs/README.md updated (Spec Index Maintenance)
  - [ ] TypeScript builds to dist/, not alongside source (Build Output Isolation)
  - [ ] Working files cleaned up (Working Files Hygiene)
  - [ ] No duplicate logic; constants extracted (DRY Code & Configuration)
  - [ ] Business logic in services; UI only renders controls (Presentation/Functionality Decoupling)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verify build first
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 (P1): Can start immediately after Foundational
  - US2 (P2): Can start after Foundational; independent of US1
  - US3 (P3): Can start after Foundational; may reference US2 utilities
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational - No dependencies on other stories
- **User Story 2 (P2)**: After Foundational - Independent; uses shared getNodePropertyWeight
- **User Story 3 (P3)**: After Foundational - Builds on nodeProperty concept from US2 but independently testable

### Within Each User Story

- Service layer before UI
- Core implementation before integration
- All changes to same file should be sequential

### Parallel Opportunities

- T002, T003, T004 can run in parallel (different interface additions)
- T011 can run in parallel with T008-T010 (constant vs logic)
- T017 can run in parallel with T015-T016 (constant vs logic)
- T023 can run in parallel with T022 (constant vs logic)

---

## Parallel Example: Phase 2 Foundation

```bash
# Launch type definition tasks in parallel:
Task: "Add edgeTypes to TraversalOptions in packages/types/src/traversal-types.ts"
Task: "Add WeightableNodeProperty type in packages/types/src/traversal-types.ts"
Task: "Add node property weight config to WeightConfig in packages/types/src/traversal-types.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify build)
2. Complete Phase 2: Foundational (type definitions)
3. Complete Phase 3: User Story 1 (edge type filtering)
4. **STOP and VALIDATE**: Test edge type filtering independently
5. Deploy/demo if ready - MVP delivers edge type filtering

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (adds node property weights)
4. Add User Story 3 → Test independently → Deploy/Demo (adds composite weights)
5. Each story adds value without breaking previous stories

### Recommended Execution Order

1. T001 (Setup)
2. T002-T007 (Foundational - parallel where marked)
3. T008-T014 (US1 - edge type filtering)
4. T015-T021 (US2 - node property weights)
5. T022-T026 (US3 - composite weights)
6. T027-T029 (Polish)

---

## Notes

- [P] tasks = different files or independent code paths
- [Story] label maps task to user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Zod-based approach ensures type-safe node property access without assertions
