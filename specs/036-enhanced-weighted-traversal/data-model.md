# Data Model: Enhanced Weighted Traversal

## Overview

Type definitions and data structures for spec-036: Enhanced Weighted Traversal.

## Type Changes

### TraversalOptions (Extended)

**Location**: `packages/types/src/traversal-types.ts`

```typescript
export interface TraversalOptions<
  N = GraphNodeRecord,
  E = GraphEdgeRecord,
> {
  // Existing properties (unchanged)
  weight?: WeightConfig<N, E>;
  direction?: TraversalDirection;
  edgeFilter?: EdgePropertyFilter;
  nodeTypes?: EntityType[];
  maxDepth?: number;
  directed?: boolean;

  // NEW: Edge type filtering (P1)
  /**
   * Filter edges by relationship type during traversal.
   * Only edges of these types are considered.
   * If empty or undefined, all edge types are allowed.
   */
  edgeTypes?: RelationType[];
}
```

### WeightConfig (Extended)

**Location**: `packages/types/src/traversal-types.ts`

```typescript
export interface WeightConfig<
  N = GraphNodeRecord,
  E = GraphEdgeRecord,
> {
  // Existing properties (unchanged)
  property?: WeightableEdgeProperty;
  weightFn?: WeightFunction<N, E>;
  invert?: boolean;
  defaultWeight?: number;

  // NEW: Node property weighting (P2)
  /**
   * Use a node property as weight source.
   * Looks up property on source or target node (configurable via nodePropertyTarget).
   * Property is accessed from node metadata or direct node properties.
   */
  nodeProperty?: string;

  /**
   * Which node to read the property from when using nodeProperty.
   * - 'source': Read from source node only
   * - 'target': Read from target node only (default)
   * - 'average': Average of source and target values
   * @default 'target'
   */
  nodePropertyTarget?: 'source' | 'target' | 'average';

  /**
   * Default value when node property is missing or not a number.
   * @default 1
   */
  nodeDefaultValue?: number;
}
```

### WeightableNodeProperty (New Type)

**Location**: `packages/types/src/traversal-types.ts`

```typescript
/**
 * Node properties that can be used as numeric weights.
 * Using discriminated union to enable exhaustive switch for type-safe access.
 */
export type WeightableNodeProperty =
  | 'cited_by_count'
  | 'works_count'
  | 'h_index'
  | 'i10_index'
  | 'publication_year';

/**
 * Predefined node property options with metadata for UI.
 */
export const NODE_PROPERTY_OPTIONS: Array<{
  value: WeightableNodeProperty;
  label: string;
  description: string;
  entityTypes: EntityType[];
}> = [
  {
    value: 'cited_by_count',
    label: 'Citation Count',
    description: 'Number of citations received',
    entityTypes: ['works', 'authors', 'sources', 'institutions', 'topics'],
  },
  {
    value: 'works_count',
    label: 'Works Count',
    description: 'Number of associated works',
    entityTypes: ['authors', 'sources', 'institutions', 'topics', 'concepts'],
  },
  {
    value: 'h_index',
    label: 'H-Index',
    description: 'H-index metric (authors only)',
    entityTypes: ['authors'],
  },
  {
    value: 'i10_index',
    label: 'i10-Index',
    description: 'i10-index metric (authors only)',
    entityTypes: ['authors'],
  },
  {
    value: 'publication_year',
    label: 'Publication Year',
    description: 'Year of publication (works only)',
    entityTypes: ['works'],
  },
];
```

### Zod Schema for Weight Properties (New)

**Location**: `apps/web/src/services/graph-algorithms.ts`

