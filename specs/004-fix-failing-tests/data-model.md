# Data Model: Catalogue Feature

**Feature**: 004-fix-failing-tests
**Created**: 2025-11-11
**Status**: Complete

## Overview

This document defines the data structures for the catalogue feature. The catalogue allows users to organize OpenAlex entities (works, authors, institutions, etc.) into named lists with metadata, notes, and sharing capabilities.

## Core Entities

### CatalogueList

Represents a named collection of entities.

```typescript
interface CatalogueList {
  id: string;                    // UUID v4
  title: string;                 // Required, 1-200 characters
  description?: string;          // Optional, max 1000 characters
  createdAt: string;            // ISO 8601 timestamp
  updatedAt: string;            // ISO 8601 timestamp
  entityCount: number;          // Computed, denormalized for performance
  isPublic: boolean;            // True when shared, false by default
  isBibliography: boolean;      // True for bibliography lists, false for regular
  shareToken?: string;          // UUID v4, generated when first shared
}
```

**Validation Rules**:
- `id`: Must be valid UUID v4
- `title`: Required, trimmed, 1-200 characters
- `description`: Optional, trimmed, max 1000 characters
- `createdAt`: ISO 8601, set on creation, immutable
- `updatedAt`: ISO 8601, updated on any list modification
- `entityCount`: Non-negative integer, recomputed on entity add/remove
- `isPublic`: Boolean, set to true when share URL generated
- `isBibliography`: Boolean, affects rendering but shares same functionality
- `shareToken`: Generated once when first shared, immutable after generation

**Indexes**:
- Primary: `id`
- Secondary: `shareToken` (for share URL lookups)
- Secondary: `updatedAt` (for sorting lists by recent activity)

### CatalogueEntity

Represents an entity (work, author, etc.) within a catalogue list.

```typescript
type EntityType =
  | 'work'
  | 'author'
  | 'institution'
  | 'source'
  | 'topic'
  | 'funder'
  | 'publisher'
  | 'concept';

interface CatalogueEntity {
  id: string;                    // Composite: `${listId}:${entityId}`
  listId: string;               // Foreign key to CatalogueList.id
  entityId: string;             // OpenAlex entity ID (e.g., W2741809807)
  entityType: EntityType;       // Entity classification
  position: number;             // 0-based position in list, used for ordering
  note?: string;                // User note, optional, max 5000 characters
  addedAt: string;              // ISO 8601 timestamp when added to list
  metadata: EntityMetadata;     // Denormalized entity data for display
}
```

**Validation Rules**:
- `id`: Composite key format `${listId}:${entityId}`, must be unique
- `listId`: Must reference existing CatalogueList.id
- `entityId`: OpenAlex ID format (letter + numeric)
- `entityType`: Must be one of 8 valid types
- `position`: Non-negative integer, unique within list, sequential
- `note`: Optional, trimmed, max 5000 characters
- `addedAt`: ISO 8601, set on creation, immutable
- `metadata`: Must match EntityMetadata schema for entityType

**Indexes**:
- Primary: `id` (composite key)
- Secondary: `listId` (for querying all entities in a list)
- Secondary: `[listId, position]` (for ordered entity retrieval)

**State Transitions**:
```
[New Entity] --add--> [In List at position N]
[In List at position N] --reorder--> [In List at new position M]
[In List] --update note--> [In List with updated note]
[In List] --remove--> [Deleted]
```

### EntityMetadata

Denormalized entity data stored with each CatalogueEntity for display without API calls.

```typescript
interface BaseEntityMetadata {
  displayName: string;          // Entity's primary display name
  externalIds?: Record<string, string>; // DOI, ORCID, etc.
}

interface WorkMetadata extends BaseEntityMetadata {
  type: 'work';
  publicationYear?: number;
  citedByCount: number;
  primaryLocation?: {
    source?: { displayName: string };
  };
  authorships?: Array<{
    author: { displayName: string };
    institutions: Array<{ displayName: string }>;
  }>;
  openAccess?: {
    isOa: boolean;
    oaStatus: string;
  };
}

interface AuthorMetadata extends BaseEntityMetadata {
  type: 'author';
  worksCount: number;
  citedByCount: number;
  hIndex?: number;
  lastKnownInstitution?: {
    displayName: string;
  };
}

interface InstitutionMetadata extends BaseEntityMetadata {
  type: 'institution';
  worksCount: number;
  citedByCount: number;
  countryCode?: string;
  type?: string;               // University, Company, etc.
}

interface SourceMetadata extends BaseEntityMetadata {
  type: 'source';
  worksCount: number;
  citedByCount: number;
  issn?: string[];
  isOa?: boolean;
}

interface TopicMetadata extends BaseEntityMetadata {
  type: 'topic';
  worksCount: number;
  citedByCount: number;
  field?: { displayName: string };
  domain?: { displayName: string };
}

interface FunderMetadata extends BaseEntityMetadata {
  type: 'funder';
  worksCount: number;
  citedByCount: number;
  countryCode?: string;
}

interface PublisherMetadata extends BaseEntityMetadata {
  type: 'publisher';
  worksCount: number;
  citedByCount: number;
  countryCode?: string;
}

interface ConceptMetadata extends BaseEntityMetadata {
  type: 'concept';
  worksCount: number;
  citedByCount: number;
  level?: number;
}

type EntityMetadata =
  | WorkMetadata
  | AuthorMetadata
  | InstitutionMetadata
  | SourceMetadata
  | TopicMetadata
  | FunderMetadata
  | PublisherMetadata
  | ConceptMetadata;
```

