# Implementation Plan: shadcn Styling Standardization

**Branch**: `029-shadcn-styling` | **Date**: 2025-11-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/029-shadcn-styling/spec.md`

## Summary

Standardize UI component styling using shadcn-inspired theming for Mantine with official Vanilla Extract integration while preserving existing hash-based color logic for graph visualization. This involves: (1) eliminating Tailwind classes from production UI components, (2) replacing Mantine CSS variables with Vanilla Extract theme system, (3) implementing Vanilla Extract recipes for consistent styling patterns, (4) integrating academic color palettes from research files, and (5) ensuring theme switching performance under 100ms with <5% bundle size increase.

## Technical Context

**Language/Version**: TypeScript 5.9.2, React 19
**Primary Dependencies**: Mantine UI 7.x, Vanilla Extract 5.x, Nx 22.x
**Storage**: N/A (styling feature - no new persistence)
**Testing**: Vitest 4.x, React Testing Library 16.x, Playwright E2E
**Target Platform**: Web browser (desktop & mobile)
**Project Type**: Web application (Nx monorepo - apps/web)
**Performance Goals**: Theme switching <100ms, bundle size increase <5%, CSS generation at compile-time
**Constraints**: Must preserve existing hash-based graph colors, maintain academic entity mappings, no breaking changes to graph visualization
**Scale/Scope**: ~50 UI components across the web application, component-level styling patterns

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**✅ CONSTITUTION COMPLIANCE VERIFIED**

Verify alignment with BibGraph Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ Vanilla Extract provides compile-time CSS type safety, TypeScript theme configurations
2. **Test-First Development**: ✅ Component tests will be written before styling implementation
3. **Monorepo Architecture**: ✅ Changes stay within apps/web and packages/ui structure, no new packages
4. **Storage Abstraction**: ✅ N/A - no storage operations involved in styling feature
5. **Performance & Memory**: ✅ Theme switching <100ms target, compile-time CSS generation, no heavy computation
6. **Atomic Conventional Commits**: ✅ Planned atomic commits for each component styling update
7. **Development-Stage Pragmatism**: ✅ Breaking CSS changes acceptable during development
8. **Test-First Bug Fixes**: ✅ Visual bug tests will reproduce issues before fixes
9. **Repository Integrity**: ✅ All lint/build/test issues will be resolved before completion
10. **Continuous Execution**: ✅ Planning proceeds through all phases without stopping
11. **Complete Implementation**: ✅ Full shadcn-inspired theming as specified, no simplified fallbacks
12. **Spec Index Maintenance**: ✅ specs/README.md updated and committed alongside changes
13. **Build Output Isolation**: ✅ Vanilla Extract compiles to dist/, CSS properly isolated
14. **Working Files Hygiene**: ✅ Debug styling artifacts cleaned up before commits
15. **DRY Code & Configuration**: ✅ Shared styling recipes extracted to packages/ui
16. **Presentation/Functionality Decoupling**: ✅ Styling separated from business logic, testable layers

**Complexity Justification**: Not required - feature enhances existing structure without adding complexity

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
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
