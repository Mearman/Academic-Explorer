# Edge ID Generation Contract

**Contract Version**: 2.0
**Last Updated**: 2025-11-18
**Scope**: Canonical edge ID generation for graph deduplication (Implemented)

## Purpose

This contract defines the canonical format for `GraphEdge.id` generation to ensure:
- **Determinism**: Same relationship always generates same ID
- **Deduplication**: Graph manager can prevent duplicate edges via ID comparison
- **Bidirectional consistency**: Edge discovered from either side produces identical ID
- **Human readability**: IDs are debuggable and reflect relationship semantics

---

## Core Function Signature

```typescript
function createCanonicalEdgeId(
  source: string,
  target: string,
  relationType: RelationType
): string
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `source` | `string` | ✅ | OpenAlex ID of entity that owns relationship data (e.g., work ID for authorships) |
| `target` | `string` | ✅ | OpenAlex ID of referenced entity |
| `relationType` | `RelationType` | ✅ | Type of relationship (enum value) |

### Return Value

```typescript
string // Format: "{sourceId}-{relationshipType}-{targetId}"
```

---

## ID Format Specification

### Standard Format

**Pattern**: `{sourceId}-{relationshipType}-{targetId}`

**Rules**:
1. Source ID = Entity that owns the relationship array in OpenAlex API
2. Relationship type = String value from `RelationType` enum
3. Target ID = Entity being referenced
4. Separator = Single hyphen (`-`)
5. No URL encoding or special character escaping

### Examples by Relationship Type

#### AUTHORSHIP (Work → Author)

```typescript
// Work owns authorships[] array
const edgeId = createCanonicalEdgeId("W2741809807", "A5017898742", RelationType.AUTHORSHIP)
// Result: "W2741809807-AUTHORSHIP-A5017898742"

// Discovered from work expansion: Same ID
// Discovered from author expansion (reverse lookup): SAME ID
```

#### REFERENCE (Work → Work)

```typescript
// Work owns referenced_works[] array
const edgeId = createCanonicalEdgeId("W123", "W456", RelationType.REFERENCE)
// Result: "W123-REFERENCE-W456"

// W123 cites W456 (direction of citation flow)
```

#### FUNDED_BY (Work → Funder)

```typescript
// Work owns grants[] array
const edgeId = createCanonicalEdgeId("W234", "F567", RelationType.FUNDED_BY)
// Result: "W234-funded_by-F567"

// Note: RelationType.FUNDED_BY = "funded_by" (lowercase with underscore)
```

#### AFFILIATION (Author → Institution)

```typescript
// Author owns affiliations[] array
const edgeId = createCanonicalEdgeId("A5017898742", "I4210140050", RelationType.AFFILIATION)
// Result: "A5017898742-AFFILIATION-I4210140050"
```

#### PUBLICATION (Work → Source)

```typescript
// Work owns primary_location.source
const edgeId = createCanonicalEdgeId("W2741809807", "S123456789", RelationType.PUBLICATION)
// Result: "W2741809807-PUBLICATION-S123456789"
```

#### TOPIC (Work → Topic)

```typescript
// Work owns topics[] array
const edgeId = createCanonicalEdgeId("W2741809807", "T10001", RelationType.TOPIC)
// Result: "W2741809807-TOPIC-T10001"
```

#### LINEAGE (Institution → Parent Institution)

```typescript
// Institution owns lineage[] array
const edgeId = createCanonicalEdgeId("I123", "I456", RelationType.LINEAGE)
// Result: "I123-LINEAGE-I456"

// Department I123 → University I456
```

#### TOPIC_PART_OF_FIELD (Topic → Field)

```typescript
// Topic owns field property
const edgeId = createCanonicalEdgeId("T10001", "T10002", RelationType.TOPIC_PART_OF_FIELD)
// Result: "T10001-topic_part_of_field-T10002"
```

#### HOST_ORGANIZATION (Source → Publisher)

```typescript
// Source owns host_organization property
const edgeId = createCanonicalEdgeId("S123456789", "P98765", RelationType.HOST_ORGANIZATION)
// Result: "S123456789-HOST_ORGANIZATION-P98765"
```

---

## Implementation

### Standard Implementation

```typescript
function createCanonicalEdgeId(
  source: string,
  target: string,
  relationType: RelationType
): string {
  // Validate source ID format
  if (!validateOpenAlexId(source)) {
    logger.warn('edge', `Invalid source ID format: ${source}`, {
      source,
      target,
      relationType
    })
  }

  // Validate target ID format
  if (!validateOpenAlexId(target)) {
    logger.warn('edge', `Invalid target ID format: ${target}`, {
      source,
      target,
      relationType
    })
  }

  // Generate canonical ID
  return `${source}-${relationType}-${target}`
}

/**
 * Validate OpenAlex ID format: [A-Z]\d+
 */
