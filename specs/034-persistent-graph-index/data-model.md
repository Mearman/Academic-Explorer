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
      edges: [
        'id',
        'source',
        'target',
        'type',
        'direction',
        '[source+type]',
        '[target+type]',
        '[source+target+type]',
        'discoveredAt',
        // Indexed edge properties
        'authorPosition',
        'isCorresponding',
        'isOpenAccess',
        'score',
        '[source+type+authorPosition]',
        '[source+type+isOpenAccess]'
      ].join(', ')
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

  // =========================================================================
  // Indexed Edge Properties (commonly-queried metadata promoted to fields)
  // =========================================================================

  /** Author position in authorship list (AUTHORSHIP edges only) */
  authorPosition?: 'first' | 'middle' | 'last';

  /** Whether this is the corresponding author (AUTHORSHIP edges only) */
  isCorresponding?: boolean;

  /** Whether the publication is open access (PUBLICATION edges only) */
  isOpenAccess?: boolean;

  /** Publication version stage (PUBLICATION edges only) */
  version?: 'accepted' | 'submitted' | 'published';

  /** Topic relevance score 0-1 (TOPIC edges only) */
  score?: number;

  /** Years of affiliation (AFFILIATION edges only) */
  years?: number[];

  /** Grant/award identifier (FUNDED_BY edges only) */
  awardId?: string;

  /** Entity role type (HAS_ROLE edges only) */
  role?: string;

  // =========================================================================

  /** Optional additional metadata not covered by indexed fields */
  metadata?: Record<string, unknown>;
}
```

### Indexed Edge Property Types

```typescript
/** Author position in authorship list */
type AuthorPosition = 'first' | 'middle' | 'last';

/** Publication version stage */
type PublicationVersion = 'accepted' | 'submitted' | 'published';

/** Edge property filter for queries */
interface EdgePropertyFilter {
  authorPosition?: AuthorPosition;
  isCorresponding?: boolean;
  isOpenAccess?: boolean;
  version?: PublicationVersion;
  scoreMin?: number;
  scoreMax?: number;
  yearsInclude?: number[];  // Filter affiliations that include any of these years
  awardId?: string;
  role?: string;
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
| Secondary | `authorPosition` | Filter by author position |
| Secondary | `isCorresponding` | Filter corresponding authors |
| Secondary | `isOpenAccess` | Filter OA publications |
| Secondary | `score` | Filter by topic relevance |
| Compound | `[source+type+authorPosition]` | First authors of a work |
| Compound | `[source+type+isOpenAccess]` | OA publications from source |

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
// Authorship edge (outbound from work) - with indexed properties
const authorshipEdge: GraphEdgeRecord = {
  id: 'W2741809807-A5023888391-AUTHORSHIP',
  source: 'W2741809807',
  target: 'A5023888391',
  type: 'AUTHORSHIP',
  direction: 'outbound',
  discoveredAt: 1701475200000,
  // Indexed properties
  authorPosition: 'first',
  isCorresponding: true,
  // Additional metadata
  metadata: {
    raw_affiliation_string: 'Indiana University, Bloomington'
  }
};

// Publication edge (outbound from work) - with OA status
const publicationEdge: GraphEdgeRecord = {
  id: 'W2741809807-S1234567890-PUBLICATION',
  source: 'W2741809807',
  target: 'S1234567890',
  type: 'PUBLICATION',
  direction: 'outbound',
  discoveredAt: 1701475200000,
  // Indexed properties
  isOpenAccess: true,
  version: 'published'
};

// Topic edge (outbound from work) - with relevance score
const topicEdge: GraphEdgeRecord = {
  id: 'W2741809807-T12345-TOPIC',
  source: 'W2741809807',
  target: 'T12345',
  type: 'TOPIC',
  direction: 'outbound',
  discoveredAt: 1701475200000,
  // Indexed properties
  score: 0.87
};

// Citation edge (outbound from citing work) - no special properties
const citationEdge: GraphEdgeRecord = {
  id: 'W2741809807-W1234567890-REFERENCE',
  source: 'W2741809807',
  target: 'W1234567890',
  type: 'REFERENCE',
  direction: 'outbound',
  discoveredAt: 1701475200000
};

// Affiliation edge (outbound from author) - with years
const affiliationEdge: GraphEdgeRecord = {
  id: 'A5023888391-I205783295-AFFILIATION',
  source: 'A5023888391',
  target: 'I205783295',
  type: 'AFFILIATION',
  direction: 'outbound',
  discoveredAt: 1701475200000,
  // Indexed properties
  years: [2015, 2016, 2017, 2018]
};

// Funding edge (outbound from work) - with award ID
const fundingEdge: GraphEdgeRecord = {
  id: 'W2741809807-F123456-FUNDED_BY',
  source: 'W2741809807',
  target: 'F123456',
  type: 'FUNDED_BY',
  direction: 'outbound',
  discoveredAt: 1701475200000,
  // Indexed properties
  awardId: 'NSF-1234567'
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

### Filter by Edge Properties

```typescript
// Get first authors of a work
async function getFirstAuthors(workId: string): Promise<GraphEdgeRecord[]> {
  return db.edges
    .where('[source+type+authorPosition]')
    .equals([workId, 'AUTHORSHIP', 'first'])
    .toArray();
}

// Get corresponding authors
async function getCorrespondingAuthors(workId: string): Promise<GraphEdgeRecord[]> {
  return db.edges
    .where('source').equals(workId)
    .and(edge => edge.type === 'AUTHORSHIP' && edge.isCorresponding === true)
    .toArray();
}

// Get high-relevance topics (score >= threshold)
async function getHighRelevanceTopics(entityId: string, threshold: number = 0.5): Promise<GraphEdgeRecord[]> {
  return db.edges
    .where('source').equals(entityId)
    .and(edge => edge.type === 'TOPIC' && (edge.score ?? 0) >= threshold)
    .toArray();
}

// Get open access publications
async function getOpenAccessPublications(workId: string): Promise<GraphEdgeRecord[]> {
  return db.edges
    .where('[source+type+isOpenAccess]')
    .equals([workId, 'PUBLICATION', 1]) // Dexie stores booleans as 0/1
    .toArray();
}

// Get affiliations during a specific year
async function getAffiliationsInYear(authorId: string, year: number): Promise<GraphEdgeRecord[]> {
  return db.edges
    .where('source').equals(authorId)
    .and(edge => edge.type === 'AFFILIATION' && (edge.years ?? []).includes(year))
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
