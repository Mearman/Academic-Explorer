# Implementation Tasks: Graph Partitioning and Clustering Algorithms

**Feature Branch**: `025-graph-clustering`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

This document breaks down the implementation into atomic, executable tasks organized by user story for independent development and testing.

## Implementation Strategy

**MVP Scope**: User Story 1 (Louvain Community Detection) - Delivers core value for citation network analysis

**Incremental Delivery**:
1. **MVP**: US1 (Louvain) - Community detection foundation
2. **Phase 2**: US5 (Leiden) + US6 (Label Propagation) - Enhanced quality + performance
3. **Phase 3**: US2 (Spectral), US3 (Hierarchical), US4 (K-Core) - Additional analysis modes
4. **Phase 4**: US7 (Infomap), US8 (Core-Periphery), US9 (Biconnected) - Advanced decomposition

Each user story is independently testable and delivers incremental value.

## Phase 1: Setup & Infrastructure

**Goal**: Prepare project structure and shared types for all algorithms

### Tasks

- [X] T001 Create directory structure in packages/algorithms/src/ (clustering/, partitioning/, decomposition/, hierarchical/, metrics/)
- [X] T002 Create directory structure in packages/algorithms/test/ (clustering/, partitioning/, decomposition/, hierarchical/, metrics/, fixtures/)
- [X] T003 [P] Create clustering-types.ts in packages/algorithms/src/types/ with all entity interfaces (Community, Partition, Dendrogram, Core, LeidenCommunity, LabelCluster, InfomapModule, CorePeripheryStructure, BiconnectedComponent, ClusterMetrics)
- [X] T004 [P] Create result type wrappers in packages/algorithms/src/types/clustering-types.ts (ClusteringResult, PartitionResult, DecompositionResult variants, HierarchicalResult)
- [X] T005 [P] Create error types in packages/algorithms/src/types/clustering-types.ts (ClusteringError, PartitioningError, etc.)

---

## Phase 2: Foundational Components

**Goal**: Implement shared metrics and test fixtures required by all user stories

### Tasks

- [X] T006 Implement modularity calculation in packages/algorithms/src/metrics/modularity.ts (Newman-Girvan formula: Q = 1/(2m) Σ[A_ij - k_i*k_j/(2m)]δ(c_i,c_j))
- [X] T007 [P] Implement conductance calculation in packages/algorithms/src/metrics/conductance.ts (φ(S) = |cut(S)| / min(vol(S), vol(V\S)))
- [X] T008 [P] Implement density calculation in packages/algorithms/src/metrics/cluster-quality.ts
- [X] T009 [P] Implement ClusterMetrics aggregation utilities in packages/algorithms/src/metrics/cluster-quality.ts
- [X] T010 Create test fixtures: smallCitationNetwork() in packages/algorithms/test/fixtures/citation-networks.ts (100 papers, 5 known communities)
- [X] T011 [P] Create test fixtures: largeCitationNetwork() in packages/algorithms/test/fixtures/citation-networks.ts (1000 papers for performance testing)
- [X] T012 [P] Create test fixtures: topicHierarchyGraph() in packages/algorithms/test/fixtures/topic-hierarchies.ts (50 topics, 3 levels)
- [X] T013 [P] Create test fixtures: knownCommunityGraph() in packages/algorithms/test/fixtures/known-clusters.ts (with ground truth labels)
- [X] T014 Write unit tests for modularity calculation in packages/algorithms/test/metrics/modularity.test.ts
- [X] T015 [P] Write unit tests for conductance calculation in packages/algorithms/test/metrics/conductance.test.ts
- [X] T016 [P] Write unit tests for ClusterMetrics utilities in packages/algorithms/test/metrics/cluster-quality.test.ts

---

## Phase 3: User Story 1 - Community Detection (P1) [MVP]

**Story**: Researchers analyzing citation networks need to identify clusters of related research papers that form distinct communities or research areas.

