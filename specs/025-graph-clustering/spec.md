# Feature Specification: Graph Partitioning and Clustering Algorithms

**Feature Branch**: `025-graph-clustering`
**Created**: 2025-11-25
**Status**: Draft
**Input**: User description: "implement the missing methods"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Community Detection in Citation Networks (Priority: P1)

Researchers analyzing citation networks need to identify clusters of related research papers that form distinct communities or research areas. This helps understand how different research topics are organized and how they relate to each other.

**Why this priority**: Core functionality for academic network analysis. Citation networks naturally form communities around research topics, making community detection the most valuable clustering algorithm for Academic Explorer's primary use case.

**Independent Test**: Can be fully tested by loading a citation network graph with known research clusters (e.g., papers from different AI subfields) and verifying that the algorithm correctly groups papers by their citation patterns. Delivers immediate value for visualizing research communities.

**Acceptance Scenarios**:

1. **Given** a citation network with 100 papers from 5 distinct research areas, **When** researcher runs community detection algorithm, **Then** papers are grouped into 5 communities with high intra-community citation density
2. **Given** a researcher viewing a work's citation network, **When** community detection completes, **Then** each detected community is labeled with size and density metrics
3. **Given** a large citation network with 1000+ papers, **When** community detection runs, **Then** algorithm completes in under 30 seconds

---

### User Story 2 - Balanced Graph Partitioning for Visualization (Priority: P2)

Researchers working with large academic entity graphs need to partition the graph into balanced subgraphs for efficient visualization and analysis. This enables rendering complex networks by dividing them into manageable chunks while maintaining relationship context.

**Why this priority**: Important for performance and usability when dealing with large graphs. Enables better visualization layouts and faster rendering, but less critical than community detection for understanding research relationships.

**Independent Test**: Can be fully tested by partitioning a graph with 500 nodes into k=5 balanced partitions and verifying that each partition has approximately equal size (±10%) while minimizing edge cuts between partitions.

**Acceptance Scenarios**:

1. **Given** a graph with 500 nodes, **When** researcher requests k=5 partitions, **Then** graph is divided into 5 subgraphs with sizes between 90-110 nodes each
2. **Given** a partitioned graph, **When** user views partition boundaries, **Then** the number of edges crossing partition boundaries is minimized
3. **Given** a researcher specifying partition constraints, **When** partitioning algorithm runs, **Then** specified nodes are guaranteed to be in separate partitions

---

### User Story 3 - Hierarchical Clustering for Topic Taxonomy (Priority: P3)

Researchers exploring topic hierarchies need to visualize how research topics cluster at different granularity levels. Hierarchical clustering reveals relationships between broad fields, subfields, and specialized topics.

**Why this priority**: Valuable for understanding multi-level research organization, but less critical than community detection. Most use cases can start with flat communities and add hierarchy later.

**Independent Test**: Can be fully tested by running hierarchical clustering on a topic graph and verifying that the dendrogram structure correctly represents parent-child relationships between topics at different abstraction levels.

**Acceptance Scenarios**:

1. **Given** a topic graph with 50 topics spanning 3 hierarchical levels, **When** researcher runs hierarchical clustering, **Then** dendrogram structure correctly groups related topics at each level
2. **Given** a hierarchical clustering result, **When** researcher cuts the dendrogram at height h, **Then** system produces flat clusters corresponding to that specificity level
3. **Given** topics with known parent-child relationships, **When** hierarchical clustering completes, **Then** child topics appear together in the same branch as their parent

---

### User Story 4 - K-Core Decomposition for Research Core Identification (Priority: P4)

Researchers analyzing citation networks need to identify highly connected research cores where papers are densely interconnected. K-core decomposition reveals nested layers of connectivity, helping identify influential paper clusters and core research areas within broader communities.

**Why this priority**: Complements community detection by revealing internal structure of dense regions. Useful for finding influential papers but less critical than primary clustering features. Can be added as enhancement after core algorithms.

**Independent Test**: Can be fully tested by loading a citation network, running k-core decomposition with various k values (k=3, k=5, k=10), and verifying that returned cores contain only nodes with degree ≥ k within the subgraph. Delivers value for identifying paper influence tiers.

**Acceptance Scenarios**:

