# Data Model: Storage Abstraction Layer

**Feature**: Storage Abstraction Layer ([spec.md](./spec.md))
**Date**: 2025-11-11
**Purpose**: Define entity relationships, data structures, and validation rules

## Overview

The storage abstraction layer manages catalogue data through three primary entities: **CatalogueList**, **CatalogueEntity**, and **CatalogueShareRecord**. These entities are persisted through a `StorageProvider` interface that can be implemented with different backends (IndexedDB via Dexie for production, in-memory Maps for testing).

---

## Core Entities

### 1. CatalogueList

**Purpose**: Represents a collection of academic entities (works, authors, institutions, etc.) organized by the user for research purposes.

**Attributes**:

| Attribute | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `id` | string (UUID) | Yes | Unique identifier for the list | Auto-generated, immutable |
| `title` | string | Yes | User-provided list name | 1-200 characters |
| `description` | string | No | Optional list description | 0-1000 characters |
| `type` | ListType | Yes | List category | One of: "list", "bibliography" |
| `tags` | string[] | No | User-defined tags for organization | 0-50 tags, each 1-50 chars |
| `createdAt` | Date | Yes | Timestamp of creation | Auto-generated, immutable |
| `updatedAt` | Date | Yes | Timestamp of last modification | Auto-updated on changes |
| `isPublic` | boolean | Yes | Whether list can be shared | Defaults to false |
| `shareToken` | string (UUID) | No | Token for public sharing | Generated when sharing enabled |

**Business Rules**:
- Lists with `type="bibliography"` can only contain entities with `entityType="works"`
- Lists with `type="list"` can contain any entity type
- Two special system lists exist with fixed IDs:
  - **Bookmarks** (`SPECIAL_LIST_IDS.BOOKMARKS`): Cannot be deleted
  - **History** (`SPECIAL_LIST_IDS.HISTORY`): Cannot be deleted
- User-created lists must have unique titles (soft requirement, not enforced by database)
- Updating a list must update the `updatedAt` timestamp
- Deleting a list must cascade delete all associated entities and share records

**Example**:
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Cultural Heritage ML Papers",
  "description": "Research papers on machine learning applications in cultural heritage",
  "type": "bibliography",
  "tags": ["machine-learning", "cultural-heritage", "thesis"],
  "createdAt": "2025-11-11T10:00:00.000Z",
  "updatedAt": "2025-11-11T14:30:00.000Z",
  "isPublic": true,
  "shareToken": "f1e2d3c4-b5a6-7890-cdef-ab1234567890"
}
```

---

### 2. CatalogueEntity

**Purpose**: Represents a link between an academic entity (work, author, institution, etc.) and a catalogue list.

**Attributes**:

| Attribute | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `id` | string (UUID) | Yes | Unique identifier for this record | Auto-generated, immutable |
| `listId` | string (UUID) | Yes | FK to CatalogueList.id | Must reference existing list |
| `entityType` | EntityType | Yes | Type of academic entity | One of: "works", "authors", "sources", "institutions", "topics", "publishers", "funders" |
| `entityId` | string | Yes | OpenAlex ID of the entity | Format: {A,W,S,I,T,P,F}{ID} |
| `addedAt` | Date | Yes | Timestamp when entity was added | Auto-generated, immutable |
| `notes` | string | No | User notes about this entity | 0-5000 characters |
| `position` | number | Yes | Sort order within the list | Auto-assigned, 1-indexed |

**Business Rules**:
- Entities within a list must have unique (`entityType`, `entityId`) combinations
- Position values must be positive integers starting from 1
- Bibliography lists (`type="bibliography"`) can only contain `entityType="works"`
- When adding an entity, `position` defaults to `max(existing positions) + 1`
- Deleting a list must cascade delete all its entities
- Updating entity notes must update parent list's `updatedAt` timestamp

**Relationships**:
- **Belongs To**: `CatalogueList` (via `listId`)
- **Indexed By**: `listId`, `entityType`, `entityId`, `position`

**Example**:
```json
{
  "id": "e1f2g3h4-i5j6-7890-klmn-op1234567890",
  "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "entityType": "works",
  "entityId": "W2741809807",
  "addedAt": "2025-11-11T10:15:00.000Z",
  "notes": "Key paper for methodology section - cite in Chapter 3",
  "position": 1
}
```

---

### 3. CatalogueShareRecord

**Purpose**: Tracks metadata for publicly shared catalogue lists.

**Attributes**:

| Attribute | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `id` | string (UUID) | Yes | Unique identifier for share record | Auto-generated, immutable |
| `listId` | string (UUID) | Yes | FK to CatalogueList.id | Must reference existing list |
| `shareToken` | string (UUID) | Yes | Unique token for sharing | Auto-generated, unique |
| `createdAt` | Date | Yes | When sharing was enabled | Auto-generated, immutable |
| `expiresAt` | Date | No | When share access expires | Optional expiration |
| `accessCount` | number | No | Number of times accessed | Incremented on each access |
| `lastAccessedAt` | Date | No | Last access timestamp | Updated on access |

**Business Rules**:
- Each list can have multiple share records (historical tracking)
- Only one share record can be active (latest `createdAt`, not expired)
- Expired shares (`expiresAt < now`) return `valid: false` on access
- Accessing a share increments `accessCount` and updates `lastAccessedAt`
- Deleting a list must cascade delete all its share records
- `shareToken` must be globally unique across all lists

**Relationships**:
- **Belongs To**: `CatalogueList` (via `listId`)
- **Indexed By**: `shareToken`, `listId`

**Example**:
```json
{
  "id": "s1h2a3r4-e5t6-7890-oken-ab1234567890",
  "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "shareToken": "f1e2d3c4-b5a6-7890-cdef-ab1234567890",
  "createdAt": "2025-11-11T14:30:00.000Z",
  "expiresAt": "2026-11-11T14:30:00.000Z",
  "accessCount": 42,
  "lastAccessedAt": "2025-11-11T15:45:00.000Z"
}
```

---

## Enum Types

### ListType

Defines the category of a catalogue list.

| Value | Description | Constraints |
|-------|-------------|-------------|
| `"list"` | General-purpose collection | Can contain any entity type |
| `"bibliography"` | Research bibliography | Can only contain `entityType="works"` |

**Future Expansion**: May add `"reading-list"`, `"dataset"`, `"collaboration"` types.

### EntityType

Defines the type of academic entity that can be catalogued.

| Value | OpenAlex Type | ID Prefix | Description |
|-------|---------------|-----------|-------------|
| `"works"` | Work | W | Academic papers, books, datasets |
| `"authors"` | Author | A | Researchers and authors |
| `"sources"` | Source | S | Journals, conferences, repositories |
| `"institutions"` | Institution | I | Universities, research labs |
| `"topics"` | Topic | T | Research topics and fields |
| `"publishers"` | Publisher | P | Academic publishers |
| `"funders"` | Funder | F | Research funding organizations |

**Validation**: Each type must match the corresponding OpenAlex ID prefix.

---

## Entity Relationships

```
CatalogueList (1) ──< (∞) CatalogueEntity
     │
     └──< (∞) CatalogueShareRecord

