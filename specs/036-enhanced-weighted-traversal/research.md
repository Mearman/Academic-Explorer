# Research: Enhanced Weighted Traversal

## Overview

Research findings for spec-036: Enhanced Weighted Traversal. This document resolves technical decisions and documents the rationale for implementation choices.

## Decision 1: Edge Type Filtering Implementation

**Decision**: Add `edgeTypes?: RelationType[]` to `TraversalOptions` interface and filter edges by type before graph construction.

**Rationale**:
- `RelationType` enum already exists in `@bibgraph/types/relationships.ts` with all 19 relationship types
- Filtering at edge level (before graph construction) is more efficient than filtering during traversal
- Consistent with existing `edgeFilter` pattern that filters by edge properties

**Alternatives Considered**:
1. **Filter during traversal**: Would require checking edge type on each traversal step, O(E) additional checks
2. **Separate edge type filter interface**: Unnecessary complexity since RelationType enum already exists
3. **Add to EdgePropertyFilter**: Would mix semantic filtering (type) with value filtering (score ranges)

**Implementation**:
```typescript
// In traversal-types.ts TraversalOptions interface
edgeTypes?: RelationType[];

// In graph-algorithms.ts
function applyEdgeTypeFilter(edges: GraphEdge[], types?: RelationType[]): GraphEdge[] {
  if (!types || types.length === 0) return edges;
  const typeSet = new Set(types);
  return edges.filter(e => typeSet.has(e.type));
}
```

## Decision 2: Node Property Weight Access (Type-Safe via Zod)

**Decision**: Use existing Zod schemas to validate and extract node properties with full type safety - no type assertions.

**Rationale**:
- Codebase already has properly typed Zod schemas in `packages/types/src/entities/schemas.ts`
- `workSchema`, `authorSchema`, `institutionSchema`, etc. define all entity properties with correct types
- Zod's `.safeParse()` returns a discriminated union that TypeScript narrows without assertions:
  - `{ success: true, data: T }` - fully typed result
  - `{ success: false, error: ZodError }` - validation failed
- No `as` type assertions needed anywhere in the implementation

**Alternatives Considered**:
1. **Type guards with manual assertions**: Still requires `as` coercion inside guard implementations - REJECTED
2. **Switch statement with `in` checks**: TypeScript doesn't narrow `Record<string, unknown>` after `in` check - REJECTED
3. **Fetch full entity data during traversal**: Too slow, violates O(1) constraint - REJECTED

**Implementation**:
```typescript
import { z } from 'zod';
import { authorSchema, workSchema, institutionSchema, sourceSchema } from '@bibgraph/types';

// Schema for extracting numeric weight properties (subset of full schemas)
const numericPropertiesSchema = z.object({
  cited_by_count: z.number().optional(),
  works_count: z.number().optional(),
  publication_year: z.number().optional(),
  summary_stats: z.object({
    h_index: z.number().optional(),
    i10_index: z.number().optional(),
  }).optional(),
});

// Type-safe property accessor - NO type assertions
function getNodePropertyWeight(
  node: GraphNode,
  property: WeightableNodeProperty,
  defaultValue: number
): number {
  if (!node.entityData) return defaultValue;

  // Zod safeParse returns discriminated union - TypeScript narrows automatically
  const result = numericPropertiesSchema.safeParse(node.entityData);

  if (!result.success) return defaultValue;

  // result.data is now fully typed - no assertions needed
  const data = result.data;

  switch (property) {
    case 'cited_by_count':
      return data.cited_by_count ?? defaultValue;
    case 'works_count':
      return data.works_count ?? defaultValue;
    case 'publication_year':
      return data.publication_year ?? defaultValue;
    case 'h_index':
      return data.summary_stats?.h_index ?? defaultValue;
    case 'i10_index':
      return data.summary_stats?.i10_index ?? defaultValue;
  }
}
```

**Key Benefits**:
- Zero type assertions (`as`) in implementation
- Runtime validation ensures data integrity
- TypeScript understands the narrowed type from `safeParse`
- Reuses existing schema definitions from `@bibgraph/types`
- Failed parses gracefully return default value

## Decision 3: Composite Weight Function Signature

**Decision**: Extend existing `WeightFunction` to accept composite calculations via the `weightFn` property with full node access.

**Rationale**:
- Current `WeightFunction<N, E>` signature already provides edge, sourceNode, targetNode
- No new type needed - existing signature supports composite weights
- UI can provide preset composite functions or accept custom expressions

**Alternatives Considered**:
1. **Expression language for user-defined formulas**: Security risk (eval), complex to implement safely
2. **Predefined composite templates only**: Too limiting for power users
3. **Separate CompositeWeightConfig type**: Unnecessary when existing weightFn supports this

