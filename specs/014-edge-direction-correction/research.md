# Research: Edge Direction Correction for OpenAlex Data Model

**Feature**: 014-edge-direction-correction
**Date**: 2025-11-17
**Purpose**: Document technical decisions and research findings for reversing graph edge directions to match OpenAlex data ownership model

## Overview

This feature corrects a fundamental architectural issue where graph edges point in the wrong direction relative to the OpenAlex data model. The current implementation creates edges from referenced entities to data owners (e.g., Author → Work), but OpenAlex stores relationships on the entity that owns them (Work contains authorships, so the correct direction is Work → Author).

## Key Decisions

### Decision 1: Edge Direction Semantics

**Decision**: Edges point from data owner to referenced entity (source = owner, target = referenced)

**Rationale**:
- Matches OpenAlex API data structure where relationships are stored as fields on entities
- Example: Work entity has `authorships[]` field → edges should point Work → Author
- Example: Work entity has `referenced_works[]` field → edges should point Work → Referenced Work
- Enables clear distinction between outbound (stored) and inbound (discovered) relationships

**Alternatives Considered**:
1. **Keep current direction, add metadata** - Rejected because it contradicts the actual data model and makes inbound/outbound filtering conceptually backwards
2. **Make all edges bidirectional** - Rejected because it loses the important semantic distinction between stored relationships and reverse lookups
3. **Use different edge types for each direction** - Rejected because it doubles the number of edge types and complicates the model unnecessarily

**Implementation Impact**:
- Reverse source/target in `relationship-detection-service.ts` edge creation logic
- Update existing tests to expect reversed directions
- Migrate existing graphs on load by swapping source/target for all edges

---

### Decision 2: RelationType Enum Label Updates

**Decision**: Update RelationType enum values to reflect corrected directions with passive voice labels

**Current (Incorrect)**:
- `AUTHORED` (implies Author → Work)
- `AFFILIATED` (implies Institution → Author)

**Proposed (Correct)**:
- `HAS_AUTHOR` or `AUTHORED_BY` (Work → Author)
- `HAS_AFFILIATION` or `AFFILIATED_WITH` (Author → Institution)

**Rationale**:
- Labels should accurately describe the relationship from the source node's perspective
- Passive voice ("authored by", "published in") reads naturally when source is the data owner
- Active voice ("has author", "references") also works but may be less intuitive

**Alternatives Considered**:
1. **Keep enum names, change only labels** - Selected approach: update both enum value names and display labels for consistency
2. **Use generic "RELATED_TO" types** - Rejected because it loses semantic information
3. **Add direction prefix (OUTBOUND_AUTHORED)** - Rejected because direction is implicit in the model, not part of the type

**Implementation Impact**:
- Update `packages/graph/src/relation-type.ts` enum definitions
- Update `EdgeFiltersSection.tsx` RELATION_TYPE_CONFIG labels
- Ensure backwards compatibility during migration (map old enum values to new ones)

---

### Decision 3: Edge Direction Classification

**Decision**: Add `direction: 'outbound' | 'inbound'` field to GraphEdge interface

**Rationale**:
- Outbound edges: relationship data stored directly on source entity (Work → Author from authorships field)
- Inbound edges: relationship discovered by querying other entities (Work ← Citing Work requires finding works that reference this one)
- This distinction affects:
  - **Data completeness**: Outbound edges are exhaustive (all data from entity), inbound edges are partial (only entities currently in graph)
  - **Performance**: Outbound edges are immediate (from entity data), inbound edges may require additional queries
  - **User expectations**: Users need to understand that inbound citations may be incomplete

**Alternatives Considered**:
1. **Calculate direction dynamically** - Selected initially, but decided to store explicitly for performance (avoid recalculating on every render)
2. **Infer from RelationType** - Rejected because the same relationship type can be outbound from one entity and inbound from another (e.g., REFERENCES is outbound from citing work, inbound to referenced work)
3. **Store only on entity nodes, not edges** - Rejected because direction is a property of the edge, not the node

**Implementation Impact**:
- Add `direction` field to `GraphEdge` interface in `packages/graph/src/edge-model.ts`
- Update `relationship-detection-service.ts` to set direction when creating edges
- Add type guard `isOutboundEdge()` and `isInboundEdge()` in `packages/utils/src/type-guards.ts`

---

### Decision 4: Migration Strategy for Existing Graphs

**Decision**: Automatic on-load migration with version detection

