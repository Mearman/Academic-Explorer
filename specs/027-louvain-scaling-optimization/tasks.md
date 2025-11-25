# Tasks: Louvain Algorithm Scaling Optimization

**Input**: Design documents from `/specs/027-louvain-scaling-optimization/`
**Prerequisites**: plan.md (technical context), spec.md (user stories), research.md (optimization decisions), data-model.md (type definitions), contracts/ (API contract)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each optimization phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Monorepo package: `packages/algorithms/`
- Implementation: `packages/algorithms/src/clustering/louvain.ts`
- Tests: `packages/algorithms/__tests__/clustering/louvain.test.ts`
- Performance benchmarks: `packages/algorithms/__tests__/performance/louvain-scaling.performance.test.ts`
- CSR utilities (Phase 3 only): `packages/algorithms/src/utils/csr.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify existing baseline and establish performance benchmarking infrastructure

- [X] T001 Verify existing Louvain implementation in packages/algorithms/src/clustering/louvain.ts
- [X] T002 Run existing Louvain test suite and confirm 8/9 tests passing (1 performance test failing as expected)
- [X] T003 Create performance benchmark file packages/algorithms/__tests__/performance/louvain-scaling.performance.test.ts with baseline measurements (100, 500, 1000 node graphs)
- [X] T004 Document baseline performance metrics: 18-19s for 1000 nodes, modularity ~0.37, scaling ratio 122-310x (vs target <66.44x)

**Checkpoint**: Baseline established - optimization can begin

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add configuration types and helper functions that all optimization phases will use

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Add LouvainConfiguration interface to packages/algorithms/src/types/clustering-types.ts (mode, seed, minModularityIncrease, maxIterations fields)
- [X] T006 Add LouvainResult interface to packages/algorithms/src/types/clustering-types.ts (communities, modularity, levels, metadata fields)
- [X] T007 Update detectCommunities() function signature in packages/algorithms/src/clustering/louvain.ts to accept optional config parameter (mode, seed fields)
- [X] T008 Add getAdaptiveThreshold(nodeCount: number): number helper function to packages/algorithms/src/clustering/louvain.ts (1e-5 for >500 nodes, 1e-6 otherwise)
- [X] T009 Add getAdaptiveIterationLimit(nodeCount: number, level: number): number helper function to packages/algorithms/src/clustering/louvain.ts (20 for large graphs level 0, 40-50 otherwise)

**Checkpoint**: ✅ Configuration infrastructure ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Quick Performance Wins (Priority: P1) 🎯 MVP

**Goal**: Reduce 1000-node runtime from 15.4s to ~11s (40% speedup) through parameter tuning

**Independent Test**: Run performance benchmark for 1000-node graph. Verify completion time 8-11s with modularity ≥0.2. All 9 existing tests must pass.

### Implementation for User Story 1

- [X] T010 [US1] Implement adaptive threshold scaling: call getAdaptiveThreshold() in louvain.ts modularity convergence check
- [X] T011 [US1] Implement progressive tolerance reduction in louvain.ts hierarchy loop: tolerance = level === 0 ? 0.01 : Math.max(0.01 * Math.pow(0.1, level), 1e-6)
- [X] T012 [US1] Implement reduced iteration limits: call getAdaptiveIterationLimit() in louvain.ts local moving phase instead of fixed 40-50
- [X] T013 [US1] Implement early convergence detection in louvain.ts local moving loop: track consecutiveZeroMoves, exit after 2 rounds for nodeCount >500
- [X] T014 [US1] Add runtime tracking to louvain.ts: record performance.now() start/end, include in LouvainResult.metadata
- [X] T015 [US1] Add iteration count tracking to louvain.ts: accumulate across hierarchy levels, include in LouvainResult.metadata
- [X] T016 [US1] Update performance benchmark to verify Phase 1 targets: 8-11s runtime, modularity ≥0.2, all existing tests pass
- [X] T017 [US1] Run existing test suite and verify 9/9 tests still pass with Phase 1 optimizations
- [X] T018 [US1] Create atomic commit for Phase 1: "perf(algorithms): optimize Louvain with threshold scaling and iteration limits"
- [X] T019 [US1] Update spec.md with Phase 1 implementation status

**Checkpoint**: ✅ Phase 3 complete - 70.6% speedup achieved (exceeded 40% target), all tests passing

---

## Phase 4: User Story 2 - Medium Impact Optimizations (Priority: P2)

**Goal**: Reduce 1000-node runtime from ~11s to 3-5s (2-3x additional speedup) through Fast Louvain and altered communities

**Independent Test**: Run performance benchmark with mode="random". Verify 3-5s runtime with modularity ≥0.19. Verify mode="best" still achieves ~11s with modularity ≥0.2.

### Implementation for User Story 2

#### Fast Louvain Random Mode

- [X] T020 [P] [US2] Add determineOptimalMode(nodeCount: number): "best" | "random" helper to louvain.ts (best for <200, random for ≥500)
- [X] T021 [P] [US2] Add shuffle(array: T[], seed?: number): T[] utility function to louvain.ts (Fisher-Yates shuffle with optional PRNG seed)
- [X] T022 [US2] Refactor neighbor selection logic in louvain.ts local moving phase: branch on mode (best vs random)
- [X] T023 [US2] Implement best-neighbor mode in louvain.ts: evaluate all neighbors, select max ΔQ (existing behavior)
- [X] T024 [US2] Implement random-neighbor mode in louvain.ts: shuffle neighbors, accept first positive ΔQ
- [X] T025 [US2] Implement auto mode resolution in louvain.ts entry point: resolvedMode = config?.mode === "auto" ? determineOptimalMode(nodeCount) : (config?.mode ?? "auto")

#### Altered Communities Heuristic

- [X] T026 [P] [US2] Add AlteredCommunitiesState interface to packages/algorithms/src/types/clustering-types.ts (alteredCommunities: Set<number>)
- [X] T027 [US2] Add getNodesToVisit(alteredState, communities, graph): Set<string> helper to louvain.ts (returns nodes in altered communities + their neighbors)
- [X] T028 [US2] Initialize altered communities state in louvain.ts local moving phase: alteredState = { alteredCommunities: new Set(all community IDs) } before first iteration
- [X] T029 [US2] Update iteration loop in louvain.ts: nodesToVisit = iter === 0 ? allNodes : getNodesToVisit(alteredState, communities, graph)
- [X] T030 [US2] Clear and repopulate altered communities in louvain.ts: alteredState.alteredCommunities.clear() at iteration start, add oldCommunity and newCommunity on each move
- [X] T031 [US2] Add early termination in louvain.ts: if (alteredState.alteredCommunities.size === 0) break

**Checkpoint**: ✅ Phase 4 complete - Tested but unsuitable for citation networks (commit 5c9818ce8)
**Result**: Random mode causes quality regression (Q: 0.37→0.05), slower convergence (103→201 iterations). Altered communities adds overhead (5.67s→11.33s). Both optimizations disabled. Phase 3 baseline (10-11s, Q=0.37) remains optimal.

### Verification for User Story 2

- [ ] T032 [US2] Add performance benchmark for best-neighbor mode: verify ~11s runtime, modularity ≥0.2
- [ ] T033 [US2] Add performance benchmark for random-neighbor mode: verify 3-5s runtime, modularity ≥0.19
- [ ] T034 [US2] Add performance benchmark for auto mode: verify correct threshold switching (best <200, random ≥500)
- [ ] T035 [US2] Verify altered communities reduces iterations: log nodesToVisit.size per iteration, confirm 20-40% reduction in later iterations
- [ ] T036 [US2] Run existing test suite and verify 9/9 tests still pass with Phase 2 optimizations
- [ ] T037 [US2] Add deterministic seed test: verify same graph + same seed = identical communities
- [ ] T038 [US2] Create atomic commit for Phase 2: "perf(algorithms): add Fast Louvain and altered communities"
- [ ] T039 [US2] Update spec.md with Phase 2 implementation status

**Checkpoint**: Phase 2 complete - 3-5s runtime achieved, quality vs speed trade-off validated

---

## Phase 5: User Story 3 - Data Structure Refactoring (Priority: P3)

**Goal**: Reduce 1000-node runtime from 3-5s to 1.5-2.5s (2x final speedup) through CSR representation and community caching

**Independent Test**: Maintain dual implementations (legacy + CSR). Run benchmark suite comparing both. CSR must match legacy modularity (±0.01) while achieving 2x speedup. Memory usage <100MB for 1000 nodes.

### CSR Graph Representation

- [ ] T040 [P] [US3] Create packages/algorithms/src/utils/csr.ts with CSRGraph<N, E> interface (offsets: Uint32Array, edges: Uint32Array, weights: Float64Array, nodeIds: string[], nodeIndex: Map<string, number>)
- [ ] T041 [P] [US3] Implement convertToCSR<N, E>(graph: Graph<N, E>): CSRGraph<N, E> function in csr.ts (build offsets, edges, weights, nodeIds, nodeIndex)
- [ ] T042 [US3] Add CSR conversion at louvain.ts entry point: csrGraph = convertToCSR(graph) with try-catch for memory errors
- [ ] T043 [US3] Implement CSR memory fallback in louvain.ts: catch RangeError, log warning, call louvainLegacy(graph, config)
- [ ] T044 [US3] Refactor neighbor access in louvain.ts local moving phase: use csrGraph.offsets[nodeIdx] to csrGraph.offsets[nodeIdx + 1] slice
- [ ] T045 [US3] Refactor neighbor weights in louvain.ts: use csrGraph.weights.slice(start, end) instead of Map lookups
- [ ] T046 [US3] Update all graph.getNeighbors() calls in louvain.ts to use CSR slicing pattern

### Community Hash Table Cache

- [ ] T047 [P] [US3] Add CommunityHashTable type to packages/algorithms/src/types/clustering-types.ts (Map<string, number>)
- [ ] T048 [P] [US3] Add communityKey(fromId: number, toId: number): string helper to louvain.ts (returns "${fromId}-${toId}")
- [ ] T049 [US3] Implement getCommunityEdgeWeight(cache, fromCommunity, toCommunity, csrGraph, communities): number in louvain.ts (lazy cache population)
- [ ] T050 [US3] Implement invalidateCommunityCache(cache, communityId): void in louvain.ts (delete all entries with fromId === communityId or toId === communityId)
- [ ] T051 [US3] Initialize community cache in louvain.ts local moving phase: cache = new Map<string, number>()
- [ ] T052 [US3] Update ΔQ calculation in louvain.ts: use getCommunityEdgeWeight(cache, ...) instead of recalculating edge sums
- [ ] T053 [US3] Add cache invalidation on node move in louvain.ts: call invalidateCommunityCache(cache, oldCommunity) and invalidateCommunityCache(cache, newCommunity)

### Verification for User Story 3

- [ ] T054 [P] [US3] Add CSR conversion unit tests in packages/algorithms/__tests__/utils/csr.unit.test.ts: verify offsets, edges, weights, nodeIds, nodeIndex correctness
- [ ] T055 [P] [US3] Add CSR correctness test: verify CSR topology matches original graph (all edges preserved)
- [ ] T056 [US3] Add cache correctness test in louvain.test.ts: verify ΔQ calculations with cache match non-cached results
- [ ] T057 [US3] Add memory benchmark in packages/algorithms/__tests__/performance/louvain-memory.performance.test.ts: verify <100MB for 1000 nodes
- [ ] T058 [US3] Add CSR performance benchmark: verify 1.5-2.5s runtime for 1000 nodes with modularity ≥0.19
- [ ] T059 [US3] Add dual implementation comparison test: verify CSR results match legacy results (±0.01 modularity)
- [ ] T060 [US3] Add stress test for 5000-node graph: verify CSR handles large graphs without memory exhaustion
- [ ] T061 [US3] Add cache hit rate profiling: verify >80% cache hits after first iteration
- [ ] T062 [US3] Run existing test suite and verify 9/9 tests still pass with Phase 3 optimizations
- [ ] T063 [US3] Create atomic commit for Phase 3: "perf(algorithms): refactor Louvain to CSR with community caching"
- [ ] T064 [US3] Update spec.md with Phase 3 implementation status

**Checkpoint**: Phase 3 complete - 1.5-2.5s runtime achieved, matching graphology performance target

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and final quality checks

- [ ] T065 [P] Update packages/algorithms/README.md with Louvain optimization details (3 phases, performance targets, configuration options)
- [ ] T066 [P] Add API documentation for LouvainConfiguration in packages/algorithms/src/types/clustering-types.ts (JSDoc comments for all fields)
- [ ] T067 [P] Add API documentation for helper functions in louvain.ts (getAdaptiveThreshold, getAdaptiveIterationLimit, determineOptimalMode)
- [ ] T068 Verify quickstart.md instructions in specs/027-louvain-scaling-optimization/quickstart.md: follow Phase 1-3 steps, confirm results match success criteria
- [ ] T069 Run full quality pipeline: pnpm typecheck && pnpm lint && pnpm test && pnpm build
- [ ] T070 Constitution compliance verification:
  - [ ] No `any` types in implementation (Type Safety) ✅
  - [ ] Performance benchmarks written and passing (Test-First) ✅
  - [ ] Changes isolated to packages/algorithms (Monorepo Architecture) ✅
  - [ ] N/A - algorithm operates on in-memory graphs only (Storage Abstraction) ✅
  - [ ] Performance targets met: <12s Phase 1, <5s Phase 2, <2.5s Phase 3 (Performance & Memory) ✅
  - [ ] 3 atomic commits created (Atomic Conventional Commits) ✅
  - [ ] Configuration API documented, breaking changes acceptable (Development-Stage Pragmatism) ✅
  - [ ] All existing tests passing, no regressions (Test-First Bug Fixes) ✅
  - [ ] pnpm verify passes (Deployment Readiness) ✅
  - [ ] All 3 phases implemented sequentially (Continuous Execution) ✅
- [ ] T071 Update CLAUDE.md with spec 027 completion status and optimization details
- [ ] T072 Mark spec 027 as complete in specs/027-louvain-scaling-optimization/spec.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories MUST proceed sequentially (P1 → P2 → P3) due to incremental optimization approach
  - Each phase builds on previous phase's performance gains
- **Polish (Phase 6)**: Depends on all 3 user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - Quick Wins)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2 - Medium Impact)**: DEPENDS on User Story 1 completion - Builds on Phase 1 optimizations
- **User Story 3 (P3 - CSR Refactoring)**: DEPENDS on User Story 2 completion - Refactors Phase 2 implementation to CSR

### Within Each User Story

- Helper functions before implementation
- Implementation before verification
- Performance benchmarks after implementation
- Test suite verification before commit
- Atomic commit before moving to next phase

### Parallel Opportunities

- **Setup tasks** (T001-T004): Can run in parallel
- **Foundational tasks** (T005-T009): T005-T006 can run in parallel (type definitions), T007-T009 sequential
- **Phase 2 - Fast Louvain** (T020-T021) and **Altered Communities** (T026-T027): These pairs can be implemented in parallel
- **Phase 3 - CSR** (T040-T041) and **Cache** (T047-T048): These pairs can be implemented in parallel
- **Documentation tasks** (T065-T067): Can run in parallel

---

## Parallel Example: User Story 2 (Fast Louvain + Altered Communities)

```bash
# Launch Fast Louvain helper functions in parallel:
Task: "Add determineOptimalMode helper to louvain.ts" (T020)
Task: "Add shuffle utility function to louvain.ts" (T021)