1. **Given** a citation network with 200 papers, **When** researcher runs k-core decomposition with k=5, **Then** returned subgraph contains only papers cited by at least 5 other papers in the core
2. **Given** a k-core decomposition result, **When** researcher requests nested core hierarchy, **Then** system returns cores for all k values from k_min to k_max
3. **Given** a citation network with 1000 papers, **When** k-core decomposition runs, **Then** algorithm completes in under 15 seconds

---

### User Story 5 - Leiden Clustering for High-Quality Communities (Priority: P5)

Researchers need accurate community detection that avoids the resolution limit problem of Louvain clustering. Leiden clustering produces higher-quality communities by ensuring all communities are well-connected subgraphs, preventing poorly connected communities that Louvain can produce.

**Why this priority**: Addresses known limitations of Louvain algorithm. Essential for high-quality community detection in citation networks where accurate community boundaries matter for research classification.

**Independent Test**: Can be fully tested by comparing Leiden vs Louvain results on known problematic graphs where Louvain produces disconnected communities. Verifies that Leiden communities are always connected and have higher modularity scores.

**Acceptance Scenarios**:

1. **Given** a citation network where Louvain produces disconnected communities, **When** researcher runs Leiden clustering, **Then** all returned communities are fully connected subgraphs
2. **Given** a citation network with 500 papers, **When** researcher runs Leiden clustering, **Then** algorithm produces communities with modularity score ≥ Louvain modularity
3. **Given** a large citation network with 1000 papers, **When** Leiden clustering runs, **Then** algorithm completes in under 35 seconds

---

### User Story 6 - Label Propagation for Fast Large-Scale Clustering (Priority: P6)

Researchers working with very large citation networks (10,000+ papers) need fast clustering that scales linearly with graph size. Label propagation provides near-linear time complexity, enabling quick exploratory clustering of massive academic networks.

**Why this priority**: Performance-critical for large graphs. Enables interactive exploration of large citation networks where Louvain or Leiden would be too slow for rapid iteration.

**Independent Test**: Can be fully tested by running label propagation on progressively larger graphs (1k, 5k, 10k nodes) and verifying linear scaling. Compare runtime to Louvain to demonstrate performance advantage.

**Acceptance Scenarios**:

1. **Given** a citation network with 10,000 papers, **When** researcher runs label propagation clustering, **Then** algorithm completes in under 20 seconds
2. **Given** citation networks of size 1k, 5k, 10k papers, **When** label propagation runs on each, **Then** runtime scales linearly with graph size (±20%)
3. **Given** a researcher running multiple clustering iterations, **When** label propagation executes 10 times, **Then** results stabilize to consistent communities after 3-5 iterations

---

### User Story 7 - Infomap Clustering for Citation Flow Analysis (Priority: P7)

Researchers analyzing how knowledge flows through citation networks need clustering based on information propagation patterns. Infomap clustering uses information theory to identify communities by minimizing description length of random walks, revealing how citations flow between research areas.

**Why this priority**: Uniquely suited for citation networks as directed information flow networks. Provides different perspective than modularity-based methods, revealing functional communities based on knowledge propagation.

**Independent Test**: Can be fully tested by running Infomap on citation networks with known flow patterns (e.g., papers citing from older to newer areas) and verifying that communities align with citation direction patterns.

**Acceptance Scenarios**:

1. **Given** a directed citation network with clear temporal flow patterns, **When** researcher runs Infomap clustering, **Then** communities align with citation flow direction (older papers in upstream communities)
2. **Given** a citation network with 800 papers, **When** Infomap clustering completes, **Then** algorithm produces communities with minimum description length encoding
3. **Given** a citation network with 1000 papers, **When** Infomap clustering runs, **Then** algorithm completes in under 40 seconds

---

### User Story 8 - Core-Periphery Decomposition for Influence Identification (Priority: P8)

Researchers need to distinguish between core influential papers and peripheral derivative work in citation networks. Core-periphery decomposition identifies a dense core of highly interconnected papers and a sparse periphery of loosely connected papers, revealing network centralization.

**Why this priority**: Provides unique structural insight beyond clustering. Essential for identifying seminal papers (core) vs incremental contributions (periphery) in research areas.

**Independent Test**: Can be fully tested by decomposing citation networks with known influential papers and verifying that highly-cited seminal papers appear in core while recent derivative papers appear in periphery.

**Acceptance Scenarios**:

