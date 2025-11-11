# Implementation Plan: Fix Catalogue E2E Test Failures

**Branch**: `002-fix-catalogue-tests` | **Date**: 2025-11-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-fix-catalogue-tests/spec.md`

## Summary

Fix 27 failing E2E tests across three catalogue test suites (entity management, import/export, sharing). Tests are failing due to missing UI components, incomplete feature implementations, and selector mismatches—not storage layer issues. The storage abstraction layer (feature 001) successfully resolved IndexedDB hanging, so tests now run to completion. This feature will implement missing functionality and update UI selectors to match current component structure.

## Technical Context

**Language/Version**: TypeScript 5.9.2 (strict mode, ES modules)
**Primary Dependencies**: React 19, Mantine 8.3, Playwright, Vitest, @dnd-kit/core 6.3, qrcode 1.5
**Storage**: CatalogueStorageProvider interface (DexieStorageProvider for production, InMemoryStorageProvider for E2E tests)
**Testing**: Playwright E2E tests (serial execution), Vitest unit tests, @testing-library/react component tests
**Target Platform**: Web browser (Chrome/Firefox/Safari via Playwright), localhost:5173 dev server
**Project Type**: Monorepo web application (apps/web/ for React app, packages/utils/ for storage)
**Performance Goals**:
- Entity operations complete <5 seconds
- Export operations complete <10 seconds (100 entities)
- Share URL generation <2 seconds
- All tests complete without timeouts or hanging
**Constraints**:
- Serial E2E test execution to prevent OOM errors
- Storage operations through provider interface only (no direct Dexie/IndexedDB)
- No `any` types permitted (strict TypeScript)
- Test-first development (Red-Green-Refactor)
**Scale/Scope**: 27 failing tests across 3 test suites, ~10 UI components to fix/implement, 25 functional requirements

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with Academic Explorer Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ No `any` types planned; use `unknown` with type guards. All catalogue types already defined in `packages/utils/src/storage/catalogue-storage-provider.ts`.

2. **Test-First Development**: ✅ Tests written and failing before implementation. 27 failing E2E tests already exist. Implementation will follow Red-Green-Refactor: understand failure → implement fix → verify green → refactor.

3. **Monorepo Architecture**: ✅ Changes confined to existing structure:
   - UI components: `apps/web/src/components/catalogue/`
   - Hooks: `apps/web/src/hooks/useCatalogue.ts`
   - Tests: `apps/web/src/test/e2e/catalogue-*.e2e.test.ts`
   - Storage interface: `packages/utils/src/storage/` (already complete)

4. **Storage Abstraction**: ✅ All storage operations use `useStorageProvider()` hook and `CatalogueStorageProvider` interface. No direct Dexie/IndexedDB coupling. E2E tests use `InMemoryStorageProvider` from `@academic-explorer/utils`.

5. **Performance & Memory**: ✅ E2E tests run serially (already configured). Success criteria include timing constraints (<5s for entity ops, <10s for export, <2s for share URL). No Web Workers needed for this feature.

**Complexity Justification Required?** ❌ No constitutional violations:
- Uses existing monorepo structure (apps/web, packages/utils)
- Uses existing storage abstraction layer from feature 001
- No new packages, storage providers, or worker threads
- Implementation confined to UI components and test fixes

**Constitution Check Status**: ✅ PASSED - No violations, proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/002-fix-catalogue-tests/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (research unknowns, best practices)
├── data-model.md        # Phase 1 output (entity relationships, state transitions)
├── quickstart.md        # Phase 1 output (developer guide for testing/running fixes)
├── contracts/           # Phase 1 output (UI component contracts, test selectors)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── components/catalogue/
│   │   ├── CatalogueManager.tsx         # Main manager (already exists)
│   │   ├── CatalogueList.tsx            # List display (already exists)
│   │   ├── CatalogueEntities.tsx        # Entity display (already exists)
│   │   ├── CreateListModal.tsx          # List creation (already exists)
│   │   ├── ShareModal.tsx               # Sharing UI (needs implementation/fixes)
│   │   ├── ImportModal.tsx              # Import UI (needs implementation/fixes)
│   │   ├── ExportModal.tsx              # Export UI (needs implementation/fixes)
│   │   ├── EntityItem.tsx               # Individual entity card (needs fixes)
│   │   └── AddToListModal.tsx           # Add entity to list (needs fixes)
│   ├── hooks/
│   │   └── useCatalogue.ts              # Storage provider hook (needs feature additions)
│   └── test/e2e/
│       ├── catalogue-entity-management.e2e.test.ts    # 9 failing tests
│       ├── catalogue-import-export.e2e.test.ts        # 9 failing tests
│       └── catalogue-sharing-functionality.e2e.test.ts # 8 failing tests
└── playwright.config.ts                 # E2E test config (serial execution)

packages/utils/
└── src/storage/
    ├── catalogue-storage-provider.ts     # Interface (complete from feature 001)
    ├── in-memory-storage-provider.ts     # Test provider (complete from feature 001)
    └── dexie-storage-provider.ts         # Production provider (complete from feature 001)
```

