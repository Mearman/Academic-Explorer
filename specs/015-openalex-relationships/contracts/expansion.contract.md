# Expansion Method Contract

**Contract Version**: 1.0
**Last Updated**: 2025-11-18
**Scope**: Entity expansion methods in OpenAlexGraphProvider

## Purpose

This contract defines the standard interface and implementation pattern for all `expand*WithCache()` methods. Consistent implementation ensures predictable behavior, optimal cache utilization, and correct edge direction across all entity types.

---

## Method Signature Pattern

```typescript
private async expand{EntityType}WithCache(
  entityId: string,
  entityData: Record<string, unknown>,
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: ProviderExpansionOptions,
  context: CacheContext
): Promise<void>
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `entityId` | `string` | OpenAlex ID of entity being expanded (e.g., `"W2741809807"`) |
| `entityData` | `Record<string, unknown>` | Pre-fetched entity data from OpenAlex API |
| `nodes` | `GraphNode[]` | Mutable array to append discovered entity nodes |
| `edges` | `GraphEdge[]` | Mutable array to append relationship edges |
| `options` | `ProviderExpansionOptions` | Expansion configuration (limits, depth, etc.) |
| `context` | `CacheContext` | Cache context for batch preloading |

### Return Value

`Promise<void>` - Mutates `nodes` and `edges` arrays in place

---

## Implementation Pattern (Required Steps)

### Step 1: Extract Relationship IDs

**Purpose**: Identify all related entities for batch preloading

```typescript
// Collect target entity IDs from relationship arrays
const relatedIds: string[] = []

// Example: Extract author IDs from authorships[]
const authorships = (entityData.authorships as Array<{ author?: { id?: string } }>) || []
for (const authorship of authorships.slice(0, options.limit || 10)) {
  if (authorship.author?.id && validateOpenAlexId(authorship.author.id)) {
    relatedIds.push(authorship.author.id)
  }
}

// Example: Extract source ID from primary_location
const primaryLocation = (entityData.primary_location as { source?: { id?: string } }) || {}
if (primaryLocation.source?.id && validateOpenAlexId(primaryLocation.source.id)) {
  relatedIds.push(primaryLocation.source.id)
}
```

**Rules**:
- Extract ALL target IDs before any edge creation
- Validate IDs with `validateOpenAlexId()` before adding to `relatedIds`
- Apply relationship limits during ID extraction (avoid preloading excess entities)
- Handle missing/undefined arrays with `|| []` fallback

---

### Step 2: Batch Preload Related Entities

**Purpose**: Populate cache with all related entities in single operation

```typescript
if (this.cache && relatedIds.length > 0) {
  try {
    const expansionContext = {
      ...context,
      operation: "expand" as const,
      depth: (context.depth || 0) + 1,
    }
    await this.cache.batchPreloadEntities(relatedIds, expansionContext)
  } catch (error) {
    logger.warn("provider", "Failed to preload related entities", { error }, "OpenAlexProvider")
  }
}
```

**Rules**:
- Only call if `cache` exists AND `relatedIds.length > 0`
- Increment `depth` in context for nested expansions
- Wrap in `try-catch` - cache failures should NOT block expansion
- Use `logger.warn()` for cache errors (not `logger.error()`)

---

### Step 3: Create Relationship Edges and Nodes

**Purpose**: Build graph structure from validated relationship data

```typescript
// Process each relationship type
const authorships = (entityData.authorships as Array<{ author?: { id?: string } }>) || []