**Approach**:
1. Add version field to graph metadata (`graphVersion: number`)
2. On graph load, check if `graphVersion < 2` (version 2 = corrected edges)
3. If old version detected:
   - Reverse all edge source/target pairs
   - Update RelationType enum values (AUTHORED → HAS_AUTHOR, etc.)
   - Calculate and set direction field for each edge
   - Update graphVersion to 2
   - Save migrated graph

**Rationale**:
- Seamless user experience (no manual migration required)
- Breaking change is acceptable per Development-Stage Pragmatism principle
- Version field enables future migrations without complex edge detection logic

**Alternatives Considered**:
1. **Require manual migration** - Rejected because it adds friction for users and risk of data loss
2. **Keep both old and new graphs** - Rejected because it duplicates storage and complicates the codebase
3. **Detect old edges by pattern** - Rejected because it's fragile (requires heuristics) compared to explicit versioning

**Implementation Impact**:
- Add `graphVersion` field to graph metadata in `graph-store.tsx`
- Implement migration function `migrateGraphToV2()` in `graph-store.tsx`
- Add integration test for migration in `edge-direction-migration.integration.test.ts`

---

### Decision 5: Visual Distinction for Outbound vs Inbound Edges

**Decision**: Use line style to distinguish outbound (solid) from inbound (dashed) edges

**Rationale**:
- Solid lines = complete data (outbound, stored on entity)
- Dashed lines = potentially incomplete data (inbound, discovered through graph)
- Avoids relying solely on color (accessibility concern for colorblind users)
- Consistent with graph visualization conventions (dashed = uncertain/incomplete)

**Alternatives Considered**:
1. **Color only** - Rejected due to accessibility concerns
2. **Arrow size** - Rejected because it's too subtle and hard to distinguish
3. **Different arrow shapes** - Selected as secondary indicator in addition to line style
4. **Edge labels** - Rejected because it clutters the graph

**Implementation Impact**:
- Add styling logic in graph rendering component (likely in `use-graph-data.ts` or similar)
- Ensure WCAG 2.1 AA compliance for visual distinction (test with axe-core)

---

## Technical Constraints

### Constraint 1: Serial Test Execution
- All tests must run serially due to memory constraints (per Constitution)
- Migration tests must be isolated (each test creates fresh graph, migrates, validates)
- Estimated test runtime: ~30 seconds for full suite (unit + integration + E2E)

### Constraint 2: Backwards Compatibility (Not Required)
- Per Development-Stage Pragmatism principle, breaking changes are acceptable
- Old graphs will be migrated automatically, not supported in parallel

### Constraint 3: Performance Requirement
- Directional filtering must complete in <1 second for graphs with 500 nodes (SC-003)
- Migration must complete in <2 seconds for typical graphs (assumption: <100 edges)

---

## Open Questions (Resolved)

### Q1: Should we support rollback from V2 to V1?
**Answer**: No. Development-Stage Pragmatism principle allows breaking changes. Rollback adds unnecessary complexity.

### Q2: How to handle edges added before migration completes?
**Answer**: Migration happens synchronously on graph load before any user interaction. New edges will be created with correct direction immediately.

### Q3: What happens to external references to edge IDs?
**Answer**: Edge IDs are generated as `source-target-type`, so reversing source/target will change IDs. This is acceptable because:
- Edge IDs are not exposed to users
- No external systems reference Academic Explorer edge IDs
- Internal references (e.g., in graph-store) will be regenerated during migration

---

## Implementation Approach

### Phase 1: Update Edge Model (P1 - MVP)
1. Add `direction` field to `GraphEdge` interface
2. Update `RelationType` enum values and labels
3. Update relationship detection service to reverse source/target
4. Write failing tests for new edge directions
5. Implement changes to make tests pass

### Phase 2: Classify Edge Direction (P2)
1. Add direction classification logic to relationship detection
2. Update graph store to set direction on edge creation
3. Add type guards for direction checking
4. Write tests for direction classification

### Phase 3: Migration & Visual Distinction (P2)
1. Implement `migrateGraphToV2()` function
2. Add graph version metadata
3. Add migration integration tests
4. Implement visual distinction (solid vs dashed lines)
5. Add E2E tests for migration

### Phase 4: Directional Filtering UI (P3)
1. Add "Show Outbound", "Show Inbound", "Show Both" toggles to EdgeFiltersSection
2. Implement filtering logic in graph store
3. Add E2E tests for filtering
4. Measure and verify performance (<1s for 500 nodes)

---

## References

- OpenAlex API Documentation: https://docs.openalex.org/
- Current relationship-detection-service.ts implementation
- Constitution: `.specify/memory/constitution.md`
- Spec: `specs/014-edge-direction-correction/spec.md`
