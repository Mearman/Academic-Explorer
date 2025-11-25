# Data Model: Louvain Algorithm Scaling Optimization

**Feature**: Louvain Algorithm Scaling Optimization
**Date**: 2025-11-25
**Status**: Phase 1 Design

## Overview

This document defines the data structures and types required for the three-phase optimization of the Louvain community detection algorithm. The model evolves across phases:

- **Phase 1**: Configuration types for parameter tuning
- **Phase 2**: Altered communities tracking state
- **Phase 3**: CSR graph representation and community cache

## Core Entities

### LouvainConfiguration (Phase 1 & 2)

Configuration object for algorithm behavior and optimization settings.

**Fields**:
- `mode: "auto" | "best" | "random"` - Neighbor selection strategy
  - `"auto"` (default): Best-neighbor for <200 nodes, random for ≥500 nodes
  - `"best"`: Always evaluate all neighbors, select maximum ΔQ (quality-first)
  - `"random"`: Accept first neighbor with positive ΔQ (speed-first)

- `seed?: number` - Random seed for deterministic neighbor shuffling
  - Optional: If provided, enables reproducible test results
  - If undefined, uses Math.random() (non-deterministic)

- `minModularityIncrease?: number` - Convergence threshold override
  - Optional: If provided, overrides adaptive threshold
  - Default (adaptive): 1e-5 for graphs >500 nodes, 1e-6 for smaller graphs

- `maxIterations?: number` - Iteration limit override
  - Optional: If provided, overrides adaptive limit
  - Default (adaptive): 20 for graphs >200 nodes (first level), 40-50 for smaller graphs

**Validation Rules**:
- `mode` must be one of the three allowed values
- `seed` must be non-negative integer if provided
- `minModularityIncrease` must be positive if provided
- `maxIterations` must be positive integer if provided

**State Transitions**: Configuration is immutable once set (passed to algorithm function)

---

### CSRGraph<N, E> (Phase 3)

Compressed Sparse Row graph representation for fast neighbor access.

**Fields**:
- `offsets: Uint32Array` - Index into edges array for each node
  - Length: n + 1 (where n = node count)
  - offsets[i] = start index of node i's neighbors in edges array
  - offsets[i+1] = end index (exclusive) of node i's neighbors
  - Enables O(1) neighbor slice: edges[offsets[i]:offsets[i+1]]

- `edges: Uint32Array` - Target node indices (flattened adjacency lists)
  - Length: m (where m = total edge count)
  - Values: Integer indices (0 to n-1)
  - Node i's neighbors: edges[offsets[i]:offsets[i+1]]

- `weights: Float64Array` - Edge weights (parallel to edges array)
  - Length: m (same as edges)
  - weights[k] = weight of edge edges[k]
  - For unweighted graphs, all values = 1.0

- `nodeIds: string[]` - Map integer index → original node ID
  - Length: n
  - nodeIds[i] = original string ID for node at index i

- `nodeIndex: Map<string, number>` - Map original node ID → integer index
  - Size: n
  - Inverse of nodeIds array
  - Enables O(1) lookup: nodeIndex.get(nodeId) → integer index

**Validation Rules**:
- offsets.length === nodeIds.length + 1
- edges.length === weights.length
- offsets[n] === edges.length (last offset points to end of edges array)
- All edges[k] values in range [0, n-1]
- All offsets[i] ≤ offsets[i+1] (monotonically non-decreasing)
- nodeIndex.size === nodeIds.length
- nodeIndex keys === nodeIds values (bijection)

**State Transitions**: CSRGraph is immutable after construction (readonly structure)

---

### CommunityHashTable (Phase 3)

Cache for community-to-community edge weight sums, used in ΔQ calculations.

**Fields**:
- Key: `"${fromCommunityId}-${toCommunityId}"` (string)
  - Composite key combining source and target community IDs
  - Example: "5-12" represents edge weight sum from community 5 to community 12

- Value: `number` (sum of edge weights between communities)
  - Precomputed sum: Σ weight(u, v) for all edges u ∈ fromCommunity, v ∈ toCommunity

**Operations**:
- `get(fromId: number, toId: number): number | undefined` - Retrieve cached sum
- `set(fromId: number, toId: number, weight: number): void` - Store computed sum
- `invalidate(communityId: number): void` - Delete all entries involving communityId
  - Deletes: `${communityId}-${*}` and `${*}-${communityId}`
  - Called when nodes move in/out of community

**Validation Rules**:
- Keys are always formatted as `"${number}-${number}"`
- Values are always finite positive numbers (edge weights are positive)

**State Transitions**:
```
Empty → Populated (lazy: entries added on first ΔQ calculation)
Populated → Partially Invalidated (on node move: delete affected entries)
Partially Invalidated → Repopulated (lazy: rebuild on next ΔQ check)
```

**Invalidation Strategy (Selective)**:
When node v moves from community A to B:
1. Delete all entries where fromId === A or toId === A
2. Delete all entries where fromId === B or toId === B
3. Preserve all other entries (unaffected communities)
4. Lazy recomputation: Rebuild deleted entries on next access

---

### AlteredCommunitiesState (Phase 2)

Tracks which communities had nodes move in/out during the current iteration.

**Fields**:
- `alteredCommunities: Set<number>` - Community IDs that changed
  - Initialized with all community IDs on first iteration
  - Cleared and repopulated each subsequent iteration
  - Updated when node moves: add both source and target communities