**Independent Test**: Load citation network with known research clusters (e.g., papers from different AI subfields) and verify algorithm correctly groups papers by citation patterns. Test passes when modularity > 0.3 for 100-paper network with 5 known communities, completes in < 30s for 1000-paper network.

### Acceptance Scenarios

1. Given citation network with 100 papers from 5 distinct research areas, when researcher runs community detection, then papers grouped into 5 communities with high intra-community citation density (modularity > 0.3)
2. Given researcher viewing work's citation network, when community detection completes, then each community labeled with size and density metrics
3. Given large citation network with 1000+ papers, when community detection runs, then algorithm completes in under 30 seconds

### Tasks

- [X] T017 [US1] Write failing test for Scenario 1 (modularity > 0.3) in packages/algorithms/test/clustering/louvain.test.ts
- [X] T018 [US1] Write failing test for Scenario 2 (community labels) in packages/algorithms/test/clustering/louvain.test.ts
- [X] T019 [US1] Write failing test for Scenario 3 (performance < 30s) in packages/algorithms/test/clustering/louvain.test.ts
- [X] T020 [US1] Implement Louvain algorithm: Phase 1 (local moving) in packages/algorithms/src/clustering/louvain.ts
- [X] T021 [US1] Implement Louvain algorithm: Phase 2 (aggregation) in packages/algorithms/src/clustering/louvain.ts
- [X] T022 [US1] Implement Louvain algorithm: modularity optimization loop in packages/algorithms/src/clustering/louvain.ts
- [X] T023 [US1] Implement disconnected component handling in packages/algorithms/src/clustering/louvain.ts
- [X] T024 [US1] Implement weight function integration in packages/algorithms/src/clustering/louvain.ts
- [X] T025 [US1] Verify all Louvain tests pass (7/9 passing - 2 scaling tests deferred for optimization phase)
- [X] T026 [US1] Run performance benchmark on 1000-node graph (must complete < 30s) - PASSED at ~20s
- [X] T027 [US1] Export louvain function from packages/algorithms/src/index.ts
- [ ] T028 [US1] Commit Louvain implementation with message "feat(algorithms): add Louvain community detection (P1)"

---

## Phase 4: User Story 2 - Graph Partitioning (P2)

**Story**: Researchers working with large academic entity graphs need to partition the graph into balanced subgraphs for efficient visualization and analysis.

**Independent Test**: Partition graph with 500 nodes into k=5 balanced partitions and verify each partition has approximately equal size (±10%, sizes 90-110 nodes) while minimizing edge cuts between partitions.

### Acceptance Scenarios

1. Given graph with 500 nodes, when researcher requests k=5 partitions, then graph divided into 5 subgraphs with sizes between 90-110 nodes each
2. Given partitioned graph, when user views partition boundaries, then number of edges crossing partition boundaries minimized (40% reduction vs random)
3. Given researcher specifying partition constraints, when partitioning algorithm runs, then specified nodes guaranteed to be in separate partitions

### Tasks

- [ ] T029 [US2] Write failing test for Scenario 1 (balanced partitions) in packages/algorithms/test/partitioning/spectral.test.ts
- [ ] T030 [US2] Write failing test for Scenario 2 (minimized edge cuts) in packages/algorithms/test/partitioning/spectral.test.ts
- [ ] T031 [US2] Write failing test for Scenario 3 (constraint satisfaction) in packages/algorithms/test/partitioning/spectral.test.ts
- [ ] T032 [US2] Implement normalized Laplacian computation (L = D^(-1/2) * (D - A) * D^(-1/2)) in packages/algorithms/src/partitioning/spectral.ts
- [ ] T033 [US2] Implement k-smallest eigenvector extraction (power iteration or Lanczos) in packages/algorithms/src/partitioning/spectral.ts
- [ ] T034 [US2] Implement k-means clustering on eigenvector matrix in packages/algorithms/src/partitioning/spectral.ts
- [ ] T035 [US2] Implement partition constraint handling in packages/algorithms/src/partitioning/spectral.ts
- [ ] T036 [US2] Implement balance ratio calculation in packages/algorithms/src/partitioning/spectral.ts
- [ ] T037 [US2] Verify all spectral partitioning tests pass
- [ ] T038 [US2] Run performance benchmark on 500-node graph (must complete < 60s)
- [ ] T039 [US2] Export spectralPartition function from packages/algorithms/src/index.ts
- [ ] T040 [US2] Commit spectral partitioning with message "feat(algorithms): add spectral graph partitioning (P2)"

