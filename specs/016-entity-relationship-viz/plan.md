# Implementation Plan: Entity Relationship Visualization

**Branch**: `016-entity-relationship-viz` | **Date**: 2025-11-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-entity-relationship-viz/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add incoming/outgoing relationship visualization to entity detail pages, enabling researchers to view and filter relationships by direction (incoming vs outgoing) and type (AUTHORSHIP, REFERENCE, AFFILIATION, etc.). The feature extends existing entity detail pages (`apps/web/src/routes/[entityType]`) with dedicated sections for incoming and outgoing relationships, leveraging the existing EdgeFiltersSection filtering patterns and graph package relationship metadata.

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode enabled
**Primary Dependencies**: React 19, TanStack Router v7, Mantine UI, @bibgraph/graph (relationship types), @bibgraph/ui (shared components)
**Storage**: IndexedDB via storage provider interface (DexieStorageProvider for production, InMemoryStorageProvider for tests) - No new storage operations required for this feature
**Testing**: Vitest (serial execution with fake-indexeddb), Playwright for E2E tests
**Target Platform**: Web (React SPA in apps/web)
**Project Type**: Web application (existing Nx monorepo)
**Performance Goals**: 2-second load time for relationships (SC-001), <1s filtering (SC-005), handle 1000 relationships without degradation (SC-006)
**Constraints**: Pagination at 50 items per section, 95% entity coverage (SC-002), serial test execution to prevent OOM
**Scale/Scope**: 13 functional requirements (FR-001 to FR-013), 4 user stories (P1-P4), extends 7 entity types (works, authors, institutions, sources, publishers, funders, topics)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with BibGraph Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ No `any` types planned; relationship direction uses union type `'outbound' | 'inbound'`; all component props strictly typed
2. **Test-First Development**: ✅ Tests written and failing before implementation begins; acceptance scenarios define test cases
3. **Monorepo Architecture**: ✅ Changes extend existing apps/web structure; may add shared components to packages/ui; uses @bibgraph/* aliases
4. **Storage Abstraction**: ✅ No new storage operations required; reads relationship data from existing graph store via provider interface
5. **Performance & Memory**: ✅ Tests run serially; pagination at 50 items limits memory; no Web Workers needed (filtering is synchronous)
6. **Atomic Conventional Commits**: ✅ Incremental atomic commits planned per user story (P1→P2→P3→P4)
7. **Development-Stage Pragmatism**: ✅ May introduce breaking changes to entity detail page layouts; no backwards compatibility required
8. **Test-First Bug Fixes**: ✅ Any rendering or data loading bugs will have regression tests written before fixes
9. **Deployment Readiness**: ✅ All pre-existing issues will be resolved before marking work complete; feature must pass `pnpm validate`

**Complexity Justification**: No violations. Feature extends existing structure without adding packages, storage providers, or worker threads. Reuses EdgeFiltersSection filtering patterns.

## Project Structure

### Documentation (this feature)

```text
specs/016-entity-relationship-viz/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── components/
│   │   ├── relationship/                    # NEW: Relationship visualization components
│   │   │   ├── RelationshipSection.tsx       # Grouped display of single relationship type
│   │   │   ├── RelationshipItem.tsx          # Individual relationship connection
│   │   │   ├── RelationshipList.tsx          # List container with pagination
│   │   │   └── RelationshipCounts.tsx        # Summary count badges
│   │   └── sections/
│   │       └── EdgeFiltersSection.tsx        # EXISTING: Reuse filtering patterns
│   ├── routes/
│   │   ├── _entityType/
│   │   │   ├── _authorId.lazy.tsx            # MODIFY: Add relationship sections
│   │   │   ├── _workId.lazy.tsx              # MODIFY: Add relationship sections
│   │   │   ├── _institutionId.lazy.tsx       # MODIFY: Add relationship sections
│   │   │   ├── _sourceId.lazy.tsx            # MODIFY: Add relationship sections
│   │   │   ├── _publisherId.lazy.tsx         # MODIFY: Add relationship sections
│   │   │   ├── _funderId.lazy.tsx            # MODIFY: Add relationship sections
│   │   │   └── _topicId.lazy.tsx             # MODIFY: Add relationship sections
│   │   └── ...
│   └── hooks/
│       └── use-entity-relationships.ts       # NEW: Hook for fetching/filtering relationships
└── test/
    ├── component/
    │   ├── relationship-section.component.test.tsx
    │   ├── relationship-item.component.test.tsx
    │   └── relationship-list.component.test.tsx
    ├── integration/
    │   └── entity-relationships.integration.test.tsx
    └── e2e/
        ├── incoming-relationships.e2e.test.ts
        ├── outgoing-relationships.e2e.test.ts
        ├── relationship-filtering.e2e.test.ts
        └── relationship-pagination.e2e.test.ts

packages/graph/
└── src/
    └── types/
        └── core.ts                           # EXISTING: GraphEdge with direction metadata

packages/ui/
└── src/
    └── components/
        └── relationship/                     # POTENTIAL: Shared components if needed
            └── ...
```

**Structure Decision**: Web application structure. Feature extends existing entity detail pages in `apps/web/src/routes/` by adding relationship visualization sections. New relationship components in `apps/web/src/components/relationship/`. Reuses existing `EdgeFiltersSection` filtering patterns. No new packages required; may optionally move components to `packages/ui` if shared across apps.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. This section intentionally left empty.
