# Data Model: Edge Direction Correction for OpenAlex Data Model

**Feature**: 014-edge-direction-correction
**Date**: 2025-11-17
**Purpose**: Define data structures and relationships for corrected graph edge directions

## Entity Definitions

### GraphEdge

**Purpose**: Represents a directed relationship between two nodes in the academic graph

**Fields**:

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| `id` | `string` | Yes | Unique edge identifier (format: `{source}-{target}-{type}`) | Must be unique across graph |
| `source` | `string` | Yes | OpenAlex ID of entity that owns the relationship data | Must be valid OpenAlex entity ID (matches pattern: `/^[WASIFTPC]\d+$/`) |
| `target` | `string` | Yes | OpenAlex ID of referenced entity | Must be valid OpenAlex entity ID |
| `type` | `RelationType` | Yes | Relationship type enum value | Must be valid RelationType enum member |
| `direction` | `'outbound' \| 'inbound'` | Yes | Classification of edge data ownership | `outbound` = stored on source entity, `inbound` = discovered via reverse lookup |
| `label` | `string` | Yes | Human-readable relationship description | Non-empty string, max 100 characters |
| `metadata` | `Record<string, unknown>` | No | OpenAlex relationship-specific data | Structure varies by RelationType (see Metadata Schemas below) |

**Relationships**:
- `source` → References a GraphNode entity (Work, Author, Source, Institution, Publisher, Funder, Topic)
- `target` → References a GraphNode entity

**State Transitions**:
- Creation: Edge created when relationship detected from entity data
- Update: Metadata may be updated if entity data refreshes
- Deletion: Edge removed if source node removed from graph

**Constraints**:
- No self-loops: `source !== target`
- No duplicate edges: Only one edge per `(source, target, type)` tuple
- Direction consistency: Outbound edges must have source entity containing the relationship field in OpenAlex data

---

### RelationType (Enum)

**Purpose**: Defines all relationship types aligned with OpenAlex data model field names

**Values**:

| Enum Value | Source Entity Type | Target Entity Type | OpenAlex Field | Description |
|------------|-------------------|-------------------|----------------|-------------|
| `AUTHORSHIP` | Work | Author | `authorships[]` | Work authored by Author |
| `REFERENCE` | Work | Work | `referenced_works[]` | Work references another Work |
| `PUBLICATION` | Work | Source | `primary_location.source` | Work published in Source |
| `TOPIC` | Work | Topic | `topics[]` | Work tagged with Topic |
| `AFFILIATION` | Author | Institution | `affiliations[]` | Author affiliated with Institution |
| `HOST_ORGANIZATION` | Source | Publisher | `host_organization` | Source hosted by Publisher |
| `LINEAGE` | Institution | Institution | `lineage[]` | Institution child of parent Institution |

**Naming Convention**: Noun form matching OpenAlex field names (e.g., `authorships` → `AUTHORSHIP`)

**Directionality**: All enum values are neutral nouns; direction determined by edge's `source`/`target` fields

---

## Metadata Schemas

### AUTHORSHIP Metadata

**Source**: OpenAlex `Work.authorships[]` array items

```typescript
interface AuthorshipMetadata {
  author_position: 'first' | 'middle' | 'last';
  is_corresponding: boolean;
  raw_author_name?: string;
  raw_affiliation_strings?: string[];
  institutions?: Array<{
    id: string;
    display_name: string;
    ror?: string;
    country_code?: string;
    type?: string;
  }>;
}
```

**Validation**:
- `author_position` must be one of the three literal values
- `is_corresponding` must be boolean
- `institutions` array may be empty but not null if present

---

### REFERENCE Metadata

**Source**: OpenAlex `Work.referenced_works[]` array (minimal metadata available)

```typescript
interface ReferenceMetadata {
  // OpenAlex provides only IDs in referenced_works array
  // No additional metadata available
}
```

**Note**: Empty object or undefined; reference relationships contain no metadata beyond source/target

---

### PUBLICATION Metadata

**Source**: OpenAlex `Work.primary_location` object

