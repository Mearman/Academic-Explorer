# Implementation Plan: Graph List Persistent Working Set

**Branch**: `038-graph-list` | **Date**: 2025-12-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/038-graph-list/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a persistent "Graph List" working set that stores currently visible graph nodes in IndexedDB alongside bookmarks and history. The graph list bypasses entity type filters (solving the "invisible expansion" bug) while collection loading (bookmarks/history) respects type filters. Visibility logic: `visible = graph_list ∪ (collections ∩ entity_types)`. Nodes track provenance (user, expansion, auto-population, collection-load), support CRUD operations, enforce 1000-node size limit with pruning, and provide real-time UI updates.

## Technical Context

**Language/Version**: TypeScript 5.9.2 (ES modules, strict mode)
**Primary Dependencies**:
  - Storage: Dexie 4.0.10 (IndexedDB wrapper), Zustand 5.0.3 + Immer 10.1.1 (state management)
  - UI: Mantine 7.18.0 (components), Vanilla Extract (styling)
  - Testing: Vitest 3.0.0 (unit/integration), MSW 2.7.0 (mocking)
**Storage**: IndexedDB via Dexie (existing `CatalogueStorageProvider` interface, add `graph` special list)
**Testing**: Vitest (serial execution for memory constraints), in-memory storage provider for E2E
**Target Platform**: Browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
**Project Type**: Monorepo (Nx workspace) - extends `packages/utils` storage, `apps/web` UI, `packages/types` type definitions
**Performance Goals**:
  - Graph list persistence: <500ms for add/remove operations
  - UI updates: <100ms reactivity for graph list changes
  - 1000-node graph list: <2s load time, 60fps rendering
  - IndexedDB queries: <50ms for list retrieval
**Constraints**:
  - Serial test execution (memory limits)
  - IndexedDB transaction limits (batch operations for performance)
  - Graph rendering performance ceiling (1000 nodes without degradation)
  - Real-time UI synchronization (optimistic updates + eventual consistency)
**Scale/Scope**:
  - Storage: 1000-node graph list maximum (enforced limit)
  - UI: Single graph list sidebar component + node list items
  - Operations: 4 provenance types, 5 storage provider methods, 3 UI management actions
  - Tests: 15+ unit tests (storage), 10+ component tests (UI), 8+ E2E tests (persistence)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with BibGraph Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ No `any` types planned; `GraphListNode` interface strictly typed; `GraphProvenance` enum for provenance
2. **Test-First Development**: ✅ Tests written and failing before implementation begins (storage provider tests, UI component tests, E2E persistence tests)
3. **Monorepo Architecture**: ✅ Changes use proper Nx workspace structure:
   - `packages/utils/src/storage/`: Storage provider interface extension
   - `packages/types/src/graph/`: GraphListNode type definitions
   - `apps/web/src/hooks/`: `use-graph-list.ts` hook for business logic
   - `apps/web/src/components/graph/`: `GraphListSidebar.tsx` UI component
   - **NO RE-EXPORTS**: Each package imports directly from canonical source
