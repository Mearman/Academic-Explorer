# Implementation Plan: Entity Graph Page

**Branch**: `033-entity-graph-page` | **Date**: 2025-12-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/033-entity-graph-page/spec.md`

## Summary

Create a new `/graph` route that displays repository entities (from `repository-store.ts`) as an interactive force-directed graph. The implementation extracts reusable visualization and algorithm functionality from the existing `/algorithms` page into shared hooks, enabling both the demo page and the new production page to use the same underlying infrastructure without code duplication.

## Technical Context

**Language/Version**: TypeScript 5.x (ES modules, strict mode)
**Primary Dependencies**: React 19, TanStack Router v7, Mantine UI 7.x, react-force-graph-2d/3d, @bibgraph/types, @bibgraph/algorithms
**Storage**: IndexedDB via Dexie (repository-store.ts wraps bibgraph-repository database)
**Testing**: Vitest (unit/integration), Playwright (E2E) - all serial execution
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Nx monorepo - apps/web (deployable SPA), packages/* (shared libraries)
**Performance Goals**: 500+ nodes at 30+ FPS; <2s initial load; <500ms algorithm execution
**Constraints**: Serial test execution (OOM prevention); 8GB heap limit; deterministic layouts via fixed seeds
**Scale/Scope**: Single new route consuming existing repository data (0 to thousands of entities)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Type Safety**: ✅ Uses existing typed GraphNode/GraphEdge from @bibgraph/types; no `any` types planned
2. **Test-First Development**: ✅ Will write failing tests for graph page rendering, repository data display, and algorithm integration before implementation
3. **Monorepo Architecture**: ✅ New route in apps/web/src/routes/; shared hooks stay in apps/web/src/hooks/; no new packages needed
4. **Storage Abstraction**: ✅ Uses existing repository-store which wraps Dexie; no direct IndexedDB access
5. **Performance & Memory**: ✅ Targets 500+ nodes; reuses existing Web Worker simulation; serial tests
6. **Atomic Conventional Commits**: ✅ Each task (hook extraction, route creation, algorithm integration) committed separately
7. **Development-Stage Pragmatism**: ✅ Breaking changes to algorithms page acceptable for cleaner abstraction
8. **Test-First Bug Fixes**: ✅ Any bugs discovered will have regression tests first
9. **Repository Integrity**: ✅ Will run `pnpm validate` at start and end; fix all issues found
10. **Continuous Execution**: ✅ Will proceed through all phases without pausing
11. **Complete Implementation**: ✅ Full feature as specified; no simplified fallbacks
12. **Spec Index Maintenance**: ✅ specs/README.md will be updated when spec status changes
13. **Build Output Isolation**: ✅ All builds output to dist/, not alongside source
14. **Working Files Hygiene**: ✅ Debug files cleaned before commit
15. **DRY Code & Configuration**: ✅ Graph visualization hooks extracted for reuse between algorithms and graph pages
16. **Presentation/Functionality Decoupling**: ✅ Business logic in hooks (useRepositoryGraph, useGraphAlgorithms); rendering in components (ForceGraphVisualization); page connects them

**Complexity Justification Required?** No - feature uses existing architecture without adding new packages, storage providers, or workers.

## Project Structure

### Documentation (this feature)

```text
specs/033-entity-graph-page/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (internal component contracts)
│   └── use-repository-graph.contract.ts
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/src/
├── routes/
│   ├── graph.tsx             # NEW: Route definition
│   └── graph.lazy.tsx        # NEW: Lazy-loaded graph page
├── hooks/
│   ├── use-graph-algorithms.ts      # EXISTING: Graph algorithm hooks
│   ├── use-repository-graph.ts      # NEW: Repository data to graph conversion
│   └── use-graph-visualization.ts   # NEW: Extracted visualization state management
├── components/
│   ├── graph/
│   │   ├── ForceGraphVisualization.tsx     # EXISTING: 2D visualization
│   │   ├── 3d/ForceGraph3DVisualization.tsx # EXISTING: 3D visualization
│   │   └── GraphPageContent.tsx            # NEW: Main content component
│   └── algorithms/
│       ├── AlgorithmTabs.tsx               # EXISTING: Algorithm controls
│       └── ... (other algorithm items)
└── stores/
    └── repository-store.ts    # EXISTING: Entity storage
```

**Structure Decision**: All new code within apps/web following existing patterns. The new `use-repository-graph.ts` hook bridges repository-store data to graph visualization format. Visualization components already exist and will be reused directly.

## Complexity Tracking

No constitution violations requiring justification.

## Implementation Phases

### Phase 1: Abstraction and Extraction

**Goal**: Extract reusable state management from algorithms page into shared hooks

1. Create `use-graph-visualization.ts` hook extracting:
   - Graph display state (highlightedNodes, highlightedPath, communityAssignments, communityColors)
   - View mode state (2D/3D toggle, simulation enable/disable, display mode)
   - Graph interaction handlers (node click, background click, fit-to-view)

2. Create `use-repository-graph.ts` hook:
   - Subscribe to repository-store changes
   - Convert repositoryNodes/repositoryEdges to GraphNode[]/GraphEdge[]
   - Provide loading/error states
   - Handle empty repository case

3. Refactor algorithms page to use extracted hooks (verify no regression)

### Phase 2: Graph Page Implementation

**Goal**: Create the /graph route with full functionality

1. Create route files (`graph.tsx`, `graph.lazy.tsx`)
2. Create `GraphPageContent.tsx` component:
   - Use `useRepositoryGraph` for data
   - Use `useGraphVisualization` for state
   - Render ForceGraphVisualization (2D) or ForceGraph3DVisualization (3D)
   - Include AlgorithmTabs for algorithm controls
   - Show empty state when no repository data

3. Add navigation link to header/sidebar

### Phase 3: Polish and Integration

**Goal**: Complete feature with full test coverage

1. Write E2E tests for graph page:
   - Empty state display
   - Repository data visualization
   - Algorithm execution on real data
   - 2D/3D toggle

2. Performance verification:
   - Test with 500+ nodes
   - Verify <2s load time
   - Verify smooth interaction

3. Final cleanup and documentation

## Dependencies

### External (already in package.json)
- react-force-graph-2d: Graph visualization (2D)
- react-force-graph-3d: Graph visualization (3D)
- @mantine/core: UI components
- @tanstack/react-router: Routing
- dexie: IndexedDB wrapper (via repository-store)

### Internal
- @bibgraph/types: GraphNode, GraphEdge, EntityType, RelationType
- @bibgraph/algorithms: Graph algorithms (community detection, pathfinding, etc.)
- apps/web/src/stores/repository-store.ts: Entity storage
- apps/web/src/hooks/use-graph-algorithms.ts: Algorithm hooks
- apps/web/src/components/graph/ForceGraphVisualization.tsx: 2D renderer
- apps/web/src/components/graph/3d/ForceGraph3DVisualization.tsx: 3D renderer
- apps/web/src/components/algorithms/AlgorithmTabs.tsx: Algorithm UI

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Repository data format incompatibility | Low | Medium | GraphNode/GraphEdge types already match repository format |
| Performance issues with large repositories | Medium | Medium | Implement pagination/sampling for >1000 nodes (future enhancement) |
| Algorithm page regression after extraction | Medium | High | Test-first approach; run full test suite after each extraction |
| Memory issues with large graphs | Low | High | Existing Web Worker architecture handles this; serial test execution |
