# Edge Creation Interface Contract

**Contract Version**: 1.0
**Last Updated**: 2025-11-18
**Scope**: Edge creation logic for OpenAlex relationship expansion

## Purpose

This contract defines the standard interface for creating `GraphEdge` objects from OpenAlex relationship data. All relationship extraction functions must follow this pattern to ensure consistency, prevent duplicates, and maintain correct edge direction.

---

## Function Signature

```typescript
function createRelationshipEdges(
  sourceEntityId: string,
  relationshipData: unknown,
  relationType: RelationType,
  direction: EdgeDirection,
  metadataExtractor?: (item: unknown) => EdgeMetadata
): GraphEdge[]
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sourceEntityId` | `string` | ✅ | OpenAlex ID of the entity that owns the relationship data (e.g., work ID for `authorships[]`) |
| `relationshipData` | `unknown` | ✅ | Raw OpenAlex relationship array or object (e.g., `workData.authorships`) |
| `relationType` | `RelationType` | ✅ | Type of relationship being created (e.g., `RelationType.AUTHORSHIP`) |
| `direction` | `EdgeDirection` | ✅ | `'outbound'` if source owns data, `'inbound'` if reverse lookup |
| `metadataExtractor` | `function` | ❌ | Optional function to extract relationship-specific metadata |

### Return Value

```typescript
GraphEdge[] // Array of validated edges (may be empty if no valid relationships found)
```

---

## Edge Structure Contract

Every `GraphEdge` returned MUST conform to:

```typescript
{
  // Canonical edge ID (deterministic, deduplication-safe)
  id: string,                    // Format: "{sourceId}-{relationshipType}-{targetId}"

  // Source entity (data owner in OpenAlex API)
  source: string,                // OpenAlex ID (e.g., "W2741809807")

  // Target entity (referenced entity)
  target: string,                // OpenAlex ID (e.g., "A5017898742")

  // Relationship type
  type: RelationType,            // Enum value from RelationType

  // Direction metadata (required for bidirectional consistency)
  direction: EdgeDirection,      // 'outbound' | 'inbound'

  // Optional relationship-specific metadata
  metadata?: EdgeMetadata        // e.g., { award_id: "NSF-123" }
}
```

---

## Input Validation Rules

### 1. Entity ID Format Validation

**Rule**: All entity IDs must match OpenAlex ID pattern `^[A-Z]\d+$`

```typescript
function validateOpenAlexId(id: unknown): boolean {
  if (typeof id !== 'string') return false
  return /^[A-Z]\d+$/.test(id)
}
```

**Behavior**:
- ❌ Invalid IDs → Skip relationship, log warning, continue processing
- ✅ Valid IDs → Create edge

### 2. Relationship Data Validation

**Rule**: Handle missing/undefined relationship arrays gracefully

```typescript
// ✅ CORRECT: Safe iteration
for (const item of (relationshipData as Array<unknown>) || []) {
  // Validate item before use
}

// ❌ WRONG: Assumes data exists
for (const item of relationshipData) {  // Crashes if undefined
  // ...
}
```

### 3. Nested Field Validation

**Rule**: Use optional chaining and type guards for nested data

```typescript
// Example: Extracting author ID from authorship
if (authorship?.author?.id && validateOpenAlexId(authorship.author.id)) {
  // Safe to use authorship.author.id
}
```

---

## Edge ID Generation Rules

### Canonical ID Format

**Pattern**: `{sourceId}-{relationshipType}-{targetId}`

**Examples**:
```typescript
// Work → Author (AUTHORSHIP)
"W2741809807-AUTHORSHIP-A5017898742"

// Work → Work (REFERENCE/Citation)
"W123-REFERENCE-W456"

// Work → Funder (FUNDED_BY)
"W234-funded_by-F567"

// Author → Institution (AFFILIATION)
"A456-AFFILIATION-I111"
```

### ID Generation Function