function validateOpenAlexId(id: string): boolean {
  if (typeof id !== 'string') return false
  return /^[A-Z]\d+$/.test(id)
}
```

### Validation Rules

| Validation | Rule | Behavior on Failure |
|------------|------|---------------------|
| Source ID format | Must match `^[A-Z]\d+$` | Log warning, continue with ID generation |
| Target ID format | Must match `^[A-Z]\d+$` | Log warning, continue with ID generation |
| Source ≠ Target | Prevent self-loops (optional) | Log warning or throw based on relationship type |
| RelationType valid | Must be valid enum value | TypeScript enforces at compile time |

---

## Special Cases

### Symmetric Relationships

For truly symmetric relationships where neither entity owns the data (e.g., `TOPIC_SIBLING`), use **sorted IDs** to ensure consistent ordering:

```typescript
function createSymmetricEdgeId(
  entityId1: string,
  entityId2: string,
  relationType: RelationType
): string {
  // Sort IDs alphabetically
  const [first, second] = [entityId1, entityId2].sort()

  // Always use sorted order
  return `${first}-${relationType}-${second}`
}

// Example: Topic siblings
const id1 = createSymmetricEdgeId("T10003", "T10001", RelationType.TOPIC_SIBLING)
const id2 = createSymmetricEdgeId("T10001", "T10003", RelationType.TOPIC_SIBLING)

// Both produce: "T10001-topic_sibling-T10003"
```

**When to Use Symmetric IDs**:
- `TOPIC_SIBLING` (peer topics in same field)
- Any future bidirectional relationships with no clear ownership

**When NOT to Use Symmetric IDs**:
- `AUTHORSHIP` (work owns authorships[], not symmetric)
- `REFERENCE` (citation has clear direction: citing → cited)
- `FUNDED_BY` (work owns grants[], not symmetric)

### Self-Loops

Some relationships may validly point to the same entity (e.g., institution lineage to self):

```typescript
// Example: University system that lists itself in lineage
const selfLoopId = createCanonicalEdgeId("I789", "I789", RelationType.LINEAGE)
// Result: "I789-LINEAGE-I789"
```

**Handling**:
- Most relationships should reject self-loops (work can't cite itself)
- Lineage relationships may allow self-loops
- Validation should be relationship-specific

---

## Deduplication Behavior

### Graph Manager Integration

```typescript
class GraphManager {
  private edges = new Map<string, GraphEdge>()

  addEdge(edge: GraphEdge): void {
    // Check if edge already exists by ID
    if (this.edges.has(edge.id)) {
      // Existing edge found - choose which to keep
      const existing = this.edges.get(edge.id)!

      // Prefer outbound direction (higher data quality)
      if (existing.direction === 'inbound' && edge.direction === 'outbound') {
        this.edges.set(edge.id, edge) // Replace with outbound version
        logger.debug('graph', 'Replaced inbound edge with outbound', { edgeId: edge.id })
      } else {
        // Keep existing edge, skip new one
        logger.debug('graph', 'Skipped duplicate edge', { edgeId: edge.id })
      }
      return
    }

    // New edge - add to map
    this.edges.set(edge.id, edge)
  }
}
```

### Bidirectional Consistency Example

```typescript
// Scenario: Expand work W2741809807, then expand author A5017898742

// Work expansion creates edge
const workEdge = {
  id: createCanonicalEdgeId("W2741809807", "A5017898742", RelationType.AUTHORSHIP),
  source: "W2741809807",
  target: "A5017898742",
  type: RelationType.AUTHORSHIP,
  direction: 'outbound'
}
graphManager.addEdge(workEdge)  // Added to graph

// Author expansion discovers same relationship via reverse lookup
const authorEdge = {
  id: createCanonicalEdgeId("W2741809807", "A5017898742", RelationType.AUTHORSHIP),
  // SAME ID ✅
  source: "W2741809807",  // Still work (data owner)
  target: "A5017898742",  // Still author
  type: RelationType.AUTHORSHIP,
  direction: 'inbound'    // Different direction
}
graphManager.addEdge(authorEdge)  // Skipped (duplicate ID)

