# Research: Graph Partitioning and Clustering Algorithms

**Date**: 2025-11-25
**Feature**: [spec.md](./spec.md) | [plan.md](./plan.md)

This document consolidates research findings for algorithm selection, implementation patterns, and best practices for the 9 graph clustering, partitioning, and decomposition algorithms.

## Algorithm Selection Decisions

### 1. Louvain Community Detection (P1)

**Decision**: Implement standard Louvain algorithm with greedy modularity optimization

**Rationale**:
- **Modularity Optimization**: Proven metric for citation network quality (Newman & Girvan 2004)
- **Two-Phase Approach**: Local moving + aggregation enables hierarchical community structure
- **Performance**: O(n log n) average complexity, suitable for 1000-node graphs in < 30s
- **Wide Adoption**: Standard baseline in network science research (Blondel et al. 2008)

**Alternatives Considered**:
- **Girvan-Newman (betweenness-based)**: Rejected - O(m²n) complexity too slow for target graph sizes
- **Basic Label Propagation**: Rejected for P1 - non-deterministic, lower quality than Louvain
- **Walktrap**: Rejected - random walk simulation more complex, similar results to Louvain

**Implementation Notes**:
- Use resolution parameter γ=1.0 as default (Newman & Girvan standard)
- Handle disconnected components independently
- Track modularity gain per node move for early stopping
- Return hierarchical dendrogram structure showing merge sequence

---

### 2. Spectral Partitioning (P2)

**Decision**: Implement normalized spectral clustering with k-means on eigenvectors

**Rationale**:
- **Balanced Partitions**: Eigenvector analysis naturally produces balanced cuts
- **Laplacian Matrix**: Captures graph structure through eigenspectrum (Shi & Malik 2000)
- **Industry Standard**: Used in circuit partitioning, load balancing, graph visualization
- **Quality Guarantees**: Cheeger inequality bounds edge cut quality

**Alternatives Considered**:
- **METIS/KaHIP**: Rejected - external C++ libraries violate zero-dependency requirement
- **Min-Cut/Max-Flow**: Rejected - produces unbalanced partitions, expensive for k > 2
- **Greedy Graph Growing**: Rejected - no quality guarantees, sensitive to seed selection

**Implementation Notes**:
- Compute normalized Laplacian: L = D⁻¹/² (D - A) D⁻¹/²
- Extract k smallest eigenvectors (excluding trivial eigenvalue 0)
- Run k-means on n×k eigenvector matrix to assign nodes to partitions
- Handle constraint lists by modifying eigenvectors or post-processing
- Use power iteration or Lanczos for large graphs if needed

---

### 3. Hierarchical Clustering (P3)

**Decision**: Implement agglomerative clustering with average linkage

**Rationale**:
- **Average Linkage**: Balances single (chaining) and complete (crowding) linkage extremes
- **Dendrogram Output**: Enables multi-resolution clustering by cutting at any height
- **Topic Taxonomies**: Natural fit for hierarchical research topic structures
- **Deterministic**: Unlike divisive methods, agglomerative produces stable results

**Alternatives Considered**:
- **Single Linkage**: Rejected - suffers from chaining effect, poor cluster quality
- **Complete Linkage**: Rejected - sensitive to outliers, produces overly compact clusters
- **Ward's Method**: Rejected - variance minimization less interpretable for graphs

**Implementation Notes**:
- Use adjacency matrix as distance matrix (1 - edge_weight for similarity)
- Build dendrogram bottom-up by merging closest clusters
- Store merge history: [(cluster1, cluster2, distance, size), ...]
- Support cutting dendrogram at specified height to produce flat clustering
- O(n² log n) complexity acceptable for target size (200 nodes)

---

### 4. K-Core Decomposition (P4)

**Decision**: Implement Batagelj-Zaversnik algorithm with degree-ordered removal