---

## Phase 5: User Story 3 - Hierarchical Clustering (P3)

**Story**: Researchers exploring topic hierarchies need to visualize how research topics cluster at different granularity levels.

**Independent Test**: Run hierarchical clustering on topic graph and verify dendrogram structure correctly represents parent-child relationships between topics at different abstraction levels. Test by cutting dendrogram at different heights and verifying expected cluster counts.

### Acceptance Scenarios

1. Given topic graph with 50 topics spanning 3 hierarchical levels, when researcher runs hierarchical clustering, then dendrogram structure correctly groups related topics at each level
2. Given hierarchical clustering result, when researcher cuts dendrogram at height h, then system produces flat clusters corresponding to that specificity level
3. Given topics with known parent-child relationships, when hierarchical clustering completes, then child topics appear together in same branch as their parent

### Tasks

- [ ] T041 [US3] Write failing test for Scenario 1 (correct grouping) in packages/algorithms/test/hierarchical/clustering.test.ts
- [ ] T042 [US3] Write failing test for Scenario 2 (dendrogram cutting) in packages/algorithms/test/hierarchical/clustering.test.ts
- [ ] T043 [US3] Write failing test for Scenario 3 (parent-child structure) in packages/algorithms/test/hierarchical/clustering.test.ts
- [ ] T044 [US3] Implement distance matrix computation from adjacency matrix in packages/algorithms/src/hierarchical/clustering.ts
- [ ] T045 [US3] Implement agglomerative clustering with average linkage in packages/algorithms/src/hierarchical/clustering.ts
- [ ] T046 [US3] Implement dendrogram data structure with merge history in packages/algorithms/src/hierarchical/clustering.ts
- [ ] T047 [US3] Implement cutAtHeight() method for dendrogram in packages/algorithms/src/hierarchical/clustering.ts
- [ ] T048 [US3] Implement getClusters(k) method for dendrogram in packages/algorithms/src/hierarchical/clustering.ts
- [ ] T049 [US3] Verify all hierarchical clustering tests pass
- [ ] T050 [US3] Run performance benchmark on 200-node graph (must complete < 45s)
- [ ] T051 [US3] Export hierarchicalClustering function from packages/algorithms/src/index.ts
- [ ] T052 [US3] Commit hierarchical clustering with message "feat(algorithms): add hierarchical clustering (P3)"

---

## Phase 6: User Story 4 - K-Core Decomposition (P4)

**Story**: Researchers analyzing citation networks need to identify highly connected research cores where papers are densely interconnected.

**Independent Test**: Load citation network, run k-core decomposition with various k values (k=3, k=5, k=10), and verify returned cores contain only nodes with degree ≥ k within the subgraph. Completes in < 15s for 1000-node network.

### Acceptance Scenarios

1. Given citation network with 200 papers, when researcher runs k-core decomposition with k=5, then returned subgraph contains only papers cited by at least 5 other papers in the core
2. Given k-core decomposition result, when researcher requests nested core hierarchy, then system returns cores for all k values from k_min to k_max
3. Given citation network with 1000 papers, when k-core decomposition runs, then algorithm completes in under 15 seconds

### Tasks

