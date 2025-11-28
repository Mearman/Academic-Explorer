# Feature Specification: Mantine Responsive Layout Configuration

**Feature Branch**: `021-mantine-responsive-layout`
**Created**: 2025-11-21
**Status**: ✅ Complete (2025-11-21)
**Input**: User description: "we are having some layout issues. use the above research to correctly configure mantinue responsiveness and auto layout"
**Implementation**: Commits `d859c49c`, `c45b5cf0`, `a874416`, `12c80f53`, `925be09b`, `e7e4c344`, `b54a798b`, `6476569a` (mobile search Enter-key trigger)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mobile-First Header Navigation (Priority: P1)

Users accessing BibGraph on mobile devices need a functional, non-overflowing header that provides access to all navigation options without horizontal scrolling or element overlap.

**Why this priority**: The header is the primary navigation interface and currently has overflow issues on mobile devices (5 navigation buttons + search + sidebar toggles + theme toggle exceed available width on small screens). This is a critical usability blocker for mobile users.

**Independent Test**: Can be fully tested by loading the application on a 375px wide viewport (iPhone SE) and verifying all header elements are accessible without horizontal scrolling. Delivers immediate value by making mobile navigation functional.

**Acceptance Scenarios**:

1. **Given** a user on a mobile device (viewport < 768px), **When** they load any page, **Then** all header navigation options are accessible through a menu button without overflow
2. **Given** a user on a desktop device (viewport e 768px), **When** they load any page, **Then** navigation buttons display inline in the header as they currently do
3. **Given** a user on a mobile device, **When** they tap the menu button, **Then** a dropdown menu appears with all navigation links (Home, About, History, Bookmarks, Catalogue)
4. **Given** a user on a mobile device with the menu open, **When** they select a navigation item, **Then** the menu closes and navigation occurs successfully

---

### User Story 2 - Responsive Sidebar Behavior (Priority: P2)

Users on different screen sizes need sidebars that automatically adapt their width and collapse behavior to provide optimal content viewing area while maintaining tool access.

**Why this priority**: Sidebars currently use fixed widths that don't account for viewport size, causing layout issues on tablets and small laptops. This impacts content visibility but doesn't block core functionality.

**Independent Test**: Can be fully tested by resizing the browser from mobile (< 576px) to desktop (> 1200px) and verifying sidebar collapse states and widths adjust appropriately at each breakpoint. Delivers value by optimizing screen space usage across devices.

**Acceptance Scenarios**:

1. **Given** a user on a mobile device (< 576px), **When** they load a page, **Then** both sidebars are collapsed by default to maximize content area
2. **Given** a user on a tablet (576px - 992px), **When** they open a sidebar, **Then** the sidebar width is reduced from desktop size to prevent excessive content compression
3. **Given** a user on a desktop (> 992px), **When** they open a sidebar, **Then** the sidebar uses full user-defined width with resizable drag handles
4. **Given** a user on any device, **When** they rotate the screen or resize the window, **Then** sidebar states adjust smoothly to the new viewport size without page reload

---

### User Story 3 - Content Layout Auto-Adaptation (Priority: P3)

Users viewing content across different devices need layouts that automatically adjust spacing, padding, and arrangement to maintain readability and usability without manual intervention.

**Why this priority**: Enhances overall user experience by optimizing content presentation, but core functionality works without it. This is a polish improvement.

**Independent Test**: Can be fully tested by loading entity detail pages on mobile, tablet, and desktop viewports and verifying appropriate spacing, font sizes, and content arrangement at each breakpoint. Delivers value by improving content readability.

**Acceptance Scenarios**:

1. **Given** a user on a mobile device, **When** they view any content page, **Then** padding and spacing are minimal to maximize content area while maintaining readability
2. **Given** a user on a desktop device, **When** they view any content page, **Then** padding and spacing are generous to improve visual comfort on large screens
3. **Given** a user on any device, **When** they view the main content area, **Then** text and UI elements are sized appropriately for the viewport (smaller on mobile, larger on desktop)
4. **Given** a user viewing relationship sections or data cards, **When** the viewport width changes, **Then** grid layouts automatically adjust column counts to fit the screen optimally