for (const authorship of authorships.slice(0, options.limit || 10)) {
  if (!authorship.author?.id) {
    logger.warn('relationships', 'Authorship missing author.id', { entityId })
    continue
  }

  const authorId = authorship.author.id
  if (!validateOpenAlexId(authorId)) {
    logger.warn('relationships', `Invalid author ID: ${authorId}`, { entityId })
    continue
  }

  // Create edge (canonical direction)
  edges.push({
    id: createCanonicalEdgeId(entityId, authorId, RelationType.AUTHORSHIP),
    source: entityId,      // Entity being expanded owns the data
    target: authorId,
    type: RelationType.AUTHORSHIP,
    direction: 'outbound', // Data ownership direction
    metadata: extractAuthorshipMetadata(authorship)
  })

  // Create node for related entity
  const authorNode: GraphNode = {
    id: authorId,
    entityType: "authors",
    entityId: authorId,
    label: String(authorship.author.display_name) || "Unknown Author",
    x: Math.random() * 800,
    y: Math.random() * 600,
    externalIds: extractExternalIds(authorship.author, "authors"),
    entityData: authorship.author
  }

  nodes.push(authorNode)
}
```

**Rules**:
- Validate each relationship item before use
- Apply `options.limit` to relationship arrays
- Use `createCanonicalEdgeId()` for edge IDs
- Set `source` to expanding entity ID (data owner)
- Set `direction` to `'outbound'` for owned data
- Extract metadata with safe type guards
- Create GraphNode for each valid related entity
- Skip invalid relationships with `continue`, log warnings

---

### Step 4: Handle Reverse Lookups (When Applicable)

**Purpose**: Discover relationships via API queries (for entities that don't own the data)

```typescript
// Example: Author expansion discovering works via reverse lookup
try {
  const works = await this.client.works({
    filter: { author: { id: entityId } },
    per_page: options.limit || 10,
    sort: "publication_year:desc"
  })

  const workResults = Array.isArray(works.results) ? works.results : []
  const workIds = workResults.map(work => String(work.id))

  // Batch preload discovered works
  if (this.cache && workIds.length > 0) {
    await this.cache.batchPreloadEntities(workIds, {
      ...context,
      entityType: "works",
      depth: (context.depth || 0) + 1
    })
  }

  // Create edges (reverse lookup direction)
  for (const work of workResults) {
    edges.push({
      id: createCanonicalEdgeId(String(work.id), entityId, RelationType.AUTHORSHIP),
      source: String(work.id), // Work owns authorships[] (NOT entityId!)
      target: entityId,         // Author is target
      type: RelationType.AUTHORSHIP,
      direction: 'inbound'      // Discovered via reverse lookup
    })

    // Create work nodes...
  }
} catch (error) {
  logger.warn('provider', `Failed reverse lookup for ${entityId}`, { error })
}
```

**Rules for Reverse Lookups**:
- Wrap API queries in `try-catch` (don't fail expansion on query errors)
- Use `direction: 'inbound'` for reverse-discovered edges
- Source ID = data owner (NOT expanding entity)
- Target ID = expanding entity
- Same canonical edge ID as forward discovery (prevents duplicates)
- Batch preload discovered entities if cache available

---

## Direction Rules Matrix

| Expansion Entity | Relationship | Data Owner | Edge Source | Edge Target | Direction |
|-----------------|--------------|------------|-------------|-------------|-----------|
| Work | authorships[] | Work | `workId` | `authorId` | `outbound` |
| Author | works (reverse) | Work | `workId` | `authorId` | `inbound` |
| Work | referenced_works[] | Work | `workId` | `citedWorkId` | `outbound` |
| Work | grants[] | Work | `workId` | `funderId` | `outbound` |
| Author | affiliations[] | Author | `authorId` | `institutionId` | `outbound` |
| Institution | authors (reverse) | Author | `authorId` | `institutionId` | `inbound` |
| Source | works (reverse) | Work | `workId` | `sourceId` | `inbound` |
| Institution | lineage[] | Institution | `institutionId` | `parentId` | `outbound` |
| Topic | field | Topic | `topicId` | `fieldId` | `outbound` |
| Topic | works (reverse) | Work | `workId` | `topicId` | `inbound` |

**Key Principle**: Source ID ALWAYS represents the data owner in OpenAlex, regardless of which entity triggered expansion.

---

## Options Handling

### Relationship Limits

```typescript
// Extract limit for specific relationship type
function getRelationshipLimit(
  options: ProviderExpansionOptions,
  relationshipType: string
): number {
  return options.limits?.[relationshipType]
    ?? options.limits?.default
    ?? options.limit
    ?? 10  // Fallback default
}

