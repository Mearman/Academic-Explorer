# Quickstart: Persistent Graph Index

This guide covers the essential APIs for working with the persistent graph index.

## Setup

```typescript
import { PersistentGraph } from '@bibgraph/client';

// Create and initialize
const graph = new PersistentGraph();
await graph.initialize();

// Optional: explicitly hydrate (otherwise lazy on first query)
await graph.hydrate();
```

## Adding Nodes

```typescript
// Add a full node (from detail API)
await graph.addNode({
  id: 'W2741809807',
  entityType: 'works',
  label: 'The state of OA: a large-scale analysis',
  completeness: 'full',
  metadata: { cited_by_count: 1247 }
});

// Add a stub node (from relationship reference)
await graph.addNode({
  id: 'W1234567890',
  entityType: 'works',
  label: 'W1234567890', // Falls back to ID for stubs
  completeness: 'stub'
});
```

## Adding Edges

```typescript
// Add an authorship edge
await graph.addEdge({
  source: 'W2741809807',
  target: 'A5023888391',
  type: 'AUTHORSHIP',
  direction: 'outbound'
});

// Add a citation edge
await graph.addEdge({
  source: 'W2741809807',
  target: 'W1234567890',
  type: 'REFERENCE',
  direction: 'outbound'
});
```

## Querying

```typescript
// Get node by ID
const node = graph.getNode('W2741809807');
if (node.isSome()) {
  console.log(node.value.label);
}

// Check existence
const exists = graph.hasNode('W2741809807'); // true
const hasEdge = graph.hasEdge('W2741809807', 'A5023888391', 'AUTHORSHIP'); // true

// Get neighbors
const allNeighbors = graph.getNeighbors('W2741809807');
const authorsOnly = graph.getNeighbors('W2741809807', {
  direction: 'outbound',
  types: ['AUTHORSHIP']
});

// Get edges
const outgoing = graph.getEdgesFrom('W2741809807');
const authorships = graph.getEdgesFrom('W2741809807', 'AUTHORSHIP');
const incoming = graph.getEdgesTo('A5023888391');
```

## Filtering Nodes

```typescript
// Find all stub nodes (need expansion)
const stubs = graph.getNodesByCompleteness('stub');

// Find all works
const works = graph.getNodesByType('works');
```

## Subgraph Extraction

```typescript
// Get subgraph containing specific nodes
const { nodes, edges } = graph.getSubgraph(['W2741809807', 'A5023888391']);
```

## Statistics

```typescript
const stats = graph.getStatistics();
console.log(`Nodes: ${stats.nodeCount}, Edges: ${stats.edgeCount}`);
console.log(`Stubs: ${stats.nodesByCompleteness.stub}`);
```

## React Hook

```typescript
import { usePersistentGraph } from '@/lib/graph-index/use-persistent-graph';

function GraphVisualization() {
  const {
    graph,
    isHydrated,
    isLoading,
    error,
    nodes,
    edges,
    statistics
  } = usePersistentGraph();

  if (isLoading) return <Loading />;
  if (error) return <Error error={error} />;

  return <ForceGraph nodes={nodes} edges={edges} />;
}
```

## Automatic Indexing

Graph indexing happens automatically when entities are cached:

```typescript
import { cachedOpenAlex } from '@bibgraph/client';

// This automatically indexes relationships to the graph
const work = await cachedOpenAlex.works.get('W2741809807');
// Graph now contains:
// - Node for W2741809807 (full)
// - Stub nodes for all referenced entities
// - Edges for all relationships (authorships, citations, etc.)
```

## Cleanup

```typescript
// Clear all graph data
await graph.clear();

// Close connection when done
await graph.close();
```
