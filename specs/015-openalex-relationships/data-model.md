# Data Model: OpenAlex Relationship Implementation

**Feature**: 015-openalex-relationships
**Created**: 2025-11-18
**Status**: Draft

## Overview

This document defines the data structures, relationships, and validation rules for implementing complete OpenAlex relationship support in Academic Explorer. The model ensures type-safe, bidirectionally consistent graph edges that accurately represent academic network connections.

## Core Data Structures

### GraphEdge

The fundamental relationship entity connecting two graph nodes.

```typescript
interface GraphEdge {
  // Unique identifier for edge (format: {sourceId}-{relationship}-{targetId})
  id: string

  // Source entity (data owner - entity that contains the relationship array)
  source: string

  // Target entity (referenced entity)
  target: string

  // Relationship type from RelationType enum
  type: RelationType

  // Direction metadata for bidirectional consistency
  // - outbound: Edge created from entity that owns the relationship data
  // - inbound: Edge discovered via reverse lookup from target entity
  direction?: EdgeDirection

  // Optional human-readable label
  label?: string

  // Optional weight for graph algorithms
  weight?: number

  // Relationship-specific metadata from OpenAlex API
  metadata?: EdgeMetadata
}
```

### EdgeDirection

Direction metadata for tracking data ownership and preventing duplicate edges.

```typescript
type EdgeDirection = 'outbound' | 'inbound'
```

**Rules**:
- `outbound`: Edge created when expanding the source entity (source owns the relationship array)
- `inbound`: Edge created when expanding the target entity (discovered via reverse lookup)
- Missing/undefined: Legacy edges before direction tracking implemented

### RelationType Enum

Complete enumeration of all relationship types supported in Academic Explorer.

```typescript
enum RelationType {
  // Core Academic Relationships (Primary)
  AUTHORSHIP = "AUTHORSHIP",              // Work → Author
  REFERENCE = "REFERENCE",                // Work → Work (citation)
  PUBLICATION = "PUBLICATION",            // Work → Source
  TOPIC = "TOPIC",                        // Work → Topic
  FUNDED_BY = "funded_by",                // Work → Funder

  // Author Relationships
  AFFILIATION = "AFFILIATION",            // Author → Institution
  AUTHOR_RESEARCHES = "author_researches", // Author → Topic

  // Topic Taxonomy Hierarchy
  TOPIC_PART_OF_FIELD = "topic_part_of_field",     // Topic → Field
  FIELD_PART_OF_DOMAIN = "field_part_of_domain",   // Field → Domain
  TOPIC_PART_OF_SUBFIELD = "topic_part_of_subfield", // Topic → Subfield
  TOPIC_SIBLING = "topic_sibling",                 // Topic ↔ Topic

  // Institutional Hierarchy
  LINEAGE = "LINEAGE",                    // Institution → Institution (parent)
  INSTITUTION_ASSOCIATED = "institution_associated", // Institution → Institution
  INSTITUTION_LOCATED_IN = "institution_located_in", // Institution → Country

  // Publishing Relationships
  HOST_ORGANIZATION = "HOST_ORGANIZATION", // Source → Publisher
  PUBLISHER_CHILD_OF = "publisher_child_of", // Publisher → Publisher (parent)

  // Funder Relationships
  FUNDER_LOCATED_IN = "funder_located_in", // Funder → Country

  // Keyword & Metadata
  WORK_HAS_KEYWORD = "work_has_keyword",   // Work → Keyword

  // Deprecated (Backwards Compatibility)
  AUTHORED = "AUTHORSHIP",                 // @deprecated Use AUTHORSHIP
  AFFILIATED = "AFFILIATION",              // @deprecated Use AFFILIATION
  PUBLISHED_IN = "PUBLICATION",            // @deprecated Use PUBLICATION
  REFERENCES = "REFERENCE",                // @deprecated Use REFERENCE
  SOURCE_PUBLISHED_BY = "HOST_ORGANIZATION", // @deprecated
  INSTITUTION_CHILD_OF = "LINEAGE",        // @deprecated Use LINEAGE
  WORK_HAS_TOPIC = "TOPIC",                // @deprecated Use TOPIC

  // General Catch-All
  RELATED_TO = "related_to",               // Generic relationships
}
```

### EdgeMetadata

