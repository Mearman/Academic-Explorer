# Quickstart: Entity Graph Page

**Date**: 2025-12-01
**Feature**: 033-entity-graph-page

## Overview

This guide provides a quick reference for implementing the entity graph page feature.

## Prerequisites

- Node.js 20+
- pnpm 10.x
- Development server running (`pnpm dev`)

## Key Files to Create

### 1. Repository Graph Hook

**Location**: `apps/web/src/hooks/use-repository-graph.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { GraphNode, GraphEdge } from '@bibgraph/types';
import { repositoryStore } from '@/stores/repository-store';

export function useRepositoryGraph() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      const state = await repositoryStore.getRepositoryState();
      setNodes(Object.values(state.repositoryNodes));
      setEdges(Object.values(state.repositoryEdges));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load repository'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    nodes,
    edges,
    loading,
    isEmpty: nodes.length === 0,
    error,
    refresh,
  };
}
```

### 2. Graph Visualization Hook

**Location**: `apps/web/src/hooks/use-graph-visualization.ts`

Extract state management from algorithms page (see contracts/use-graph-visualization.contract.ts for full interface).

### 3. Graph Page Route

**Location**: `apps/web/src/routes/graph.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/graph')({});
```

**Location**: `apps/web/src/routes/graph.lazy.tsx`

```typescript
import { createLazyFileRoute } from '@tanstack/react-router';
// Import components and hooks
// Implement GraphPage component
export const Route = createLazyFileRoute('/graph')({
  component: GraphPage,
});
```

## Testing Commands

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test apps/web/src/hooks/use-repository-graph.unit.test.ts

# Run E2E tests
pnpm nx e2e web --grep="graph"
```

## Development Workflow

1. **Write failing test** for hook/component
2. **Implement** the feature
3. **Verify test passes**
4. **Run full validation**: `pnpm validate`
5. **Commit atomically**: `git commit -m "feat(graph): add useRepositoryGraph hook"`

## Key Patterns to Follow

### Hook Pattern (from existing codebase)
```typescript
// Use useCallback for handlers
const handleNodeClick = useCallback((node: GraphNode) => {
  // implementation
}, [dependency]);

// Use useMemo for derived state
const statistics = useMemo(() => {
  return calculateStatistics(nodes, edges, true);
}, [nodes, edges]);
```

### Component Pattern (Presentation/Functionality Decoupling)
```typescript
// Container component (with hooks)
function GraphPageContent() {
  const { nodes, edges, loading, isEmpty } = useRepositoryGraph();
  const vis = useGraphVisualization();

  if (loading) return <LoadingState />;
  if (isEmpty) return <EmptyState />;

  return (
    <GraphVisualization
      nodes={nodes}
      edges={edges}
      {...vis}
    />
  );
}

// Presentational component (props only)
function GraphVisualization({ nodes, edges, highlightedNodes, ... }) {
  // Pure rendering, no side effects
}
```

### Test Pattern
```typescript
// Test file naming: *.unit.test.ts
describe('useRepositoryGraph', () => {
  it('should return empty arrays when repository is empty', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## Quick Reference: Existing APIs

### Repository Store
```typescript
// Get all repository data
const state = await repositoryStore.getRepositoryState();
state.repositoryNodes; // Record<string, GraphNode>
state.repositoryEdges; // Record<string, GraphEdge>
```

### Visualization Components
```typescript
<ForceGraphVisualization
  nodes={nodes}
  edges={edges}
  height={450}
  displayMode="highlight"
  highlightedNodeIds={highlightedNodes}
  highlightedPath={highlightedPath}
  communityAssignments={communityAssignments}
  communityColors={communityColors}
  enableSimulation={true}
  onNodeClick={handleNodeClick}
  onBackgroundClick={handleBackgroundClick}
  onGraphReady={handleGraphReady}
/>
```

### Algorithm Tabs
```typescript
<AlgorithmTabs
  nodes={nodes}
  edges={edges}
  onHighlightNodes={highlightNodes}
  onHighlightPath={highlightPath}
  onSelectCommunity={selectCommunity}
  onCommunitiesDetected={setCommunitiesResult}
  pathSource={pathSource}
  pathTarget={pathTarget}
  onPathSourceChange={setPathSource}
  onPathTargetChange={setPathTarget}
/>
```

## Common Issues

### Issue: Graph not updating after adding entities
**Solution**: The useRepositoryGraph hook polls every 1 second. Call `refresh()` for immediate update.

### Issue: TypeScript errors with GraphNode
**Solution**: Import from canonical source: `import type { GraphNode } from '@bibgraph/types'`

### Issue: Tests timing out
**Solution**: Ensure tests run serially. Check vitest config has `maxConcurrency: 1`.

## Related Documentation

- Spec: `specs/033-entity-graph-page/spec.md`
- Plan: `specs/033-entity-graph-page/plan.md`
- Research: `specs/033-entity-graph-page/research.md`
- Data Model: `specs/033-entity-graph-page/data-model.md`
- Contracts: `specs/033-entity-graph-page/contracts/`