```typescript
interface PublicationMetadata {
  is_oa: boolean;
  landing_page_url?: string;
  pdf_url?: string;
  version?: 'publishedVersion' | 'acceptedVersion' | 'submittedVersion' | null;
  license?: string;
}
```

**Validation**:
- `is_oa` must be boolean
- URLs must be valid HTTP(S) URLs if present

---

### TOPIC Metadata

**Source**: OpenAlex `Work.topics[]` array items

```typescript
interface TopicMetadata {
  score: number;
  subfield?: {
    id: string;
    display_name: string;
  };
  field?: {
    id: string;
    display_name: string;
  };
  domain?: {
    id: string;
    display_name: string;
  };
}
```

**Validation**:
- `score` must be number between 0 and 1
- Subfield/field/domain are optional hierarchical classifications

---

### AFFILIATION Metadata

**Source**: OpenAlex `Author.affiliations[]` array items (from last known position)

```typescript
interface AffiliationMetadata {
  years?: number[];
  institution?: {
    id: string;
    display_name: string;
    ror?: string;
    country_code?: string;
    type?: string;
    lineage?: string[];
  };
}
```

**Validation**:
- `years` array contains integer years (e.g., [2020, 2021, 2022])
- Years should be <= current year

---

### HOST_ORGANIZATION Metadata

**Source**: OpenAlex `Source.host_organization` object

```typescript
interface HostOrganizationMetadata {
  lineage?: string[];
}
```

**Validation**:
- `lineage` is array of OpenAlex Publisher IDs representing organizational hierarchy

---

### LINEAGE Metadata

**Source**: OpenAlex `Institution.lineage[]` array

```typescript
interface LineageMetadata {
  // OpenAlex provides only IDs in lineage array
  // Parent-child relationship implicit in edge direction
}
```

**Note**: Empty object or undefined; lineage relationships contain no metadata beyond hierarchy

---

## Direction Classification Logic

### Outbound Edges

**Definition**: Relationship data stored directly on the source entity in OpenAlex

**Characteristics**:
- Complete data: All relationships of this type for the source entity are present
- Immediate availability: Data retrieved with entity fetch
- Examples:
  - Work → Author (from `work.authorships[]`)
  - Work → Work (from `work.referenced_works[]`)
  - Work → Source (from `work.primary_location.source`)
  - Author → Institution (from `author.affiliations[]`)

**Detection Rule**: If OpenAlex entity data for `source` contains a field that lists `target`, edge is outbound

---

### Inbound Edges

**Definition**: Relationship discovered by querying other entities that reference the target

**Characteristics**:
- Potentially incomplete: Only includes entities currently loaded in the graph
- Requires discovery: Must query OpenAlex API or traverse graph to find
- Examples:
  - Work ← Work (citing works found by querying `filter=cites:W123`)
  - Author ← Work (works by author found by querying `filter=author.id:A123`)
  - Source ← Work (works in source found by querying `filter=primary_location.source.id:S123`)

**Detection Rule**: If relationship exists but is NOT stored in source entity's OpenAlex data, edge is inbound

---

## Migration Strategy (NOT IMPLEMENTED - Development-Stage Pragmatism)

**Per Constitution Principle VII** and clarification from 2025-11-17 session:
- **NO graph versioning**: No `graphVersion` field added to metadata
- **NO backwards compatibility**: Existing graphs not preserved
- **NO migration logic**: No edge direction reversal for old graphs

**Approach**: Re-detect relationships from stored entity data when graph is loaded

**Implementation**:
1. When loading graph from storage, detect if edges exist
2. If edges present, discard existing edge data
3. Re-run relationship detection service on all stored entities
4. Generate new edges with correct directions and metadata
5. Save updated graph

**Performance Target**: Re-detection must complete in <2 seconds for typical graphs (<100 entities)

---

## Validation Rules Summary

### Edge Creation Validation

1. **Source/Target Validation**:
   - Both must be valid OpenAlex IDs
   - Both entities must exist in graph (or be added)
   - Source and target must not be identical (no self-loops)

