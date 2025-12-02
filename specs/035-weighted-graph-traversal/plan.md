# Weighted Graph Traversal Enhancement - Plan

## Problem Statement

The current graph system has two disconnected layers:

1. **PersistentGraph** (storage) - Has rich edge properties (`score`, `authorPosition`, `isCorresponding`, etc.) and filtering capabilities, but no weighted traversal algorithms.

2. **Algorithms Graph** (analysis) - Has full weighted pathfinding and traversal via `WeightFunction<N, E>`, but loses edge properties during conversion from storage.

### Current Data Flow

```
PersistentGraph (GraphNodeRecord/GraphEdgeRecord)
    ↓ persistent-graph-source.ts (loses edge properties)
GraphSourceEntity
    ↓ use-multi-source-graph.ts
GraphNode/GraphEdge (weight?: number only)
    ↓ graph-algorithms.ts toAlgorithmEdge()
AcademicNode/AcademicEdge (weight = edge.weight ?? 1)
    ↓
dijkstra(), louvain(), etc.
```

**Gap**: Rich edge properties (`score`, `authorPosition`) are stripped out during conversion. The algorithms always use `weight ?? 1`.

## Design Decisions

Based on requirements:

1. **Weight Source**: Both predefined property mappings AND custom weight functions
2. **Direction Handling**: Bidirectional traversal with potentially different weights per direction
3. **Node Filtering**: Integrated node type filtering during traversal

## Chosen Approach: PersistentGraphAdapter

The adapter pattern provides the best balance:
- **Zero algorithm duplication** - Uses existing algorithms package
- **Lazy evaluation** - Only loads nodes/edges as needed
- **Integrated filtering** - Apply EdgePropertyFilter AND node type filtering during traversal
- **Type-safe weights** - Predefined property mappings plus custom function escape hatch
- **Bidirectional support** - Different weights for each direction
- **Backwards compatible** - Existing code continues to work

## Core Interfaces

```typescript
/**
 * Configuration for weight calculation
 */
interface WeightConfig<N extends Node, E extends Edge> {
  /** Use predefined edge property as weight */
  property?: 'score' | 'weight';

  /** Custom weight function (overrides property if both provided) */
  weightFn?: WeightFunction<N, E>;

  /** Invert weights (for "strongest path" vs "shortest path") */
  invert?: boolean;

  /** Default weight when property is undefined */
  defaultWeight?: number;
}

/**
 * Options for traversal/pathfinding operations
 */
interface TraversalOptions<N extends Node, E extends Edge> {
  /** Weight configuration */
  weight?: WeightConfig<N, E>;

  /** Direction mode */
  direction?: 'outbound' | 'inbound' | 'both';

  /** Filter edges by properties */
  edgeFilter?: EdgePropertyFilter;

  /** Filter nodes by entity types */
  nodeTypes?: EntityType[];

  /** Maximum traversal depth */
  maxDepth?: number;
}

/**
 * Adapter that makes PersistentGraph work with algorithms package
 */
class PersistentGraphAdapter {
  constructor(
    graph: PersistentGraph,
    options?: TraversalOptions<GraphNodeRecord, GraphEdgeRecord>
  );

  // Satisfy Graph-like interface for algorithms
  getNode(id: string): Option<GraphNodeRecord>;
  getAllNodes(): GraphNodeRecord[];
  getNeighbors(id: string): string[];
  getOutgoingEdges(id: string): GraphEdgeRecord[];
  getEdge(id: string): Option<GraphEdgeRecord>;
  getAllEdges(): GraphEdgeRecord[];
  getNodeCount(): number;
  getEdgeCount(): number;
  isDirected(): boolean;

  // Weight-aware methods
  getEdgeWeight(edge: GraphEdgeRecord): number;
}
```

## Implementation Phases

### Phase 1: Type Definitions (packages/types)

**File**: `packages/types/src/traversal-types.ts`

- `WeightConfig<N, E>` interface
- `TraversalOptions<N, E>` interface
- `WeightableEdgeProperty` type (union of weightable properties)
- Export from package index

**File**: `packages/types/src/graph-types.ts` (modify)

- Add `score?: number` to `GraphEdge` for visualization
- Add `authorPosition?: AuthorPosition` for display

### Phase 2: Enhanced Edge Property Preservation

**File**: `apps/web/src/lib/graph-sources/persistent-graph-source.ts` (modify)

- Include edge properties in `GraphSourceRelationship`
- Pass through score, authorPosition, isCorresponding, etc.

**File**: `apps/web/src/hooks/use-multi-source-graph.ts` (modify)

- Preserve edge properties when building GraphEdge[]

### Phase 3: PersistentGraphAdapter Implementation

**File**: `packages/client/src/cache/dexie/graph-adapter.ts` (new)

