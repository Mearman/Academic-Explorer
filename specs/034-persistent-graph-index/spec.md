# Feature Specification: Persistent Graph Index

**Feature Branch**: `034-persistent-graph-index`
**Created**: 2025-12-02
**Status**: Draft
**Input**: User description: "Add a persistent graph index layer to the unified tiered cache system. The graph stores relationship structure (nodes as entity IDs, edges as relationships) in Dexie/IndexedDB, with an in-memory Graph class from the algorithms package for fast traversal. The graph is derived automatically when entities are cached - not fetched separately. This enables graph-native queries (neighbors, paths, subgraphs) and faster visualization without re-extracting edges from entity data."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Graph Building from Cached Entities (Priority: P1)

As a user exploring academic literature, when I view an author's profile and their works are loaded, the system automatically extracts and stores the relationships (author-works, works-citations, works-co-authors) so that I don't have to re-fetch or re-parse this data later.

**Why this priority**: This is the foundational capability. Without automatic graph population during entity caching, no other graph features can work. It also maintains the "unified cache system" principle - one entry point for all caching.

**Independent Test**: Can be fully tested by caching an entity (e.g., a Work with authorships) and verifying that corresponding nodes and edges exist in the graph store without any additional API calls.

**Acceptance Scenarios**:

1. **Given** a Work entity is cached with 3 authorships, **When** the cache operation completes, **Then** the graph contains the Work node plus 3 Author nodes (as stubs) and 3 authorship edges.
2. **Given** a Work entity with 10 referenced works is cached, **When** the cache operation completes, **Then** the graph contains 10 "cites" edges from the Work to the referenced works.
3. **Given** an Author entity with institutional affiliations is cached, **When** the cache operation completes, **Then** the graph contains edges to the affiliated institutions.
4. **Given** partial entity data from a list response is cached, **When** the cache operation completes, **Then** available relationships are extracted and nodes are marked as "partial" completeness.

---

### User Story 2 - Graph Persistence Across Sessions (Priority: P1)

As a user who has explored several authors and their networks over multiple sessions, I want the discovered relationship graph to persist in my browser so that when I return, I can immediately see and traverse my accumulated knowledge graph without re-fetching data.

**Why this priority**: Persistence is essential for the graph to have value beyond a single session. Without it, users lose all discovered relationships on page refresh.

**Independent Test**: Can be tested by populating the graph, closing the browser tab, reopening the application, and verifying all nodes and edges are restored.

**Acceptance Scenarios**:

1. **Given** a graph with 50 nodes and 100 edges exists in memory, **When** the user closes and reopens the application, **Then** the graph is restored with all 50 nodes and 100 edges intact.
2. **Given** a fresh application load, **When** the graph initializes, **Then** it hydrates from IndexedDB storage before accepting queries.
3. **Given** a new edge is added to the graph, **When** the operation completes, **Then** the edge is persisted to IndexedDB (write-through caching).

---

### User Story 3 - Graph-Native Relationship Queries (Priority: P2)

As a user viewing an entity's detail page, I want to query for connected entities directly from the graph without loading and parsing full entity JSON, so that relationship information appears faster.

**Why this priority**: This enables performance improvements for the visualization and relationship displays. Depends on User Stories 1 and 2 being complete.

**Independent Test**: Can be tested by populating the graph with known relationships, then calling graph query methods and verifying correct results without any API or entity cache access.

**Acceptance Scenarios**:

1. **Given** a graph with Author A connected to Works W1, W2, W3, **When** I query for neighbors of Author A, **Then** I receive [W1, W2, W3] without accessing the entity cache.
2. **Given** edges of multiple types exist from a Work, **When** I query for edges filtered by type "authorship", **Then** only authorship edges are returned.
3. **Given** a Work W1 with outgoing "cites" edges and incoming "cited_by" edges, **When** I query for incoming edges only, **Then** only the "cited_by" edges are returned.

---

### User Story 4 - Fast Graph Visualization Loading (Priority: P2)

As a user opening the graph visualization page, I want to see all previously discovered entities and their relationships rendered immediately from the persistent graph, rather than waiting for entities to be re-fetched and relationships re-extracted.

**Why this priority**: This is the primary user-facing benefit - faster, more responsive graph visualization. Depends on persistent graph storage being functional.

**Independent Test**: Can be tested by pre-populating the graph store, loading the visualization page, and measuring time to render versus the current entity-extraction approach.

**Acceptance Scenarios**:

1. **Given** a graph with 100 nodes and 200 edges persisted, **When** the visualization page loads, **Then** the graph data is available for rendering within 500ms (versus current extraction time).
2. **Given** nodes exist in the graph but full entity data is not in entity cache, **When** the visualization renders, **Then** nodes display with available label/type info, and full details load on demand.

---

### User Story 5 - Stub Nodes for Undiscovered Entities (Priority: P3)

As a user exploring the graph, when I see references to entities I haven't fully loaded yet (e.g., a cited work), I want those to appear as "stub" nodes that I can click to fetch full details.

**Why this priority**: Enhances the exploration experience but is not essential for core functionality. The graph can work without distinguishing stub vs. full nodes.

**Independent Test**: Can be tested by caching an entity that references other entities, verifying stub nodes are created, then "expanding" a stub and verifying it upgrades to full status.

**Acceptance Scenarios**:

1. **Given** a Work cites Work W999 which has never been fetched, **When** the Work is cached, **Then** W999 exists in the graph as a stub node with completeness "stub".
2. **Given** a stub node W999 exists in the graph, **When** the user requests to expand/fetch W999, **Then** the full entity is fetched, cached, and the node upgrades to completeness "full".
3. **Given** a stub node with only an ID, **When** rendering in the visualization, **Then** it displays as a placeholder with the ID visible and a visual indicator that it's not fully loaded.