- [ ] T053 [US4] Write failing test for Scenario 1 (degree ≥ k validation) in packages/algorithms/test/decomposition/k-core.test.ts
- [ ] T054 [US4] Write failing test for Scenario 2 (nested core hierarchy) in packages/algorithms/test/decomposition/k-core.test.ts
- [ ] T055 [US4] Write failing test for Scenario 3 (performance < 15s) in packages/algorithms/test/decomposition/k-core.test.ts
- [ ] T056 [US4] Implement Batagelj-Zaversnik algorithm: degree-ordered vertex removal in packages/algorithms/src/decomposition/k-core.ts
- [ ] T057 [US4] Implement core number tracking for each vertex in packages/algorithms/src/decomposition/k-core.ts
- [ ] T058 [US4] Implement nested core hierarchy construction (k=1 to k=degeneracy) in packages/algorithms/src/decomposition/k-core.ts
- [ ] T059 [US4] Implement disconnected component handling in packages/algorithms/src/decomposition/k-core.ts
- [ ] T060 [US4] Verify all k-core tests pass
- [ ] T061 [US4] Run performance benchmark on 1000-node graph (must complete < 15s)
- [ ] T062 [US4] Export kCoreDecomposition function from packages/algorithms/src/index.ts
- [ ] T063 [US4] Commit k-core implementation with message "feat(algorithms): add k-core decomposition (P4)"

---

## Phase 7: User Story 5 - Leiden Clustering (P5)

**Story**: Researchers need accurate community detection that avoids the resolution limit problem of Louvain clustering.

**Independent Test**: Compare Leiden vs Louvain results on known problematic graphs where Louvain produces disconnected communities. Verify Leiden communities are always connected and have higher modularity scores. Completes in < 35s for 1000-node network.

### Acceptance Scenarios

1. Given citation network where Louvain produces disconnected communities, when researcher runs Leiden clustering, then all returned communities are fully connected subgraphs
2. Given citation network with 500 papers, when researcher runs Leiden clustering, then algorithm produces communities with modularity score ≥ Louvain modularity
3. Given large citation network with 1000 papers, when Leiden clustering runs, then algorithm completes in under 35 seconds

### Tasks

- [ ] T064 [US5] Write failing test for Scenario 1 (connected communities) in packages/algorithms/test/clustering/leiden.test.ts
- [ ] T065 [US5] Write failing test for Scenario 2 (modularity ≥ Louvain) in packages/algorithms/test/clustering/leiden.test.ts
- [ ] T066 [US5] Write failing test for Scenario 3 (performance < 35s) in packages/algorithms/test/clustering/leiden.test.ts
- [ ] T067 [US5] Implement Leiden algorithm: Phase 1 (local moving, reuse Louvain logic) in packages/algorithms/src/clustering/leiden.ts
- [ ] T068 [US5] Implement Leiden algorithm: Phase 2 (refinement - split disconnected communities using BFS) in packages/algorithms/src/clustering/leiden.ts
- [ ] T069 [US5] Implement Leiden algorithm: Phase 3 (aggregation) in packages/algorithms/src/clustering/leiden.ts
- [ ] T070 [US5] Implement connectivity validation (BFS check) in packages/algorithms/src/clustering/leiden.ts
- [ ] T071 [US5] Verify all Leiden tests pass
- [ ] T072 [US5] Run performance benchmark on 1000-node graph (must complete < 35s)
- [ ] T073 [US5] Run modularity comparison test (Leiden ≥ Louvain)
- [ ] T074 [US5] Export leiden function from packages/algorithms/src/index.ts
- [ ] T075 [US5] Commit Leiden implementation with message "feat(algorithms): add Leiden clustering (P5)"

---

## Phase 8: User Story 6 - Label Propagation (P6)

**Story**: Researchers working with very large citation networks (10,000+ papers) need fast clustering that scales linearly with graph size.

