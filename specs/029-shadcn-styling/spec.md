# Feature Specification: Switchable Styling System Architecture

**Feature Branch**: `029-shadcn-styling`
**Created**: 2025-11-30
**Status**: Draft
**Input**: User description: "update spec 29 so that we can switch between the native mantine styles and the shad-cdn based styles, as well as allowing us to add radix based styles later"

## Clarifications

### Session 2025-11-30
- **Q**: Approach to shadcn integration - migrate from Mantine or enhance Mantine? → **A**: Implement shadcn-inspired theming for Mantine using Vanilla Extract (reference: https://github.com/RubixCube-Innovations/mantine-theme-builder), NOT migrate from Mantine to shadcn
- **Q**: Theming scope - color palettes, entity styling, or both? → **A**: Use hash-based colors (already working, must be preserved), focus on academic color palettes and UI component styling patterns
- **Q**: How should users switch between styling systems - runtime toggle (like theme switching) or build-time configuration? → **A**: Runtime toggle (like light/dark theme switching)
- **Q**: Where should styling system preferences be stored and managed? → **A**: Settings store alongside theme preferences
- **Q**: How should components adapt to different styling systems? → **A**: Styling injection pattern with multiple Vanilla Extract theme contracts (MantineThemeContract, ShadcnThemeContract, RadixThemeContract)
- **Q**: Where should users access the styling system switcher in the UI? → **A**: Both locations with sync (header toggle + settings page)
- **Q**: Should color preferences be maintained when switching between styling systems? → **A**: Yes - implement color synchronization with automatic mapping between systems while allowing per-system fine-tuning

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Broken UI Component Fix (Priority: P1)

As a user interacting with the BibGraph application, I expect all UI components to display correctly without visual artifacts or styling inconsistencies. Currently, some components show broken styling due to missing Tailwind classes and mixed styling systems.

**Why this priority**: Critical issue - broken UI components directly impact user experience and application usability

**Independent Test**: Can be fully tested by loading the application and verifying that DataState components and other UI elements display without broken styling or missing visual elements

**Acceptance Scenarios**:

1. **Given** the application loads with any data state (loading, error, empty), **When** the UI renders, **Then** all components display with proper styling without visual artifacts
2. **Given** I interact with UI elements (buttons, cards, inputs), **When** I perform interactions, **Then** all visual states (hover, focus, disabled) render correctly

---

### User Story 2 - Consistent Visual Design Language (Priority: P2)

As a user exploring academic literature, I expect the interface to have a consistent visual design language across all components, with proper color theming, spacing, and typography that follows the established academic research theme.

**Why this priority**: Consistency improves user trust and makes the application more professional and easier to use

**Independent Test**: Can be fully tested by navigating different sections of the application and verifying visual consistency across components

**Acceptance Scenarios**:

1. **Given** I view different entity types (works, authors, institutions), **When** their UI elements are displayed, **Then** all use consistent color schemes and styling patterns
2. **Given** I use interactive elements across the application, **When** I hover or click them, **Then** all behaviors follow consistent visual patterns

---

### User Story 3 - Styling System Switching (Priority: P1)

As a user of the BibGraph application, I expect to seamlessly switch between different styling systems (Native Mantine, shadcn CDN-inspired, Radix-based) and have the entire interface immediately adapt to the selected system while maintaining all functionality.

**Why this priority**: Core feature requirement - enables user choice and supports different visual preferences

**Independent Test**: Can be fully tested by switching between styling systems using both header toggle and settings page, verifying immediate UI adaptation

**Acceptance Scenarios**:

1. **Given** I click the styling system toggle in the header, **When** I select a different styling system, **Then** the entire interface immediately adopts the new styling patterns within 200ms
2. **Given** I change the styling system in the settings page, **When** I return to the main interface, **Then** the header toggle reflects the new selection and all components use the new styling
3. **Given** I refresh the browser or return later, **When** the application loads, **Then** my selected styling system preference is preserved and applied

---

### User Story 4 - Theme Consistency Across Styling Systems (Priority: P2)

As a user switching between light and dark modes within any styling system, I expect the theme to apply consistently across all UI components while preserving the academic entity color mappings (works=blue, authors=green, etc.) that help identify different content types.

**Why this priority**: Ensures accessibility and visual comfort are maintained across all styling systems

**Independent Test**: Can be fully tested by toggling theme settings in each styling system and verifying consistent behavior

**Acceptance Scenarios**:

1. **Given** I switch from light to dark mode in any styling system, **When** the theme changes, **Then** all UI components update their styling appropriately
2. **Given** I view academic entities across different styling systems, **When** in either theme mode, **Then** entity type colors remain consistent (works=blue, authors=green, etc.)

---

### User Story 5 - Color Synchronization (Priority: P1)

As a user customizing the BibGraph interface, I expect my selected color preference to be maintained when switching between different styling systems, so I don't lose my visual customization when exploring different design approaches.

**Why this priority**: Essential UX feature - users expect their color choices to persist across styling system changes

**Independent Test**: Can be fully tested by setting a color in one system, switching to another system, and verifying the color mapping is applied correctly

**Acceptance Scenarios**:

1. **Given** I set my primary color to green in the Mantine system, **When** I switch to shadcn system, **Then** the interface automatically uses the green color equivalent (hue 120) in shadcn styling
2. **Given** I set my primary color to blue (hue 220) in shadcn system, **When** I switch to Mantine system, **Then** the interface automatically uses Mantine's blue color for primary elements
3. **Given** I have a custom color preference set, **When** I switch between any styling systems, **Then** my color preference is preserved through automatic mapping while allowing per-system fine-tuning
4. **Given** I want different color nuances per system, **When** I override the mapped color in a specific system, **Then** the override is preserved when returning to that system while maintaining the global preference for other systems

---

### Edge Cases

- What happens when styling system switching occurs during component interactions?
- How does the system handle components that use both UI styling and graph visualization colors during styling system switches?
- What happens when custom color themes are applied across different styling systems?
- How does the system handle rapid switching between styling systems (multiple clicks in quick succession)?
- What happens if a styling system fails to load or encounters errors during switching?
- How are styling system preferences handled when the settings store is corrupted or unavailable?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support runtime switching between three styling systems: Native Mantine, shadcn CDN-inspired, and Radix-based
- **FR-002**: System MUST eliminate all Tailwind class usage from production UI components
- **FR-003**: System MUST implement multiple Vanilla Extract theme contracts (MantineThemeContract, ShadcnThemeContract, RadixThemeContract) for styling injection pattern
- **FR-004**: System MUST preserve existing hash-based color logic for graph visualization nodes and edges
- **FR-005**: System MUST establish consistent visual design patterns using the research theme's 20 color palettes across all styling systems
- **FR-006**: System MUST fix broken DataState component and other components with styling issues
- **FR-007**: System MUST implement Vanilla Extract recipes for consistent component styling patterns within each styling system
- **FR-008**: System MUST maintain academic entity color mappings (works=blue, authors=green, sources=violet, etc.) in UI elements across all styling systems
- **FR-009**: System MUST ensure theme switching works consistently across all UI components and styling systems
- **FR-010**: System MUST provide styling system switcher in both header (quick toggle) and settings page (detailed options) with synchronization
- **FR-011**: System MUST store styling system preferences in settings store alongside theme preferences
- **FR-012**: System MUST apply proper focus states, hover effects, and disabled states following patterns appropriate to active styling system
- **FR-013**: System MUST maintain bundle size increase under 10% from current baseline (increased to accommodate multiple theme contracts)
- **FR-014**: System MUST ensure styling system switching completes in under 200ms (includes theme contract loading and application)
- **FR-015**: System MUST maintain all existing Mantine component functionality while enabling switchable styling
- **FR-016**: System MUST provide color synchronization that maintains user's color preference when switching between styling systems
- **FR-017**: System MUST automatically map colors between styling systems (Mantine color names ↔ shadcn HSL hues ↔ Radix accent colors)
- **FR-018**: System MUST allow per-system color fine-tuning while preserving global color preference
- **FR-019**: System MUST store global color preference independently of system-specific color settings
- **FR-020**: System MUST provide color mapping for common colors (red, blue, green, violet, orange, yellow, purple, gray) across all systems

### Key Entities *(include if feature involves data)*

- **UI Components**: Interactive elements that display and respond to user actions, using styling injection pattern
- **Styling Systems**: Three distinct styling approaches - Native Mantine, shadcn CDN-inspired, and Radix-based
- **Theme Contracts**: Vanilla Extract contracts (MantineThemeContract, ShadcnThemeContract, RadixThemeContract) defining styling patterns
- **Styling System Manager**: Service that manages runtime switching between styling systems
- **Settings Store**: User preference storage for styling system selection alongside theme preferences
- **Component Recipes**: Reusable styling patterns for consistent component behavior within each styling system
- **Hash-based Colors**: Existing color generation system for graph visualization (preserved unchanged)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero Tailwind classes appear in production code (verified by code analysis)
- **SC-002**: All three styling systems (Native Mantine, shadcn CDN-inspired, Radix-based) are fully functional with proper theme contracts
- **SC-003**: All UI components render without visual artifacts or styling errors across all styling systems
- **SC-004**: Styling system switching completes in under 200ms across all components
- **SC-005**: Theme switching completes in under 100ms across all components within active styling system
- **SC-006**: Bundle size increase stays under 10% from current baseline (increased to accommodate multiple theme contracts)
- **SC-007**: Academic entity color application is 100% consistent across UI elements and styling systems
- **SC-008**: Graph visualization colors remain completely unchanged (hash-based logic preserved)
- **SC-009**: All interactive states (hover, focus, disabled) follow patterns appropriate to active styling system
- **SC-010**: Styling system preferences persist correctly in settings store across browser sessions
- **SC-011**: Header toggle and settings page styling system controls remain synchronized
- **SC-012**: All existing Mantine component functionality is preserved across all styling systems
- **SC-013**: User's color preference is maintained when switching between all three styling systems (100% consistency)
- **SC-014**: Color mapping completes in under 50ms during styling system switches (included in <200ms total)
- **SC-015**: All common colors (red, blue, green, violet, orange, yellow, purple, gray) have equivalent mappings across systems
- **SC-016**: Per-system color overrides are preserved while global color preference remains as default
- **SC-017**: Color synchronization works correctly across light/dark theme modes

## Constitution Alignment *(recommended)*

- **Type Safety**: Feature avoids `any` types; uses `unknown` with type guards where needed
- **Test-First**: User stories include testable acceptance scenarios; implementation will follow Red-Green-Refactor
- **Monorepo Architecture**: Feature fits within existing apps/ or packages/ structure (UI package and web app); packages MUST NOT re-export exports from other internal packages
- **Storage Abstraction**: Feature doesn't involve new persistence requirements
- **Performance & Memory**: Success criteria include performance metrics (theme switching <100ms, bundle size <5% increase)
- **Atomic Conventional Commits**: Implementation tasks will be committed atomically with conventional commit messages; spec files committed after each phase
- **Development-Stage Pragmatism**: Breaking changes acceptable for UI component styling during development
- **Test-First Bug Fixes**: Any visual bugs discovered will have component tests written before fixes
- **Repository Integrity**: ALL issues (tests, lint, build, audit, errors, warnings) MUST be resolved—entire monorepo must be deployable after styling changes
- **Continuous Execution**: Implementation will proceed through all phases without pausing; spec commits after each phase completion; if no outstanding questions after /speckit.plan, automatically invoke /speckit.tasks then /speckit.implement
- **Complete Implementation**: Full shadcn styling standardization as specified will be implemented; no simplified fallbacks for UI components
- **Spec Index Maintenance**: specs/README.md will be updated when spec status changes; committed alongside spec changes
- **Build Output Isolation**: TypeScript builds to dist/, never alongside source files (CSS and styling files properly isolated)
- **Working Files Hygiene**: Debug screenshots and temporary styling artifacts will be cleaned up before commit
- **DRY Code & Configuration**: No duplicate styling logic; shared recipes and utilities extracted to packages; configuration extends shared base; cruft cleaned proactively
- **Presentation/Functionality Decoupling**: Web app components separate presentation (styling) from business logic; styling in recipes/CSS, logic in components/hooks; both layers independently testable