Relationship-specific metadata stored in `GraphEdge.metadata` field.

```typescript
// Base metadata interface
interface EdgeMetadata {
  [key: string]: unknown
}

// Citation metadata (REFERENCE edges)
interface CitationMetadata extends EdgeMetadata {
  citation_count?: number         // Number of times cited
  citation_date?: string          // Date of citation (ISO 8601)
  is_self_citation?: boolean      // Self-citation flag
}

// Funding metadata (FUNDED_BY edges)
interface FundingMetadata extends EdgeMetadata {
  award_id?: string               // Grant award identifier
  funder_display_name?: string    // Funder name
  funding_amount?: number         // Award amount (if available)
  currency?: string               // Currency code
}

// Affiliation metadata (AFFILIATION edges)
interface AffiliationMetadata extends EdgeMetadata {
  years?: number[]                // Years of affiliation
  institution_display_name?: string
  institution_type?: string       // education, healthcare, company, etc.
}

// Authorship metadata (AUTHORSHIP edges)
interface AuthorshipMetadata extends EdgeMetadata {
  author_position?: 'first' | 'middle' | 'last'
  is_corresponding?: boolean      // Corresponding author flag
  raw_affiliation_strings?: string[]
}

// Topic metadata (TOPIC edges)
interface TopicMetadata extends EdgeMetadata {
  score?: number                  // Relevance score (0-1)
  subfield_display_name?: string
  field_display_name?: string
  domain_display_name?: string
}

// Publication metadata (PUBLICATION edges)
interface PublicationMetadata extends EdgeMetadata {
  is_primary_location?: boolean   // Primary vs alternate location
  version?: string                // publishedVersion, acceptedVersion, etc.
  license?: string                // License type
}
```

## Entity Relationship Matrix

### Works Relationships

| Relationship | Target Entity | OpenAlex Field | Direction | Priority | Status |
|-------------|---------------|----------------|-----------|----------|---------|
| **AUTHORSHIP** | Author | `authorships[]` | outbound | P1 | ❌ REVERSED |
| **PUBLICATION** | Source | `primary_location.source` | outbound | P1 | ✅ Correct |
| **REFERENCE** | Work | `referenced_works[]` | outbound | P1 | ❌ Missing |
| **TOPIC** | Topic | `topics[]` | outbound | P1 | ✅ Correct |
| **FUNDED_BY** | Funder | `grants[].funder` | outbound | P2 | ❌ Missing |
| **WORK_HAS_KEYWORD** | Keyword | `keywords[]` | outbound | P3 | ❌ Missing |

### Authors Relationships

| Relationship | Target Entity | OpenAlex Field | Direction | Priority | Status |
|-------------|---------------|----------------|-----------|----------|---------|
| **AFFILIATION** | Institution | `affiliations[]` | outbound | P1 | ⚠️ Partial |
| **Last Known Institutions** | Institution | `last_known_institutions[]` | outbound | P2 | ❌ Missing |
| **AUTHOR_RESEARCHES** | Topic | `topics[]` | outbound | P3 | ❌ Missing |
| **Authored Works** (reverse) | Work | Reverse lookup | inbound | P1 | ✅ Implemented |

### Sources Relationships

| Relationship | Target Entity | OpenAlex Field | Direction | Priority | Status |
|-------------|---------------|----------------|-----------|----------|---------|
| **HOST_ORGANIZATION** | Publisher | `host_organization` | outbound | P2 | ❌ Missing |
| **Published Works** (reverse) | Work | Reverse lookup | inbound | P1 | ✅ Implemented |

### Institutions Relationships

| Relationship | Target Entity | OpenAlex Field | Direction | Priority | Status |
|-------------|---------------|----------------|-----------|----------|---------|
| **LINEAGE** | Institution | `lineage[]` | outbound | P2 | ❌ Missing |
| **INSTITUTION_ASSOCIATED** | Institution | `associated_institutions[]` | outbound | P3 | ❌ Missing |
| **Affiliated Authors** (reverse) | Author | Reverse lookup | inbound | P1 | ✅ Implemented |

### Topics Relationships

