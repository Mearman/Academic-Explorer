# Tasks: Algorithms Package

**Input**: Design documents from `/specs/024-algorithms-package/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/algorithms.ts

**Tests**: Tests are REQUIRED per SC-003 (100% test coverage) and SC-005 (edge case handling)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Package initialization and basic structure

- [X] T001 Create package directory structure at `packages/algorithms/` with src/, __tests__/ subdirectories
- [X] T002 Create package.json with name "@academic-explorer/algorithms", zero dependencies, TypeScript 5.x
- [X] T003 [P] Create tsconfig.json with strict mode enabled (strict: true, strictNullChecks: true, noImplicitAny: false)
- [X] T004 [P] Create vite.config.ts for build configuration (ES modules, library mode)
- [X] T005 [P] Create project.json for Nx integration with build/test/lint targets
- [X] T006 [P] Create README.md with package overview and quick start guide
- [X] T007 Add @academic-explorer/algorithms path alias to tsconfig.base.json in workspace root
- [X] T008 Create .gitignore for dist/, coverage/, .nx/ directories

**Checkpoint**: Package structure initialized

---

## Phase 2: Foundational (Core Types - Blocking Prerequisites)

**Purpose**: Core type system that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Foundational Tests

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**
> **NAMING**: Tests follow pattern `foo.unit.test.ts`

- [X] T009 [P] Unit test for Result type in `__tests__/types/result.unit.test.ts`
- [X] T010 [P] Unit test for Option type in `__tests__/types/option.unit.test.ts`
- [X] T011 [P] Unit test for Graph class in `__tests__/graph/graph.unit.test.ts`

### Foundational Implementation

- [X] T012 [P] Implement Result<T, E> discriminated union in `src/types/result.ts`
- [X] T013 [P] Implement Option<T> discriminated union in `src/types/option.ts`
- [X] T014 [P] Define GraphError discriminated union variants in `src/types/errors.ts`
- [X] T015 [P] Define Node and Edge interfaces in `src/types/graph.ts`
- [X] T016 [P] Define TraversalResult<N> interface in `src/types/algorithm-results.ts`
- [X] T017 [P] Define Path<N, E> interface in `src/types/algorithm-results.ts`
- [X] T018 [P] Define Component<N> interface in `src/types/algorithm-results.ts`
- [X] T019 [P] Define CycleInfo interface in `src/types/algorithm-results.ts`
- [X] T020 Implement Graph<N, E> class with adjacency list in `src/graph/graph.ts`
- [X] T021 Implement Graph.addNode() with duplicate detection returning Result<void, DuplicateNodeError> in `src/graph/graph.ts`
- [X] T022 Implement Graph.addEdge() with validation in `src/graph/graph.ts`
- [X] T023 [P] Implement Graph.hasNode(), getNode(), getNeighbors() in `src/graph/graph.ts`
- [X] T024 [P] Implement Graph.removeNode(), removeEdge() in `src/graph/graph.ts`
- [X] T025 [P] Implement Graph.getNodeCount(), getEdgeCount(), isDirected() in `src/graph/graph.ts`
- [X] T026 [P] Create input validation utilities in `src/utils/validators.ts`
- [X] T027 [P] Create type guard utilities in `src/utils/type-guards.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Basic Graph Traversal (Priority: P1) 🎯 MVP

**Goal**: Enable developers to traverse academic entity graphs using DFS and BFS algorithms

**Independent Test**: Create simple graph, run DFS/BFS, verify node visit order matches expected traversal patterns

### Acceptance Scenarios (from spec.md):
1. Graph with 10 connected nodes → DFS returns all nodes visited exactly once in depth-first order
2. Graph with disconnected components → BFS returns only nodes in starting component
3. Cyclic graph → Traversal terminates without infinite loops
4. Empty graph → Traversal returns empty node list

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T028 [P] [US1] Unit test for DFS algorithm in `__tests__/traversal/dfs.unit.test.ts`
- [X] T029 [P] [US1] Performance test for DFS (1000 nodes <100ms) in `__tests__/traversal/dfs.performance.test.ts`
- [X] T030 [P] [US1] Unit test for BFS algorithm in `__tests__/traversal/bfs.unit.test.ts`
- [X] T031 [P] [US1] Performance test for BFS (1000 nodes <100ms) in `__tests__/traversal/bfs.performance.test.ts`

### Implementation for User Story 1

- [X] T032 [P] [US1] Implement DFS algorithm (iterative with visited set) in `src/traversal/dfs.ts`
- [X] T033 [P] [US1] Implement BFS algorithm (queue-based) in `src/traversal/bfs.ts`
- [X] T034 [US1] Add DFS/BFS exports to `src/index.ts`
- [X] T035 [US1] Verify all US1 tests pass (4 tests: 2 unit + 2 performance)

