# Research: Graph Extraction Algorithms

**Feature**: 026-graph-extraction
**Date**: 2025-11-25
**Phase**: Phase 0 - Research & Design Decisions

## Research Questions from Technical Context

All technical context items were well-defined. No "NEEDS CLARIFICATION" markers found. Research focuses on algorithm implementation decisions and best practices.

## 1. Ego Network Extraction Algorithms

### Decision: BFS-based k-hop neighborhood extraction

**Rationale**:
- BFS naturally computes shortest distances from seed node(s)
- Level-by-level traversal makes radius limiting trivial (stop at level k)
- Already have optimized BFS implementation in `packages/algorithms/src/traversal/bfs.ts`
- Time complexity: O(V + E) for radius k = diameter, typically much better for small k
- Multi-source ego networks: Union of BFS results from each seed

**Alternatives Considered**:
1. **DFS-based approach**: Rejected - harder to enforce exact radius constraint, no distance guarantees
2. **Dijkstra-based**: Rejected - overkill for unweighted graphs, same complexity for weighted case
3. **Custom iterative expansion**: Rejected - reinventing BFS without queue optimization

**Implementation Notes**:
- Use existing `bfs()` function to get distance map
- Filter nodes where distance ≤ k from any seed
- Extract induced subgraph from filtered node set
- For multi-source: merge distance maps, take min distance to any seed

---

## 2. Attribute-Based Filtering Strategies

### Decision: Predicate-based filtering with type-safe filter functions

**Rationale**:
- TypeScript's type system enables compile-time filter validation
- Filter predicates are composable (AND/OR logic via boolean operators)
- Follows functional programming patterns already used in codebase
- Induced subgraph extraction after filtering maintains graph invariants

**Alternatives Considered**:
1. **SQL-like query language**: Rejected - over-engineering for in-memory graphs, runtime parsing overhead
2. **Graph database query integration**: Rejected - no external dependencies requirement
3. **Mutable filtering (modify graph in place)**: Rejected - violates functional style, error-prone

**Implementation Pattern**:
```typescript
type NodeFilter<N extends Node> = (node: N) => boolean;
type EdgeFilter<E extends Edge> = (edge: E) => boolean;

interface SubgraphFilter<N extends Node, E extends Edge> {
  nodeFilter?: NodeFilter<N>;
  edgeFilter?: EdgeFilter<E>;
  combinator?: 'AND' | 'OR';
}

// Example usage
const filter: SubgraphFilter<WorkNode, CitationEdge> = {
  nodeFilter: (n) => n.year >= 2020 && n.citationCount > 10,
  edgeFilter: (e) => e.type === 'REFERENCE'
};
```

**Edge Cases**:
- Filtering edges may create dangling nodes (edges without both endpoints) → Remove dangling edges
- Empty filter matches all nodes/edges (no-op)
- Contradictory filters return empty subgraph (valid result)

---

## 3. Shortest Path Algorithms for Citation Networks

### Decision: BFS for unweighted, Dijkstra for weighted paths

**Rationale**:
- Citation networks are typically unweighted (cite or not cite)
- BFS finds shortest unweighted path in O(V + E)
- Dijkstra already implemented in `packages/algorithms/src/pathfinding/dijkstra.ts`
- Can support weighted paths if needed (e.g., citation strength, temporal distance)

**Alternatives Considered**:
1. **A* search**: Rejected - no meaningful heuristic for general citation networks
2. **Bidirectional search**: Considered - could implement as optimization later, not MVP
3. **All-pairs shortest path (Floyd-Warshall)**: Rejected - O(V³) too expensive, only need single-source

**Reachability Subgraph**:
- Forward reachability: BFS/DFS from source, collect visited nodes
- Backward reachability: Reverse graph edges, then forward search
- Multi-source reachability: Union of individual reachability sets

---

## 4. Triangle Detection Algorithms

### Decision: Node-iterator with neighbor intersection

**Rationale**:
- For each node v, check pairs of neighbors (u, w) for edge (u, w)
- Time complexity: O(V × d²) where d = average degree
- For sparse academic graphs (d << V), this is efficient
- Academic graphs have low clustering coefficient typically