**Operations**:
- `reset(): void` - Clear set (start of new iteration)
- `markAltered(communityId: number): void` - Add community to set
- `isAltered(communityId: number): boolean` - Check if community changed
- `getAlteredNodes(communities: Map<string, number>): Set<string>` - Get all nodes in altered communities plus their neighbors

**Validation Rules**:
- Community IDs must be non-negative integers
- Set size ≤ total number of communities

**State Transitions**:
```
Iteration Start → Reset (clear set)
Node Move → Mark Source and Target (add to set)
Iteration End → Use for Next Iteration Filtering
```

---

## Type Definitions (TypeScript)

### Phase 1 & 2 Types

```typescript
/**
 * Configuration for Louvain algorithm optimization.
 */
export interface LouvainConfiguration {
  /**
   * Neighbor selection strategy.
   * - "auto": Best-neighbor for <200 nodes, random for ≥500 nodes (default)
   * - "best": Always use best-neighbor (quality-first)
   * - "random": Always use random-neighbor (speed-first)
   */
  mode?: "auto" | "best" | "random";

  /**
   * Random seed for deterministic neighbor shuffling.
   * If undefined, uses Math.random() (non-deterministic).
   */
  seed?: number;

  /**
   * Modularity convergence threshold override.
   * If undefined, uses adaptive threshold (1e-5 for large graphs, 1e-6 for small).
   */
  minModularityIncrease?: number;

  /**
   * Maximum iterations override.
   * If undefined, uses adaptive limit (20 for large graphs, 40-50 for small).
   */
  maxIterations?: number;
}

/**
 * Altered communities tracking state.
 */
export interface AlteredCommunitiesState {
  /** Communities that had nodes move in/out during current iteration */
  alteredCommunities: Set<number>;
}
```

### Phase 3 Types

```typescript
/**
 * Compressed Sparse Row graph representation.
 */
export interface CSRGraph<N extends Node, E extends Edge> {
  /** Index into edges array for each node (length: n+1) */
  offsets: Uint32Array;

  /** Target node indices (length: m) */
  edges: Uint32Array;

  /** Edge weights (length: m) */
  weights: Float64Array;

  /** Map integer index → original node ID (length: n) */
  nodeIds: string[];

  /** Map original node ID → integer index (size: n) */
  nodeIndex: Map<string, number>;
}

/**
 * Community-to-community edge weight cache.
 */
export type CommunityHashTable = Map<string, number>;

/**
 * Helper to build cache key.
 */
export function communityKey(fromId: number, toId: number): string {
  return `${fromId}-${toId}`;
}
```

---

## Relationships

### Phase 1 Relationships
- `LouvainConfiguration` → Passed to `louvain()` function
- Configuration determines threshold, iteration limit, convergence detection

### Phase 2 Relationships
- `LouvainConfiguration.mode` → Determines Fast Louvain activation
- `AlteredCommunitiesState` → Filters nodes to visit each iteration
- Altered communities → Includes border nodes (neighbors of altered nodes)

### Phase 3 Relationships
- `CSRGraph` → Replaces Graph<N, E> for neighbor lookups
- `CommunityHashTable` → Cached ΔQ calculations reference this
- Node moves → Trigger selective cache invalidation
- CSR offsets → Enable O(1) neighbor slice (vs Map.get() lookup)

---

## Migration Notes

### Phase 1 Migration (Backward Compatible)
- Add optional `LouvainConfiguration` parameter to `louvain()` function
- If not provided, use adaptive defaults (no breaking change)
- Existing callers without config continue working

### Phase 2 Migration (Backward Compatible)
- Add `mode` field to existing `LouvainConfiguration`
- Default mode = "auto" (no breaking change)
- Existing code automatically benefits from Fast Louvain for large graphs

### Phase 3 Migration (Breaking Change Acceptable)
- Convert Graph<N, E> → CSRGraph<N, E> at function entry
- Option 1: Convert automatically (transparent to caller)
- Option 2: Accept both Graph and CSRGraph (overload signature)
- Principle VII allows breaking changes during development

---

## Performance Implications

### Phase 1 (Minimal Memory Impact)
- LouvainConfiguration: ~32 bytes (4 fields)
- No additional runtime memory

### Phase 2 (Moderate Memory Impact)
- AlteredCommunitiesState: O(c) where c = communities (typically <<n)
- Set<number>: ~16 bytes per community ID
- Typical: <1KB for 1000-node graph

### Phase 3 (Significant Memory Reduction)
- **Current (Map-based)**: ~200-300 bytes per node
  - Map overhead + object references + string keys
- **CSR**: ~24 bytes per node + 12 bytes per edge
  - offsets: 4 bytes/node
  - nodeIds: ~20 bytes/node (string overhead)
  - edges: 4 bytes/edge
  - weights: 8 bytes/edge
- **Cache**: ~32 bytes per community pair
  - Map<string, number>: key (string) + value (number)
  - Typically O(c²) where c << n

**Example (1000 nodes, 10,000 edges)**:
- Current: ~250KB (Map-based)
- CSR: ~144KB (24KB nodes + 120KB edges)
- Cache: ~3KB (100 communities → ~10,000 pairs max, sparse in practice)
- **Total Phase 3**: ~150KB (40% reduction from baseline)

Target: <100MB for 1000 nodes (easily achieved, CSR is memory-efficient)
