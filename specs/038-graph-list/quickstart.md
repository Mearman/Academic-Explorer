# Quickstart Guide: Graph List Persistent Working Set

**Feature**: 038-graph-list
**Date**: 2025-12-02
**For**: Developers implementing or using the graph list feature

## Overview

The Graph List is a persistent working set that tracks which nodes are currently visible in the graph visualization. Unlike bookmarks and history (which are filtered by entity type), graph list nodes **always remain visible** regardless of filter settings. This solves the "invisible expansion" bug where discovered nodes would disappear due to type filters.

## Key Concepts

### What is the Graph List?

- **Persistent storage**: Survives browser sessions, stored in IndexedDB
- **Bypasses filters**: Nodes in graph list ignore entity type filters
- **Provenance tracking**: Each node remembers how it was added
- **Size limited**: Maximum 1000 nodes to ensure performance

### Visibility Logic

```typescript
// Nodes visible in graph
visible_nodes = graph_list ∪ (collections ∩ entity_types)

// Where:
// - graph_list: Always visible (no filtering)
// - collections: Bookmarks + History
// - entity_types: User-enabled filters (works, authors, etc.)
// - ∪: Union (combine both sets)
// - ∩: Intersection (filter collections by types)
```

**Example**:
- Graph list contains: Work W1, Author A1, Institution I1
- Bookmarks contain: Work W1, Work W2, Author A1, Author A2
- Enabled entity types: `[works]`
- **Result**: W1, W2 (from bookmarks filtered by types) + A1, I1 (from graph list, unfiltered) = **W1, W2, A1, I1**

## Storage Provider Usage

### Adding Nodes

```typescript
import { storageProvider } from '@bibgraph/utils';

// Add a single node
await storageProvider.addToGraphList({
  entityId: 'W2741809807',
  entityType: 'works',
  label: 'Attention Is All You Need',
  provenance: 'user'  // How node was added
});

// Add multiple nodes (single transaction, faster)
await storageProvider.batchAddToGraphList([
  { entityId: 'W1', entityType: 'works', label: 'Paper 1', provenance: 'expansion' },
  { entityId: 'A1', entityType: 'authors', label: 'Jane Doe', provenance: 'expansion' },
]);
```

### Retrieving Nodes

```typescript
// Get all graph list nodes
const nodes = await storageProvider.getGraphList();
console.log(`Graph contains ${nodes.length} nodes`);

// Check if specific node exists
const exists = await storageProvider.isInGraphList('W2741809807');
if (exists) {
  console.log('Node already in graph');
}

// Get current size
const size = await storageProvider.getGraphListSize();
if (size >= 900) {
  console.warn(`Approaching size limit: ${size}/1000`);
}
```

### Removing Nodes

```typescript
// Remove a single node
await storageProvider.removeFromGraphList('W2741809807');

// Clear entire graph list
await storageProvider.clearGraphList();
```

### Pruning Old Nodes

```typescript
// Remove auto-populated nodes older than 24 hours
const result = await storageProvider.pruneGraphList();
console.log(`Pruned ${result.removedCount} nodes`);
console.log(`Removed IDs:`, result.removedNodeIds);
```

## React Hook Usage

### Basic Usage

```typescript
import { useGraphList } from '@/hooks/use-graph-list';

function GraphPage() {
  const { nodes, addNode, removeNode, clearList, isLoading, error } = useGraphList();

  const handleAddNode = async () => {
    await addNode({
      entityId: 'W2741809807',
      entityType: 'works',
      label: 'Attention Is All You Need',
      provenance: 'user'
    });
  };

  return (
    <div>
      <h2>Graph List ({nodes.length} nodes)</h2>
      {nodes.map(node => (
        <div key={node.id}>
          {node.label} ({node.provenance})
          <button onClick={() => removeNode(node.entityId)}>Remove</button>
        </div>
      ))}
      <button onClick={clearList}>Clear All</button>
    </div>
  );
}
```

### With Optimistic Updates

```typescript
const { addNode } = useGraphList();

// UI updates immediately, storage persists async
await addNode({
  entityId: 'W123',
  entityType: 'works',
  label: 'New Paper',
  provenance: 'user'
});
// UI shows node instantly, even if IndexedDB takes 50ms
```

## Provenance Types

### When to Use Each Type