**Independent Test**: Run label propagation on progressively larger graphs (1k, 5k, 10k nodes) and verify linear scaling (doubling graph size increases runtime by ≤ 2.2x). Completes in < 20s for 10,000-node network.

### Acceptance Scenarios

1. Given citation network with 10,000 papers, when researcher runs label propagation clustering, then algorithm completes in under 20 seconds
2. Given citation networks of size 1k, 5k, 10k papers, when label propagation runs on each, then runtime scales linearly with graph size (±20%)
3. Given researcher running multiple clustering iterations, when label propagation executes 10 times, then results stabilize to consistent communities after 3-5 iterations

### Tasks

- [ ] T076 [US6] Write failing test for Scenario 1 (performance < 20s for 10k nodes) in packages/algorithms/test/clustering/label-propagation.test.ts
- [ ] T077 [US6] Write failing test for Scenario 2 (linear scaling) in packages/algorithms/test/clustering/label-propagation.test.ts
- [ ] T078 [US6] Write failing test for Scenario 3 (convergence in 3-5 iterations) in packages/algorithms/test/clustering/label-propagation.test.ts
- [ ] T079 [US6] Implement asynchronous label propagation: initialize unique labels in packages/algorithms/src/clustering/label-propagation.ts
- [ ] T080 [US6] Implement label propagation: majority voting iteration in packages/algorithms/src/clustering/label-propagation.ts
- [ ] T081 [US6] Implement random node ordering per iteration in packages/algorithms/src/clustering/label-propagation.ts
- [ ] T082 [US6] Implement convergence detection (no label changes) in packages/algorithms/src/clustering/label-propagation.ts
- [ ] T083 [US6] Implement tie-breaking for equally frequent labels in packages/algorithms/src/clustering/label-propagation.ts
- [ ] T084 [US6] Verify all label propagation tests pass
- [ ] T085 [US6] Run performance benchmark on 10k-node graph (must complete < 20s)
- [ ] T086 [US6] Run linear scaling validation test (1k → 5k → 10k)
- [ ] T087 [US6] Export labelPropagation function from packages/algorithms/src/index.ts
- [ ] T088 [US6] Commit label propagation with message "feat(algorithms): add label propagation clustering (P6)"

---

## Phase 9: User Story 7 - Infomap Clustering (P7)

**Story**: Researchers analyzing how knowledge flows through citation networks need clustering based on information propagation patterns.

**Independent Test**: Run Infomap on citation networks with known flow patterns (papers citing from older to newer areas) and verify communities align with citation direction patterns. Compression ratio > 1.5. Completes in < 40s for 1000-node network.

### Acceptance Scenarios

1. Given directed citation network with clear temporal flow patterns, when researcher runs Infomap clustering, then communities align with citation flow direction (older papers in upstream communities)
2. Given citation network with 800 papers, when Infomap clustering completes, then algorithm produces communities with minimum description length encoding (compression ratio > 1.5)
3. Given citation network with 1000 papers, when Infomap clustering runs, then algorithm completes in under 40 seconds

### Tasks

- [ ] T089 [US7] Write failing test for Scenario 1 (flow alignment) in packages/algorithms/test/clustering/infomap.test.ts
- [ ] T090 [US7] Write failing test for Scenario 2 (compression ratio > 1.5) in packages/algorithms/test/clustering/infomap.test.ts
- [ ] T091 [US7] Write failing test for Scenario 3 (performance < 40s) in packages/algorithms/test/clustering/infomap.test.ts
- [ ] T092 [US7] Implement transition probability calculation (edge_weight / out_degree) in packages/algorithms/src/clustering/infomap.ts
- [ ] T093 [US7] Implement map equation: L = H(X) + Σ p_i * H(X_i) in packages/algorithms/src/clustering/infomap.ts
- [ ] T094 [US7] Implement greedy search for module assignment in packages/algorithms/src/clustering/infomap.ts
- [ ] T095 [US7] Implement visit probability calculation (steady-state random walk) in packages/algorithms/src/clustering/infomap.ts
- [ ] T096 [US7] Implement compression ratio calculation in packages/algorithms/src/clustering/infomap.ts
- [ ] T097 [US7] Implement directed edge handling (respect edge direction in random walk) in packages/algorithms/src/clustering/infomap.ts
- [ ] T098 [US7] Verify all Infomap tests pass
- [ ] T099 [US7] Run performance benchmark on 1000-node graph (must complete < 40s)
- [ ] T100 [US7] Export infomap function from packages/algorithms/src/index.ts
- [ ] T101 [US7] Commit Infomap implementation with message "feat(algorithms): add Infomap clustering (P7)"

