# Feature Specification: Fix Vertical Scrolling in Layout

**Feature Branch**: `011-fix-vertical-scrolling`
**Created**: 2025-11-13-081734
**Status**: Completed
**Completed**: 2025-11-17
**Input**: User description: "there is additional vertical scrolling in the central section and sidebars"

**Implementation Note**: Fixed via commits `fix(layout): eliminate nested scrollbars` and `fix(layout): restore vertical padding`. Nested scrollbar issues resolved.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Seamless Content Navigation (Priority: P1)

A user is browsing academic content with both sidebars open and needs to scroll through the main content area without encountering multiple nested scrollbars that create confusion and hinder navigation.

**Why this priority**: This is the highest priority because multiple scrollbars create a confusing user experience and make the application feel broken. Users expect one clear scrolling context per viewport.

**Independent Test**: Can be fully tested by opening both sidebars, adding content that exceeds viewport height, and verifying only one scrollbar appears (the main viewport scrollbar, not nested scrollbars within each section).

**Acceptance Scenarios**:

1. **Given** the application is open with both sidebars visible, **When** the user scrolls the main content area, **Then** only the main viewport scrollbar should be active and no nested scrollbars should appear in the central section
2. **Given** the left sidebar contains bookmarks that exceed the viewport height, **When** the user views the sidebar, **Then** the sidebar content should scroll within its own boundary without affecting the main content scroll position
3. **Given** the right sidebar contains history items that exceed the viewport height, **When** the user views the sidebar, **Then** the sidebar content should scroll independently without creating additional scrollbars in the main content area

---

### User Story 2 - Sidebar Content Access (Priority: P2)

A user with many bookmarks or history items needs to scroll through sidebar content to access all items without scrollbars appearing in unexpected locations.

**Why this priority**: Secondary priority because sidebars need independent scrolling to display long lists, but the main issue is eliminating unexpected nested scrollbars.

**Independent Test**: Can be tested by populating sidebars with 50+ items and verifying that sidebar scrolling works correctly and independently from main content scrolling.

**Acceptance Scenarios**:

1. **Given** the left sidebar contains 50+ bookmarks, **When** the user scrolls within the left sidebar, **Then** the sidebar content scrolls smoothly without affecting main content or creating visual glitches
2. **Given** both sidebars are open with long content lists, **When** the user scrolls in either sidebar, **Then** only that sidebar's content moves while other areas remain stationary
3. **Given** the user is scrolling sidebar content, **When** they move their mouse to the main content area and scroll, **Then** the scroll context switches seamlessly without double-scrolling behavior

---

### Edge Cases

- What happens when viewport height is very small (< 600px) and all three sections have overflowing content?
- How does the layout handle rapid switching between scrolling the main content and scrolling a sidebar?
- What happens when the user resizes the browser window while scrolling?
- How does keyboard navigation (Tab, Arrow keys) interact with multiple scroll contexts?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Main content area (AppShell.Main) MUST have a single, clearly defined scrollable region
- **FR-002**: Left sidebar content MUST scroll independently within its own boundary without affecting main content
- **FR-003**: Right sidebar content MUST scroll independently within its own boundary without affecting main content
- **FR-004**: System MUST eliminate nested scrollbars that appear within the central content section
- **FR-005**: Scroll behavior MUST feel natural with clear scroll context boundaries (user knows which area they're scrolling)
- **FR-006**: Layout MUST maintain proper height calculations so scrollbars only appear when content genuinely exceeds available space
- **FR-007**: Resizing sidebars MUST not introduce or remove unexpected scrollbars
- **FR-008**: System MUST maintain consistent scroll behavior across different viewport sizes (mobile, tablet, desktop)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can scroll through main content without encountering nested scrollbars within the central section (0 nested scrollbars in main content area)
- **SC-002**: Each sidebar scrolls independently without creating scrollbars in the main content area (scroll isolation confirmed via E2E tests)
- **SC-003**: Scrolling feels responsive and predictable - 100% of scroll actions affect only the intended area (main content OR specific sidebar, not both simultaneously)
- **SC-004**: Layout height calculations are correct - scrollbars only appear when content height exceeds viewport height minus header (60px)
- **SC-005**: No visual glitches or layout shifts occur during scrolling actions (0 reported layout shift issues in testing)
- **SC-006**: Keyboard navigation (Tab, Shift+Tab) works correctly across all scrollable regions without focus trapping

## Constitution Alignment *(recommended)*

- **Type Safety**: Feature avoids `any` types; uses typed style objects and proper TypeScript for layout calculations
- **Test-First**: E2E tests will verify scroll behavior across viewport sizes before implementation changes
- **Monorepo Architecture**: Changes confined to `apps/web/src/components/layout/MainLayout.tsx` component
- **Storage Abstraction**: Not applicable - no persistence involved
- **Performance & Memory**: Success criteria include responsive scrolling; no memory leaks from scroll event listeners
- **Atomic Conventional Commits**: Implementation will be committed atomically with conventional commit messages (fix(layout): eliminate nested scrollbars in main content area)
