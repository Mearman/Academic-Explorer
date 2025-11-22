# Implementation Plan: OpenAlex Entity Definition Consolidation

**Branch**: `018-entity-consolidation` | **Date**: 2025-11-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-entity-consolidation/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Consolidate all duplicate `EntityType` definitions across the Bibliom monorepo into a single canonical source in `@academic-explorer/types`. Eliminate duplicate definitions in graph, utils, and cache-browser packages. Remove all re-exports between internal packages per Constitution Principle III. Ensure all entity metadata (colors, icons, display names, ID prefixes, route paths) is sourced from the centralized `ENTITY_METADATA` constant. Establish TypeScript type safety across all 8 packages with direct imports only.

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode enabled (`strict: true`, `strictNullChecks: true`, `noImplicitAny: false`)
**Primary Dependencies**: None (pure TypeScript refactoring - no new runtime dependencies)
**Storage**: N/A (type-only changes, no storage operations)
**Testing**: Vitest with serial execution (maxConcurrency: 1), @testing-library/react, MSW for API mocking
**Target Platform**: Node.js 18+ (build time), Browser (ES2022 runtime via Vite)
**Project Type**: Monorepo (Nx workspace with 6 packages + 2 apps)
**Performance Goals**: Zero runtime performance impact (compile-time only refactoring)
**Constraints**: All 738 existing tests must pass; breaking changes acceptable per Constitution Principle VII (no backward compatibility during development); packages must not re-export exports from other internal packages per Constitution Principle III
**Scale/Scope**: 8 projects total (types, graph, utils, client, simulation, ui, web, cli); ~3-5 files modified per package

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with Bibliom Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: No `any` types planned; use `unknown` with type guards
2. **Test-First Development**: Tests written and failing before implementation begins
3. **Monorepo Architecture**: Changes use proper Nx workspace structure (apps/ or packages/)
4. **Storage Abstraction**: Any storage operations use provider interface (no direct Dexie/IndexedDB coupling)
5. **Performance & Memory**: Tests run serially; memory constraints considered; Web Workers for heavy computation
6. **Atomic Conventional Commits**: Incremental atomic commits created after each task completion; spec file changes committed after each phase
7. **Development-Stage Pragmatism**: No backwards compatibility required; breaking changes acceptable during development
8. **Test-First Bug Fixes**: Bug tests written to reproduce and fail before fixes implemented
9. **Deployment Readiness**: All packages must pass typecheck/test/lint/build before work is complete
10. **Continuous Execution**: Work continues without pausing between phases; spec commits after each phase completion

**Complexity Justification Required?** Document in Complexity Tracking section if this feature:
- Adds new packages/apps beyond existing structure
- Introduces new storage provider implementations
- Requires new worker threads
- Violates YAGNI or adds architectural complexity

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/
├── types/
│   └── src/
│       └── entities/
│           ├── entities.ts              # Canonical EntityType union (already exists)
│           ├── entity-metadata.ts       # ENTITY_METADATA constant (already exists)
│           └── index.ts                 # Re-export all entity types
│
├── graph/
│   └── src/
│       ├── types/
│       │   └── core.ts                  # REMOVE duplicate EntityType, import from types
│       └── index.ts                     # Update exports
│
├── utils/
│   └── src/
│       ├── storage/
│       │   └── catalogue-db.ts          # REMOVE duplicate EntityType, import from types
│       └── cache-browser/
│           └── types.ts                 # REMOVE duplicate EntityType, import from types
│
apps/
├── web/
│   └── src/
│       ├── components/                  # Update imports to use @academic-explorer/types
│       ├── routes/                      # Update imports to use @academic-explorer/types
│       └── services/                    # Update imports to use @academic-explorer/types
│
└── cli/
    └── src/
        └── commands/                    # Update imports to use @academic-explorer/types