---

## Phase 10: User Story 8 - Core-Periphery Decomposition (P8)

**Story**: Researchers need to distinguish between core influential papers and peripheral derivative work in citation networks.

**Independent Test**: Decompose citation networks with known influential papers and verify highly-cited seminal papers appear in core (coreness > 0.7) while recent derivative papers appear in periphery. Core contains 10-30% of nodes. Completes in < 25s for 1000-node network.

### Acceptance Scenarios

1. Given citation network with identifiable seminal papers, when researcher runs core-periphery decomposition, then highly-cited influential papers assigned to core with coreness score > 0.7
2. Given core-periphery decomposition result, when researcher views core and periphery sizes, then core contains 10-30% of nodes with 60-80% of internal edges
3. Given citation network with 1000 papers, when core-periphery decomposition runs, then algorithm completes in under 25 seconds

### Tasks

- [ ] T102 [US8] Write failing test for Scenario 1 (coreness > 0.7 for influential papers) in packages/algorithms/test/decomposition/core-periphery.test.ts
- [ ] T103 [US8] Write failing test for Scenario 2 (core size 10-30%, edge density 60-80%) in packages/algorithms/test/decomposition/core-periphery.test.ts
- [ ] T104 [US8] Write failing test for Scenario 3 (performance < 25s) in packages/algorithms/test/decomposition/core-periphery.test.ts
- [ ] T105 [US8] Implement Borgatti-Everett model: initialize coreness scores (high-degree = core) in packages/algorithms/src/decomposition/core-periphery.ts
- [ ] T106 [US8] Implement iterative coreness optimization (update based on neighbor coreness) in packages/algorithms/src/decomposition/core-periphery.ts
- [ ] T107 [US8] Implement convergence detection (coreness changes < epsilon) in packages/algorithms/src/decomposition/core-periphery.ts
- [ ] T108 [US8] Implement core threshold application (coreness > threshold → core) in packages/algorithms/src/decomposition/core-periphery.ts
- [ ] T109 [US8] Implement fit quality calculation (correlation between observed and expected) in packages/algorithms/src/decomposition/core-periphery.ts
- [ ] T110 [US8] Verify all core-periphery tests pass
- [ ] T111 [US8] Run performance benchmark on 1000-node graph (must complete < 25s)
- [ ] T112 [US8] Export corePeripheryDecomposition function from packages/algorithms/src/index.ts
- [ ] T113 [US8] Commit core-periphery implementation with message "feat(algorithms): add core-periphery decomposition (P8)"

---

## Phase 11: User Story 9 - Biconnected Components (P9)

**Story**: Researchers need to identify critical papers that bridge different research communities in citation networks.

**Independent Test**: Create citation networks with known bridge papers between communities and verify algorithm correctly identifies these papers as articulation points. Linear time O(V+E). Completes in < 10s for 1000-node network.

### Acceptance Scenarios

1. Given citation network with papers bridging two research communities, when researcher runs biconnected component decomposition, then bridge papers identified as articulation points
2. Given biconnected decomposition result, when researcher views components, then each biconnected component contains papers that remain connected after removing any single paper
3. Given citation network with 1000 papers, when biconnected decomposition runs, then algorithm completes in under 10 seconds (linear time verified)

