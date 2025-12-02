# Tasks: Persistent Graph Index

**Input**: Design documents from `/specs/034-persistent-graph-index/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests INCLUDED per Constitution Test-First Development requirement.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Types**: `packages/types/src/`
- **Client/Cache**: `packages/client/src/cache/dexie/`
- **Web App**: `apps/web/src/`
- **Tests**: Co-located with source files using `.unit.test.ts`, `.integration.test.ts` naming

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and type definitions

- [ ] T001 [P] Define `CompletenessStatus` type in `packages/types/src/graph-index-types.ts`
- [ ] T002 [P] Define `GraphNodeRecord` interface in `packages/types/src/graph-index-types.ts`
- [ ] T003 [P] Define `GraphEdgeRecord` interface in `packages/types/src/graph-index-types.ts`
- [ ] T004 [P] Define `GraphNodeInput`, `GraphEdgeInput` input types in `packages/types/src/graph-index-types.ts`
- [ ] T005 [P] Define `NeighborQueryOptions`, `SubgraphResult`, `GraphStatistics` query types in `packages/types/src/graph-index-types.ts`
- [ ] T006 [P] Define constants `GRAPH_INDEX_DB_NAME`, `GRAPH_INDEX_DB_VERSION`, `GRAPH_INDEX_TABLES` in `packages/types/src/graph-index-types.ts`
- [ ] T007 Export new types from `packages/types/src/index.ts` barrel file

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T008 [P] Create unit test for `GraphIndexDatabase` schema validation in `packages/client/src/cache/dexie/graph-index-db.unit.test.ts`
- [ ] T009 Create `GraphIndexDatabase` Dexie class with nodes/edges tables in `packages/client/src/cache/dexie/graph-index-db.ts`
- [ ] T010 [P] Create unit tests for `GraphIndexTier` CRUD operations in `packages/client/src/cache/dexie/graph-index-tier.unit.test.ts`
- [ ] T011 Implement `GraphIndexTier` class with node CRUD (putNode, getNode, deleteNode, getAllNodes) in `packages/client/src/cache/dexie/graph-index-tier.ts`
- [ ] T012 Add edge CRUD methods (putEdge, getEdge, deleteEdge, getAllEdges) to `GraphIndexTier` in `packages/client/src/cache/dexie/graph-index-tier.ts`
- [ ] T013 Add compound index queries (getEdgesBySourceAndType, getEdgesByTargetAndType, hasEdge) to `GraphIndexTier` in `packages/client/src/cache/dexie/graph-index-tier.ts`
- [ ] T014 Add bulk operations (bulkPutNodes, bulkPutEdges, clear) to `GraphIndexTier` in `packages/client/src/cache/dexie/graph-index-tier.ts`
- [ ] T015 Add edge ID generation utility `generateEdgeId()` in `packages/client/src/cache/dexie/graph-index-tier.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 & 2 - Core Graph Infrastructure (Priority: P1) 🎯 MVP

**Goal**: Automatic graph building from cached entities + persistence across sessions

**Independent Test**: Cache an entity (Work with authorships), close/reopen app, verify nodes and edges persist

### Tests for User Stories 1 & 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**
> **NAMING**: Tests MUST follow pattern `foo.[type].test.ts[x]` where type = unit/integration/component/e2e

- [ ] T016 [P] [US1] Unit test for PersistentGraph node operations (addNode, getNode, hasNode) in `packages/client/src/cache/dexie/persistent-graph.unit.test.ts`
- [ ] T017 [P] [US1] Unit test for PersistentGraph edge operations (addEdge, hasEdge, getEdgesFrom) in `packages/client/src/cache/dexie/persistent-graph.unit.test.ts`
- [ ] T018 [P] [US2] Unit test for PersistentGraph hydration (initialize, hydrate, isHydrated) in `packages/client/src/cache/dexie/persistent-graph.unit.test.ts`
- [ ] T019 [P] [US2] Unit test for PersistentGraph write-through persistence in `packages/client/src/cache/dexie/persistent-graph.unit.test.ts`
- [ ] T020 [P] [US1] Integration test for entity caching triggering graph indexing in `packages/client/src/cached-client.integration.test.ts`

### Implementation for User Stories 1 & 2

