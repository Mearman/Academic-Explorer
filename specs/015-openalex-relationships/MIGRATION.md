# Migration Guide: OpenAlex Relationship Direction Changes

**Version**: 1.0
**Date**: 2025-11-18
**Spec**: 015-openalex-relationships
**Status**: Implementation Complete (Phases 1-10)

## Overview

This guide documents breaking changes introduced in the OpenAlex relationship implementation (spec 015), specifically the correction of edge directions to accurately reflect OpenAlex data ownership.

**TL;DR**: All graph edges now use `source = data owner` and `direction` metadata to indicate whether edges were discovered via forward relationships (`outbound`) or reverse lookup (`inbound`).

---

## Breaking Changes

### AUTHORSHIP Edge Direction Correction (Phase 1, T001-T013)

**Impact**: HIGH - Affects all graphs with Work ↔ Author relationships

**What Changed**:
- **BEFORE**: `source: authorId, target: workId` (INCORRECT)
- **AFTER**: `source: workId, target: authorId` (CORRECT)

**Why**: Work entities own the `authorships[]` array in OpenAlex API, making them the data owner. Edge direction must reflect this ownership to prevent duplicate edges when discovered from both Work and Author expansions.

**Migration Steps**:

1. **Identify Affected Graphs**
   ```typescript
   // Find all AUTHORSHIP edges with reversed direction
   const affectedEdges = graphEdges.filter(edge =>
     edge.type === RelationType.AUTHORSHIP &&
     edge.source.startsWith('A') && // Source is author ID
     edge.target.startsWith('W')    // Target is work ID
   )
   ```

2. **Reverse Edge Direction**
   ```typescript
   const migratedEdges = affectedEdges.map(edge => ({
     ...edge,
     id: `${edge.target}-${edge.type}-${edge.source}`, // Swap IDs
     source: edge.target,  // Work ID becomes source
     target: edge.source,  // Author ID becomes target
     direction: edge.direction // Keep existing direction metadata
   }))
   ```

3. **Update Edge IDs**
   ```typescript
   // Old format: A5017898742-AUTHORSHIP-W2741809807 (WRONG)
   // New format: W2741809807-AUTHORSHIP-A5017898742 (CORRECT)

   function migrateEdgeId(oldEdge: GraphEdge): string {
     const workId = oldEdge.target  // Work was incorrectly target
     const authorId = oldEdge.source // Author was incorrectly source
     return `${workId}-${RelationType.AUTHORSHIP}-${authorId}`
   }
   ```

4. **Remove Duplicates**
   ```typescript
   // After migration, deduplicate by edge ID
   const uniqueEdges = Array.from(
     new Map(allEdges.map(e => [e.id, e])).values()
   )
   ```

---

## Edge Direction Philosophy

### Data Ownership Model

All edges follow this principle:

```
source = Entity that owns the relationship array in OpenAlex API
target = Entity being referenced
direction = Discovery method ('outbound' or 'inbound')
```

**Examples**:

| Relationship | OpenAlex Field | Source | Target | Direction (Work Expansion) |
|--------------|----------------|--------|--------|----------------------------|
| AUTHORSHIP | `work.authorships[]` | Work | Author | outbound |
| REFERENCE | `work.referenced_works[]` | Work | Work (cited) | outbound |
| FUNDED_BY | `work.grants[]` | Work | Funder | outbound |
| AFFILIATION | `author.affiliations[]` | Author | Institution | outbound |
| LINEAGE | `institution.lineage[]` | Institution | Parent Institution | outbound |
| HOST_ORGANIZATION | `source.host_organization` | Source | Publisher | outbound |

### Direction Metadata

The `direction` field indicates how the edge was discovered:

- **`outbound`**: Edge created when expanding the source entity (data owner)
- **`inbound`**: Edge discovered via reverse lookup from target entity

**Example**:
```typescript
// Work expansion (W123 has author A456)
{
  id: "W123-AUTHORSHIP-A456",
  source: "W123",      // Data owner
  target: "A456",
  direction: "outbound" // Discovered from W123.authorships[]
}

// Author expansion (reverse lookup: which works did A456 author?)
{
  id: "W123-AUTHORSHIP-A456",  // SAME ID!
  source: "W123",              // Still data owner (NOT A456)
  target: "A456",
  direction: "inbound"         // Discovered from works?filter=author.id:A456
}
```

**Key Insight**: Same logical relationship = same edge ID, regardless of discovery direction.

---

## Backward Compatibility

### Legacy Edge Detection

If you have existing graphs, detect legacy edges:

```typescript
function isLegacyAuthorshipEdge(edge: GraphEdge): boolean {
  return (
    edge.type === RelationType.AUTHORSHIP &&
    edge.source.startsWith('A') &&  // Author as source (WRONG)
    edge.target.startsWith('W')     // Work as target (WRONG)
  )
}
```

### Automated Migration Function

```typescript
function migrateAuthorshipEdges(edges: GraphEdge[]): GraphEdge[] {
  return edges.map(edge => {
    if (!isLegacyAuthorshipEdge(edge)) {
      return edge // No migration needed
    }

    // Swap source/target
    const migratedEdge: GraphEdge = {
      ...edge,
      id: `${edge.target}-${edge.type}-${edge.source}`,
      source: edge.target, // Work ID
      target: edge.source, // Author ID
      // Keep original direction metadata if it exists
      direction: edge.direction || 'outbound'
    }

    return migratedEdge
  })
}
```

### Validation After Migration

