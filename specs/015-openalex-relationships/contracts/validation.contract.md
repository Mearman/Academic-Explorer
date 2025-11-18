# Validation Contract

**Contract Version**: 1.0
**Last Updated**: 2025-11-18
**Scope**: Data validation for OpenAlex relationship implementation

## Purpose

This contract defines validation rules, type guards, and error handling patterns for all relationship processing code. Strict validation prevents malformed edges, ensures type safety, and provides actionable error messages.

---

## Entity ID Validation

### OpenAlex ID Format Specification

**Pattern**: `^[A-Z]\d+$`

**Structure**:
- First character: Single uppercase letter (entity type prefix)
- Remaining characters: One or more digits (entity ID number)

**Valid Prefixes**:
| Prefix | Entity Type | Example |
|--------|-------------|---------|
| `W` | Works | `W2741809807` |
| `A` | Authors | `A5017898742` |
| `S` | Sources | `S123456789` |
| `I` | Institutions | `I4210140050` |
| `P` | Publishers | `P98765` |
| `F` | Funders | `F567` |
| `T` | Topics/Fields/Domains | `T10001` |
| `C` | Concepts (deprecated) | `C123` |

### Validation Function

```typescript
/**
 * Validate OpenAlex ID format
 * @param id - Value to validate
 * @returns true if valid OpenAlex ID, false otherwise
 */
function validateOpenAlexId(id: unknown): boolean {
  if (typeof id !== 'string') {
    return false
  }

  return /^[A-Z]\d+$/.test(id)
}
```

### Entity-Specific Validators

```typescript
function isWorkId(id: string): boolean {
  return /^W\d+$/.test(id)
}

function isAuthorId(id: string): boolean {
  return /^A\d+$/.test(id)
}

function isSourceId(id: string): boolean {
  return /^S\d+$/.test(id)
}

function isInstitutionId(id: string): boolean {
  return /^I\d+$/.test(id)
}

function isPublisherId(id: string): boolean {
  return /^P\d+$/.test(id)
}

function isFunderId(id: string): boolean {
  return /^F\d+$/.test(id)
}

function isTopicId(id: string): boolean {
  return /^T\d+$/.test(id)
}
```

### Usage in Edge Creation

```typescript
// ✅ CORRECT: Validate before use
for (const authorship of authorships) {
  if (!authorship.author?.id) {
    logger.warn('relationships', 'Authorship missing author.id', { workId })
    continue // Skip invalid relationship
  }

  const authorId = authorship.author.id
  if (!validateOpenAlexId(authorId)) {
    logger.warn('relationships', `Invalid author ID: ${authorId}`, { workId })
    continue // Skip malformed ID
  }

  // Safe to create edge
  edges.push(createEdge(workId, authorId))
}

// ❌ WRONG: Assumes data is valid
for (const authorship of authorships) {
  const authorId = authorship.author.id // Could be undefined or malformed
  edges.push(createEdge(workId, authorId)) // Creates invalid edge
}
```

---

## Relationship Data Validation

### Type Guards for OpenAlex Data Structures

#### Authorship Data

```typescript
interface Authorship {
  author: {
    id: string
    display_name?: string
    orcid?: string
  }
  author_position?: 'first' | 'middle' | 'last'
  is_corresponding?: boolean
  institutions?: Array<{ id: string; display_name?: string }>
  raw_affiliation_strings?: string[]
}

function isAuthorshipData(data: unknown): data is Authorship {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const obj = data as Record<string, unknown>

  // Check required nested structure
  if (typeof obj.author !== 'object' || obj.author === null) {
    return false
  }

  const author = obj.author as Record<string, unknown>
  return typeof author.id === 'string' && validateOpenAlexId(author.id)
}
```

#### Grant/Funding Data

```typescript
interface Grant {
  funder: string  // OpenAlex funder ID
  funder_display_name?: string
  award_id?: string
}

function isGrantData(data: unknown): data is Grant {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const obj = data as Record<string, unknown>
  return typeof obj.funder === 'string' && validateOpenAlexId(obj.funder)
}
```

#### Affiliation Data

