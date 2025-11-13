# Data Model: History Catalogue Tracking

**Feature**: 012-history-catalogue-tracking
**Date**: 2025-11-13
**Status**: Completed

## Purpose

This document defines all data structures, validation rules, and relationships for the history tracking feature. All types are TypeScript interfaces/types with strict typing.

## Core Entities

### HistoryEntry

The HistoryEntry type represents a single visited item in the user's research journey. It uses a discriminated union to distinguish between entities, lists, and views.

```typescript
/**
 * Discriminated union for history entries.
 * Each variant has a 'type' discriminator for runtime type checking.
 */
type HistoryEntry =
  | EntityHistoryEntry
  | ListHistoryEntry
  | ViewHistoryEntry;

/**
 * History entry for OpenAlex entities (works, authors, etc.)
 */
interface EntityHistoryEntry {
  type: 'entity';
  entityType: EntityType;
  id: string;           // OpenAlex ID (e.g., "W2741809807")
  title: string;        // Display name (e.g., work title, author name)
  timestamp: number;    // Unix timestamp (milliseconds)
  url: string;          // Full navigation URL
}

/**
 * History entry for catalogue lists
 */
interface ListHistoryEntry {
  type: 'list';
  id: string;           // Catalogue list ID
  title: string;        // List title
  timestamp: number;    // Unix timestamp (milliseconds)
  url: string;          // Full navigation URL
}

/**
 * History entry for saved query views
 */
interface ViewHistoryEntry {
  type: 'view';
  id: string;           // View ID
  title: string;        // View title/description
  timestamp: number;    // Unix timestamp (milliseconds)
  url: string;          // Full navigation URL including query parameters
}

/**
 * OpenAlex entity types
 */
type EntityType =
  | 'work'
  | 'author'
  | 'source'
  | 'institution'
  | 'publisher'
  | 'funder'
  | 'topic';
```

### HistoryTimeGroup

Enum for grouping history entries by relative time periods.

```typescript
/**
 * Time-based grouping for history entries
 */
enum HistoryTimeGroup {
  Today = 'Today',
  Yesterday = 'Yesterday',
  Last7Days = 'Last 7 Days',
  Last30Days = 'Last 30 Days',
  Older = 'Older'
}

/**
 * Grouped history entries for UI rendering
 */
interface GroupedHistoryEntries {
  group: HistoryTimeGroup;
  entries: HistoryEntry[];
}
```

## Validation Rules

### HistoryEntry Validation

All history entries must satisfy these constraints:

1. **ID Validation**
   - **Entity IDs**: Must match OpenAlex ID pattern (e.g., `W\d+`, `A\d+`, etc.)
   - **List IDs**: Must be valid UUID or catalogue-generated ID
   - **View IDs**: Must be valid UUID or view identifier
   - Constraint: `id.length > 0`

2. **Title Validation**
   - Required: Cannot be empty string
   - Constraint: `title.length > 0`
   - Max length: 500 characters (UI truncation beyond this)

3. **Timestamp Validation**
   - Must be valid Unix timestamp in milliseconds
   - Constraint: `timestamp > 0`
   - Constraint: `timestamp <= Date.now()` (cannot be future timestamp)

4. **URL Validation**
   - Must be valid URL string
   - Must start with `/` (relative URL) or `http://`/`https://` (absolute URL)
   - Constraint: Valid URL format

5. **Entity Type Validation**
   - Must be one of the defined EntityType values
   - Validated through TypeScript literal types at compile time
   - Runtime validation through type guards

### Deduplication Rules

History entries are deduplicated based on ID:

1. **Uniqueness**: Only one entry per unique `id` across all types
2. **Update Rule**: If entry with same `id` exists, update timestamp to most recent
3. **Ordering**: Entries sorted by timestamp descending (most recent first)
4. **Cross-Type**: Entity, list, and view with same ID are considered different (unlikely in practice)

Example deduplication:
```typescript
// User visits work W123 three times
Visit 1: { type: 'entity', entityType: 'work', id: 'W123', timestamp: 1000 }
Visit 2: { type: 'entity', entityType: 'work', id: 'W123', timestamp: 2000 }
Visit 3: { type: 'entity', entityType: 'work', id: 'W123', timestamp: 3000 }

// Result: Single entry with latest timestamp
Result: { type: 'entity', entityType: 'work', id: 'W123', timestamp: 3000 }
```

## Storage Schema

### Catalogue List Item Schema

History entries are stored as items in the special `history` catalogue list. Each item has metadata fields:

```typescript
/**
 * Storage representation in catalogue system
 */
interface CatalogueHistoryItem {
  listId: 'history';          // Special system list ID
  itemId: string;             // Generated item ID (UUID)
  metadata: {
    historyEntryType: 'entity' | 'list' | 'view';
    entityType?: EntityType;  // Present only for entity entries
    targetId: string;         // ID of the visited resource
    title: string;
    timestamp: number;
    url: string;
  };
}
```

### Index Strategy

For optimal query performance, the following indices are needed:

1. **Primary Index**: `itemId` (auto-indexed by catalogue system)
2. **Timestamp Index**: Index on `metadata.timestamp` for chronological sorting
3. **Target ID Index**: Index on `metadata.targetId` for deduplication lookups

## Relationships

### History Entry → Catalogue System

```
HistoryEntry (1) ----stored as----> (1) CatalogueListItem
                                         (in 'history' system list)
```

- One-to-one relationship between HistoryEntry and CatalogueListItem
- History entries do not reference other catalogue items directly
- Related entities/lists are referenced by ID only

### History Entry → OpenAlex Entities

```
EntityHistoryEntry (1) ----references----> (1) OpenAlexEntity
                                                (Work, Author, etc.)
```

