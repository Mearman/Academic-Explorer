# Implementation Plan: Landing Page Layout Improvements

**Branch**: `010-landing-page-layout` | **Date**: 2025-11-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-landing-page-layout/spec.md`

## Summary

Improve the layout and responsive design of the Academic Explorer landing page (root route `/`) to ensure proper spacing, alignment, and visual hierarchy across all viewport sizes. Update E2E tests to verify layout correctness, touch target sizes, and responsive behavior.

**Technical Approach**: Refine existing Mantine Card component styling using inline styles and Mantine's responsive utilities. Adjust spacing between sections (title, search form, examples, features) to create clear visual hierarchy. Update existing E2E test assertions to verify responsive layout, element positioning, and minimum touch target sizes.

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode
**Primary Dependencies**: React 19, Mantine 7.x UI components, Vanilla Extract (existing styling system)
**Storage**: N/A (no persistence needed)
**Testing**: Vitest for unit/component tests, Playwright for E2E tests
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge) on desktop, tablet, and mobile
**Project Type**: Web application (monorepo structure)
**Performance Goals**: Page load under 2 seconds, no layout shifts, 60fps scroll performance
**Constraints**: Must support viewport widths from 320px to 3840px, touch targets minimum 44x44 pixels, readable at 200% zoom
**Scale/Scope**: Single landing page component (`apps/web/src/routes/index.lazy.tsx`), one E2E test file

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with Academic Explorer Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ No `any` types planned; existing component uses strict TypeScript with proper Mantine prop types
2. **Test-First Development**: ✅ E2E tests already exist (`apps/web/src/test/e2e/manual/homepage.e2e.test.ts`); will update assertions before layout changes
3. **Monorepo Architecture**: ✅ Changes confined to `apps/web/src/routes/` (existing web app structure)
4. **Storage Abstraction**: ✅ N/A - no storage operations in this feature
5. **Performance & Memory**: ✅ E2E tests run serially; no memory-intensive operations; no Web Workers needed
6. **Atomic Conventional Commits**: ✅ Will commit layout changes and test updates separately

**Complexity Justification Required?** NO

This feature:
- ❌ Does NOT add new packages/apps (modifies existing web app)
- ❌ Does NOT introduce new storage providers
- ❌ Does NOT require new worker threads
- ❌ Does NOT violate YAGNI (fixes existing layout issues)
- ❌ Does NOT add architectural complexity (pure CSS/styling changes)

**GATE STATUS**: ✅ PASSED - All constitution principles satisfied, no complexity violations

## Project Structure

### Documentation (this feature)

```text
specs/010-landing-page-layout/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0: Responsive design best practices
├── quickstart.md        # Phase 1: Testing and verification guide
├── checklists/
│   └── requirements.md  # Specification quality checklist (completed)
└── spec.md              # Feature specification (completed)
```

**Note**: No `data-model.md` or `contracts/` needed - this is a pure UI layout feature with no data structures or API contracts.

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── routes/
│   │   ├── __root.tsx               # Root layout (unchanged)
│   │   ├── index.tsx                # Route definition (unchanged)
│   │   └── index.lazy.tsx           # Landing page component (MODIFIED - layout improvements)
│   ├── hooks/
│   │   ├── use-graph-data.ts        # Existing hook (unchanged)
│   │   ├── use-theme-colors.ts      # Existing hook (unchanged)
│   │   └── use-document-title.ts    # Existing hook (unchanged)
│   └── test/
│       └── e2e/
│           └── manual/
│               └── homepage.e2e.test.ts  # E2E tests (MODIFIED - enhanced layout assertions)
└── playwright.config.ts             # Test configuration (unchanged)
```

**Structure Decision**: Web application monorepo structure. Changes confined to single component file (`index.lazy.tsx`) and its E2E test file. No new files created. Uses existing Mantine Card component with refined inline styling for spacing and responsive behavior.

## Complexity Tracking

> **Not applicable** - No constitution violations to justify

---

## Phase 0: Research & Design Decisions

**Status**: ✅ COMPLETED (no NEEDS CLARIFICATION markers - all technical context known)

Since this is a layout refinement of existing code using established technologies (Mantine, React 19), no research phase is needed. The implementation approach is clear:

1. **Responsive Spacing**: Use Mantine's spacing scale (xs, sm, md, lg, xl) for consistent vertical rhythm
2. **Touch Targets**: Ensure all interactive elements (buttons, links, inputs) meet 44x44px minimum
3. **Card Sizing**: Adjust maxWidth and responsive padding to optimize readability across viewports
4. **Visual Hierarchy**: Use Mantine's Stack `gap` prop to create clear section separation

**Decision**: Skip `research.md` generation - no unknowns to resolve. Proceed directly to implementation.

## Phase 1: Design Artifacts

### Data Model

**Not applicable** - This feature has no data structures. It's a pure presentational layout improvement.

### API Contracts

**Not applicable** - This feature has no API endpoints or data contracts. All changes are client-side CSS/layout.

### Quickstart Guide

See [quickstart.md](./quickstart.md) for testing and verification procedures.

---

## Implementation Checklist

**Pre-Implementation** (Test-First):
- [ ] Review existing E2E test assertions
- [ ] Add new test cases for responsive breakpoints (320px, 768px, 1024px, 1920px)
- [ ] Add test cases for touch target sizes (buttons, links, inputs ≥ 44x44px)
- [ ] Add test cases for zoom levels (100%, 150%, 200%)
- [ ] Verify tests FAIL (layout issues exist)

**Implementation**:
- [ ] Adjust Card padding and maxWidth for better responsiveness
- [ ] Refine Stack gaps between title, description, search form, examples, features
- [ ] Ensure search input and button have adequate sizing for touch
- [ ] Test layout manually across breakpoints (Chrome DevTools)
- [ ] Verify layout at 200% zoom

**Post-Implementation** (Red-Green-Refactor):
- [ ] Run E2E tests - verify they PASS
- [ ] Check Playwright screenshots for visual regressions
- [ ] Verify no horizontal scrolling on narrow viewports (320px)
- [ ] Verify content remains centered on wide viewports (3840px)
- [ ] Create atomic commits for layout changes

**Quality Gates**:
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test:e2e` passes (homepage tests)
- [ ] `pnpm build` succeeds
- [ ] No console errors or warnings
- [ ] Lighthouse accessibility score ≥ 95

---

## Notes

**Existing Code Review**: The landing page currently uses:
- Mantine Card with inline styles (`maxWidth: "600px"`, `backdropFilter: "blur(10px)"`)
- Mantine Stack for vertical spacing (`gap="lg"`)
- Responsive design via Mantine's built-in breakpoint system

**Changes Needed**:
1. Review and potentially adjust Card `maxWidth` for better mobile experience
2. Ensure Stack `gap` values create proper visual hierarchy
3. Verify all Group components wrap properly on narrow screens
4. Add responsive padding to Card (currently fixed `padding="xl"`)

**No Breaking Changes**: All modifications are isolated to the landing page component. No changes to shared packages, hooks, or routing configuration.