**Structure Decision**: Monorepo web application structure. UI components in `apps/web/src/components/catalogue/`, storage abstraction in `packages/utils/src/storage/`. This follows existing Academic Explorer architecture with clear separation between UI (apps/web) and shared utilities (packages/utils).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. This section is intentionally empty.

---

## Phase 1 Re-evaluation: Constitution Check

*GATE: Re-check after Phase 1 design artifacts complete*

**Phase 1 Artifacts Generated**:
- ✅ research.md - Technology decisions and best practices
- ✅ data-model.md - Entity relationships and state management
- ✅ contracts/component-contracts.md - Component interfaces and behaviors
- ✅ contracts/test-selectors.md - Complete test selector reference
- ✅ quickstart.md - Developer guide

**Re-evaluation Against Constitution**:

1. **Type Safety**: ✅ STILL COMPLIANT
   - All component props use TypeScript interfaces
   - Import validation uses type guards (`isImportedListData`)
   - No `any` types in data-model.md or contracts
   - React.memo custom comparisons are type-safe

2. **Test-First Development**: ✅ STILL COMPLIANT
   - Implementation follows Red-Green-Refactor workflow (documented in quickstart.md)
   - Tests already exist and failing (27 tests)
   - quickstart.md explicitly documents test-first cycle
   - No implementation before test verification

3. **Monorepo Architecture**: ✅ STILL COMPLIANT
   - All changes in apps/web/src/components/catalogue/
   - Storage provider in packages/utils/ (no changes)
   - Project structure documented, follows existing layout
   - No new packages or apps

4. **Storage Abstraction**: ✅ STILL COMPLIANT
   - All components use `useStorageProvider()` hook
   - No direct Dexie/IndexedDB imports in component contracts
   - Tests use InMemoryStorageProvider (documented in quickstart.md)
   - Data-model.md references storage provider interface only

5. **Performance & Memory**: ✅ STILL COMPLIANT
   - Serial test execution confirmed in quickstart.md
   - React.memo patterns for large lists documented
   - Virtualization strategy defined for 500+ entities
   - Performance benchmarks specified (<50ms operations)
   - No Web Workers introduced

**Technology Additions (from research.md)**:
- @dnd-kit/core, @dnd-kit/sortable - Already in package.json ✅
- qrcode library - Already in package.json ✅
- Mantine components - Already in package.json ✅
- No new dependencies required

**Complexity Assessment**:
- No new architectural complexity introduced
- Component contracts follow existing patterns
- Implementation confined to UI layer only
- No changes to storage layer, routing, or build system

**Constitution Check Status**: ✅ PASSED - All principles maintained after Phase 1 design

---

## Planning Complete

**Generated Artifacts**:
1. plan.md - This file (Technical Context, Constitution Check, Project Structure)
2. research.md - Technology research and best practices
3. data-model.md - Entity definitions, state management, validation
4. contracts/component-contracts.md - Component interfaces and selectors
5. contracts/test-selectors.md - Complete selector reference
6. quickstart.md - Developer quickstart guide

**Constitution Compliance**: ✅ All checks passed (initial + Phase 1 re-evaluation)

**Next Step**: Run `/speckit.tasks` command to generate implementation tasks (tasks.md)

**Branch**: `002-fix-catalogue-tests`
**Spec**: [spec.md](./spec.md)
**Status**: Ready for task generation