// Usage
const authorshipLimit = getRelationshipLimit(options, 'authorships')
const authorships = (entityData.authorships as Array<unknown>) || []
const limitedAuthorships = authorships.slice(0, authorshipLimit)
```

### Depth Limits

```typescript
// Check depth before expanding
if (context.depth && context.depth >= (options.maxDepth || 3)) {
  logger.info('provider', `Max depth reached for ${entityId}`, { depth: context.depth })
  return // Stop expansion
}
```

---

## Error Handling Requirements

### 1. Missing Relationship Arrays

```typescript
// ✅ CORRECT: Safe fallback
const authorships = (entityData.authorships as Array<unknown>) || []

// ❌ WRONG: Assumes data exists
const authorships = entityData.authorships as Array<unknown>
```

### 2. Invalid Nested Data

```typescript
// ✅ CORRECT: Optional chaining + validation
if (authorship?.author?.id && validateOpenAlexId(authorship.author.id)) {
  // Safe to use
}

// ❌ WRONG: Assumes nested structure
const authorId = authorship.author.id  // Crashes if author is undefined
```

### 3. API Query Failures

```typescript
// ✅ CORRECT: Wrap API calls in try-catch
try {
  const works = await this.client.works({ filter: {...} })
  // Process results
} catch (error) {
  logger.warn('provider', `Failed to expand ${entityId}`, { error })
  // Continue with other relationships (don't throw)
}

// ❌ WRONG: Unhandled exceptions
const works = await this.client.works({ filter: {...} })  // Can throw
```

### 4. Cache Failures

```typescript
// ✅ CORRECT: Cache errors don't block expansion
if (this.cache && relatedIds.length > 0) {
  try {
    await this.cache.batchPreloadEntities(relatedIds, context)
  } catch (error) {
    logger.warn('provider', 'Cache preload failed', { error })
    // Fallback to individual fetches (no throw)
  }
}
```

---

## Performance Optimization Guidelines

### When to Use Batch Preloading

| Scenario | Use Batch Preload? | Reason |
|----------|-------------------|--------|
| 11-50 related entities | ✅ YES | Optimal balance of overhead vs benefit |
| 1-3 related entities | ❌ NO | Individual cache lookups faster |
| 51+ related entities | ✅ YES (chunked) | Split into batches of 50 |
| Reverse lookup results | ✅ YES | Always batch after API query |

### Cache Context Optimization

```typescript
// Minimal fields for relationship endpoints
const minimalContext = {
  ...context,
  operation: 'expand' as const,
  purpose: 'visualization' as const,
  depth: (context.depth || 0) + 1
}

