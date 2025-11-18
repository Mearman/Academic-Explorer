# Implementation Plan: OpenAlex Relationship Implementation

**Branch**: `015-openalex-relationships` | **Date**: 2025-11-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-openalex-relationships/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Fix critical AUTHORSHIP edge direction bug (currently reversed: Author → Work instead of Work → Author) and implement all missing OpenAlex relationships across 7 entity types. Current implementation covers only 11% of work relationships; this plan achieves 80%+ coverage including citations, funding, topic hierarchies, institution lineages, and publisher relationships. Uses unidirectional edge pattern with reverse lookup indexing, batch preloading strategies, canonical edge ID normalization, and configurable relationship limits to maintain <5 second expansion performance.

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode enabled
**Primary Dependencies**: `@academic-explorer/client` (OpenAlex API), `@academic-explorer/types` (Zod schemas), D3 force simulation (graph package)
**Storage**: IndexedDB via storage provider interface (DexieStorageProvider for production, InMemoryStorageProvider for tests)
**Testing**: Vitest with serial execution (maxConcurrency: 1), fake-indexeddb for storage tests, MSW for API mocking
**Target Platform**: Web (React 19 SPA), Node.js CLI tool (apps/cli)
**Project Type**: Web application (Nx monorepo with packages/graph as primary change target)
**Performance Goals**: Graph expansion completes within 5 seconds for works with up to 100 relationships
**Constraints**: Serial test execution (prevents OOM), 8GB heap limit, no `any` types, must use type guards for OpenAlex data validation
**Scale/Scope**: 7 entity types (Works, Authors, Sources, Institutions, Publishers, Funders, Topics), 27+ relationship types, 36 functional requirements

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with Academic Explorer Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ PASS - All relationship data uses strict TypeScript types; no `any` types; type guards for OpenAlex data validation (see `contracts/validation.contract.md`)
2. **Test-First Development**: ✅ PASS - Red-Green-Refactor approach with direction-specific assertions; tests written before implementation (see `research.md` Section 5)
3. **Monorepo Architecture**: ✅ PASS - Changes contained within `packages/graph` (providers, types, services); no cross-package violations
4. **Storage Abstraction**: ✅ PASS - Relationship data flows through storage provider interface; no direct IndexedDB access
5. **Performance & Memory**: ✅ PASS - Batch preloading for related entities; configurable limits prevent memory exhaustion; expansion completes within 5 seconds (see `research.md` Section 2)
6. **Atomic Conventional Commits**: ✅ PASS - Each relationship type implemented in separate atomic commit; direction fix is breaking change requiring dedicated commit
7. **Development-Stage Pragmatism**: ✅ PASS - Breaking changes to edge direction acceptable; no migration path required for development phase; production deployment will need data migration strategy
8. **Test-First Bug Fixes**: ✅ PASS - Authorship direction bug has regression tests written before fix applied (see `quickstart.md` Red-Green-Refactor example)
9. **Deployment Readiness**: ✅ PASS - All relationship implementations include complete test coverage; no work considered complete until all tests pass across entire monorepo

**Complexity Justification Required?** NO - Feature uses existing `packages/graph` structure; no new packages/apps; no new storage providers; no new worker threads; addresses critical bugs and missing features (not premature optimization).

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
packages/graph/
├── src/
│   ├── providers/
│   │   ├── openalex-provider.ts         # PRIMARY CHANGE TARGET - Fix edge directions, add missing relationships
│   │   ├── provider.interface.ts         # May need interface updates for new expansion methods
│   │   └── base-provider.ts              # Shared edge creation utilities
│   ├── types/
│   │   ├── core.ts                       # GraphEdge, RelationType enum, EdgeDirection type
│   │   └── metadata.ts                   # Relationship-specific metadata interfaces
│   ├── services/
│   │   ├── graph-repository.ts           # Edge deduplication logic, canonical ID generation
│   │   └── entity-cache.ts               # Batch preloading for related entities
│   └── utils/
│       ├── edge-utils.ts                 # Edge ID normalization, validation helpers
│       └── relationship-limits.ts        # Configurable limits per relationship type
└── tests/
    ├── providers/
    │   ├── openalex-provider.test.ts     # Direction correctness tests (Red-Green-Refactor)
    │   ├── authorship.test.ts            # AUTHORSHIP direction fix regression tests
    │   ├── citations.test.ts             # REFERENCE relationship tests
    │   ├── funding.test.ts               # FUNDED_BY relationship tests
    │   ├── topics.test.ts                # Topic hierarchy tests
    │   ├── institutions.test.ts          # Institution lineage tests
    │   └── publishers.test.ts            # Publisher relationship tests
    ├── integration/
    │   ├── expansion.test.ts             # End-to-end expansion scenarios
    │   └── deduplication.test.ts         # Edge deduplication across multiple expansions
    └── unit/
        ├── edge-utils.test.ts            # Edge ID generation, validation
        └── relationship-limits.test.ts   # Configurable limit behavior

packages/types/
├── src/
│   └── openalex/
│       ├── work.ts                       # Work entity type with authorships[], referenced_works[], grants[], topics[]
│       ├── author.ts                     # Author entity type with affiliations[], last_known_institutions[]
│       ├── source.ts                     # Source entity type with host_organization
│       ├── institution.ts                # Institution entity type with lineage[]
│       ├── publisher.ts                  # Publisher entity type with parent_publisher, lineage[]
│       ├── funder.ts                     # Funder entity type
│       └── topic.ts                      # Topic entity type with field, domain hierarchy

apps/web/
└── src/
    └── components/
        └── graph/
            └── GraphView.tsx             # May need updates for new relationship visualizations

apps/cli/
└── src/
    └── commands/
        └── validate-relationships.ts     # CLI tool for relationship data validation
```

**Structure Decision**: Nx monorepo web application structure. Primary changes target `packages/graph/src/providers/openalex-provider.ts` where all relationship edge creation occurs. Type definitions in `packages/types` provide OpenAlex entity schemas. Tests follow Red-Green-Refactor pattern with dedicated test files per relationship type to ensure atomic commits and clear failure signals.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations requiring justification. All Constitution principles satisfied:

- Uses existing `packages/graph` structure (no new packages/apps)
- No new storage provider implementations needed
- No new worker threads required
- Addresses critical bugs (reversed edge direction) and missing features (18+ relationships)
- Breaking changes acceptable per Constitution Principle VII (Development-Stage Pragmatism)
- Test-first approach with Red-Green-Refactor cycle per Constitution Principle II
- All changes contained within existing architecture boundaries