**Validation Rules**:
- `displayName`: Required, non-empty string
- Type-specific fields: Must match OpenAlex schema
- Counts: Non-negative integers
- All fields are snapshot at time of addition (not live-updated)

## Import/Export Format

### ExportFormat

Format used for exporting lists and encoding in share URLs.

```typescript
interface ExportFormat {
  version: '1.0';               // Format version for future migrations
  exportedAt: string;           // ISO 8601 timestamp of export
  listMetadata: {
    title: string;
    description?: string;
    created: string;            // ISO 8601 (from createdAt)
    entityCount: number;
    isBibliography: boolean;
  };
  entities: Array<{
    entityId: string;           // OpenAlex ID
    type: EntityType;
    position: number;
    note?: string;
    addedAt: string;            // ISO 8601
    metadata: EntityMetadata;
  }>;
}
```

**Validation Rules**:
- `version`: Must be '1.0' (validates compatibility)
- `exportedAt`: ISO 8601, current timestamp on export
- `listMetadata.title`: Required, 1-200 characters
- `listMetadata.entityCount`: Must match `entities.length`
- `entities`: Array, max 10,000 entities (performance limit)
- Entity positions: Must be sequential 0-based integers
- Each entity must have valid metadata matching its type

**Compression Pipeline**:
1. Serialize to JSON
2. Compress with `pako.deflate(json, { level: 9 })`
3. Encode as Base64URL: `btoa(compressed).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')`
4. Embed in URL: `https://domain/catalogue/import?data={base64url}`

**Import Validation**:
```typescript
function validateExportFormat(data: unknown): asserts data is ExportFormat {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid format: must be object');
  }

  const format = data as Partial<ExportFormat>;

  if (format.version !== '1.0') {
    throw new Error(`Unsupported version: ${format.version}`);
  }

  if (!format.listMetadata?.title?.trim()) {
    throw new Error('Invalid format: missing list title');
  }

  if (!Array.isArray(format.entities)) {
    throw new Error('Invalid format: entities must be array');
  }

  if (format.entities.length !== format.listMetadata.entityCount) {
    throw new Error('Invalid format: entity count mismatch');
  }

  if (format.entities.length > 10000) {
    throw new Error('Invalid format: too many entities (max 10,000)');
  }

  // Validate each entity
  format.entities.forEach((entity, index) => {
    if (!entity.entityId || !entity.type || typeof entity.position !== 'number') {
      throw new Error(`Invalid entity at position ${index}`);
    }
    if (entity.position !== index) {
      throw new Error(`Invalid entity position at index ${index}: expected ${index}, got ${entity.position}`);
    }
  });
}
```

## Storage Schema (Dexie)

### Database Definition

```typescript
import Dexie, { Table } from 'dexie';

class CatalogueDatabase extends Dexie {
  catalogueLists!: Table<CatalogueList, string>;
  catalogueEntities!: Table<CatalogueEntity, string>;

  constructor() {
    super('AcademicExplorerCatalogue');

    this.version(1).stores({
      catalogueLists: 'id, shareToken, updatedAt',
      catalogueEntities: 'id, listId, [listId+position]',
    });
  }
}

const db = new CatalogueDatabase();
```

**Index Strategy**:
- `catalogueLists.id`: Primary key for direct lookups
- `catalogueLists.shareToken`: Secondary index for share URL imports
- `catalogueLists.updatedAt`: Secondary index for sorting by recent activity
- `catalogueEntities.id`: Composite primary key for direct entity lookups
- `catalogueEntities.listId`: Secondary index for fetching all entities in a list
- `catalogueEntities.[listId+position]`: Compound index for ordered retrieval

## Relationships

