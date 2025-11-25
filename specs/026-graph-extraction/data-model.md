# Data Model: Graph Extraction

**Feature**: 026-graph-extraction
**Date**: 2025-11-25
**Phase**: Phase 1 - Data Model Design

## Core Entities

### 1. Graph<N, E> (Existing)

**Source**: `packages/algorithms/src/graph/graph.ts`

The primary data structure for all extraction operations. Already implemented.

**Key Methods Used**:
- `getNode(id: string): Option<N>`
- `getNeighbors(id: string): Result<string[], InvalidInputError>`
- `getAllNodes(): N[]`
- `getAllEdges(): E[]`
- `isDirected(): boolean`
- `addNode(node: N): Result<void, DuplicateNodeError>`
- `addEdge(edge: E): Result<void, InvalidInputError>`

**Constraints**:
- Generic type parameters: `N extends Node`, `E extends Edge`
- Immutable operations: extraction creates new Graph instances
- Adjacency list representation: O(1) neighbor lookup

---

### 2. SubgraphFilter<N, E>

**Purpose**: Specification for attribute-based filtering operations

**Type Definition**:
```typescript
type NodePredicate<N extends Node> = (node: N) => boolean;
type EdgePredicate<E extends Edge> = (edge: E) => boolean;

interface SubgraphFilter<N extends Node, E extends Edge> {
  /**
   * Predicate to filter nodes by attributes.
   * Returns true if node should be included in subgraph.
   */
  nodeFilter?: NodePredicate<N>;

  /**
   * Predicate to filter edges by attributes.
   * Returns true if edge should be included in subgraph.
   */
  edgeFilter?: EdgePredicate<E>;

  /**
   * How to combine node and edge filters.
   * - 'AND': Include nodes AND edges that pass both filters
   * - 'OR': Include nodes OR edges that pass either filter
   */
  combinator?: 'AND' | 'OR';
}
```

**Validation Rules**:
- At least one of `nodeFilter` or `edgeFilter` must be provided
- Default combinator is 'AND'
- Predicates must be pure functions (no side effects)
- Empty filter (no predicates) returns original graph

**Example Usage**:
```typescript
const filter: SubgraphFilter<WorkNode, CitationEdge> = {
  nodeFilter: (node) => node.year >= 2020 && node.citationCount > 10,
  edgeFilter: (edge) => edge.type === 'REFERENCE',
  combinator: 'AND'
};
```

---

### 3. EgoNetworkOptions

**Purpose**: Configuration for ego network extraction

**Type Definition**:
```typescript
interface EgoNetworkOptions {
  /**
   * Seed node ID(s) to center ego network around.
   * Single seed or multiple seeds for multi-source ego network.
   */
  seeds: string | string[];

  /**
   * Maximum hop distance from seed node(s).
   * radius=1: immediate neighbors
   * radius=2: neighbors of neighbors
   * radius=k: all nodes within k hops
   */
  radius: number;

  /**
   * Whether to include edges between nodes in the ego network.
   * Default: true (induced subgraph)
   */
  includeInternalEdges?: boolean;
}
```

**Validation Rules**:
- `radius` must be positive integer (radius ≥ 1)
- `seeds` must be non-empty array or single string
- All seed IDs must exist in graph
- Default `includeInternalEdges` is true

**Behavior**:
- Multi-source ego networks return union of individual ego networks
- Distance measured as shortest hop count from ANY seed
- Disconnected graphs: only return connected component(s) containing seeds

---

### 4. PathResult<N, E>

**Purpose**: Result of shortest path search between two nodes

**Type Definition**:
```typescript
interface PathResult<N extends Node, E extends Edge> {
  /**
   * Source node ID (start of path)
   */
  source: string;

  /**
   * Target node ID (end of path)
   */
  target: string;

  /**
   * Ordered sequence of node IDs forming the path.
   * Includes source and target.
   * Empty array if no path exists.
   */
  path: string[];

  /**
   * Ordered sequence of edges forming the path.
   * Empty array if no path exists.
   */
  edges: E[];

  /**
   * Length of path in hops (number of edges).
   * Infinity if no path exists.
   */
  length: number;

  /**
   * Total weight of path (sum of edge weights).
   * For unweighted graphs, equals length.
   */
  weight: number;
}
```