**Rationale**:
- **Optimal Complexity**: O(V + E) time with degree-ordered vertex removal (Batagelj & Zaversnik 2003)
- **Nested Cores**: Produces complete k-core hierarchy (k=1 to k_max)
- **Citation Network Fit**: Identifies influential paper tiers by citation density
- **Simple Implementation**: Single-pass algorithm with degree tracking

**Alternatives Considered**:
- **Naive Iterative Removal**: Rejected - O(k·E) complexity, repeated degree recomputation
- **Matula-Beck Algorithm**: Rejected - same complexity as Batagelj-Zaversnik but more complex
- **Approximate K-Core**: Rejected - need exact cores for research influence analysis

**Implementation Notes**:
- Maintain degree-ordered vertex queue (bucket sort by degree)
- Remove vertices with degree < k, update neighbors' degrees
- Track core number for each vertex (maximum k value when removed)
- Return nested core structure: { k: [node_ids], ... }
- Handle disconnected components: compute cores per component

---

### 5. Leiden Clustering (P5)

**Decision**: Implement Leiden algorithm with local moving + refinement phases

**Rationale**:
- **Resolution Limit Fix**: Refinement phase ensures well-connected communities (Traag et al. 2019)
- **Quality Guarantee**: All communities guaranteed to be connected subgraphs
- **Modularity Improvement**: Consistently produces higher modularity than Louvain
- **Same Complexity**: O(n log n) average time, minimal overhead vs. Louvain

**Alternatives Considered**:
- **Smart Local Moving**: Rejected - still vulnerable to resolution limit
- **Louvain + Post-Processing**: Rejected - splitting disconnected communities adds complexity
- **Ensemble Methods**: Rejected - multiple runs increase runtime, violate performance goals

**Implementation Notes**:
- Phase 1: Local moving (same as Louvain)
- Phase 2: Refinement - split disconnected communities using BFS
- Phase 3: Aggregation - build meta-graph of refined communities
- Iterate until modularity converges
- Verify final communities are connected via BFS check

---

### 6. Label Propagation (P6)

**Decision**: Implement asynchronous label propagation with random node ordering

**Rationale**:
- **Linear Time**: O(m + n) per iteration, scales to 10,000+ nodes
- **Simplicity**: Minimal memory footprint, easy parallelization potential
- **Fast Convergence**: Typically converges in 3-5 iterations for social/citation networks
- **No Parameter Tuning**: Label majority voting is parameter-free

**Alternatives Considered**:
- **Synchronous Updates**: Rejected - oscillation risk, slower convergence
- **Semi-Synchronous**: Rejected - adds complexity without clear benefit
- **Weighted Label Propagation**: Deferred - implement basic version first, add weights later

**Implementation Notes**:
- Initialize each node with unique label
- Iterate: update each node's label to most frequent neighbor label
- Random node ordering per iteration to break symmetry
- Convergence check: no label changes in iteration or max iterations (default 100)
- Tie-breaking: random selection among equally frequent labels

---

### 7. Infomap Clustering (P7)

**Decision**: Implement two-level Infomap with greedy search and map equation

**Rationale**:
- **Information-Theoretic**: Minimizes description length of random walks (Rosvall & Bergstrom 2008)
- **Citation Flow**: Ideal for directed networks with knowledge propagation patterns
- **Compression Metric**: Description length provides interpretable quality measure
- **Different Perspective**: Complements modularity-based methods (Louvain/Leiden)

**Alternatives Considered**:
- **Multi-Level Infomap**: Rejected - two-level sufficient for citation networks, simpler
- **Simulated Annealing**: Rejected - greedy search faster, acceptable quality
- **Flow-Based Methods**: Rejected - Infomap already captures flow, others more complex

**Implementation Notes**:
- Compute transition probabilities for random walk (edge weights / out-degree)
- Map equation: L = H(X) + Σ p_i H(X_i) where H is entropy, p_i is visit probability
- Greedy search: move nodes between modules to minimize L
- Handle directed edges by respecting edge direction in random walk
- Calculate compression ratio: initial L / final L (target > 1.5 for citation networks)

