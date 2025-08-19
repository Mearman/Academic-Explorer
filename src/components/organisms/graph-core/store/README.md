# Generic Graph Data Store

A generic, reusable graph data store interface and adapter system that completely decouples data access from specific entity types. This system enables building reactive graph components that work with any vertex/edge data structure.

## Key Features

- **Zero Coupling**: No dependencies on OpenAlex entities or specific data types
- **Generic Types**: Works with any vertex/edge data structures via TypeScript generics
- **Observable Pattern**: Reactive updates for UI components
- **Pluggable Filtering**: Extensible filtering strategies
- **Clean Adapter Pattern**: Wraps existing stores without modifications

## Architecture

```
┌─────────────────────────────────────┐
│        Graph Components             │
│    (Generic, Reusable)              │
├─────────────────────────────────────┤
│   GraphDataStore<TVertex, TEdge>    │
│     (Generic Interface)             │
├─────────────────────────────────────┤
│     EntityGraphAdapter              │
│    (Specific Implementation)        │
├─────────────────────────────────────┤
│      EntityGraphStore               │
│    (Existing Store)                 │
└─────────────────────────────────────┘
```

## Core Files

### `abstract-store.ts`
- **`GraphDataStore<TVertex, TEdge>`**: Main interface for graph operations
- **`GraphVertex`** and **`GraphEdge`**: Base interfaces for data structures
- **`GraphFilterStrategy`**: Pluggable filtering system
- **`GraphStoreEventType`**: Observable event types
- **`GraphFilterUtils`**: Utility functions for creating filters

### `entity-graph-adapter.ts`
- **`EntityGraphAdapter`**: Implementation that wraps `EntityGraphStore`
- **`entityGraphAdapter`**: Singleton instance for application use
- Handles event forwarding and state synchronization
- Provides type mapping between entity types and generic types

### `usage-examples.ts`
- Comprehensive examples of all store operations
- Filter creation and management patterns
- Event handling and reactive patterns
- Custom adapter implementation examples

## Quick Start

```typescript
import { entityGraphAdapter, GraphFilterUtils, GraphStoreEventType } from './store';

// Get store instance
const store = entityGraphAdapter;

// Basic operations
const vertices = store.getAllVertices();
const edges = store.getAllEdges();
const stats = store.getStatistics();

// Selection
store.selectVertex(vertices[0].id);
const selected = store.getSelectedVertex();

// Filtering
const filter = GraphFilterUtils.createVertexPredicateFilter(
  (vertex) => vertex.directlyVisited === true,
  'visited-only'
);
store.addFilter(filter);
const filtered = store.getFilteredVertices();

// Events
const unsubscribe = store.subscribeToEvent(
  GraphStoreEventType.SELECTION_CHANGED,
  (event) => {
    console.log('Selection changed:', event.payload);
    // Update UI components
  }
);
```

## Filtering System

The store supports pluggable filtering strategies:

```typescript
// Property-based filters
const typeFilter = GraphFilterUtils.createVertexPropertyFilter(
  'entityType',
  'works',
  'works-only'
);

// Predicate-based filters
const recentFilter = GraphFilterUtils.createVertexPredicateFilter(
  (vertex) => new Date(vertex.firstSeen) > new Date('2024-01-01'),
  'recent-only'
);

// Edge weight filters
const strongEdgeFilter = GraphFilterUtils.createEdgeWeightFilter(0.7);

// Combined filters
const combinedFilter = GraphFilterUtils.combineFilters(
  [typeFilter, recentFilter],
  'works-recent-combined'
);
```

## Observable Events

The store emits events for reactive UI updates:

```typescript
store.subscribe((event) => {
  switch (event.type) {
    case GraphStoreEventType.DATA_CHANGED:
      // Re-render graph
      break;
    case GraphStoreEventType.SELECTION_CHANGED:
      // Update selection UI
      break;
    case GraphStoreEventType.FILTERS_CHANGED:
      // Update filter UI
      break;
  }
});
```

## Graph Analysis

Built-in graph analysis operations:

```typescript
// Shortest path
const path = store.findShortestPath(sourceId, targetId);

// Neighbors within N hops
const neighbors = store.getNeighbors(vertexId, 2);

// Vertex connectivity
const degree = store.getVertexDegree(vertexId);

// Graph statistics
const stats = store.getStatistics();
console.log(`${stats.totalVertices} vertices, ${stats.totalEdges} edges`);
```

## Creating Custom Adapters

You can create adapters for other data sources:

```typescript
class CustomGraphAdapter implements GraphDataStore<MyVertex, MyEdge> {
  // Implement all required methods
  
  getState() { /* ... */ }
  getAllVertices() { /* ... */ }
  getAllEdges() { /* ... */ }
  // ... etc
}
```

## Integration with UI Components

The generic store can be used with any graph visualization component:

```typescript
function GraphComponent() {
  const [vertices, setVertices] = useState<GraphVertex[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  
  useEffect(() => {
    const store = entityGraphAdapter;
    
    // Subscribe to changes
    const unsubscribe = store.subscribe((event) => {
      if (event.type === GraphStoreEventType.DATA_CHANGED ||
          event.type === GraphStoreEventType.FILTERS_CHANGED) {
        setVertices(store.getFilteredVertices());
        setEdges(store.getFilteredEdges());
      }
    });
    
    // Initial load
    setVertices(store.getFilteredVertices());
    setEdges(store.getFilteredEdges());
    
    return unsubscribe;
  }, []);
  
  return <YourGraphVisualization vertices={vertices} edges={edges} />;
}
```

## Type Safety

The system provides full type safety through generics:

```typescript
// The adapter preserves all entity-specific properties
type AdaptedVertex = GraphVertex & EntityGraphVertex;
type AdaptedEdge = GraphEdge & EntityGraphEdge;

// Filter functions are type-safe
const filter: VertexFilterFn<AdaptedVertex> = (vertex) => {
  // TypeScript knows about both GraphVertex and EntityGraphVertex properties
  return vertex.directlyVisited && vertex.displayName.includes('test');
};
```

## Performance Considerations

- Filters are applied on-demand during `getFilteredVertices/Edges()` calls
- Event listeners are optimized to avoid unnecessary renders
- Store subscriptions should be cleaned up in component unmount
- Large graphs may benefit from virtualization in UI components

## Design Principles

1. **Separation of Concerns**: Data access is separate from UI components
2. **Interface Segregation**: Only expose what components need
3. **Open/Closed**: Open for extension (new filters) but closed for modification
4. **Dependency Inversion**: Components depend on abstractions, not implementations
5. **Single Responsibility**: Each class has one reason to change

## Future Extensions

This system can be extended with:

- Graph algorithms (clustering, centrality measures)
- Persistence adapters for different storage systems
- Real-time synchronization between multiple clients
- Performance optimization through memoization
- Graph streaming for very large datasets

## Testing

The system supports comprehensive testing:

```typescript
import { entityGraphAdapter } from './store';

describe('GraphDataStore', () => {
  it('should filter vertices correctly', () => {
    const store = entityGraphAdapter;
    const initialCount = store.getAllVertices().length;
    
    store.addFilter(someFilter);
    const filteredCount = store.getFilteredVertices().length;
    
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });
});
```