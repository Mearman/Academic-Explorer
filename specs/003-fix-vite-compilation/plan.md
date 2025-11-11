# Implementation Plan: Fix Vite/TypeScript In-Place Compilation Issue

**Branch**: `003-fix-vite-compilation` | **Date**: 2025-11-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-fix-vite-compilation/spec.md`

## Summary

Fix TypeScript/Vite configuration to prevent in-place compilation of .ts/.tsx files into .js files within src/ directories. This issue causes Vite dev server to serve stale cached code during E2E tests, blocking test-driven development. The fix must maintain TypeScript project references for cross-package type checking while ensuring all compiled artifacts live only in dist/ or node_modules/.vite/ cache directories.

## Technical Context

**Language/Version**: TypeScript 5.9.2 (strict mode, ES modules)
**Primary Dependencies**: Vite 7.2.2, Nx workspace 20.x, TypeScript project references
**Storage**: Not applicable - build/compilation tooling fix
**Testing**: Playwright E2E tests (serial execution), test changes by making visible UI edits and verifying tests see them
**Target Platform**: Development environment (Vite dev server on localhost:5173), production builds to dist/
**Project Type**: Nx monorepo with apps/web (React SPA) and packages/* (shared libraries)
**Performance Goals**:
- E2E test execution time within 10% of baseline
- Vite dev server cold start under 2 seconds
- Code changes reflected in tests within 5 seconds of test start
**Constraints**:
- Must maintain TypeScript project references (tools package depends on apps/web declarations)
- Cannot use `noEmit: true` globally (breaks project references with "may not disable emit" error)
- Must support incremental compilation for fast rebuilds
- Serial E2E test execution to prevent OOM errors
**Scale/Scope**:
- 8 packages in monorepo (apps/web, packages/client, packages/utils, packages/graph, packages/ui, packages/simulation, packages/types, tools)
- Multiple tsconfig files (tsconfig.base.json, tsconfig.app.json, apps/web/tsconfig.json, tools/tsconfig.json)
- 232 E2E tests, currently 27 failing due to stale code issue

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with Academic Explorer Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ Fix maintains strict TypeScript checking; no `any` types added; declaration files continue to be generated for cross-package type checking

2. **Test-First Development**: ✅ Issue discovered through E2E test failures (Red phase); fix will make tests pass (Green phase); no refactoring needed as this is configuration-only

3. **Monorepo Architecture**: ✅ Fix applies to existing Nx workspace structure; respects project reference relationships; changes limited to tsconfig and vite.config files

4. **Storage Abstraction**: ✅ Not applicable - this is build tooling, doesn't involve data persistence

5. **Performance & Memory**: ✅ Success criteria include performance benchmarks (SC-001: within 10%, SC-007: <2s startup); no memory impact as this is configuration change; maintains serial E2E test execution

**Complexity Justification Required?** ❌ No new complexity introduced:
- No new packages or apps
- No new storage providers
- No new worker threads
- Configuration-only fix within existing structure
- Simplifies rather than complicates (removes in-place .js files from src/)

**Constitution Check Status**: ✅ PASSED - No violations, proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/003-fix-vite-compilation/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (TypeScript emit best practices, Vite config patterns)
├── data-model.md        # Phase 1 output (tsconfig structure, compilation artifacts)
├── quickstart.md        # Phase 1 output (developer guide for verifying fix)
├── contracts/           # Phase 1 output (tsconfig schemas, expected file patterns)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

This is a configuration-only fix affecting build tooling:

```text
# TypeScript configuration files
tsconfig.base.json           # Base config extended by all packages
tsconfig.app.json            # App-specific config (apps/web extends this)
tsconfig.json                # Root config for project references

# Per-package tsconfig files
apps/web/tsconfig.json       # Web app TypeScript config (extends tsconfig.app.json)
tools/tsconfig.json          # Tools package config (references apps/web)
packages/client/tsconfig.json
packages/utils/tsconfig.json
packages/graph/tsconfig.json
packages/ui/tsconfig.json
packages/simulation/tsconfig.json
packages/types/tsconfig.json

# Vite configuration
apps/web/vite.config.ts      # Vite dev server and build config

# Build artifacts (should ONLY exist here after fix)
apps/web/dist/               # Production build output
apps/web/node_modules/.vite/ # Vite dev server cache
packages/*/dist/             # Package build outputs

# Files that should NOT exist after fix
apps/web/src/**/*.js         # In-place compiled JS (PROBLEM - should not exist)
apps/web/src/**/*.js.map     # In-place source maps (PROBLEM - should not exist)
apps/web/src/**/*.d.ts       # In-place declarations in app src/ (PROBLEM - should not exist)
```

**Structure Decision**: Nx monorepo with strict separation between source (src/) and compiled artifacts (dist/, .vite cache). The fix ensures tsconfig emit settings and Vite output directories are configured correctly so no build artifacts appear in source directories.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. This section is intentionally empty.

---

## Phase 1 Re-evaluation: Constitution Check

*GATE: Re-check after Phase 1 design artifacts complete*

**Phase 1 Artifacts Generated**:
- ✅ research.md - TypeScript emit configuration best practices
- ✅ data-model.md - tsconfig structure and compilation artifact types
- ✅ contracts/tsconfig-schema.md - Expected tsconfig patterns
- ✅ contracts/file-patterns.md - Expected file system state after fix
- ✅ quickstart.md - Developer verification guide

**Re-evaluation Against Constitution**:

1. **Type Safety**: ✅ STILL COMPLIANT
   - No code changes, only configuration
   - TypeScript strict mode remains enabled
   - Project references maintained for type checking
   - No `any` types introduced

2. **Test-First Development**: ✅ STILL COMPLIANT
   - 27 E2E tests already failing (Red phase exists)
   - Fix makes tests pass (Green phase)
   - No refactoring phase needed (config-only change)
   - Verification steps in quickstart.md follow test-first cycle

3. **Monorepo Architecture**: ✅ STILL COMPLIANT
   - All changes within existing Nx workspace
   - Project references preserved
   - Build orchestration unchanged
   - No new packages or apps

4. **Storage Abstraction**: ✅ STILL COMPLIANT
   - Not applicable - build tooling only

5. **Performance & Memory**: ✅ STILL COMPLIANT
   - research.md documents performance benchmarks
   - quickstart.md includes timing verification steps
   - data-model.md confirms no memory overhead
   - Serial test execution unchanged

**Technology Additions (from research.md)**:
- No new dependencies
- No new packages
- Configuration-only fix

**Complexity Assessment**:
- No architectural changes
- No new build tools or pipelines
- Simplifies file structure (removes in-place .js files)
- Reduces confusion for developers

**Constitution Check Status**: ✅ PASSED - All principles maintained after Phase 1 design

---

## Planning Complete

**Generated Artifacts**:
1. plan.md - This file (Technical Context, Constitution Check, Project Structure)
2. research.md - TypeScript emit configuration best practices and Vite patterns
3. data-model.md - tsconfig structure, compilation artifacts, file system state model
4. contracts/tsconfig-schema.md - Expected tsconfig emit configurations
5. contracts/file-patterns.md - Expected file system patterns before/after fix
6. quickstart.md - Developer guide for verifying and testing the fix

**Constitution Compliance**: ✅ All checks passed (initial + Phase 1 re-evaluation)

**Next Step**: Run `/speckit.tasks` command to generate implementation tasks (tasks.md)

**Branch**: `003-fix-vite-compilation`
**Spec**: [spec.md](./spec.md)
**Status**: Ready for task generation
