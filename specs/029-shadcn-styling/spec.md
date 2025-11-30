# Feature Specification: shadcn Styling Standardization

**Feature Branch**: `029-shadcn-styling`
**Created**: 2025-11-30
**Status**: Draft
**Input**: User description: "create a spec from this plan"

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

### User Story 3 - Theme Consistency (Priority: P3)

As a user switching between light and dark modes, I expect the theme to apply consistently across all UI components while preserving the academic entity color mappings (works=blue, authors=green, etc.) that help identify different content types.

**Why this priority**: Improves accessibility and visual comfort for different lighting conditions

**Independent Test**: Can be fully tested by toggling theme settings and verifying all components adapt correctly while maintaining entity color consistency

**Acceptance Scenarios**:

1. **Given** I switch from light to dark mode, **When** the theme changes, **Then** all UI components update their styling appropriately
2. **Given** I view academic entities, **When** in either theme mode, **Then** entity type colors remain consistent (works=blue, authors=green, etc.)

---

### Edge Cases

- What happens when theme switching occurs during component interactions?
- How does the system handle components that use both UI styling and graph visualization colors?
- What happens when custom color themes are applied?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST eliminate all Tailwind class usage from production UI components
- **FR-002**: System MUST replace Mantine CSS variables with shadcn CSS variables in UI components
- **FR-003**: System MUST preserve existing hash-based color logic for graph visualization nodes and edges
- **FR-004**: System MUST establish consistent visual design patterns using the research theme's 20 color palettes
- **FR-005**: System MUST fix broken DataState component and other components with styling issues
- **FR-006**: System MUST implement Vanilla Extract recipes for consistent component styling patterns
- **FR-007**: System MUST maintain academic entity color mappings (works=blue, authors=green, sources=violet, etc.) in UI elements
- **FR-008**: System MUST ensure theme switching works consistently across all UI components
- **FR-009**: System MUST apply proper focus states, hover effects, and disabled states following shadcn patterns
- **FR-010**: System MUST maintain bundle size increase under 5% from current baseline

### Key Entities *(include if feature involves data)*

- **UI Components**: Interactive elements that display and respond to user actions
- **Theme System**: Visual styling system that defines colors, spacing, and typography
- **Color Variables**: CSS custom properties that define the visual appearance
- **Component Recipes**: Reusable styling patterns for consistent component behavior

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero Tailwind classes appear in production code (verified by code analysis)
- **SC-002**: Zero Mantine CSS variables remain in UI components (replaced with shadcn variables)
- **SC-003**: All UI components render without visual artifacts or styling errors
- **SC-004**: Theme switching completes in under 100ms across all components
- **SC-005**: Bundle size increase stays under 5% from current baseline
- **SC-006**: Academic entity color application is 100% consistent across UI elements
- **SC-007**: Graph visualization colors remain completely unchanged (hash-based logic preserved)
- **SC-008**: All interactive states (hover, focus, disabled) follow consistent shadcn patterns

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