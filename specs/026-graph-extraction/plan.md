# Implementation Plan: Academic Graph Pattern Extraction

**Branch**: `026-graph-extraction` | **Date**: 2025-11-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/026-graph-extraction/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement graph extraction operations for academic citation networks including: (1) radius-k ego network extraction for citation context exploration, (2) attribute-based filtering for scoping large graphs, (3) citation path analysis for tracing intellectual lineage, (4) academic motif detection (triangles, stars, co-citation patterns), and (5) k-truss dense subgraph extraction for collaboration clusters. All operations will use the existing Graph<N, E> data structure from packages/algorithms and return Result<Graph<N, E>, ExtractionError> types.

## Technical Context

**Language/Version**: TypeScript 5.x (ES modules), strict mode enabled
**Primary Dependencies**: Zero external dependencies (packages/algorithms is self-contained)
**Storage**: N/A (operates on in-memory Graph<N, E> data structures only)
**Testing**: Vitest (unit, integration, performance tests); follows `foo.[type].test.ts` naming convention
**Target Platform**: Browser + Node.js (ES2022+ via Vite build)
**Project Type**: Monorepo package (packages/algorithms/src/extraction/)
**Performance Goals**: <500ms for radius-3 ego network on 1000-node graphs; <2s triangle detection on 1000-node/5000-edge graphs; <3s k-truss extraction for k=3 on 1000-node graphs
**Constraints**: Serial test execution (OOM prevention); deterministic results required for research reproducibility; memory-efficient algorithms for 10k-node graphs
**Scale/Scope**: Academic Explorer scale (1k-10k nodes, 5k-50k edges typical citation networks); 5 user stories = ~15-20 new functions + tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with Academic Explorer Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ **COMPLIANT** - All functions return `Result<Graph<N, E>, ExtractionError>` or `Result<T, ExtractionError>`. No `any` types. Generic type parameters `<N extends Node, E extends Edge>` enforce compile-time safety. Attribute filters use type guards for runtime validation.

2. **Test-First Development**: ✅ **COMPLIANT** - Each of 5 user stories has 3 acceptance scenarios = 15+ failing tests to be written before implementation. Tests follow `[feature].[type].test.ts` naming (e.g., `ego-network.unit.test.ts`, `triangle-detection.performance.test.ts`).

3. **Monorepo Architecture**: ✅ **COMPLIANT** - Feature lives in `packages/algorithms/src/extraction/`. Uses existing `Graph<N, E>`, `BFS`, `DFS` from same package via relative imports (within-package). Will NOT re-export from other packages. Updates `packages/algorithms/src/index.ts` to export new extraction functions.

4. **Storage Abstraction**: ✅ **COMPLIANT** - No persistence. Operates purely on in-memory `Graph<N, E>` structures. No storage provider needed.

5. **Performance & Memory**: ✅ **COMPLIANT** - Tests configured for serial execution. Performance tests validate <500ms ego network, <2s triangle detection, <3s k-truss extraction. Algorithms optimized for 1k-10k node scale. No Web Workers needed (synchronous operations <3s acceptable).

6. **Atomic Conventional Commits**: ✅ **COMPLIANT** - Each user story commits separately: `feat(algorithms): add radius-k ego network extraction`, `feat(algorithms): add attribute-based subgraph filtering`, etc. Spec files committed after Phase 0 and Phase 1 completion.

7. **Development-Stage Pragmatism**: ✅ **COMPLIANT** - Breaking changes acceptable. New extraction API does not need backward compatibility. Can change function signatures during development without migration paths.

8. **Test-First Bug Fixes**: ✅ **COMPLIANT** - Any bugs discovered will have regression tests added before fixes per standard workflow.

9. **Deployment Readiness**: ✅ **COMPLIANT** - Feature must pass `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build` across entire monorepo before completion. Will verify no pre-existing blockers remain.

10. **Continuous Execution**: ✅ **COMPLIANT** - After `/speckit.plan` completion, will automatically invoke `/speckit.tasks` then `/speckit.implement`. No pausing between phases. Commits after each phase.

**Complexity Justification Required?** ❌ **NO** - This feature:
- Adds functions to existing `packages/algorithms` package (no new packages)
- Uses existing Graph<N, E> data structure (no new storage)
- Synchronous operations (no new worker threads)
- Follows established patterns from traversal/ and analysis/ directories

