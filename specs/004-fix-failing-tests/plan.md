# Implementation Plan: Fix Failing Catalogue E2E Tests

**Branch**: `004-fix-failing-tests` | **Date**: 2025-11-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-fix-failing-tests/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Fix 27 failing catalogue E2E tests across entity management, import/export, and sharing functionality. Tests are failing due to implementation bugs in the catalogue feature, not compilation issues (feature 003 resolved those). The approach is to analyze each failing test, identify the root cause (missing implementation, logic errors, timing issues), and fix the implementation to match test expectations. No test modifications allowed - implementation must conform to test specifications.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, ES2022 target, ESNext modules)
**Primary Dependencies**: React 19, Vite 6, TanStack Router 1.x, Mantine UI 8.3.x, Dexie 4.x (IndexedDB wrapper), @dnd-kit (drag-and-drop), qrcode (QR generation), pako (compression)
**Storage**: IndexedDB via Dexie for catalogue persistence (in-memory provider for E2E tests per constitution)
**Testing**: Playwright E2E tests (serial execution required), Vitest for unit tests
**Target Platform**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+) with IndexedDB, Clipboard API, drag-and-drop support
**Project Type**: Web application (monorepo structure: apps/web for catalogue UI)
**Performance Goals**: Add entity <500ms, export list <2s, import list <5s for typical datasets, drag-and-drop reordering with immediate visual feedback
**Constraints**: Serial test execution (memory), storage operations <2s timeout, data integrity on export/import (zero data loss), share URLs persist for list lifetime
**Scale/Scope**: 27 failing tests across 3 test files, ~9 catalogue components affected, handle 100+ entities per list without UI freezing

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with Academic Explorer Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ PASS - Fixes will maintain strict TypeScript typing; no new `any` types; entity type discrimination uses type guards; all storage operations maintain type safety
2. **Test-First Development**: ✅ PASS - Tests already exist and are failing; this is true test-driven repair (Red state verified, implementing Green); no test modifications allowed per spec
3. **Monorepo Architecture**: ✅ PASS - All changes within apps/web catalogue components; uses existing shared packages (@academic-explorer/client, @academic-explorer/ui); no new packages required
4. **Storage Abstraction**: ✅ PASS - Catalogue uses Dexie through existing storage patterns; E2E tests use in-memory provider per constitution; fixes maintain abstraction boundaries
5. **Performance & Memory**: ✅ PASS - E2E tests already running serially; performance targets in success criteria (<500ms add, <2s export, <5s import); bulk operations tested up to 100+ entities

**Complexity Justification Required?** NO - This feature:
- ❌ Does NOT add new packages/apps (fixes existing apps/web catalogue)
- ❌ Does NOT introduce new storage providers (uses existing Dexie patterns)
- ❌ Does NOT require new worker threads (UI operations within performance budget)
- ❌ Does NOT violate YAGNI (fixing broken existing functionality, not adding features)

**GATE STATUS: PASS** - All constitution principles satisfied; no complexity justification needed

## Project Structure

### Documentation (this feature)

```text
specs/004-fix-failing-tests/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (technical decisions)
├── data-model.md        # Phase 1 output (catalogue entities)
├── quickstart.md        # Phase 1 output (developer guide)
├── contracts/           # Phase 1 output (storage/component interfaces)
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── components/catalogue/           # Catalogue UI components (FIX TARGET)
│   │   ├── AddToCatalogueButton.tsx   # Entity page "Add to Catalogue" button
│   │   ├── AddToListModal.tsx          # Modal for selecting/creating lists
│   │   ├── CatalogueManager.tsx        # Main catalogue management UI
│   │   ├── CatalogueList.tsx           # Individual list view with entities
│   │   ├── CatalogueEntities.tsx       # Entity display/management in lists
│   │   ├── CatalogueSidebarLink.tsx    # Navigation sidebar link
│   │   ├── CreateListModal.tsx         # List creation modal
│   │   ├── ExportModal.tsx             # Export functionality UI
│   │   ├── ImportModal.tsx             # Import functionality UI
│   │   ├── ShareModal.tsx              # Share URL/QR code modal
│   │   └── index.ts                    # Component exports
│   ├── hooks/
│   │   └── useCatalogue.ts             # Catalogue state/operations hook
│   ├── routes/
│   │   ├── catalogue.tsx               # Catalogue route definition
│   │   └── catalogue.lazy.tsx          # Lazy-loaded catalogue page
│   └── test/e2e/                       # E2E test suite (VALIDATION)
│       ├── catalogue-entity-management.e2e.test.ts    # Tests 64-72 (9 failing)
│       ├── catalogue-import-export.e2e.test.ts        # Tests 73-81 (9 failing)
│       ├── catalogue-sharing-functionality.e2e.test.ts # Tests 89-97 (9 failing)
│       ├── catalogue-basic-functionality.e2e.test.ts  # Basic tests (passing)
│       ├── catalogue-smoke-test.e2e.test.ts           # Smoke tests (passing)
│       └── catalogue-realistic.e2e.test.ts            # Realistic scenarios
└── playwright.global-setup.ts          # E2E test configuration

packages/
├── client/                             # OpenAlex API client (DEPENDENCY)
├── ui/                                 # Shared UI components (DEPENDENCY)
└── utils/                              # Shared utilities (DEPENDENCY)
```

**Structure Decision**: Web application with monorepo architecture. All fixes target `apps/web/src/components/catalogue/` components and the `useCatalogue` hook. Tests in `apps/web/src/test/e2e/` validate fixes. No new packages required - uses existing shared dependencies.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations - this section is not applicable.