```typescript
interface Affiliation {
  institution: {
    id: string
    display_name?: string
    ror?: string
    country_code?: string
  }
  years?: number[]
}

function isAffiliationData(data: unknown): data is Affiliation {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const obj = data as Record<string, unknown>

  if (typeof obj.institution !== 'object' || obj.institution === null) {
    return false
  }

  const inst = obj.institution as Record<string, unknown>
  return typeof inst.id === 'string' && validateOpenAlexId(inst.id)
}
```

### Safe Array Iteration Pattern

```typescript
// ✅ CORRECT: Safe with type guard
for (const item of (relationshipData as unknown[]) || []) {
  if (!isAuthorshipData(item)) {
    logger.warn('relationships', 'Invalid authorship data structure', { item })
    continue
  }

  // Type-safe access to item.author.id
  const authorId = item.author.id
  // ...
}

// ❌ WRONG: Assumes array exists and items are valid
for (const item of relationshipData) {
  const authorId = item.author.id // Crashes if item.author is undefined
}
```

---

## Edge Deduplication Logic

### Primary Deduplication: Edge ID Matching

**Rule**: Edges with identical IDs are duplicates

```typescript
class EdgeManager {
  private edges = new Map<string, GraphEdge>()

  addEdge(edge: GraphEdge): void {
    if (this.edges.has(edge.id)) {
      this.handleDuplicateEdge(edge)
      return
    }

    this.edges.set(edge.id, edge)
  }

  private handleDuplicateEdge(newEdge: GraphEdge): void {
    const existingEdge = this.edges.get(newEdge.id)!

    // Prefer outbound direction (higher data quality)
    if (existingEdge.direction === 'inbound' && newEdge.direction === 'outbound') {
      this.edges.set(newEdge.id, newEdge)
      logger.debug('graph', 'Replaced inbound edge with outbound', {
        edgeId: newEdge.id,
        oldDirection: existingEdge.direction,
        newDirection: newEdge.direction
      })
    } else {
      logger.debug('graph', 'Skipped duplicate edge', {
        edgeId: newEdge.id,
        existingDirection: existingEdge.direction,
        newDirection: newEdge.direction
      })
    }
  }
}
```

### Secondary Deduplication: Source-Target Pairs

**Use Case**: Detect accidental duplicates with different IDs

```typescript
function detectDuplicateRelationships(edges: GraphEdge[]): GraphEdge[] {
  const seen = new Set<string>()
  const duplicates: GraphEdge[] = []

  for (const edge of edges) {
    const pairKey = `${edge.source}:${edge.type}:${edge.target}`

    if (seen.has(pairKey)) {
      duplicates.push(edge)
      logger.warn('validation', 'Duplicate source-target pair detected', {
        edgeId: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type
      })
    } else {
      seen.add(pairKey)
    }
  }

  return duplicates
}
```

---

## Error Handling Patterns

### Classification: Recoverable vs Fatal Errors

| Error Type | Severity | Action | Example |
|------------|----------|--------|---------|
| Missing relationship array | Recoverable | Skip, log debug | `authorships` is undefined |
| Invalid entity ID format | Recoverable | Skip, log warning | Author ID is `"invalid"` |
| Missing nested field | Recoverable | Skip, log warning | `authorship.author.id` is null |
| Malformed API response | Recoverable | Skip, log warning | API returns non-array for `results` |
| API request failure | Recoverable | Log error, continue | Network timeout on reverse lookup |
| Cache operation failure | Recoverable | Log warning, fallback | IndexedDB quota exceeded |
| Type validation failure | Recoverable | Skip, log warning | Authorship object missing required fields |
| Invalid edge direction | Fatal | Throw error | `direction` is not 'outbound' or 'inbound' |
| Graph limit exceeded | Fatal | Throw error | More than max allowed edges |

### Logging Patterns

#### Missing Data (Debug Level)

```typescript
const authorships = (workData.authorships as Array<unknown>) || []
if (authorships.length === 0) {
  logger.debug('relationships', 'Work has no authorships', { workId })
  // Continue without error
}
```

#### Invalid Data (Warning Level)

