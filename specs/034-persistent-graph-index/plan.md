# Implementation Plan: Persistent Graph Index

**Branch**: `034-persistent-graph-index` | **Date**: 2025-12-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/034-persistent-graph-index/spec.md`

## Summary

Add a persistent graph index layer to the unified tiered cache system. The graph stores relationship structure (nodes as entity IDs, edges as relationships) in Dexie/IndexedDB, with an in-memory `Graph` class from `packages/algorithms` for fast traversal. The graph is derived automatically when entities are cached via `cacheResponseEntities` - not fetched separately. This enables graph-native queries (neighbors, paths, subgraphs) and faster visualization without re-extracting edges from entity data.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Dexie (IndexedDB), `@bibgraph/algorithms` (Graph class), `@bibgraph/types`, `@bibgraph/utils`
**Storage**: IndexedDB via Dexie (new `graph-index-db` alongside existing `entity-cache-db`)
**Testing**: Vitest (unit/integration), Playwright (E2E), fake-indexeddb for isolation
**Target Platform**: Browser (React SPA)
**Project Type**: Nx monorepo web application
**Performance Goals**: <500ms graph load for 500 nodes; <50ms node/edge persist; <10ms neighbor query; <2s hydration for 1000 nodes
**Constraints**: Serial test execution; 8GB heap limit; write-through caching
**Scale/Scope**: Up to 10,000 nodes, 50,000 edges; browser-local storage only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Type Safety**: ✅ GraphNode and GraphEdge types defined with strict interfaces; completeness status as discriminated union; no `any` types
2. **Test-First Development**: ✅ Each user story has testable acceptance scenarios; tests fail before implementation
3. **Monorepo Architecture**: ✅ Graph database in `packages/client/src/cache/dexie/`; integrates with existing `CachedOpenAlexClient`; no re-exports
4. **Storage Abstraction**: ✅ Graph persistence uses Dexie consistent with entity cache; PersistentGraph wrapper provides unified API
5. **Performance & Memory**: ✅ Success criteria include specific performance targets; in-memory graph bounded by IndexedDB contents; serial tests
6. **Atomic Conventional Commits**: ✅ Implementation in atomic commits; graph schema, extraction logic, query methods as separate commits
7. **Development-Stage Pragmatism**: ✅ Graph schema can change without migration paths during development
8. **Test-First Bug Fixes**: ✅ Any bugs in graph extraction will have regression tests before fixes
9. **Repository Integrity**: ✅ All graph code must pass typecheck, test, lint, build
10. **Continuous Execution**: ✅ Implementation proceeds through all phases without pausing
11. **Complete Implementation**: ✅ Full graph functionality as specified; no simplified fallbacks
12. **Spec Index Maintenance**: ✅ specs/README.md updated when spec status changes
13. **Build Output Isolation**: ✅ TypeScript compiles to dist/, no build artifacts in src/
14. **Working Files Hygiene**: ✅ No debug files committed
15. **DRY Code & Configuration**: ✅ Reuses existing algorithms/Graph class; extraction logic shared via relationship-extractor
16. **Presentation/Functionality Decoupling**: ✅ Graph is pure data layer; visualization consumes graph data through hooks
17. **No Magic Numbers/Values**: ✅ Index names, table names, performance thresholds as named constants
18. **Agent Embed Link Format**: N/A (no agent instructions)
19. **Documentation Token Efficiency**: ✅ Plan concise; no duplication
20. **Canonical Hash Computed Colours**: N/A (no UI changes in this spec)

**Complexity Justification Required?** Yes - introduces new storage tables (graph-index-db).

## Project Structure

### Documentation (this feature)

```text
specs/034-persistent-graph-index/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── persistent-graph.ts
│   └── graph-index-db.ts
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
packages/client/src/cache/dexie/
├── entity-cache-db.ts        # Existing entity cache (unchanged)
├── dexie-cache-tier.ts       # Existing cache tier (minimal changes)
├── graph-index-db.ts         # NEW: Dexie schema for graph nodes/edges
├── graph-index-tier.ts       # NEW: Dexie operations for graph persistence
└── persistent-graph.ts       # NEW: PersistentGraph wrapper combining memory + Dexie

packages/client/src/
├── cached-client.ts          # MODIFY: Hook edge extraction into cacheResponseEntities
└── index.ts                  # MODIFY: Export new graph functionality

packages/types/src/
├── graph-index-types.ts      # NEW: GraphNodeRecord, GraphEdgeRecord, CompletenessStatus
└── index.ts                  # MODIFY: Export new types

packages/utils/src/graph-sources/
├── relationship-extractor.ts # Existing (may need minor enhancements)
└── types.ts                  # Existing GraphSourceRelationship

apps/web/src/
├── lib/
│   └── graph-index/
│       └── use-persistent-graph.ts  # NEW: Hook for accessing persistent graph
└── routes/
    └── graph/
        └── route.tsx         # MODIFY: Use persistent graph for faster loading