// Result: Only ONE edge in graph with outbound direction
```

---

## Relationship Type String Values

All `RelationType` enum values used in edge IDs:

| Enum Constant | String Value | Example ID |
|--------------|--------------|------------|
| `AUTHORSHIP` | `"AUTHORSHIP"` | `W123-AUTHORSHIP-A456` |
| `REFERENCE` | `"REFERENCE"` | `W123-REFERENCE-W789` |
| `PUBLICATION` | `"PUBLICATION"` | `W123-PUBLICATION-S456` |
| `TOPIC` | `"TOPIC"` | `W123-TOPIC-T789` |
| `FUNDED_BY` | `"funded_by"` | `W123-funded_by-F456` |
| `AFFILIATION` | `"AFFILIATION"` | `A123-AFFILIATION-I456` |
| `LINEAGE` | `"LINEAGE"` | `I123-LINEAGE-I456` |
| `HOST_ORGANIZATION` | `"HOST_ORGANIZATION"` | `S123-HOST_ORGANIZATION-P456` |
| `TOPIC_PART_OF_FIELD` | `"topic_part_of_field"` | `T123-topic_part_of_field-T456` |
| `FIELD_PART_OF_DOMAIN` | `"field_part_of_domain"` | `T123-field_part_of_domain-T789` |
| `PUBLISHER_CHILD_OF` | `"publisher_child_of"` | `P123-publisher_child_of-P456` |
| `TOPIC_SIBLING` | `"topic_sibling"` | `T123-topic_sibling-T456` |

---

## Error Cases and Edge Cases

### Invalid Source ID

```typescript
const invalidId = createCanonicalEdgeId("INVALID", "A456", RelationType.AUTHORSHIP)
// Logs: WARN "Invalid source ID format: INVALID"
// Returns: "INVALID-AUTHORSHIP-A456" (still generates ID for debugging)
```

### Invalid Target ID

```typescript
const invalidId = createCanonicalEdgeId("W123", "", RelationType.AUTHORSHIP)
// Logs: WARN "Invalid target ID format: "
// Returns: "W123-AUTHORSHIP-" (malformed but traceable)
```

### Null/Undefined IDs

```typescript
// Type system should prevent this, but handle defensively
const invalidId = createCanonicalEdgeId(null as unknown as string, "A456", RelationType.AUTHORSHIP)
// Logs: WARN "Invalid source ID format: null"
// Returns: "null-AUTHORSHIP-A456" (for debugging)
```

### Empty String IDs

```typescript
const invalidId = createCanonicalEdgeId("", "A456", RelationType.AUTHORSHIP)
// Logs: WARN "Invalid source ID format: "
// Returns: "-AUTHORSHIP-A456" (malformed but traceable)
```

---

## Testing Requirements

### Unit Tests Required

1. **Valid IDs**: Correct format generation for all relationship types
2. **Consistency**: Same inputs always produce same ID
3. **Bidirectional**: Forward and reverse expansion produce identical IDs
4. **Invalid source**: Logs warning, still generates ID
5. **Invalid target**: Logs warning, still generates ID
6. **Self-loops**: Handles source === target correctly
7. **Symmetric relationships**: Sorted IDs produce consistent results
8. **Special characters**: Handles hyphens in IDs correctly (future-proofing)

### Example Test Cases

```typescript
describe('createCanonicalEdgeId', () => {
  it('generates correct format for AUTHORSHIP', () => {
    const id = createCanonicalEdgeId('W123', 'A456', RelationType.AUTHORSHIP)
    expect(id).toBe('W123-AUTHORSHIP-A456')
  })

  it('produces identical ID regardless of discovery order', () => {
    const forwardId = createCanonicalEdgeId('W123', 'A456', RelationType.AUTHORSHIP)
    const reverseId = createCanonicalEdgeId('W123', 'A456', RelationType.AUTHORSHIP)
    expect(forwardId).toBe(reverseId)
  })

  it('logs warning for invalid source ID', () => {
    const spy = jest.spyOn(logger, 'warn')
    createCanonicalEdgeId('INVALID', 'A456', RelationType.AUTHORSHIP)
    expect(spy).toHaveBeenCalledWith('edge', expect.stringContaining('Invalid source ID'))
  })

  it('handles self-loops correctly', () => {
    const id = createCanonicalEdgeId('I123', 'I123', RelationType.LINEAGE)
    expect(id).toBe('I123-LINEAGE-I123')
  })
})

describe('createSymmetricEdgeId', () => {
  it('produces same ID regardless of argument order', () => {
    const id1 = createSymmetricEdgeId('T123', 'T456', RelationType.TOPIC_SIBLING)
    const id2 = createSymmetricEdgeId('T456', 'T123', RelationType.TOPIC_SIBLING)
    expect(id1).toBe(id2)
    expect(id1).toBe('T123-topic_sibling-T456') // Alphabetically sorted
  })
})
```

---

## Contract Compliance Checklist

- [ ] Function returns string in format `{source}-{type}-{target}`
- [ ] Source ID = data owner entity (not expanding entity)
- [ ] Source and target IDs validated with `validateOpenAlexId()`
- [ ] Invalid IDs logged with `logger.warn()` (not thrown)
- [ ] Same relationship inputs always produce identical ID
- [ ] Symmetric relationships use sorted IDs
- [ ] No URL encoding or special escaping applied
- [ ] Self-loops handled correctly (allowed or rejected based on relationship type)
- [ ] All RelationType enum values produce valid IDs
- [ ] Unit tests cover all edge cases and relationship types

---

**Status**: Active
**Enforcement**: Required for all edge creation logic
