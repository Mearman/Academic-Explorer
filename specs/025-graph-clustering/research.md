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

## Louvain Algorithm Optimization Research

**Date**: 2025-11-25
**Research Focus**: Improving Louvain scaling performance from O(n²) to O(n log n)
**Current Performance**: 15.4s for 1000 nodes, 100-250ms for 100 nodes (scaling ratio: 256x)
**Target Performance**: <5s for 1000 nodes (scaling ratio: <66x for O(n log n) behavior)

### Current Implementation Analysis

**Baseline Performance**:
- **100-node graphs**: 100-250ms
- **1000-node graphs**: 15.4s
- **Scaling ratio**: 256x (10x size increase)
- **Expected O(n log n)**: 33-66x for 10x size increase
- **Gap**: 4x slower than theoretical O(n log n) complexity

**Implementation Status**:
- ✅ Pre-computed node degrees (optimization 10)
- ✅ Pre-computed incoming edge cache for directed graphs
- ✅ Hierarchical aggregation (3 levels)
- ✅ Adaptive iteration limits (40 for small, 50 for large)
- ✅ Early convergence detection (2-3 rounds without improvement)
- ✅ Adaptive modularity threshold (1e-5 for large graphs)
- ❌ CSR data structure (using graph API repeatedly)
- ❌ Random neighbor selection (using best neighbor search)
- ❌ Altered communities heuristic
- ❌ Community hash table caching

### Optimization Techniques (Ranked by Impact)

#### 1. Compressed Sparse Row (CSR) Data Structure ⭐⭐⭐⭐⭐
**Impact**: 2.2x speedup | **Difficulty**: Hard | **Quality**: No loss

**Problem**: Current implementation calls `graph.getOutgoingEdges()` repeatedly, causing O(n) lookups per edge access.

**Solution**: Convert graph to three typed arrays at initialization:
```typescript
interface CSRGraph {
  offsets: Uint32Array;    // Length: nodeCount + 1
  edges: Uint32Array;      // Length: edgeCount
  weights: Float64Array;   // Length: edgeCount
  nodeIds: string[];       // Map index -> node ID
  nodeIndex: Map<string, number>; // Map node ID -> index
}
```

**Benefits**:
- O(1) edge access vs. O(n) graph API lookups
- Better cache locality (contiguous memory)
- Typed arrays ~2x faster than regular arrays in JavaScript
- Enables SIMD optimizations in modern JS engines

**Implementation Complexity**: Requires refactoring entire algorithm to use array indices instead of node IDs.