```

**Structure Decision**: Follows existing Nx monorepo structure. Graph index storage added to `packages/client/src/cache/dexie/` alongside entity cache. Types added to `packages/types/`. Integration hooks added to `apps/web/src/lib/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New Dexie database tables | Graph index requires separate storage for nodes/edges with different schema than entity cache | Single table approach would mix concerns and complicate queries |
| New `graph-index-db.ts` | Clean separation of graph storage from entity cache | Extending entity-cache-db would pollute existing schema |

## Phase 0: Research

### Research Questions

1. **Dexie Multi-Table Transaction Support**: Can we atomically write to both entity cache and graph index?
2. **Graph Hydration Strategy**: Load entire graph on startup vs. lazy-load on first access?
3. **Edge Deduplication**: Best index strategy for checking edge existence before insert?
4. **Stub Node Representation**: How to mark nodes as partial/stub efficiently?
5. **Memory vs. Disk Balance**: When to flush memory graph to IndexedDB?

### Findings Summary

See [research.md](./research.md) for detailed findings.

**Key Decisions**:
- **Multi-table transactions**: Dexie supports cross-table transactions; use `db.transaction('rw', [nodes, edges], ...)`
- **Hydration**: Lazy hydration on first graph access; background hydration on app idle
- **Edge deduplication**: Compound index on `[source, target, type]` for fast existence checks
- **Stub nodes**: `completeness` enum field: `'full' | 'partial' | 'stub'`
- **Write-through**: All mutations immediately persist to IndexedDB; memory is source of truth after hydration

## Phase 1: Design

### Data Model

See [data-model.md](./data-model.md) for complete schema.

**GraphNodeRecord** (IndexedDB table: `nodes`):
```typescript
interface GraphNodeRecord {
  id: string;                    // OpenAlex ID (e.g., "W123", "A456")
  entityType: EntityType;        // "works" | "authors" | ...
  label: string;                 // Display label
  completeness: CompletenessStatus; // 'full' | 'partial' | 'stub'
  cachedAt: number;              // Timestamp when first cached
  updatedAt: number;             // Timestamp when last updated
  metadata?: Record<string, unknown>; // Optional extra data
}

type CompletenessStatus = 'full' | 'partial' | 'stub';
```

**GraphEdgeRecord** (IndexedDB table: `edges`):
```typescript
interface GraphEdgeRecord {
  id: string;                    // Unique edge ID (e.g., "W123-A456-AUTHORSHIP")
  source: string;                // Source node ID
  target: string;                // Target node ID
  type: RelationType;            // Relationship type
  direction: EdgeDirection;      // 'outbound' | 'inbound'
  discoveredAt: number;          // Timestamp when edge was discovered

  // Indexed edge properties (commonly-queried metadata promoted to fields)
  authorPosition?: 'first' | 'middle' | 'last';  // AUTHORSHIP
  isCorresponding?: boolean;                      // AUTHORSHIP
  isOpenAccess?: boolean;                         // PUBLICATION
  version?: 'accepted' | 'submitted' | 'published'; // PUBLICATION
  score?: number;                                 // TOPIC (0-1)
  years?: number[];                               // AFFILIATION
  awardId?: string;                               // FUNDED_BY
  role?: string;                                  // HAS_ROLE

  metadata?: Record<string, unknown>;             // Additional unindexed properties
}
```

**Indexes**:
- `nodes`: `id`, `entityType`, `completeness`, `cachedAt`
- `edges`: `id`, `source`, `target`, `type`, `[source+type]`, `[target+type]`, `[source+target+type]`, `authorPosition`, `isCorresponding`, `isOpenAccess`, `score`, `[source+type+authorPosition]`, `[source+type+isOpenAccess]`

### Contracts

See [contracts/](./contracts/) for TypeScript interfaces.

**PersistentGraph API**:
```typescript
interface PersistentGraph {
  // Lifecycle
  initialize(): Promise<void>;
  hydrate(): Promise<void>;
  clear(): Promise<void>;

  // Node operations
  addNode(node: GraphNodeRecord): Promise<void>;
  getNode(id: string): Option<GraphNodeRecord>;
  updateNodeCompleteness(id: string, status: CompletenessStatus): Promise<void>;
  hasNode(id: string): boolean;

  // Edge operations
  addEdge(edge: Omit<GraphEdgeRecord, 'id' | 'discoveredAt'>): Promise<void>;
  getEdgesFrom(nodeId: string, type?: RelationType, filter?: EdgePropertyFilter): GraphEdgeRecord[];
  getEdgesTo(nodeId: string, type?: RelationType, filter?: EdgePropertyFilter): GraphEdgeRecord[];
  hasEdge(source: string, target: string, type: RelationType): boolean;

  // Query operations
  getNeighbors(nodeId: string, direction?: 'outbound' | 'inbound' | 'both'): string[];
  getEdgesByProperty(filter: EdgePropertyFilter): GraphEdgeRecord[];
  getSubgraph(nodeIds: string[]): { nodes: GraphNodeRecord[]; edges: GraphEdgeRecord[] };

  // Statistics
  getNodeCount(): number;
  getEdgeCount(): number;
  getNodesByCompleteness(status: CompletenessStatus): GraphNodeRecord[];
}
```

