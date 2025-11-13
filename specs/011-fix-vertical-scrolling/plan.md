# Implementation Plan: Fix Vertical Scrolling in Layout

**Branch**: `011-fix-vertical-scrolling` | **Date**: 2025-11-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-fix-vertical-scrolling/spec.md`

## Summary

Fix multiple nested scrollbars appearing in the main layout by correcting CSS overflow properties in MainLayout.tsx. The issue is caused by overlapping `overflow: auto` styles in the main content area (line 485), left sidebar (line 287), and right sidebar (line 429). The fix will ensure only the intended scroll contexts (sidebars) have scrolling while the main content area eliminates its nested scrollbar.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode enabled)
**Primary Dependencies**: React 19, Mantine 7.x (AppShell, Box components), @tanstack/react-router
**Storage**: N/A (layout/UI-only fix)
**Testing**: Playwright E2E tests (existing suite + new scroll behavior tests)
**Target Platform**: Web (Chrome, Firefox, Safari - all modern browsers)
**Project Type**: Monorepo (apps/web)
**Performance Goals**: Responsive scrolling (<16ms per frame for 60fps), no layout thrashing
**Constraints**: Must maintain independent sidebar scrolling, no breaking changes to existing layout behavior
**Scale/Scope**: Single component modification (MainLayout.tsx), affects all routes using MainLayout

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with Academic Explorer Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ No `any` types planned; using typed React style objects and Mantine props
2. **Test-First Development**: ✅ E2E tests for scroll behavior will be written first and verified to FAIL before CSS fixes
3. **Monorepo Architecture**: ✅ Changes confined to `apps/web/src/components/layout/MainLayout.tsx` (existing Nx workspace structure)
4. **Storage Abstraction**: ✅ N/A - no storage operations involved
5. **Performance & Memory**: ✅ No memory leaks (no new event listeners); scroll performance verified via E2E tests
6. **Atomic Conventional Commits**: ✅ Test commit (test), then implementation commit (fix), separate commits

**Complexity Justification Required?** No - this is a simple CSS fix to existing layout component. No new packages, no new abstractions, no architectural changes.

**All gates passed** ✅

## Project Structure

### Documentation (this feature)

```text
specs/011-fix-vertical-scrolling/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (in progress)
├── quickstart.md        # Manual testing guide (Phase 1)
└── tasks.md             # Task breakdown (Phase 2, not created yet)
```

### Source Code (repository root)

```text
apps/web/src/components/layout/
└── MainLayout.tsx       # Line 485: Remove overflow: auto from AppShell.Main Box
                          # Line 287: Verify left sidebar overflow is correct
                          # Line 429: Verify right sidebar overflow is correct

