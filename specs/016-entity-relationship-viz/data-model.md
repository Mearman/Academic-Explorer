# Data Model: Entity Relationship Visualization

**Feature**: Entity Relationship Visualization
**Branch**: `016-entity-relationship-viz`
**Date**: 2025-11-18
**Phase**: Phase 1 - Data Model Design

---

## Overview

This document defines the data structures, types, and relationships for the entity relationship visualization feature. All types are strict TypeScript with no `any` types (Constitution Principle I).

---

## Core Types

### EntityRelationshipView

Represents the complete visualization of incoming/outgoing relationships for a specific entity.

```typescript
/**
 * Complete relationship visualization for an entity detail page
 */
interface EntityRelationshipView {
  /** The entity whose relationships are being displayed */
  entityId: string;

  /** Entity type (e.g., 'works', 'authors', 'institutions') */
  entityType: EntityType;

  /** Incoming relationship sections (other entities → this entity) */
  incomingSections: RelationshipSection[];

  /** Outgoing relationship sections (this entity → other entities) */
  outgoingSections: RelationshipSection[];

  /** Total counts across all relationship types */
  summary: RelationshipSummary;

  /** Current filter state */
  filter: RelationshipFilter;

  /** Loading state */
  loading: boolean;

  /** Error state (if any) */
  error?: RelationshipError;
}
```

---

### RelationshipSection

A grouped display of relationships of a single type (e.g., all AUTHORSHIP relationships).

```typescript
/**
 * Grouped display of a single relationship type
 */
interface RelationshipSection {
  /** Unique identifier for this section */
  id: string;

  /** Relationship type (AUTHORSHIP, REFERENCE, etc.) */
  type: RelationType;

  /** Direction of relationships in this section */
  direction: EdgeDirectionFilter; // 'outbound' | 'inbound'

  /** Display label (e.g., "Authors", "Citations", "Affiliations") */
  label: string;

  /** Icon identifier for UI rendering */
  icon?: string;

  /** All relationship items in this section */
  items: RelationshipItem[];

  /** Currently visible items (after pagination) */
  visibleItems: RelationshipItem[];

  /** Total count of relationships */
  totalCount: number;

  /** Number of currently visible items */
  visibleCount: number;

  /** Whether more items are available to load */
  hasMore: boolean;

  /** Pagination state */
  pagination: PaginationState;
}
```

---

### RelationshipItem

A single relationship connection between two entities.

```typescript
/**
 * Individual relationship connection
 */
interface RelationshipItem {
  /** Unique identifier for this relationship */
  id: string;

  /** Source entity ID (data owner in OpenAlex model) */
  sourceId: string;

  /** Target entity ID (referenced entity) */
  targetId: string;

  /** Source entity type */
  sourceType: EntityType;

  /** Target entity type */
  targetType: EntityType;

  /** Relationship type */
  type: RelationType;

  /** Direction from perspective of viewed entity */
  direction: 'outbound' | 'inbound';

  /** Display name of the related entity */
  displayName: string;

  /** Optional subtitle (e.g., author affiliation, publication year) */
  subtitle?: string;

  /** Optional metadata (authorship position, citation context, etc.) */
  metadata?: RelationshipMetadata;

  /** Whether this is a self-referencing relationship */
  isSelfReference: boolean;
}
```

---

### RelationshipMetadata

Optional contextual information for a relationship.