**Algorithm**:
```
for each node v:
  neighbors = graph.getNeighbors(v)
  for each pair (u, w) in neighbors:
    if graph.hasEdge(u, w):
      yield triangle {v, u, w}
```

**Alternatives Considered**:
1. **Matrix multiplication**: Rejected - O(V³), only efficient for dense graphs
2. **Edge-iterator**: Considered - same complexity, less cache-friendly
3. **Chiba-Nishizeki algorithm**: Considered - optimal O(V × d × δ) but complex, defer unless needed

**Optimization Opportunities**:
- Sort neighbors by ID to avoid duplicate detection
- Use adjacency set for O(1) edge lookup
- Stop early if degree product d(u) × d(w) < threshold

---

## 5. Academic Motif Patterns

### Decision: Specialized detectors for each motif type

**Rationale**:
- Each motif has domain-specific semantics (co-citation ≠ bibliographic coupling)
- Specialized functions provide clear API and better performance
- Academic researchers understand these specific patterns

**Motif Types**:

1. **Co-citation**: Papers W1, W2 cite common source W3
   - Iterate citation edges, group by target
   - Pairs of papers citing same target = co-citation pair
   - Time: O(E) edge iteration + O(n²) pair enumeration per cluster

2. **Bibliographic Coupling**: Papers W1, W2 cited by common source W0
   - Reverse of co-citation (use incoming edges)
   - Iterate reverse citations, group by source

3. **Star Patterns**: High-degree nodes (hubs)
   - Filter nodes by degree threshold
   - Classify: out-star (high out-degree = review paper), in-star (high in-degree = seminal work)
   - Time: O(V) node iteration

**Alternatives Considered**:
1. **Generic motif finder**: Rejected - academic motifs have known structure, don't need search
2. **Subgraph isomorphism**: Rejected - expensive, unnecessary for fixed patterns

---

## 6. K-Truss Decomposition Algorithm

### Decision: Iterative edge removal with triangle support counting

**Rationale**:
- K-truss: every edge participates in at least (k-2) triangles
- Algorithm: iteratively remove edges with insufficient triangle support
- More cohesive than k-core (edge-based vs node-based)
- Useful for finding dense collaboration clusters

**Algorithm** (Support-based):
```
1. Compute triangle support for each edge (count of triangles containing edge)
2. While exists edge e with support < (k-2):
     Remove e
     Update support counts for affected edges
3. Return remaining subgraph
```

**Alternatives Considered**:
1. **Triangle-listing first**: Considered - precompute all triangles, then filter
2. **Core-truss decomposition**: Rejected - more complex, not needed for single k value
3. **Exact triangle counting**: Considered - more accurate but O(V × d²) for each edge

**Optimization Notes**:
- Use priority queue for edge removal (lowest support first)
- Update only local neighborhood after edge removal
- Cache adjacency sets for O(1) membership testing

**Expected Complexity**:
- Preprocessing (triangle counting): O(V × d²)
- Edge removal: O(E × d) worst case
- Total: O(V × d²) for sparse graphs

---

## 7. Induced Subgraph Extraction Pattern

### Decision: Copy-based subgraph creation with invariant validation

**Rationale**:
- Functional approach: original graph immutable, return new Graph<N, E>
- Validates all edges have both endpoints in node set
- Preserves directionality of original graph
- Safe for concurrent operations (no shared mutable state)

**Pattern**:
```typescript
function extractInducedSubgraph<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  nodeIds: Set<string>
): Result<Graph<N, E>, ExtractionError> {
  const subgraph = new Graph<N, E>(graph.isDirected());

  // Add nodes
  for (const id of nodeIds) {
    const nodeOption = graph.getNode(id);
    if (!nodeOption.some) continue; // Skip missing nodes
    subgraph.addNode(nodeOption.value);
  }

  // Add edges where both endpoints in subgraph
  for (const edge of graph.getAllEdges()) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      subgraph.addEdge(edge);
    }
  }

  return Ok(subgraph);
}
```

**Alternatives Considered**:
1. **View-based subgraphs**: Rejected - complex lifecycle management, harder to reason about
2. **Mutable in-place filtering**: Rejected - violates functional style, error-prone
3. **Lazy evaluation**: Rejected - premature optimization, adds complexity

---