**Checkpoint**: User Story 1 complete - DFS and BFS fully functional and tested

---

## Phase 4: User Story 2 - Path Finding (Priority: P2)

**Goal**: Enable developers to find shortest paths between academic entities using weighted graphs

**Independent Test**: Create weighted graph, find shortest path, verify returned path has minimum total weight

### Acceptance Scenarios (from spec.md):
1. Multiple paths between nodes → Returns path with fewest edges (unweighted)
2. Weighted graph → Returns path with minimum total edge weight
3. Disconnected nodes → Returns None indicating no path exists
4. Negative edge weights → Returns Err(NegativeWeightError)

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T036 [P] [US2] Unit test for priority queue in `__tests__/pathfinding/priority-queue.unit.test.ts`
- [X] T037 [P] [US2] Unit test for Dijkstra algorithm in `__tests__/pathfinding/dijkstra.unit.test.ts`
- [X] T038 [P] [US2] Performance test for Dijkstra (500 nodes, 2000 edges <200ms) in `__tests__/pathfinding/dijkstra.performance.test.ts`

### Implementation for User Story 2

- [X] T039 [P] [US2] Implement MinHeap priority queue in `src/pathfinding/priority-queue.ts`
- [X] T040 [US2] Implement Dijkstra's algorithm with negative weight detection in `src/pathfinding/dijkstra.ts`
- [X] T041 [US2] Add Dijkstra exports to `src/index.ts`
- [X] T042 [US2] Verify all US2 tests pass (3 tests: 2 unit + 1 performance)

**Checkpoint**: User Stories 1 AND 2 complete - Traversal and pathfinding both functional

---

## Phase 5: User Story 3 - Graph Analysis (Priority: P3)

**Goal**: Enable developers to analyze graph properties (components, cycles, topological ordering)

**Independent Test**: Create graphs with known properties, run analysis algorithms, verify detected properties match expectations

### Acceptance Scenarios (from spec.md):
1. Graph with 3 disconnected subgraphs → Connected components returns exactly 3 components
2. DAG → Topological sort returns valid ordering where all edges point forward
3. Cyclic graph → Topological sort returns Err(CycleDetectedError) with cycle information
4. Directed graph with SCCs → SCC algorithm correctly groups nodes into SCCs

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T043 [P] [US3] Unit test for topological sort in `__tests__/analysis/topological-sort.unit.test.ts`
- [X] T044 [P] [US3] Unit test for cycle detection in `__tests__/analysis/cycle-detection.unit.test.ts`
- [X] T045 [P] [US3] Unit test for connected components in `__tests__/analysis/connected-components.unit.test.ts`
- [X] T046 [P] [US3] Unit test for SCC (Tarjan's algorithm) in `__tests__/analysis/scc.unit.test.ts`

### Implementation for User Story 3

- [X] T047 [P] [US3] Implement topological sort algorithm in `src/analysis/topological-sort.ts`
- [X] T048 [P] [US3] Implement cycle detection algorithm in `src/analysis/cycle-detection.ts`
- [X] T049 [P] [US3] Implement connected components algorithm in `src/analysis/connected-components.ts`
- [X] T050 [P] [US3] Implement strongly connected components (Tarjan's) in `src/analysis/scc.ts`
- [X] T051 [US3] Add analysis algorithm exports to `src/index.ts`
- [X] T052 [US3] Verify all US3 tests pass (4 tests)

**Checkpoint**: All user stories complete - Full algorithm suite functional

---

## Phase 6: Integration & Polish

**Purpose**: Cross-cutting concerns, integration validation, and quality verification

### Integration Testing

- [X] T053 [P] Create integration test combining multiple algorithms in `__tests__/integration/algorithms.integration.test.ts`
- [X] T054 [P] Create heterogeneous graph integration test (WorkNode | AuthorNode) in `__tests__/integration/heterogeneous-graph.integration.test.ts`

### Edge Case Testing

- [X] T055 [P] Create edge case test suite for empty graphs in `__tests__/edge-cases/empty-graph.test.ts`
- [X] T056 [P] Create edge case test suite for single-node graphs in `__tests__/edge-cases/single-node.test.ts`
- [X] T057 [P] Create edge case test suite for self-loops and multi-edges in `__tests__/edge-cases/special-edges.test.ts`

### Performance Validation

- [X] T058 Validate memory usage <100MB for 10,000 nodes with 50,000 edges (SC-007)
- [X] T059 Validate all algorithms meet performance targets from success criteria

### Documentation & Polish

- [X] T060 [P] Add JSDoc comments with time/space complexity to all algorithm functions
- [X] T061 [P] Create usage examples in README.md for all 8 algorithms
- [X] T062 [P] Add package description and keywords to package.json
- [X] T063 [P] Create CHANGELOG.md with initial release notes

### Build & CI Integration

- [X] T064 Verify `pnpm build` succeeds for algorithms package
- [X] T065 Verify all existing packages still build successfully (no regressions)
- [X] T066 Run full test suite with `pnpm test` and verify 100% pass rate
- [X] T067 Verify TypeScript compilation with zero errors (`pnpm typecheck`)

### Constitution Compliance Verification

- [X] T068 Verify no `any` types in implementation (Type Safety - Principle I)
- [X] T069 Verify all tests written before implementation (Test-First - Principle II)
- [X] T070 Verify proper Nx workspace structure used (Monorepo Architecture - Principle III)
- [X] T071 Verify zero internal dependencies, no re-exports (Monorepo Architecture - Principle III)
- [X] T072 Verify N/A for storage operations (Storage Abstraction - Principle IV)
- [X] T073 Verify performance requirements met per success criteria (Performance & Memory - Principle V)
- [X] T074 Verify atomic conventional commits created (Atomic Conventional Commits - Principle VI)
- [X] T075 Review commit history for proper scopes: feat(algorithms), test(algorithms), docs(algorithms)

**Checkpoint**: Package ready for production use

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) - MVP priority
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) - Independent of US1
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) - Independent of US1, US2
- **Integration & Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories (fully independent)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - No dependencies on other stories (fully independent)