```typescript
/**
 * Optional relationship metadata
 */
type RelationshipMetadata =
  | AuthorshipMetadata
  | CitationMetadata
  | AffiliationMetadata
  | FundingMetadata
  | LineageMetadata;

/**
 * Authorship-specific metadata
 */
interface AuthorshipMetadata {
  type: 'authorship';
  /** Author position in author list (1-indexed) */
  position?: number;
  /** Whether author is corresponding author */
  isCorresponding?: boolean;
  /** Author's affiliation at time of publication */
  affiliations?: string[];
}

/**
 * Citation-specific metadata
 */
interface CitationMetadata {
  type: 'citation';
  /** Publication year of citing work */
  year?: number;
  /** Citation context snippet */
  context?: string;
}

/**
 * Affiliation-specific metadata
 */
interface AffiliationMetadata {
  type: 'affiliation';
  /** Affiliation start date */
  startDate?: string;
  /** Affiliation end date (if applicable) */
  endDate?: string;
  /** Whether this is the primary affiliation */
  isPrimary?: boolean;
}

/**
 * Funding-specific metadata
 */
interface FundingMetadata {
  type: 'funding';
  /** Grant/award number */
  awardId?: string;
  /** Grant amount (if available) */
  amount?: number;
  /** Currency */
  currency?: string;
}

/**
 * Lineage-specific metadata (institutional hierarchy)
 */
interface LineageMetadata {
  type: 'lineage';
  /** Hierarchy level (e.g., 1 = direct parent, 2 = grandparent) */
  level?: number;
}
```

---

### RelationshipFilter

User-selected filter state.

```typescript
/**
 * Relationship filter configuration
 */
interface RelationshipFilter {
  /** Direction filter: show outbound, inbound, or both */
  direction: EdgeDirectionFilter; // 'outbound' | 'inbound' | 'both'

  /** Relationship types to display (empty = show all) */
  types: RelationType[];

  /** Whether to show self-referencing relationships */
  showSelfReferences: boolean;
}

/**
 * Direction filter options
 */
type EdgeDirectionFilter = 'outbound' | 'inbound' | 'both';
```

---

### RelationshipSummary

Aggregate counts across all relationship types.

```typescript
/**
 * Summary statistics for relationships
 */
interface RelationshipSummary {
  /** Total incoming relationships (all types) */
  incomingCount: number;

  /** Total outgoing relationships (all types) */
  outgoingCount: number;

  /** Total relationships (incoming + outgoing) */
  totalCount: number;

  /** Breakdown by relationship type */
  byType: Record<RelationType, RelationshipTypeSummary>;
}

/**
 * Per-type relationship counts
 */
interface RelationshipTypeSummary {
  /** Relationship type */
  type: RelationType;

  /** Incoming count for this type */
  incomingCount: number;

  /** Outgoing count for this type */
  outgoingCount: number;

  /** Total for this type */
  totalCount: number;
}
```

---

### PaginationState

Pagination controls for relationship lists.

```typescript
/**
 * Pagination state for relationship sections
 */
interface PaginationState {
  /** Items per page (default: 50) */
  pageSize: number;

  /** Current page (0-indexed) */
  currentPage: number;

  /** Total number of pages */
  totalPages: number;

  /** Whether there's a next page */
  hasNextPage: boolean;

  /** Whether there's a previous page */
  hasPreviousPage: boolean;
}
```

---

### RelationshipError

Error state for relationship loading failures.

```typescript
/**
 * Relationship loading error
 */
interface RelationshipError {
  /** Error message */
  message: string;

  /** Error code */
  code: RelationshipErrorCode;

  /** Whether the error is retryable */
  retryable: boolean;

  /** Timestamp of error */
  timestamp: Date;
}

/**
 * Relationship error codes
 */
enum RelationshipErrorCode {
  /** Failed to load graph data */
  GRAPH_LOAD_FAILED = 'GRAPH_LOAD_FAILED',

  /** Invalid entity ID */
  INVALID_ENTITY_ID = 'INVALID_ENTITY_ID',

  /** No relationship data available */
  NO_DATA_AVAILABLE = 'NO_DATA_AVAILABLE',

  /** Network error */
  NETWORK_ERROR = 'NETWORK_ERROR',

  /** Unknown error */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
```

---

## Existing Types (Reused)

### GraphEdge (from `packages/graph/src/types/core.ts`)