---

### Edge Cases

- What happens when a user manually resizes the browser window while a sidebar is open?
- How does the system handle orientation changes on tablet devices (portrait � landscape)?
- What happens when a user's browser is zoomed to 200% or 50%?
- How does the layout behave on ultra-wide monitors (> 2560px) or small phones (< 375px)?
- What happens when a user has custom browser font size settings?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display header navigation inline on viewports e 768px and in a collapsible menu on viewports < 768px
- **FR-002**: System MUST collapse both sidebars by default on viewports < 576px to maximize content area
- **FR-003**: System MUST use responsive width values for sidebars that adapt to viewport size (reduced width on tablets, full width on desktop)
- **FR-004**: System MUST apply responsive padding to the main content area (minimal on mobile, moderate on tablet, generous on desktop)
- **FR-005**: System MUST adjust header height responsively (50px on mobile, 60px on desktop)
- **FR-006**: System MUST use responsive spacing for all layout sections (Stack, Group, Flex components)
- **FR-007**: System MUST handle viewport resize events smoothly without requiring page reload
- **FR-008**: System MUST maintain sidebar pin states across responsive breakpoint transitions
- **FR-009**: System MUST ensure drag-to-resize handles for sidebars only appear and function on viewports e 768px
- **FR-010**: System MUST ensure no horizontal scrolling occurs on any standard viewport size (375px - 2560px)
- **FR-011**: System MUST use mobile-first breakpoint approach (base styles for smallest screens, overrides for larger)
- **FR-012**: Header search input MUST be visible on viewports e 576px and hidden on smaller viewports to prevent overflow

### Key Entities

- **AppShell Configuration**: Responsive height, width, padding, and breakpoint values for header, navbar, aside, and main sections
- **Breakpoint System**: Mobile (< 576px), Tablet (576px - 992px), Desktop (e 992px) responsive tiers
- **Layout State**: Sidebar open/closed/pinned states that persist across breakpoint transitions

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users on mobile devices (375px - 576px wide) can access all navigation options without horizontal scrolling
- **SC-002**: Layout adapts smoothly to viewport changes within 100ms without flickering or layout shift
- **SC-003**: Main content area uses at least 80% of viewport width on mobile devices when sidebars are collapsed
- **SC-004**: No layout overflow occurs across all standard viewport sizes (375px to 2560px wide)
- **SC-005**: Users can successfully complete primary tasks (search, navigate, view entities) on mobile devices with task completion rates matching desktop (within 5%)
- **SC-006**: Sidebar resize operations maintain performance (<100ms drag response time) on desktop viewports
- **SC-007**: Application passes WCAG 2.1 AA accessibility standards for responsive layouts (touch targets e 44px on mobile)

## Constitution Alignment *(recommended)*

- **Type Safety**: Feature maintains strict TypeScript typing; responsive props use typed breakpoint objects, no `any` types
- **Test-First**: User stories include testable acceptance scenarios; responsive behavior tests will be written before implementation
- **Monorepo Architecture**: Feature modifies existing `apps/web/src/components/layout/MainLayout.tsx`; no new packages required
- **Storage Abstraction**: Layout state persistence continues to use existing Dexie storage provider for sidebar preferences
- **Performance & Memory**: Success criteria include performance metrics (SC-002, SC-006); responsive props used sparingly to avoid performance impact on large lists
- **Atomic Conventional Commits**: Each responsive configuration change (header, sidebar, content) will be committed separately with `fix(web):` prefix
- **Development-Stage Pragmatism**: Breaking changes to layout CSS are acceptable; no backwards compatibility needed for in-development styling
- **Test-First Bug Fixes**: Any responsive layout bugs discovered will have Playwright tests written before fixes
- **Deployment Readiness**: Implementation must maintain all existing functionality while adding responsive behavior; full test suite must pass
- **Continuous Execution**: Implementation will proceed through all phases; spec commits after each phase; will automatically proceed to `/speckit.tasks` then `/speckit.implement` if no questions remain after planning
