# OpenAlex Relationship Implementation Patterns Research

**Created**: 2025-11-18-130351
**Research Scope**: Edge direction patterns, batch preloading, ID normalization, configurable limits, test strategies
**References**:
- `openalex-relationship-analysis.md` (lines 495-519: bidirectional recommendations)
- `packages/graph/src/providers/openalex-provider.ts` (current implementation)
- `packages/graph/src/types/core.ts` (GraphEdge interface, EdgeDirection type)

---

## 1. Edge Direction Pattern Decision

### Research Findings

**Current State Analysis** (from `openalex-relationship-analysis.md`):
- AUTHORSHIP edges are reversed: Creating Author → Work instead of Work → Author
- Bidirectional inconsistency: Work expansion and author expansion both create Author → Work edges
- Data ownership model in OpenAlex: The entity that owns the relationship array is the source of the edge

**Pattern Options**:

**Option A: Unidirectional with Reverse Lookup Indexing**
- Create edges ONLY from data owner (canonical direction)
- Work owns `authorships[]` → Work → Author (outbound)
- Author query discovers works via reverse API query → creates same Work → Author edge (marked as inbound)
- Prevent duplicates using normalized edge IDs

**Option B: Bidirectional with Direction Metadata**
- Create edges in BOTH directions when discovered
- Work expansion: Work → Author (direction: 'outbound')
- Author expansion: Author → Work (direction: 'outbound' from author's perspective)
- Both edges exist in graph with different semantics

**Option C: Single Canonical Direction with Virtual Reverse Edges**
- Store only canonical direction (Work → Author)
- Graph queries transparently traverse in either direction
- No duplicate storage, but requires query-time logic

### Decision: Option A - Unidirectional with Reverse Lookup Indexing

**Rationale**:
1. **Matches OpenAlex data ownership model**: Edges point FROM entity that owns the relationship data TO referenced entity
2. **Single source of truth**: No duplicate edges with conflicting semantics
3. **Explicit direction metadata**: `direction: 'outbound'` (owned data) vs `direction: 'inbound'` (reverse lookup) enables provenance tracking
4. **Simpler graph algorithms**: Graph traversal algorithms work with single edges, not duplicate bidirectional pairs
5. **Aligns with analysis report recommendation** (lines 512-519): "Option A with proper indexing for reverse lookups"

**Alternatives Considered**:
- **Option B (Bidirectional)**: Rejected due to duplicate edge storage, larger graph size, potential for inconsistency between directions
- **Option C (Virtual edges)**: Rejected due to query-time complexity and performance overhead for large graphs

**Implementation Guidance**:

1. **Canonical Edge Creation**:
```typescript
// Work expansion (data owner)
edges.push({
    id: `${workId}-authorship-${authorId}`, // Canonical ID format
    source: workId,                         // Data owner
    target: authorId,                        // Referenced entity
    type: RelationType.AUTHORSHIP,
    direction: 'outbound',                   // Owned data
})
```

2. **Reverse Lookup Edge Discovery**:
```typescript
// Author expansion (reverse lookup via API)
edges.push({
    id: `${workId}-authorship-${authorId}`, // SAME canonical ID
    source: workId,                         // Still data owner
    target: authorId,                        // Still referenced entity
    type: RelationType.AUTHORSHIP,
    direction: 'inbound',                    // Discovered via reverse lookup
})
```

3. **Duplicate Prevention**:
- Use normalized edge IDs (see Section 3)
- Graph manager checks for existing edge ID before adding
- If edge exists, optionally enrich metadata but don't duplicate

4. **Direction Metadata Semantics**:
- `outbound`: Edge created during expansion of source entity (complete data from OpenAlex)
- `inbound`: Edge discovered during expansion of target entity via reverse API query (may have partial metadata)

---

## 2. Batch Preloading Strategy

### Research Findings

**Current Implementation** (from `packages/graph/src/providers/openalex-provider.ts`):

**Lines 507-532 (Work Expansion)**:
```typescript
// Collect related entity IDs for batch preloading
const relatedIds: string[] = []

const authorships = (workData.authorships as Array<{ author?: { id?: string } }>) || []
for (const authorship of authorships.slice(0, options.limit || 10)) {
    if (authorship.author?.id) {
        relatedIds.push(authorship.author.id)
    }
}

const primaryLocation = (workData.primary_location as { source?: { id?: string } }) || {}
if (primaryLocation.source?.id) {
    relatedIds.push(primaryLocation.source.id)
}

// Batch preload related entities
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

**Pattern Analysis**:
1. **Collection Phase**: Scan entity data to collect all related entity IDs
2. **Batch Preload**: Single call to `batchPreloadEntities()` with all IDs
3. **Context Propagation**: Pass enriched context with depth tracking
4. **Error Resilience**: Failures logged but don't block expansion

**Cache Integration Patterns** (lines 306-331):
```typescript
// Try cache first if available
if (this.cache && this.fieldSelector) {
    try {
        const contextFields = this.fieldSelector.selectFieldsForContext(entityType, context)
        const cachedData = await this.cache.getEntity(id, context, contextFields)

        if (cachedData) {
            this.cacheStats.hits++
            return cachedData
        }
    } catch (error) {
        logger.warn("provider", `Cache lookup failed for ${id}`, { error }, "OpenAlexProvider")
    }
}

// Fallback to direct API call
this.cacheStats.misses++
this.cacheStats.fallbacks++
return this.fetchEntityData(id, entityType)
```

### Decision: Two-Phase Batch Strategy with Context-Aware Field Selection

**Rationale**:
1. **Phase 1 (Collection)**: Scan relationship arrays to collect all referenced entity IDs before any API calls
2. **Phase 2 (Batch Preload)**: Single batch call to populate cache with all related entities
3. **Context-aware fields**: Use `fieldSelector` to request only fields needed for next expansion depth
4. **Fallback resilience**: Cache failures don't block expansion, API calls provide fallback

**Implementation Guidance**:

1. **When to Use Batch Preloading**:
   - **DO use** when expanding entities with known relationship arrays (authorships[], referenced_works[], grants[], lineage[])
   - **DO use** when relationship count > 3 entities (overhead of batch call pays off)
   - **DON'T use** for single-entity relationships (primary_location.source, parent_publisher)
   - **DON'T use** for reverse lookups (API query already batches results)

2. **Batch Size Optimization**:
   - **Small batches** (1-10 entities): Use individual cache lookups (lower latency)
   - **Medium batches** (11-50 entities): Use batch preload (optimal balance)
   - **Large batches** (51+ entities): Split into chunks of 50 to avoid API rate limits

3. **Field Selection Strategy**:
```typescript
// Minimal fields for relationship endpoints (nodes in graph)
const minimalFields = this.fieldSelector.getMinimalFields(entityType)
// ["id", "display_name", "orcid"] for authors

// Expansion fields for next traversal depth (if user might expand further)
const expansionFields = this.fieldSelector.getExpansionFields(entityType, relationType)
// ["last_known_institutions.id", "works_count"] for authors

// Combined context-aware selection
const contextFields = [...minimalFields, ...expansionFields]
```

4. **Error Handling Pattern**:
```typescript
// Graceful degradation: Cache failures don't block expansion
try {
    await this.cache.batchPreloadEntities(relatedIds, context)
} catch (error) {
    logger.warn("provider", "Batch preload failed, falling back to individual fetches", { error })
    // Individual fetchEntityDataWithCache() calls will handle fallback
}
```

**Alternatives Considered**:
- **Lazy loading**: Rejected due to waterfall API requests and poor UX (loading spinners cascade)
- **Individual preloads**: Rejected due to overhead of multiple cache operations
- **Eager full entity fetch**: Rejected due to bandwidth waste (fetching unused fields)

---

## 3. Edge ID Normalization

### Research Findings

**Current Implementation** (from `packages/graph/src/providers/openalex-provider.ts`):

**Lines 551-556 (Work Expansion - Authorship)**:
```typescript
edges.push({
    id: `${workId}-authored-${authorship.author.id}`,
    source: authorship.author.id,  // ❌ WRONG (reversed)
    target: workId,
    type: RelationType.AUTHORSHIP,
    direction: 'outbound',
})
```

**Lines 632-638 (Author Expansion - Authorship)**:
```typescript
edges.push({
    id: `${authorId}-authored-${workRecord.id}`,
    source: authorId,
    target: String(workRecord.id),
    type: RelationType.AUTHORSHIP,
    direction: 'outbound',
})
```

**Problem**: Different edge IDs for same relationship depending on expansion direction:
- Work expansion: `W123-authored-A456`
- Author expansion: `A456-authored-W123`
- Result: Duplicate edges with same semantic meaning

**Graph Manager Deduplication** (from `packages/graph/src/data/graph-manager.ts` lines 105-117):
```typescript
addEdge(edge: GraphEdge): void {
    if (this.options.maxEdges && this.edges.size >= this.options.maxEdges) {
        throw new Error(`Maximum edge limit reached (${this.options.maxEdges})`)
    }

    if (this.edges.has(edge.id)) {
        return // Silent skip if edge already exists
    }

    this.edges.set(edge.id, edge)
    // ... emit events
}
```

**Note**: Graph manager deduplicates by edge ID, so consistent ID format prevents duplicates

### Decision: Canonical ID Format with Sorted Entity IDs

**Rationale**:
1. **Deterministic IDs**: Same relationship always generates same edge ID regardless of discovery direction
2. **Prevents duplicates**: Graph manager's `edges.has(edge.id)` check works correctly
3. **Semantic clarity**: ID format reflects data ownership model (source-relationship-target)
4. **Debugging friendly**: Human-readable format shows relationship structure

**Implementation Guidance**:

1. **Canonical ID Format Pattern**:
```typescript
// Pattern: {sourceId}-{relationshipType}-{targetId}
// Source = entity that owns the relationship data in OpenAlex

// Work → Author (Work owns authorships[])
id: `${workId}-${RelationType.AUTHORSHIP}-${authorId}`
// Example: "W2741809807-AUTHORSHIP-A5017898742"

// Work → Work (Work owns referenced_works[])
id: `${citingWorkId}-${RelationType.REFERENCE}-${citedWorkId}`
// Example: "W123-REFERENCE-W456"

// Author → Institution (Author owns affiliations[])
id: `${authorId}-${RelationType.AFFILIATION}-${institutionId}`
// Example: "A5017898742-AFFILIATION-I4210140050"
```

2. **ID Generation Helper Function**:
```typescript
/**
 * Generate canonical edge ID based on data ownership model
 * @param source Entity that owns the relationship data
 * @param target Entity being referenced
 * @param relationType Type of relationship
 */
function createCanonicalEdgeId(
    source: string,
    target: string,
    relationType: RelationType
): string {
    // Validate IDs (should be OpenAlex IDs: W/A/S/I/P/F/T followed by digits)
    if (!source.match(/^[WASIPFT]\d+$/)) {
        logger.warn("edge", `Invalid source ID format: ${source}`)
    }
    if (!target.match(/^[WASIPFT]\d+$/)) {
        logger.warn("edge", `Invalid target ID format: ${target}`)
    }

    return `${source}-${relationType}-${target}`
}
```

3. **Bidirectional Discovery Problem Solution**:
```typescript
// Work expansion (owns authorships[] data)
const authorshipEdge = {
    id: createCanonicalEdgeId(workId, authorId, RelationType.AUTHORSHIP),
    source: workId,      // Data owner
    target: authorId,     // Referenced entity
    type: RelationType.AUTHORSHIP,
    direction: 'outbound', // Created from owned data
}

// Author expansion (reverse lookup via API)
const sameAuthorshipEdge = {
    id: createCanonicalEdgeId(workId, authorId, RelationType.AUTHORSHIP), // SAME ID
    source: workId,      // Still data owner (not authorId!)
    target: authorId,     // Still referenced entity
    type: RelationType.AUTHORSHIP,
    direction: 'inbound', // Discovered via reverse lookup
}

// Graph manager will reject second edge due to duplicate ID
// No duplicate edges created ✅
```

4. **Special Case: Symmetric Relationships**:
```typescript
// For truly symmetric relationships (e.g., TOPIC_SIBLING), use sorted IDs
function createSymmetricEdgeId(
    entityId1: string,
    entityId2: string,
    relationType: RelationType
): string {
    const [first, second] = [entityId1, entityId2].sort()
    return `${first}-${relationType}-${second}`
}

// Example: Topic siblings (no data ownership direction)
id: createSymmetricEdgeId("T123", "T456", RelationType.TOPIC_SIBLING)
// Always generates: "T123-TOPIC_SIBLING-T456" (sorted order)
```

**Alternatives Considered**:
- **Hash-based IDs**: Rejected due to loss of human readability and debugging difficulty
- **UUID-based IDs**: Rejected due to non-determinism (would create duplicates)
- **Sorted IDs for all relationships**: Rejected because it obscures data ownership direction

---

## 4. Configurable Relationship Limits

### Research Findings

**Current Implementation Patterns** (from grep results):

**Expansion Limits** (`packages/graph/src/providers/openalex-provider.ts`):
```typescript
// Line 509: Work authorships
for (const authorship of authorships.slice(0, options.limit || 10)) {
    // ... create author nodes and edges
}

// Line 597: Author works (via API query)
const works = await this.client.works({
    filter: { author: { id: authorId } },
    per_page: options.limit || 10,
    sort: "publication_year:desc",
})
```

**Search Limits** (`packages/graph/src/providers/openalex-provider.ts` line 189):
```typescript
limit: Math.floor((query.limit || 20) / query.entityTypes.length)
// Splits total limit evenly among entity types
```

**Expansion Options Interface** (`packages/graph/src/providers/base-provider.ts` line 13):
```typescript
export interface ProviderExpansionOptions {
    limit?: number
    // ... other options
}
```

**Default Behaviors**:
- Work authorships: Default 10, hard-sliced before API call
- Author works: Default 10, passed to API `per_page`
- Source works: Default 10, passed to API `per_page`
- Institution authors: Default 10, passed to API `per_page`
- Topic works: Default 10, passed to API `per_page`

### Decision: Relationship-Specific Configurable Limits with Truncation Indicators

**Rationale**:
1. **Performance control**: Prevent memory exhaustion from highly-connected nodes (authors with 1000+ works)
2. **UX optimization**: Smaller initial limits improve graph rendering speed, users can load more on demand
3. **API efficiency**: Limits passed to OpenAlex API reduce bandwidth and response time
4. **Truncation transparency**: Users know when data is incomplete and can request more

**Implementation Guidance**:

1. **Limit Configuration Structure**:
```typescript
export interface ExpansionLimits {
    // Global default (applies to all relationships if not overridden)
    default?: number // Default: 10

    // Relationship-specific limits
    authorships?: number      // Work → Authors (default: 10)
    references?: number        // Work → Cited Works (default: 20)
    citations?: number         // Work → Citing Works (default: 50, expensive query)
    grants?: number            // Work → Funders (default: 5)
    topics?: number            // Work → Topics (default: 10)
    authorWorks?: number       // Author → Works (default: 20)
    affiliations?: number      // Author → Institutions (default: 10)
    lineage?: number           // Institution → Parents (default: 5)
    siblings?: number          // Topic → Sibling Topics (default: 10)
}

export interface ProviderExpansionOptions {
    limits?: ExpansionLimits
    // Legacy single limit (for backwards compatibility)
    limit?: number
}
```

2. **Limit Application Pattern**:
```typescript
function getRelationshipLimit(
    options: ProviderExpansionOptions,
    relationship: keyof ExpansionLimits
): number {
    // Priority: relationship-specific > global default > fallback default
    return options.limits?.[relationship]
        ?? options.limits?.default
        ?? options.limit
        ?? 10
}

// Usage in Work expansion
const authorshipLimit = getRelationshipLimit(options, 'authorships')
for (const authorship of authorships.slice(0, authorshipLimit)) {
    // ... create edges
}

const referencesLimit = getRelationshipLimit(options, 'references')
for (const refWorkId of referencedWorks.slice(0, referencesLimit)) {
    // ... create citation edges
}
```

3. **Truncation Metadata Pattern**:
```typescript
// Add to GraphExpansion metadata
return {
    nodes,
    edges,
    metadata: {
        expandedFrom: nodeId,
        depth: 1,
        totalFound: nodes.length,
        options,
        truncated: {
            authorships: authorships.length > authorshipLimit
                ? { total: authorships.length, shown: authorshipLimit }
                : undefined,
            references: referencedWorks.length > referencesLimit
                ? { total: referencedWorks.length, shown: referencesLimit }
                : undefined,
        },
        cacheStats: this.cacheStats,
    },
}
```

4. **UI Truncation Indicators**:
```typescript
// Example metadata structure for UI consumption
interface TruncationInfo {
    total: number      // Total available in OpenAlex
    shown: number      // Number included in expansion
    hasMore: boolean   // Convenience flag
}

// UI can render: "Showing 10 of 45 authors (load more...)"
```

5. **Pagination Support (Future Enhancement)**:
```typescript
export interface ProviderExpansionOptions {
    limits?: ExpansionLimits
    offset?: number // Start position for each relationship type
    // Example: { authorships: 10, offset: 10 } fetches authors 11-20
}
```

6. **Recommended Defaults by Relationship Type**:
```typescript
const RECOMMENDED_LIMITS: ExpansionLimits = {
    default: 10,

    // Works relationships
    authorships: 10,      // Most works have < 10 authors
    references: 20,       // Citation networks need more depth
    citations: 50,        // Reverse citations can be large (expensive query)
    grants: 5,            // Most works have 1-3 funders
    topics: 10,           // Works typically have 3-5 topics

    // Author relationships
    authorWorks: 20,      // Show recent works
    affiliations: 10,     // Career progression

    // Hierarchies (usually small)
    lineage: 5,           // Institution/publisher parents
    siblings: 10,         // Related topics

    // High-volume relationships (need aggressive limits)
    institutionAuthors: 50,   // Universities have 1000s of authors
    sourceWorks: 50,          // Journals have 1000s of works
    funderWorks: 100,         // Large funders support 1000s of works
}
```

**Alternatives Considered**:
- **Hard-coded limits**: Rejected due to inflexibility for different use cases
- **Unlimited expansion**: Rejected due to memory and performance risks
- **Auto-adaptive limits**: Rejected due to implementation complexity (could be future enhancement)

---

## 5. Test Strategy for Direction Correctness

### Research Findings

**Existing Test Patterns** (from test file analysis):

**Direction Field Tests** (`packages/graph/src/types/core.test.ts` lines 52-133):
```typescript
it('should have direction field with correct type', () => {
    const outboundEdge: GraphEdge = {
        id: 'edge1',
        source: 'W123',
        target: 'A456',
        type: RelationType.AUTHORSHIP,
        direction: 'outbound',
    }

    const inboundEdge: GraphEdge = {
        id: 'edge2',
        source: 'W789',
        target: 'A456',
        type: RelationType.AUTHORSHIP,
        direction: 'inbound',
    }

    expect(outboundEdge.direction).toBe('outbound')
    expect(inboundEdge.direction).toBe('inbound')
})
```

**Provider Test Structure** (`packages/graph/src/providers/openalex-provider.unit.test.ts`):
- Uses mock OpenAlex client with pre-configured responses
- Tests entity fetching, search, expansion
- Verifies edge creation for different entity types
- Uses fake timers for timing tests

**Integration Test Patterns** (`packages/graph/src/__tests__/examples/02-entity-resolution/work-workflow.integration.test.ts`):
- Real-world workflow simulation (fetch work → expand → verify relationships)
- Tests with actual OpenAlex IDs (e.g., W2741809807)
- Verifies node counts, edge counts, relationship types

### Decision: Red-Green-Refactor with Direction-Specific Assertions

**Rationale**:
1. **Test-first approach**: Write failing tests for correct direction BEFORE implementing fixes
2. **Regression prevention**: Tests ensure direction bugs don't reoccur
3. **Relationship-specific tests**: Each relationship type has dedicated direction test
4. **Bidirectional consistency**: Tests verify no duplicate edges from both discovery directions

**Implementation Guidance**:

1. **Red Phase - Write Failing Tests**:
```typescript
describe('OpenAlexProvider - Edge Direction Correctness', () => {
    describe('AUTHORSHIP direction', () => {
        it('should create Work → Author edges when expanding works', async () => {
            // Given: Mock work with authorships
            mockClient.getWork.mockResolvedValue({
                id: 'W2741809807',
                authorships: [
                    { author: { id: 'A5017898742', display_name: 'Test Author' } }
                ],
            })

            // When: Expand work
            const expansion = await provider.expandEntity('W2741809807', {})

            // Then: Edge should be Work → Author
            const authorshipEdge = expansion.edges.find(e => e.type === RelationType.AUTHORSHIP)
            expect(authorshipEdge).toBeDefined()
            expect(authorshipEdge!.source).toBe('W2741809807')  // Work is source
            expect(authorshipEdge!.target).toBe('A5017898742')  // Author is target
            expect(authorshipEdge!.direction).toBe('outbound')  // Data ownership
        })

        it('should create Work → Author edges when expanding authors (reverse lookup)', async () => {
            // Given: Mock author with works via API query
            mockClient.getAuthor.mockResolvedValue({
                id: 'A5017898742',
                display_name: 'Test Author',
            })
            mockClient.works.mockResolvedValue({
                results: [
                    { id: 'W2741809807', title: 'Test Work' }
                ]
            })

            // When: Expand author
            const expansion = await provider.expandEntity('A5017898742', {})

            // Then: Edge should STILL be Work → Author (canonical direction)
            const authorshipEdge = expansion.edges.find(e => e.type === RelationType.AUTHORSHIP)
            expect(authorshipEdge).toBeDefined()
            expect(authorshipEdge!.source).toBe('W2741809807')  // Work is source (NOT author!)
            expect(authorshipEdge!.target).toBe('A5017898742')  // Author is target
            expect(authorshipEdge!.direction).toBe('inbound')   // Reverse lookup
        })

        it('should not create duplicate edges when expanding both work and author', async () => {
            // Given: Mock work and author with relationship
            mockClient.getWork.mockResolvedValue({
                id: 'W2741809807',
                authorships: [{ author: { id: 'A5017898742' } }],
            })
            mockClient.getAuthor.mockResolvedValue({ id: 'A5017898742' })
            mockClient.works.mockResolvedValue({
                results: [{ id: 'W2741809807' }]
            })

            // When: Expand work, then expand author
            const workExpansion = await provider.expandEntity('W2741809807', {})
            const authorExpansion = await provider.expandEntity('A5017898742', {})

            // Then: Should have consistent edge IDs (deduplication)
            const workEdgeId = workExpansion.edges.find(e => e.type === RelationType.AUTHORSHIP)?.id
            const authorEdgeId = authorExpansion.edges.find(e => e.type === RelationType.AUTHORSHIP)?.id

            expect(workEdgeId).toBe(authorEdgeId)  // Same canonical ID
            expect(workEdgeId).toBe('W2741809807-AUTHORSHIP-A5017898742')
        })
    })

    describe('REFERENCE direction (citations)', () => {
        it('should create citing Work → cited Work edges', async () => {
            // Given: Work with references
            mockClient.getWork.mockResolvedValue({
                id: 'W123',
                referenced_works: ['W456', 'W789'],
            })

            // When: Expand work
            const expansion = await provider.expandEntity('W123', {})

            // Then: Edges should be citing → cited
            const refEdges = expansion.edges.filter(e => e.type === RelationType.REFERENCE)
            expect(refEdges).toHaveLength(2)
            expect(refEdges[0].source).toBe('W123')  // Citing work
            expect(refEdges[0].target).toBe('W456')  // Cited work
            expect(refEdges[1].source).toBe('W123')
            expect(refEdges[1].target).toBe('W789')
        })
    })

    describe('FUNDED_BY direction', () => {
        it('should create Work → Funder edges from grants', async () => {
            // Given: Work with funding
            mockClient.getWork.mockResolvedValue({
                id: 'W234',
                grants: [
                    { funder: 'F567', award_id: 'NSF-123' },
                    { funder: 'F890', award_id: 'NIH-456' },
                ],
            })

            // When: Expand work
            const expansion = await provider.expandEntity('W234', {})

            // Then: Edges should be Work → Funder
            const fundingEdges = expansion.edges.filter(e => e.type === RelationType.FUNDED_BY)
            expect(fundingEdges).toHaveLength(2)
            expect(fundingEdges[0].source).toBe('W234')   // Work
            expect(fundingEdges[0].target).toBe('F567')   // Funder
            expect(fundingEdges[0].metadata?.award_id).toBe('NSF-123')
        })
    })

    describe('TOPIC_PART_OF_FIELD direction', () => {
        it('should create Topic → Field → Domain hierarchy edges', async () => {
            // Given: Topic with field and domain
            mockClient.get.mockResolvedValue({
                id: 'T123',
                display_name: 'Machine Learning',
                field: { id: 'F456', display_name: 'Computer Science' },
                domain: { id: 'D789', display_name: 'Engineering' },
            })

            // When: Expand topic
            const expansion = await provider.expandEntity('T123', {})

            // Then: Should create hierarchical edges
            const topicToField = expansion.edges.find(
                e => e.type === RelationType.TOPIC_PART_OF_FIELD && e.source === 'T123'
            )
            const fieldToDomain = expansion.edges.find(
                e => e.type === RelationType.FIELD_PART_OF_DOMAIN && e.source === 'F456'
            )

            expect(topicToField?.target).toBe('F456')
            expect(fieldToDomain?.target).toBe('D789')
        })
    })

    describe('LINEAGE direction', () => {
        it('should create Institution → Parent edges from lineage array', async () => {
            // Given: Institution with hierarchy
            mockClient.getInstitution.mockResolvedValue({
                id: 'I123',
                display_name: 'Computer Science Department',
                lineage: ['I456', 'I789'],  // [University, University System]
            })

            // When: Expand institution
            const expansion = await provider.expandEntity('I123', {})

            // Then: Edges should form hierarchy chain
            const lineageEdges = expansion.edges.filter(e => e.type === RelationType.LINEAGE)
            expect(lineageEdges).toHaveLength(2)
            expect(lineageEdges[0].source).toBe('I123')  // Department
            expect(lineageEdges[0].target).toBe('I456')  // University
            expect(lineageEdges[1].source).toBe('I123')
            expect(lineageEdges[1].target).toBe('I789')  // System
        })
    })
})
```

2. **Green Phase - Implement Fixes**:
```typescript
// Fix AUTHORSHIP in expandWorkWithCache()
for (const authorship of authorships.slice(0, authorshipLimit)) {
    edges.push({
        id: createCanonicalEdgeId(workId, authorship.author.id, RelationType.AUTHORSHIP),
        source: workId,              // ✅ FIXED: Work is source
        target: authorship.author.id, // ✅ FIXED: Author is target
        type: RelationType.AUTHORSHIP,
        direction: 'outbound',        // Data ownership
    })
}

// Fix AUTHORSHIP in expandAuthorWithCache()
for (const work of workResults) {
    edges.push({
        id: createCanonicalEdgeId(work.id, authorId, RelationType.AUTHORSHIP),
        source: work.id,      // ✅ FIXED: Work is source (not authorId!)
        target: authorId,      // ✅ FIXED: Author is target
        type: RelationType.AUTHORSHIP,
        direction: 'inbound',  // ✅ Reverse lookup
    })
}
```

3. **Refactor Phase - Extract Common Patterns**:
```typescript
// Helper function to create relationship edges
function createRelationshipEdges(
    sourceId: string,
    targetIds: string[],
    relationType: RelationType,
    direction: EdgeDirection,
    metadataFn?: (targetId: string) => Record<string, unknown>
): GraphEdge[] {
    return targetIds.map(targetId => ({
        id: createCanonicalEdgeId(sourceId, targetId, relationType),
        source: sourceId,
        target: targetId,
        type: relationType,
        direction,
        metadata: metadataFn?.(targetId),
    }))
}

// Usage
const authorshipEdges = createRelationshipEdges(
    workId,
    authorships.map(a => a.author.id).filter(Boolean),
    RelationType.AUTHORSHIP,
    'outbound'
)
edges.push(...authorshipEdges)
```

4. **Regression Test Pattern**:
```typescript
describe('Regression: Issue #015 - AUTHORSHIP direction bug', () => {
    it('should never create Author → Work edges', async () => {
        // Regression test for original bug
        const expansion = await provider.expandEntity('W2741809807', {})

        const authorshipEdges = expansion.edges.filter(e => e.type === RelationType.AUTHORSHIP)

        for (const edge of authorshipEdges) {
            // Assert: Source must be Work ID (starts with 'W')
            expect(edge.source).toMatch(/^W\d+$/)
            // Assert: Target must be Author ID (starts with 'A')
            expect(edge.target).toMatch(/^A\d+$/)
            // Assert: Direction must be 'outbound' for work expansion
            expect(edge.direction).toBe('outbound')
        }
    })
})
```

5. **Integration Test Coverage**:
```typescript
describe('End-to-End Relationship Direction Tests', () => {
    it('demonstrates correct citation network topology', async () => {
        // Given: Real citation chain W1 → W2 → W3
        const w1 = await provider.fetchEntity('W1')
        const w2 = await provider.fetchEntity('W2')
        const w3 = await provider.fetchEntity('W3')

        // When: Expand all three works
        const exp1 = await provider.expandEntity('W1', {})
        const exp2 = await provider.expandEntity('W2', {})
        const exp3 = await provider.expandEntity('W3', {})

        // Then: Citation edges should form directed chain
        const citeW2 = exp1.edges.find(e => e.target === 'W2')
        const citeW3 = exp2.edges.find(e => e.target === 'W3')

        expect(citeW2?.source).toBe('W1')  // W1 cites W2
        expect(citeW3?.source).toBe('W2')  // W2 cites W3
    })
})
```

**Alternatives Considered**:
- **Snapshot testing**: Rejected due to brittleness (OpenAlex data changes)
- **Visual graph inspection**: Rejected due to lack of automation and regression protection
- **Property-based testing**: Considered for future enhancement (generate random graphs, verify properties)

---

## Summary and Implementation Roadmap

### Key Decisions

1. **Edge Direction**: Unidirectional with reverse lookup indexing (Option A)
   - Canonical direction follows OpenAlex data ownership model
   - Direction metadata ('outbound'/'inbound') tracks data provenance
   - Prevents duplicate edges via normalized IDs

2. **Batch Preloading**: Two-phase strategy with context-aware field selection
   - Phase 1: Collect all related IDs from relationship arrays
   - Phase 2: Single batch call to populate cache
   - Use for medium batches (11-50 entities), skip for single entities

3. **Edge ID Normalization**: Canonical format with data owner as source
   - Format: `{sourceId}-{relationshipType}-{targetId}`
   - Helper: `createCanonicalEdgeId()` ensures consistency
   - Symmetric relationships use sorted IDs

4. **Configurable Limits**: Relationship-specific limits with truncation metadata
   - Default 10, adjustable per relationship type
   - Truncation indicators in expansion metadata
   - Recommended defaults: authorships=10, references=20, citations=50

5. **Test Strategy**: Red-Green-Refactor with direction-specific assertions
   - Write failing tests for each relationship type
   - Test both forward and reverse discovery
   - Regression tests prevent bug recurrence

### Implementation Order

**Phase 1: Critical Fixes** (Breaking Changes)
1. Implement `createCanonicalEdgeId()` helper
2. Fix AUTHORSHIP direction in `expandWorkWithCache()`
3. Fix AUTHORSHIP direction in `expandAuthorWithCache()`
4. Add direction tests for AUTHORSHIP
5. Update RelationType enum with missing types (FIELD_PART_OF_DOMAIN, etc.)

**Phase 2: High-Value Relationships**
1. Implement REFERENCE (citations) with direction tests
2. Implement FUNDED_BY (grants) with direction tests
3. Implement TOPIC_PART_OF_FIELD hierarchy with tests
4. Implement LINEAGE (institutions) with tests

**Phase 3: Infrastructure Enhancements**
1. Implement configurable ExpansionLimits interface
2. Add truncation metadata to GraphExpansion
3. Enhance batch preloading with size optimization
4. Add relationship-specific field selection

**Phase 4: Additional Relationships**
1. HOST_ORGANIZATION (sources → publishers)
2. PUBLISHER_CHILD_OF (publisher hierarchies)
3. WORK_HAS_KEYWORD
4. AUTHOR_RESEARCHES

### References

- **Analysis Report**: `openalex-relationship-analysis.md` (lines 495-519: bidirectional recommendations, lines 213-293: critical errors)
- **Current Implementation**: `packages/graph/src/providers/openalex-provider.ts` (lines 497-827: expansion methods)
- **Type Definitions**: `packages/graph/src/types/core.ts` (lines 100-115: GraphEdge, EdgeDirection)
- **Test Examples**: `packages/graph/src/providers/openalex-provider.unit.test.ts` (unit test patterns)
- **Batch Loading**: `packages/graph/src/providers/openalex-provider.ts` (lines 507-532: batch preload pattern)

---

**Document Status**: Complete
**Next Step**: Use findings to implement fixes in `openalex-provider.ts` following test-first approach