**Reference**: [GVE-Louvain](https://arxiv.org/html/2312.04876v4) - "Using parallel prefix sum along with preallocated CSR is 2.2× faster"

---

#### 2. Threshold Scaling (Progressive Tolerance) ⭐⭐⭐⭐
**Impact**: 14% speedup | **Difficulty**: Easy | **Quality**: No loss

**Current**: Fixed `minModularityIncrease = 1e-6` or `1e-5` (adaptive by size)

**Solution**: Start with high tolerance (0.01) and reduce progressively:
```typescript
let currentTolerance = 0.01; // Initial high tolerance
const toleranceDropRate = 10; // Drop by 10x per pass
const minTolerance = 1e-6;

while (hierarchyLevel < MAX_HIERARCHY_LEVELS) {
  localMovingPhase(currentTolerance);
  currentTolerance = Math.max(minTolerance, currentTolerance / toleranceDropRate);
  hierarchyLevel++;
}
```

**Why It Works**: Early passes need to find major community structures (low precision). Later passes refine boundaries (high precision). Aggressive early stopping prevents wasted computation.

**Reference**: [GVE-Louvain](https://arxiv.org/html/2312.04876v4) - "A tolerance drop rate of 10 yields 4% faster convergence"

---

#### 3. Aggregation Tolerance (Early Stopping) ⭐⭐⭐⭐
**Impact**: 14% speedup | **Difficulty**: Easy | **Quality**: Minimal loss

**Solution**: Stop aggregation when community merges plateau:
```typescript
let previousCommunityCount = Number.MAX_SAFE_INTEGER;
const AGGREGATION_TOLERANCE = 0.8; // Stop if < 80% reduction

while (hierarchyLevel < MAX_HIERARCHY_LEVELS) {
  // Phase 1 local moving...

  const currentCommunityCount = communities.size;
  const mergeRatio = currentCommunityCount / previousCommunityCount;

  if (mergeRatio > AGGREGATION_TOLERANCE) {
    break; // Diminishing returns
  }

  previousCommunityCount = currentCommunityCount;
  hierarchyLevel++;
}
```

**Why It Works**: If aggregation only reduces communities by 20%, further levels provide minimal modularity improvement but add significant runtime cost.

**Reference**: [GVE-Louvain](https://arxiv.org/html/2312.04876v4) - "An aggregation tolerance of 0.8 presents a 14% reduction in runtime"

---

#### 4. Iteration Limits per Pass ⭐⭐⭐
**Impact**: 13% speedup | **Difficulty**: Easy | **Quality**: No loss

**Current Status**: ✅ Already implemented (40-50 for level 1, 12 for higher)

**Improvement**: Reduce first-level limit to 20:
```typescript
const MAX_ITERATIONS = hierarchyLevel === 1
  ? Math.min(20, Math.ceil(nodeCount / 50))
  : 12;
```

**Why It Works**: Most modularity gain happens in first 10-20 iterations. Diminishing returns after that.

**Reference**: [GVE-Louvain](https://arxiv.org/html/2312.04876v4) - "Limiting iterations to 20 allows for 13% faster convergence"

---

#### 5. Random Neighbor Selection (Fast Louvain) ⭐⭐⭐⭐⭐
**Impact**: 2-10x speedup | **Difficulty**: Medium | **Quality**: 2-5% modularity loss (acceptable)

**Current Approach**: Find best community among all neighbors (O(degree) comparisons per node)

**Fast Louvain Approach**: Accept first positive gain:
```typescript
// Current: Best Neighbor
for (const [neighborCommunityId, kIn] of neighborCommunities.entries()) {
  const deltaQ = calculateModularityDelta(...);
  if (deltaQ > bestDeltaQ) {
    bestDeltaQ = deltaQ;
    bestCommunityId = neighborCommunityId;
  }
}

// Fast Louvain: Random Positive Neighbor
const neighborArray = Array.from(neighborCommunities.entries());
const shuffledNeighbors = shuffleArray(neighborArray);

for (const [neighborCommunityId, kIn] of shuffledNeighbors) {
  if (neighborCommunityId === currentCommunityId) continue;

  const deltaQ = calculateModularityDelta(...);

  if (deltaQ > adaptiveMinModularityIncrease) {
    bestCommunityId = neighborCommunityId;
    break; // Accept first positive gain!
  }
}
```

**Why It Works**:
- Random neighbors are likely hubs (high degree nodes)
- Hubs are likely in "good" communities
- Reduces complexity from O(m) to O(n log⟨k⟩)

**Trade-off**: Modularity may decrease by 2-5%, but runtime improves 2-10x. Recommended for graphs > 500 nodes.

**References**:
- [Traag 2015](https://arxiv.org/abs/1503.01322) - "Faster unfolding of communities: speeding up the Louvain algorithm"
- [Physical Review E paper](https://pubmed.ncbi.nlm.nih.gov/26465522/)

---

#### 6. Altered Communities Heuristic ⭐⭐⭐
**Impact**: 20-30% speedup | **Difficulty**: Medium | **Quality**: No loss

**Current**: Visit all nodes every iteration

**Solution**: Track which communities changed and only revisit nodes in/adjacent to changed communities:
```typescript
interface LouvainState {
  alteredCommunities: Set<number>; // Track changed communities
}

function localMovingPhase(state: LouvainState): boolean {
  const nodesToVisit = new Set<string>();

  if (state.alteredCommunities.size === 0) {
    // First iteration - visit all nodes
    nodesToVisit = new Set(state.nodeToCommunity.keys());
  } else {
    // Visit nodes in altered communities + their neighbors
    state.alteredCommunities.forEach((communityId) => {
      const community = state.communities.get(communityId);
      community.nodes.forEach((nodeId) => {
        nodesToVisit.add(nodeId);
        getNeighbors(nodeId).forEach((n) => nodesToVisit.add(n));
      });
    });
  }

  state.alteredCommunities.clear();

  for (const nodeId of shuffleArray([...nodesToVisit])) {
    if (tryMoveNode(nodeId, state)) {
      state.alteredCommunities.add(state.nodeToCommunity.get(nodeId)!);
    }
  }
}
```

**Why It Works**: Most nodes reach stable communities quickly. Only nodes near community boundaries need repeated evaluation.

**Reference**: [graphology-communities](https://github.com/luccitan/graphology-communities/blob/master/louvain.js) - Production JavaScript implementation

---

#### 7. Vertex Pruning (Mark-and-Revisit) ⭐⭐⭐
**Impact**: 11% speedup | **Difficulty**: Medium | **Quality**: No loss

**Solution**: Mark processed vertices and skip unless their neighbors change:
```typescript
const processedNodes = new Set<string>();
const needsReprocessing = new Set<string>([...nodeToCommunity.keys()]);

while (needsReprocessing.size > 0 && iteration < MAX_ITERATIONS) {
  const nodesToProcess = [...needsReprocessing];
  needsReprocessing.clear();

  for (const nodeId of shuffleArray(nodesToProcess)) {
    const moved = tryMoveNode(nodeId);

    if (moved) {
      // Mark neighbors for reprocessing
      getNeighbors(nodeId).forEach((neighbor) => {
        needsReprocessing.add(neighbor);
      });
      processedNodes.delete(nodeId);
    } else {
      processedNodes.add(nodeId); // Stable
    }
  }
}
```

**Why It Works**: Nodes that don't move are likely stable. Only reprocess them if their neighborhood changes.

**Reference**: [GVE-Louvain](https://arxiv.org/html/2312.04876v4) - "Vertex pruning provides 11% improvement"

---

#### 8. Per-Community Hash Tables (Cache ΔQ Calculations) ⭐⭐⭐⭐
**Impact**: 30-50% speedup | **Difficulty**: Hard | **Quality**: No loss

**Current**: Recalculate `neighborCommunities` from scratch for every node

**Solution**: Cache community-to-community edge weights:
```typescript
const communityEdgeCache = new Map<string, number>(); // "fromComm-toComm" -> weight

function getCommunityEdgeWeight(
  fromCommunity: number,
  toCommunity: number,
  cache: Map<string, number>
): number {
  const key = `${fromCommunity}-${toCommunity}`;

  if (cache.has(key)) {
    return cache.get(key)!;
  }

  // Calculate and cache
  let weight = 0;
  communities.get(fromCommunity)!.nodes.forEach((nodeId) => {
    getNeighbors(nodeId).forEach(({ target, weight: edgeWeight }) => {
      if (nodeToCommunity.get(target) === toCommunity) {
        weight += edgeWeight;
      }
    });
  });

  cache.set(key, weight);
  return weight;
}

// Invalidate cache when nodes move
function moveNode(nodeId: string, fromComm: number, toComm: number) {
  // Invalidate affected cache entries
  getNeighbors(nodeId).forEach(({ target }) => {
    const neighborComm = nodeToCommunity.get(target)!;
    cache.delete(`${fromComm}-${neighborComm}`);
    cache.delete(`${neighborComm}-${fromComm}`);
    cache.delete(`${toComm}-${neighborComm}`);
    cache.delete(`${neighborComm}-${toComm}`);
  });
}
```

**Why It Works**: Community-to-community edge weights change infrequently but are recalculated repeatedly. Caching with selective invalidation eliminates redundant computation.

**Reference**: [GVE-Louvain](https://arxiv.org/html/2312.04876v4) - "Far-KV is 4.4× faster than Map hashtable"

---

#### 9. Degree-Based Node Ordering ⭐⭐
**Impact**: 5-10% speedup | **Difficulty**: Easy | **Quality**: Slight improvement

**Current**: Random shuffle

**Solution**: Process high-degree nodes first:
```typescript
const nodeOrder = allNodes
  .map((node) => ({ id: node.id, degree: nodeDegrees.get(node.id)! }))
  .sort((a, b) => b.degree - a.degree) // Descending
  .map((item) => item.id);

for (const nodeId of nodeOrder) {
  // Process high-degree hubs first
}
```

**Why It Works**: Hubs stabilize community structure faster. Processing them first allows lower-degree nodes to join already-stable communities.

**Alternative**: k-cores ordering (group by k-core number)

**Reference**: [GVE-Louvain](https://arxiv.org/html/2312.04876v4), [Neo4j Louvain](https://neo4j.com/docs/graph-data-science/current/algorithms/louvain/)

---

#### 10. Pre-compute Degree Sums ⭐⭐⭐
**Impact**: 15-20% speedup | **Difficulty**: Easy | **Quality**: No loss

**Status**: ✅ Already implemented

Current implementation pre-computes `nodeDegrees` and updates `sigmaTot` incrementally. No further optimization needed.

---

#### 11. Holey CSR for Super-vertex Graphs ⭐⭐⭐
**Impact**: 15-20% speedup (aggregation) | **Difficulty**: Hard | **Quality**: No loss

**Solution**: Pre-allocate CSR space and fill gaps during aggregation instead of rebuilding from scratch each level.

**Benefits**:
- Eliminates repeated memory allocation
- Better cache locality
- Enables parallel aggregation

**Complexity**: Requires CSR implementation (optimization #1) first.

**Reference**: [GVE-Louvain](https://arxiv.org/html/2312.04876v4) - "Holey CSR eliminates repeated memory allocation"

---

#### 12. Parallel Processing (Web Workers) ⭐⭐⭐⭐⭐
**Impact**: 2-4x speedup (multi-core) | **Difficulty**: Very Hard | **Quality**: No loss

**Solution**: Parallelize local moving phase using graph coloring:
1. Color graph (nodes with same color have no edges)
2. Process each color group in parallel
3. Nodes within same color can move independently

**Complexity**: Requires:
- Transferable data structures (SharedArrayBuffer)
- Graph coloring algorithm
- Worker coordination logic

**Note**: Deferred to future work. Focus on algorithmic optimizations first.

**Reference**: [GVE-Louvain](https://arxiv.org/html/2312.04876v4) - Achieves 50x speedup with parallelization

---

### Implementation Priority Matrix

| Technique | Impact | Difficulty | Priority | Expected Speedup | Implementation Time |
|-----------|--------|------------|----------|------------------|---------------------|
| **5. Random Neighbor Selection** | ⭐⭐⭐⭐⭐ | Medium | **HIGH** | 2-10x | 1 day |
| **2. Threshold Scaling** | ⭐⭐⭐⭐ | Easy | **HIGH** | 1.14x | 2 hours |
| **3. Aggregation Tolerance** | ⭐⭐⭐⭐ | Easy | **HIGH** | 1.14x | 2 hours |
| **4. Iteration Limits** | ⭐⭐⭐ | Easy | **HIGH** | 1.13x | 1 hour |
| **1. CSR Data Structure** | ⭐⭐⭐⭐⭐ | Hard | **MEDIUM** | 2.2x | 3-5 days |
| **6. Altered Communities** | ⭐⭐⭐ | Medium | **MEDIUM** | 1.2-1.3x | 2 days |
| **8. Community Hash Tables** | ⭐⭐⭐⭐ | Hard | **MEDIUM** | 1.3-1.5x | 2-3 days |
| **7. Vertex Pruning** | ⭐⭐⭐ | Medium | **LOW** | 1.11x | 1 day |
| **9. Degree Ordering** | ⭐⭐ | Easy | **LOW** | 1.05-1.1x | 2 hours |
| **11. Holey CSR** | ⭐⭐⭐ | Hard | **LOW** | 1.15-1.2x | 3 days |
| **10. Pre-compute Degrees** | ⭐⭐⭐ | Easy | **DONE** | ✓ | - |
| **12. Parallel Processing** | ⭐⭐⭐⭐⭐ | Very Hard | **FUTURE** | 2-4x | 2+ weeks |

---

### Recommended Implementation Plan

#### Phase 1: Quick Wins (1-2 days, ~1.4x speedup)
**Target**: 15.4s → ~11s for 1000 nodes

1. **Threshold Scaling** (2 hours, 14% speedup)
2. **Aggregation Tolerance** (2 hours, 14% speedup)
3. **Reduce Iteration Limits** (1 hour, 13% speedup) - Adjust from 40-50 to 20

**Combined Expected**: ~1.4x speedup

---

#### Phase 2: Medium Impact (3-5 days, ~3-5x cumulative)
**Target**: 11s → ~3-5s for 1000 nodes

4. **Random Neighbor Selection** (1 day, 2-10x speedup)
   - Implement Fast Louvain variant
   - Add flag to toggle between best/random for small graphs

5. **Altered Communities Heuristic** (2 days, 20-30% speedup)
   - Track changed communities
   - Implement neighbor propagation

**Combined Expected**: Phase 1 × 2.5x = ~3-5x total speedup

---

#### Phase 3: Major Refactoring (1-2 weeks, ~6-10x cumulative)
**Target**: 3-5s → ~1.5-2.5s for 1000 nodes

6. **CSR Data Structure** (3-5 days, 2.2x speedup)
   - Refactor entire algorithm to use array indices
   - Build CSR graph at initialization
   - Update all edge access patterns

7. **Community Hash Tables** (2-3 days, 30-50% speedup)
   - Implement cache with selective invalidation
   - Integrate with CSR structure

**Combined Expected**: Phase 2 × 2.2x × 1.4x = ~6-10x total speedup

---

#### Phase 4: Advanced Optimizations (Future)
8. **Vertex Pruning** (1 day, 11% speedup)
9. **Holey CSR for Aggregation** (3 days, 15-20% speedup)
10. **Parallel Processing** (2+ weeks, 2-4x speedup)

---

### Expected Complexity After All Optimizations

**Time Complexity**: O(L × |E|) where L ≈ 5-10 iterations
- **Empirically**: O(n log n) for sparse graphs
- **For 10x size increase**: 33-66x slowdown (vs. current 256x)

**Space Complexity**: O(n + m)
- CSR: 3 × (n + m) typed arrays (~12 bytes/edge for 32-bit)
- Community maps: O(n)
- Hash tables: O(c²) where c = community count

---

### Production Implementation Benchmarks

| Implementation | 100 nodes | 1000 nodes | 10,000 nodes | Language | Notes |
|----------------|-----------|------------|--------------|----------|-------|
| **GVE-Louvain** | ~2ms | ~20ms | ~200ms | C++ | 560M edges/s, highly optimized |
| **NetworKit** | ~5ms | ~50ms | ~500ms | C++ | Academic-grade |
| **graphology** | ~10ms | ~50ms | ~940ms | JavaScript | CSR-like, production |
| **NetworkX** | ~20ms | ~200ms | ~3s | Python | Pure Python, unoptimized |
| **Current Implementation** | 100-250ms | 15.4s | - | TypeScript | Needs optimization |
| **Phase 1-2 Target** | ~40-100ms | ~3-5s | - | TypeScript | Quick wins + medium impact |
| **Phase 3 Target** | ~20-50ms | ~1.5-2.5s | - | TypeScript | With CSR + caching |

**Realistic Target**: Match graphology performance (~50ms for 100 nodes, ~940ms for 1000 nodes, ~10s for 10,000 nodes)

---

### Key Implementation Insights

1. **First pass dominates runtime** (~67% of total time)
   - Optimize first-level local moving most aggressively
   - Use higher tolerances for first pass

2. **Aggregation phase often neglected**
   - Current hierarchical implementation already addresses this ✓
   - Holey CSR specifically optimizes aggregation

3. **Random shuffle helps convergence**
   - Already implemented ✓
   - Consider degree-based ordering for large graphs

4. **TypeScript-specific considerations**:
   - Typed arrays (Uint32Array, Float64Array) ~2x faster than regular arrays
   - Map lookups slower than array indexing (CSR helps)
   - Consider WebAssembly for core algorithm if Phase 3 insufficient

5. **Quality vs. Speed Trade-offs**:
   - Random neighbor selection: 2-5% modularity loss acceptable for 2-10x speedup
   - All other optimizations preserve quality
   - Use best-neighbor for small graphs (<100 nodes), random for large (>500 nodes)

---

### References

**Academic Papers**:
- [GVE-Louvain: Fast Louvain Algorithm](https://arxiv.org/html/2312.04876v4) - Comprehensive optimization techniques
- [Traag 2015: Faster unfolding of communities](https://arxiv.org/abs/1503.01322) - Random neighbor optimization
- [Physical Review E: Fast Louvain](https://pubmed.ncbi.nlm.nih.gov/26465522/)
- [Louvain method - Wikipedia](https://en.wikipedia.org/wiki/Louvain_method)

**Production Implementations**:
- [graphology-communities Louvain](https://graphology.github.io/standard-library/communities-louvain.html) - JavaScript
- [NetworkX Louvain](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.louvain.louvain_communities.html) - Python
- [Neo4j Graph Data Science](https://neo4j.com/docs/graph-data-science/current/algorithms/louvain/) - Production database
- [igraph Louvain](https://louvain-igraph.readthedocs.io/en/latest/intro.html) - C++ library

**Optimization Details**:
- [Fast Louvain Algorithm Docs](https://splines.github.io/fast-louvain/louvain/algorithm.html)
- [Delta modularity derivation](https://splines.github.io/fast-louvain/louvain/delta-modularity.html)

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