**Invariants**:
- `path.length = edges.length + 1` (when path exists)
- `path[0] === source` and `path[path.length-1] === target`
- `edges[i].source === path[i]` and `edges[i].target === path[i+1]`
- If no path exists: `path = []`, `edges = []`, `length = Infinity`, `weight = Infinity`

**Edge Cases**:
- Source equals target: `path = [source]`, `edges = []`, `length = 0`, `weight = 0`
- No path exists: return PathResult with empty arrays and Infinity values
- Multiple shortest paths: return one (deterministic tie-breaking by node ID)

---

### 5. ReachabilitySet<N>

**Purpose**: Set of nodes reachable from source node(s)

**Type Definition**:
```typescript
interface ReachabilitySet<N extends Node> {
  /**
   * Source node ID(s) for reachability analysis
   */
  sources: string[];

  /**
   * Set of node IDs reachable from any source
   * (includes sources themselves)
   */
  reachableNodeIds: Set<string>;

  /**
   * Map from node ID to minimum distance from any source.
   * Only includes reachable nodes.
   */
  distances: Map<string, number>;
}
```

**Properties**:
- `reachableNodeIds.size >= sources.length` (sources always reachable from themselves)
- `distances.has(id)` for all `id` in `reachableNodeIds`
- Distance from source to itself is 0
- Forward reachability: follow edge direction
- Backward reachability: reverse edges, then forward search

**Use Cases**:
- Citation impact: all papers citing a seminal work (backward reachability)
- Influence propagation: all papers influenced by a paper (forward reachability)
- Community boundary: reachable set defines influence sphere

---

### 6. Triangle<N, E>

**Purpose**: Represents a 3-node cycle (triangle) in the graph

**Type Definition**:
```typescript
interface Triangle<N extends Node, E extends Edge> {
  /**
   * Three distinct node IDs forming the triangle.
   * Order: sorted by ID for canonical representation.
   */
  nodes: [string, string, string];

  /**
   * Three edges forming the triangle cycle.
   * Order matches node order: [e1, e2, e3] where
   * e1: nodes[0] → nodes[1]
   * e2: nodes[1] → nodes[2]
   * e3: nodes[2] → nodes[0] (directed) or nodes[0] ↔ nodes[2] (undirected)
   */
  edges: [E, E, E];
}
```

**Invariants**:
- `nodes[0] < nodes[1] < nodes[2]` (lexicographic order for canonical form)
- All nodes distinct (no self-loops)
- All edges exist in graph
- For directed graphs: must form actual cycle (A→B, B→C, C→A)
- For undirected graphs: any three edges connecting three nodes

**Academic Interpretations**:
- Co-citation triangle: Two papers (A, B) cite common source (C)
  - Pattern: A→C, B→C, and A-B edge (bibliographic coupling)
- Collaboration triangle: Three authors with pairwise collaborations
- Reference chain: A→B→C→A (citation cycle, rare but possible)

---

### 7. StarPattern<N>

**Purpose**: Identifies high-degree nodes (hubs) in the graph

**Type Definition**:
```typescript
type StarType = 'IN_STAR' | 'OUT_STAR' | 'UNDIRECTED_STAR';

interface StarPattern<N extends Node> {
  /**
   * Center node ID (hub)
   */
  center: string;

  /**
   * Node IDs connected to center
   */
  spokes: string[];

  /**
   * Degree of center node (size of star)
   */
  degree: number;

  /**
   * Type of star pattern
   * - IN_STAR: high in-degree (many incoming edges to center)
   * - OUT_STAR: high out-degree (many outgoing edges from center)
   * - UNDIRECTED_STAR: high degree in undirected graph
   */
  starType: StarType;
}
```

**Detection Criteria**:
- User provides minimum degree threshold
- IN_STAR: filter nodes by in-degree ≥ threshold
- OUT_STAR: filter nodes by out-degree ≥ threshold
- UNDIRECTED_STAR: filter nodes by total degree ≥ threshold