# After completion, launch Altered Communities type definitions in parallel:
Task: "Add AlteredCommunitiesState interface to clustering-types.ts" (T026)
Task: "Add getNodesToVisit helper to louvain.ts" (T027)
```

---

## Parallel Example: User Story 3 (CSR + Cache)

```bash
# Launch CSR utilities and cache types in parallel:
Task: "Create csr.ts with CSRGraph interface" (T040)
Task: "Implement convertToCSR function in csr.ts" (T041)
Task: "Add CommunityHashTable type to clustering-types.ts" (T047)
Task: "Add communityKey helper to louvain.ts" (T048)

# After completion, launch CSR tests and cache tests in parallel:
Task: "Add CSR conversion unit tests" (T054)
Task: "Add CSR correctness test" (T055)
Task: "Add cache correctness test" (T056)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T009) - CRITICAL
3. Complete Phase 3: User Story 1 (T010-T019)
4. **STOP and VALIDATE**: Run performance benchmark, verify 8-11s runtime with modularity ≥0.2
5. Commit and tag as "Phase 1 Complete"

### Incremental Delivery

1. Complete Setup + Foundational → Configuration ready
2. Add User Story 1 → 40% speedup (15.4s → ~11s) → Commit
3. Add User Story 2 → 67-80% improvement (15.4s → 3-5s) → Commit
4. Add User Story 3 → 84-90% improvement (15.4s → 1.5-2.5s) → Commit
5. Each phase adds performance without breaking tests

### Sequential Phase Strategy

Due to incremental optimization approach:

1. Team completes Setup + Foundational together
2. Complete User Story 1 (Quick Wins) → Verify → Commit
3. Complete User Story 2 (Medium Impact) → Verify → Commit
4. Complete User Story 3 (CSR Refactoring) → Verify → Commit
5. Complete Polish → Final validation

**Rationale**: Each phase builds on previous phase's implementation. Cannot implement Fast Louvain (Phase 2) without Phase 1 optimizations in place. Cannot refactor to CSR (Phase 3) without Phase 2 implementation complete.

---

## Notes

- [P] tasks = different files or independent helpers, no dependencies
- [Story] label maps task to specific user story for traceability
- Performance benchmarks are the primary verification method (not unit tests for every function)
- Each phase should independently improve performance without breaking existing tests
- Verify benchmarks pass before committing each phase
- Commit message format: "perf(algorithms): [description of optimization phase]"
- Constitution Principle X (Continuous Execution): Implement all 3 phases sequentially without pauses unless blocked by test failures
- Stop at each checkpoint to validate performance targets met before proceeding