### Integration Points

1. **CachedClient.cacheResponseEntities()** (packages/client/src/cached-client.ts:~line 200):
   - After caching entity JSON, extract relationships via `extractRelationships()`
   - Add source node to graph (completeness based on entity data)
   - Add stub nodes for all targets not in graph
   - Add edges for all relationships

2. **Graph visualization page** (apps/web/src/routes/graph/route.tsx):
   - Use `usePersistentGraph()` hook to get graph data
   - Replace current entity enumeration + extraction with direct graph query
   - Render immediately from persisted graph

3. **Entity detail pages**:
   - Query neighbors from graph for faster relationship display
   - Show stub indicators for unexpanded nodes

## Implementation Phases

### Phase 1: Core Infrastructure (P1 User Stories 1-2)
- [ ] Define `GraphNodeRecord`, `GraphEdgeRecord`, `CompletenessStatus` types
- [ ] Create `graph-index-db.ts` with Dexie schema
- [ ] Create `graph-index-tier.ts` with CRUD operations
- [ ] Create `PersistentGraph` class combining memory + Dexie
- [ ] Add hydration logic (load from IndexedDB on initialize)
- [ ] Add write-through persistence for all mutations

### Phase 2: Edge Extraction Integration (P1 User Story 1)
- [ ] Modify `cacheResponseEntities()` to call graph index
- [ ] Create `extractAndIndexRelationships()` helper
- [ ] Extract indexed edge properties during relationship extraction:
  - [ ] Author position from authorships array index
  - [ ] Corresponding author flag from authorship data
  - [ ] Open access status from publication data
  - [ ] Topic score from topic associations
  - [ ] Affiliation years from affiliation data
  - [ ] Award ID from funding data
- [ ] Handle stub node creation for referenced entities
- [ ] Handle node completeness updates (stub → partial → full)
- [ ] Add deduplication checks for edges

### Phase 3: Query API (P2 User Stories 3-4)
- [ ] Implement `getNeighbors()` with direction filtering
- [ ] Implement `getEdgesFrom()` and `getEdgesTo()` with type filtering
- [ ] Implement edge property filtering:
  - [ ] Filter by authorPosition (first/middle/last)
  - [ ] Filter by isCorresponding
  - [ ] Filter by isOpenAccess
  - [ ] Filter by score threshold (min/max)
  - [ ] Filter by years (include any of)
- [ ] Implement `getEdgesByProperty()` for cross-source queries
- [ ] Implement `getSubgraph()` for subset extraction
- [ ] Create `usePersistentGraph()` React hook
- [ ] Export from `@bibgraph/client`

### Phase 4: Visualization Integration (P2 User Story 4)
- [ ] Update graph page to use persistent graph
- [ ] Replace entity enumeration with graph query
- [ ] Add loading state during hydration
- [ ] Implement performance benchmarks

### Phase 5: Stub Node Enhancement (P3 User Story 5)
- [ ] Add visual indicators for stub nodes in graph
- [ ] Implement "expand" action to fetch full entity
- [ ] Update stub → full on entity fetch
- [ ] Handle circular reference edge cases

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| IndexedDB quota exceeded | Implement eviction strategy; track storage size |
| Large graph hydration slow | Lazy hydration; load on first access; show loading state |
| Edge extraction breaks existing cache | Feature flag for graph indexing; can disable if issues |
| Memory pressure from large graphs | Bounded in-memory cache; rely on IndexedDB for full graph |

## Dependencies

- Existing `packages/algorithms/src/graph/graph.ts` (Graph class)
- Existing `packages/utils/src/graph-sources/relationship-extractor.ts`
- Existing `packages/client/src/cache/dexie/entity-cache-db.ts` (pattern reference)
- Existing `packages/types/src/relationships.ts` (RelationType enum)

## Success Criteria Verification

| Criterion | How to Verify |
|-----------|---------------|
| SC-001: <500ms graph load | Benchmark test with 500-node graph |
| SC-002: <50ms node/edge persist | Timing in write operations |
| SC-003: <10ms neighbor query | Benchmark test with 100-connection node |
| SC-004: <2s hydration for 1000 nodes | Startup benchmark with seeded DB |
| SC-005: <50% storage overhead | Compare graph index size vs. entity cache |
| SC-006: 100% relationship extraction | Integration test with all entity types |
| SC-007: 3-level traversal without API | E2E test with pre-cached graph |