| Relationship | Target Entity | OpenAlex Field | Direction | Priority | Status |
|-------------|---------------|----------------|-----------|----------|---------|
| **TOPIC_PART_OF_SUBFIELD** | Subfield | `subfield.id` | outbound | P2 | ❌ Missing |
| **TOPIC_PART_OF_FIELD** | Field | `field.id` | outbound | P2 | ❌ Missing |
| **FIELD_PART_OF_DOMAIN** | Domain | `domain.id` | outbound | P2 | ❌ Missing |
| **TOPIC_SIBLING** | Topic | `siblings[]` | bidirectional | P3 | ❌ Missing |
| **Works with Topic** (reverse) | Work | Reverse lookup | inbound | P1 | ✅ Implemented |

### Publishers Relationships

| Relationship | Target Entity | OpenAlex Field | Direction | Priority | Status |
|-------------|---------------|----------------|-----------|----------|---------|
| **PUBLISHER_CHILD_OF** | Publisher | `parent_publisher` | outbound | P3 | ❌ Missing |
| **Lineage** | Publisher | `lineage[]` | outbound | P3 | ❌ Missing |

### Funders Relationships

| Relationship | Target Entity | OpenAlex Field | Direction | Priority | Status |
|-------------|---------------|----------------|-----------|----------|---------|
| **FUNDER_LOCATED_IN** | Country | `country_code` | outbound | P3 | ❌ Missing |
| **Funded Works** (reverse) | Work | Reverse lookup | inbound | P2 | ❌ Missing |

## Relationship Detail Specifications

### AUTHORSHIP (Work → Author)

**OpenAlex Field**: `authorships[]`

**Direction Rule**:
- Outbound: Work entity owns `authorships[]` array
- Inbound: Author expansion discovers works via reverse lookup

**Edge Structure**:
```typescript
{
  id: `${workId}-authorship-${authorId}`,
  source: workId,           // Work owns the relationship
  target: authorId,
  type: RelationType.AUTHORSHIP,
  direction: 'outbound',    // When expanding work
  metadata: {
    author_position: 'first' | 'middle' | 'last',
    is_corresponding: boolean,
    raw_affiliation_strings: string[]
  }
}
```

**Current Implementation Issue**: REVERSED - creates `source: authorId, target: workId`

### REFERENCE (Work → Work)

**OpenAlex Field**: `referenced_works[]`

**Direction Rule**: Outbound only (array of OpenAlex IDs)

**Edge Structure**:
```typescript
{
  id: `${citingWorkId}-references-${citedWorkId}`,
  source: citingWorkId,     // Work that contains the citation
  target: citedWorkId,      // Work being cited
  type: RelationType.REFERENCE,
  direction: 'outbound',
  metadata: {
    citation_count?: number,
    citation_date?: string
  }
}
```

**Reverse Lookup**: Can query all works citing a given work via API filter

### FUNDED_BY (Work → Funder)

**OpenAlex Field**: `grants[]`

**Direction Rule**: Outbound from work

**Edge Structure**:
```typescript
{
  id: `${workId}-funded_by-${funderId}`,
  source: workId,           // Work owns grants[] array
  target: funderId,
  type: RelationType.FUNDED_BY,
  direction: 'outbound',
  metadata: {
    award_id: string,
    funder_display_name: string,
    funding_amount?: number
  }
}
```

**Data Extraction**:
```typescript
for (const grant of workData.grants || []) {
  if (grant.funder) {
    edges.push({
      source: workId,
      target: grant.funder,
      type: RelationType.FUNDED_BY,
      direction: 'outbound',
      metadata: {
        award_id: grant.award_id,
        funder_display_name: grant.funder_display_name
      }
    })
  }
}
```

### Topic Hierarchy (Topic → Field → Domain)

**OpenAlex Fields**: `subfield`, `field`, `domain`

**Direction Rules**:
- Topic → Subfield: outbound
- Topic → Field: outbound
- Field → Domain: outbound

**Edge Structures**:
```typescript
// Topic → Subfield
{
  id: `${topicId}-part_of_subfield-${subfieldId}`,
  source: topicId,
  target: subfieldId,
  type: RelationType.TOPIC_PART_OF_SUBFIELD,
  direction: 'outbound'
}

// Topic → Field (or Subfield → Field)
{
  id: `${topicId}-part_of_field-${fieldId}`,
  source: topicId,
  target: fieldId,
  type: RelationType.TOPIC_PART_OF_FIELD,
  direction: 'outbound'
}

// Field → Domain
{
  id: `${fieldId}-part_of_domain-${domainId}`,
  source: fieldId,
  target: domainId,
  type: RelationType.FIELD_PART_OF_DOMAIN,
  direction: 'outbound'
}
```

