# Data Model: Persistent Graph Index

**Date**: 2025-12-02
**Spec**: [spec.md](./spec.md)

## Overview

The persistent graph index consists of two IndexedDB tables (`nodes` and `edges`) that store the relationship structure of cached OpenAlex entities. An in-memory `Graph` class provides fast traversal after hydration.

## Database Schema

### Database: `bibgraph-graph-index`

```typescript
import Dexie from 'dexie';

class GraphIndexDatabase extends Dexie {
  nodes!: Dexie.Table<GraphNodeRecord, string>;
  edges!: Dexie.Table<GraphEdgeRecord, string>;

  constructor() {
    super('bibgraph-graph-index');
    this.version(1).stores({
      nodes: 'id, entityType, completeness, cachedAt, updatedAt',
      edges: 'id, source, target, type, direction, [source+type], [target+type], [source+target+type], discoveredAt'
    });
  }
}
```

## Type Definitions

### CompletenessStatus

```typescript
/**
 * Indicates how much data is available for a graph node.
 *
 * - 'full': Entity was fully fetched via detail API
 * - 'partial': Entity from list response (some fields may be missing)
 * - 'stub': Only ID known from relationship reference (no data fetched)
 */
type CompletenessStatus = 'full' | 'partial' | 'stub';
```

### GraphNodeRecord

```typescript
import type { EntityType } from '@bibgraph/types';

/**
 * Represents a node in the graph index (stored in IndexedDB).
 * Maps 1:1 with OpenAlex entities.
 */
interface GraphNodeRecord {
  /** OpenAlex ID in short form (e.g., "W123456789", "A987654321") */
  id: string;

  /** Entity type from OpenAlex taxonomy */
  entityType: EntityType;

  /** Display label for the node */
  label: string;

  /** Data completeness status */
  completeness: CompletenessStatus;

  /** Unix timestamp (ms) when node was first added to graph */
  cachedAt: number;

  /** Unix timestamp (ms) when node was last updated */
  updatedAt: number;

  /** Optional metadata (e.g., citation counts, work type, institution country) */
  metadata?: Record<string, unknown>;
}
```

### GraphEdgeRecord

```typescript
import type { RelationType, EdgeDirection } from '@bibgraph/types';

/**
 * Represents an edge in the graph index (stored in IndexedDB).
 * Captures a single relationship between two entities.
 */
interface GraphEdgeRecord {
  /**
   * Unique edge identifier.
   * Format: `${source}-${target}-${type}` (e.g., "W123-A456-AUTHORSHIP")
   */
  id: string;

  /** Source node ID (OpenAlex ID) */
  source: string;

  /** Target node ID (OpenAlex ID) */
  target: string;

  /** Relationship type */
  type: RelationType;

  /**
   * Direction indicator based on data ownership.
   * - 'outbound': Source entity contains the relationship data
   * - 'inbound': Target entity contains the relationship data (reverse lookup)
   */
  direction: EdgeDirection;

  /** Unix timestamp (ms) when edge was discovered */
  discoveredAt: number;

  /** Optional edge metadata (e.g., author position, citation context) */
  metadata?: Record<string, unknown>;
}
```

## Index Design

### Nodes Table Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| Primary | `id` | Direct node lookup by OpenAlex ID |
| Secondary | `entityType` | Filter nodes by type (works, authors, etc.) |
| Secondary | `completeness` | Find stub nodes for batch expansion |
| Secondary | `cachedAt` | Age-based queries (e.g., recently added) |
| Secondary | `updatedAt` | Find stale nodes for refresh |

### Edges Table Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| Primary | `id` | Direct edge lookup, deduplication |
| Secondary | `source` | Get all edges from a node |
| Secondary | `target` | Get all edges to a node |
| Secondary | `type` | Filter by relationship type |
| Secondary | `direction` | Filter outbound vs inbound |
| Compound | `[source+type]` | Get edges from node by type |
| Compound | `[target+type]` | Get edges to node by type |
| Compound | `[source+target+type]` | Check edge existence (dedup) |
| Secondary | `discoveredAt` | Age-based queries |

## Entity-to-Node Mapping

### Completeness Determination

```typescript
function determineCompleteness(entityData: Record<string, unknown>): CompletenessStatus {
  // Full: Has complete entity detail fields
  if (entityData.cited_by_count !== undefined &&
      entityData.created_date !== undefined) {
    return 'full';
  }

  // Partial: Has some data but missing detail fields
  if (entityData.display_name !== undefined) {
    return 'partial';
  }

  // Stub: Only ID known
  return 'stub';
}
```

### Node Label Extraction

```typescript
function extractLabel(entityType: EntityType, entityData: Record<string, unknown>): string {
  const displayName = entityData.display_name;
  if (typeof displayName === 'string' && displayName.length > 0) {
    return displayName;
  }

  // Fallback for stub nodes
  const id = entityData.id as string;
  return id || 'Unknown';
}
```

