# Implementation Plan: Storage Abstraction Layer

**Branch**: `001-storage-abstraction` | **Date**: 2025-11-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-storage-abstraction/spec.md`

## Summary

Create a storage abstraction layer to decouple catalogue storage from Dexie, enabling in-memory storage providers for Playwright E2E tests. This addresses the critical issue where IndexedDB operations hang in Playwright browser contexts, blocking 28+ catalogue E2E tests.

**Primary Requirement**: Define a storage provider interface that allows swapping between IndexedDB (production) and in-memory (testing) implementations without changing application code.

**Technical Approach**: Implement the Strategy pattern with a `CatalogueStorageProvider` interface. Create two implementations: `DexieStorageProvider` (wraps existing catalogue-db.ts) and `InMemoryStorageProvider` (uses JavaScript Maps). Inject the appropriate provider at application/test initialization based on environment configuration.

## Technical Context

**Language/Version**: TypeScript 5.9.2 (ES modules)
**Primary Dependencies**: Dexie 4.2.1, Vitest 3.2.4, Playwright 1.56.1, React 19
**Storage**: IndexedDB via Dexie (production), In-memory Maps (testing)
**Testing**: Vitest (unit tests), Playwright (E2E tests), MSW (API mocking)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari), Playwright Chromium context
**Project Type**: Web application (pnpm monorepo with apps/web + packages/utils)
**Performance Goals**:
  - E2E storage operations: <2 seconds per operation
  - Unit test storage operations: <100ms per test
  - Production IndexedDB: maintain current performance (no regression)
**Constraints**:
  - Zero breaking changes to existing CatalogueService API
  - Must support test isolation (no state leakage between tests)
  - IndexedDB operations must be compatible with Playwright browser context (or bypassed via in-memory)
**Scale/Scope**:
  - 28+ E2E tests to unblock
  - ~10 catalogue operations to abstract (createList, getList, updateList, deleteList, addEntity, getEntities, removeEntity, etc.)
  - Single monorepo package (packages/utils) modification

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: No constitution file exists (template only). Proceeding with industry best practices for TypeScript libraries and testing.

**Applied Principles** (based on project CLAUDE.md):
- ✅ TypeScript with strict typing (no `any`, prefer `unknown` with type guards)
- ✅ ES modules (matching existing codebase)
- ✅ Unit tests required (Vitest)
- ✅ E2E tests required (Playwright - the primary driver for this feature)
- ✅ Monorepo structure preserved (pnpm workspaces)

## Project Structure

### Documentation (this feature)

```text
specs/001-storage-abstraction/
├── plan.md              # This file
├── research.md          # Phase 0: Technical decisions and patterns
├── data-model.md        # Phase 1: Entity relationships and data structures
├── quickstart.md        # Phase 1: Developer guide for using storage providers
├── contracts/           # Phase 1: TypeScript interfaces and type definitions
│   └── storage-provider.ts  # CatalogueStorageProvider interface
└── tasks.md             # Phase 2: Implementation tasks (created by /speckit.tasks)
```

### Source Code (repository root)

```text
packages/utils/
├── src/
│   └── storage/
│       ├── catalogue-db.ts                    # [EXISTING] Dexie implementation
│       ├── catalogue-storage-provider.ts      # [NEW] Interface definition
│       ├── dexie-storage-provider.ts          # [NEW] Wraps catalogue-db.ts
│       ├── in-memory-storage-provider.ts      # [NEW] In-memory implementation
│       └── index.ts                           # [MODIFIED] Export new providers
├── tests/
│   ├── unit/
│   │   ├── in-memory-storage-provider.test.ts      # [NEW] Unit tests
│   │   └── dexie-storage-provider.test.ts          # [NEW] Unit tests
│   └── integration/
│       └── storage-provider-contract.test.ts       # [NEW] Contract tests
└── package.json                                # [MODIFIED] Add test scripts

apps/web/
├── src/
│   ├── hooks/
│   │   └── useCatalogue.ts                    # [MODIFIED] Inject storage provider
│   ├── config/
│   │   └── storage-config.ts                  # [NEW] Provider selection logic
│   └── main.tsx                               # [MODIFIED] Initialize with provider
└── playwright.global-setup.ts                 # [MODIFIED] Inject in-memory provider