- [ ] T021 [US1] Create `PersistentGraph` class skeleton with IPersistentGraph interface in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T022 [US1] Implement lifecycle methods (initialize, close) in `PersistentGraph` in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T023 [US1] Implement node operations (addNode, getNode, hasNode, getAllNodes) in `PersistentGraph` in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T024 [US1] Implement edge operations (addEdge, hasEdge, getEdgesFrom, getEdgesTo, getAllEdges) in `PersistentGraph` in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T025 [US1] Implement completeness upgrade logic (stub → partial → full) with validation in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T026 [US2] Implement hydration logic (load all nodes/edges from IndexedDB to memory) in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T027 [US2] Implement write-through caching (persist to IndexedDB on every mutation) in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T028 [US2] Add lazy hydration support (auto-hydrate on first query if not hydrated) in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T029 [US1] Create `extractAndIndexRelationships()` helper function in `packages/client/src/cache/dexie/graph-extraction.ts`
- [ ] T030 [US1] Implement determineCompleteness() based on entity data fields in `packages/client/src/cache/dexie/graph-extraction.ts`
- [ ] T031 [US1] Implement stub node creation for referenced entities in `packages/client/src/cache/dexie/graph-extraction.ts`
- [ ] T031a [US1] Extract authorPosition from authorship array index during edge creation in `packages/client/src/cache/dexie/graph-extraction.ts`
- [ ] T031b [US1] Extract isCorresponding flag from authorship data during edge creation in `packages/client/src/cache/dexie/graph-extraction.ts`
- [ ] T031c [US1] Extract isOpenAccess and version from publication/source data during edge creation in `packages/client/src/cache/dexie/graph-extraction.ts`
- [ ] T031d [US1] Extract topic score from topic associations during edge creation in `packages/client/src/cache/dexie/graph-extraction.ts`
- [ ] T031e [US1] Extract affiliation years array during edge creation in `packages/client/src/cache/dexie/graph-extraction.ts`
- [ ] T031f [US1] Extract awardId from funding data during edge creation in `packages/client/src/cache/dexie/graph-extraction.ts`
- [ ] T032 [US1] Integrate graph indexing into `cacheResponseEntities()` in `packages/client/src/cached-client.ts`
- [ ] T033 [US1] Add singleton PersistentGraph instance to CachedOpenAlexClient in `packages/client/src/cached-client.ts`
- [ ] T034 Export `PersistentGraph` and graph types from `packages/client/src/index.ts`

**Checkpoint**: At this point, US1 & US2 should be functional - entities cached → graph populated → persists across sessions

---

## Phase 4: User Story 3 - Graph-Native Relationship Queries (Priority: P2)

**Goal**: Query connected entities directly from graph without loading full entity JSON

**Independent Test**: Populate graph with known relationships, call getNeighbors(), verify correct results without entity cache access

### Tests for User Story 3

- [ ] T035 [P] [US3] Unit test for getNeighbors() with direction filtering in `packages/client/src/cache/dexie/persistent-graph.unit.test.ts`
- [ ] T036 [P] [US3] Unit test for getEdgesFrom/getEdgesTo with type filtering in `packages/client/src/cache/dexie/persistent-graph.unit.test.ts`
- [ ] T036a [P] [US3] Unit test for edge property filtering (authorPosition) in `packages/client/src/cache/dexie/persistent-graph.unit.test.ts`
- [ ] T036b [P] [US3] Unit test for edge property filtering (score threshold) in `packages/client/src/cache/dexie/persistent-graph.unit.test.ts`
- [ ] T036c [P] [US3] Unit test for edge property filtering (isOpenAccess, isCorresponding) in `packages/client/src/cache/dexie/persistent-graph.unit.test.ts`
- [ ] T037 [P] [US3] Unit test for getSubgraph() extraction in `packages/client/src/cache/dexie/persistent-graph.unit.test.ts`
- [ ] T038 [P] [US3] Unit test for getShortestPath() BFS traversal in `packages/client/src/cache/dexie/persistent-graph.unit.test.ts`

### Implementation for User Story 3

- [ ] T039 [US3] Implement getNeighbors() with direction filtering (outbound/inbound/both) in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T040 [US3] Implement type filtering for getEdgesFrom() and getEdgesTo() in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T040a [US3] Implement EdgePropertyFilter interface for edge property queries in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T040b [US3] Add edge property filtering to getEdgesFrom/getEdgesTo (authorPosition, isCorresponding) in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T040c [US3] Add score threshold filtering (scoreMin, scoreMax) for topic edges in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T040d [US3] Add years inclusion filtering for affiliation edges in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T040e [US3] Implement getEdgesByProperty() for cross-source property queries in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T041 [US3] Implement getSubgraph() for extracting subset of nodes and connecting edges in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T042 [US3] Implement getShortestPath() using BFS traversal in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T043 [US3] Implement getStatistics() for node/edge counts by type in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T044 [US3] Add getNodesByCompleteness() and getNodesByType() filter methods in `packages/client/src/cache/dexie/persistent-graph.ts`