**Implementation**:
```typescript
// Existing signature in traversal-types.ts (no change needed)
export type WeightFunction<N, E> = (edge: E, sourceNode: N, targetNode: N) => number;

// Example composite weight in service layer (using type-safe Zod parsing)
const compositeWeight: WeightFunction<GraphNode, GraphEdge> = (edge, source, target) => {
  const edgeScore = edge.score ?? 0.5;
  const targetCitations = getNodePropertyWeight(target, 'cited_by_count', 1);
  return edgeScore * Math.log10(targetCitations + 1);
};
```

## Decision 4: UI Organization for New Options

**Decision**: Extend existing "Advanced Options" accordion in ShortestPathItem with new sections for Edge Type Filter and Node Property Weight.

**Rationale**:
- Maintains consistency with existing UI pattern
- Groups all advanced traversal options together
- Uses existing Mantine components (MultiSelect for edge types, Select for node property)
- Badge indicator shows when advanced options are active

**Alternatives Considered**:
1. **Separate modal dialog**: Adds friction for frequently-used options
2. **Inline controls (always visible)**: Clutters UI for users who don't need advanced options
3. **Tabbed interface**: Overkill for 3-4 option groups

**Implementation**:
```tsx
// New sections within existing Advanced Options accordion
<Stack gap="xs">
  <Text size="sm" fw={500}>Edge Type Filter</Text>
  <MultiSelect
    label="Allowed edge types"
    description="Only traverse edges of selected types (empty = all)"
    data={EDGE_TYPE_OPTIONS}
    value={edgeTypes}
    onChange={setEdgeTypes}
  />
</Stack>

<Stack gap="xs">
  <Text size="sm" fw={500}>Node Property Weight</Text>
  <Select
    label="Weight by node property"
    data={NODE_PROPERTY_OPTIONS}
    value={nodeProperty}
    onChange={setNodeProperty}
  />
</Stack>
```

## Decision 5: Minimum Weight Value for Dijkstra Compatibility

**Decision**: Clamp all weight values to minimum of 0.001 to ensure positive weights for Dijkstra's algorithm.

**Rationale**:
- Dijkstra's algorithm requires positive edge weights
- Zero or negative weights cause incorrect results or infinite loops
- 0.001 is small enough to not significantly affect relative path costs
- Clamping is already done in existing `buildWeightFunction` for inverted weights

**Alternatives Considered**:
1. **Error on non-positive weights**: Poor UX, users may not understand why weights are invalid
2. **Use different algorithm (Bellman-Ford)**: Slower O(VE) vs O((V+E)logV), unnecessary for this use case
3. **Allow zero weights**: Would break Dijkstra guarantees

**Implementation**:
```typescript
// Constants
const MIN_POSITIVE_WEIGHT = 0.001;

// In weight function builders
return Math.max(calculatedWeight, MIN_POSITIVE_WEIGHT);
```

## Available Node Properties for Weighting

From analysis of OpenAlex entity types and GraphNode structure:

| Property | Entity Types | Description |
|----------|--------------|-------------|
| `cited_by_count` | All | Number of citations received |
| `works_count` | Authors, Institutions, Sources | Number of associated works |
| `h_index` | Authors | H-index metric |
| `i10_index` | Authors | i10-index metric |
| `publication_year` | Works | Year of publication |
| `score` | GraphNode | Topic relevance score (from edge, promoted to node) |

## Available Edge Types for Filtering

From `RelationType` enum:

| Core Types | Publishing | Institutional | Additional |
|------------|------------|---------------|------------|
| AUTHORSHIP | HOST_ORGANIZATION | LINEAGE | AUTHOR_RESEARCHES |
| AFFILIATION | | INSTITUTION_ASSOCIATED | FIELD_PART_OF_DOMAIN |
| PUBLICATION | | INSTITUTION_HAS_REPOSITORY | FUNDED_BY |
| REFERENCE | | | TOPIC_PART_OF_FIELD |
| TOPIC | | | WORK_HAS_KEYWORD |
| | | | CONCEPT |

## Performance Considerations

1. **Edge Type Filtering**: O(E) one-time filter before graph construction - negligible overhead
2. **Node Property Access**: O(1) metadata lookup per edge - within performance budget
3. **Composite Weights**: O(1) per edge evaluation - same as existing weight functions
4. **Memory**: No additional data structures beyond existing graph representation

## Backward Compatibility

All changes are additive:
- New optional properties on existing interfaces
- Existing code paths unchanged when new properties not provided
- No breaking changes to public API
