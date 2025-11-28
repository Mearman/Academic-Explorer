# Feature Specification: Academic Graph Pattern Extraction

**Feature Branch**: `026-graph-extraction`
**Created**: 2025-11-25
**Status**: Draft
**Input**: User description: "Academic graph pattern extraction including ego networks, path analysis, motif detection, and research-specific subgraph operations"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Radius-k Ego Network Extraction (Priority: P1)

As a researcher, I want to extract k-hop neighborhoods around specific papers/authors/institutions so that I can explore the immediate citation context and collaboration networks at adjustable depth levels.

**Why this priority**: Ego network extraction is the PRIMARY exploration pattern in citation networks. Every "expand this node" UI operation depends on this functionality. This is the foundation for interactive graph exploration.

**Independent Test**: Can be fully tested by providing a seed node ID and radius parameter, then verifying the returned subgraph contains exactly the nodes within k hops and all edges between them. Delivers immediate value for citation context visualization.

**Acceptance Scenarios**:

1. **Given** a citation network with paper W1 citing W2, W2 citing W3, **When** I extract radius-1 ego network from W1, **Then** I receive a subgraph containing W1 and W2 with the citation edge
2. **Given** the same network, **When** I extract radius-2 ego network from W1, **Then** I receive a subgraph containing W1, W2, and W3 with both citation edges
3. **Given** multiple seed nodes [W1, W5], **When** I extract multi-source radius-1 ego network, **Then** I receive the union of both ego networks with all connecting edges

---

### User Story 2 - Attribute-Based Subgraph Filtering (Priority: P1)

As a researcher, I want to filter graph nodes and edges by attributes (publication year, citation count, entity type, relationship type) so that I can focus on relevant subsets of large citation networks.

**Why this priority**: Foundation for all other operations. Without filtering, large graphs (10k+ nodes) become unmanageable. This enables researchers to narrow scope before applying expensive algorithms.

**Independent Test**: Can be fully tested by applying filters to a known graph and verifying the returned subgraph contains only nodes/edges matching the criteria. Delivers immediate value for scoping research questions.

**Acceptance Scenarios**:

1. **Given** a citation network with papers from 2015-2024, **When** I filter by publication year 2020-2024, **Then** I receive only papers published in that range and edges between them
2. **Given** a citation network with varying citation counts, **When** I filter by minimum citation count 10, **Then** I receive only papers with ≥10 citations
3. **Given** a multi-entity graph, **When** I filter by entity type "works" and relationship type "REFERENCE", **Then** I receive only work nodes and citation edges

---

### User Story 3 - Citation Path Analysis (Priority: P2)

As a researcher, I want to find shortest citation paths between papers and extract reachability subgraphs so that I can trace intellectual lineage and understand influence propagation.

**Why this priority**: Unique research insight - answers "how did idea X influence idea Y?" Complements community detection by showing specific transmission paths rather than just clusters.

**Independent Test**: Can be fully tested by providing source and target nodes, verifying returned paths are minimal length, and checking reachability subgraphs contain all nodes reachable from seeds. Delivers value for genealogy analysis.

**Acceptance Scenarios**:

1. **Given** papers W1→W2→W3 and W1→W4→W3, **When** I find shortest path from W1 to W3, **Then** I receive path [W1, W2, W3] (length 2)
2. **Given** a seminal paper W1, **When** I extract reachability subgraph, **Then** I receive all papers that cite W1 directly or transitively
3. **Given** multiple source papers, **When** I extract multi-source reachability, **Then** I receive the union of all reachable papers from any source

---

### User Story 4 - Academic Motif Detection (Priority: P2)

As a researcher, I want to detect triangles, stars, and co-citation patterns so that I can identify bibliographic coupling, highly cited hub papers, and collaboration structures.

**Why this priority**: Academic-specific pattern discovery. Triangles reveal co-citation and coupling relationships. Stars identify review papers (high out-degree) and seminal works (high in-degree).

