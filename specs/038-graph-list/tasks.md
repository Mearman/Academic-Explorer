# Tasks: Graph List Persistent Working Set

**Input**: Design documents from `/specs/038-graph-list/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test-first development is required per Constitution Principle II. All test tasks are MANDATORY.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

**Monorepo Structure**:
- Types: `packages/types/src/graph/`
- Storage: `packages/utils/src/storage/`
- Hooks: `apps/web/src/hooks/`
- Components: `apps/web/src/components/graph/`
- Tests: Co-located with implementation files using `*.test.ts[x]` naming

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize constants and type definitions required across all user stories

- [X] T001 [P] Add GRAPH special list ID constant to packages/utils/src/storage/catalogue-db.ts
- [X] T002 [P] Create GraphProvenance type in packages/types/src/graph/graph-list.ts
- [X] T003 [P] Create GraphListNode interface in packages/types/src/graph/graph-list.ts
- [X] T004 [P] Create GRAPH_LIST_CONFIG constants in packages/types/src/graph/graph-list.ts
- [X] T005 [P] Export graph list types from packages/types/src/graph/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core storage interface that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 [P] Extend CatalogueStorageProvider interface with getGraphList() in packages/utils/src/storage/catalogue-storage-provider.ts
- [X] T007 [P] Extend CatalogueStorageProvider interface with addToGraphList() in packages/utils/src/storage/catalogue-storage-provider.ts
- [X] T008 [P] Extend CatalogueStorageProvider interface with removeFromGraphList() in packages/utils/src/storage/catalogue-storage-provider.ts
- [X] T009 [P] Extend CatalogueStorageProvider interface with clearGraphList() in packages/utils/src/storage/catalogue-storage-provider.ts
- [X] T010 [P] Extend CatalogueStorageProvider interface with getGraphListSize() in packages/utils/src/storage/catalogue-storage-provider.ts
- [X] T011 [P] Extend CatalogueStorageProvider interface with pruneGraphList() in packages/utils/src/storage/catalogue-storage-provider.ts
- [X] T012 [P] Extend CatalogueStorageProvider interface with isInGraphList() in packages/utils/src/storage/catalogue-storage-provider.ts
- [X] T013 [P] Extend CatalogueStorageProvider interface with batchAddToGraphList() in packages/utils/src/storage/catalogue-storage-provider.ts
- [X] T014 Update initializeSpecialLists() to create graph list in packages/utils/src/storage/dexie-storage-provider.ts
- [X] T015 Implement getGraphList() in DexieStorageProvider in packages/utils/src/storage/dexie-storage-provider.ts
- [X] T016 Implement addToGraphList() with size limit in DexieStorageProvider in packages/utils/src/storage/dexie-storage-provider.ts
- [X] T017 Implement removeFromGraphList() in DexieStorageProvider in packages/utils/src/storage/dexie-storage-provider.ts
- [X] T018 Implement clearGraphList() in DexieStorageProvider in packages/utils/src/storage/dexie-storage-provider.ts
- [X] T019 Implement getGraphListSize() in DexieStorageProvider in packages/utils/src/storage/dexie-storage-provider.ts
- [X] T020 Implement pruneGraphList() in DexieStorageProvider in packages/utils/src/storage/dexie-storage-provider.ts
- [X] T021 Implement isInGraphList() in DexieStorageProvider in packages/utils/src/storage/dexie-storage-provider.ts
- [X] T022 Implement batchAddToGraphList() in DexieStorageProvider in packages/utils/src/storage/dexie-storage-provider.ts
- [X] T023 Update initializeSpecialLists() to create graph list in packages/utils/src/storage/in-memory-storage-provider.ts
- [X] T024 Implement all graph list methods in InMemoryStorageProvider in packages/utils/src/storage/in-memory-storage-provider.ts

**Checkpoint**: Foundation ready - storage providers support graph list operations

---

## Phase 3: User Story 1 - Persist Graph Working Set (Priority: P1) 🎯 MVP

**Goal**: Users can build a graph by loading bookmarks, searching, and expanding nodes. The graph persists across browser sessions.

**Independent Test**: Add 5 works from bookmarks to graph, refresh page, verify same 5 works are still visible in graph

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**
> **NAMING**: Tests MUST follow pattern `foo.[type].test.ts[x]` where type = unit/integration/component/e2e

- [ ] T025 [P] [US1] Unit test for getGraphList() in packages/utils/src/storage/dexie-storage-provider.unit.test.ts
- [ ] T026 [P] [US1] Unit test for addToGraphList() in packages/utils/src/storage/dexie-storage-provider.unit.test.ts
- [ ] T027 [P] [US1] Unit test for persistence across sessions in packages/utils/src/storage/dexie-storage-provider.integration.test.ts
- [ ] T028 [P] [US1] Unit test for InMemoryStorageProvider graph list methods in packages/utils/src/storage/in-memory-storage-provider.unit.test.ts

### Implementation for User Story 1

- [ ] T029 [US1] Create useGraphList hook in apps/web/src/hooks/use-graph-list.ts
- [ ] T030 [US1] Implement optimistic updates for addNode in apps/web/src/hooks/use-graph-list.ts
- [ ] T031 [US1] Implement node refresh/sync from storage in apps/web/src/hooks/use-graph-list.ts
- [ ] T032 [US1] Update graph data loading to union graph list with collections in apps/web/src/hooks/use-graph-data.ts
- [ ] T033 [US1] Add provenance serialization/deserialization logic in packages/utils/src/storage/dexie-storage-provider.ts
- [ ] T034 [US1] Implement deduplication by entityId in storage provider methods in packages/utils/src/storage/dexie-storage-provider.ts

**Checkpoint**: At this point, nodes can be added to graph list and persist across browser sessions

---

## Phase 4: User Story 2 - Graph List Bypasses Entity Type Filters (Priority: P1)

**Goal**: Nodes in graph working set are always visible regardless of entity type filter settings. Filters apply only to collection loading.

**Independent Test**: Enable only "works" entity type filter, add 3 authors to graph list, verify all 3 authors remain visible

### Tests for User Story 2

> **NAMING**: Tests MUST follow pattern `foo.[type].test.ts[x]` where type = unit/integration/component/e2e

- [ ] T035 [P] [US2] Unit test for visibility logic with filters in apps/web/src/hooks/use-graph-data.unit.test.ts
- [ ] T036 [P] [US2] Integration test for filter bypass in apps/web/src/hooks/use-graph-data.integration.test.ts
- [ ] T037 [P] [US2] E2E test for expansion visibility with filters disabled in apps/web/src/routes/graph/index.e2e.test.ts

### Implementation for User Story 2

- [ ] T038 [US2] Update getVisibleNodes() to implement union logic `visible = graph_list ∪ (collections ∩ entity_types)` in apps/web/src/hooks/use-graph-data.ts
- [ ] T039 [US2] Update collection loading to respect entity type filters in apps/web/src/hooks/use-graph-data.ts
- [ ] T040 [US2] Ensure graph list nodes bypass entity type filters in apps/web/src/hooks/use-graph-data.ts
- [ ] T041 [US2] Add deduplication logic for nodes appearing in both graph list and collections in apps/web/src/hooks/use-graph-data.ts

**Checkpoint**: Graph list nodes are always visible; collection nodes respect entity type filters

---

## Phase 5: User Story 3 - Add Nodes to Graph List (Priority: P1)

**Goal**: Users can add nodes via search, collection load, expansion, and auto-population. Each method records provenance.

**Independent Test**: Search for "machine learning", select a work, click "Add to graph", verify work appears with provenance "user"

### Tests for User Story 3

> **NAMING**: Tests MUST follow pattern `foo.[type].test.ts[x]` where type = unit/integration/component/e2e

- [ ] T042 [P] [US3] Unit test for adding node with "user" provenance in apps/web/src/hooks/use-graph-list.unit.test.ts
- [ ] T043 [P] [US3] Unit test for adding node with "collection-load" provenance in apps/web/src/hooks/use-graph-list.unit.test.ts
- [ ] T044 [P] [US3] Unit test for adding node with "expansion" provenance in apps/web/src/hooks/use-graph-list.unit.test.ts
- [ ] T045 [P] [US3] Unit test for provenance update when re-adding existing node in packages/utils/src/storage/dexie-storage-provider.unit.test.ts

### Implementation for User Story 3

- [ ] T046 [P] [US3] Add "Add to graph" action to search results in apps/web/src/routes/search/index.tsx
- [ ] T047 [US3] Update collection loading to add nodes with "collection-load" provenance in apps/web/src/hooks/use-graph-data.ts
- [ ] T048 [US3] Update node expansion to add discovered nodes with "expansion" provenance in apps/web/src/hooks/use-graph-expansion.ts
- [ ] T049 [US3] Update auto-population to add discovered nodes with "auto-population" provenance in apps/web/src/hooks/use-auto-population.ts
- [ ] T050 [US3] Implement provenance update logic when node already exists in packages/utils/src/storage/dexie-storage-provider.ts

**Checkpoint**: Nodes can be added via all 4 methods with correct provenance tracking

---

## Phase 6: User Story 4 - Remove Nodes from Graph List (Priority: P2)

**Goal**: Users can remove unwanted nodes from graph or clear entire graph to start fresh.

**Independent Test**: Add 5 nodes to graph list, remove 2 individually, clear the rest, verify graph is empty

### Tests for User Story 4

> **NAMING**: Tests MUST follow pattern `foo.[type].test.ts[x]` where type = unit/integration/component/e2e

- [ ] T051 [P] [US4] Unit test for removeNode in apps/web/src/hooks/use-graph-list.unit.test.ts
- [ ] T052 [P] [US4] Unit test for clearList in apps/web/src/hooks/use-graph-list.unit.test.ts
- [ ] T053 [P] [US4] Unit test for edge removal when node removed in packages/utils/src/storage/dexie-storage-provider.unit.test.ts

### Implementation for User Story 4

- [ ] T054 [US4] Implement removeNode with optimistic updates in apps/web/src/hooks/use-graph-list.ts
- [ ] T055 [US4] Implement clearList with optimistic updates in apps/web/src/hooks/use-graph-list.ts
- [ ] T056 [US4] Add edge removal logic to removeFromGraphList() in packages/utils/src/storage/dexie-storage-provider.ts
- [ ] T057 [US4] Add auto-population task cancellation to clearGraphList() in packages/utils/src/storage/dexie-storage-provider.ts

**Checkpoint**: Users can remove individual nodes and clear entire graph

---

## Phase 7: User Story 5 - View and Manage Graph List (Priority: P2)

**Goal**: Users see graph list working set in left panel with provenance indicators and management actions.

**Independent Test**: Add nodes via different methods, verify graph list section displays all nodes with accurate provenance, verify collapsible header works

### Tests for User Story 5

> **NAMING**: Tests MUST follow pattern `foo.[type].test.ts[x]` where type = unit/integration/component/e2e

- [ ] T058 [P] [US5] Component test for GraphListSection in apps/web/src/components/graph/GraphListSection.component.test.tsx
- [ ] T059 [P] [US5] Component test for GraphListNode in apps/web/src/components/graph/GraphListNode.component.test.tsx
- [ ] T060 [P] [US5] Component test for GraphListEmpty in apps/web/src/components/graph/GraphListEmpty.component.test.tsx
- [ ] T061 [P] [US5] E2E test for provenance display in apps/web/src/routes/graph/index.e2e.test.ts

### Implementation for User Story 5

- [ ] T062 [P] [US5] Create GraphListSection component with collapsible header in apps/web/src/components/graph/GraphListSection.tsx
- [ ] T063 [P] [US5] Create GraphListNode component with provenance indicator in apps/web/src/components/graph/GraphListNode.tsx
- [ ] T064 [P] [US5] Create GraphListEmpty component with helpful message in apps/web/src/components/graph/GraphListEmpty.tsx
- [ ] T065 [US5] Add collapsed state persistence to GraphListSection in apps/web/src/components/graph/GraphListSection.tsx
- [ ] T066 [US5] Integrate GraphListSection into left panel above Data Sources in apps/web/src/routes/graph/index.tsx
- [ ] T067 [US5] Add click handler to center/highlight node in graph in apps/web/src/components/graph/GraphListNode.tsx
- [ ] T068 [US5] Add provenance tooltip with timestamp in apps/web/src/components/graph/GraphListNode.tsx
- [ ] T069 [US5] Add remove button to each node in apps/web/src/components/graph/GraphListNode.tsx
- [ ] T070 [US5] Add "Clear graph" button to GraphListSection header in apps/web/src/components/graph/GraphListSection.tsx
- [ ] T071 [US5] Apply canonical hash-computed colours to node badges in apps/web/src/components/graph/GraphListNode.tsx
- [ ] T072 [US5] Apply consistent colour scheme to provenance badges in apps/web/src/components/graph/GraphListNode.tsx

**Checkpoint**: Graph list UI is fully functional in left panel with stacked layout

---

## Phase 8: User Story 6 - Graph List Size Management (Priority: P3)

**Goal**: System manages graph list size to prevent performance degradation. Warns at 900 nodes, blocks at 1000, provides pruning.

**Independent Test**: Programmatically add nodes until 900, verify warning appears, add more until 1000, verify error on addition attempt

### Tests for User Story 6

> **NAMING**: Tests MUST follow pattern `foo.[type].test.ts[x]` where type = unit/integration/component/e2e

- [ ] T073 [P] [US6] Unit test for size limit enforcement (1000 nodes) in packages/utils/src/storage/dexie-storage-provider.unit.test.ts
- [ ] T074 [P] [US6] Unit test for warning threshold (900 nodes) in apps/web/src/hooks/use-graph-list.unit.test.ts
- [ ] T075 [P] [US6] Unit test for pruneGraphList() in packages/utils/src/storage/dexie-storage-provider.unit.test.ts
- [ ] T076 [P] [US6] Integration test for pruning auto-populated nodes older than 24 hours in packages/utils/src/storage/dexie-storage-provider.integration.test.ts

### Implementation for User Story 6

- [ ] T077 [US6] Add size warning logic (900 nodes) to useGraphList hook in apps/web/src/hooks/use-graph-list.ts
- [ ] T078 [US6] Add warning toast/notification component in apps/web/src/components/graph/GraphListSection.tsx
- [ ] T079 [US6] Add error handling for size limit (1000 nodes) in apps/web/src/hooks/use-graph-list.ts
- [ ] T080 [US6] Add error toast/notification when limit reached in apps/web/src/hooks/use-graph-list.ts
- [ ] T081 [US6] Add "Prune auto-populated nodes" button to GraphListSection in apps/web/src/components/graph/GraphListSection.tsx
- [ ] T082 [US6] Implement pruning with result notification in apps/web/src/hooks/use-graph-list.ts
- [ ] T083 [US6] Add size display to GraphListSection header (e.g., "Graph (123/1000)") in apps/web/src/components/graph/GraphListSection.tsx

**Checkpoint**: Size management prevents performance issues and provides pruning tools

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T084 [P] Add type guards for GraphProvenance and GraphListNode in packages/types/src/graph/graph-list.ts
- [ ] T085 [P] Update quickstart.md examples with actual implementation in specs/038-graph-list/quickstart.md
- [ ] T086 Code cleanup and refactoring across graph list implementation
- [ ] T087 [P] Performance optimization: ensure 1000-node graph loads in <2s
- [ ] T088 [P] Performance optimization: ensure UI updates in <100ms
- [ ] T089 [P] Additional edge case tests for duplicate handling in packages/utils/src/storage/dexie-storage-provider.unit.test.ts
- [ ] T090 [P] Additional edge case tests for unavailable entity data in apps/web/src/components/graph/GraphListNode.component.test.tsx
- [ ] T091 Security audit: validate provenance values, sanitize labels
- [ ] T092 Accessibility audit: ensure keyboard navigation, ARIA labels, screen reader support
- [ ] T093 Run quickstart.md validation scenarios
- [ ] T094 Update specs/README.md with completed status
- [ ] T095 Constitution compliance verification:
  - [ ] No `any` types in implementation (Type Safety)
  - [ ] All tests written before implementation (Test-First)
  - [ ] Proper Nx workspace structure used (Monorepo Architecture)
  - [ ] Storage operations use provider interface (Storage Abstraction)
  - [ ] Performance requirements met: <2s load, <100ms UI updates, 60fps rendering (Performance & Memory)
  - [ ] Atomic conventional commits created after each task; explicit file paths used (NEVER `git add .`, `git add -A`, or `git commit -a`) (Atomic Conventional Commits)
  - [ ] Breaking change to node visibility logic documented (Development-Stage Pragmatism)
  - [ ] Bug regression tests written before fixes (Test-First Bug Fixes)
  - [ ] ALL issues resolved (tests, lint, build, audit, errors, warnings)—"pre-existing" is not an excuse (Repository Integrity)
  - [ ] Full feature implemented as specified; no simplified fallbacks (Complete Implementation)
  - [ ] specs/README.md updated with spec status (Spec Index Maintenance)
  - [ ] TypeScript builds output to dist/, not alongside source files (Build Output Isolation)
  - [ ] Working files cleaned up before commit (Working Files Hygiene)
  - [ ] No duplicate logic; shared code extracted; configuration extends base; graph list constants centralized (DRY Code & Configuration)
  - [ ] GraphList UI components separate from useGraphList hook; business logic in hooks (Presentation/Functionality Decoupling)
  - [ ] Size limits (1000, 900, 24h) extracted to GRAPH_LIST_CONFIG constants (No Magic Numbers/Values)
  - [ ] Agent instruction files use `[@path](path)` format in blockquotes for embeds (Agent Embed Link Format)
  - [ ] AGENTS.md, README.md, constitution are deduplicated and concise (Documentation Token Efficiency)
  - [ ] Graph list node badges use getEntityColor() for consistent colours (Canonical Hash Computed Colours)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3 → US4 → US5 → US6)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - Depends on US1 (needs graph list to test filter bypass)
- **User Story 3 (P1)**: Can start after Foundational - Depends on US1 (needs graph list to add nodes)
- **User Story 4 (P2)**: Can start after US1 - Depends on US1 (needs graph list to remove from)
- **User Story 5 (P2)**: Can start after US1 - Depends on US1 (needs graph list to display)
- **User Story 6 (P3)**: Can start after US1 - Depends on US1 (needs graph list for size management)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Storage methods before hooks
- Hooks before components
- Core implementation before UI integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks (T001-T005) can run in parallel
- All storage interface extensions (T006-T013) can run in parallel
- All test tasks within a user story can run in parallel
- Component creation tasks (T062-T064) can run in parallel
- Once Foundational phase completes, all P1 user stories can start in parallel (if team capacity allows)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for getGraphList() in packages/utils/src/storage/dexie-storage-provider.unit.test.ts"
Task: "Unit test for addToGraphList() in packages/utils/src/storage/dexie-storage-provider.unit.test.ts"
Task: "Unit test for persistence across sessions in packages/utils/src/storage/dexie-storage-provider.integration.test.ts"
Task: "Unit test for InMemoryStorageProvider graph list methods in packages/utils/src/storage/in-memory-storage-provider.unit.test.ts"
```

