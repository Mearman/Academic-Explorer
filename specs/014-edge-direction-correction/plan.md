# Implementation Plan: Edge Direction Correction for OpenAlex Data Model

**Branch**: `014-edge-direction-correction` | **Date**: 2025-11-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/014-edge-direction-correction/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Correct all graph edge directions to match the OpenAlex data ownership model. Currently, edges point backwards (e.g., Author → Work for authorship), but the OpenAlex data model stores relationships on the entity that owns them (Work contains authorships, so Work → Author). This correction enables:

1. **P1 (MVP)**: Accurate representation of the OpenAlex data structure with all edges pointing from data owner to referenced entity
2. **P2**: Classification of edges as "outbound" (stored on entity) vs "inbound" (requires reverse lookup) to indicate data completeness
3. **P3**: User-facing directional filters ("Show Outbound", "Show Inbound", "Show Both") for focused graph exploration

Technical approach: Reverse edge source/target in relationship detection service, update RelationType enum labels, add edge direction classification, implement migration for existing graphs, and add directional filtering UI.

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode enabled
**Primary Dependencies**: @academic-explorer/graph (edge model), @academic-explorer/types (RelationType enum), Mantine 7.x (UI components), TanStack React Query (state management)
**Storage**: IndexedDB via Dexie through storage provider interface (graph-store)
**Testing**: Vitest (unit/integration/component tests), Playwright (E2E tests - serial execution), MSW (API mocking)
**Target Platform**: Web (React 19 SPA via Vite), browsers with IndexedDB support
**Project Type**: Monorepo web application (Nx workspace)
**Performance Goals**: <1 second for directional filtering on graphs with 500 nodes, zero regression in existing graph operations
**Constraints**: Serial test execution (memory), existing graphs must migrate automatically on load, breaking change acceptable per Development-Stage Pragmatism
**Scale/Scope**: Affects all relationship types (6 core types: AUTHORED/HAS_AUTHOR, REFERENCES, PUBLISHED_IN, AFFILIATED, SOURCE_PUBLISHED_BY, INSTITUTION_CHILD_OF), impacts all existing graphs, ~500 LOC changes across 3 files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with Academic Explorer Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ PASS - All edge direction changes use proper TypeScript types; RelationType enum is type-safe; no `any` types introduced
2. **Test-First Development**: ✅ PASS - Will write E2E tests for edge direction verification before migration; existing unit tests for relationship detection will be updated to fail (Red), then implementation will fix them (Green)
3. **Monorepo Architecture**: ✅ PASS - Changes isolated to existing packages/apps structure: `packages/graph` (GraphEdge model), `packages/types` (RelationType enum), `apps/web/src/services/relationship-detection-service.ts`, `apps/web/src/components/sections/EdgeFiltersSection.tsx`
4. **Storage Abstraction**: ✅ PASS - Edge migration uses graph-store; no direct Dexie/IndexedDB coupling
5. **Performance & Memory**: ✅ PASS - Tests run serially (existing requirement); directional filtering performance measured in success criteria (<1s for 500 nodes); no Web Workers needed for this feature
6. **Atomic Conventional Commits**: ✅ PASS - Plan includes atomic commits: (1) update RelationType enum, (2) update relationship detection logic, (3) migrate existing edges, (4) add directional filtering UI
7. **Development-Stage Pragmatism**: ✅ PASS - This is a breaking change (edge directions reversed); acceptable during development; existing graphs will migrate automatically on load

**Complexity Justification Required?** ❌ NO
- No new packages/apps added (uses existing structure)
- No new storage provider implementations (uses existing graph-store)
- No new worker threads required (directional filtering is synchronous, fast operation)
- No YAGNI violations (correcting data model to match OpenAlex is foundational, not speculative)

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
├── graph/
│   └── src/
│       ├── edge-model.ts           # GraphEdge interface (add 'direction' field)
│       └── relation-type.ts        # RelationType enum (update labels)
│
├── types/
│   └── src/
│       └── graph-types.ts          # Shared type definitions
│
└── utils/
    └── src/
        └── type-guards.ts          # Type guard helpers

apps/
└── web/
    ├── src/
    │   ├── services/
    │   │   └── relationship-detection-service.ts  # MAIN: Reverse edge creation logic
    │   ├── components/
    │   │   └── sections/
    │   │       └── EdgeFiltersSection.tsx         # Add directional filtering UI
    │   ├── stores/
    │   │   └── graph-store.tsx                    # Edge storage & migration
    │   └── test/
    │       ├── unit/
    │       │   └── relationship-detection-service.unit.test.ts  # Update for reversed edges
    │       ├── integration/
    │       │   └── edge-direction-migration.integration.test.ts  # NEW: Migration tests
    │       └── e2e/
    │           └── edge-direction-verification.e2e.test.ts       # NEW: E2E verification
    └── playwright.config.ts
```

**Structure Decision**: Nx monorepo web application structure. Changes span three packages (`graph`, `types`, `utils`) and one app (`web`). Primary logic changes are in `relationship-detection-service.ts` (reverses source/target on edge creation). UI changes in `EdgeFiltersSection.tsx` (adds direction filters). Migration logic in `graph-store.tsx` (reverses edges on graph load if needed).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