```typescript
function createCanonicalEdgeId(
  source: string,
  target: string,
  relationType: RelationType
): string {
  // Validate IDs (log warnings for invalid formats)
  if (!validateOpenAlexId(source)) {
    logger.warn('edge', `Invalid source ID format: ${source}`)
  }
  if (!validateOpenAlexId(target)) {
    logger.warn('edge', `Invalid target ID format: ${target}`)
  }

  return `${source}-${relationType}-${target}`
}
```

### Symmetric Relationships (Special Case)

For truly symmetric relationships (e.g., `TOPIC_SIBLING`), use sorted IDs:

```typescript
function createSymmetricEdgeId(
  entityId1: string,
  entityId2: string,
  relationType: RelationType
): string {
  const [first, second] = [entityId1, entityId2].sort()
  return `${first}-${relationType}-${second}`
}
```

---

## Direction Assignment Rules

### Decision Tree

```
Is the entity being expanded the data owner in OpenAlex?
│
├─ YES → direction = 'outbound'
│        (Entity owns the relationship array in OpenAlex API)
│        Example: Work expansion creates Work → Author via authorships[]
│
└─ NO  → direction = 'inbound'
         (Relationship discovered via reverse lookup/API query)
         Example: Author expansion finds Work → Author via works API query
```

### Key Principle

**The `source` field is ALWAYS the data owner, regardless of which entity triggered expansion.**

```typescript
// ✅ CORRECT: Work owns authorships[] data
{
  id: `${workId}-AUTHORSHIP-${authorId}`,
  source: workId,      // Data owner (work)
  target: authorId,    // Referenced entity (author)
  direction: 'outbound' // Work expansion
}

// ✅ CORRECT: Same edge discovered from author side
{
  id: `${workId}-AUTHORSHIP-${authorId}`,  // SAME ID
  source: workId,      // Still data owner (NOT authorId!)
  target: authorId,    // Still referenced entity
  direction: 'inbound' // Reverse lookup
}

// ❌ WRONG: Using expanding entity as source
{
  source: expandingEntityId,  // Changes based on expansion direction!
  target: relatedEntityId,
  // This creates different IDs for same relationship → duplicates
}
```

---

## Edge Cases & Error Handling

### Missing Relationship Data

```typescript
// Scenario: Work with no authors
const authorships = workData.authorships || []
if (authorships.length === 0) {
  // Return empty array, no edges created
  return []
}
```

### Invalid Entity IDs

```typescript
// Scenario: Authorship with missing author.id
for (const authorship of authorships) {
  if (!authorship.author?.id) {
    logger.warn('relationships', 'Authorship missing author.id', {
      workId: sourceEntityId,
      authorship
    })
    continue  // Skip this relationship
  }

  if (!validateOpenAlexId(authorship.author.id)) {
    logger.warn('relationships', 'Invalid author ID format', {
      workId: sourceEntityId,
      authorId: authorship.author.id
    })
    continue  // Skip invalid ID
  }

  // Create edge with validated data
}
```

### Empty/Null Arrays

```typescript
// Scenario: undefined referenced_works[]
const references = (workData.referenced_works as string[]) || []
// Safe iteration, returns empty array if undefined
return references
  .filter(validateOpenAlexId)  // Remove invalid IDs
  .map(refWorkId => createEdge(workId, refWorkId))
```

### Array Length Limits

```typescript
// Scenario: Work with 500+ citations
const MAX_REFERENCES = 100

const references = (workData.referenced_works as string[]) || []
if (references.length > MAX_REFERENCES) {
  logger.warn('relationships', `Limiting references from ${references.length} to ${MAX_REFERENCES}`, {
    workId: sourceEntityId,
    totalReferences: references.length
  })

  // Return truncated array with metadata indicating truncation
  const edges = references
    .slice(0, MAX_REFERENCES)
    .map(refWorkId => createEdge(workId, refWorkId))

  // Add truncation indicator to expansion metadata (not edge metadata)
  return edges
}
```

---

## Example Implementations

### AUTHORSHIP Edges (Work → Author)