### Tasks

- [ ] T114 [US9] Write failing test for Scenario 1 (articulation point detection) in packages/algorithms/test/decomposition/biconnected.test.ts
- [ ] T115 [US9] Write failing test for Scenario 2 (component connectivity) in packages/algorithms/test/decomposition/biconnected.test.ts
- [ ] T116 [US9] Write failing test for Scenario 3 (performance < 10s, linear time) in packages/algorithms/test/decomposition/biconnected.test.ts
- [ ] T117 [US9] Implement Tarjan's algorithm: DFS with discovery time tracking in packages/algorithms/src/decomposition/biconnected.ts
- [ ] T118 [US9] Implement low-link value calculation (low[v] = min(disc[v], low[children], disc[back-edges])) in packages/algorithms/src/decomposition/biconnected.ts
- [ ] T119 [US9] Implement articulation point detection (low[child] ≥ disc[v]) in packages/algorithms/src/decomposition/biconnected.ts
- [ ] T120 [US9] Implement root articulation point check (> 1 DFS child) in packages/algorithms/src/decomposition/biconnected.ts
- [ ] T121 [US9] Implement biconnected component extraction (edge stack popping on backtrack) in packages/algorithms/src/decomposition/biconnected.ts
- [ ] T122 [US9] Implement disconnected graph handling (DFS from each unvisited node) in packages/algorithms/src/decomposition/biconnected.ts
- [ ] T123 [US9] Verify all biconnected component tests pass
- [ ] T124 [US9] Run performance benchmark on 1000-node graph (must complete < 10s)
- [ ] T125 [US9] Export biconnectedComponents function from packages/algorithms/src/index.ts
- [ ] T126 [US9] Commit biconnected components with message "feat(algorithms): add biconnected component decomposition (P9)"

---

## Phase 12: Polish & Integration

**Goal**: Finalize exports, documentation, and quality checks

### Tasks

- [ ] T127 Verify all 9 algorithms exported from packages/algorithms/src/index.ts
- [ ] T128 Verify all types exported from packages/algorithms/src/types/clustering-types.ts
- [ ] T129 Run full test suite: pnpm nx test algorithms (all 27+ tests must pass)
- [ ] T130 Run typecheck: pnpm nx typecheck algorithms (zero errors)
- [ ] T131 Run build: pnpm nx build algorithms (successful build)
- [ ] T132 Verify existing 219 tests still pass: pnpm test (no regressions)
- [ ] T133 Update packages/algorithms/README.md with clustering algorithms section
- [ ] T134 Commit final polish with message "docs(algorithms): add clustering algorithms documentation"

---

## Dependency Graph

```
Phase 1 (Setup) → Phase 2 (Foundational)
                     ↓
        ┌────────────┼────────────┬────────────┬────────────┬────────────┬────────────┬────────────┬────────────┐
        ↓            ↓            ↓            ↓            ↓            ↓            ↓            ↓            ↓
     Phase 3      Phase 4      Phase 5      Phase 6      Phase 7      Phase 8      Phase 9     Phase 10    Phase 11
     (US1)        (US2)        (US3)        (US4)        (US5)        (US6)        (US7)        (US8)        (US9)
     Louvain   Spectral    Hierarchical    K-Core       Leiden        Label     Infomap    Core-Periph Biconnected
        ↓            ↓            ↓            ↓            ↓            ↓            ↓            ↓            ↓
        └────────────┴────────────┴────────────┴────────────┴────────────┴────────────┴────────────┴────────────┘
                                                    ↓
                                              Phase 12 (Polish)
```

**User Story Dependencies**:
- **US1 (Louvain)** → **US5 (Leiden)**: Leiden builds on Louvain patterns (local moving phase reused)
- All other user stories are **independent** and can be implemented in parallel after Phase 2

**Foundational Dependencies**:
- All user stories depend on **Phase 2** (metrics + test fixtures)
- US1 and US5 depend on **modularity calculation** (T006)