**Independent Test**: Can be fully tested by providing a graph with known motif structures and verifying all instances are detected correctly. Delivers value for similarity analysis and hub identification.

**Acceptance Scenarios**:

1. **Given** papers W1→W3, W2→W3 (co-citation), **When** I detect triangles, **Then** I find the triangle {W1, W2, W3} indicating W1 and W2 cite common source W3
2. **Given** a paper W1 with 50 outgoing citations, **When** I detect star patterns with min-degree 10, **Then** I identify W1 as a review paper hub
3. **Given** papers W1→W2, W1→W3 (bibliographic coupling), **When** I detect coupling patterns, **Then** I find W2 and W3 are coupled through W1

---

### User Story 5 - Dense Collaboration Cluster Extraction (Priority: P3)

As a researcher, I want to extract k-truss subgraphs so that I can find tightly coupled research communities with stronger cohesion than k-core.

**Why this priority**: Complements k-core from spec-025. K-truss provides edge-based cohesion (every edge in a triangle), useful for finding collaboration cliques. Lower priority because k-core already addresses basic community structure.

**Independent Test**: Can be fully tested by extracting k-truss from known graph and verifying every edge participates in at least k-2 triangles. Delivers value for finding research collaboration cliques.

**Acceptance Scenarios**:

1. **Given** a collaboration network where every author pair co-authored at least 3 papers, **When** I extract 3-truss, **Then** I receive all author pairs with ≥3 collaborations
2. **Given** a citation network, **When** I extract 4-truss, **Then** I receive only edges that appear in at least 2 triangles (cohesive citation clusters)
3. **Given** an empty or sparse graph, **When** I attempt k-truss with k > maximum edge triangle count, **Then** I receive an empty subgraph

---

### Edge Cases

- What happens when radius k exceeds graph diameter (e.g., k=100 in small graph)?
  - Return entire connected component, do not error
- How does system handle disconnected graphs in ego network extraction?
  - Only return connected component containing seed node
- What if attribute filters match zero nodes?
  - Return empty subgraph with zero nodes/edges
- How to handle cycles in shortest path search?
  - Use BFS for unweighted paths, Dijkstra for weighted; cycles do not affect correctness
- What if multiple shortest paths exist with same length?
  - Return one arbitrary shortest path (deterministic tie-breaking by node ID)
- How to handle self-loops in triangle detection?
  - Ignore self-loops; triangles require 3 distinct nodes
- What if k-truss parameter k=1 or k=2?
  - k=1 returns all edges, k=2 returns empty graph (no edge can be in 0 triangles)
- How does multi-source ego network handle overlapping neighborhoods?
  - Take union of all neighborhoods, include all edges between any pair of nodes in union

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST extract radius-k ego networks from a single seed node, returning all nodes within k hops and edges between them
- **FR-002**: System MUST extract multi-source ego networks from multiple seed nodes, returning union of individual ego networks
- **FR-003**: System MUST filter nodes by attribute predicates (publication year range, citation count threshold, entity type)
- **FR-004**: System MUST filter edges by relationship type and direction (outbound/inbound/both)
- **FR-005**: System MUST extract induced subgraph from explicit node ID sets
- **FR-006**: System MUST find shortest citation path between two nodes using BFS (unweighted) or Dijkstra (weighted)
- **FR-007**: System MUST extract reachability subgraph from single or multiple source nodes (all reachable nodes via forward traversal)
- **FR-008**: System MUST detect all triangles in graph (3-node cycles)
- **FR-009**: System MUST detect star patterns (nodes with degree exceeding threshold)
- **FR-010**: System MUST identify co-citation patterns (two papers citing same source) and bibliographic coupling (two papers cited by same source)
- **FR-011**: System MUST extract k-truss subgraph (all edges appearing in at least k-2 triangles)
- **FR-012**: System MUST handle empty results gracefully (return empty subgraph, not error)
- **FR-013**: System MUST preserve original graph directionality in extracted subgraphs
- **FR-014**: System MUST use existing Graph<N, E> data structure from packages/algorithms
- **FR-015**: System MUST return Result<Graph<N, E>, ExtractionError> types for all operations
- **FR-016**: Attribute filters MUST support AND/OR boolean logic (e.g., "year >= 2020 AND citations > 10")
- **FR-017**: System MUST validate inputs (e.g., radius > 0, k >= 3 for k-truss)
- **FR-018**: System MUST use existing BFS/DFS traversal algorithms from packages/algorithms/src/traversal/
- **FR-019**: Shortest path algorithms MUST handle weighted and unweighted graphs
- **FR-020**: Triangle detection MUST ignore self-loops and parallel edges