1. **Given** a citation network with identifiable seminal papers, **When** researcher runs core-periphery decomposition, **Then** highly-cited influential papers are assigned to core with coreness score > 0.7
2. **Given** a core-periphery decomposition result, **When** researcher views core and periphery sizes, **Then** core contains 10-30% of nodes with 60-80% of internal edges
3. **Given** a citation network with 1000 papers, **When** core-periphery decomposition runs, **Then** algorithm completes in under 25 seconds

---

### User Story 9 - Biconnected Component Decomposition for Critical Paper Identification (Priority: P9)

Researchers need to identify critical papers that bridge different research communities in citation networks. Biconnected component decomposition finds articulation points (papers whose removal disconnects the network) and biconnected components (maximal subgraphs with no articulation points).

**Why this priority**: Network robustness analysis and bridge identification. Essential for understanding which papers connect disparate research areas and serve as interdisciplinary links.

**Independent Test**: Can be fully tested by creating citation networks with known bridge papers between communities and verifying that algorithm correctly identifies these papers as articulation points.

**Acceptance Scenarios**:

1. **Given** a citation network with papers bridging two research communities, **When** researcher runs biconnected component decomposition, **Then** bridge papers are identified as articulation points
2. **Given** a biconnected decomposition result, **When** researcher views components, **Then** each biconnected component contains papers that remain connected after removing any single paper
3. **Given** a citation network with 1000 papers, **When** biconnected decomposition runs, **Then** algorithm completes in under 10 seconds (linear time)

---

### Edge Cases

- What happens when graph is too small (< 3 nodes) for meaningful clustering?
- How does system handle disconnected components in community detection?
- What if requested partition count k exceeds node count?
- How are singleton nodes (no connections) handled in clustering?
- What happens when graph structure doesn't naturally cluster (uniform random graph)?
- How does algorithm handle graphs with uniform edge weights vs. weighted graphs?
- What if partition constraints are impossible to satisfy (e.g., forcing connected nodes into separate partitions)?
- What if requested k-core value k exceeds maximum node degree in graph?
- How does k-core decomposition handle nodes that become isolated after core removal?
- How does Leiden handle graphs with no clear community structure?
- What if label propagation oscillates without converging after maximum iterations?
- How does Infomap handle graphs with no directed flow patterns (symmetric citation patterns)?
- What if core-periphery decomposition finds no clear core-periphery structure (uniform density)?
- How does biconnected decomposition handle graphs with no articulation points (single biconnected component)?
- What if graph has multiple disconnected components with different structural properties?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST implement Louvain community detection algorithm for identifying dense subgraphs in citation networks
- **FR-002**: System MUST implement spectral partitioning algorithm for balanced k-way graph partitioning
- **FR-003**: System MUST implement hierarchical clustering using average linkage for topic taxonomy visualization
- **FR-004**: Community detection algorithm MUST calculate modularity scores to measure clustering quality
- **FR-005**: Partitioning algorithm MUST support user-specified number of partitions (k parameter)
- **FR-006**: Partitioning algorithm MUST minimize edge cuts between partitions while maintaining balance
- **FR-007**: Hierarchical clustering MUST produce dendrogram structure that can be cut at any height
- **FR-008**: All clustering algorithms MUST support weighted edges using custom weight functions
- **FR-009**: System MUST handle disconnected graph components gracefully in all clustering algorithms
- **FR-010**: Algorithms MUST validate input graphs and return descriptive errors for invalid inputs
- **FR-011**: Community detection MUST support both directed and undirected graphs
- **FR-012**: System MUST expose clustering results with node-to-cluster assignments and cluster metadata
- **FR-013**: Partitioning algorithm MUST support optional constraint lists (nodes that must be separated)
- **FR-014**: System MUST calculate cluster quality metrics (density, conductance, modularity)
- **FR-015**: System MUST implement k-core decomposition algorithm for identifying densely connected research cores in citation networks
- **FR-016**: K-core algorithm MUST support iterative removal of nodes with degree < k until all remaining nodes have degree ≥ k
- **FR-017**: K-core algorithm MUST produce nested core hierarchy returning all k values from k_min=1 to k_max (maximum core number)
- **FR-018**: K-core algorithm MUST handle disconnected components independently, computing cores for each component
- **FR-019**: System MUST implement Leiden community detection algorithm with refinement phase to ensure well-connected communities
- **FR-020**: Leiden algorithm MUST guarantee all returned communities are connected subgraphs (no disconnected communities)
- **FR-021**: Leiden algorithm MUST produce modularity scores ≥ Louvain modularity scores on the same graph
- **FR-022**: System MUST implement label propagation clustering algorithm with iterative label updates until convergence
- **FR-023**: Label propagation algorithm MUST support configurable maximum iterations (default: 100) to prevent infinite loops
- **FR-024**: Label propagation algorithm MUST scale linearly with graph size (O(m + n) time complexity)
- **FR-025**: System MUST implement Infomap clustering algorithm using map equation minimization for information flow
- **FR-026**: Infomap algorithm MUST support directed graphs and respect edge direction in random walk calculations
- **FR-027**: Infomap algorithm MUST calculate compression ratio (description length before vs after clustering)
- **FR-028**: System MUST implement core-periphery decomposition algorithm identifying dense core and sparse periphery
- **FR-029**: Core-periphery algorithm MUST assign coreness scores to each node indicating core membership strength (0.0 to 1.0)
- **FR-030**: Core-periphery algorithm MUST optimize core-periphery fit quality using iterative refinement
- **FR-031**: System MUST implement biconnected component decomposition algorithm using DFS-based articulation point detection
- **FR-032**: Biconnected algorithm MUST identify all articulation points (cut vertices) that disconnect graph when removed
- **FR-033**: Biconnected algorithm MUST run in linear time O(V + E) using single DFS traversal