## Relationship-to-Edge Mapping

### Edge ID Generation

```typescript
function generateEdgeId(source: string, target: string, type: RelationType): string {
  return `${source}-${target}-${type}`;
}
```

### Direction Assignment

```typescript
/**
 * Determines edge direction based on which entity owns the relationship data.
 *
 * Outbound: The source entity's API response contains the relationship
 * Inbound: The target entity's API response contains the relationship (discovered via reverse lookup)
 */
function determineDirection(
  extractedFromEntityId: string,
  source: string,
  target: string
): EdgeDirection {
  return extractedFromEntityId === source ? 'outbound' : 'inbound';
}
```

## Sample Data

### GraphNodeRecord Examples

```typescript
// Full node (fetched via detail API)
const fullNode: GraphNodeRecord = {
  id: 'W2741809807',
  entityType: 'works',
  label: 'The state of OA: a large-scale analysis',
  completeness: 'full',
  cachedAt: 1701475200000,
  updatedAt: 1701475200000,
  metadata: {
    cited_by_count: 1247,
    publication_year: 2018,
    type: 'article'
  }
};

// Partial node (from list response)
const partialNode: GraphNodeRecord = {
  id: 'A5023888391',
  entityType: 'authors',
  label: 'Jason Priem',
  completeness: 'partial',
  cachedAt: 1701475200000,
  updatedAt: 1701475200000
};

// Stub node (referenced but not fetched)
const stubNode: GraphNodeRecord = {
  id: 'W1234567890',
  entityType: 'works',
  label: 'W1234567890', // Falls back to ID
  completeness: 'stub',
  cachedAt: 1701475200000,
  updatedAt: 1701475200000
};
```

### GraphEdgeRecord Examples

```typescript
// Authorship edge (outbound from work)
const authorshipEdge: GraphEdgeRecord = {
  id: 'W2741809807-A5023888391-AUTHORSHIP',
  source: 'W2741809807',
  target: 'A5023888391',
  type: 'AUTHORSHIP',
  direction: 'outbound',
  discoveredAt: 1701475200000,
  metadata: {
    author_position: 'first'
  }
};

// Citation edge (outbound from citing work)
const citationEdge: GraphEdgeRecord = {
  id: 'W2741809807-W1234567890-REFERENCE',
  source: 'W2741809807',
  target: 'W1234567890',
  type: 'REFERENCE',
  direction: 'outbound',
  discoveredAt: 1701475200000
};

// Affiliation edge (outbound from author)
const affiliationEdge: GraphEdgeRecord = {
  id: 'A5023888391-I205783295-AFFILIATION',
  source: 'A5023888391',
  target: 'I205783295',
  type: 'AFFILIATION',
  direction: 'outbound',
  discoveredAt: 1701475200000
};
```

## Query Patterns

### Get Neighbors

```typescript
// Get all neighbors (both directions)
async function getNeighbors(nodeId: string): Promise<string[]> {
  const outgoing = await db.edges.where('source').equals(nodeId).toArray();
  const incoming = await db.edges.where('target').equals(nodeId).toArray();

  const neighbors = new Set<string>();
  outgoing.forEach(e => neighbors.add(e.target));
  incoming.forEach(e => neighbors.add(e.source));

  return Array.from(neighbors);
}
```

### Get Edges by Type

```typescript
// Get authorship edges from a work
async function getAuthorships(workId: string): Promise<GraphEdgeRecord[]> {
  return db.edges
    .where('[source+type]')
    .equals([workId, 'AUTHORSHIP'])
    .toArray();
}
```

### Find Stub Nodes

```typescript
// Get all stub nodes for batch expansion
async function getStubNodes(): Promise<GraphNodeRecord[]> {
  return db.nodes
    .where('completeness')
    .equals('stub')
    .toArray();
}
```

## Storage Estimates

| Entity Count | Node Storage | Edge Storage | Total |
|--------------|--------------|--------------|-------|
| 100 | ~20 KB | ~75 KB | ~95 KB |
| 1,000 | ~200 KB | ~750 KB | ~950 KB |
| 10,000 | ~2 MB | ~7.5 MB | ~9.5 MB |

Assumptions:
- 1 node ≈ 200 bytes
- 5 edges per entity average ≈ 750 bytes per entity
- Well within browser IndexedDB limits (typically 50MB-unlimited)

## Migration Strategy

No migration required - this is a new derived index. If schema changes are needed during development:

1. Increment Dexie version number
2. Add upgrade function if preserving data needed
3. Or simply delete `bibgraph-graph-index` database and rebuild from entity cache

```typescript
// Schema upgrade example (if needed later)
db.version(2).stores({
  nodes: 'id, entityType, completeness, cachedAt, updatedAt, [entityType+completeness]',
  edges: 'id, source, target, type, direction, [source+type], [target+type], [source+target+type], discoveredAt'
}).upgrade(tx => {
  // Migration logic
});
```