All design decisions align with constitution principles. No architectural complexity added.

## Post-Design Constitution Re-Check

*Required: Re-evaluate after Phase 1 design complete*

### Design Validation

Reviewing design artifacts (research.md, data-model.md, contracts/) against constitution:

1. **Type Safety**: ✅ PASS
   - All contracts use discriminated unions with type guards
   - `EntityMetadata` types properly discriminated by `type` field
   - No `any` types in contracts or data models
   - Validation functions use `asserts` for type narrowing
   - **Confirmed**: Full type safety maintained in design

2. **Test-First Development**: ✅ PASS
   - Design based on existing failing E2E tests
   - Implementation will be validated by tests turning green
   - No changes to test expectations allowed
   - Quickstart guide emphasizes test-driven repair workflow
   - **Confirmed**: Tests define requirements, implementation follows

3. **Monorepo Architecture**: ✅ PASS
   - All fixes within `apps/web` (existing app)
   - Uses existing shared packages (@academic-explorer/client, ui, utils)
   - No new packages created
   - Project structure documented in plan
   - **Confirmed**: Proper Nx workspace structure maintained

4. **Storage Abstraction**: ✅ PASS
   - `useCatalogue` hook abstracts all storage operations
   - Components never call Dexie directly
   - Data model defines Dexie schema separately from component API
   - Hook contract enforces abstraction boundary
   - **Confirmed**: Storage provider pattern preserved

5. **Performance & Memory**: ✅ PASS
   - Tests already run serially (no changes)
   - Performance targets in success criteria match constitution (<2s storage ops)
   - Bulk operations designed with pagination/virtual scrolling
   - No new workers needed (operations within performance budget)
   - **Confirmed**: Performance constraints respected in design

### Design Complexity Assessment

**Question**: Does Phase 1 design add architectural complexity requiring justification?

**Answer**: NO

- Uses existing Dexie database (no new storage)
- Uses existing Mantine UI components (no new UI library)
- Uses existing @dnd-kit (already in dependencies)
- Uses existing pako, qrcode libraries (already in dependencies)
- No new packages, workers, or storage providers
- Simply fixing broken implementation to match test expectations

**FINAL GATE STATUS**: ✅ PASS - Design fully compliant with constitution

## Phase 0 Outputs

- ✅ **research.md**: Technical decisions documented with rationale
  - 6 research questions resolved
  - Drag-and-drop: @dnd-kit with accessibility
  - Export/import: pako compression + Base64URL encoding
  - Share URLs: Client-side encoding with QR codes
  - Type safety: Discriminated unions with type guards
  - UI components: Mantine 8.3.x with built-in accessibility
  - Implementation order: 5 phases from fundamentals to polish

## Phase 1 Outputs

- ✅ **data-model.md**: Entity schemas and relationships
  - `CatalogueList`: List metadata with share tokens
  - `CatalogueEntity`: Entity references with positions and notes
  - `EntityMetadata`: 8 discriminated types for OpenAlex entities
  - `ExportFormat`: Versioned import/export schema
  - Dexie database schema with indexes
  - Business rules: Duplicate detection, position management, sharing

- ✅ **contracts/**: TypeScript interface definitions
  - `types.ts`: Core types, validation, type guards, constants
  - `useCatalogue.interface.ts`: Hook API with 40+ methods
  - `README.md`: Contract usage guide for developers

- ✅ **quickstart.md**: Developer guide
  - Quick start: Run tests, analyze failures, fix implementation
  - Test organization by priority (P1-P3)
  - Key files to modify with locations
  - Common fix patterns with examples
  - Debugging tips and tools
  - Verification checklist
  - Performance targets

- ✅ **Agent context**: CLAUDE.md updated with project technologies
  - TypeScript 5.x with strict mode
  - React 19 + Vite 6 + TanStack Router
  - Mantine UI 8.3.x + Dexie 4.x
  - @dnd-kit + qrcode + pako

## Implementation Readiness

### Design Complete: ✅

All Phase 0 and Phase 1 outputs generated:
- Technical decisions researched and documented
- Data models defined with validation rules
- API contracts specified with full type safety
- Developer quickstart guide written
- Agent context updated

### Ready for Task Generation: ✅

The design provides sufficient detail for `/speckit.tasks` to generate:
- Atomic tasks for each failing test
- Task dependencies and ordering
- Acceptance criteria per task
- Component/file targets per task

### Ready for Implementation: ✅

Implementation can proceed with:
- Clear contracts to satisfy (useCatalogue.interface.ts)
- Type definitions to use (types.ts)
- Data models to implement (data-model.md)
- Technical patterns to follow (research.md)
- Developer workflow guide (quickstart.md)
- 27 failing tests to turn green

## Next Steps

**This command stops here** - `/speckit.plan` complete.

To continue the workflow:

1. **Generate tasks**: Run `/speckit.tasks` to create task breakdown
2. **Implement**: Run `/speckit.implement` to execute tasks
3. **Verify**: Run `pnpm test:e2e` to validate all 27 tests pass

Or manually implement using the design artifacts:
- Follow quickstart.md developer guide
- Implement contracts from contracts/
- Validate against E2E tests

---

**Planning Phase Complete**: 2025-11-11

**Branch**: `004-fix-failing-tests`  
**Spec**: [spec.md](./spec.md)  
**Artifacts**: research.md, data-model.md, contracts/, quickstart.md

**Status**: Ready for task generation and implementation