apps/web/src/test/e2e/
├── catalogue-entity-management.e2e.test.ts    # [MODIFIED] Remove manual DB init
├── catalogue-basic-functionality.e2e.test.ts  # [MODIFIED] Use injected provider
├── catalogue-import-export.e2e.test.ts        # [MODIFIED] Use injected provider
└── catalogue-sharing.e2e.test.ts              # [MODIFIED] Use injected provider
```

**Structure Decision**: Monorepo web application structure. The storage abstraction lives in `packages/utils/src/storage/` as it's a shared utility. The web app (`apps/web`) consumes it via configuration injection. E2E tests configure the in-memory provider in Playwright global setup.

## Complexity Tracking

> No constitution violations. This section is empty as there are no complexity concerns requiring justification.

## Phase 0: Research & Technical Decisions

### Research Tasks

The following technical questions need research to inform the implementation:

1. **Storage Provider Interface Design**
   - Research: Best practices for TypeScript interface design in storage abstraction layers
   - Question: Should operations return `Promise<T>` or `Promise<Result<T, Error>>` for better error handling?
   - Question: How to handle transaction semantics across different storage backends?

2. **In-Memory Storage Implementation**
   - Research: Patterns for implementing test-friendly in-memory storage in TypeScript
   - Question: Use JavaScript Map, WeakMap, or plain objects for storage?
   - Question: How to implement async operation simulation for realistic test behavior?

3. **Provider Injection Strategy**
   - Research: Dependency injection patterns in React applications without introducing heavy DI frameworks
   - Question: Use React Context, module-level singleton, or function parameter injection?
   - Question: How to ensure provider is configured before any storage operations?

4. **Test Isolation Mechanisms**
   - Research: Best practices for test isolation with stateful services
   - Question: When and how to reset in-memory storage state (per test, per suite, explicit reset)?
   - Question: How to detect and prevent state leakage between Playwright tests?

5. **Dexie Wrapper Strategy**
   - Research: Patterns for wrapping existing database libraries with abstraction layers
   - Question: Should we wrap at the CatalogueDB class level or at the operation level?
   - Question: How to preserve Dexie's transaction capabilities through the abstraction?

### Research Dispatch

Launching research agents to resolve technical decisions...

*Research agents will consolidate findings in `research.md`*

## Phase 1: Design Artifacts

*Phase 1 artifacts will be generated after Phase 0 research completes:*

- `data-model.md`: Entity relationships (CatalogueList, CatalogueEntity, CatalogueShare)
- `contracts/storage-provider.ts`: TypeScript interface definitions
- `quickstart.md`: Developer guide for storage provider usage

## Phase 2: Implementation Tasks

*Phase 2 tasks will be generated by the `/speckit.tasks` command after Phase 1 design is complete.*

Expected task categories:
1. Create storage provider interface and type definitions
2. Implement DexieStorageProvider wrapper
3. Implement InMemoryStorageProvider
4. Update CatalogueService / useCatalogue to use injected provider
5. Configure provider injection in app initialization
6. Configure in-memory provider in Playwright setup
7. Update E2E tests to remove manual database initialization
8. Write unit and integration tests
9. Verify all 28+ E2E tests pass without hanging

## Next Steps

1. Run `/speckit.plan` Phase 0 to generate `research.md` with technical decisions
2. Complete Phase 1 to generate data model, contracts, and quickstart guide
3. Run `/speckit.tasks` to generate detailed implementation tasks
4. Execute tasks and verify success criteria

## Success Validation

After implementation, validate against spec success criteria:

- ✓ **SC-001**: All 28+ catalogue E2E tests pass without hanging (<2s per operation)
- ✓ **SC-002**: Production catalogue maintains 100% feature parity (zero data loss)
- ✓ **SC-003**: E2E suite execution time improves by 50%+
- ✓ **SC-004**: Unit tests with mock storage complete in <100ms each
- ✓ **SC-005**: Zero production incidents after deployment
- ✓ **SC-006**: 100% test isolation (clean state between tests)
- ✓ **SC-007**: Provider switching via configuration only (no code changes)
