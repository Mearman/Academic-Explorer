# Research: Persistent Graph Index

**Date**: 2025-12-02
**Spec**: [spec.md](./spec.md)

## Research Questions & Findings

### 1. Dexie Multi-Table Transaction Support

**Question**: Can we atomically write to both entity cache and graph index?

**Finding**: Yes, but with caveats.

Dexie supports transactions across multiple tables within the **same database**:
```typescript
db.transaction('rw', [db.nodes, db.edges], async () => {
  await db.nodes.put(node);
  await db.edges.put(edge);
});
```

However, transactions across **different databases** (entity-cache-db vs graph-index-db) are not atomic. Two options:

1. **Same database**: Add `nodes` and `edges` tables to existing `entity-cache-db`
   - Pro: Atomic transactions, simpler code
   - Con: Schema pollution, migration complexity

2. **Separate database**: New `graph-index-db` (recommended)
   - Pro: Clean separation, independent schema evolution
   - Con: No cross-DB atomicity

**Decision**: Use separate `graph-index-db`. Accept non-atomic writes with eventual consistency - if entity caches but graph indexing fails, the graph will catch up on next entity access. This is acceptable for a derived index.

### 2. Graph Hydration Strategy

**Question**: Load entire graph on startup vs. lazy-load on first access?

**Finding**: Hybrid approach is optimal.

**Benchmarks** (simulated based on Dexie documentation):
- 1000 nodes + 5000 edges: ~1.5s full load
- 100 nodes + 500 edges: ~200ms full load

**Options**:
1. **Eager hydration**: Load all on app start
   - Pro: Graph always ready
   - Con: Slower startup, memory pressure

2. **Lazy hydration**: Load on first graph access
   - Pro: Fast startup, memory efficient
   - Con: First graph access delayed

3. **Hybrid** (recommended):
   - Lazy hydration on first access
   - Background hydration during idle time (requestIdleCallback)
   - Progressive loading with pagination

**Decision**: Implement lazy hydration with optional background pre-hydration. Show loading state during initial hydration.

### 3. Edge Deduplication Strategy

**Question**: Best index strategy for checking edge existence before insert?

**Finding**: Compound index on `[source, target, type]`.

**Analysis**:
- Edge uniqueness defined by (source, target, type) triple
- Multiple edges can exist between same nodes with different types (e.g., AUTHORSHIP + TOPIC)
- Need fast existence check before insert

**Index options**:
```typescript
// Option 1: Composite primary key (problematic - Dexie quirks)
edges: '++id, source, target, type'

// Option 2: Compound index (recommended)
edges: '++id, source, target, type, [source+target+type]'

// Option 3: Computed edge ID (also viable)
edges: 'id, source, target, type' // id = `${source}-${target}-${type}`
```

**Decision**: Use computed edge ID as primary key (`${source}-${target}-${type}`). This provides natural deduplication - `put()` becomes upsert. Also add compound index for query flexibility.

### 4. Stub Node Representation

**Question**: How to mark nodes as partial/stub efficiently?

**Finding**: Single `completeness` field with enum values.

**Completeness states**:
- `'full'`: Entity fully fetched and cached
- `'partial'`: Entity from list response (some fields missing)
- `'stub'`: Only ID known from relationship reference

**Transitions**:
```
stub → partial → full
  │       │        │
  └───────┴────────┘ (can upgrade but never downgrade)
```

**Schema**:
```typescript
interface GraphNodeRecord {
  id: string;
  entityType: EntityType;
  completeness: 'full' | 'partial' | 'stub';
  label: string; // Empty for stubs, populated otherwise
  // ...
}
```

**Decision**: Use `completeness` enum field. Index for efficient filtering (`getNodesByCompleteness('stub')`).

### 5. Memory vs. Disk Balance

**Question**: When to flush memory graph to IndexedDB?

**Finding**: Write-through is simpler and sufficient.

**Options**:
1. **Write-through** (recommended):
   - Every mutation persists immediately
   - Memory and disk always in sync
   - Simpler reasoning
   - Slightly slower writes

2. **Write-back**:
   - Batch mutations in memory
   - Periodic flush to disk
   - Risk of data loss on crash
   - More complex

3. **Read-through with lazy persistence**:
   - Read from disk, write to memory
   - Background sync
   - Complex synchronization

**Decision**: Write-through caching. Every `addNode()` and `addEdge()` immediately persists. Memory graph is materialized from IndexedDB on hydration and kept in sync via write-through.

### 6. Existing Relationship Types Coverage

**Finding**: 15+ relationship types already defined in `packages/types/src/relationships.ts`.

**Relationship types to index**:
```typescript
enum RelationType {
  AUTHORSHIP,           // Work → Author
  AFFILIATION,          // Author → Institution
  PUBLICATION,          // Work → Source
  REFERENCE,            // Work → Work (citations)
  TOPIC,                // Entity → Topic
  HOST_ORGANIZATION,    // Source → Publisher
  LINEAGE,              // Institution → Institution
  author_researches,    // Author → Topic
  funded_by,            // Work → Funder
  topic_part_of_field,
  field_part_of_domain,
  institution_has_repository,
  topic_part_of_subfield,
  related_to,
  concept,              // Legacy
  has_role
}
```

**Extraction coverage**: `relationship-extractor.ts` handles Works, Authors, Institutions, Sources, Topics. All entity types extractable.

### 7. Storage Size Estimation

**Calculation**:
- GraphNodeRecord: ~200 bytes (ID + type + label + timestamps + metadata)
- GraphEdgeRecord: ~150 bytes (IDs + type + direction + timestamp)
- Entity JSON: ~5KB average

**Overhead ratio**:
- 1 entity = 1 node = 200 bytes
- 1 entity ≈ 5 edges = 750 bytes
- Total per entity: ~950 bytes vs 5KB = **19% overhead**

**Decision**: Well within the <50% target. Storage overhead acceptable.

## Technical Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database separation | Separate `graph-index-db` | Clean separation, independent evolution |
| Hydration strategy | Lazy with background | Balance startup speed and availability |
| Edge deduplication | Computed ID as primary key | Natural upsert behavior |
| Node completeness | Enum field with index | Simple, queryable |
| Persistence model | Write-through | Simplicity, consistency |
| Edge ID format | `${source}-${target}-${type}` | Unique, sortable, readable |

## Dexie Schema Design

```typescript
// graph-index-db.ts
const db = new Dexie('bibgraph-graph-index');

db.version(1).stores({
  nodes: 'id, entityType, completeness, cachedAt',
  edges: 'id, source, target, type, [source+type], [target+type], [source+target+type]'
});
```

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CachedOpenAlexClient                   │
│                                                             │
│  cacheResponseEntities()                                    │
│    │                                                        │
│    ├──► Entity Cache (entity-cache-db)                     │
│    │      └── entities table                                │
│    │                                                        │
│    └──► Graph Index (graph-index-db)  ◄── NEW              │
│           ├── nodes table                                   │
│           └── edges table                                   │
│                    │                                        │
│                    ▼                                        │
│           PersistentGraph (in-memory)                      │
│              └── Graph class from @bibgraph/algorithms     │
└─────────────────────────────────────────────────────────────┘
```

## References

- Dexie.js documentation: https://dexie.org/
- Existing entity-cache-db: `packages/client/src/cache/dexie/entity-cache-db.ts`
- Relationship extractor: `packages/utils/src/graph-sources/relationship-extractor.ts`
- Graph class: `packages/algorithms/src/graph/graph.ts`