```

**Structure Decision**: Monorepo architecture with Nx workspace. The `packages/types` package already contains the canonical entity definitions created in spec-017. This refactoring will eliminate duplicate definitions in `packages/graph`, `packages/utils`, and update all consuming packages to import from the single source. No new packages or apps required - purely consolidation of existing type definitions.

## Constitution Check - Initial Assessment

**Status**: ✅ PASS (all principles align with refactoring approach)

1. ✅ **Type Safety**: Refactoring eliminates duplicate type definitions and enforces strict TypeScript union types. No `any` types introduced. Uses `EntityType` union exclusively.

2. ✅ **Test-First Development**: All 738 existing tests must pass. No new features = no new tests required. TypeScript compiler serves as primary validation.

3. ✅ **Monorepo Architecture**: Refactoring operates entirely within existing Nx workspace structure. No new packages/apps created. Leverages existing `@academic-explorer/*` path aliases.

4. ✅ **Storage Abstraction**: No storage operations modified. Type imports only. Catalogue DB schema references centralized types without implementation changes.

5. ✅ **Performance & Memory**: Zero runtime impact (compile-time only). No test execution changes. No Web Worker modifications.

6. ✅ **Atomic Conventional Commits**: Will create incremental commits per package (e.g., `refactor(graph): remove duplicate EntityType`, `refactor(utils): import EntityType from types package`). Spec commits after each phase.

7. ✅ **Development-Stage Pragmatism**: Breaking changes encouraged per Constitution Principle VII (no backward compatibility during development). Re-exports prohibited per Constitution Principle III. Consumers must update imports directly to @academic-explorer/types.

8. ✅ **Test-First Bug Fixes**: N/A (refactoring task, not bug fix). If type mismatches discovered, will add regression tests before fixes.

9. ✅ **Deployment Readiness**: Success criteria SC-003 through SC-005 enforce `pnpm typecheck`, all tests passing, and successful build across all 8 projects.

10. ✅ **Continuous Execution**: Plan proceeds through Phase 0 (research) → Phase 1 (design) → Phase 2 (tasks) without pausing. Spec commits after each phase.

**Complexity Justification**: None required. This refactoring simplifies architecture by eliminating duplication. No new packages, no new storage providers, no new worker threads. Pure YAGNI-compliant consolidation.

## Complexity Tracking

N/A - No constitution violations. This refactoring reduces complexity by eliminating 3 duplicate EntityType definitions.

---

## Phase 0: Research (Complete)

**Output**: `research.md`

**Key Findings**:
1. **Duplicate Locations**: Found 3 duplicate EntityType definitions:
   - `packages/graph/src/types/core.ts` (exact match with canonical)
   - `packages/utils/src/storage/catalogue-db.ts` (subset - missing concepts/keywords)
   - `packages/utils/src/cache-browser/types.ts` (different - includes "autocomplete")

2. **Discrepancies**:
   - Catalogue DB subset is intentional (catalogues don't store all entity types)
   - Cache browser "autocomplete" is a storage type, not an entity type
   - Graph package has exact match but duplicates unnecessarily

3. **Consolidation Strategy**: Eliminate all duplicates, import from `@academic-explorer/types`
   - Create `CacheStorageType = EntityType | "autocomplete"` for cache browser
   - No domain-specific subsets needed (YAGNI-compliant)
   - No re-exports per Constitution Principle III (no re-exports between internal packages)
   - Breaking changes acceptable per Constitution Principle VII (no backward compatibility)

4. **Risk Assessment**: LOW (pure type refactoring, TypeScript compiler guarantees correctness)

**Decision**: Proceed with full consolidation. No NEEDS CLARIFICATION items remain.

---

## Phase 1: Design (Complete)

**Outputs**: `data-model.md`, `contracts/`, `quickstart.md`

### Data Model

**Entity Type Union**:
- 12 string literal types (works, authors, sources, institutions, topics, concepts, publishers, funders, keywords, domains, fields, subfields)
- Located in `packages/types/src/entities/entities.ts:223-235`
- Export path: `@academic-explorer/types`

**Entity Metadata**:
- `EntityMetadataEntry` interface (8 properties: displayName, plural, description, color, icon, idPrefix, routePath, singularForm)
- `ENTITY_METADATA` constant: `Record<EntityType, EntityMetadataEntry>`
- Helper functions: `isEntityType()`, `toSingularForm()`, `detectEntityType()`, `toEntityType()`

**Migration Contracts** (5 total):
1. Graph package: Type import replacement
2. Utils catalogue-db: Subset → superset migration (safe)
3. Utils cache-browser: Type split (EntityType + CacheStorageType)
4. Apps/web: Import path updates
5. Apps/cli: Import path updates

### Contracts

**Type-Only Imports**:
```typescript
import type { EntityType } from "@academic-explorer/types"
```

**No Re-Exports** (Constitution Principle III):
```typescript
// ❌ WRONG: graph/utils packages MUST NOT re-export from types package
// export type { EntityType } from "@academic-explorer/types"

// ✅ CORRECT: Consumers import directly from canonical source
import type { EntityType } from "@academic-explorer/types"
```

**Cache Storage Type**:
```typescript
export type CacheStorageType = EntityType | "autocomplete"
```

### Quickstart Guide

**Migration Order**: graph → utils → web → cli (reverse dependency order)

**Estimated Time**: 75 minutes total
- Graph: 15 minutes
- Utils: 30 minutes
- Web: 20 minutes
- CLI: 10 minutes

**Validation Commands**:
- `pnpm typecheck` (zero errors)
- `pnpm test` (738 tests pass)
- `pnpm build` (all 8 projects succeed)

---

## Constitution Check - Post-Design Re-Evaluation

**Status**: ✅ PASS (design confirms all principles align)

1. ✅ **Type Safety**: Design eliminates all duplicate definitions. Single source of truth enforces strict TypeScript union types. Zero `any` types introduced. Type guards (`isEntityType`) provide runtime validation.

2. ✅ **Test-First Development**: No new features = no new tests required. All 738 existing tests must pass. TypeScript compiler serves as primary validation mechanism.

3. ✅ **Monorepo Architecture**: Design operates entirely within existing Nx structure. No new packages/apps. Leverages existing tsconfig project references and path aliases (`@academic-explorer/*`).

4. ✅ **Storage Abstraction**: No storage operations modified. Catalogue DB and cache browser use type imports only. Dexie schemas reference types without runtime imports.

5. ✅ **Performance & Memory**: Zero runtime impact (compile-time only). No test execution changes. No Web Worker modifications. Build time unchanged.

6. ✅ **Atomic Conventional Commits**: Migration plan defines 4 commits (one per package: graph, utils, web, cli). Each commit is atomic and independently verifiable. Format: `refactor(package): import EntityType from types package`.

7. ✅ **Development-Stage Pragmatism**: Breaking changes encouraged per Constitution Principles III and VII. No re-exports between internal packages. Consumers must update imports to @academic-explorer/types directly. No deprecation warnings per constitution (breaking changes acceptable).

8. ✅ **Test-First Bug Fixes**: N/A (refactoring, not bug fix). If type mismatches discovered during migration, regression tests will be added before fixes.

9. ✅ **Deployment Readiness**: Success criteria SC-003 through SC-005 enforce full quality pipeline:
   - SC-003: `pnpm typecheck` must pass
   - SC-004: All 738 tests must pass
   - SC-005: `pnpm build` must succeed for all 8 projects

10. ✅ **Continuous Execution**: Migration proceeds without pausing:
    - Phase 0 (research) → Phase 1 (design) → Phase 2 (tasks generation via /speckit.tasks)
    - Spec commits after each phase completion per constitution v2.2.0

**Design Validation**: All 10 principles satisfied. No constitution violations. Refactoring simplifies architecture (eliminates duplication). Ready for Phase 2 (task generation).

---

## Next Steps

**Command**: `/speckit.tasks` to generate `tasks.md`

**Phase 2 Output**: Detailed task breakdown for implementation
- Incremental refactoring steps per package
- Validation checkpoints per task
- Atomic commit definitions
- Success criteria mapping

**Estimated Tasks**: 15-20 tasks total (4-5 per package)
