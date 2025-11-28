# Implementation Plan: Mantine Responsive Layout Configuration

**Branch**: `021-mantine-responsive-layout` | **Date**: 2025-11-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/021-mantine-responsive-layout/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Fix responsive layout issues in BibGraph by correctly configuring Mantine 7.x responsive system. Primary requirements: (1) Mobile-first header navigation with collapsible menu, (2) Responsive sidebar widths and collapse behavior across breakpoints, (3) Content layout auto-adaptation with responsive padding/spacing. Technical approach uses Mantine's mobile-first breakpoint system (base/sm/md/lg/xl), responsive prop objects for AppShell configuration, and strategic use of hiddenFrom/visibleFrom for conditional rendering.

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode enabled (`strict: true`, `strictNullChecks: true`, `noImplicitAny: false`)
**Primary Dependencies**: React 19, Mantine 7.x (AppShell, Box, Stack, Group, Flex, Menu components), TanStack Router v7, Vanilla Extract CSS
**Storage**: IndexedDB via Dexie (for layout state persistence - sidebar preferences)
**Testing**: Vitest (unit/component tests), Playwright (E2E tests), @testing-library/react, @axe-core/playwright (accessibility)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge) - responsive web application
**Project Type**: Web application (existing monorepo - `apps/web/`)
**Performance Goals**: <100ms layout adaptation on viewport resize, <100ms sidebar drag response, <1s component rendering for 50-100 items
**Constraints**: WCAG 2.1 AA accessibility compliance (≥44px touch targets on mobile), no horizontal scrolling on viewport 375px-2560px, serial test execution (memory constraints), Mantine 7.x responsive API surface
**Scale/Scope**: Single-page application, modify 1 primary layout file (`MainLayout.tsx`), add responsive configuration to ~10-15 components, 3 user stories (P1/P2/P3), 12 functional requirements

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with BibGraph Constitution (`.specify/memory/constitution.md`):

### Initial Check (Pre-Phase 0)

1. **Type Safety**: ✅ PASS - All responsive props use typed Mantine breakpoint objects (`MantineBreakpoint`), no `any` types planned
2. **Test-First Development**: ✅ PASS - Component tests (responsive behavior), E2E tests (viewport resizing), accessibility tests will be written before implementation
3. **Monorepo Architecture**: ✅ PASS - Modifies existing `apps/web/src/components/layout/MainLayout.tsx`, no new packages required, uses `@bibgraph/*` imports
4. **Storage Abstraction**: ✅ PASS - Uses existing Dexie storage provider for sidebar preferences (no new storage operations)
5. **Performance & Memory**: ✅ PASS - Performance requirements documented (<100ms adaptation), tests run serially, no Web Workers needed (UI-only changes)
6. **Atomic Conventional Commits**: ✅ PASS - Each responsive change (header/sidebar/content) committed separately with `fix(web):` prefix
7. **Development-Stage Pragmatism**: ✅ PASS - Breaking changes to layout CSS acceptable, no backwards compatibility needed
8. **Test-First Bug Fixes**: ✅ PASS - Any responsive bugs will have Playwright tests before fixes
9. **Deployment Readiness**: ✅ PASS - Must resolve any pre-existing typecheck/test/build issues, full `pnpm validate` required
10. **Continuous Execution**: ✅ PASS - Will proceed through all phases without pausing; automatic `/speckit.tasks` → `/speckit.implement` invocation after planning

**Complexity Justification Required?** ❌ NO - This feature:
- Does NOT add new packages/apps (modifies existing `apps/web/`)
- Does NOT introduce new storage providers (uses existing Dexie provider)
- Does NOT require new worker threads (UI configuration only)
- Does NOT violate YAGNI (responsive design is essential for mobile usability)

### Post-Design Re-Evaluation (After Phase 1)

**Re-checked**: 2025-11-21 after completing research.md, data-model.md, contracts/, and quickstart.md

1. **Type Safety**: ✅ CONFIRMED - No custom types needed, all types provided by Mantine (@mantine/core), no runtime type guards required
2. **Test-First Development**: ✅ CONFIRMED - Test requirements documented in contracts/responsive-layout-api.md (component, E2E, accessibility, performance tests)
3. **Monorepo Architecture**: ✅ CONFIRMED - Single file modifications (MainLayout.tsx + test files), no package boundaries crossed
4. **Storage Abstraction**: ✅ CONFIRMED - Zero new storage operations, reuses existing LayoutState entity
5. **Performance & Memory**: ✅ CONFIRMED - Research decisions documented performance optimization approach (responsive props sparingly, CSS-based visibility preferred)
6. **Atomic Conventional Commits**: ✅ CONFIRMED - Commit strategy defined: separate commits for header, sidebar, content changes
7. **Development-Stage Pragmatism**: ✅ CONFIRMED - Breaking CSS changes acceptable, no migration path needed
8. **Test-First Bug Fixes**: ✅ CONFIRMED - Bug fix workflow documented in contracts
9. **Deployment Readiness**: ✅ CONFIRMED - Pre-existing issues must be resolved, full validate pipeline required
10. **Continuous Execution**: ✅ CONFIRMED - Ready for automatic `/speckit.tasks` then `/speckit.implement` invocation

**Design Phase Findings**:
- ✅ No new architectural complexity introduced
- ✅ All decisions documented in research.md with alternatives considered
- ✅ Data model is trivial (config objects, no persistence changes)
- ✅ Component contracts are clear and testable
- ✅ Quickstart provides clear implementation path

**GATE STATUS**: ✅ **PASSED** - Proceed to Phase 2 (Task Generation)

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
apps/web/
├── src/
│   ├── components/
│   │   └── layout/
│   │       ├── MainLayout.tsx                    # PRIMARY: Add responsive AppShell config
│   │       ├── HeaderSearchInput.tsx             # Modify: Add hiddenFrom prop
│   │       └── [other layout components]         # Review for responsive needs
│   ├── routes/
│   │   └── __root.tsx                           # Context: Uses MainLayout
│   └── test/
│       ├── component/
│       │   └── MainLayout.responsive.component.test.tsx  # NEW: Responsive behavior tests
│       └── e2e/
│           ├── mobile-navigation.e2e.test.ts    # NEW: Mobile header navigation E2E
│           ├── sidebar-responsive.e2e.test.ts   # NEW: Sidebar breakpoint behavior E2E
│           └── layout-adaptation.e2e.test.ts    # NEW: Content adaptation E2E

# No changes to packages/ - this is web UI only
```

**Structure Decision**: Web application structure (Option 2 modified). This feature exclusively modifies the web app's layout components (`apps/web/`). No backend changes, no new packages. Primary changes concentrated in `MainLayout.tsx` with responsive props applied to Mantine AppShell, Stack, Group, Flex, and Menu components. Tests co-located in `apps/web/test/` following existing structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

❌ NOT APPLICABLE - No Constitution violations. All checks passed (see Constitution Check section above).
