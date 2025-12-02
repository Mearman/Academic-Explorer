# Quickstart: Enhanced Weighted Traversal

## Overview

This guide covers implementing the enhanced weighted traversal feature for BibGraph, adding edge type filtering, node property weights, and composite weight functions.

## Prerequisites

- BibGraph development environment set up
- Understanding of existing graph-algorithms service
- Familiarity with ShortestPathItem component

## Implementation Summary

### P1: Edge Type Filtering

**Files to modify**:
1. `packages/types/src/traversal-types.ts` - Add `edgeTypes` to TraversalOptions
2. `apps/web/src/services/graph-algorithms.ts` - Add edge type filter function
3. `apps/web/src/components/algorithms/items/ShortestPathItem.tsx` - Add UI

**Type changes**:
```typescript
// In TraversalOptions interface
edgeTypes?: RelationType[];
```

**Service changes**:
```typescript
function applyEdgeTypeFilter(
  edges: GraphEdge[],
  types?: RelationType[]
): GraphEdge[] {
  if (!types || types.length === 0) return edges;
  const typeSet = new Set(types);
  return edges.filter(e => typeSet.has(e.type));
}
```

**UI changes**:
```tsx
<MultiSelect
  label="Allowed edge types"
  data={EDGE_TYPE_OPTIONS}
  value={edgeTypes}
  onChange={setEdgeTypes}
/>
```

### P2: Node Property Weights

**Files to modify**:
1. `packages/types/src/traversal-types.ts` - Add node property options to WeightConfig
2. `apps/web/src/services/graph-algorithms.ts` - Add Zod schema and type-safe accessor
3. `apps/web/src/components/algorithms/items/ShortestPathItem.tsx` - Add UI

**Type changes**:
```typescript
// In WeightConfig interface
nodeProperty?: WeightableNodeProperty;
nodePropertyTarget?: 'source' | 'target' | 'average';
nodeDefaultValue?: number;
```

**Service changes** (type-safe via Zod - no assertions):
```typescript
import { z } from 'zod';

// Schema for weight-relevant properties
const weightPropertiesSchema = z.object({
  cited_by_count: z.number().optional(),
  works_count: z.number().optional(),
  publication_year: z.number().optional(),
  summary_stats: z.object({
    h_index: z.number().optional(),
    i10_index: z.number().optional(),
  }).optional(),
}).passthrough();

function getNodePropertyWeight(
  node: GraphNode,
  property: WeightableNodeProperty,
  defaultValue: number
): number {
  if (!node.entityData) return defaultValue;

  const result = weightPropertiesSchema.safeParse(node.entityData);
  if (!result.success) return defaultValue;

  const data = result.data;
  switch (property) {
    case 'cited_by_count': return data.cited_by_count ?? defaultValue;
    case 'works_count': return data.works_count ?? defaultValue;
    case 'publication_year': return data.publication_year ?? defaultValue;
    case 'h_index': return data.summary_stats?.h_index ?? defaultValue;
    case 'i10_index': return data.summary_stats?.i10_index ?? defaultValue;
  }
}
```

### P3: Composite Weight Functions (Optional Enhancement)

Already supported via existing `weightFn` parameter - just needs UI preset options.

## Test Strategy

1. **Unit tests** (before implementation):
   - Edge type filtering with various type combinations
   - Node property weight extraction with missing properties
   - Weight clamping to positive values

2. **Integration tests**:
   - Path finding with combined filters (edge types + node types + edge filter)
   - Verify paths only use filtered edge types

3. **Component tests**:
   - UI state management for new options
   - Advanced options badge indicator

## Commit Strategy

1. `feat(types): add edgeTypes to TraversalOptions`
2. `feat(web): implement edge type filtering in graph-algorithms`
3. `feat(web): add edge type filter UI to ShortestPathItem`
4. `feat(types): add nodeProperty weight config options`
5. `feat(web): implement node property weighting in graph-algorithms`
6. `feat(web): add node property weight UI to ShortestPathItem`
7. `test(web): add tests for enhanced weighted traversal`
8. `docs(spec): update spec-036 with implementation notes`

## Usage Examples

### Filter by Citation Edges Only
```typescript
findShortestPath(nodes, edges, sourceId, targetId, {
  edgeTypes: [RelationType.REFERENCE],
  directed: true,
});
```

### Weight by Target Citation Count
```typescript
findShortestPath(nodes, edges, sourceId, targetId, {
  weight: {
    nodeProperty: 'cited_by_count',
    nodePropertyTarget: 'target',
    invert: true, // Higher citations = shorter path
  },
});
```

### Combined Filtering
```typescript
findShortestPath(nodes, edges, sourceId, targetId, {
  edgeTypes: [RelationType.AUTHORSHIP, RelationType.AFFILIATION],
  nodeTypes: ['authors', 'institutions'],
  weight: {
    nodeProperty: 'works_count',
    invert: true,
  },
  directed: false,
});
```