**Checkpoint**: Graph queries work independently of entity cache

---

## Phase 5: User Story 4 - Fast Graph Visualization Loading (Priority: P2)

**Goal**: Visualization page loads from persistent graph immediately

**Independent Test**: Pre-populate graph, load visualization page, measure <500ms load time

### Tests for User Story 4

- [ ] T045 [P] [US4] Unit test for usePersistentGraph hook initialization in `apps/web/src/lib/graph-index/use-persistent-graph.unit.test.ts`
- [ ] T046 [P] [US4] Unit test for usePersistentGraph hook data transformation in `apps/web/src/lib/graph-index/use-persistent-graph.unit.test.ts`

### Implementation for User Story 4

- [ ] T047 [US4] Create `usePersistentGraph()` React hook skeleton in `apps/web/src/lib/graph-index/use-persistent-graph.ts`
- [ ] T048 [US4] Implement hook initialization with hydration status tracking in `apps/web/src/lib/graph-index/use-persistent-graph.ts`
- [ ] T049 [US4] Implement hook data transformation (GraphNodeRecord → visualization nodes) in `apps/web/src/lib/graph-index/use-persistent-graph.ts`
- [ ] T050 [US4] Add loading/error states and statistics to hook in `apps/web/src/lib/graph-index/use-persistent-graph.ts`
- [ ] T051 [US4] Update graph route to use usePersistentGraph() hook in `apps/web/src/routes/graph/route.tsx`
- [ ] T052 [US4] Add hydration loading state UI to graph page in `apps/web/src/routes/graph/route.tsx`

**Checkpoint**: Graph visualization loads from persistent graph - faster than entity extraction

---

## Phase 6: User Story 5 - Stub Nodes for Undiscovered Entities (Priority: P3)

**Goal**: Referenced entities appear as expandable stub nodes

**Independent Test**: Cache entity with references, verify stub nodes created, expand stub, verify upgrades to full

### Tests for User Story 5

- [ ] T053 [P] [US5] Unit test for stub node creation during edge addition in `packages/client/src/cache/dexie/persistent-graph.unit.test.ts`
- [ ] T054 [P] [US5] Unit test for stub → full upgrade on entity fetch in `packages/client/src/cache/dexie/persistent-graph.unit.test.ts`

### Implementation for User Story 5

- [ ] T055 [US5] Implement automatic stub node creation when adding edges with unknown targets in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T056 [US5] Implement stub node upgrade logic when entity is fetched in `packages/client/src/cache/dexie/graph-extraction.ts`
- [ ] T057 [US5] Add expandStubNode() method to fetch and upgrade stub in `packages/client/src/cache/dexie/persistent-graph.ts`
- [ ] T058 [US5] Add visual indicator for stub nodes (CSS/styling) in visualization in `apps/web/src/routes/graph/route.tsx`
- [ ] T059 [US5] Add click-to-expand interaction for stub nodes in visualization in `apps/web/src/routes/graph/route.tsx`