apps/web/src/test/e2e/manual/
└── layout-scrolling.e2e.test.ts  # New E2E test file for scroll behavior
```

**Structure Decision**: Monorepo web application structure. Changes confined to single component file (`MainLayout.tsx`) and one new E2E test file. No new packages or services needed.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitution violations. This is a straightforward CSS fix.

## Phase 0: Research & Technical Decisions

### CSS Overflow Properties Research

**Decision**: Remove `overflow: "auto"` from main content area Box (line 485), keep it on sidebar Boxes

**Rationale**:
- Mantine's AppShell component is designed to handle scroll contexts at the top level
- Each section (Navbar, Aside, Main) should manage its own overflow independently
- The main content area should fill available space without creating its own scrollable region
- Sidebars need `overflowY: "auto"` to scroll their content independently

**Alternatives Considered**:
1. **Set overflow: "hidden"** - Rejected because this would prevent any scrolling if content exceeds viewport
2. **Use CSS Grid instead of AppShell** - Rejected because AppShell provides responsive sidebar collapse behavior we need
3. **Add wrapper div with controlled overflow** - Rejected because this adds unnecessary DOM nesting

### Height Calculation Strategy

**Decision**: Use `calc(100vh - 60px)` for proper height calculation (already present at line 485)

**Rationale**:
- AppShell header is fixed at 60px height
- Main content should fill remaining viewport height exactly
- This prevents both overflow and underflow scenarios

**Alternatives Considered**:
1. **Use flexbox with flex: 1** - Rejected because explicit calc() is more predictable for debugging
2. **Use position: absolute with top/bottom** - Rejected because it breaks responsive behavior

### Scroll Container Best Practices

**Decision**: Follow Mantine AppShell patterns for scroll isolation

**Rationale**:
- Mantine's AppShell.Navbar and AppShell.Aside components are designed to be independently scrollable
- AppShell.Main should NOT have its own scroll container - it should let children manage their own overflow
- This aligns with standard CSS scroll container patterns

**Reference Documentation**:
- Mantine AppShell: https://mantine.dev/core/app-shell/
- CSS overflow best practices: https://developer.mozilla.org/en-US/docs/Web/CSS/overflow

## Phase 1: Design Artifacts

### Implementation Checklist

1. **E2E Test Creation** (Test-First):
   - [ ] Create `apps/web/src/test/e2e/manual/layout-scrolling.e2e.test.ts`
   - [ ] Test: Main content area has no scrollbar when content fits
   - [ ] Test: Left sidebar scrolls independently with 50+ bookmarks
   - [ ] Test: Right sidebar scrolls independently with 50+ history items
   - [ ] Test: Main content area scroll position unchanged when sidebar scrolls
   - [ ] Run tests and verify they FAIL (Red phase)

2. **CSS Fix Implementation** (Green phase):
   - [ ] Line 485: Change `style={{ overflow: "auto" }}` to `style={{ overflow: "visible" }}` or remove style prop
   - [ ] Verify left sidebar (line 287) keeps `overflowY: "auto"`
   - [ ] Verify right sidebar (line 429) keeps `overflowY: "auto"`
   - [ ] Run E2E tests and verify they PASS

3. **Manual Testing** (Validation):
   - [ ] Open both sidebars with long content lists
   - [ ] Scroll main content area - verify no nested scrollbar
   - [ ] Scroll each sidebar independently - verify isolation
   - [ ] Resize browser window - verify no layout breaks
   - [ ] Test on small viewport (600px height) - verify all scroll contexts work

4. **Commit Strategy**:
   - Commit 1: `test(layout): add E2E tests for scroll behavior isolation`
   - Commit 2: `fix(layout): eliminate nested scrollbar in main content area`

### Quickstart Guide

See [quickstart.md](./quickstart.md) for manual testing procedures.

## Phase 2: Task Breakdown

**Note**: Task breakdown will be generated by `/speckit.tasks` command (not part of this planning phase).

The task breakdown will follow this structure:
- Phase 3: Setup (if needed - likely not needed for this fix)
- Phase 4: Test-First Development (Red phase)
- Phase 5: Implementation (Green phase)
- Phase 6: Validation & Polish

## Dependencies & Risks

### External Dependencies
- None - using existing Mantine components and React patterns

### Internal Dependencies
- Existing MainLayout.tsx component
- Existing Playwright E2E test infrastructure
- Existing sidebar components (BookmarksSidebar, HistorySidebar)

### Risks
1. **Risk**: Removing overflow: auto from main content might cause unexpected layout behavior in nested routes
   - **Mitigation**: Test all major routes (bookmarks, history, catalogue, entity details)
   - **Severity**: Low (easy to revert if issues found)

2. **Risk**: Sidebar scrolling might break on mobile viewports
   - **Mitigation**: E2E tests include mobile viewport sizes, manual testing on actual devices
   - **Severity**: Low (sidebars collapse on mobile anyway)

3. **Risk**: Users might have muscle memory for current scroll behavior
   - **Mitigation**: The fix makes behavior MORE intuitive (removes confusing nested scrollbars)
   - **Severity**: Very low (this is a bug fix, not a feature change)

## Success Criteria Mapping

| Success Criterion | Verification Method |
|-------------------|---------------------|
| SC-001: 0 nested scrollbars in main content | E2E test: Check computed styles, verify no overflow scrollbar |
| SC-002: Sidebar scroll isolation | E2E test: Scroll sidebar, verify main content position unchanged |
| SC-003: 100% predictable scroll behavior | E2E test: Scroll events affect only intended area |
| SC-004: Correct height calculations | E2E test: Verify scrollbar appears only when content > viewport-60px |
| SC-005: No visual glitches | Manual testing + E2E screenshot comparison |
| SC-006: Keyboard navigation works | E2E test: Tab through scrollable regions, verify no focus trap |

## Constitution Re-Check (Post-Design)

All constitution principles remain satisfied after design phase:

1. **Type Safety**: ✅ No new type definitions needed, using existing React.CSSProperties
2. **Test-First Development**: ✅ E2E tests defined in Phase 1, will be written first
3. **Monorepo Architecture**: ✅ No changes to structure
4. **Storage Abstraction**: ✅ Still N/A
5. **Performance & Memory**: ✅ Removing overflow improves performance (fewer layout calculations)
6. **Atomic Conventional Commits**: ✅ Two-commit strategy defined

**Final Gate**: ✅ PASSED - Ready for task breakdown (`/speckit.tasks`)