```typescript
/**
 * EXISTING TYPE - No modifications required
 * Graph edge with direction metadata
 */
interface GraphEdge {
  /** Unique edge identifier */
  id: string;

  /** Source entity ID (data owner) */
  source: string;

  /** Target entity ID (referenced entity) */
  target: string;

  /** Relationship type */
  type: RelationType;

  /** Direction metadata: how edge was discovered */
  direction?: 'outbound' | 'inbound';

  /** Optional edge weight */
  weight?: number;

  /** Optional metadata */
  metadata?: unknown;
}
```

### RelationType (from `packages/graph/src/types/core.ts`)

```typescript
/**
 * EXISTING ENUM - No modifications required
 * All supported relationship types
 */
enum RelationType {
  AUTHORSHIP = 'authorship',
  REFERENCE = 'reference',
  AFFILIATION = 'affiliation',
  FUNDED_BY = 'funded_by',
  LINEAGE = 'lineage',
  HOST_ORGANIZATION = 'host_organization',
  PUBLISHER_CHILD_OF = 'publisher_child_of',
  WORK_HAS_KEYWORD = 'work_has_keyword',
  AUTHOR_RESEARCHES = 'author_researches',
  TOPIC_PART_OF_FIELD = 'topic_part_of_field',
  FIELD_PART_OF_DOMAIN = 'field_part_of_domain',
}
```

### EntityType (from `packages/types/src/entity.ts`)

```typescript
/**
 * EXISTING TYPE - No modifications required
 * OpenAlex entity types
 */
type EntityType =
  | 'works'
  | 'authors'
  | 'institutions'
  | 'sources'
  | 'publishers'
  | 'funders'
  | 'topics'
  | 'keywords'
  | 'concepts';
```

---

## State Transitions

### EntityRelationshipView State Machine

```
[Initial] → [Loading] → [Loaded] → [Filtering] → [Filtered]
                ↓
             [Error] → [Retry] → [Loading]
```

**States**:
- **Initial**: Component mounted, no data fetched yet
- **Loading**: Fetching graph data and computing relationships (`loading: true`)
- **Loaded**: Data fetched successfully, relationships displayed (`loading: false, error: undefined`)
- **Filtering**: User changed filter settings, recomputing visible relationships
- **Filtered**: Filter applied, relationships re-rendered
- **Error**: Failed to load relationships (`error: RelationshipError`)
- **Retry**: User clicked retry button, transitions back to Loading

### PaginationState Transitions

```
[Page 1] → [Load More] → [Page 2] → [Load More] → [Page 3] → ...
```

**Transitions**:
- **Load More**: User clicks "Load more" button, increments `currentPage`, appends next page items to `visibleItems`
- **Reset**: User changes filter, resets to Page 1

---

## Validation Rules

### RelationshipSection

```typescript
/**
 * Validation rules for RelationshipSection
 */
const validateRelationshipSection = (section: RelationshipSection): boolean => {
  // Total count must match items array length
  assert(section.totalCount === section.items.length);

  // Visible count must not exceed total count
  assert(section.visibleCount <= section.totalCount);

  // Visible items array must match visible count
  assert(section.visibleItems.length === section.visibleCount);

  // hasMore must be true if visibleCount < totalCount
  assert(section.hasMore === (section.visibleCount < section.totalCount));

  // All items must have matching direction
  assert(section.items.every(item => item.direction === section.direction));

  // All items must have matching relationship type
  assert(section.items.every(item => item.type === section.type));

  return true;
};
```

### RelationshipSummary

```typescript
/**
 * Validation rules for RelationshipSummary
 */
const validateRelationshipSummary = (summary: RelationshipSummary): boolean => {
  // Total count must equal incoming + outgoing
  assert(summary.totalCount === summary.incomingCount + summary.outgoingCount);

  // Sum of per-type totals must equal overall total
  const typeSum = Object.values(summary.byType).reduce(
    (sum, typeSummary) => sum + typeSummary.totalCount,
    0
  );
  assert(summary.totalCount === typeSum);

  // Each type summary must have valid counts
  Object.values(summary.byType).forEach(typeSummary => {
    assert(typeSummary.totalCount === typeSummary.incomingCount + typeSummary.outgoingCount);
  });

  return true;
};
```