```typescript
// 1. 'user' - User explicitly adds via search/UI
await addToGraphList({
  entityId: selectedWork.id,
  entityType: 'works',
  label: selectedWork.display_name,
  provenance: 'user'  // ← User clicked "Add to graph" button
});

// 2. 'collection-load' - Loading from bookmarks/history
const bookmarks = await storageProvider.getBookmarks();
for (const bookmark of bookmarks) {
  await addToGraphList({
    ...bookmark,
    provenance: 'collection-load'  // ← From bookmark/history
  });
}

// 3. 'expansion' - Node expansion discovers relationships
const relatedWorks = await expandNode(authorId);
for (const work of relatedWorks) {
  await addToGraphList({
    ...work,
    provenance: 'expansion'  // ← Discovered via expansion
  });
}

// 4. 'auto-population' - Background auto-population system
const discoveredNodes = await autoPopulateRelationships();
for (const node of discoveredNodes) {
  await addToGraphList({
    ...node,
    provenance: 'auto-population'  // ← Background discovery
  });
}
```

## UI Components

### Graph List Sidebar

```typescript
import { GraphListSidebar } from '@/components/graph/GraphListSidebar';

function GraphPage() {
  return (
    <div className="graph-layout">
      <GraphListSidebar />  {/* Sidebar component */}
      <GraphVisualization />
    </div>
  );
}
```

### Individual Node Items

```typescript
import { GraphListNode } from '@/components/graph/GraphListNode';

function GraphListSidebar() {
  const { nodes, removeNode } = useGraphList();

  return (
    <div>
      {nodes.map(node => (
        <GraphListNode
          key={node.id}
          node={node}
          onRemove={() => removeNode(node.entityId)}
          onClick={() => centerGraphOn(node.entityId)}
        />
      ))}
    </div>
  );
}
```

## Size Limit Management

### Warning at 900 Nodes

```typescript
const { nodes } = useGraphList();

if (nodes.length >= 900 && nodes.length < 1000) {
  showToast({
    type: 'warning',
    message: `Graph approaching size limit (${nodes.length}/1000 nodes). Consider removing unused nodes.`
  });
}
```

### Block at 1000 Nodes

```typescript
const handleAdd = async (node) => {
  try {
    await addNode(node);
  } catch (error) {
    if (error.message.includes('full')) {
      showToast({
        type: 'error',
        message: 'Graph list is full (1000 nodes). Remove some nodes to add more.'
      });
    }
  }
};
```

### Prune Button

```typescript
const handlePrune = async () => {
  const result = await storageProvider.pruneGraphList();
  showToast({
    type: 'success',
    message: `Pruned ${result.removedCount} auto-populated nodes`
  });
};

<button onClick={handlePrune}>
  Prune Old Nodes
</button>
```

## Testing

### Unit Tests (Storage Provider)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStorageProvider } from '@bibgraph/utils/storage';

describe('Graph List Storage', () => {
  let provider: InMemoryStorageProvider;

  beforeEach(async () => {
    provider = new InMemoryStorageProvider();
    await provider.initializeSpecialLists();
  });

  it('should add node to graph list', async () => {
    const nodeId = await provider.addToGraphList({
      entityId: 'W123',
      entityType: 'works',
      label: 'Test Paper',
      provenance: 'user'
    });

    const nodes = await provider.getGraphList();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].entityId).toBe('W123');
  });

  it('should enforce size limit (1000 nodes)', async () => {
    // Add 1000 nodes
    for (let i = 0; i < 1000; i++) {
      await provider.addToGraphList({
        entityId: `W${i}`,
        entityType: 'works',
        label: `Paper ${i}`,
        provenance: 'user'
      });
    }

    // 1001st should fail
    await expect(
      provider.addToGraphList({
        entityId: 'W1001',
        entityType: 'works',
        label: 'Paper 1001',
        provenance: 'user'
      })
    ).rejects.toThrow('full');
  });
});
```

### Component Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { GraphListSidebar } from '@/components/graph/GraphListSidebar';

it('should display graph list nodes', () => {
  const mockNodes = [
    { id: '1', entityId: 'W123', label: 'Paper 1', provenance: 'user', addedAt: new Date() },
    { id: '2', entityId: 'A456', label: 'Author 1', provenance: 'expansion', addedAt: new Date() },
  ];

  render(<GraphListSidebar nodes={mockNodes} />);

  expect(screen.getByText('Paper 1')).toBeInTheDocument();
  expect(screen.getByText('Author 1')).toBeInTheDocument();
});
```