```typescript
import { z } from 'zod';

/**
 * Schema for extracting numeric weight properties from entity data.
 * Uses Zod's safeParse for type-safe extraction without assertions.
 *
 * This is a focused schema covering only weight-relevant properties,
 * using .passthrough() to ignore other entity properties.
 */
const weightPropertiesSchema = z.object({
  cited_by_count: z.number().optional(),
  works_count: z.number().optional(),
  publication_year: z.number().optional(),
  summary_stats: z.object({
    h_index: z.number().optional(),
    i10_index: z.number().optional(),
  }).optional(),
}).passthrough();

type WeightProperties = z.infer<typeof weightPropertiesSchema>;

/**
 * Type-safe node property accessor using Zod validation.
 * Zero type assertions - relies on Zod's discriminated union return type.
 *
 * @param node - The graph node to extract property from
 * @param property - The property name to extract
 * @param defaultValue - Value to return if property missing or invalid
 * @returns The numeric property value or default
 */
function getNodePropertyWeight(
  node: GraphNode,
  property: WeightableNodeProperty,
  defaultValue: number
): number {
  if (!node.entityData) return defaultValue;

  // safeParse returns { success: true, data: T } | { success: false, error }
  // TypeScript narrows the type automatically after the success check
  const result = weightPropertiesSchema.safeParse(node.entityData);

  if (!result.success) return defaultValue;

  // result.data is fully typed as WeightProperties - no assertions needed
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

## Service Layer Types

### WeightedPathOptions (Extended)

**Location**: `apps/web/src/services/graph-algorithms.ts`

```typescript
export interface WeightedPathOptions {
  // Existing properties (unchanged)
  weight?: WeightConfig;
  edgeFilter?: EdgePropertyFilter;
  nodeTypes?: EntityType[];
  directed?: boolean;

  // NEW: Edge type filtering
  edgeTypes?: RelationType[];
}
```

## UI State Types

### ShortestPathAdvancedOptions (New)

**Location**: `apps/web/src/components/algorithms/items/ShortestPathItem.tsx` (local type)

```typescript
interface ShortestPathAdvancedOptions {
  // Edge weight configuration
  weightProperty: WeightableEdgeProperty | 'none';
  invertWeight: boolean;

  // Node type filter
  nodeTypes: EntityType[];

  // Edge property filter
  scoreMin?: number;
  scoreMax?: number;

  // NEW: Edge type filter
  edgeTypes: RelationType[];

  // NEW: Node property weight
  nodeProperty: WeightableNodeProperty | 'none';
  nodePropertyTarget: 'source' | 'target' | 'average';
}
```

## Constants

**Location**: `apps/web/src/services/graph-algorithms.ts`

```typescript
/** Minimum weight value for Dijkstra compatibility */
export const MIN_POSITIVE_WEIGHT = 0.001;

/** Default weight when property is missing */
export const DEFAULT_EDGE_WEIGHT = 1;

/** Default value for missing node properties */
export const DEFAULT_NODE_PROPERTY_VALUE = 1;
```

**Location**: `apps/web/src/components/algorithms/items/ShortestPathItem.tsx`

```typescript
/** Edge type options for the filter dropdown */
const EDGE_TYPE_OPTIONS: Array<{ value: RelationType; label: string }> = [
  { value: RelationType.AUTHORSHIP, label: 'Authorship' },
  { value: RelationType.AFFILIATION, label: 'Affiliation' },
  { value: RelationType.PUBLICATION, label: 'Publication' },
  { value: RelationType.REFERENCE, label: 'Reference' },
  { value: RelationType.TOPIC, label: 'Topic' },
  // ... additional types
];

/** Node property options for weight dropdown */
const NODE_PROPERTY_WEIGHT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'none', label: 'None (use edge weights)' },
  { value: 'cited_by_count', label: 'Citation Count' },
  { value: 'works_count', label: 'Works Count' },
  { value: 'h_index', label: 'H-Index' },
  { value: 'publication_year', label: 'Publication Year' },
];
```

## Relationships

```
TraversalOptions
├── weight: WeightConfig
│   ├── property (edge property)
│   ├── nodeProperty (NEW - node property)
│   ├── nodePropertyTarget (NEW)
│   └── weightFn (custom function)
├── edgeTypes (NEW - RelationType[])
├── edgeFilter (existing)
├── nodeTypes (existing)
└── directed (existing)

WeightConfig priority:
1. weightFn (if provided, takes precedence)
2. nodeProperty (if provided and no weightFn)
3. property (edge property)
4. defaultWeight (fallback)
```

## Validation Rules

1. **edgeTypes**: Must be valid `RelationType` enum values
2. **nodeProperty**: Must be a string; runtime check that property exists on node
3. **nodePropertyTarget**: Must be 'source' | 'target' | 'average'
4. **Weight values**: Must be positive after calculation (clamped to MIN_POSITIVE_WEIGHT)
5. **Combined filters**: edgeTypes AND edgeFilter AND nodeTypes can all be applied simultaneously