```typescript
for (const authorship of authorships) {
  if (!isAuthorshipData(authorship)) {
    logger.warn('relationships', 'Invalid authorship structure', {
      workId,
      authorship,
      expected: 'object with author.id field'
    })
    continue
  }
}
```

#### Critical Failures (Error Level)

```typescript
try {
  const works = await this.client.works({ filter: {...} })
} catch (error) {
  logger.error('provider', 'API request failed', {
    error,
    filter,
    entityId,
    operation: 'expand'
  })
  // Don't throw - continue with other relationships
}
```

### Error Recovery Examples

#### Missing Nested Fields

```typescript
// ✅ CORRECT: Defensive access with optional chaining
const sourceId = workData.primary_location?.source?.id

if (sourceId && validateOpenAlexId(sourceId)) {
  // Create edge
} else {
  logger.debug('relationships', 'Work missing publication source', { workId })
  // No edge created, no error thrown
}

// ❌ WRONG: Assumes structure exists
const sourceId = workData.primary_location.source.id // Crashes if primary_location is null
```

#### Empty Arrays

```typescript
// ✅ CORRECT: Safe fallback
const grants = (workData.grants as Grant[]) || []

for (const grant of grants) {
  // Process grants
}

// If grants is undefined, loop doesn't execute (no error)
```

#### API Failures

```typescript
// ✅ CORRECT: Wrap API calls in try-catch
try {
  const works = await this.client.works({
    filter: { author: { id: authorId } },
    per_page: 10
  })

  // Process results
} catch (error) {
  logger.error('provider', 'Failed to fetch author works', {
    error,
    authorId,
    operation: 'expandAuthor'
  })

  // Return empty results, don't throw
  return []
}
```

---

## Validation Workflows

### Pre-Creation Edge Validation

```typescript
interface EdgeValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

function validateEdgeCreation(
  sourceId: string,
  targetId: string,
  relationType: RelationType,
  metadata?: EdgeMetadata
): EdgeValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

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

  if (!isValidRelationshipPair(sourceType, relationType, targetType)) {
    errors.push(`Invalid relationship: ${sourceType} -[${relationType}]-> ${targetType}`)
  }

  // 3. Check for self-loops (warn, don't reject)
  if (sourceId === targetId && !allowsSelfLoops(relationType)) {
    warnings.push(`Self-loop detected for ${relationType}`)
  }

  // 4. Validate required metadata fields
  const requiredFields = getRequiredMetadataFields(relationType)
  for (const field of requiredFields) {
    if (!metadata || !(field in metadata)) {
      warnings.push(`Missing recommended metadata field: ${field}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
```

### Relationship Type Compatibility Matrix

```typescript
function isValidRelationshipPair(
  sourceType: EntityType,
  relationType: RelationType,
  targetType: EntityType
): boolean {
  const validPairs: Record<RelationType, [EntityType, EntityType][]> = {
    [RelationType.AUTHORSHIP]: [['works', 'authors']],
    [RelationType.REFERENCE]: [['works', 'works']],
    [RelationType.PUBLICATION]: [['works', 'sources']],
    [RelationType.TOPIC]: [['works', 'topics']],
    [RelationType.FUNDED_BY]: [['works', 'funders']],
    [RelationType.AFFILIATION]: [['authors', 'institutions']],
    [RelationType.LINEAGE]: [['institutions', 'institutions'], ['publishers', 'publishers']],
    [RelationType.HOST_ORGANIZATION]: [['sources', 'publishers']],
    [RelationType.TOPIC_PART_OF_FIELD]: [['topics', 'topics']],
    [RelationType.FIELD_PART_OF_DOMAIN]: [['topics', 'topics']],
    // ... additional mappings
  }

  const allowedPairs = validPairs[relationType] || []
  return allowedPairs.some(([s, t]) => s === sourceType && t === targetType)
}
```

### Self-Loop Rules

```typescript
function allowsSelfLoops(relationType: RelationType): boolean {
  const allowedTypes = new Set([
    RelationType.LINEAGE,  // Institution can reference itself in hierarchy
    // Add other types that allow self-references
  ])

  return allowedTypes.has(relationType)
}
```

---

## Type Safety Enforcement

### No `any` Types Rule

```typescript
// ❌ WRONG: Using any
function extractAuthorships(data: any): GraphEdge[] {
  return data.authorships.map((a: any) => ({
    source: data.id,
    target: a.author.id
  }))
}

