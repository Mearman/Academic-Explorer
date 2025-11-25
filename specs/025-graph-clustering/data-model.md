# Data Model: Graph Partitioning and Clustering Algorithms

**Date**: 2025-11-25
**Feature**: [spec.md](./spec.md) | [plan.md](./plan.md) | [research.md](./research.md)

This document defines the data structures, types, and relationships for the 9 clustering, partitioning, and decomposition algorithms.

## Core Type Definitions

### Base Types

```typescript
// Node identifier (generic type parameter from Graph<N, E>)
type NodeId<N> = N;

// Community/Cluster identifier
type CommunityId = number;
type PartitionId = number;
type ClusterId = number;
type ModuleId = number;
type ComponentId = number;

// Quality metrics
type Modularity = number;        // Range: [-0.5, 1.0], higher is better
type Conductance = number;       // Range: [0.0, 1.0], lower is better
type Density = number;           // Range: [0.0, 1.0], edges / possible_edges
type CorenessScore = number;     // Range: [0.0, 1.0], core membership strength
type DescriptionLength = number; // Information-theoretic bits
type CompressionRatio = number;  // initial_length / final_length, > 1.0 is compression
```

---

## Entity Definitions

### 1. Community (Louvain/Leiden Output)

Represents a densely connected subgraph detected by community detection algorithms.

**Fields**:
- `id: CommunityId` - Unique community identifier (0-indexed)
- `nodes: Set<NodeId<N>>` - Set of nodes belonging to this community
- `internalEdges: number` - Number of edges within the community
- `externalEdges: number` - Number of edges crossing community boundary
- `modularity: number` - Contribution to global modularity score
- `density: number` - Internal edge density (actual_edges / possible_edges)
- `size: number` - Number of nodes in community

**Validation Rules**:
- `nodes.size > 0` - Non-empty community
- `size === nodes.size` - Consistent size tracking
- `internalEdges >= 0` - Non-negative edge count
- `density >= 0 && density <= 1.0` - Valid density range

**State Transitions**:
- Created during Louvain/Leiden local moving phase
- Merged during aggregation phase (multiple communities → single meta-node)
- Split during Leiden refinement phase (disconnected communities)

**Example**:
```typescript
{
  id: 0,
  nodes: new Set(['ML-001', 'ML-002', 'ML-003', 'ML-004', 'ML-005']),
  internalEdges: 8,
  externalEdges: 2,
  modularity: 0.42,
  density: 0.8,
  size: 5
}
```

---

### 2. Partition (Spectral Partitioning Output)

Represents a balanced division of the graph into k subgraphs.

**Fields**:
- `id: PartitionId` - Partition identifier (0 to k-1)
- `nodes: Set<NodeId<N>>` - Nodes assigned to this partition
- `size: number` - Number of nodes in partition
- `edgeCuts: number` - Edges connecting this partition to other partitions
- `balance: number` - Size relative to ideal size (ideal = n/k)

**Validation Rules**:
- `nodes.size > 0` - Non-empty partition
- `size === nodes.size` - Consistent size tracking
- `edgeCuts >= 0` - Non-negative edge cut count
- `balance > 0` - Positive balance ratio

**Relationships**:
- Multiple partitions form a complete partitioning (union of all partition.nodes = all graph nodes)
- Partitions are disjoint (no node appears in multiple partitions)

**Example**:
```typescript
{
  id: 0,
  nodes: new Set(['W-001', 'W-002', 'W-003']),
  size: 3,
  edgeCuts: 2,
  balance: 1.0  // size / (total_nodes / k) = 3 / 3
}
```

---

### 3. Dendrogram (Hierarchical Clustering Output)

Represents a hierarchical tree structure showing nested clustering levels.

**Fields**:
- `merges: MergeStep[]` - Sequence of cluster merge operations
- `heights: number[]` - Height at which each merge occurred
- `leafNodes: NodeId<N>[]` - Original graph nodes (leaves of dendrogram)
- `clusterSizes: number[]` - Size of cluster formed at each merge step

**MergeStep Structure**:
```typescript
type MergeStep<N> = {
  cluster1: number;  // Index of first cluster being merged (< 0 for leaves)
  cluster2: number;  // Index of second cluster (< 0 for leaves)
  distance: number;  // Distance/dissimilarity between clusters
  size: number;      // Size of resulting merged cluster
};
```

