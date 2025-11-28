# Implementation Plan: Louvain Algorithm Scaling Optimization

**Branch**: `027-louvain-scaling-optimization` | **Date**: 2025-11-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/027-louvain-scaling-optimization/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Optimize Louvain community detection algorithm through three phases: (1) Parameter tuning for 40% speedup (15.4s → ~11s), (2) Fast Louvain + altered communities for 2-3x additional speedup (~11s → 3-5s), (3) CSR data structures for 2x final speedup (3-5s → 1.5-2.5s). Target: Match graphology performance (~940ms for 1000 nodes) while maintaining modularity ≥0.19 (acceptable 5% quality loss from 0.2 baseline).

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode enabled
**Primary Dependencies**: None (zero runtime dependencies - pure TypeScript algorithms)
**Storage**: N/A (operates on in-memory graph data structures only)
**Testing**: Vitest (unit tests), performance benchmarks with real citation networks
**Target Platform**: Node.js (algorithms package) + Browser (via bundler)
**Project Type**: Monorepo package (`packages/algorithms/`)
**Performance Goals**:
- Phase 1: <12s for 1000 nodes (40% improvement from 15.4s)
- Phase 2: <5s for 1000 nodes (67-80% improvement)
- Phase 3: <2.5s for 1000 nodes (84-90% improvement, matching graphology)
- Small graphs (<200 nodes): <100ms (interactive use)

**Constraints**:
- All 9 existing Louvain tests MUST pass unchanged (backward compatibility)
- Modularity quality ≥0.19 (acceptable 5% loss from 0.2 baseline)
- Memory usage <100MB for 1000-node graphs
- Serial test execution (memory constraints)
- Deterministic results with seed parameter

**Scale/Scope**:
- Target graphs: 100-10,000 nodes
- Optimization scope: Single file (`packages/algorithms/src/clustering/louvain.ts`)
- CSR utilities may extract to `packages/algorithms/src/utils/csr.ts`
- Three incremental phases with independent verification

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with BibGraph Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ CSR implementation uses typed arrays (Uint32Array, Float64Array) with strict type guards; no `any` types in optimization code; configuration objects validated with `unknown` + type guards
2. **Test-First Development**: ✅ Each phase requires performance benchmarks passing before merging; regression tests for edge cases (empty graphs, disconnected components); TDD cycle for cache invalidation
3. **Monorepo Architecture**: ✅ Changes isolated to `packages/algorithms/src/clustering/louvain.ts`; no cross-package dependencies; CSR utilities may extract to `packages/algorithms/src/utils/csr.ts` if reused; no re-exports of internal types
4. **Storage Abstraction**: ✅ N/A - algorithm operates on in-memory graph data only
5. **Performance & Memory**: ✅ Success criteria explicitly define targets (<12s Phase 1, <5s Phase 2, <2.5s Phase 3); memory benchmarks for CSR typed arrays; target <100MB for 1000-node graphs
6. **Atomic Conventional Commits**: ✅ Phase 1 commit: `perf(algorithms): optimize Louvain with threshold scaling and iteration limits`; Phase 2: `perf(algorithms): add Fast Louvain and altered communities`; Phase 3: `perf(algorithms): refactor Louvain to CSR with community caching`; spec commits after each phase
7. **Development-Stage Pragmatism**: ✅ Breaking changes acceptable for configuration API if needed; prioritize performance over backward compatibility for internal APIs
8. **Test-First Bug Fixes**: ✅ Any performance regressions require failing test first, then fix
9. **Deployment Readiness**: ✅ `pnpm verify` pipeline must pass after each phase; existing tests must not break
10. **Continuous Execution**: ✅ Implement all three phases sequentially: Phase 1 → verify → Phase 2 → verify → Phase 3 → verify; no pauses between phases unless blocked
11. **Complete Implementation**: ✅ Full CSR implementation required (not simplified fallback); all three phases must deliver specified performance targets

**Complexity Justification Required?** No - changes are isolated to existing `packages/algorithms` structure. CSR utilities extraction is optional refactoring, not new architectural complexity.

## Project Structure

### Documentation (this feature)

```text
specs/027-louvain-scaling-optimization/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/algorithms/
├── src/
│   ├── clustering/
│   │   └── louvain.ts                 # Primary optimization target
│   ├── utils/
│   │   └── csr.ts                     # (Phase 3) CSR graph utilities (if extracted)
│   └── types/
│       └── clustering-types.ts        # Louvain configuration types
└── __tests__/
    ├── clustering/
    │   └── louvain.test.ts            # Existing 9 tests (must pass)
    ├── performance/
    │   └── louvain-scaling.performance.test.ts  # New benchmarks
    └── fixtures/
        └── citation-networks.ts       # Test graphs (100, 500, 1000, 5000 nodes)
```

**Structure Decision**: Monorepo package structure. All changes localized to `packages/algorithms/`. No new packages or apps created. CSR utilities may be extracted to `packages/algorithms/src/utils/csr.ts` in Phase 3 for potential reuse by other algorithms (spectral partitioning, k-core), but this is optional refactoring.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No complexity violations to justify. This feature:
- ✅ Works within existing `packages/algorithms` structure
- ✅ Uses zero external dependencies (pure TypeScript)
- ✅ Maintains existing test infrastructure
- ✅ Requires no new architectural patterns
- ✅ Follows YAGNI principles (no speculative abstractions)