### LINEAGE (Institution → Institution)

**OpenAlex Field**: `lineage[]`

**Direction Rule**: Outbound (array ordered from child to parent)

**Edge Structure**:
```typescript
// Creates edges for entire hierarchy chain
for (const parentId of institutionData.lineage || []) {
  edges.push({
    id: `${institutionId}-lineage-${parentId}`,
    source: institutionId,    // Child institution
    target: parentId,         // Parent institution
    type: RelationType.LINEAGE,
    direction: 'outbound'
  })
}
```

**Example**: Department I123 → University I456 → System I789
- Creates edge I123 → I456
- Creates edge I123 → I789
- Or creates edge I456 → I789 when expanding I456

### HOST_ORGANIZATION (Source → Publisher)

**OpenAlex Field**: `host_organization`

**Direction Rule**: Outbound from source

**Edge Structure**:
```typescript
{
  id: `${sourceId}-host_org-${publisherId}`,
  source: sourceId,         // Journal/Source
  target: publisherId,      // Publisher
  type: RelationType.HOST_ORGANIZATION,
  direction: 'outbound'
}
```

## Edge Lifecycle & State Transitions

### Edge Creation Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Entity Expansion Triggered                               │
│    User clicks "Expand" on entity node                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Fetch Entity Data                                        │
│    - Check cache (memory → localStorage → IndexedDB)        │
│    - Fetch from OpenAlex API if missing                     │
│    - Validate entity data with Zod schema                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Extract Relationship Arrays                              │
│    - authorships[] for works                                │
│    - referenced_works[] for works                           │
│    - grants[] for works                                     │
│    - affiliations[] for authors                             │
│    - lineage[] for institutions                             │
│    - etc.                                                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Create Edge Objects                                      │
│    FOR EACH relationship in array:                          │
│      - Validate target entity ID (OpenAlex format)          │
│      - Generate edge ID: `${source}-${type}-${target}`      │
│      - Set source = expanding entity ID                     │
│      - Set target = related entity ID                       │
│      - Set type = appropriate RelationType                  │
│      - Set direction = 'outbound' (owns data)               │
│      - Set metadata = relationship-specific data            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Deduplication Check                                      │
│    - Check if edge with same ID already exists              │
│    - If exists: skip creation (prevent duplicates)          │
│    - If missing: add to edges array                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Batch Preload Related Entities                           │
│    - Extract all target entity IDs                          │
│    - Batch fetch from cache (avoid N+1 queries)             │
│    - Create stub nodes for missing entities                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Return Expansion Result                                  │
│    - nodes: Target entities (with stub nodes)               │
│    - edges: All relationship edges                          │
│    - expandedEntityId: Source entity ID                     │
└─────────────────────────────────────────────────────────────┘
```

### Direction Assignment Rules

**Decision Tree**:

```
Is the entity being expanded the data owner?
│
├─ YES → direction = 'outbound'
│        (Entity owns the relationship array)
│        Example: Work expansion creates Work → Author via authorships[]
│
└─ NO  → direction = 'inbound'
         (Reverse lookup from related entity)
         Example: Author expansion finds Work → Author via reverse query
```

**Consistency Rule**: Edge ID must be identical regardless of discovery direction

```typescript
// Always use: `${sourceId}-${relationship}-${targetId}`
// Source ID = Data owner entity ID (not expanding entity ID)

// Example: AUTHORSHIP edge (Work owns data)
const edgeId = `${workId}-authorship-${authorId}`
// ✅ Same ID whether discovered via work expansion or author expansion