```typescript
export class PersistentGraphAdapter {
  private graph: PersistentGraph;
  private options: TraversalOptions<GraphNodeRecord, GraphEdgeRecord>;
  private weightFn: WeightFunction<GraphNodeRecord, GraphEdgeRecord>;

  constructor(graph: PersistentGraph, options?: TraversalOptions<...>) {
    this.graph = graph;
    this.options = options ?? {};
    this.weightFn = this.buildWeightFunction();
  }

  private buildWeightFunction(): WeightFunction<...> {
    const { weight } = this.options;
    if (weight?.weightFn) return weight.weightFn;
    if (weight?.property) {
      return (edge) => {
        const value = edge[weight.property] ?? weight.defaultWeight ?? 1;
        return weight.invert ? 1 / Math.max(value, 0.001) : value;
      };
    }
    return () => 1;
  }

  // Filter-aware getNeighbors
  getNeighbors(id: string): string[] {
    const { direction = 'both', edgeFilter, nodeTypes } = this.options;
    let neighbors = this.graph.getNeighbors(id, { direction, ...edgeFilter });

    if (nodeTypes?.length) {
      neighbors = neighbors.filter(nid => {
        const node = this.graph.getNode(nid);
        return node && nodeTypes.includes(node.entityType);
      });
    }
    return neighbors;
  }

  // Get edge weight using configured function
  getEdgeWeight(edge: GraphEdgeRecord): number {
    const source = this.graph.getNode(edge.source);
    const target = this.graph.getNode(edge.target);
    if (!source || !target) return this.options.weight?.defaultWeight ?? 1;
    return this.weightFn(edge, source, target);
  }
}
```

**File**: `packages/client/src/cache/dexie/index.ts` (modify)

- Export `PersistentGraphAdapter`
- Export `createGraphAdapter()` factory function

### Phase 4: Enhanced Algorithm Service

**File**: `apps/web/src/services/graph-algorithms.ts` (modify)

- Add `WeightConfig` parameter to `findShortestPath()`
- Modify `toAlgorithmEdge()` to preserve properties
- Add `findStrongestPath()` (inverted weights)
- Update `createGraph()` to accept `TraversalOptions`

```typescript
export function findShortestPath(
  nodes: GraphNode[],
  edges: GraphEdge[],
  sourceId: string,
  targetId: string,
  options?: {
    directed?: boolean;
    weight?: WeightConfig<AcademicNode, AcademicEdge>;
    nodeTypes?: EntityType[];
  }
): PathResult {
  const graph = createGraph(nodes, edges, options?.directed ?? true);

  const weightFn = buildWeightFunction(options?.weight);
  const result = dijkstra(graph, sourceId, targetId, weightFn);
  // ...
}
```

### Phase 5: React Hooks

**File**: `apps/web/src/hooks/use-weighted-path.ts` (new)

```typescript
export interface UseWeightedPathOptions {
  sourceId: string | null;
  targetId: string | null;
  weightProperty?: 'score' | 'weight';
  invert?: boolean;
  nodeTypes?: EntityType[];
  directed?: boolean;
}

export function useWeightedPath(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: UseWeightedPathOptions
): PathResult | null {
  return useMemo(() => {
    if (!options.sourceId || !options.targetId) return null;
    return findShortestPath(nodes, edges, options.sourceId, options.targetId, {
      directed: options.directed,
      weight: {
        property: options.weightProperty,
        invert: options.invert,
      },
      nodeTypes: options.nodeTypes,
    });
  }, [nodes, edges, options]);
}
```

**File**: `apps/web/src/hooks/use-graph-algorithms.ts` (modify)

- Add `useWeightedPath` to combined hook
- Add weight configuration state

### Phase 6: UI Integration

**File**: `apps/web/src/components/algorithms/categories/PathfindingTab.tsx` (modify)

- Add weight property selector (dropdown: None, Score, Author Position)
- Add "Find Strongest" toggle (inverts weights)
- Add node type filter checkboxes
- Show weighted distance in results

**Expected UI additions**:
```
┌─────────────────────────────────────────┐
│ Weight By: [None ▼] [Score] [Custom]    │
│ □ Invert (find strongest path)          │
│                                         │
│ Filter Node Types:                      │
│ ☑ Works  ☑ Authors  □ Institutions     │
│                                         │
│ [Find Path]                             │
│                                         │
│ Result: A → B → C (weight: 2.45)        │
└─────────────────────────────────────────┘
```

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `packages/types/src/traversal-types.ts` | Weight config and traversal option types |
| `packages/client/src/cache/dexie/graph-adapter.ts` | PersistentGraphAdapter class |
| `apps/web/src/hooks/use-weighted-path.ts` | React hook for weighted pathfinding |

### Modified Files
| File | Changes |
|------|---------|
| `packages/types/src/graph-types.ts` | Add score, authorPosition to GraphEdge |
| `packages/types/src/index.ts` | Export new traversal types |
| `packages/client/src/index.ts` | Export adapter |
| `apps/web/src/lib/graph-sources/persistent-graph-source.ts` | Preserve edge properties |
| `apps/web/src/services/graph-algorithms.ts` | Add weight config support |
| `apps/web/src/hooks/use-graph-algorithms.ts` | Add weighted path support |
| `apps/web/src/components/algorithms/categories/PathfindingTab.tsx` | Weight selector UI |

## Testing Strategy

1. **Unit Tests**: WeightConfig parsing, weight function building
2. **Integration Tests**: Adapter with PersistentGraph, filtered traversal
3. **Component Tests**: PathfindingTab weight controls
4. **E2E Tests**: Full weighted pathfinding flow

## Success Criteria

1. ✓ Can find shortest path using `score` as edge weight
2. ✓ Can find "strongest" path (inverted weights)
3. ✓ Can filter traversal by node types
4. ✓ Can filter by edge properties during pathfinding
5. ✓ Bidirectional traversal works correctly
6. ✓ Custom weight functions work
7. ✓ UI shows weight configuration options
8. ✓ Results display weighted distances