## 8. Error Handling Strategy

### Decision: Result<T, ExtractionError> with specific error types

**Rationale**:
- Consistent with existing codebase (`Result<T, E>` pattern throughout)
- Discriminated unions enable type-safe error handling
- No exceptions thrown (functional error handling)

**Error Types Needed**:
```typescript
type ExtractionError =
  | { type: 'invalid-input'; message: string; input: unknown }
  | { type: 'empty-result'; message: string; context: string }
  | { type: 'invalid-radius'; message: string; radius: number }
  | { type: 'invalid-k'; message: string; k: number }
  | { type: 'graph-too-large'; message: string; nodeCount: number; limit: number };
```

**Best Practices**:
- Validate inputs early (fail fast)
- Empty results are NOT errors (return empty Graph)
- Provide context in error messages for debugging
- Use specific error types for different failure modes

---

## 9. Performance Optimization Strategies

### Decision: Optimize for BibGraph scale (1k-10k nodes)

**Target Performance** (from spec):
- Ego network (radius-3, 1000 nodes): <500ms
- Triangle detection (1000 nodes, 5000 edges): <2s
- K-truss (k=3, 1000 nodes): <3s

**Optimization Techniques**:

1. **Adjacency Set Caching**: Use Set<string> for O(1) membership testing
2. **Early Termination**: Stop BFS at radius k, don't explore further
3. **Degree Filtering**: For triangle detection, skip nodes with degree < 2
4. **Sparse Graph Assumptions**: Algorithms optimized for E = O(V) or E = O(V log V)

**Avoid**:
- Premature optimization (dense graph algorithms)
- Complex data structures (adjacency matrices for sparse graphs)
- Parallel processing (serial test requirement, <3s acceptable)

**Benchmark Strategy**:
- Performance tests with generated graphs matching target scale
- Fixture graphs from `__tests__/fixtures/extraction-graphs.ts`
- Test scaling: 100, 500, 1000, 5000, 10000 nodes

---

## 10. Testing Strategy

### Decision: Test-first with unit, integration, and performance tests

**Test Structure**:
```
__tests__/extraction/
├── ego-network.unit.test.ts           # 3 acceptance scenarios + edge cases
├── filter.unit.test.ts                # 3 scenarios + empty/contradictory filters
├── path.unit.test.ts                  # 3 scenarios + disconnected graphs
├── motif.unit.test.ts                 # 3 scenarios per motif type
├── truss.unit.test.ts                 # 3 scenarios + sparse graphs
├── ego-network.performance.test.ts    # Verify <500ms target
├── triangle-detection.performance.test.ts  # Verify <2s target
└── truss.performance.test.ts          # Verify <3s target
```

**Test Fixtures**:
- Small graphs (5-10 nodes) for unit tests
- Medium graphs (100-500 nodes) for integration tests
- Large graphs (1000-10000 nodes) for performance tests
- Reuse existing fixtures from `__tests__/fixtures/citation-networks.ts` where possible

**Edge Case Coverage**:
- Empty graphs
- Single-node graphs
- Disconnected components
- Graphs with self-loops
- Extreme parameters (radius=0, k=1, k=999)

---

## Summary: Key Decisions

| Research Area | Decision | Primary Rationale |
|---------------|----------|------------------|
| Ego Networks | BFS-based k-hop extraction | Natural distance computation, reuse existing BFS |
| Filtering | Predicate-based with type safety | Composable, type-safe, functional style |
| Shortest Path | BFS (unweighted) + Dijkstra (weighted) | Optimal complexity, reuse existing code |
| Triangles | Node-iterator with neighbor intersection | Efficient for sparse graphs (O(V × d²)) |
| Motifs | Specialized detectors per pattern | Domain clarity, better performance |
| K-Truss | Iterative edge removal by support | Standard algorithm, cohesive clusters |
| Subgraphs | Copy-based induced subgraph | Functional, immutable, safe |
| Errors | Result<T, ExtractionError> pattern | Consistent with codebase |
| Performance | Optimize for 1k-10k nodes | Matches BibGraph scale |
| Testing | Test-first, unit + integration + perf | Constitution requirement |

**No Blockers**: All decisions made. Ready to proceed to Phase 1 (Data Model & Contracts).
