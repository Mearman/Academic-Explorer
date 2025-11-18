# Developer Quickstart: OpenAlex Relationships Feature

**Last Updated**: 2025-11-18
**Estimated Reading Time**: 10 minutes
**Target Audience**: TypeScript developers familiar with graph data structures

## 5-Minute Overview

### What This Feature Does

This feature implements correct handling of ALL academic relationships in the OpenAlex knowledge graph, fixing critical bugs in edge direction and adding missing relationship types.

**Problem Solved**:
- ❌ **Before**: AUTHORSHIP edges reversed (Author → Work instead of Work → Author)
- ❌ **Before**: Missing 80% of relationships (citations, funding, hierarchies)
- ❌ **Before**: Duplicate edges when expanding from both sides

**Solution Delivered**:
- ✅ **After**: Correct edge direction following OpenAlex data ownership model
- ✅ **After**: Complete relationship coverage (citations, funding, taxonomies, hierarchies)
- ✅ **After**: Bidirectional consistency with deduplication

### Why It Matters

Academic graphs are fundamentally about **relationships**. Incorrect edge direction breaks:
- Citation network analysis (can't trace knowledge flow)
- Collaboration pattern discovery (authors disconnected from works)
- Funding impact assessment (works disconnected from funders)
- Topic taxonomy navigation (broken hierarchies)

This feature ensures the graph accurately represents the academic knowledge network.

---

## Prerequisites

### Required Knowledge

1. **TypeScript**: Interfaces, type guards, `unknown` types, async/await
2. **Graph Theory**: Nodes, edges, directed graphs, graph traversal
3. **OpenAlex API**: Entity types (works, authors, sources, etc.), relationship arrays
4. **Academic Domain**: Citations, authorships, affiliations

### Files to Read First (In Order)

1. **[`data-model.md`](./data-model.md)** (30 min) - Complete entity/edge structures and validation rules
2. **[`research.md`](./research.md)** (20 min) - Edge direction patterns and implementation decisions
3. **[`contracts/edge-creation.contract.md`](./contracts/edge-creation.contract.md)** (10 min) - Edge creation interface
4. **[`spec.md`](./spec.md)** (15 min) - User stories and acceptance criteria

**Total Reading**: ~75 minutes for complete context

---

## Key Files Modified

| File | Purpose | Changes |
|------|---------|---------|
| **`packages/graph/src/providers/openalex-provider.ts`** | Main provider implementation | Fixed AUTHORSHIP direction (lines 550-556, 632-638), added missing relationships |
| **`packages/graph/src/types/core.ts`** | Type definitions | Added missing `RelationType` enum values (`FIELD_PART_OF_DOMAIN`, `TOPIC_SIBLING`, etc.) |
| **`packages/graph/src/providers/openalex-provider.unit.test.ts`** | Unit tests | Added direction tests for all relationship types |
| **`packages/graph/src/__tests__/examples/`** | Integration tests | Added bidirectional consistency tests |

---

## Quick Start Commands

### Run All Graph Tests

```bash
# From repository root
pnpm test packages/graph

# Expected: All tests pass (serial execution, ~2 min)
```

### Type Check Graph Package

```bash
pnpm nx typecheck graph

# Expected: Zero TypeScript errors
```

### Test Single Relationship Type

```bash
# Test only AUTHORSHIP direction
pnpm test packages/graph -- --testNamePattern="AUTHORSHIP"

# Test all direction correctness
pnpm test packages/graph -- --testNamePattern="direction"
```

### Run Integration Tests

```bash
# Full workflow tests (work expansion → author expansion)
pnpm test packages/graph -- --testPathPattern="integration"
```

### Watch Mode (Development)

```bash
# Auto-run tests on file changes
pnpm test packages/graph -- --watch
```

---

## Common Tasks

### Task 1: Adding a New Relationship Type

**Scenario**: Add support for `KEYWORD` relationship (Work → Keyword)

**Steps**:

#### 1. Add RelationType enum value

**File**: `packages/graph/src/types/core.ts`

```typescript
export enum RelationType {
  // Existing relationships...
  WORK_HAS_KEYWORD = "work_has_keyword",  // Add this line
}
```

#### 2. Write failing test (Red phase)

**File**: `packages/graph/src/providers/openalex-provider.unit.test.ts`

```typescript
describe('WORK_HAS_KEYWORD direction', () => {
  it('should create Work → Keyword edges from keywords array', async () => {
    // Given: Mock work with keywords
    mockClient.getWork.mockResolvedValue({
      id: 'W123',
      keywords: [
        { id: 'K1', display_name: 'Machine Learning' },
        { id: 'K2', display_name: 'Neural Networks' }
      ]
    })

    // When: Expand work
    const expansion = await provider.expandEntity('W123', {})

    // Then: Edges should be Work → Keyword
    const keywordEdges = expansion.edges.filter(
      e => e.type === RelationType.WORK_HAS_KEYWORD
    )

    expect(keywordEdges).toHaveLength(2)
    expect(keywordEdges[0].source).toBe('W123')  // Work
    expect(keywordEdges[0].target).toBe('K1')    // Keyword
    expect(keywordEdges[0].direction).toBe('outbound')
  })
})
```

Run test: `pnpm test packages/graph -- --testNamePattern="WORK_HAS_KEYWORD"`

**Expected**: ❌ Test fails (relationship not implemented yet)

#### 3. Implement edge creation (Green phase)

**File**: `packages/graph/src/providers/openalex-provider.ts`

```typescript
private async expandWorkWithCache(
  workId: string,
  workData: Record<string, unknown>,
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: ProviderExpansionOptions,
  context: CacheContext
): Promise<void> {
  // ... existing authorships, references code ...

  // Add keyword edges
  const keywords = (workData.keywords as Array<{ id?: string; display_name?: string }>) || []

  for (const keyword of keywords.slice(0, options.limit || 10)) {
    if (!keyword.id || !validateOpenAlexId(keyword.id)) {
      logger.warn('relationships', 'Invalid keyword ID', { workId, keyword })
      continue
    }

    // Create edge
    edges.push({
      id: createCanonicalEdgeId(workId, keyword.id, RelationType.WORK_HAS_KEYWORD),
      source: workId,           // Work owns keywords[]
      target: keyword.id,
      type: RelationType.WORK_HAS_KEYWORD,
      direction: 'outbound'
    })

    // Create keyword node
    nodes.push({
      id: keyword.id,
      entityType: 'keywords',
      entityId: keyword.id,
      label: keyword.display_name || 'Unknown Keyword',
      x: Math.random() * 800,
      y: Math.random() * 600,
      entityData: keyword
    })
  }
}
```

Run test: `pnpm test packages/graph -- --testNamePattern="WORK_HAS_KEYWORD"`

**Expected**: ✅ Test passes

#### 4. Add contract documentation

**File**: `contracts/edge-creation.contract.md`

Add example implementation:

```typescript
### WORK_HAS_KEYWORD Edges (Work → Keyword)

function createKeywordEdges(
  workId: string,
  keywords: unknown
): GraphEdge[] {
  const edges: GraphEdge[] = []
  const keywordsArray = (keywords as Array<{ id?: string }>) || []

  for (const keyword of keywordsArray) {
    if (!keyword.id || !validateOpenAlexId(keyword.id)) {
      logger.warn('relationships', `Invalid keyword ID`, { workId })
      continue
    }

    edges.push({
      id: createCanonicalEdgeId(workId, keyword.id, RelationType.WORK_HAS_KEYWORD),
      source: workId,
      target: keyword.id,
      type: RelationType.WORK_HAS_KEYWORD,
      direction: 'outbound'
    })
  }

  return edges
}
```

---

### Task 2: Fixing Edge Direction

**Scenario**: Fix AFFILIATION edge direction (currently reversed)

#### 1. Write regression test

**File**: `packages/graph/src/providers/openalex-provider.unit.test.ts`

```typescript
describe('Regression: AFFILIATION direction bug', () => {
  it('should never create Institution → Author edges', async () => {
    // Given: Mock author with affiliations
    mockClient.getAuthor.mockResolvedValue({
      id: 'A123',
      affiliations: [
        { institution: { id: 'I456', display_name: 'University' } }
      ]
    })

    // When: Expand author
    const expansion = await provider.expandEntity('A123', {})

    // Then: All affiliation edges must be Author → Institution
    const affiliationEdges = expansion.edges.filter(
      e => e.type === RelationType.AFFILIATION
    )

    for (const edge of affiliationEdges) {
      expect(edge.source).toMatch(/^A\d+$/)  // Author ID
      expect(edge.target).toMatch(/^I\d+$/)  // Institution ID
      expect(edge.direction).toBe('outbound')
    }
  })
})
```

Run: `pnpm test packages/graph -- --testNamePattern="AFFILIATION direction"`

**Expected**: ❌ Fails if direction is wrong

#### 2. Fix implementation

**File**: `packages/graph/src/providers/openalex-provider.ts`

```typescript
// Find expandAuthorWithCache() method
private async expandAuthorWithCache(...) {
  // Change this:
  edges.push({
    source: institutionId,  // ❌ WRONG
    target: authorId
  })

  // To this:
  edges.push({
    id: createCanonicalEdgeId(authorId, institutionId, RelationType.AFFILIATION),
    source: authorId,        // ✅ CORRECT (author owns affiliations[])
    target: institutionId,
    type: RelationType.AFFILIATION,
    direction: 'outbound'
  })
}
```

Run: `pnpm test packages/graph`

**Expected**: ✅ All tests pass

---

### Task 3: Testing Relationship Expansion

**Scenario**: Test that work expansion includes all relationship types

#### Integration Test Example

**File**: `packages/graph/src/__tests__/examples/work-relationships.integration.test.ts`

```typescript
import { OpenAlexGraphProvider } from '../../providers/openalex-provider'
import { RelationType } from '../../types/core'

describe('Work Relationship Expansion (Integration)', () => {
  let provider: OpenAlexGraphProvider

  beforeEach(() => {
    // Setup provider with real or mock client
    provider = new OpenAlexGraphProvider(mockClient)
  })

  it('expands work with all relationship types', async () => {
    // Given: Work with authorships, citations, funding, topics
    const workId = 'W2741809807'

    // When: Expand work
    const expansion = await provider.expandEntity(workId, { limit: 50 })

    // Then: Should have all relationship types
    const edgeTypes = new Set(expansion.edges.map(e => e.type))

    expect(edgeTypes).toContain(RelationType.AUTHORSHIP)    // Authors
    expect(edgeTypes).toContain(RelationType.REFERENCE)     // Citations
    expect(edgeTypes).toContain(RelationType.FUNDED_BY)     // Funding
    expect(edgeTypes).toContain(RelationType.TOPIC)         // Topics
    expect(edgeTypes).toContain(RelationType.PUBLICATION)   // Source

    // All AUTHORSHIP edges should be Work → Author
    const authorshipEdges = expansion.edges.filter(
      e => e.type === RelationType.AUTHORSHIP
    )

    for (const edge of authorshipEdges) {
      expect(edge.source).toBe(workId)
      expect(edge.target).toMatch(/^A\d+$/)
      expect(edge.direction).toBe('outbound')
    }
  })

  it('prevents duplicate edges when expanding work and author', async () => {
    // Given: Work W123 authored by Author A456
    const workId = 'W123'
    const authorId = 'A456'

    // When: Expand work, then expand author
    const workExpansion = await provider.expandEntity(workId, {})
    const authorExpansion = await provider.expandEntity(authorId, {})

    // Then: Should have same edge ID from both directions
    const workEdge = workExpansion.edges.find(
      e => e.type === RelationType.AUTHORSHIP && e.target === authorId
    )

    const authorEdge = authorExpansion.edges.find(
      e => e.type === RelationType.AUTHORSHIP && e.source === workId
    )

    expect(workEdge).toBeDefined()
    expect(authorEdge).toBeDefined()
    expect(workEdge!.id).toBe(authorEdge!.id)  // Same canonical ID

    // Directions should differ
    expect(workEdge!.direction).toBe('outbound')
    expect(authorEdge!.direction).toBe('inbound')
  })
})
```

---

## Debugging Tips

### Issue: Edges Created in Wrong Direction

**Symptom**: Tests fail with error like `Expected 'W123' but got 'A456'`

**Debugging Steps**:

1. **Check edge creation code**:
   ```typescript
   // Look for this pattern (WRONG):
   edges.push({
     source: relatedEntityId,  // ❌ Related entity as source
     target: expandingEntityId
   })

   // Should be:
   edges.push({
     source: expandingEntityId,  // ✅ Expanding entity owns data
     target: relatedEntityId
   })
   ```

2. **Verify data ownership**: Which entity owns the relationship array in OpenAlex?
   - If expanding Work and using `workData.authorships[]` → Work owns data → Work is source
   - If expanding Author via reverse lookup → Work still owns data → Work is still source

3. **Check canonical ID generation**:
   ```typescript
   // Add debug logging
   const edgeId = createCanonicalEdgeId(source, target, relationType)
   console.log('Edge ID:', edgeId, { source, target, relationType })
   ```

### Issue: Duplicate Edges Created

**Symptom**: Graph has multiple edges with same source/target/type

**Debugging Steps**:

1. **Check edge ID format**:
   ```typescript
   // Print all edge IDs during expansion
   edges.forEach(edge => {
     console.log('Created edge:', edge.id, {
       source: edge.source,
       target: edge.target,
       direction: edge.direction
     })
   })
   ```

2. **Verify deduplication logic**:
   ```typescript
   // Check if GraphManager is preventing duplicates
   const manager = new GraphManager()
   manager.addEdge(edge1)
   manager.addEdge(edge2)  // Should skip if edge1.id === edge2.id
   console.log('Total edges:', manager.getEdges().length)
   ```

3. **Look for inconsistent ID generation**:
   ```typescript
   // These should produce SAME ID:
   const id1 = createCanonicalEdgeId('W123', 'A456', RelationType.AUTHORSHIP)
   const id2 = createCanonicalEdgeId('W123', 'A456', RelationType.AUTHORSHIP)
   console.assert(id1 === id2, 'IDs must be identical')
   ```

### Issue: Missing Relationships

**Symptom**: Expansion returns fewer edges than expected

**Debugging Steps**:

1. **Check relationship array extraction**:
   ```typescript
   // Add logging before iteration
   const authorships = (workData.authorships as Array<unknown>) || []
   console.log('Authorships found:', authorships.length, authorships)
   ```

2. **Verify validation logic**:
   ```typescript
   // Check if IDs are being skipped
   for (const authorship of authorships) {
     if (!authorship.author?.id) {
       console.warn('Skipped: missing author.id', authorship)
       continue
     }

     if (!validateOpenAlexId(authorship.author.id)) {
       console.warn('Skipped: invalid ID', authorship.author.id)
       continue
     }

     // Edge creation here
   }
   ```

3. **Check expansion limits**:
   ```typescript
   // Verify limit is not too restrictive
   const authorshipLimit = options.limit || 10
   console.log('Limiting authorships to:', authorshipLimit)
   ```

### Common Error Messages

| Error Message | Cause | Fix |
|---------------|-------|-----|
| `Invalid source ID format: undefined` | Missing entity ID in relationship data | Add null check before edge creation |
| `Expected 'W123' but got 'A456'` | Reversed edge direction | Swap source and target in edge creation |
| `Maximum edge limit reached` | Too many relationships | Increase `options.limit` or apply chunking |
| `Cache lookup failed` | IndexedDB quota exceeded | Clear cache or increase quota |

### Tracing Edge Creation Flow

Add logging at each stage:

```typescript
private async expandWorkWithCache(...) {
  console.log('1. Starting work expansion:', workId)

  const authorships = (workData.authorships as Array<unknown>) || []
  console.log('2. Found authorships:', authorships.length)

  for (const authorship of authorships) {
    console.log('3. Processing authorship:', authorship.author?.id)

    if (!validateOpenAlexId(authorship.author?.id)) {
      console.log('4. SKIPPED: Invalid ID')
      continue
    }

    const edge = {
      id: createCanonicalEdgeId(workId, authorship.author.id, RelationType.AUTHORSHIP),
      source: workId,
      target: authorship.author.id,
      type: RelationType.AUTHORSHIP,
      direction: 'outbound'
    }

    console.log('5. Created edge:', edge.id)
    edges.push(edge)
  }

  console.log('6. Total edges created:', edges.length)
}
```

---

## Next Steps

### After Completing Quickstart

1. **Read Full Specification**: [`spec.md`](./spec.md) - All user stories and acceptance criteria
2. **Study Data Model**: [`data-model.md`](./data-model.md) - Complete entity/edge schemas
3. **Review Research Findings**: [`research.md`](./research.md) - Implementation patterns and decisions
4. **Explore Contracts**: [`contracts/`](./contracts/) - Interface contracts for edge creation, expansion, validation

### Contributing to This Feature

1. **Pick a User Story**: See [`spec.md`](./spec.md) Section "User Scenarios & Testing"
2. **Write Tests First**: Follow Red-Green-Refactor cycle
3. **Implement Edge Creation**: Use contract patterns from [`contracts/edge-creation.contract.md`](./contracts/edge-creation.contract.md)
4. **Add Integration Tests**: Verify bidirectional consistency
5. **Update Documentation**: Add examples to contracts and data model

### Related Features

- **Storage Abstraction** (Spec 001): Catalogue storage provider interface
- **Graph Rendering Abstraction** (Spec 009): Renderer-agnostic graph visualization
- **History Catalogue Tracking** (Spec 012): Visit history for expanded entities

---

## Quick Reference

### Key Principles

1. **Data Ownership Rule**: Source entity = entity that owns the relationship array in OpenAlex
2. **Bidirectional Consistency**: Same edge ID regardless of discovery direction
3. **Direction Metadata**: `outbound` = owned data, `inbound` = reverse lookup
4. **Validation First**: Always validate entity IDs before creating edges
5. **Error Recovery**: Skip invalid relationships, log warnings, never throw

### Common Patterns

#### Safe Relationship Extraction

```typescript
const authorships = (workData.authorships as Array<{ author?: { id?: string } }>) || []

for (const authorship of authorships.slice(0, options.limit || 10)) {
  if (!authorship.author?.id || !validateOpenAlexId(authorship.author.id)) {
    continue
  }

  // Safe to use authorship.author.id
}
```

#### Canonical Edge Creation

```typescript
edges.push({
  id: createCanonicalEdgeId(sourceId, targetId, relationType),
  source: sourceId,      // Data owner
  target: targetId,
  type: relationType,
  direction: 'outbound'  // For owned data
})
```

#### Batch Preloading

```typescript
// Collect IDs
const relatedIds: string[] = []
for (const item of relationshipArray) {
  if (item.id && validateOpenAlexId(item.id)) {
    relatedIds.push(item.id)
  }
}

// Batch preload
if (this.cache && relatedIds.length > 0) {
  try {
    await this.cache.batchPreloadEntities(relatedIds, context)
  } catch (error) {
    logger.warn('provider', 'Preload failed', { error })
  }
}
```

---

**Happy Coding!** 🚀

For questions or issues, consult:
- [`data-model.md`](./data-model.md) - Entity structures
- [`research.md`](./research.md) - Design decisions
- [`contracts/`](./contracts/) - Interface contracts
- Test files - Working examples