4. **Storage Abstraction**: ✅ All storage operations use `CatalogueStorageProvider` interface; add `graph` special list (ID: `"graph-list"`) alongside `bookmarks-list` and `history-list`; testable with in-memory provider
5. **Performance & Memory**: ✅ Tests run serially; 1000-node size limit prevents memory issues; efficient IndexedDB queries with batch operations; UI updates use optimistic rendering
6. **Atomic Conventional Commits**: ✅ Incremental atomic commits created after each task completion; spec file changes committed after each phase; **NEVER use `git add .`, `git add -A`, or `git commit -a`—use explicit file paths**
7. **Development-Stage Pragmatism**: ✅ Breaking change to node visibility logic acceptable; no migration path needed for existing graphs (new feature)
8. **Test-First Bug Fixes**: ✅ Any bugs discovered will have regression tests written to reproduce and fail before fixes implemented
9. **Repository Integrity**: ✅ ALL issues (tests, lint, build, audit, errors, warnings) MUST be resolved—"pre-existing" is not an excuse
10. **Continuous Execution**: ✅ Work continues without pausing between phases; spec commits after each phase completion; if no outstanding questions after /speckit.plan, automatically invoke /speckit.tasks then /speckit.implement
11. **Complete Implementation**: ✅ Implement full version as specified (all 6 user stories); no simplified fallbacks without user approval
12. **Spec Index Maintenance**: ✅ specs/README.md updated when spec status changes; committed alongside spec changes
13. **Build Output Isolation**: ✅ TypeScript builds to `dist/`, never alongside source files (Nx handles this)
14. **Working Files Hygiene**: ✅ Debug screenshots, fix chain docs, and temporary artifacts cleaned up before commit
15. **DRY Code & Configuration**: ✅ Graph list node management logic extracted to `use-graph-list` hook; provenance types centralized in `@bibgraph/types`; no duplicate storage operations; size limit constants extracted
16. **Presentation/Functionality Decoupling**: ✅ `GraphListSidebar.tsx` (presentation) separate from `use-graph-list.ts` (business logic); storage operations in provider; testable layers
17. **No Magic Numbers/Values**: ✅ Size limits extracted to constants:
    ```typescript
    const GRAPH_LIST_CONFIG = {
      MAX_SIZE: 1000,
      WARNING_THRESHOLD: 900,
      PRUNE_AGE_MS: 24 * 60 * 60 * 1000, // 24 hours
    } as const;
    ```
18. **Agent Embed Link Format**: ✅ N/A (no agent instruction file changes)
19. **Documentation Token Efficiency**: ✅ README.md updated with graph list feature description (concise); no duplication with spec
20. **Canonical Hash Computed Colours**: ✅ Graph list UI nodes use `getEntityColor(entityId)` for consistent colours; provenance badges use predefined colour scheme from theme

**Complexity Justification Required?** No violations—feature extends existing storage interface without adding new packages/apps/workers.

## Project Structure

### Documentation (this feature)

```text
specs/038-graph-list/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (storage patterns, UI design)
├── data-model.md        # Phase 1 output (GraphListNode, storage schema)
├── quickstart.md        # Phase 1 output (usage guide)
├── contracts/           # Phase 1 output (storage provider interface extensions)
│   └── storage-provider-graph-list.ts  # Interface additions
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/
├── types/
│   └── src/
│       └── graph/
│           ├── graph-list.ts         # GraphListNode, GraphProvenance types
│           └── graph-list.test.ts    # Type guard tests
├── utils/
│   └── src/
│       └── storage/
│           ├── catalogue-storage-provider.ts  # Interface: add graph list methods
│           ├── catalogue-db.ts                # Add SPECIAL_LIST_IDS.GRAPH = "graph-list"
│           ├── dexie-storage-provider.ts      # Implement graph list methods
│           ├── dexie-storage-provider.test.ts # Storage tests for graph list
│           └── in-memory-storage-provider.ts  # Implement for testing
apps/
└── web/
    └── src/
        ├── hooks/
        │   ├── use-graph-list.ts              # Business logic hook
        │   └── use-graph-list.test.ts         # Hook tests
        ├── components/
        │   └── graph/
        │       ├── GraphListSidebar.tsx       # Main sidebar component
        │       ├── GraphListSidebar.test.tsx  # Component tests
        │       ├── GraphListNode.tsx          # Individual node item
        │       ├── GraphListNode.test.tsx     # Node item tests
        │       └── GraphListEmpty.tsx         # Empty state component
        └── routes/
            └── graph/
                └── index.tsx                  # Integrate sidebar into graph page
```

**Structure Decision**: Extends existing monorepo structure. Storage abstraction in `packages/utils/src/storage/`, types in `packages/types/src/graph/`, UI in `apps/web/src/components/graph/`, business logic in `apps/web/src/hooks/`. No new packages/apps required—feature fits within established patterns.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected—feature aligns with all 20 constitution principles. Extends existing storage interface, follows established patterns, maintains separation of concerns.
