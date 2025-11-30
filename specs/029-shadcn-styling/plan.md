# Implementation Plan: Switchable Styling System Architecture

**Branch**: `029-spec-29` | **Date**: 2025-11-30 | **Spec**: [specs/029-shadcn-styling/spec.md](./spec.md)
**Input**: Feature specification from `/specs/029-shadcn-styling/spec.md`

## Summary

Implement runtime-switchable styling system supporting Native Mantine, shadcn CDN-inspired, and Radix-based approaches using Vanilla Extract theme contracts. Components maintain Mantine functionality while receiving different styling injections based on user preferences stored in settings store.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Mantine UI 7.x, Vanilla Extract, React 19, TanStack Router, Zustand
**Storage**: IndexedDB via Dexie for user preferences, localStorage for theme state
**Testing**: Vitest (serial execution), Playwright for E2E, @axe-core/playwright for accessibility
**Target Platform**: Web browser (modern browsers supporting CSS custom properties)
**Project Type**: Web application (Nx monorepo - apps/web + packages/)
**Performance Goals**: Styling system switching <200ms, bundle size increase <10%
**Constraints**: Must preserve hash-based graph colors, maintain Mantine component functionality, serial test execution (memory constraints)
**Scale/Scope**: All UI components in BibGraph application (~50+ components)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with BibGraph Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: No `any` types planned; use `unknown` with type guards
2. **Test-First Development**: Tests written and failing before implementation begins
3. **Monorepo Architecture**: Changes use proper Nx workspace structure (apps/ or packages/); packages MUST NOT re-export exports from other internal packages
4. **Storage Abstraction**: Any storage operations use provider interface (no direct Dexie/IndexedDB coupling)
5. **Performance & Memory**: Tests run serially; memory constraints considered; Web Workers for heavy computation
6. **Atomic Conventional Commits**: Incremental atomic commits created after each task completion; spec file changes committed after each phase
7. **Development-Stage Pragmatism**: No backwards compatibility required; breaking changes acceptable during development
8. **Test-First Bug Fixes**: Bug tests written to reproduce and fail before fixes implemented
9. **Repository Integrity**: ALL issues (tests, lint, build, audit, errors, warnings) MUST be resolved—"pre-existing" is not an excuse
10. **Continuous Execution**: Work continues without pausing between phases; spec commits after each phase completion; if no outstanding questions after /speckit.plan, automatically invoke /speckit.tasks then /speckit.implement
11. **Complete Implementation**: Implement full version as specified; no simplified fallbacks without user approval
12. **Spec Index Maintenance**: specs/README.md updated when spec status changes; committed alongside spec changes
13. **Build Output Isolation**: TypeScript builds to dist/, never alongside source files
14. **Working Files Hygiene**: Debug screenshots, fix chain docs, and temporary artifacts cleaned up before commit
15. **DRY Code & Configuration**: No duplicate logic; extract shared code to utils; configuration extends shared base; proactive cruft cleanup
16. **Presentation/Functionality Decoupling**: Web app components separate presentation from logic; business logic in hooks/services, rendering in components; testable layers

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
