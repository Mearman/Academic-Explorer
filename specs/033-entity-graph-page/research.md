# Research: Entity Graph Page

**Date**: 2025-12-01
**Feature**: 033-entity-graph-page

## Overview

This document captures research findings for creating a `/graph` page that displays repository entities as an interactive force-directed graph, reusing functionality from the existing `/algorithms` page.

## Existing Architecture Analysis

### Repository Store (`apps/web/src/stores/repository-store.ts`)

**Decision**: Use existing repository-store for data access
**Rationale**: Already provides the exact data structures needed (GraphNode, GraphEdge)
**Alternatives Considered**: Direct Dexie access (rejected - violates Storage Abstraction principle)

Key interfaces:
```typescript
interface RepositoryState {
  repositoryNodes: Record<string, GraphNode>;  // nodeId -> GraphNode
  repositoryEdges: Record<string, GraphEdge>;  // edgeId -> GraphEdge
  // ... filter state, selection state
}
```

The `getRepositoryState()` method returns the complete state including computed filtered nodes/edges.

### Graph Visualization Components

**Decision**: Reuse existing ForceGraphVisualization and ForceGraph3DVisualization
**Rationale**: These components already implement all required visualization features
**Alternatives Considered**: Building new visualization (rejected - unnecessary duplication)

Location: `apps/web/src/components/graph/`
- `ForceGraphVisualization.tsx` - 2D rendering with react-force-graph-2d
- `3d/ForceGraph3DVisualization.tsx` - 3D rendering with react-force-graph-3d

Key props interface:
```typescript
interface ForceGraphVisualizationProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  displayMode?: DisplayMode;  // 'highlight' | 'filter'
  highlightedNodeIds?: Set<string>;
  highlightedPath?: string[];
  communityAssignments?: Map<string, number>;
  communityColors?: Map<number, string>;
  enableSimulation?: boolean;
  seed?: number;
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  onBackgroundClick?: () => void;
  onGraphReady?: (methods: ForceGraphMethods) => void;
}
```

### Algorithm Hooks (`apps/web/src/hooks/use-graph-algorithms.ts`)

**Decision**: Use existing hooks directly
**Rationale**: Comprehensive coverage of all required algorithms
**Alternatives Considered**: None - these are already well-abstracted

Provides:
- `useGraphStatistics` - Node/edge counts, density, etc.
- `useCommunityDetection` - Louvain, spectral, hierarchical clustering
- `useShortestPath` - Dijkstra pathfinding
- `useConnectedComponents` - Component analysis
- `useKCore` - K-core decomposition
- `useEgoNetwork` - Ego network extraction
- And 15+ more algorithm hooks

### Algorithm UI Components (`apps/web/src/components/algorithms/`)

**Decision**: Reuse AlgorithmTabs component
**Rationale**: Already encapsulates all algorithm controls and result display
**Alternatives Considered**: Building simplified version (rejected - full functionality required per spec)

The `AlgorithmTabs` component receives:
```typescript
interface AlgorithmTabsProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onHighlightNodes: (nodeIds: string[]) => void;
  onHighlightPath: (path: string[]) => void;
  onSelectCommunity: (communityId: number, nodeIds: string[]) => void;
  onCommunitiesDetected: (communities: CommunityResult[], colors: Map<number, string>) => void;
  pathSource: string | null;
  pathTarget: string | null;
  onPathSourceChange: (nodeId: string | null) => void;
  onPathTargetChange: (nodeId: string | null) => void;
}
```

## State Management Patterns

### Visualization State (to be extracted)

The algorithms page manages significant visualization state inline:
```typescript
// Highlighting
const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
const [highlightedPath, setHighlightedPath] = useState<string[]>([]);

// Community coloring
const [communityAssignments, setCommunityAssignments] = useState<Map<string, number>>(new Map());
const [communityColors, setCommunityColors] = useState<Map<number, string>>(new Map());

// View settings
const [displayMode, setDisplayMode] = useState<DisplayMode>('highlight');
const [enableSimulation, setEnableSimulation] = useState(true);
const { viewMode, setViewMode } = useViewModePreference('2D');

// Path selection
const [pathSource, setPathSource] = useState<string | null>(null);
const [pathTarget, setPathTarget] = useState<string | null>(null);
```

**Decision**: Extract into `useGraphVisualization` hook
**Rationale**: Enables code reuse between algorithms and graph pages
**Alternative Considered**: Duplicate state in graph page (rejected - violates DRY principle)

### Repository Data Subscription

**Decision**: Create `useRepositoryGraph` hook with polling/subscription pattern
**Rationale**: Repository store doesn't have built-in React subscription; need reactive updates
**Alternatives Considered**:
- Dexie useLiveQuery (rejected - would require direct Dexie access)
- useEffect polling (selected - simpler, works with existing store)

Implementation approach:
```typescript
function useRepositoryGraph() {
  const [state, setState] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const repoState = await repositoryStore.getRepositoryState();
      setState({
        nodes: Object.values(repoState.repositoryNodes),
        edges: Object.values(repoState.repositoryEdges),
      });
      setLoading(false);
    };
    loadData();

    // Poll for changes (repository has no subscription mechanism)
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, []);

  return { ...state, loading, isEmpty: state.nodes.length === 0 };
}
```

## Routing Pattern

### TanStack Router File-Based Routing

**Decision**: Follow existing lazy-loading pattern
**Rationale**: Consistent with other routes in the application

Pattern from existing routes:
```typescript
// graph.tsx - Route definition
import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/graph')({});

// graph.lazy.tsx - Lazy component
import { createLazyFileRoute } from '@tanstack/react-router';
function GraphPage() { /* implementation */ }
export const Route = createLazyFileRoute('/graph')({ component: GraphPage });
```

## Navigation Integration

**Decision**: Add to header navigation (alongside Algorithms link)
**Rationale**: Consistent placement with related functionality
**Location**: `apps/web/src/components/layout/MainLayout.tsx` or equivalent

## Empty State Handling

**Decision**: Show informative empty state with call-to-action
**Rationale**: Guides users to add entities before they can visualize
**Design**: Similar to existing empty states (History, Bookmarks pages)

## Performance Considerations

### Graph Size Limits

**Decision**: Support up to 500 nodes with smooth interaction; degrade gracefully for larger graphs
**Rationale**: Balance between functionality and performance
**Future Enhancement**: Implement sampling/pagination for 1000+ node repositories

### Deterministic Layouts

**Decision**: Use fixed seed (42) for reproducible initial positions
**Rationale**: Consistent with constitution requirement for deterministic layouts

## Test Strategy

### Unit Tests
- `useRepositoryGraph` hook: data loading, empty state, polling
- `useGraphVisualization` hook: state transitions, handlers

### Component Tests
- GraphPageContent: rendering with mock data, empty state, algorithm integration

### E2E Tests
- Navigate to /graph with empty repository → empty state
- Add entities → graph renders
- Run algorithm → results displayed
- Toggle 2D/3D → visualization updates

## Unresolved Questions

None - all technical decisions have clear paths based on existing patterns.

## References

- Existing algorithms page: `apps/web/src/routes/algorithms.lazy.tsx`
- Repository store: `apps/web/src/stores/repository-store.ts`
- Graph hooks: `apps/web/src/hooks/use-graph-algorithms.ts`
- Visualization components: `apps/web/src/components/graph/`