```typescript
function createAuthorshipEdges(
  workId: string,
  authorships: unknown,
  direction: EdgeDirection = 'outbound'
): GraphEdge[] {
  const edges: GraphEdge[] = []
  const authorshipsArray = (authorships as Array<{ author?: { id?: string } }>) || []

  for (const authorship of authorshipsArray) {
    if (!authorship.author?.id) {
      logger.warn('relationships', 'Authorship missing author.id', { workId })
      continue
    }

    const authorId = authorship.author.id
    if (!validateOpenAlexId(authorId)) {
      logger.warn('relationships', `Invalid author ID: ${authorId}`, { workId })
      continue
    }

    edges.push({
      id: createCanonicalEdgeId(workId, authorId, RelationType.AUTHORSHIP),
      source: workId,           // Work owns authorships[]
      target: authorId,
      type: RelationType.AUTHORSHIP,
      direction,
      metadata: {
        author_position: authorship.author_position,
        is_corresponding: authorship.is_corresponding
      }
    })
  }

  return edges
}
```

### REFERENCE Edges (Work → Cited Work)

```typescript
function createReferenceEdges(
  workId: string,
  referencedWorks: unknown,
  limit: number = 100
): GraphEdge[] {
  const edges: GraphEdge[] = []
  const refsArray = (referencedWorks as string[]) || []

  const limitedRefs = refsArray.slice(0, limit)

  for (const citedWorkId of limitedRefs) {
    if (!validateOpenAlexId(citedWorkId)) {
      logger.warn('relationships', `Invalid cited work ID: ${citedWorkId}`, { workId })
      continue
    }

    edges.push({
      id: createCanonicalEdgeId(workId, citedWorkId, RelationType.REFERENCE),
      source: workId,          // Citing work
      target: citedWorkId,     // Cited work
      type: RelationType.REFERENCE,
      direction: 'outbound'
    })
  }

  return edges
}
```

### FUNDED_BY Edges (Work → Funder)

```typescript
function createFundingEdges(
  workId: string,
  grants: unknown
): GraphEdge[] {
  const edges: GraphEdge[] = []
  const grantsArray = (grants as Array<{ funder?: string; award_id?: string }>) || []

  for (const grant of grantsArray) {
    if (!grant.funder) {
      logger.warn('relationships', 'Grant missing funder', { workId, grant })
      continue
    }

    if (!validateOpenAlexId(grant.funder)) {
      logger.warn('relationships', `Invalid funder ID: ${grant.funder}`, { workId })
      continue
    }

    edges.push({
      id: createCanonicalEdgeId(workId, grant.funder, RelationType.FUNDED_BY),
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

  return edges
}
```

---

## Testing Requirements

Every edge creation function MUST have tests covering:

1. **Valid data**: Creates correct edges with proper IDs and direction
2. **Empty arrays**: Returns empty array without errors
3. **Missing data**: Handles undefined/null relationship data gracefully
4. **Invalid IDs**: Skips relationships with malformed entity IDs
5. **Nested nulls**: Handles missing nested fields (e.g., `authorship.author.id`)
6. **Edge ID consistency**: Same relationship → same edge ID regardless of discovery direction
7. **Metadata extraction**: Correctly extracts relationship-specific metadata
8. **Limit enforcement**: Respects configurable relationship limits

---

## Contract Compliance Checklist

- [ ] Function returns `GraphEdge[]` (never throws on invalid data)
- [ ] All entity IDs validated with `validateOpenAlexId()`
- [ ] Edge IDs use canonical format: `{source}-{type}-{target}`
- [ ] Source field = data owner entity (not expanding entity)
- [ ] Direction field matches data ownership (`outbound` for owned data)
- [ ] Metadata extraction handles missing fields gracefully
- [ ] Invalid relationships logged and skipped (no silent failures)
- [ ] Handles empty/undefined relationship arrays
- [ ] Respects configurable relationship limits
- [ ] Test coverage includes all edge cases listed above

---

**Status**: Active
**Enforcement**: Required for all relationship implementations