---

## Parallel Example: User Story 5

```bash
# Launch all component creation tasks together:
Task: "Create GraphListSection component with collapsible header in apps/web/src/components/graph/GraphListSection.tsx"
Task: "Create GraphListNode component with provenance indicator in apps/web/src/components/graph/GraphListNode.tsx"
Task: "Create GraphListEmpty component with helpful message in apps/web/src/components/graph/GraphListEmpty.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Persistence)
4. Complete Phase 4: User Story 2 (Filter Bypass)
5. Complete Phase 5: User Story 3 (Add Nodes)
6. **STOP and VALIDATE**: Test all P1 stories independently
7. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Graph list persists
3. Add User Story 2 → Test independently → Filter bypass works
4. Add User Story 3 → Test independently → 4 add methods work (MVP!)
5. Add User Story 4 → Test independently → Remove functionality
6. Add User Story 5 → Test independently → Full UI
7. Add User Story 6 → Test independently → Size management
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 + User Story 2 (sequential, US2 depends on US1)
   - Developer B: User Story 4 (can start after US1 complete)
   - Developer C: User Story 5 (can start after US1 complete)
3. After P1 stories complete:
   - Any developer: User Story 6 (size management)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Constitution Principle X: Continuous Execution - proceed through all phases without pausing
- Constitution Principle VI: Use explicit file paths for commits - NEVER use `git add .`, `git add -A`, or `git commit -a`