**Validation Rules**:
- `merges.length === leafNodes.length - 1` - Binary tree property (n-1 internal nodes for n leaves)
- `heights.length === merges.length` - One height per merge
- `heights[i] <= heights[i+1]` - Heights non-decreasing (monotonic merge order)
- Leaf indices are negative: `-1` to `-n` map to `leafNodes[0]` to `leafNodes[n-1]`

**Operations**:
- `cutAtHeight(h: number): Set<NodeId<N>>[]` - Cut dendrogram at height h, return flat clusters
- `getClusters(numClusters: number): Set<NodeId<N>>[]` - Get exactly k clusters by cutting

**Example**:
```typescript
{
  merges: [
    { cluster1: -1, cluster2: -2, distance: 0.1, size: 2 },  // Merge nodes 0,1
    { cluster1: -3, cluster2: 0, distance: 0.3, size: 3 },   // Merge node 2 with cluster {0,1}
  ],
  heights: [0.1, 0.3],
  leafNodes: ['Topic-AI', 'Topic-ML', 'Topic-DL'],
  clusterSizes: [2, 3]
}
```

---

### 4. Core (K-Core Decomposition Output)

Represents a maximal subgraph where all nodes have degree ≥ k within the subgraph.

**Fields**:
- `k: number` - Core number (minimum degree within core)
- `nodes: Set<NodeId<N>>` - Nodes in the k-core
- `size: number` - Number of nodes in core
- `degeneracy: number` - Maximum k value across all cores (for the graph)
- `coreNumbers: Map<NodeId<N>, number>` - Per-node core numbers

**Validation Rules**:
- `k >= 1` - Valid core number
- `nodes.size > 0` - Non-empty core
- All nodes in core have degree ≥ k within the induced subgraph
- `degeneracy >= k` - Core number cannot exceed graph degeneracy

**Relationships**:
- Cores are nested: (k+1)-core ⊆ k-core
- Core hierarchy: k=1 (all nodes) ⊃ k=2 ⊃ ... ⊃ k=k_max (most dense core)

**Example**:
```typescript
{
  k: 5,
  nodes: new Set(['Paper-001', 'Paper-042', 'Paper-137']),
  size: 3,
  degeneracy: 8,
  coreNumbers: new Map([
    ['Paper-001', 5],
    ['Paper-042', 6],
    ['Paper-137', 5]
  ])
}
```

---

### 5. LeidenCommunity (Leiden Clustering Output)

Enhanced community structure with connectivity guarantee (all nodes in community form connected subgraph).

**Fields**:
- `id: CommunityId` - Community identifier
- `nodes: Set<NodeId<N>>` - Nodes in this Leiden community
- `modularity: number` - Modularity contribution
- `isConnected: boolean` - Connectivity guarantee (always true for Leiden)
- `internalEdges: number` - Edges within community
- `conductance: number` - Boundary quality metric

**Validation Rules**:
- `isConnected === true` - Leiden guarantee
- `nodes.size > 0` - Non-empty community
- `modularity >= -0.5 && modularity <= 1.0` - Valid modularity range
- `conductance >= 0 && conductance <= 1.0` - Valid conductance range

**Invariant**:
- BFS from any node in `nodes` reaches all other nodes in `nodes` using only edges within community

**Example**:
```typescript
{
  id: 0,
  nodes: new Set(['A-001', 'A-002', 'A-003']),
  modularity: 0.38,
  isConnected: true,
  internalEdges: 4,
  conductance: 0.15
}
```

---

### 6. LabelCluster (Label Propagation Output)

Fast clustering result from label propagation algorithm.

**Fields**:
- `label: ClusterId` - Cluster label (inherited from seed node or converged label)
- `nodes: Set<NodeId<N>>` - Nodes with this label
- `size: number` - Cluster size
- `iterations: number` - Number of iterations until convergence (or max iterations)
- `stable: boolean` - True if converged, false if hit max iterations

**Validation Rules**:
- `nodes.size > 0` - Non-empty cluster
- `size === nodes.size` - Consistent size
- `iterations > 0` - At least one iteration executed

**Notes**:
- Labels are non-deterministic due to random node ordering and tie-breaking
- Multiple runs may produce different labelings with similar quality
- Stability indicates true convergence vs. forced termination