---

## Data Flow

### Relationship Data Pipeline

```
GraphEdge[] (from graph store)
  ↓
  Filter by entity ID (source or target matches current entity)
  ↓
  Classify by direction (outbound: source = entity, inbound: target = entity)
  ↓
  Group by RelationType
  ↓
  Apply RelationshipFilter (direction, types, showSelfReferences)
  ↓
  Paginate (50 items per page)
  ↓
  Transform to RelationshipItem[]
  ↓
  Render in RelationshipSection components
```

### Filter Application Flow

```
User changes filter
  ↓
  Update RelationshipFilter state
  ↓
  Re-run filterByDirection() (memoized)
  ↓
  Re-group by type
  ↓
  Reset pagination to page 1
  ↓
  Re-render visible items
```

---

## Constants

### Default Values

```typescript
/**
 * Default pagination page size
 */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * Default relationship filter
 */
export const DEFAULT_RELATIONSHIP_FILTER: RelationshipFilter = {
  direction: 'both',
  types: [], // Empty = show all types
  showSelfReferences: true,
};

/**
 * Maximum relationships to load before warning user
 */
export const MAX_RELATIONSHIPS_WARNING_THRESHOLD = 1000;
```

### Relationship Type Labels

```typescript
/**
 * Display labels for relationship types
 */
export const RELATIONSHIP_TYPE_LABELS: Record<RelationType, string> = {
  [RelationType.AUTHORSHIP]: 'Authors',
  [RelationType.REFERENCE]: 'Citations',
  [RelationType.AFFILIATION]: 'Affiliations',
  [RelationType.FUNDED_BY]: 'Funders',
  [RelationType.LINEAGE]: 'Parent Institutions',
  [RelationType.HOST_ORGANIZATION]: 'Publishers',
  [RelationType.PUBLISHER_CHILD_OF]: 'Parent Publishers',
  [RelationType.WORK_HAS_KEYWORD]: 'Keywords',
  [RelationType.AUTHOR_RESEARCHES]: 'Research Topics',
  [RelationType.TOPIC_PART_OF_FIELD]: 'Fields',
  [RelationType.FIELD_PART_OF_DOMAIN]: 'Domains',
};
```

---

## Type Guards

```typescript
/**
 * Type guard for RelationshipItem
 */
export function isRelationshipItem(value: unknown): value is RelationshipItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;

  return (
    typeof item.id === 'string' &&
    typeof item.sourceId === 'string' &&
    typeof item.targetId === 'string' &&
    typeof item.type === 'string' &&
    (item.direction === 'outbound' || item.direction === 'inbound') &&
    typeof item.displayName === 'string'
  );
}

/**
 * Type guard for RelationshipSection
 */
export function isRelationshipSection(value: unknown): value is RelationshipSection {
  if (typeof value !== 'object' || value === null) return false;
  const section = value as Record<string, unknown>;

  return (
    typeof section.id === 'string' &&
    typeof section.type === 'string' &&
    (section.direction === 'outbound' || section.direction === 'inbound' || section.direction === 'both') &&
    Array.isArray(section.items) &&
    section.items.every(isRelationshipItem)
  );
}
```

---

## Index

**Core Types**:
- EntityRelationshipView - Main container for relationship visualization
- RelationshipSection - Grouped display of single relationship type
- RelationshipItem - Individual relationship connection
- RelationshipMetadata - Optional contextual information
- RelationshipFilter - User filter configuration
- RelationshipSummary - Aggregate statistics
- PaginationState - Pagination controls
- RelationshipError - Error state

**Existing Types** (Reused):
- GraphEdge - From packages/graph
- RelationType - From packages/graph
- EntityType - From packages/types

**Validation**: Type guards and validation functions ensure data integrity

**No `any` types**: All types are strictly defined per Constitution Principle I

---

**Data Model Complete**: 2025-11-18
**Status**: All types defined; ready for implementation
