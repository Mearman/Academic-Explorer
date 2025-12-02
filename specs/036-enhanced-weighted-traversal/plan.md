# Implementation Plan: Enhanced Weighted Traversal

**Branch**: `036-enhanced-weighted-traversal` | **Date**: 2025-12-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/036-enhanced-weighted-traversal/spec.md`

## Summary

Add edge type filtering, node property weights, and composite weight functions to the existing weighted traversal system. Extends `TraversalOptions` with `edgeTypes?: RelationType[]`, enhances `WeightConfig` with `nodeProperty` support, and adds UI controls in the ShortestPathItem Advanced Options panel.

## Technical Context

**Language/Version**: TypeScript 5.x (ES2022 target)
**Primary Dependencies**: React 19, Mantine 7.x, @bibgraph/algorithms, @bibgraph/types
**Storage**: IndexedDB via PersistentGraph (read-only for traversal)
**Testing**: Vitest (serial execution), MSW for mocking
**Target Platform**: Web browser (React SPA)
**Project Type**: Monorepo (Nx workspace)
**Performance Goals**: Path calculations < 500ms for 5,000 nodes/20,000 edges
**Constraints**: O(1) weight calculations per edge, no full entity fetches during pathfinding
**Scale/Scope**: Extended UI in ShortestPathItem, type changes in @bibgraph/types, service layer in apps/web

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Type Safety**: ✅ All new types use existing `RelationType` union; `nodeProperty` typed as string with runtime validation
2. **Test-First Development**: ✅ Unit tests for edge type filtering and node property weighting before implementation
3. **Monorepo Architecture**: ✅ Changes in `packages/types` (TraversalOptions), `apps/web` (service, hooks, UI)
4. **Storage Abstraction**: ✅ Uses existing PersistentGraphAdapter; no direct IndexedDB access
5. **Performance & Memory**: ✅ Weight functions O(1); no full entity fetches; node properties from graph metadata
6. **Atomic Conventional Commits**: ✅ Commits per: types, service layer, hooks, UI component
7. **Development-Stage Pragmatism**: ✅ May extend interfaces without backward compatibility shims
8. **Test-First Bug Fixes**: ✅ Will follow for any bugs discovered
9. **Repository Integrity**: ✅ All changes must pass typecheck, test, lint, build
10. **Continuous Execution**: ✅ Implementation proceeds through all phases
11. **Complete Implementation**: ✅ Full edge type filtering and node property weighting
12. **Spec Index Maintenance**: ✅ specs/README.md updated on completion
13. **Build Output Isolation**: ✅ TypeScript builds to dist/ directories
14. **Working Files Hygiene**: ✅ No debug files committed
15. **DRY Code & Configuration**: ✅ Reuse existing weight function builders and filter patterns
16. **Presentation/Functionality Decoupling**: ✅ Logic in service/hooks, UI only renders controls
17. **No Magic Numbers/Values**: ✅ Constants for weight defaults, minimum positive weight value
18. **Agent Embed Link Format**: N/A - no agent instruction files modified
19. **Documentation Token Efficiency**: N/A - no AGENTS.md/README.md changes
20. **Canonical Hash Computed Colours**: N/A - no new entity-referencing UI elements

**Complexity Justification Required?** No - all changes within existing package/app structure.

## Project Structure

### Documentation (this feature)

```text
specs/036-enhanced-weighted-traversal/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
packages/types/src/
├── traversal-types.ts   # Add edgeTypes to TraversalOptions, nodeProperty to WeightConfig
└── relationships.ts     # Existing RelationType enum (no changes needed)

apps/web/src/
├── services/
│   └── graph-algorithms.ts   # Add edge type filtering, node property weight support
├── hooks/
│   └── use-graph-algorithms.ts  # Update useWeightedPath for new options
└── components/algorithms/items/
    └── ShortestPathItem.tsx  # Add Edge Type Filter UI, Node Property Weight UI
```

**Structure Decision**: Extends existing files in established locations. No new packages or apps required.

## Complexity Tracking

> No violations requiring justification.
