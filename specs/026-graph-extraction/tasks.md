# Tasks: Academic Graph Pattern Extraction

**Input**: Design documents from `/specs/026-graph-extraction/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/extraction-api.ts

**Tests**: Test-first development REQUIRED per constitution. All tests written and failing before implementation.

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Package**: `packages/algorithms/` (Nx monorepo structure)
- **Source**: `packages/algorithms/src/extraction/`
- **Tests**: `packages/algorithms/__tests__/extraction/`
- **Fixtures**: `packages/algorithms/__tests__/fixtures/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and extraction module structure

- [X] T001 Create extraction directory structure in packages/algorithms/src/extraction/
- [X] T002 Add ExtractionError types to packages/algorithms/src/types/errors.ts
- [X] T003 [P] Create test fixtures for extraction in packages/algorithms/__tests__/fixtures/extraction-graphs.ts
- [X] T004 [P] Update packages/algorithms/src/index.ts barrel export with extraction placeholder

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create induced subgraph extraction utility in packages/algorithms/src/extraction/subgraph.ts
- [X] T006 [P] Add validation utilities in packages/algorithms/src/extraction/validators.ts
- [X] T007 [P] Create extraction barrel export in packages/algorithms/src/extraction/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Radius-k Ego Network Extraction (Priority: P1) 🎯 MVP

**Goal**: Extract k-hop neighborhoods around specific papers/authors/institutions for citation context exploration

**Independent Test**: Provide a seed node ID and radius parameter, verify returned subgraph contains exactly nodes within k hops and all edges between them

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**
> **NAMING**: Tests MUST follow pattern `foo.[type].test.ts` where type = unit/integration/component/e2e/performance

- [X] T008 [P] [US1] Unit test: radius-1 ego network extraction in packages/algorithms/__tests__/extraction/ego-network.unit.test.ts
- [X] T009 [P] [US1] Unit test: radius-2 ego network extraction in packages/algorithms/__tests__/extraction/ego-network.unit.test.ts
- [X] T010 [P] [US1] Unit test: multi-source ego network extraction in packages/algorithms/__tests__/extraction/ego-network.unit.test.ts
- [X] T011 [P] [US1] Unit test: disconnected graph handling in packages/algorithms/__tests__/extraction/ego-network.unit.test.ts
- [X] T012 [P] [US1] Unit test: invalid seed node error in packages/algorithms/__tests__/extraction/ego-network.unit.test.ts
- [X] T013 [P] [US1] Unit test: invalid radius error in packages/algorithms/__tests__/extraction/ego-network.unit.test.ts
- [X] T014 [P] [US1] Performance test: radius-3 on 1000-node graph <500ms in packages/algorithms/__tests__/extraction/ego-network.performance.test.ts

### Implementation for User Story 1

- [X] T015 [US1] Implement extractEgoNetwork() in packages/algorithms/src/extraction/ego-network.ts (uses BFS from src/traversal/bfs.ts)
- [X] T016 [US1] Implement extractMultiSourceEgoNetwork() convenience wrapper in packages/algorithms/src/extraction/ego-network.ts
- [X] T017 [US1] Implement validateEgoNetworkOptions() in packages/algorithms/src/extraction/validators.ts
- [X] T018 [US1] Add ego network exports to packages/algorithms/src/extraction/index.ts
- [X] T019 [US1] Update packages/algorithms/src/index.ts to export ego network functions

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently (verify all tests pass, performance target met)

---

## Phase 4: User Story 2 - Attribute-Based Subgraph Filtering (Priority: P1)

**Goal**: Filter graph nodes and edges by attributes (publication year, citation count, entity type, relationship type) to focus on relevant subsets

**Independent Test**: Apply filters to a known graph and verify returned subgraph contains only nodes/edges matching criteria

### Tests for User Story 2

> **NAMING**: Tests MUST follow pattern `foo.[type].test.ts` where type = unit/integration/component/e2e/performance

- [X] T020 [P] [US2] Unit test: node filter by year range in packages/algorithms/__tests__/extraction/filter.unit.test.ts
- [X] T021 [P] [US2] Unit test: node filter by citation count in packages/algorithms/__tests__/extraction/filter.unit.test.ts
- [X] T022 [P] [US2] Unit test: edge filter by relationship type in packages/algorithms/__tests__/extraction/filter.unit.test.ts
- [X] T023 [P] [US2] Unit test: combined node AND edge filters in packages/algorithms/__tests__/extraction/filter.unit.test.ts
- [X] T024 [P] [US2] Unit test: combined node OR edge filters in packages/algorithms/__tests__/extraction/filter.unit.test.ts
- [X] T025 [P] [US2] Unit test: empty filter result handling in packages/algorithms/__tests__/extraction/filter.unit.test.ts
- [X] T026 [P] [US2] Performance test: filtering 10k-node graph <200ms in packages/algorithms/__tests__/extraction/filter.performance.test.ts