---

### 8. Core-Periphery Decomposition (P8)

**Decision**: Implement Borgatti-Everett model with iterative coreness optimization

**Rationale**:
- **Continuous Scores**: Assigns coreness ∈ [0, 1] rather than binary core/periphery
- **Iterative Refinement**: Optimization converges to stable core-periphery structure
- **Citation Network Fit**: Identifies seminal papers (core) vs. derivative work (periphery)
- **Established Method**: Standard approach in social network analysis (Borgatti & Everett 2000)

**Alternatives Considered**:
- **BE-Discrete Model**: Rejected - continuous model more flexible, same complexity
- **KM-Config Model**: Rejected - more complex, similar results to BE model
- **Degree-Based Heuristic**: Rejected - misses structural patterns, no optimization

**Implementation Notes**:
- Initialize: high-degree nodes as core (coreness = 1.0), others periphery (coreness = 0.0)
- Iterate: update coreness[v] based on neighbor coreness values
- Convergence: stop when coreness changes < ε (e.g., 0.001) or max iterations
- Core identification: nodes with coreness > threshold (e.g., 0.7)
- Fit quality: correlation between observed and expected edge patterns

---

### 9. Biconnected Component Decomposition (P9)

**Decision**: Implement Tarjan's DFS-based algorithm for articulation points

**Rationale**:
- **Linear Time**: O(V + E) single DFS traversal (Tarjan 1972)
- **Optimal**: Provably optimal, cannot be improved asymptotically
- **Bridge Detection**: Identifies critical papers connecting research communities
- **Robustness Analysis**: Reveals network resilience to node removal

**Alternatives Considered**:
- **Hopcroft-Tarjan Original**: Rejected - same complexity as Tarjan, more complex bookkeeping
- **Iterative DFS**: Rejected - stack-based iteration adds complexity, no benefit
- **Union-Find Approach**: Rejected - not suitable for articulation point detection

**Implementation Notes**:
- DFS with discovery time and low-link value tracking
- Articulation point detection: low[child] ≥ disc[v]
- Root is articulation point iff it has > 1 DFS child
- Biconnected components: use stack to track edges, pop on backtrack
- Handle disconnected graph: run DFS from each unvisited node

---

## Common Patterns and Best Practices

### TypeScript Implementation Patterns

**Type-Safe Result Types**:
```typescript
type ClusteringResult<N> = {
  communities: Map<CommunityId, Set<N>>;
  modularity: number;
  metadata: ClusterMetadata;
};

type PartitionResult<N> = {
  partitions: Map<PartitionId, Set<N>>;
  edgeCuts: number;
  balance: number; // max_size / min_size
};
```

**Error Handling**:
```typescript
function louvain<N, E>(
  graph: Graph<N, E>,
  options?: LouvainOptions
): Result<ClusteringResult<N>, ClusteringError> {
  // Validate inputs
  if (graph.nodeCount() < 2) {
    return Err({ type: 'InvalidInput', message: 'Graph too small for clustering' });
  }

  // Algorithm implementation
  // ...

  return Ok(result);
}
```

**WeightFunction Integration**:
```typescript
type WeightFunction<N, E> = (edge: E, source: N, target: N) => number;

function calculateModularity<N, E>(
  graph: Graph<N, E>,
  communities: Map<CommunityId, Set<N>>,
  weightFn?: WeightFunction<N, E>
): number {
  const getWeight = weightFn || ((e) => 1.0);
  // Use getWeight(edge, source, target) for all edge weight calculations
}
```

### Testing Patterns