## Project Structure

### Documentation (this feature)

```text
specs/026-graph-extraction/
├── spec.md              # Feature specification (input)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── extraction-api.ts  # TypeScript function signatures
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/algorithms/
├── src/
│   ├── extraction/                    # NEW: Graph extraction operations
│   │   ├── ego-network.ts             # Radius-k ego network extraction
│   │   ├── filter.ts                  # Attribute-based subgraph filtering
│   │   ├── path.ts                    # Shortest path & reachability
│   │   ├── motif.ts                   # Triangle, star, co-citation detection
│   │   ├── truss.ts                   # K-truss dense subgraph extraction
│   │   └── index.ts                   # Barrel export for extraction functions
│   ├── graph/
│   │   └── graph.ts                   # EXISTING: Graph<N, E> data structure
│   ├── traversal/
│   │   ├── bfs.ts                     # EXISTING: BFS (used by extraction)
│   │   └── dfs.ts                     # EXISTING: DFS (used by extraction)
│   ├── types/
│   │   ├── errors.ts                  # UPDATE: Add ExtractionError types
│   │   ├── graph.ts                   # EXISTING: Node, Edge interfaces
│   │   └── result.ts                  # EXISTING: Result<T, E> type
│   └── index.ts                       # UPDATE: Export extraction functions
└── __tests__/
    ├── extraction/                    # NEW: Extraction tests
    │   ├── ego-network.unit.test.ts
    │   ├── filter.unit.test.ts
    │   ├── path.unit.test.ts
    │   ├── motif.unit.test.ts
    │   ├── truss.unit.test.ts
    │   ├── ego-network.performance.test.ts
    │   ├── triangle-detection.performance.test.ts
    │   └── truss.performance.test.ts
    └── fixtures/
        └── extraction-graphs.ts       # NEW: Test fixtures for extraction
```

**Structure Decision**: Monorepo package structure (Option 1 adapted for packages/). Feature adds new `extraction/` directory to existing `packages/algorithms` package, following established pattern from `traversal/`, `analysis/`, `pathfinding/` directories. Uses within-package relative imports for existing code, exports via barrel file.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitution violations. All checks passed.

---

## Post-Phase 1 Constitution Re-Check

*Re-evaluated after Phase 1 design completion (research.md, data-model.md, contracts/, quickstart.md)*

**Status**: ✅ **ALL PRINCIPLES REMAIN COMPLIANT**

**Design Validation**:

1. **Type Safety**: ✅ Contracts verified - all functions use `Result<T, ExtractionError>` pattern, generic type parameters enforced, no `any` types in API signatures.

2. **Test-First Development**: ✅ Test structure defined - 15+ acceptance scenarios mapped to test files in `__tests__/extraction/`, includes unit + performance tests.

3. **Monorepo Architecture**: ✅ Structure confirmed - `packages/algorithms/src/extraction/` with 5 implementation files + barrel export, no cross-package re-exports.

4. **Storage Abstraction**: ✅ No persistence - confirmed in-memory only operations, no storage provider coupling.

5. **Performance & Memory**: ✅ Performance targets validated - algorithms selected for O(V×d²) complexity, suitable for 1k-10k node graphs, <3s operations.

6. **Atomic Conventional Commits**: ✅ Commit strategy defined - each user story = 1 feature commit, spec files committed after Phase 0 and Phase 1.

7. **Development-Stage Pragmatism**: ✅ No backward compatibility - clean API design without legacy concerns.

8. **Test-First Bug Fixes**: ✅ Process confirmed - regression test workflow documented in quickstart.

9. **Deployment Readiness**: ✅ Quality gates confirmed - all packages must pass typecheck/test/lint/build before merge.

10. **Continuous Execution**: ✅ Ready to proceed - Phase 0 and Phase 1 complete, no blockers for `/speckit.tasks` then `/speckit.implement`.

**No New Complexity**: Design did not introduce:
- New packages (reused `@academic-explorer/algorithms`)
- New storage providers (no persistence)
- New worker threads (synchronous operations acceptable)
- Architectural deviations (follows existing patterns)

**Ready for Phase 2**: All design artifacts complete. No outstanding questions or clarifications needed. Proceeding to task generation via `/speckit.tasks`.