### Implementation for User Story 2

- [X] T027 [P] [US2] Implement filterSubgraph() in packages/algorithms/src/extraction/filter.ts
- [X] T028 [P] [US2] Implement extractInducedSubgraph() utility in packages/algorithms/src/extraction/subgraph.ts
- [X] T029 [US2] Implement validateSubgraphFilter() in packages/algorithms/src/extraction/validators.ts
- [X] T030 [US2] Add filter exports to packages/algorithms/src/extraction/index.ts
- [X] T031 [US2] Update packages/algorithms/src/index.ts to export filter functions

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently (verify filtering can scope graphs before ego network extraction)

---

## Phase 5: User Story 3 - Citation Path Analysis (Priority: P2)

**Goal**: Find shortest citation paths between papers and extract reachability subgraphs to trace intellectual lineage

**Independent Test**: Provide source and target nodes, verify returned paths are minimal length, and check reachability subgraphs contain all reachable nodes

### Tests for User Story 3

> **NAMING**: Tests MUST follow pattern `foo.[type].test.ts` where type = unit/integration/component/e2e/performance

- [X] T032 [P] [US3] Unit test: shortest path between two nodes in packages/algorithms/__tests__/extraction/path.unit.test.ts
- [X] T033 [P] [US3] Unit test: no path exists handling in packages/algorithms/__tests__/extraction/path.unit.test.ts
- [X] T034 [P] [US3] Unit test: source equals target edge case in packages/algorithms/__tests__/extraction/path.unit.test.ts
- [X] T035 [P] [US3] Unit test: forward reachability subgraph in packages/algorithms/__tests__/extraction/path.unit.test.ts
- [X] T036 [P] [US3] Unit test: backward reachability subgraph in packages/algorithms/__tests__/extraction/path.unit.test.ts
- [X] T037 [P] [US3] Unit test: multi-source reachability in packages/algorithms/__tests__/extraction/path.unit.test.ts
- [X] T038 [P] [US3] Performance test: shortest path on 1000-node graph <100ms in packages/algorithms/__tests__/extraction/path.performance.test.ts

### Implementation for User Story 3

- [X] T039 [P] [US3] Implement findShortestPath() in packages/algorithms/src/extraction/path.ts (uses BFS for unweighted, Dijkstra for weighted)
- [X] T040 [P] [US3] Implement extractReachabilitySubgraph() in packages/algorithms/src/extraction/path.ts
- [X] T041 [US3] Add path analysis exports to packages/algorithms/src/extraction/index.ts
- [X] T042 [US3] Update packages/algorithms/src/index.ts to export path analysis functions

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently (can trace citation paths within filtered ego networks)

---

## Phase 6: User Story 4 - Academic Motif Detection (Priority: P2)

**Goal**: Detect triangles, stars, and co-citation patterns to identify bibliographic coupling, hub papers, and collaboration structures

**Independent Test**: Provide a graph with known motif structures and verify all instances are detected correctly

### Tests for User Story 4

> **NAMING**: Tests MUST follow pattern `foo.[type].test.ts` where type = unit/integration/component/e2e/performance

- [X] T043 [P] [US4] Unit test: triangle detection in known graph in packages/algorithms/__tests__/extraction/motif.unit.test.ts
- [X] T044 [P] [US4] Unit test: in-star pattern detection in packages/algorithms/__tests__/extraction/motif.unit.test.ts
- [X] T045 [P] [US4] Unit test: out-star pattern detection in packages/algorithms/__tests__/extraction/motif.unit.test.ts
- [X] T046 [P] [US4] Unit test: co-citation pair detection in packages/algorithms/__tests__/extraction/motif.unit.test.ts
- [X] T047 [P] [US4] Unit test: bibliographic coupling detection in packages/algorithms/__tests__/extraction/motif.unit.test.ts
- [X] T048 [P] [US4] Unit test: self-loop and parallel edge handling in packages/algorithms/__tests__/extraction/motif.unit.test.ts
- [X] T049 [P] [US4] Performance test: triangle detection on 1000-node/5000-edge graph <2s in packages/algorithms/__tests__/extraction/triangle-detection.performance.test.ts

### Implementation for User Story 4