**Test Fixture Structure**:
```typescript
// test/fixtures/citation-networks.ts
export const smallCitationNetwork = (): Graph<string, CitationEdge> => {
  const g = new Graph<string, CitationEdge>();
  // 50 nodes, 5 known communities
  // Papers: "ML-001" through "ML-010" (machine learning community)
  //         "NLP-001" through "NLP-010" (NLP community)
  //         etc.
  return g;
};

export const largeCitationNetwork = (): Graph<string, CitationEdge> => {
  // 1000 nodes for performance testing
};
```

**Acceptance Test Pattern**:
```typescript
describe('Louvain Community Detection', () => {
  it('should identify research clusters with modularity > 0.3', () => {
    // User Story 1, Scenario 1
    const graph = smallCitationNetwork(); // 100 papers, 5 communities
    const result = louvain(graph);

    expect(result.isOk()).toBe(true);
    const { communities, modularity } = result.unwrap();

    expect(communities.size).toBe(5);
    expect(modularity).toBeGreaterThan(0.3);
  });

  it('should complete in under 30 seconds for 1000 nodes', () => {
    // User Story 1, Scenario 3
    const graph = largeCitationNetwork(); // 1000 papers
    const start = performance.now();
    const result = louvain(graph);
    const duration = performance.now() - start;

    expect(result.isOk()).toBe(true);
    expect(duration).toBeLessThan(30000); // 30 seconds
  });
});
```

### Performance Optimization Strategies

**Disconnected Components**:
- Detect components first using BFS/DFS (O(V + E))
- Run clustering independently on each component
- Merge results: `community_id = component_id * 1000 + local_community_id`

**Early Stopping**:
- Track modularity/quality metric per iteration
- Stop if improvement < ε (e.g., 0.0001) for k consecutive iterations
- Prevents unnecessary computation when converged

**Memory Efficiency**:
- Use `Map<NodeId, CommunityId>` for node assignments (O(n) space)
- Avoid full adjacency matrix for sparse graphs (use edge lists)
- Reuse data structures across iterations (in-place updates)

**Sparse Matrix Operations**:
```typescript
// For spectral partitioning: use sparse Laplacian representation
type SparseMatrix = Map<[number, number], number>; // (row, col) -> value
// Only store non-zero entries for sparse graphs
```

---

## Key References

1. **Louvain**: Blondel et al. (2008) "Fast unfolding of communities in large networks"
2. **Leiden**: Traag et al. (2019) "From Louvain to Leiden: guaranteeing well-connected communities"
3. **Spectral Clustering**: Shi & Malik (2000) "Normalized cuts and image segmentation"
4. **K-Core**: Batagelj & Zaversnik (2003) "An O(m) algorithm for cores decomposition"
5. **Label Propagation**: Raghavan et al. (2007) "Near linear time algorithm to detect community structures"
6. **Infomap**: Rosvall & Bergstrom (2008) "Maps of random walks on complex networks reveal community structure"
7. **Core-Periphery**: Borgatti & Everett (2000) "Models of core/periphery structures"
8. **Biconnected Components**: Tarjan (1972) "Depth-first search and linear graph algorithms"
9. **Modularity**: Newman & Girvan (2004) "Finding and evaluating community structure in networks"

---

## Implementation Order

Based on dependencies and priority:

1. **Modularity Calculation** (dependency for Louvain, Leiden)
2. **Louvain (P1)** - Foundation for community detection
3. **Leiden (P5)** - Builds on Louvain patterns
4. **Label Propagation (P6)** - Independent, simpler algorithm
5. **Spectral Partitioning (P2)** - Independent, requires eigenvalue solver
6. **Hierarchical Clustering (P3)** - Independent, different paradigm
7. **K-Core (P4)** - Independent, simplest decomposition algorithm
8. **Biconnected Components (P9)** - Independent, DFS-based
9. **Core-Periphery (P8)** - Independent, iterative optimization
10. **Infomap (P7)** - Most complex, builds on modularity understanding

---

## Open Questions (None - All Resolved)

All technical decisions have been made. No [NEEDS CLARIFICATION] markers remain. Ready to proceed to Phase 1 (Design & Contracts).