**Key Insight**: After Phase 2 completes, all 3 user stories can be implemented IN PARALLEL by different developers

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Unit tests can run in parallel (marked [P])
- Performance tests can run in parallel (marked [P])
- Algorithm implementations can run in parallel if in different files (marked [P])
- Export additions are sequential (depend on implementations)

### Parallel Opportunities

#### Phase 1 (Setup)
- T003, T004, T005, T006 can all run in parallel (different files)

#### Phase 2 (Foundational)
- All 3 test files (T009, T010, T011) can run in parallel
- All type definitions (T012-T019) can run in parallel
- All Graph utility methods (T023, T024, T025, T026, T027) can run in parallel

#### Phase 3 (User Story 1)
- All 4 test files (T028, T029, T030, T031) can run in parallel
- Both algorithm implementations (T032, T033) can run in parallel

#### Phase 4 (User Story 2)
- All 3 test files (T036, T037, T038) can run in parallel
- MinHeap and Dijkstra (T039, T040) can run in parallel

#### Phase 5 (User Story 3)
- All 4 test files (T043, T044, T045, T046) can run in parallel
- All 4 algorithm implementations (T047, T048, T049, T050) can run in parallel

#### Phase 6 (Integration & Polish)
- All integration tests (T053, T054) can run in parallel
- All edge case tests (T055, T056, T057) can run in parallel
- All documentation tasks (T060, T061, T062, T063) can run in parallel

---

## Parallel Example: User Story 1

**After Phase 2 completes, launch all User Story 1 tasks in parallel:**

```bash
# Launch all 4 tests together:
Task T028: "Unit test for DFS algorithm in __tests__/traversal/dfs.unit.test.ts"
Task T029: "Performance test for DFS in __tests__/traversal/dfs.performance.test.ts"
Task T030: "Unit test for BFS algorithm in __tests__/traversal/bfs.unit.test.ts"
Task T031: "Performance test for BFS in __tests__/traversal/bfs.performance.test.ts"

# Then launch both implementations in parallel:
Task T032: "Implement DFS algorithm in src/traversal/dfs.ts"
Task T033: "Implement BFS algorithm in src/traversal/bfs.ts"

# Sequential: Add exports (depends on implementations)
Task T034: "Add DFS/BFS exports to src/index.ts"

# Verify: All tests pass
Task T035: "Verify all US1 tests pass"
```

---

## Parallel Example: All User Stories After Foundation

**Maximum parallelization with 3 developers:**