- [X] T050 [P] [US4] Implement detectTriangles() in packages/algorithms/src/extraction/motif.ts
- [X] T051 [P] [US4] Implement detectStarPatterns() in packages/algorithms/src/extraction/motif.ts
- [X] T052 [P] [US4] Implement detectCoCitations() in packages/algorithms/src/extraction/motif.ts
- [X] T053 [P] [US4] Implement detectBibliographicCoupling() in packages/algorithms/src/extraction/motif.ts
- [X] T054 [US4] Add motif detection exports to packages/algorithms/src/extraction/index.ts
- [X] T055 [US4] Update packages/algorithms/src/index.ts to export motif detection functions

**Checkpoint**: At this point, User Stories 1-4 should all work independently (can detect co-citation patterns in extracted ego networks)

---

## Phase 7: User Story 5 - Dense Collaboration Cluster Extraction (K-Truss) (Priority: P3)

**Goal**: Extract k-truss subgraphs to find tightly coupled research communities with stronger cohesion than k-core

**Independent Test**: Extract k-truss from known graph and verify every edge participates in at least k-2 triangles

### Tests for User Story 5

> **NAMING**: Tests MUST follow pattern `foo.[type].test.ts` where type = unit/integration/component/e2e/performance

- [X] T056 [P] [US5] Unit test: 3-truss extraction in packages/algorithms/__tests__/extraction/truss.unit.test.ts
- [X] T057 [P] [US5] Unit test: 4-truss extraction in packages/algorithms/__tests__/extraction/truss.unit.test.ts
- [X] T058 [P] [US5] Unit test: k=1 edge case (all edges) in packages/algorithms/__tests__/extraction/truss.unit.test.ts
- [X] T059 [P] [US5] Unit test: k > max truss number (empty result) in packages/algorithms/__tests__/extraction/truss.unit.test.ts
- [X] T060 [P] [US5] Unit test: triangle support computation in packages/algorithms/__tests__/extraction/truss.unit.test.ts
- [X] T061 [P] [US5] Performance test: k=3 truss on 1000-node graph <3s in packages/algorithms/__tests__/extraction/truss.performance.test.ts

### Implementation for User Story 5

- [X] T062 [US5] Implement computeTriangleSupport() utility in packages/algorithms/src/extraction/truss.ts
- [X] T063 [US5] Implement extractKTruss() in packages/algorithms/src/extraction/truss.ts
- [X] T064 [US5] Add k-truss exports to packages/algorithms/src/extraction/index.ts
- [X] T065 [US5] Update packages/algorithms/src/index.ts to export k-truss functions

**Checkpoint**: All 5 user stories should now be independently functional (can extract dense clusters from filtered ego networks)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T066 [P] Add comprehensive JSDoc comments to all extraction functions
- [X] T067 [P] Create integration tests combining multiple extraction operations in packages/algorithms/__tests__/integration/extraction-workflows.integration.test.ts
- [X] T068 [P] Add edge case tests for empty/single-node graphs in packages/algorithms/__tests__/edge-cases/extraction-edge-cases.test.ts
- [X] T069 [P] Memory validation: ensure 10k-node operations stay under 50MB in packages/algorithms/__tests__/performance/extraction-memory.performance.test.ts
- [X] T070 Update packages/algorithms/README.md with extraction examples
- [X] T071 Run pnpm typecheck in packages/algorithms (verify strict TypeScript compliance)
- [X] T072 Run pnpm test in packages/algorithms (verify all tests pass serially)
- [X] T073 Run pnpm lint in packages/algorithms (verify ESLint compliance)
- [X] T074 Run pnpm build in packages/algorithms (verify production build succeeds)
- [X] T075 Constitution compliance verification:
  - [X] No `any` types in implementation (Type Safety)
  - [X] All tests written before implementation (Test-First)
  - [X] Proper Nx workspace structure used (Monorepo Architecture)
  - [X] No storage operations (Storage Abstraction: N/A)
  - [X] Performance requirements met (<500ms, <2s, <3s targets); serial test execution (Performance & Memory)
  - [X] Atomic conventional commits created after each task (Atomic Conventional Commits)
  - [X] Breaking changes acceptable; no backwards compatibility (Development-Stage Pragmatism)
  - [X] Bug regression tests written before fixes if bugs found (Test-First Bug Fixes)
  - [X] All packages pass typecheck/test/lint/build (Deployment Readiness)
  - [X] Continuous execution from planning through implementation (Continuous Execution)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P1 → P2 → P2 → P3)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Independent, can combine with US1
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Independent, can combine with US1/US2
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Uses triangles from motif detection, can combine with US1-US3
- **User Story 5 (P3)**: Can start after Foundational (Phase 2) - Uses triangle support, can combine with US1-US4

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Multiple test files can be created in parallel (all marked [P])
- Implementation tasks follow dependencies noted in task descriptions
- Each user story completes before moving to next priority (verify checkpoint)

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Multiple implementation tasks within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test: radius-1 ego network extraction in packages/algorithms/__tests__/extraction/ego-network.unit.test.ts"
Task: "Unit test: radius-2 ego network extraction in packages/algorithms/__tests__/extraction/ego-network.unit.test.ts"
Task: "Unit test: multi-source ego network extraction in packages/algorithms/__tests__/extraction/ego-network.unit.test.ts"
Task: "Unit test: disconnected graph handling in packages/algorithms/__tests__/extraction/ego-network.unit.test.ts"
Task: "Unit test: invalid seed node error in packages/algorithms/__tests__/extraction/ego-network.unit.test.ts"
Task: "Unit test: invalid radius error in packages/algorithms/__tests__/extraction/ego-network.unit.test.ts"
Task: "Performance test: radius-3 on 1000-node graph <500ms in packages/algorithms/__tests__/extraction/ego-network.performance.test.ts"

