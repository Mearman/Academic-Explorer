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

**✅ PASSED** - All constitutional requirements addressed in Phase 1 design.

Verify alignment with BibGraph Constitution (`.specify/memory/constitution.md`):

1. **✅ Type Safety**: Theme contracts use strict TypeScript interfaces; no `any` types
2. **✅ Test-First Development**: Test strategy defined for all components and styling systems
3. **✅ Monorepo Architecture**: Uses existing Nx structure with proper package aliases; no re-exports between packages
4. **✅ Storage Abstraction**: Settings store uses Zustand with localStorage; no direct storage coupling
5. **✅ Performance & Memory**: <200ms switching target, <10% bundle increase, serial test execution maintained
6. **✅ Atomic Conventional Commits**: Implementation will use atomic commits; spec changes committed per phase
7. **✅ Development-Stage Pragmatism**: Breaking changes acceptable; no backward compatibility required
8. **✅ Test-First Bug Fixes**: Component tests written before styling implementations
9. **✅ Repository Integrity**: All quality gates will pass; no "pre-existing issue" excuses
10. **✅ Continuous Execution**: Work continues through all phases without stopping
11. **✅ Complete Implementation**: Full switchable system implemented; no simplified fallbacks
12. **✅ Spec Index Maintenance**: specs/README.md will be updated with completion status
13. **✅ Build Output Isolation**: TypeScript builds to dist/; no compiled files in src/
14. **✅ Working Files Hygiene**: All temporary files cleaned before commits
15. **✅ DRY Code & Configuration**: Shared theme contracts and utility functions
16. **✅ Presentation/Functionality Decoupling**: Components receive styling via contracts; business logic in hooks

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

```text
apps/web/src/
├── styles/
│   ├── contracts/           # Theme contract definitions
│   │   ├── base-theme-contract.ts
│   │   ├── mantine-theme-contract.ts
│   │   ├── shadcn-theme-contract.ts
│   │   └── radix-theme-contract.ts
│   ├── themes/               # Theme implementations
│   │   ├── mantine-theme.ts
│   │   ├── shadcn-theme.ts
│   │   └── radix-theme.ts
│   ├── recipes/              # Component styling recipes
│   │   ├── button.css.ts
│   │   ├── card.css.ts
│   │   ├── input.css.ts
│   │   └── data-state.css.ts
│   ├── vars.css.ts          # Global CSS variables
│   └── theme-factory.ts      # Theme creation utilities
├── stores/
│   ├── styling-store.ts      # Zustand store for styling preferences
│   └── theme-cache-store.ts  # Cache management store
├── providers/
│   ├── theme-provider.tsx    # Theme context provider
│   └── styling-provider.tsx  # Styling system provider
├── components/
│   ├── ui/                   # Enhanced UI components with switchable styling
│   │   ├── enhanced-button.tsx
│   │   ├── enhanced-card.tsx
│   │   ├── enhanced-input.tsx
│   │   └── enhanced-data-state.tsx
│   └── styling-system-switcher.tsx
└── hooks/
    ├── use-styling-system.ts  # Hook for accessing styling system
    ├── use-component-styles.ts # Hook for component-specific styles
    └── use-theme-cache.ts     # Hook for theme cache management

packages/ui/src/
├── styles/                  # Shared styling utilities
│   ├── theme-contracts.ts   # Re-export all theme contracts
│   └── style-utils.ts       # Styling utility functions
└── recipes/                # Reusable component recipes for other packages
```

**Structure Decision**: Web application structure using existing Nx monorepo layout with apps/web for the main implementation and packages/ui for shared styling utilities.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