- History entry stores ID and title as denormalized data
- No foreign key constraint (OpenAlex entities may change or be removed)
- Title snapshot at time of visit (does not update if entity title changes)

### History Entry → User Navigation

```
UserNavigation (1) ----creates/updates----> (1) HistoryEntry
```

- Each navigation event creates or updates a history entry
- Automatic tracking through TanStack Router hooks
- No manual user action required

## State Transitions

### History Entry Lifecycle

```
[Navigation Event]
       |
       v
[Check if Entry Exists]
       |
       +---> [Exists] ---> [Update Timestamp] ---> [Move to Top]
       |
       +---> [Not Exists] ---> [Create Entry] ---> [Add to History]

[User Action: Remove Entry]
       |
       v
[Delete Entry from Storage]

[User Action: Clear History]
       |
       v
[Delete All Entries from History List]
```

### Storage Operations

```typescript
/**
 * Core history storage operations
 */
interface HistoryStorageOperations {
  /**
   * Add or update history entry (upsert pattern)
   * If entry with same targetId exists, updates timestamp.
   * If not exists, creates new entry.
   */
  addToHistory(entry: Omit<HistoryEntry, 'timestamp'>): Promise<void>;

  /**
   * Get all history entries sorted by timestamp descending
   */
  getHistory(): Promise<HistoryEntry[]>;

  /**
   * Get paginated history entries
   */
  getHistoryPaginated(offset: number, limit: number): Promise<HistoryEntry[]>;

  /**
   * Remove specific history entry by target ID
   */
  removeHistoryEntry(targetId: string): Promise<void>;

  /**
   * Clear all history entries
   */
  clearHistory(): Promise<void>;

  /**
   * Get history entries filtered by type
   */
  getHistoryByType(type: 'entity' | 'list' | 'view'): Promise<HistoryEntry[]>;

  /**
   * Get history entries within time range
   */
  getHistoryByTimeRange(start: number, end: number): Promise<HistoryEntry[]>;
}
```

## Type Guards

Type guards enable runtime discrimination of history entry variants:

```typescript
/**
 * Type guard for entity history entries
 */
function isEntityHistoryEntry(
  entry: HistoryEntry
): entry is EntityHistoryEntry {
  return entry.type === 'entity';
}

/**
 * Type guard for list history entries
 */
function isListHistoryEntry(
  entry: HistoryEntry
): entry is ListHistoryEntry {
  return entry.type === 'list';
}

/**
 * Type guard for view history entries
 */
function isViewHistoryEntry(
  entry: HistoryEntry
): entry is ViewHistoryEntry {
  return entry.type === 'view';
}

/**
 * Type guard for entity types
 */
function isEntityType(value: string): value is EntityType {
  return [
    'work',
    'author',
    'source',
    'institution',
    'publisher',
    'funder',
    'topic'
  ].includes(value);
}
```

## UI Data Transformations

### Grouping by Time Period

```typescript
/**
 * Group history entries by relative time periods
 */
function groupHistoryByTime(entries: HistoryEntry[]): GroupedHistoryEntries[] {
  const groups = new Map<HistoryTimeGroup, HistoryEntry[]>();

  for (const entry of entries) {
    const group = getTimeGroup(entry.timestamp);
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push(entry);
  }

  // Return in chronological order
  const orderedGroups: HistoryTimeGroup[] = [
    HistoryTimeGroup.Today,
    HistoryTimeGroup.Yesterday,
    HistoryTimeGroup.Last7Days,
    HistoryTimeGroup.Last30Days,
    HistoryTimeGroup.Older
  ];

  return orderedGroups
    .filter(group => groups.has(group))
    .map(group => ({
      group,
      entries: groups.get(group)!
    }));
}

/**
 * Determine time group for a given timestamp
 */
function getTimeGroup(timestamp: number): HistoryTimeGroup {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const age = now - timestamp;

  if (age < dayMs) return HistoryTimeGroup.Today;
  if (age < 2 * dayMs) return HistoryTimeGroup.Yesterday;
  if (age < 7 * dayMs) return HistoryTimeGroup.Last7Days;
  if (age < 30 * dayMs) return HistoryTimeGroup.Last30Days;
  return HistoryTimeGroup.Older;
}
```

### Icon Mapping

```typescript
/**
 * Map history entry types to Mantine icon components
 */
function getHistoryEntryIcon(entry: HistoryEntry): string {
  if (isEntityHistoryEntry(entry)) {
    switch (entry.entityType) {
      case 'work': return 'IconBook';
      case 'author': return 'IconUser';
      case 'source': return 'IconBookmark';
      case 'institution': return 'IconBuilding';
      case 'publisher': return 'IconBuildingStore';
      case 'funder': return 'IconCoin';
      case 'topic': return 'IconTag';
    }
  }
  if (isListHistoryEntry(entry)) {
    return 'IconList';
  }
  if (isViewHistoryEntry(entry)) {
    return 'IconEye';
  }
  return 'IconQuestionMark';
}
```

## Constraints Summary

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| type | Literal | Yes | Must be 'entity', 'list', or 'view' |
| entityType | Literal | Conditional | Required for entity entries; must be valid EntityType |
| id | string | Yes | Non-empty; format depends on type |
| title | string | Yes | Non-empty; max 500 characters |
| timestamp | number | Yes | Positive integer; not in future |
| url | string | Yes | Valid URL format |

## Notes

- All timestamps are Unix timestamps in milliseconds (compatible with JavaScript Date.now())
- IDs are stable across sessions (no session-specific IDs)
- Titles are snapshots at visit time (do not update if source entity changes)
- URLs are full navigation paths including hash routes (e.g., `/#/works/W123`)
- History entries have no explicit version field (tracked via timestamp)
- No soft-delete (removed entries are permanently deleted)