```bash
# After Phase 2 completes, assign one user story per developer:

Developer A (User Story 1):
  - T028-T035 (DFS, BFS)

Developer B (User Story 2):
  - T036-T042 (Dijkstra, priority queue)

Developer C (User Story 3):
  - T043-T052 (Topological sort, cycle detection, connected components, SCC)

# All 3 developers can work simultaneously without conflicts
# Each story is independently testable when complete
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (8 tasks)
2. Complete Phase 2: Foundational (19 tasks) - CRITICAL blocker
3. Complete Phase 3: User Story 1 (8 tasks)
4. **STOP and VALIDATE**: Test DFS/BFS independently
5. Deploy/demo if ready
6. **Total for MVP**: 35 tasks

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready (27 tasks)
2. Add User Story 1 (Phase 3) → Test independently → Deploy/Demo (MVP!) (35 tasks total)
3. Add User Story 2 (Phase 4) → Test independently → Deploy/Demo (42 tasks total)
4. Add User Story 3 (Phase 5) → Test independently → Deploy/Demo (52 tasks total)
5. Add Integration & Polish (Phase 6) → Production ready (75 tasks total)

Each increment adds measurable value and can be independently deployed.

### Parallel Team Strategy

With 3 developers available:

1. **Phase 1 (Setup)**: Team collaborates (8 tasks, ~1-2 hours)
2. **Phase 2 (Foundational)**: Team parallelizes on different files (19 tasks, ~4-6 hours)
3. **Phase 3-5 (User Stories)**: Each developer takes one story:
   - Developer A: User Story 1 (8 tasks, ~3-4 hours)
   - Developer B: User Story 2 (7 tasks, ~3-4 hours)
   - Developer C: User Story 3 (10 tasks, ~4-5 hours)
4. **Phase 6 (Integration)**: Team collaborates on polish (23 tasks, ~3-4 hours)

**Total estimated time with 3 developers**: ~15-20 hours of development work

---

## Task Summary

**Total Tasks**: 75

### By Phase:
- Phase 1 (Setup): 8 tasks
- Phase 2 (Foundational): 19 tasks
- Phase 3 (User Story 1 - P1): 8 tasks 🎯 MVP
- Phase 4 (User Story 2 - P2): 7 tasks
- Phase 5 (User Story 3 - P3): 10 tasks
- Phase 6 (Integration & Polish): 23 tasks

### By User Story:
- User Story 1 (Basic Graph Traversal): 8 tasks (4 tests + 4 implementation)
- User Story 2 (Path Finding): 7 tasks (3 tests + 4 implementation)
- User Story 3 (Graph Analysis): 10 tasks (4 tests + 6 implementation)

### Parallelization:
- 48 tasks marked [P] for parallel execution
- 27 tasks sequential (dependencies on previous tasks)
- Maximum parallelization: 3 user stories can run simultaneously after Phase 2

### MVP Scope:
- Phases 1-3 only (Setup + Foundation + User Story 1)
- 35 tasks total
- Delivers DFS and BFS algorithms with full test coverage
- Estimated 8-12 hours with single developer

---

## Success Criteria Mapping

Each task contributes to specific success criteria from spec.md:

- **SC-001** (Traversal <100ms for 1000 nodes): T029, T031 (performance tests)
- **SC-002** (Pathfinding <200ms for 500 nodes): T038 (performance test)
- **SC-003** (100% test coverage): T028-T031, T036-T038, T043-T046, T053-T057
- **SC-004** (Zero integration friction): T064, T065 (build verification)
- **SC-005** (Edge case handling): T055-T057 (edge case tests)
- **SC-006** (Runnable examples): T061 (README examples)
- **SC-007** (Memory <100MB for 10k nodes): T058 (memory validation)
- **SC-008** (Clean CI build): T064-T067 (build + typecheck)
- **SC-009** (Type narrowing works): T014-T018 (discriminated union types)
- **SC-010** (Exhaustive pattern matching): T012-T014 (Result/Option types)
- **SC-011** (Zero exceptions): All algorithm implementations use Result/Option
- **SC-012** (Duplicate node handling): T021 (addNode with DuplicateNodeError)

---

## Format Validation

✅ All 75 tasks follow the required checklist format:
- Checkbox: `- [ ]`
- Task ID: Sequential (T001-T075)
- [P] marker: 48 tasks marked as parallelizable
- [Story] label: 25 tasks labeled with US1, US2, or US3
- Description: Clear action with exact file path

✅ All user story tasks include story labels (US1, US2, US3)
✅ Setup and Foundational tasks correctly have NO story labels
✅ All task descriptions include specific file paths

---

## Notes

- Tests use naming pattern: `foo.unit.test.ts`, `foo.performance.test.ts`, `foo.integration.test.ts`
- All tests must be written FIRST and FAIL before implementation
- User stories are independent - can be implemented in any order after Phase 2
- Commit after each task or logical group (e.g., all tests for a story)
- Use conventional commit scopes: `feat(algorithms)`, `test(algorithms)`, `docs(algorithms)`
- Stop at any checkpoint to validate story independently
- Zero internal dependencies enforced - package must not import from other `@academic-explorer/*` packages