**Checkpoint**: Stub nodes display as expandable placeholders

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T060 [P] Add performance benchmark tests (500 nodes <500ms, 50ms persist, 10ms query) in `packages/client/src/cache/dexie/persistent-graph.benchmark.test.ts`
- [ ] T061 [P] Add E2E test for graph persistence across page reload in `apps/web/e2e/graph-persistence.e2e.test.ts`
- [ ] T062 [P] Add E2E test for 3-level traversal without API calls in `apps/web/e2e/graph-traversal.e2e.test.ts`
- [ ] T063 Update specs/README.md to mark spec-034 as In Progress → Complete
- [ ] T064 Run quickstart.md validation scenarios
- [ ] T065 Constitution compliance verification:
  - [ ] No `any` types in implementation (Type Safety)
  - [ ] All tests written before implementation (Test-First)
  - [ ] Proper Nx workspace structure used (Monorepo Architecture)
  - [ ] Storage operations use provider interface (Storage Abstraction)
  - [ ] Performance requirements met; memory constraints respected (Performance & Memory)
  - [ ] Atomic conventional commits created after each task; explicit file paths used (NEVER `git add .`, `git add -A`, or `git commit -a`) (Atomic Conventional Commits)
  - [ ] Breaking changes documented; no backwards compatibility obligations (Development-Stage Pragmatism)
  - [ ] Bug regression tests written before fixes (Test-First Bug Fixes)
  - [ ] ALL issues resolved (tests, lint, build, audit, errors, warnings)—"pre-existing" is not an excuse (Repository Integrity)
  - [ ] Full feature implemented as specified; no simplified fallbacks (Complete Implementation)
  - [ ] specs/README.md updated with spec status (Spec Index Maintenance)
  - [ ] TypeScript builds output to dist/, not alongside source files (Build Output Isolation)
  - [ ] Working files cleaned up before commit (Working Files Hygiene)
  - [ ] No duplicate logic; shared code extracted; configuration extends base; cruft cleaned (DRY Code & Configuration)
  - [ ] Web app components separate presentation from logic; business logic in hooks/services (Presentation/Functionality Decoupling)
  - [ ] All meaningful literals extracted to named constants; no magic numbers/strings (No Magic Numbers/Values)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories 1 & 2 (Phase 3)**: Depend on Foundational - core MVP
- **User Story 3 (Phase 4)**: Depends on Phase 3 (needs PersistentGraph)
- **User Story 4 (Phase 5)**: Depends on Phase 3 (needs PersistentGraph)
- **User Story 5 (Phase 6)**: Depends on Phase 3 (needs stub node infrastructure)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Stories 1 & 2 (P1)**: Combined because persistence (US2) is required for US1 to be useful - must complete together as MVP
- **User Story 3 (P2)**: Can start after Phase 3 - independent query layer
- **User Story 4 (P2)**: Can start after Phase 3 - visualization integration
- **User Story 5 (P3)**: Can start after Phase 3 - enhancement feature

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Types/interfaces before implementations
- Core operations before advanced features
- Commit after each task or logical group

### Parallel Opportunities

- T001-T006 (type definitions) can run in parallel
- T008, T010 (tests) can run in parallel
- T016-T020 (US1/2 tests) can run in parallel
- T035-T038 (US3 tests) can run in parallel
- T045-T046 (US4 tests) can run in parallel
- T053-T054 (US5 tests) can run in parallel
- T060-T062 (polish tests) can run in parallel

---

## Parallel Example: Phase 3 Tests

```bash
# Launch all tests for User Stories 1 & 2 together:
Task: "Unit test for PersistentGraph node operations in packages/client/src/cache/dexie/persistent-graph.unit.test.ts"
Task: "Unit test for PersistentGraph edge operations in packages/client/src/cache/dexie/persistent-graph.unit.test.ts"
Task: "Unit test for PersistentGraph hydration in packages/client/src/cache/dexie/persistent-graph.unit.test.ts"
Task: "Unit test for PersistentGraph write-through persistence in packages/client/src/cache/dexie/persistent-graph.unit.test.ts"
Task: "Integration test for entity caching triggering graph indexing in packages/client/src/cached-client.integration.test.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup (type definitions)
2. Complete Phase 2: Foundational (GraphIndexTier)
3. Complete Phase 3: User Stories 1 & 2 (PersistentGraph + integration)
4. **STOP and VALIDATE**: Cache an entity, close browser, reopen, verify graph persists
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Stories 1 & 2 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 3 → Test queries independently → Deploy/Demo
4. Add User Story 4 → Test visualization loading → Deploy/Demo
5. Add User Story 5 → Test stub expansion → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Stories 1 & 2 (core)
   - Developer B: User Story 3 (queries) - can start after core
   - Developer C: User Story 4 (visualization) - can start after core
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- User Stories 1 & 2 combined into single phase (persistence required for graph to be useful)
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Summary

| Phase | User Story | Task Count | Parallel Tasks |
|-------|------------|------------|----------------|
| Phase 1 | Setup | 7 | 6 |
| Phase 2 | Foundational | 8 | 2 |
| Phase 3 | US1 & US2 (MVP) | 25 | 5 |
| Phase 4 | US3 | 18 | 7 |
| Phase 5 | US4 | 8 | 2 |
| Phase 6 | US5 | 7 | 2 |
| Phase 7 | Polish | 6 | 3 |
| **Total** | | **79** | **27** |

**MVP Scope**: Phases 1-3 (40 tasks) - automatic graph building + persistence + indexed edge properties