// Use context-aware field selection
const fields = this.fieldSelector?.selectFieldsForContext(entityType, minimalContext)
```

---

## Example Implementations

### expandWorkWithCache (Owned Relationships)

```typescript
private async expandWorkWithCache(
  workId: string,
  workData: Record<string, unknown>,
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: ProviderExpansionOptions,
  context: CacheContext
): Promise<void> {
  const relatedIds: string[] = []

  // Extract IDs
  const authorships = (workData.authorships as Array<{ author?: { id?: string } }>) || []
  for (const authorship of authorships.slice(0, options.limit || 10)) {
    if (authorship.author?.id) relatedIds.push(authorship.author.id)
  }

  const refWorks = (workData.referenced_works as string[]) || []
  relatedIds.push(...refWorks.slice(0, options.limit || 20).filter(validateOpenAlexId))

  // Batch preload
  if (this.cache && relatedIds.length > 0) {
    try {
      await this.cache.batchPreloadEntities(relatedIds, {
        ...context,
        depth: (context.depth || 0) + 1
      })
    } catch (error) {
      logger.warn('provider', 'Preload failed', { error })
    }
  }

  // Create authorship edges (outbound)
  for (const authorship of authorships.slice(0, options.limit || 10)) {
    if (!authorship.author?.id) continue

    edges.push({
      id: createCanonicalEdgeId(workId, authorship.author.id, RelationType.AUTHORSHIP),
      source: workId,
      target: authorship.author.id,
      type: RelationType.AUTHORSHIP,
      direction: 'outbound'
    })

    nodes.push(/* create author node */)
  }

  // Create reference edges (outbound)
  for (const citedWorkId of refWorks.slice(0, options.limit || 20)) {
    if (!validateOpenAlexId(citedWorkId)) continue

    edges.push({
      id: createCanonicalEdgeId(workId, citedWorkId, RelationType.REFERENCE),
      source: workId,
      target: citedWorkId,
      type: RelationType.REFERENCE,
      direction: 'outbound'
    })

    nodes.push(/* create cited work node */)
  }
}
```

### expandAuthorWithCache (Reverse Lookup)

```typescript
private async expandAuthorWithCache(
  authorId: string,
  authorData: Record<string, unknown>,
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: ProviderExpansionOptions,
  context: CacheContext
): Promise<void> {
  try {
    // Reverse lookup: Find works by this author
    const works = await this.client.works({
      filter: { author: { id: authorId } },
      per_page: options.limit || 10,
      sort: "publication_year:desc"
    })

    const workResults = Array.isArray(works.results) ? works.results : []
    const workIds = workResults.map(work => String(work.id))

    // Batch preload discovered works
    if (this.cache && workIds.length > 0) {
      await this.cache.batchPreloadEntities(workIds, {
        ...context,
        entityType: 'works',
        depth: (context.depth || 0) + 1
      })
    }

    // Create edges (inbound - reverse lookup)
    for (const work of workResults) {
      edges.push({
        id: createCanonicalEdgeId(String(work.id), authorId, RelationType.AUTHORSHIP),
        source: String(work.id),  // Work owns authorships[] (NOT authorId!)
        target: authorId,
        type: RelationType.AUTHORSHIP,
        direction: 'inbound'      // Reverse lookup
      })

      nodes.push(/* create work node */)
    }
  } catch (error) {
    logger.warn('provider', `Failed to expand author ${authorId}`, { error })
  }
}
```

---

## Testing Requirements

Every `expand*WithCache()` method MUST have tests for:

1. **Owned relationships**: Edges with `direction: 'outbound'` and correct source/target
2. **Reverse lookups**: Edges with `direction: 'inbound'` and data-owner source
3. **Empty data**: Handles entities with no relationships gracefully
4. **Invalid IDs**: Skips malformed entity IDs, logs warnings
5. **Batch preloading**: Calls `cache.batchPreloadEntities()` with correct context
6. **Cache failures**: Continues expansion when cache fails
7. **API failures**: Logs errors without throwing
8. **Relationship limits**: Respects `options.limit` and relationship-specific limits
9. **Edge ID consistency**: Same edge ID from forward and reverse expansion
10. **Node creation**: Creates valid GraphNode objects for all related entities

---

## Contract Compliance Checklist

- [ ] Method signature matches pattern: `expand{EntityType}WithCache()`
- [ ] Step 1: Extract all relationship IDs before edge creation
- [ ] Step 2: Batch preload related entities if cache available
- [ ] Step 3: Create edges with correct direction ('outbound' for owned data)
- [ ] Step 4: Handle reverse lookups with 'inbound' direction (if applicable)
- [ ] Source ID = data owner (not expanding entity ID)
- [ ] Edge IDs use canonical format from `createCanonicalEdgeId()`
- [ ] All entity IDs validated before use
- [ ] Missing/undefined data handled gracefully (no throws)
- [ ] Cache failures logged but don't block expansion
- [ ] API failures logged but don't throw
- [ ] Relationship limits applied correctly
- [ ] Test coverage for all 10 scenarios above

---

**Status**: Active
**Enforcement**: Required for all entity type expansions