2. **Type Validation**:
   - Type must be valid RelationType enum value
   - Type must match allowed source/target entity type combinations

3. **Direction Validation**:
   - Direction must be 'outbound' or 'inbound'
   - Outbound edges must have source entity containing corresponding OpenAlex field
   - Inbound edges must NOT have source entity containing the relationship

4. **Metadata Validation**:
   - Metadata structure must match type-specific schema
   - All required metadata fields must be present
   - Field types must match schema definitions

### Graph Invariants

1. **Uniqueness**: Only one edge per `(source, target, type)` tuple
2. **Referential Integrity**: All edge endpoints must reference existing nodes
3. **Direction Consistency**: Edge direction must accurately reflect OpenAlex data ownership
4. **Type Consistency**: Edge type must match entity type constraints (e.g., AUTHORSHIP only between Work and Author)

---

## Storage Representation

**Per Constitution Principle IV**: Storage abstraction layer handles persistence

**Storage Schema** (IndexedDB via Dexie):

```typescript
// Graph store schema
interface GraphStore {
  graphs: {
    id: string;              // Graph identifier
    title: string;
    nodes: GraphNode[];
    edges: GraphEdge[];      // Array of edges as defined above
    createdAt: Date;
    updatedAt: Date;
  }
}

// Edge stored as part of graph document
interface StoredEdge {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  direction: 'outbound' | 'inbound';
  label: string;
  metadata?: Record<string, unknown>;
}
```

**Indexing**:
- Primary key: `edge.id`
- Secondary indexes:
  - `source` (for finding all edges from a node)
  - `target` (for finding all edges to a node)
  - `type` (for filtering by relationship type)
  - `direction` (for filtering by outbound/inbound)

---

## Type Definitions (TypeScript)

**Location**: `packages/graph/src/edge-model.ts`

```typescript
export type RelationType =
  | 'AUTHORSHIP'
  | 'REFERENCE'
  | 'PUBLICATION'
  | 'TOPIC'
  | 'AFFILIATION'
  | 'HOST_ORGANIZATION'
  | 'LINEAGE';

export type EdgeDirection = 'outbound' | 'inbound';

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  direction: EdgeDirection;
  label: string;
  metadata?: Record<string, unknown>;
}

// Type-specific metadata interfaces
export interface AuthorshipMetadata {
  author_position: 'first' | 'middle' | 'last';
  is_corresponding: boolean;
  raw_author_name?: string;
  raw_affiliation_strings?: string[];
  institutions?: Array<{
    id: string;
    display_name: string;
    ror?: string;
    country_code?: string;
    type?: string;
  }>;
}

export interface PublicationMetadata {
  is_oa: boolean;
  landing_page_url?: string;
  pdf_url?: string;
  version?: 'publishedVersion' | 'acceptedVersion' | 'submittedVersion' | null;
  license?: string;
}

export interface TopicMetadata {
  score: number;
  subfield?: {
    id: string;
    display_name: string;
  };
  field?: {
    id: string;
    display_name: string;
  };
  domain?: {
    id: string;
    display_name: string;
  };
}

export interface AffiliationMetadata {
  years?: number[];
  institution?: {
    id: string;
    display_name: string;
    ror?: string;
    country_code?: string;
    type?: string;
    lineage?: string[];
  };
}

export interface HostOrganizationMetadata {
  lineage?: string[];
}

// Union type for all metadata
export type EdgeMetadata =
  | AuthorshipMetadata
  | PublicationMetadata
  | TopicMetadata
  | AffiliationMetadata
  | HostOrganizationMetadata
  | Record<string, never>; // Empty object for types with no metadata
```

---

## References

- OpenAlex API Documentation: https://docs.openalex.org/
- Entity schemas: https://docs.openalex.org/api-entities/works, authors, sources, institutions
- Constitution: `.specify/memory/constitution.md` (Principle VII: Development-Stage Pragmatism)
- Spec: `specs/014-edge-direction-correction/spec.md`
- Research: `specs/014-edge-direction-correction/research.md`