Legend:
─── : One-to-Many relationship
FK  : Foreign Key reference
```

**Cascade Deletion Rules**:
1. When a `CatalogueList` is deleted:
   - All associated `CatalogueEntity` records are deleted
   - All associated `CatalogueShareRecord` records are deleted
2. Special system lists cannot be deleted (enforced by business logic)

**Referential Integrity**:
- `CatalogueEntity.listId` must reference an existing `CatalogueList.id`
- `CatalogueShareRecord.listId` must reference an existing `CatalogueList.id`
- Orphaned entities/shares are not permitted

---

## Storage Provider Interface

The entities above are persisted through a `StorageProvider` abstraction that defines CRUD operations for all three entities.

### Required Operations

**List Operations**:
- `createList(params)` → Creates new list, returns ID
- `getList(listId)` → Retrieves single list or null
- `getAllLists()` → Retrieves all lists, sorted by updatedAt (desc)
- `updateList(listId, updates)` → Updates list fields, updates timestamp
- `deleteList(listId)` → Deletes list and cascades to entities/shares

**Entity Operations**:
- `addEntityToList(params)` → Adds entity to list, returns record ID
- `getListEntities(listId)` → Retrieves entities for list, sorted by position
- `removeEntityFromList(listId, entityRecordId)` → Removes entity
- `updateEntityNotes(entityRecordId, notes)` → Updates notes, updates list timestamp

**Batch Operations**:
- `addEntitiesToList(listId, entities[])` → Adds multiple entities, returns success/failed counts

**Search Operations**:
- `searchLists(query)` → Full-text search on title, description, tags
- `getListStats(listId)` → Returns total count and breakdown by entity type

**Share Operations**:
- `generateShareToken(listId)` → Creates share record, enables public access
- `getListByShareToken(token)` → Retrieves list via share token, increments access count

**Special Lists**:
- `initializeSpecialLists()` → Creates system lists if not exists
- `isSpecialList(listId)` → Checks if list is system-managed
- `addBookmark(params)` → Adds entity to Bookmarks list
- `getBookmarks()` → Retrieves all bookmarks
- `isBookmarked(entityType, entityId)` → Checks if entity is bookmarked
- `addToHistory(params)` → Adds entity to History list
- `getHistory()` → Retrieves browsing history
- `clearHistory()` → Removes all history entries

**Utility Operations**:
- `getNonSystemLists()` → Retrieves user-created lists (excludes Bookmarks/History)

---

## Data Validation Rules

### Field-Level Validation

| Entity | Field | Validation Rule |
|--------|-------|----------------|
| CatalogueList | title | Required, 1-200 chars, non-empty after trim |
| CatalogueList | description | Optional, max 1000 chars |
| CatalogueList | type | Required, must be "list" or "bibliography" |
| CatalogueList | tags | Optional, max 50 tags, each 1-50 chars |
| CatalogueList | isPublic | Required, boolean, defaults to false |
| CatalogueEntity | listId | Required, must reference existing list |
| CatalogueEntity | entityType | Required, must be valid EntityType enum |
| CatalogueEntity | entityId | Required, must match OpenAlex ID format |
| CatalogueEntity | notes | Optional, max 5000 chars |
| CatalogueEntity | position | Required, positive integer |
| CatalogueShareRecord | shareToken | Required, UUID format, globally unique |
| CatalogueShareRecord | expiresAt | Optional, must be future date if provided |

### Business Logic Validation

**On `createList`**:
- ✓ Title is required and non-empty
- ✓ Type is valid ListType
- ✓ Tags array contains no duplicates

**On `addEntityToList`**:
- ✓ List exists
- ✓ Entity type matches list type (for bibliographies)
- ✓ Entity is not duplicate in list (same entityType + entityId)
- ✓ OpenAlex ID format is valid for entity type

**On `deleteList`**:
- ✓ List exists
- ✓ List is not a special system list (Bookmarks/History)

**On `generateShareToken`**:
- ✓ List exists
- ✓ Generated token is unique

**On `getListByShareToken`**:
- ✓ Share record exists
- ✓ Share is not expired
- ✓ Access count is incremented

---

## State Transitions

### List Lifecycle

```
[New] ──createList()──> [Active]
                           │
                           ├──updateList()──> [Active] (updatedAt updated)
                           │
                           ├──generateShareToken()──> [Active + Public]
                           │
                           └──deleteList()──> [Deleted]