```typescript
function validateAuthorshipEdges(edges: GraphEdge[]): void {
  const authorshipEdges = edges.filter(e => e.type === RelationType.AUTHORSHIP)

  for (const edge of authorshipEdges) {
    // Source must be Work ID
    if (!edge.source.startsWith('W')) {
      console.error(`Invalid AUTHORSHIP source: ${edge.source} (expected W*)`, edge)
    }

    // Target must be Author ID
    if (!edge.target.startsWith('A')) {
      console.error(`Invalid AUTHORSHIP target: ${edge.target} (expected A*)`, edge)
    }

    // Edge ID must follow canonical format
    const expectedId = `${edge.source}-${edge.type}-${edge.target}`
    if (edge.id !== expectedId) {
      console.error(`Invalid edge ID: ${edge.id} (expected ${expectedId})`, edge)
    }
  }
}
```

---

## Testing Migration

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest'
import { migrateAuthorshipEdges } from './migration'

describe('AUTHORSHIP Edge Migration', () => {
  it('should reverse legacy AUTHORSHIP edges', () => {
    const legacyEdge: GraphEdge = {
      id: 'A456-AUTHORSHIP-W123',
      source: 'A456', // WRONG
      target: 'W123', // WRONG
      type: RelationType.AUTHORSHIP,
      direction: 'outbound'
    }

    const migrated = migrateAuthorshipEdges([legacyEdge])

    expect(migrated[0]).toEqual({
      id: 'W123-AUTHORSHIP-A456', // Corrected
      source: 'W123', // Work is data owner
      target: 'A456', // Author is referenced entity
      type: RelationType.AUTHORSHIP,
      direction: 'outbound'
    })
  })

  it('should not modify correct AUTHORSHIP edges', () => {
    const correctEdge: GraphEdge = {
      id: 'W123-AUTHORSHIP-A456',
      source: 'W123',
      target: 'A456',
      type: RelationType.AUTHORSHIP,
      direction: 'outbound'
    }

    const migrated = migrateAuthorshipEdges([correctEdge])

    expect(migrated[0]).toEqual(correctEdge) // No changes
  })
})
```

### Integration Test

```typescript
describe('Graph Migration Integration', () => {
  it('should eliminate duplicate edges after migration', async () => {
    // Setup: Graph with both legacy and correct edges for same relationship
    const graph = {
      edges: [
        // Legacy edge (author → work)
        { id: 'A456-AUTHORSHIP-W123', source: 'A456', target: 'W123', type: 'AUTHORSHIP' },
        // Correct edge (work → author)
        { id: 'W123-AUTHORSHIP-A456', source: 'W123', target: 'A456', type: 'AUTHORSHIP' }
      ]
    }

    // Migrate
    const migratedEdges = migrateAuthorshipEdges(graph.edges)

    // Deduplicate by ID
    const uniqueEdges = Array.from(
      new Map(migratedEdges.map(e => [e.id, e])).values()
    )

    // Should have only 1 edge with correct direction
    expect(uniqueEdges).toHaveLength(1)
    expect(uniqueEdges[0].id).toBe('W123-AUTHORSHIP-A456')
    expect(uniqueEdges[0].source).toBe('W123')
    expect(uniqueEdges[0].target).toBe('A456')
  })
})
```

---

## Rollout Strategy

### Phase 1: Assessment (Week 1)

1. Audit existing graphs for legacy edges
2. Estimate impact (number of affected edges, graphs, users)
3. Communicate breaking change to stakeholders

### Phase 2: Testing (Week 2)

1. Run migration function on test/staging environment
2. Validate migrated graphs meet all acceptance criteria
3. Verify no data loss or corruption

### Phase 3: Production Migration (Week 3)

1. Schedule maintenance window
2. Backup all graph data
3. Run migration script
4. Validate production graphs
5. Monitor for issues

### Phase 4: Verification (Week 4)

1. Run automated tests against production data
2. Manual spot-checks of high-traffic graphs
3. User acceptance testing
4. Document any issues and resolutions

---

## Acceptance Criteria

✅ All AUTHORSHIP edges have `source: W*` (Work ID)
✅ All AUTHORSHIP edges have `target: A*` (Author ID)
✅ Edge IDs follow canonical format: `W{id}-AUTHORSHIP-A{id}`
✅ No duplicate edges for same Work ↔ Author relationship
✅ Direction metadata correctly indicates discovery method
✅ All tests pass (868 tests)
✅ Zero TypeScript type errors

---

## Support & Troubleshooting

### Common Issues

**Issue 1**: Duplicate edges after migration
**Cause**: Both legacy and correct edges exist for same relationship
**Solution**: Run deduplication by edge ID after migration

**Issue 2**: Graph visualization breaks after migration
**Cause**: UI assumes old edge direction
**Solution**: Update graph rendering logic to use `direction` metadata for visual distinction

**Issue 3**: Search/filter queries return no results
**Cause**: Queries filter by old `source: authorId` pattern
**Solution**: Update queries to use `source: workId, target: authorId`

### Rollback Procedure

If migration fails:

1. Restore from backup (pre-migration snapshot)
2. Review migration logs for specific errors
3. Fix migration script
4. Re-run on test environment
5. Retry production migration after validation

---

## Further Reading

- [Data Model Documentation](./data-model.md) - Full relationship specifications
- [Edge Creation Contract](./contracts/edge-creation.contract.md) - Edge creation patterns
- [OpenAlex API Documentation](https://docs.openalex.org/) - Upstream data model
- [Spec 015 Tasks](./tasks.md) - Implementation task breakdown

---

**Last Updated**: 2025-11-18
**Version**: 1.0
**Status**: Ready for Use