# After tests fail, implement functions (some parallel):
# (T015, T016, T017 can be worked on concurrently in different parts of same file)
```

## Parallel Example: User Story 4

```bash
# Launch all tests for User Story 4 together:
Task: "Unit test: triangle detection in known graph in packages/algorithms/__tests__/extraction/motif.unit.test.ts"
Task: "Unit test: in-star pattern detection in packages/algorithms/__tests__/extraction/motif.unit.test.ts"
Task: "Unit test: out-star pattern detection in packages/algorithms/__tests__/extraction/motif.unit.test.ts"
Task: "Unit test: co-citation pair detection in packages/algorithms/__tests__/extraction/motif.unit.test.ts"
Task: "Unit test: bibliographic coupling detection in packages/algorithms/__tests__/extraction/motif.unit.test.ts"

# After tests fail, implement functions in parallel:
Task: "Implement detectTriangles() in packages/algorithms/src/extraction/motif.ts"
Task: "Implement detectStarPatterns() in packages/algorithms/src/extraction/motif.ts"
Task: "Implement detectCoCitations() in packages/algorithms/src/extraction/motif.ts"
Task: "Implement detectBibliographicCoupling() in packages/algorithms/src/extraction/motif.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only - Both P1)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T007) - CRITICAL checkpoint
3. Complete Phase 3: User Story 1 (T008-T019)
4. **STOP and VALIDATE**: Test ego network extraction independently
5. Complete Phase 4: User Story 2 (T020-T031)
6. **STOP and VALIDATE**: Test filtering independently, then combined with ego networks
7. Deploy/demo MVP (citation context exploration with filtering)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (ego networks MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (add filtering)
4. Add User Story 3 → Test independently → Deploy/Demo (add path analysis)
5. Add User Story 4 → Test independently → Deploy/Demo (add motif detection)
6. Add User Story 5 → Test independently → Deploy/Demo (add k-truss)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (ego networks)
   - Developer B: User Story 2 (filtering)
   - Developer C: User Story 3 (path analysis)
   - Developer D: User Story 4 (motif detection)
   - Developer E: User Story 5 (k-truss)
3. Stories complete and integrate independently
4. Integration testing validates combinations work together

---

## Task Summary

**Total Tasks**: 75 tasks
- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundational): 3 tasks
- Phase 3 (US1 - Ego Networks): 12 tasks (7 tests + 5 implementation)
- Phase 4 (US2 - Filtering): 12 tasks (7 tests + 5 implementation)
- Phase 5 (US3 - Path Analysis): 11 tasks (7 tests + 4 implementation)
- Phase 6 (US4 - Motif Detection): 13 tasks (7 tests + 6 implementation)
- Phase 7 (US5 - K-Truss): 10 tasks (6 tests + 4 implementation)
- Phase 8 (Polish): 10 tasks

**Parallel Opportunities**: 54 tasks marked [P] can run in parallel with others

**Independent Test Criteria**:
- US1: Provide seed + radius → verify k-hop subgraph correctness
- US2: Apply filter → verify only matching nodes/edges in result
- US3: Find path between nodes → verify minimal length
- US4: Detect patterns → verify all motifs found in known graph
- US5: Extract k-truss → verify every edge in k-2 triangles

**MVP Scope**: User Stories 1 & 2 (both P1) = 24 implementation tasks

---

## Notes

- [P] tasks = different files or independent sections, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **Test-first REQUIRED**: Write all tests for a story, verify they fail, then implement
- **Test naming REQUIRED**: `foo.[type].test.ts` pattern (e.g., `ego-network.unit.test.ts`)
- Commit after each task or logical group per constitution
- Stop at any checkpoint to validate story independently
- Performance targets: <500ms (ego), <2s (triangles), <3s (k-truss) for 1000-node graphs
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