### E2E Tests (Persistence)

```typescript
import { test, expect } from '@playwright/test';

test('graph list persists across sessions', async ({ page, context }) => {
  // Add node to graph list
  await page.goto('/graph');
  await page.click('[data-testid="add-to-graph-W123"]');

  // Verify node appears
  await expect(page.locator('[data-testid="graph-node-W123"]')).toBeVisible();

  // Close and reopen browser
  await context.close();
  const newContext = await browser.newContext();
  const newPage = await newContext.newPage();
  await newPage.goto('/graph');

  // Verify node still visible (persisted)
  await expect(newPage.locator('[data-testid="graph-node-W123"]')).toBeVisible();
});
```

## Common Patterns

### Loading Graph on Page Mount

```typescript
useEffect(() => {
  const loadGraph = async () => {
    // Get graph list (always visible)
    const graphNodes = await storageProvider.getGraphList();

    // Get collection nodes (filtered by enabled types)
    const bookmarks = await storageProvider.getBookmarks();
    const history = await storageProvider.getHistory();
    const collectionNodes = [...bookmarks, ...history].filter(node =>
      enabledEntityTypes.includes(node.entityType)
    );

    // Union: graph list + filtered collections
    const allNodes = unionByEntityId([...graphNodes, ...collectionNodes]);

    setGraphNodes(allNodes);
  };

  loadGraph();
}, [enabledEntityTypes]);
```

### Adding Expansion Results

```typescript
const handleExpand = async (nodeId: string) => {
  const relatedNodes = await fetchRelationships(nodeId);

  // Add all discovered nodes to graph list
  await storageProvider.batchAddToGraphList(
    relatedNodes.map(node => ({
      ...node,
      provenance: 'expansion'  // Track as expansion result
    }))
  );

  // UI updates automatically via useGraphList hook
};
```

### Clearing Graph on Filter Change

```typescript
// Option 1: Keep graph list, re-filter collections
const handleFilterChange = (newFilters) => {
  setEnabledEntityTypes(newFilters);
  // Graph list nodes remain visible
  // Collection nodes re-filtered automatically
};

// Option 2: Clear graph list on major filter change
const handleClearAndReload = async () => {
  await storageProvider.clearGraphList();
  // Load fresh from collections
  loadCollectionsIntoGraph();
};
```

## Troubleshooting

### Nodes Not Appearing After Expansion

**Problem**: Expanded nodes don't show up in graph
**Solution**: Ensure nodes are added to graph list with correct provenance

```typescript
// ❌ Wrong: Expansion results not added to graph list
const results = await expandNode(id);
setGraphNodes([...graphNodes, ...results]);  // Lost on refresh!

// ✅ Correct: Add to graph list for persistence
const results = await expandNode(id);
await storageProvider.batchAddToGraphList(
  results.map(r => ({ ...r, provenance: 'expansion' }))
);
```

### Size Limit Errors

**Problem**: Cannot add more nodes (1000 limit reached)
**Solution**: Prune old auto-populated nodes or manually remove unused nodes

```typescript
// Automatic pruning (removes auto-pop older than 24h)
await storageProvider.pruneGraphList();

// Manual removal
await storageProvider.removeFromGraphList(unusedEntityId);
```

### Duplicate Nodes

**Problem**: Same node appearing multiple times
**Solution**: Storage provider automatically deduplicates by entityId

```typescript
// Safe to call multiple times - only updates provenance
await storageProvider.addToGraphList({ entityId: 'W123', ... });
await storageProvider.addToGraphList({ entityId: 'W123', ... });
// Result: Only one W123 in graph list (provenance updated to most recent)
```

## Next Steps

1. Review [data-model.md](./data-model.md) for detailed type definitions
2. Review [contracts/storage-provider-graph-list.ts](./contracts/storage-provider-graph-list.ts) for interface specifications
3. Implement storage provider methods (Dexie + in-memory)
4. Create React hook (`use-graph-list.ts`)
5. Build UI components (sidebar, node items)
6. Write tests (unit, component, E2E)