**Example**:
```typescript
{
  label: 42,
  nodes: new Set(['W-010', 'W-015', 'W-023', 'W-044']),
  size: 4,
  iterations: 3,
  stable: true
}
```

---

### 7. InfomapModule (Infomap Clustering Output)

Information-theoretic community based on flow compression.

**Fields**:
- `id: ModuleId` - Module identifier
- `nodes: Set<NodeId<N>>` - Nodes in this module
- `descriptionLength: number` - Bits required to describe random walk within module
- `visitProbability: number` - Steady-state probability of random walk visiting this module
- `compressionRatio: number` - initial_description_length / module_description_length

**Validation Rules**:
- `nodes.size > 0` - Non-empty module
- `descriptionLength > 0` - Positive description length (information-theoretic)
- `visitProbability >= 0 && visitProbability <= 1.0` - Valid probability
- `compressionRatio >= 1.0` - Successful compression (< 1.0 indicates expansion, bad partitioning)

**Information-Theoretic Interpretation**:
- Description length: H(X) + Σ p_i H(X_i) where H is Shannon entropy
- Lower description length = better clustering (more compressed random walk encoding)
- Compression ratio > 1.5 indicates good clustering quality for citation networks

**Example**:
```typescript
{
  id: 0,
  nodes: new Set(['C-001', 'C-012', 'C-034']),
  descriptionLength: 12.5,
  visitProbability: 0.3,
  compressionRatio: 1.8  // 1.8x compression achieved
}
```

---

### 8. CorePeripheryStructure (Core-Periphery Decomposition Output)

Network decomposition into dense core and sparse periphery.

**Fields**:
- `coreNodes: Set<NodeId<N>>` - Nodes identified as core (coreness > threshold)
- `peripheryNodes: Set<NodeId<N>>` - Nodes identified as periphery (coreness ≤ threshold)
- `corenessScores: Map<NodeId<N>, number>` - Per-node coreness scores (0.0 to 1.0)
- `coreThreshold: number` - Threshold used to separate core from periphery (default: 0.7)
- `fitQuality: number` - Correlation between observed and ideal core-periphery structure

**Validation Rules**:
- `coreNodes.size + peripheryNodes.size === total_nodes` - Complete partitioning
- `coreNodes` and `peripheryNodes` are disjoint
- All `corenessScores` values in range [0.0, 1.0]
- `coreThreshold >= 0 && coreThreshold <= 1.0`
- Core nodes: `corenessScores.get(node) > coreThreshold`
- Periphery nodes: `corenessScores.get(node) <= coreThreshold`

**Ideal Structure**:
- Core nodes densely connected to each other (high internal density)
- Periphery nodes sparsely connected to each other (low internal density)
- Core nodes moderately connected to periphery (moderate cross-boundary density)

**Example**:
```typescript
{
  coreNodes: new Set(['Seminal-001', 'Seminal-002']),
  peripheryNodes: new Set(['Derivative-001', 'Derivative-002', 'Derivative-003']),
  corenessScores: new Map([
    ['Seminal-001', 0.95],
    ['Seminal-002', 0.87],
    ['Derivative-001', 0.42],
    ['Derivative-002', 0.31],
    ['Derivative-003', 0.18]
  ]),
  coreThreshold: 0.7,
  fitQuality: 0.82
}
```

---

### 9. BiconnectedComponent (Biconnected Component Decomposition Output)

Maximal subgraph with no articulation points (remains connected after removing any single node).

**Fields**:
- `id: ComponentId` - Component identifier
- `nodes: Set<NodeId<N>>` - Nodes in this biconnected component
- `size: number` - Number of nodes
- `articulationPoints: Set<NodeId<N>>` - Articulation points connecting this component to others
- `isBridge: boolean` - True if component consists of a single bridge edge

**Validation Rules**:
- `nodes.size >= 2` - At least 2 nodes (biconnected property)
- `size === nodes.size` - Consistent size
- Articulation points may or may not be in `nodes` (they connect multiple components)
- If `isBridge === true`, then `nodes.size === 2` (bridge is single edge)

**Invariant**:
- Removing any node from `nodes` (except articulation points) does not disconnect the component

**Articulation Point Detection**:
- A node is an articulation point if removing it increases the number of connected components
- Biconnected components are separated by articulation points

**Example**:
```typescript
{
  id: 0,
  nodes: new Set(['N-001', 'N-002', 'N-003', 'N-004']),
  size: 4,
  articulationPoints: new Set(['N-002', 'N-005']),
  isBridge: false
}
```