```

### Entity Lifecycle

```
[New] ──addEntityToList()──> [Linked]
                                │
                                ├──updateEntityNotes()──> [Linked] (notes updated)
                                │
                                └──removeEntityFromList()──> [Unlinked]
```

### Share Lifecycle

```
[None] ──generateShareToken()──> [Active]
                                    │
                                    ├──(time passes)──> [Expired] (if expiresAt < now)
                                    │
                                    └──getListByShareToken()──> [Active] (accessCount++)
```

---

## Index Strategy

### Primary Indices (for lookups)

| Entity | Index | Purpose |
|--------|-------|---------|
| CatalogueList | `id` (PK) | Direct list retrieval |
| CatalogueEntity | `id` (PK) | Direct entity record retrieval |
| CatalogueShareRecord | `id` (PK) | Direct share record retrieval |

### Secondary Indices (for queries)

| Entity | Index | Purpose | Cardinality |
|--------|-------|---------|-------------|
| CatalogueList | `updatedAt` | Sort lists by modification time | High |
| CatalogueList | `title` | Full-text search | High |
| CatalogueList | `tags` (multi-entry) | Filter by tags | Medium |
| CatalogueEntity | `listId` | Get all entities in a list | High |
| CatalogueEntity | `entityType` | Filter by entity type | Low (7 values) |
| CatalogueEntity | `position` | Sort entities in list | High |
| CatalogueEntity | `(listId, entityType, entityId)` (compound) | Check for duplicates | Very High |
| CatalogueShareRecord | `shareToken` (unique) | Access via share link | High |
| CatalogueShareRecord | `listId` | Get shares for a list | Low |

**Index Usage**:
- **IndexedDB (Dexie)**: Implements all indices via Dexie schema definition
- **In-Memory (Maps)**: Uses JavaScript Map for primary lookups, additional Maps for common queries (e.g., `entitiesByListId: Map<listId, Set<entityId>>`)

---

## Data Migration

**Current State**: No migration needed - this is the initial data model for the abstraction layer.

**Future Considerations**:
- If entity types expand beyond current 7 types, update `EntityType` enum and add to valid ID prefix mapping
- If list types expand (e.g., "reading-list", "dataset"), update `ListType` enum and validation logic
- If share expiration logic changes, update `getListByShareToken` business rules

**Backward Compatibility**:
- The abstraction layer wraps the existing `CatalogueService` which already manages these entities
- No breaking changes to existing data structures
- Storage provider interface preserves all current capabilities

---

## Summary

The storage abstraction layer manages three core entities:

1. **CatalogueList**: User-created collections of academic entities
2. **CatalogueEntity**: Links between entities and lists
3. **CatalogueShareRecord**: Metadata for public sharing

These entities are accessed through a unified `StorageProvider` interface that supports two implementations:

- **IndexedDB (Production)**: Persists data in browser using Dexie
- **In-Memory (Testing)**: Fast, isolated storage using JavaScript Maps

All entities include proper validation, referential integrity, and cascade deletion rules to maintain data consistency across storage backends.