### Key Entities

- **EgoNetwork**: Subgraph containing nodes within k hops of seed node(s) and edges between them. Attributes: centerNodeId(s), radius, nodeCount, edgeCount
- **SubgraphFilter**: Predicate-based filter specification. Attributes: nodeFilters (attribute predicates), edgeFilters (relationship type, direction), booleanLogic (AND/OR)
- **PathResult**: Shortest path between two nodes. Attributes: sourceId, targetId, path (ordered node IDs), length, edges
- **ReachabilitySet**: Set of nodes reachable from source(s). Attributes: sourceNodeIds, reachableNodeIds, distance map
- **Triangle**: 3-node cycle. Attributes: nodeIds (3 distinct nodes), edges (3 edges forming cycle)
- **StarPattern**: High-degree node. Attributes: centerNodeId, degree, neighborIds, patternType (in-star vs out-star)
- **CoCitation**: Pair of papers citing common source. Attributes: citingNodeIds (2 papers), citedNodeId (common source), couplingStrength
- **KTruss**: Subgraph where every edge appears in at least k-2 triangles. Attributes: k, nodes, edges, trussNumber (maximum k for each edge)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ego network extraction completes in <500ms for radius-3 on graphs with 1000 nodes and 5000 edges
- **SC-002**: Attribute filtering reduces 10k-node graph to relevant subset in <200ms
- **SC-003**: Shortest path search between any two nodes completes in <100ms on 1000-node graphs
- **SC-004**: Triangle detection finds all triangles in <2s on graphs with 1000 nodes and 5000 edges
- **SC-005**: K-truss extraction completes in <3s for k=3 on 1000-node graphs
- **SC-006**: Multi-source ego network (5 seeds, radius-2) completes in <1s on 1000-node graphs
- **SC-007**: All extraction operations return deterministic results given same input (seed-based randomness allowed if documented)
- **SC-008**: Extracted subgraphs maintain graph invariants (no dangling edges, consistent node/edge references)
- **SC-009**: System handles edge cases without crashing (empty results, disconnected graphs, extreme k values)
- **SC-010**: Researchers can explore 3-hop citation neighborhoods interactively (extract + render in <2s total)

## Constitution Alignment *(recommended)*

- **Type Safety**: Feature uses strict TypeScript with no `any` types; all extraction functions return `Result<Graph<N, E>, ExtractionError>`
- **Test-First**: Each user story has 3 acceptance scenarios that will be implemented as failing tests before code
- **Monorepo Architecture**: Feature lives in `packages/algorithms/src/extraction/`; uses existing Graph, BFS, DFS from same package; does NOT re-export from other packages
- **Storage Abstraction**: No persistence layer; operates on in-memory Graph data structures only
- **Performance & Memory**: Success criteria include performance targets (<500ms for radius-3 ego networks); algorithms optimized for BibGraph scale (1k-10k nodes)
- **Atomic Conventional Commits**: Each user story will be committed separately with `feat(algorithms): add [feature]` messages
- **Development-Stage Pragmatism**: Breaking changes acceptable; will add new functions without backwards compatibility concerns
- **Test-First Bug Fixes**: Any bugs discovered during implementation will have regression tests added before fixes
- **Deployment Readiness**: Feature integrates with existing algorithms package; all tests must pass before merge
- **Continuous Execution**: After plan approval, will automatically proceed through tasks generation and implementation phases