### Key Entities

- **Community**: A densely connected subgraph in the network, represented by member nodes, internal edge count, external edge count, and modularity score
- **Partition**: A division of the graph into k balanced subgraphs, each containing node IDs, partition size, and edge cut count
- **Dendrogram**: A hierarchical tree structure representing nested clustering levels, with merge history and height values
- **Core**: A maximal subgraph where all nodes have degree ≥ k, represented by member nodes, k value (core number), and degeneracy (maximum k value for the graph)
- **LeidenCommunity**: Enhanced community structure with connectivity guarantee, represented by member nodes, modularity score, and internal connectivity metrics
- **LabelCluster**: Fast clustering result from label propagation, represented by member nodes, cluster label, and iteration count to convergence
- **InfomapModule**: Information-theoretic community based on flow compression, represented by member nodes, description length, and compression ratio
- **CorePeripheryStructure**: Network decomposition into core and periphery sets, with per-node coreness scores (0.0 = periphery, 1.0 = core) and fit quality metric
- **BiconnectedComponent**: Maximal subgraph with no articulation points, represented by member nodes, component size, and list of articulation points connecting to other components
- **ClusterMetrics**: Quality measurements for a clustering result including modularity, density, conductance, and silhouette coefficient

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Community detection identifies research clusters with modularity score > 0.3 for typical citation networks (100-1000 papers)
- **SC-002**: Spectral partitioning produces balanced partitions where largest partition is at most 20% larger than smallest partition
- **SC-003**: Community detection completes in under 30 seconds for graphs with 1000 nodes and 5000 edges
- **SC-004**: Spectral partitioning completes in under 60 seconds for graphs with 500 nodes
- **SC-005**: Hierarchical clustering produces dendrogram in under 45 seconds for graphs with 200 nodes
- **SC-006**: All algorithms handle disconnected components without errors or crashes
- **SC-007**: Edge cut count in partitioned graphs is reduced by at least 40% compared to random partitioning
- **SC-008**: Researchers can successfully visualize community structure in citation networks for 95% of tested academic entity graphs
- **SC-009**: K-core decomposition completes in under 15 seconds for graphs with 1000 nodes and 5000 edges
- **SC-010**: K-core algorithm correctly identifies cores where all nodes have degree ≥ k within the returned subgraph
- **SC-011**: Leiden clustering produces communities with modularity scores ≥ Louvain scores for same graphs (100% of test cases)
- **SC-012**: Leiden clustering completes in under 35 seconds for graphs with 1000 nodes and 5000 edges
- **SC-013**: Label propagation clustering completes in under 20 seconds for graphs with 10,000 nodes and 50,000 edges
- **SC-014**: Label propagation runtime scales linearly: doubling graph size increases runtime by ≤ 2.2x (allowing 10% overhead)
- **SC-015**: Infomap clustering produces communities with compression ratio > 1.5 (description length reduced by 33%+) for citation networks
- **SC-016**: Infomap clustering completes in under 40 seconds for graphs with 1000 nodes and 5000 edges
- **SC-017**: Core-periphery decomposition identifies cores containing 10-30% of nodes with 60-80% of internal edges
- **SC-018**: Core-periphery decomposition completes in under 25 seconds for graphs with 1000 nodes
- **SC-019**: Biconnected component decomposition correctly identifies all articulation points (100% accuracy on test graphs)
- **SC-020**: Biconnected component decomposition completes in under 10 seconds for graphs with 1000 nodes (linear time verified)