// ✅ CORRECT: Using unknown with type guards
function extractAuthorships(data: unknown): GraphEdge[] {
  if (typeof data !== 'object' || data === null) {
    return []
  }

  const workData = data as Record<string, unknown>
  const authorships = (workData.authorships as unknown[]) || []

  return authorships
    .filter(isAuthorshipData)
    .map(authorship => ({
      id: createCanonicalEdgeId(
        String(workData.id),
        authorship.author.id,
        RelationType.AUTHORSHIP
      ),
      source: String(workData.id),
      target: authorship.author.id,
      type: RelationType.AUTHORSHIP,
      direction: 'outbound' as const
    }))
}
```

### Type Guard Pattern

```typescript
// Generic type guard creator
function hasRequiredFields<T>(
  obj: unknown,
  requiredFields: Array<keyof T>
): obj is T {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const record = obj as Record<string, unknown>
  return requiredFields.every(field => field in record)
}

// Usage
interface WorkData {
  id: string
  authorships: unknown[]
  referenced_works: string[]
}

function isWorkData(data: unknown): data is WorkData {
  return hasRequiredFields<WorkData>(data, ['id', 'authorships', 'referenced_works'])
}
```

---

## Testing Requirements

### Validation Function Tests

Every validation function must have tests for:

1. **Valid inputs**: Returns true/passes for correctly formatted data
2. **Invalid type**: Returns false for non-string, non-object, etc.
3. **Empty strings**: Handles empty strings correctly
4. **Null/undefined**: Returns false without throwing
5. **Malformed IDs**: Rejects invalid OpenAlex ID patterns
6. **Edge cases**: Handles numeric IDs, special characters, etc.

### Example Test Suite

```typescript
describe('validateOpenAlexId', () => {
  it('returns true for valid work ID', () => {
    expect(validateOpenAlexId('W2741809807')).toBe(true)
  })

  it('returns true for valid author ID', () => {
    expect(validateOpenAlexId('A5017898742')).toBe(true)
  })

  it('returns false for non-string', () => {
    expect(validateOpenAlexId(123)).toBe(false)
    expect(validateOpenAlexId(null)).toBe(false)
    expect(validateOpenAlexId(undefined)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(validateOpenAlexId('')).toBe(false)
  })

  it('returns false for invalid format', () => {
    expect(validateOpenAlexId('invalid')).toBe(false)
    expect(validateOpenAlexId('W')).toBe(false)
    expect(validateOpenAlexId('123')).toBe(false)
    expect(validateOpenAlexId('w123')).toBe(false) // lowercase
  })
})

describe('isAuthorshipData', () => {
  it('returns true for valid authorship', () => {
    const validData = {
      author: { id: 'A123', display_name: 'Test' }
    }
    expect(isAuthorshipData(validData)).toBe(true)
  })

  it('returns false for missing author.id', () => {
    const invalidData = {
      author: { display_name: 'Test' }
    }
    expect(isAuthorshipData(invalidData)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isAuthorshipData(null)).toBe(false)
  })
})
```

---

## Contract Compliance Checklist

- [ ] All entity IDs validated with `validateOpenAlexId()` before use
- [ ] Type guards used instead of `any` types for OpenAlex data
- [ ] Missing/undefined relationship arrays handled with `|| []` fallback
- [ ] Invalid relationships logged and skipped (not thrown)
- [ ] Optional chaining used for nested field access
- [ ] Edge deduplication uses canonical ID matching
- [ ] Error handling distinguishes recoverable vs fatal errors
- [ ] API failures wrapped in try-catch blocks
- [ ] Cache failures don't block edge creation
- [ ] All validation functions have unit tests
- [ ] Logging uses appropriate levels (debug/warn/error)
- [ ] Type safety enforced with TypeScript strict mode

---

**Status**: Active
**Enforcement**: Required for all relationship processing code