**Academic Interpretations**:
- IN_STAR (high in-degree): Seminal work cited by many papers
- OUT_STAR (high out-degree): Review paper citing many sources
- UNDIRECTED_STAR (collaboration): Prolific researcher with many co-authors

---

### 8. CoCitationPair<N>

**Purpose**: Identifies pairs of papers citing common sources

**Type Definition**:
```typescript
interface CoCitationPair<N extends Node> {
  /**
   * IDs of two papers that cite the same source
   */
  citingPapers: [string, string];

  /**
   * ID of the commonly cited source paper
   */
  citedSource: string;

  /**
   * Strength of coupling (number of shared citations)
   * For this pair: always 1 (single shared citation)
   * Aggregate across all sources for total coupling strength
   */
  couplingStrength: number;
}
```

**Bibliographic Coupling**:
```typescript
interface BibliographicCouplingPair<N extends Node> {
  /**
   * IDs of two papers cited by the same source
   */
  coupledPapers: [string, string];

  /**
   * ID of the paper citing both coupled papers
   */
  citingSource: string;

  /**
   * Strength of coupling
   */
  couplingStrength: number;
}
```

**Detection Algorithm**:
1. Group citation edges by target (co-citation) or source (bibliographic coupling)
2. For each group with ≥2 papers, generate all pairs
3. Return pairs with their coupling strength

**Aggregate Coupling Strength**:
- Two papers may share multiple citations
- Total coupling = number of shared sources
- Higher coupling indicates topical similarity

---

### 9. KTrussSubgraph<N, E>

**Purpose**: Dense subgraph where every edge participates in at least k-2 triangles

**Type Definition**:
```typescript
interface KTrussSubgraph<N extends Node, E extends Edge> {
  /**
   * The k value for this k-truss
   */
  k: number;

  /**
   * Subgraph containing only edges with sufficient triangle support
   */
  subgraph: Graph<N, E>;

  /**
   * Map from edge ID to triangle support count
   * (number of triangles containing this edge)
   */
  edgeSupport: Map<string, number>;

  /**
   * Maximum k value achievable for each edge before removal
   * (useful for understanding cohesion hierarchy)
   */
  trussNumber: Map<string, number>;
}
```

**Properties**:
- All edges in `subgraph` have `edgeSupport[edgeId] >= k-2`
- `trussNumber[edgeId]` is the maximum k where edge survives in k-truss
- For k=3: every edge in at least 1 triangle (3-2=1)
- For k=4: every edge in at least 2 triangles (4-2=2)

**Special Cases**:
- k=1: returns all edges (no triangle requirement)
- k=2: returns empty graph (impossible to have edge in 0 triangles and be connected)
- k > maximum truss number: returns empty graph

**Academic Interpretation**:
- Higher k indicates tighter research community
- 3-truss: basic collaborative network (all pairs connected through third party)
- 4-truss: stronger cohesion (redundant collaboration paths)

---

## Error Types

### ExtractionError

**Type Definition**:
```typescript
type ExtractionError =
  | InvalidInputError
  | InvalidRadiusError
  | InvalidKError
  | EmptyResultWarning
  | GraphTooLargeError;

interface InvalidInputError {
  type: 'invalid-input';
  message: string;
  input: unknown;
}

interface InvalidRadiusError {
  type: 'invalid-radius';
  message: string;
  radius: number;
}

interface InvalidKError {
  type: 'invalid-k';
  message: string;
  k: number;
}

interface EmptyResultWarning {
  type: 'empty-result';
  message: string;
  context: string;
}

interface GraphTooLargeError {
  type: 'graph-too-large';
  message: string;
  nodeCount: number;
  limit: number;
}
```

**Error Handling Strategy**:
- Input validation errors: fail fast with `Err(InvalidInputError)`
- Empty results: return `Ok(emptyGraph)` or `Ok(emptyArray)` (NOT an error)
- Performance limits: optional validation, can be disabled for large graphs

---

## Data Flow Diagrams

### Ego Network Extraction
```
Input: Graph<N, E> + EgoNetworkOptions
  ↓
Validate: seeds exist, radius > 0
  ↓
BFS: compute distances from seeds
  ↓
Filter: nodes where distance ≤ radius
  ↓
Extract: induced subgraph from filtered nodes
  ↓
Output: Result<Graph<N, E>, ExtractionError>
```