## Constitution Alignment *(recommended)*

- **Type Safety**: Feature uses strict TypeScript with `unknown` for external inputs and proper type guards for graph validation. No `any` types in algorithm implementations.
- **Test-First**: Each algorithm has testable acceptance scenarios with measurable quality metrics (modularity, edge cuts, balance ratios). Will implement tests before algorithm code.
- **Monorepo Architecture**: Algorithms added to `packages/algorithms/src/clustering/`, `packages/algorithms/src/partitioning/`, and `packages/algorithms/src/decomposition/` directories. No re-exports between internal packages.
- **Storage Abstraction**: No persistence layer needed - algorithms operate on in-memory graph structures only.
- **Performance & Memory**: Success criteria include explicit time limits (10-45s for 1000 nodes, 20s for 10k nodes) and node count thresholds (200-10000 nodes). Algorithms must use O(V + E) or better space complexity.
- **Atomic Conventional Commits**: Each algorithm (Louvain, spectral partitioning, hierarchical clustering, k-core decomposition, Leiden clustering, label propagation, Infomap, core-periphery, biconnected components) will be committed separately with conventional commit messages (`feat(algorithms): add louvain community detection`).
- **Development-Stage Pragmatism**: Breaking changes to `Graph` API acceptable if needed for clustering metadata. No backwards compatibility concerns.
- **Test-First Bug Fixes**: Any edge cases discovered during testing (disconnected components, singleton nodes) will have regression tests written first.
- **Deployment Readiness**: All existing 219 tests must continue passing. Full typecheck and build pipeline must succeed before merge.
- **Continuous Execution**: Implementation will proceed through all algorithms without pausing. Spec committed after clarification/planning phases.

## Assumptions

1. **Algorithm Selection**: Louvain chosen for community detection (vs. Girvan-Newman or Label Propagation) due to better performance and modularity optimization
2. **Spectral Method**: Using normalized spectral clustering with k-means for partitioning (industry standard approach)
3. **Linkage Method**: Average linkage chosen for hierarchical clustering (balances between single and complete linkage extremes)
4. **Default Parameters**: Community detection uses default resolution parameter (γ=1.0); partitioning balances edge cuts and size; hierarchical clustering uses Euclidean distance on adjacency matrix
5. **Quality Metrics**: Modularity is primary quality metric for communities; edge cut ratio for partitions; dendrogram height for hierarchical levels
6. **Graph Size Limits**: Testing targets academic networks with 100-1000 nodes (typical citation network size); larger graphs may require optimization
7. **Weight Function Integration**: All algorithms will use existing `WeightFunction<N, E>` type from pathfinding for consistency
8. **K-Core Algorithm**: Using Batagelj-Zaversnik algorithm for k-core decomposition (optimal O(V + E) time complexity with degree-ordered vertex removal)
9. **Leiden Algorithm**: Using standard Leiden algorithm with local moving and refinement phases (addresses Louvain resolution limit)
10. **Label Propagation**: Using asynchronous label propagation with random node ordering and maximum iteration limit (default 100)
11. **Infomap Algorithm**: Using two-level Infomap with map equation optimization via simulated annealing or greedy search
12. **Core-Periphery Method**: Using iterative optimization of core-periphery fit based on Borgatti-Everett model with coreness scores
13. **Biconnected Algorithm**: Using Tarjan's DFS-based algorithm for articulation point detection and biconnected component identification (O(V + E))

## Dependencies

- Existing `Graph<N, E>` data structure from `packages/algorithms/src/graph/graph.ts`
- Existing `WeightFunction<N, E>` type from `packages/algorithms/src/types/weight-function.ts`
- Existing `Result<T, E>` and `Option<T>` types for error handling
- No external libraries (pure TypeScript implementation, zero dependencies)

## Out of Scope

- Graph drawing/layout algorithms (separate concern from clustering)
- Temporal/dynamic community detection (graphs evolve over time)
- Overlapping community detection (nodes in multiple communities)
- K-means clustering on node embeddings (requires vector representations)
- Clique percolation method (computationally expensive for large graphs)
- Girvan-Newman algorithm (betweenness-based, too slow for target graph sizes)