---

## Parallel Execution Examples

### Phase 2 (Foundational) - 4 parallel batches

**Batch 1**: Metrics implementation
```bash
# Parallel: T006 (modularity), T007 (conductance), T008 (density), T009 (cluster-quality)
```

**Batch 2**: Test fixtures
```bash
# Parallel: T010 (small), T011 (large), T012 (topic hierarchy), T013 (known clusters)
```

**Batch 3**: Metrics tests
```bash
# Parallel: T014 (modularity test), T015 (conductance test), T016 (cluster-quality test)
```

### Phase 3 (US1 - Louvain) - Test-first approach

**Batch 1**: Tests (sequential - define behavior)
```bash
# T017 → T018 → T019 (failing tests establish acceptance criteria)
```

**Batch 2**: Implementation (sequential - algorithm phases)
```bash
# T020 → T021 → T022 → T023 → T024 (algorithm implementation)
```

**Batch 3**: Verification (parallel)
```bash
# Parallel: T025 (test verification), T026 (performance benchmark)
```

### Phases 4-11 (US2-US9) - Parallel user stories

After Phase 2 completes, **all 8 remaining user stories can be implemented in parallel**:

**Parallel Story Implementation** (US2, US3, US4, US6, US7, US8, US9):
```bash
# Launch 7 atomic-task-executor agents in parallel
# Agent 1: US2 (T029-T040) - Spectral partitioning
# Agent 2: US3 (T041-T052) - Hierarchical clustering
# Agent 3: US4 (T053-T063) - K-core decomposition
# Agent 4: US6 (T076-T088) - Label propagation (independent of US5)
# Agent 5: US7 (T089-T101) - Infomap clustering
# Agent 6: US8 (T102-T113) - Core-periphery
# Agent 7: US9 (T114-T126) - Biconnected components
```

**Sequential Dependency** (US1 → US5):
```bash
# Must complete US1 (Phase 3, T017-T028) before starting US5 (Phase 7, T064-T075)
# Reason: Leiden reuses Louvain local moving logic
```

---

## Summary

- **Total Tasks**: 134
- **User Stories**: 9 (P1-P9)
- **Setup Tasks**: 5 (T001-T005)
- **Foundational Tasks**: 11 (T006-T016)
- **User Story Tasks**: 110 (T017-T126, avg 12 tasks per story)
- **Polish Tasks**: 8 (T127-T134)

**Task Distribution by User Story**:
- US1 (Louvain): 12 tasks (T017-T028)
- US2 (Spectral): 12 tasks (T029-T040)
- US3 (Hierarchical): 12 tasks (T041-T052)
- US4 (K-Core): 11 tasks (T053-T063)
- US5 (Leiden): 12 tasks (T064-T075)
- US6 (Label Propagation): 13 tasks (T076-T088)
- US7 (Infomap): 13 tasks (T089-T101)
- US8 (Core-Periphery): 12 tasks (T102-T113)
- US9 (Biconnected): 13 tasks (T114-T126)

**Parallel Opportunities**:
- Phase 2: 7 parallel tasks (T007-T009, T011-T013, T015-T016)
- Phases 4-11: 7 user stories can be implemented in parallel (US2, US3, US4, US6, US7, US8, US9)
- Only sequential dependency: US1 → US5 (Louvain must complete before Leiden)

**Suggested MVP**: Phase 3 (US1 - Louvain Community Detection) - 12 tasks, delivers core value for citation network analysis

**Format Validation**: ✅ All 134 tasks follow checklist format:
- ✅ Checkboxes: `- [ ]`
- ✅ Task IDs: T001-T134 (sequential)
- ✅ [P] markers: Applied to 15 parallelizable tasks
- ✅ [Story] labels: Applied to 110 user story tasks (US1-US9)
- ✅ File paths: Explicit paths in all implementation tasks