### Attribute Filtering
```
Input: Graph<N, E> + SubgraphFilter<N, E>
  ↓
Validate: at least one filter provided
  ↓
Filter Nodes: apply nodeFilter predicate
  ↓
Filter Edges: apply edgeFilter predicate + check endpoints
  ↓
Combine: apply combinator logic (AND/OR)
  ↓
Extract: induced subgraph from filtered elements
  ↓
Output: Result<Graph<N, E>, ExtractionError>
```

### Triangle Detection
```
Input: Graph<N, E>
  ↓
Validate: graph not null
  ↓
For each node v:
  ├─ Get neighbors of v
  ├─ For each pair (u, w) in neighbors:
  │   └─ Check if edge (u, w) exists
  │       └─ If yes: yield Triangle{v, u, w}
  └─ Continue
  ↓
Output: Result<Triangle<N, E>[], ExtractionError>
```

### K-Truss Extraction
```
Input: Graph<N, E> + k value
  ↓
Validate: k >= 3
  ↓
Compute: triangle support for all edges
  ↓
While exists edge with support < k-2:
  ├─ Remove edge with lowest support
  ├─ Update support for affected edges
  └─ Continue
  ↓
Extract: induced subgraph from remaining edges
  ↓
Output: Result<KTrussSubgraph<N, E>, ExtractionError>
```

---

## Relationships

```
Graph<N, E>
  ├─ Used by: All extraction operations (input)
  ├─ Returned by: Ego network, filtering, k-truss (output)
  └─ Contains: Node[], Edge[]

EgoNetworkOptions
  └─ Input to: extractEgoNetwork()

SubgraphFilter<N, E>
  └─ Input to: filterSubgraph()

PathResult<N, E>
  ├─ Returned by: findShortestPath()
  └─ Contains: path (string[]), edges (E[])

ReachabilitySet<N>
  ├─ Returned by: extractReachabilitySubgraph()
  └─ Contains: reachableNodeIds (Set<string>)

Triangle<N, E>
  ├─ Returned by: detectTriangles()
  └─ Used by: k-truss support counting

StarPattern<N>
  └─ Returned by: detectStarPatterns()

CoCitationPair<N>
  └─ Returned by: detectCoCitations()

KTrussSubgraph<N, E>
  ├─ Returned by: extractKTruss()
  └─ Contains: subgraph (Graph<N, E>), support map
```

---

## Validation Rules Summary

| Entity | Validation | Error Type |
|--------|-----------|------------|
| EgoNetworkOptions | radius ≥ 1 | InvalidRadiusError |
| EgoNetworkOptions | seeds exist in graph | InvalidInputError |
| SubgraphFilter | at least one filter | InvalidInputError |
| PathResult | source, target exist | InvalidInputError |
| Triangle | 3 distinct nodes | InvalidInputError |
| StarPattern | degree threshold > 0 | InvalidInputError |
| KTrussSubgraph | k ≥ 3 | InvalidKError |

---

## State Transitions

All extraction operations are **stateless** and **pure**:
- Input: immutable Graph<N, E>
- Output: new Graph<N, E> (copy) or derived data structures
- No mutations to original graph
- No side effects

**Concurrency Safety**: All operations are safe for concurrent execution because:
- No shared mutable state
- Original graph never modified
- Result types are immutable

---

## Memory Considerations

**Memory Usage Estimates** (1000-node graph):
- Ego network (radius-3): ~500 nodes × 150 bytes/node = 75 KB
- Triangle detection: ~1000 triangles × 100 bytes/triangle = 100 KB
- K-truss: subgraph + support map ~200 KB

**Optimization Strategies**:
- Lazy evaluation where possible (iterators for triangles)
- Early termination (BFS stops at radius k)
- Sparse data structures (Sets instead of arrays for large collections)

**Performance Targets Met**:
- All operations <3s for 1000-node graphs
- Memory footprint <10MB for typical extraction operations
- No Web Workers needed (synchronous acceptable)