// ❌ WRONG: Using expanding entity as source
const wrongId = `${expandingEntityId}-authorship-${otherEntityId}`
// This creates different IDs for the same logical relationship
```

### Deduplication Strategy

**Primary Key**: `GraphEdge.id` (format: `${source}-${type}-${target}`)

**Deduplication Algorithm**:
```typescript
function addEdgeWithDeduplication(edge: GraphEdge, existingEdges: Map<string, GraphEdge>): void {
  // Check if edge already exists
  if (existingEdges.has(edge.id)) {
    const existing = existingEdges.get(edge.id)

    // If directions differ, keep outbound version (higher data quality)
    if (existing.direction === 'inbound' && edge.direction === 'outbound') {
      existingEdges.set(edge.id, edge) // Replace with outbound version
    }
    // Otherwise skip (already have outbound or both are same direction)
    return
  }

  // New edge - add to map
  existingEdges.set(edge.id, edge)
}
```

## Validation Rules

### Entity ID Format Validation

**OpenAlex ID Pattern**: `^[A-Z]\d+$`

**Validation Function**:
```typescript
function validateOpenAlexId(id: unknown): boolean {
  if (typeof id !== 'string') return false
  return /^[A-Z]\d+$/.test(id)
}

// Entity-specific validators
function isWorkId(id: string): boolean { return /^W\d+$/.test(id) }
function isAuthorId(id: string): boolean { return /^A\d+$/.test(id) }
function isSourceId(id: string): boolean { return /^S\d+$/.test(id) }
function isInstitutionId(id: string): boolean { return /^I\d+$/.test(id) }
function isPublisherId(id: string): boolean { return /^P\d+$/.test(id) }
function isFunderId(id: string): boolean { return /^F\d+$/.test(id) }
function isTopicId(id: string): boolean { return /^T\d+$/.test(id) }
```

### Required Fields Per Relationship Type

| RelationType | Required Source Type | Required Target Type | Required Metadata |
|-------------|---------------------|---------------------|-------------------|
| AUTHORSHIP | Work (W*) | Author (A*) | None |
| REFERENCE | Work (W*) | Work (W*) | None |
| PUBLICATION | Work (W*) | Source (S*) | None |
| TOPIC | Work (W*) | Topic (T*) | None |
| FUNDED_BY | Work (W*) | Funder (F*) | award_id (optional) |
| AFFILIATION | Author (A*) | Institution (I*) | years (optional) |
| HOST_ORGANIZATION | Source (S*) | Publisher (P*) | None |
| LINEAGE | Institution (I*) | Institution (I*) | None |
| PUBLISHER_CHILD_OF | Publisher (P*) | Publisher (P*) | None |
| TOPIC_PART_OF_FIELD | Topic (T*) | Field (T*) | None |
| FIELD_PART_OF_DOMAIN | Field (T*) | Domain (T*) | None |

### Edge ID Uniqueness Constraints

**Rules**:
1. Edge IDs MUST be globally unique within a graph
2. Edge IDs MUST be deterministic (same inputs → same ID)
3. Edge IDs MUST use source entity ID (data owner), NOT expanding entity ID
4. Edge IDs MUST include relationship type to allow multiple relationships between same entities

**Format**: `{sourceId}-{relationshipSlug}-{targetId}`

**Examples**:
- `W123-authorship-A456` (Work 123 authored by Author 456)
- `W123-references-W789` (Work 123 cites Work 789)
- `W123-funded_by-F999` (Work 123 funded by Funder 999)
- `A456-affiliation-I111` (Author 456 affiliated with Institution 111)

### Data Quality Validation

**Pre-Creation Checks**:

```typescript
function validateEdgeCreation(
  sourceId: string,
  targetId: string,
  type: RelationType,
  metadata?: EdgeMetadata
): ValidationResult {
  const errors: string[] = []

  // 1. Validate entity ID formats
  if (!validateOpenAlexId(sourceId)) {
    errors.push(`Invalid source ID format: ${sourceId}`)
  }
  if (!validateOpenAlexId(targetId)) {
    errors.push(`Invalid target ID format: ${targetId}`)
  }

  // 2. Validate entity type compatibility
  const sourceType = getEntityTypeFromId(sourceId)
  const targetType = getEntityTypeFromId(targetId)

  if (!isValidRelationship(sourceType, type, targetType)) {
    errors.push(`Invalid relationship: ${sourceType} -[${type}]-> ${targetType}`)
  }

  // 3. Validate required metadata fields
  const requiredFields = getRequiredMetadataFields(type)
  for (const field of requiredFields) {
    if (!metadata || !(field in metadata)) {
      errors.push(`Missing required metadata field: ${field}`)
    }
  }

  // 4. Check for self-loops (optional - may be valid for some types)
  if (sourceId === targetId && !allowsSelfLoops(type)) {
    errors.push(`Self-loops not allowed for ${type}`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
```

## Error Handling

### Missing Relationship Data

**Strategy**: Graceful degradation - skip missing relationships without errors

```typescript
// ✅ CORRECT: Safe array iteration with optional chaining
for (const authorship of (workData.authorships as Authorship[]) || []) {
  if (authorship.author?.id) {  // Validate nested data
    // Create edge
  }
}

// ❌ WRONG: Assumes data exists
for (const authorship of workData.authorships) {  // Crashes if undefined
  edges.push({ source: workId, target: authorship.author.id })
}
```

### Invalid Entity IDs

**Strategy**: Log warning, skip invalid relationship, continue processing

```typescript
for (const refWorkId of workData.referenced_works || []) {
  if (!validateOpenAlexId(refWorkId)) {
    logger.warn('relationships', `Invalid referenced work ID: ${refWorkId}`, {
      sourceWork: workId,
      invalidId: refWorkId
    })
    continue  // Skip this relationship
  }

  // Create valid edge
  edges.push({ /* ... */ })
}
```

### Expansion Limits

**Strategy**: Apply configurable limits to prevent memory exhaustion

```typescript
const MAX_CITATIONS_PER_WORK = 100
const MAX_AUTHORS_PER_WORK = 50

function extractReferences(workData: WorkData): string[] {
  const refs = workData.referenced_works || []

  if (refs.length > MAX_CITATIONS_PER_WORK) {
    logger.warn('relationships', `Work has ${refs.length} citations, limiting to ${MAX_CITATIONS_PER_WORK}`, {
      workId: workData.id,
      totalCitations: refs.length
    })

    // Return limited set + metadata indicating truncation
    return refs.slice(0, MAX_CITATIONS_PER_WORK)
  }

  return refs
}
```

**Metadata for Truncated Results**:
```typescript
{
  metadata: {
    total_count: 500,           // Total available
    returned_count: 100,        // Actually returned
    is_truncated: true,
    truncation_reason: 'max_limit_exceeded'
  }
}
```

## Type Safety Patterns

### Type Guards for Relationship Data

```typescript
// Type guard for authorship data
function isAuthorshipData(data: unknown): data is Authorship {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as Record<string, unknown>
  return (
    'author' in obj &&
    typeof obj.author === 'object' &&
    obj.author !== null &&
    'id' in obj.author
  )
}

// Type guard for grant data
function isGrantData(data: unknown): data is Grant {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as Record<string, unknown>
  return 'funder' in obj && typeof obj.funder === 'string'
}

// Usage in edge creation
for (const item of (workData.authorships as unknown[]) || []) {
  if (!isAuthorshipData(item)) {
    logger.warn('relationships', 'Invalid authorship data', { item })
    continue
  }

  // Type-safe access
  const authorId = item.author.id
  // ...
}
```

### Metadata Type Narrowing

```typescript
function getEdgeMetadata(
  type: RelationType,
  rawData: unknown
): EdgeMetadata | undefined {
  switch (type) {
    case RelationType.AUTHORSHIP:
      return extractAuthorshipMetadata(rawData)

    case RelationType.FUNDED_BY:
      return extractFundingMetadata(rawData)

    case RelationType.AFFILIATION:
      return extractAffiliationMetadata(rawData)

    default:
      return undefined
  }
}

function extractFundingMetadata(data: unknown): FundingMetadata | undefined {
  if (typeof data !== 'object' || data === null) return undefined

  const grant = data as Record<string, unknown>
  return {
    award_id: typeof grant.award_id === 'string' ? grant.award_id : undefined,
    funder_display_name: typeof grant.funder_display_name === 'string'
      ? grant.funder_display_name
      : undefined
  }
}
```

## Performance Considerations

### Batch Preloading

**Pattern**: Preload all related entities in single batch operation

```typescript
async function expandWorkWithCache(workId: string): Promise<ExpansionResult> {
  const workData = await fetchWorkData(workId)
  const edges: GraphEdge[] = []

  // Collect all target entity IDs
  const authorIds = (workData.authorships || []).map(a => a.author.id)
  const refWorkIds = workData.referenced_works || []
  const topicIds = (workData.topics || []).map(t => t.id)
  const sourceId = workData.primary_location?.source?.id

  const allTargetIds = [
    ...authorIds,
    ...refWorkIds,
    ...topicIds,
    ...(sourceId ? [sourceId] : [])
  ]

  // Batch preload from cache (single IndexedDB transaction)
  const cachedEntities = await batchGetEntities(allTargetIds)

  // Create edges (no additional I/O required)
  // ...

  return { nodes, edges }
}
```

### Edge Creation Optimization

**Pattern**: Use Map for O(1) deduplication

```typescript
class EdgeManager {
  private edges = new Map<string, GraphEdge>()

  addEdge(edge: GraphEdge): void {
    // O(1) lookup for deduplication
    if (!this.edges.has(edge.id)) {
      this.edges.set(edge.id, edge)
    }
  }

  getEdges(): GraphEdge[] {
    return Array.from(this.edges.values())
  }
}
```

### Memory Management

**Limits**:
- Max edges per expansion: 500
- Max cached entities: 10,000 nodes
- Max graph size: 50,000 edges

**Eviction Policy**: LRU (Least Recently Used)

```typescript
class LRUEdgeCache {
  private cache = new Map<string, GraphEdge>()
  private accessOrder: string[] = []
  private readonly maxSize = 50000

  set(edge: GraphEdge): void {
    if (this.cache.size >= this.maxSize) {
      const evictId = this.accessOrder.shift()!
      this.cache.delete(evictId)
    }

    this.cache.set(edge.id, edge)
    this.accessOrder.push(edge.id)
  }
}
```

## Implementation Checklist

### Phase 1: Critical Direction Fixes (P1)

- [ ] Fix AUTHORSHIP direction in `expandWorkWithCache()` (line ~550)
  - [ ] Change source from `authorship.author.id` to `workId`
  - [ ] Change target from `workId` to `authorship.author.id`
  - [ ] Verify direction = 'outbound'
- [ ] Update author expansion to use direction = 'inbound' for discovered edges
- [ ] Add comprehensive directionality tests
- [ ] Document breaking change and migration path

### Phase 2: Missing Core Relationships (P1)

- [ ] Implement REFERENCE edges (referenced_works[])
  - [ ] Extract from `workData.referenced_works` array
  - [ ] Create Work → Work edges
  - [ ] Add citation metadata
- [ ] Implement FUNDED_BY edges (grants[])
  - [ ] Extract from `workData.grants` array
  - [ ] Create Work → Funder edges
  - [ ] Include award_id in metadata
- [ ] Create `expandFunderWithCache()` method
  - [ ] Support reverse lookup for funded works
  - [ ] Handle funder-specific relationships

### Phase 3: Taxonomy Hierarchies (P2)

- [ ] Add missing RelationType enum values
  - [ ] FIELD_PART_OF_DOMAIN
  - [ ] TOPIC_PART_OF_SUBFIELD
  - [ ] TOPIC_SIBLING
- [ ] Implement topic hierarchy edges in `expandTopicWithCache()`
  - [ ] Topic → Subfield
  - [ ] Topic → Field
  - [ ] Field → Domain
- [ ] Implement institution lineage in `expandInstitutionWithCache()`
  - [ ] Extract from `lineage[]` array
  - [ ] Create parent hierarchy chains

### Phase 4: Publisher & Source Relationships (P3)

- [ ] Add host_organization to source schema
- [ ] Implement HOST_ORGANIZATION edges in `expandSourceWithCache()`
- [ ] Create `expandPublisherWithCache()` method
  - [ ] Handle parent_publisher relationship
  - [ ] Handle lineage[] array

### Phase 5: Validation & Error Handling

- [ ] Implement entity ID validation
- [ ] Add metadata validation per relationship type
- [ ] Add expansion limits configuration
- [ ] Implement graceful error handling for missing data
- [ ] Add comprehensive logging for relationship extraction

### Phase 6: Testing & Documentation

- [ ] Write directionality tests for all relationship types
- [ ] Write deduplication tests
- [ ] Write bidirectional consistency tests
- [ ] Write error handling tests (missing data, invalid IDs)
- [ ] Write performance tests (expansion time, memory usage)
- [ ] Update API documentation
- [ ] Create migration guide for breaking changes

---

**Document Version**: 1.0
**Last Updated**: 2025-11-18
**Status**: Ready for Implementation