```
CatalogueList (1) --< (N) CatalogueEntity
  - One list contains many entities
  - Cascade delete: removing list removes all its entities
  - Position uniqueness: enforced within same listId

Entity Position Ordering:
  - Position is 0-based sequential
  - Gaps allowed but avoided (recomputed on reorder)
  - Reorder operation updates multiple entity positions atomically
```

## Business Rules

### Duplicate Detection

**Rule**: Same entity cannot be added to same list twice.

**Implementation**:
```typescript
async function canAddEntityToList(listId: string, entityId: string): Promise<boolean> {
  const existing = await db.catalogueEntities.get(`${listId}:${entityId}`);
  return !existing;
}
```

### Position Management

**Rule**: Positions must be sequential and unique within a list.

**Add Entity**:
```typescript
async function addEntityToList(listId: string, entity: EntityToAdd): Promise<void> {
  // Get max position in list
  const maxPosition = await db.catalogueEntities
    .where('listId')
    .equals(listId)
    .sortBy('position')
    .then(entities => entities[entities.length - 1]?.position ?? -1);

  // Add at next position
  await db.catalogueEntities.add({
    id: `${listId}:${entity.entityId}`,
    listId,
    entityId: entity.entityId,
    entityType: entity.entityType,
    position: maxPosition + 1,
    addedAt: new Date().toISOString(),
    metadata: entity.metadata,
  });

  // Update list entityCount
  await updateListEntityCount(listId);
}
```

**Reorder**:
```typescript
async function reorderEntity(
  listId: string,
  entityId: string,
  newPosition: number
): Promise<void> {
  // Get all entities in list
  const entities = await db.catalogueEntities
    .where('listId')
    .equals(listId)
    .sortBy('position');

  // Find entity to move
  const entityIndex = entities.findIndex(e => e.entityId === entityId);
  if (entityIndex === -1) throw new Error('Entity not found');

  // Reorder array
  const [moved] = entities.splice(entityIndex, 1);
  entities.splice(newPosition, 0, moved);

  // Update all positions atomically
  await db.transaction('rw', db.catalogueEntities, async () => {
    for (let i = 0; i < entities.length; i++) {
      await db.catalogueEntities.update(entities[i].id, { position: i });
    }
  });
}
```

### List Sharing

**Rule**: Share token generated once and never changes.

```typescript
async function generateShareURL(listId: string): Promise<string> {
  const list = await db.catalogueLists.get(listId);
  if (!list) throw new Error('List not found');

  // Generate token if not exists
  if (!list.shareToken) {
    const shareToken = crypto.randomUUID();
    await db.catalogueLists.update(listId, {
      shareToken,
      isPublic: true
    });
    list.shareToken = shareToken;
  }

  // Export list data
  const exportData = await exportList(listId);

  // Compress and encode
  const json = JSON.stringify(exportData);
  const compressed = pako.deflate(json, { level: 9 });
  const base64url = btoa(String.fromCharCode(...compressed))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${window.location.origin}/catalogue/import?data=${base64url}`;
}
```

## Performance Considerations

### Denormalization

Entity metadata is denormalized in `CatalogueEntity.metadata` to avoid API calls during list rendering. Trade-off: data may become stale if OpenAlex updates entity, but enables offline viewing and fast rendering.

### Batch Operations

Bulk operations (delete multiple, export large lists) use Dexie transactions for atomicity and performance:

```typescript
async function bulkDeleteEntities(entityIds: string[]): Promise<void> {
  await db.transaction('rw', db.catalogueEntities, db.catalogueLists, async () => {
    // Delete entities
    await db.catalogueEntities.bulkDelete(entityIds);

    // Update affected lists' counts
    const affectedLists = new Set(
      entityIds.map(id => id.split(':')[0])
    );
    for (const listId of affectedLists) {
      await updateListEntityCount(listId);
    }
  });
}
```

### Pagination

For lists with 100+ entities, implement virtual scrolling with `@tanstack/react-virtual`:

```typescript
// Load entities in chunks as user scrolls
const virtualizer = useVirtualizer({
  count: totalEntityCount,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 80, // Estimated row height
  overscan: 10, // Render 10 extra rows outside viewport
});
```

## Migration Strategy

Current version: 1.0 (no migrations needed for new feature)

Future migrations will use Dexie version upgrades:

```typescript
// Example future migration
this.version(2).stores({
  catalogueLists: 'id, shareToken, updatedAt, tags', // Add tags field
}).upgrade(tx => {
  // Migrate existing data
  return tx.table('catalogueLists').toCollection().modify(list => {
    list.tags = [];
  });
});
```

## References

- [Dexie.js Documentation](https://dexie.org/)
- [OpenAlex Entity Schema](https://docs.openalex.org/api-entities/entities-overview)
- [TypeScript Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