---

### 10. ClusterMetrics (Quality Measurement)

Aggregated quality metrics for clustering results.

**Fields**:
- `modularity: number` - Global modularity score (Newman-Girvan)
- `avgConductance: number` - Average conductance across communities
- `avgDensity: number` - Average internal density across communities
- `numClusters: number` - Total number of clusters/communities
- `silhouetteCoefficient: number` - Silhouette score (if applicable, -1 to 1)
- `coverageRatio: number` - Fraction of edges within clusters vs. total edges

**Validation Rules**:
- `modularity >= -0.5 && modularity <= 1.0`
- `avgConductance >= 0 && avgConductance <= 1.0`
- `avgDensity >= 0 && avgDensity <= 1.0`
- `numClusters > 0`
- `silhouetteCoefficient >= -1 && silhouetteCoefficient <= 1.0` (if computed)
- `coverageRatio >= 0 && coverageRatio <= 1.0`

**Example**:
```typescript
{
  modularity: 0.42,
  avgConductance: 0.23,
  avgDensity: 0.71,
  numClusters: 5,
  silhouetteCoefficient: 0.58,
  coverageRatio: 0.89
}
```

---

## Result Type Wrappers

All algorithms return results wrapped in `Result<T, E>` for error handling.

```typescript
type ClusteringResult<N> = {
  communities: Community<N>[] | LeidenCommunity<N>[] | LabelCluster<N>[] | InfomapModule<N>[];
  metrics: ClusterMetrics;
  metadata: {
    algorithm: 'louvain' | 'leiden' | 'label-propagation' | 'infomap';
    runtime: number; // milliseconds
    iterations?: number;
    parameters: Record<string, unknown>;
  };
};

type PartitionResult<N> = {
  partitions: Partition<N>[];
  totalEdgeCuts: number;
  balanceRatio: number; // max_size / min_size
  metadata: {
    algorithm: 'spectral';
    runtime: number;
    k: number; // number of partitions
    parameters: Record<string, unknown>;
  };
};

type DecompositionResult<N> =
  | KCoreResult<N>
  | CorePeripheryResult<N>
  | BiconnectedResult<N>;

type KCoreResult<N> = {
  cores: Map<number, Core<N>>; // k -> Core
  degeneracy: number;
  coreNumbers: Map<NodeId<N>, number>;
  metadata: {
    algorithm: 'k-core';
    runtime: number;
  };
};

type CorePeripheryResult<N> = {
  structure: CorePeripheryStructure<N>;
  metadata: {
    algorithm: 'core-periphery';
    runtime: number;
    iterations: number;
    convergence: boolean;
  };
};

type BiconnectedResult<N> = {
  components: BiconnectedComponent<N>[];
  articulationPoints: Set<NodeId<N>>;
  metadata: {
    algorithm: 'biconnected';
    runtime: number;
  };
};

type HierarchicalResult<N> = {
  dendrogram: Dendrogram<N>;
  metadata: {
    algorithm: 'hierarchical';
    runtime: number;
    linkage: 'average' | 'single' | 'complete';
  };
};
```

---

## Error Types

```typescript
type ClusteringError =
  | { type: 'InvalidInput'; message: string }
  | { type: 'EmptyGraph'; message: string }
  | { type: 'DisconnectedGraph'; message: string; componentCount: number }
  | { type: 'ConvergenceFailure'; message: string; iterations: number }
  | { type: 'InsufficientNodes'; message: string; required: number; actual: number }
  | { type: 'InvalidParameter'; parameter: string; message: string };
```

---

## Storage Considerations

**No Persistence Layer**: All data structures are ephemeral, created during algorithm execution and returned to caller. No database or IndexedDB storage required.

**Memory Efficiency**:
- Use `Set<NodeId<N>>` instead of `Array<NodeId<N>>` for O(1) membership checks
- Use `Map<NodeId<N>, T>` for per-node data (core numbers, coreness scores)
- Sparse matrix representation for Laplacian (spectral partitioning)
- Reuse data structures across iterations where possible

---

## Type File Structure

Types will be defined in:
- `packages/algorithms/src/types/clustering-types.ts` - All entity definitions above
- Each algorithm file imports types as needed
- No re-exports between packages (Constitution Principle III)