---

### Edge Cases

- What happens when the graph database schema needs to be upgraded (new fields, indexes)?
- How does the system handle corrupted or invalid data in the graph store?
- What happens when entity data is deleted from the entity cache but graph nodes/edges remain?
- How does the system behave when IndexedDB storage quota is exceeded?
- What happens when two entities reference each other (circular relationships)?
- How are duplicate edge additions handled (same source, target, type)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST automatically extract and store graph edges when any entity is cached through `cacheResponseEntities`.
- **FR-002**: System MUST persist graph nodes and edges to IndexedDB for cross-session durability.
- **FR-003**: System MUST hydrate the in-memory graph from IndexedDB on application startup.
- **FR-004**: System MUST support querying neighbors of a node by ID.
- **FR-005**: System MUST support querying edges by source, target, or type.
- **FR-006**: System MUST support filtering edges by direction (incoming/outgoing).
- **FR-007**: System MUST track node "completeness" status (full, partial, stub) to indicate data quality.
- **FR-008**: System MUST create stub nodes for referenced entities that haven't been fully fetched.
- **FR-009**: System MUST deduplicate edges - adding an edge that already exists is a no-op.
- **FR-010**: System MUST use write-through caching - all mutations persist to IndexedDB immediately.
- **FR-011**: System MUST provide indexes for efficient traversal queries: by source, by target, by type, and compound indexes.
- **FR-012**: Graph operations MUST NOT require fetching from the OpenAlex API - the graph only contains derived data.
- **FR-013**: System MUST extract edges for all known relationship types in OpenAlex entities (authorships, citations, affiliations, topics, etc.).

### Key Entities

- **GraphNode**: Represents an OpenAlex entity in the graph. Key attributes: ID (OpenAlex ID), entity type, display label, completeness status (full/partial/stub), cached timestamp.
- **GraphEdge**: Represents a relationship between two entities. Key attributes: unique edge ID, source node ID, target node ID, relationship type, direction (who owns the data), optional metadata (position, weight), discovered timestamp.
- **PersistentGraph**: Wrapper combining in-memory Graph class with Dexie persistence. Provides unified API for queries and mutations with automatic sync.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Graph visualization page loads cached graph data in under 500ms for graphs up to 500 nodes.
- **SC-002**: Adding a new node or edge completes (including IndexedDB persist) in under 50ms.
- **SC-003**: Neighbor queries return results in under 10ms for nodes with up to 100 connections.
- **SC-004**: Application startup hydrates a graph of 1000 nodes and 5000 edges in under 2 seconds.
- **SC-005**: Graph storage overhead is less than 50% of equivalent entity data storage (graph stores structure, not full JSON).
- **SC-006**: 100% of relationship types present in cached entities are extracted to the graph (no data loss).
- **SC-007**: Users can traverse 3 levels of connections (node to neighbors to neighbors' neighbors) without any API calls if data was previously cached.

## Constitution Alignment *(recommended)*

- **Type Safety**: GraphNode and GraphEdge types defined with strict interfaces; no `any` types; completeness status as discriminated union.
- **Test-First**: Each user story includes testable acceptance scenarios; graph operations tested with in-memory provider.
- **Monorepo Architecture**: Graph database and PersistentGraph class in `packages/client/src/cache/dexie/`; integrates with existing `CachedOpenAlexClient`.
- **Storage Abstraction**: Graph persistence uses Dexie (consistent with existing entity cache); could support alternative providers in future.
- **Performance & Memory**: Success criteria include specific performance targets; in-memory graph bounded by IndexedDB contents.
- **Atomic Conventional Commits**: Implementation in atomic commits; graph schema, extraction logic, and query methods as separate commits.
- **Development-Stage Pragmatism**: Graph schema can change without migration paths during development.
- **Test-First Bug Fixes**: Any bugs in graph extraction will have regression tests before fixes.
- **Repository Integrity**: All graph code must pass typecheck, test, lint, build.
- **Continuous Execution**: Implementation proceeds through all phases without pausing.
- **Complete Implementation**: Full graph functionality as specified; no simplified fallbacks.
- **Spec Index Maintenance**: specs/README.md updated when this spec status changes.
- **Build Output Isolation**: TypeScript compiles to dist/, no build artifacts in src/.
- **Working Files Hygiene**: No debug files committed.
- **DRY Code & Configuration**: Reuses existing algorithms/Graph class; extraction logic shared across entity types.
- **Presentation/Functionality Decoupling**: Graph is pure data layer; visualization components consume graph data through hooks.
- **No Magic Numbers/Values**: Index names, table names, timeouts as named constants.

## Assumptions

- The existing `packages/algorithms/src/graph/graph.ts` Graph class is suitable for in-memory graph operations and does not need modification.
- IndexedDB storage quotas (typically 50MB-unlimited depending on browser) are sufficient for expected graph sizes.
- Edge extraction patterns for OpenAlex entities are well-defined (authorships, citations, affiliations, topics, concepts, etc.).
- The graph is append-mostly - entities are rarely deleted, so garbage collection of orphaned graph nodes is not a priority.
- Stub nodes can display minimal information (ID, entity type) until full data is fetched.

## Out of Scope

- Graph algorithms beyond basic traversal (clustering, community detection, pathfinding) - these exist in algorithms package and can be used separately.
- Graph visualization changes - this spec covers the data layer only; visualization will read from the graph.
- Server-side graph storage - graph is browser-local only.
- Real-time sync of graph across browser tabs - single-tab operation assumed.
- Graph data export/import functionality.
