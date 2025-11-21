# Responsive Layout Component API Contracts

**Feature**: 021-mantine-responsive-layout
**Date**: 2025-11-21
**Type**: Component Interface Specifications

## Overview

This feature modifies existing React components to accept responsive configuration props. This document defines the component prop interfaces and their contracts.

## Contract 1: MainLayout Component (Modified)

**Component**: `apps/web/src/components/layout/MainLayout.tsx`

**Purpose**: Root layout component with responsive AppShell configuration

**Props Interface** (no changes to prop signature):
```typescript
interface MainLayoutProps {
  children?: React.ReactNode;
}
```

**Internal State Changes**:
```typescript
// Existing state (unchanged)
const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
const [leftSidebarPinned, setLeftSidebarPinned] = useState(false);
const [rightSidebarPinned, setRightSidebarPinned] = useState(false);
const [leftSidebarWidth, setLeftSidebarWidth] = useState(300);
const [rightSidebarWidth, setRightSidebarWidth] = useState(300);

// NEW: Mobile menu state
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
```

**Responsive Configuration**:
```typescript
// AppShell responsive config (NEW)
<AppShell
  header={{ height: { base: 50, sm: 60 } }}
  navbar={{
    width: leftSidebarOpen
      ? { base: 280, sm: leftSidebarWidth + 60 }
      : 60,
    breakpoint: 'sm',
    collapsed: { mobile: true, desktop: !leftSidebarOpen }
  }}
  aside={{
    width: rightSidebarOpen
      ? { base: 280, sm: rightSidebarWidth + 60 }
      : 60,
    breakpoint: 'sm',
    collapsed: { mobile: true, desktop: !rightSidebarOpen }
  }}
  padding={{ base: 0, sm: 'xs', md: 'sm' }}
>
```

**Preconditions**:
- Component must be wrapped in MantineProvider
- Layout store must be initialized before mount

**Postconditions**:
- Layout adapts smoothly to viewport changes within 100ms
- No horizontal scrolling on any standard viewport (375px - 2560px)
- Sidebar states persist across breakpoint transitions

**Performance Contract**:
- Render time < 50ms for layout updates
- Viewport resize handling < 100ms
- No layout thrashing or forced reflows

## Contract 2: ResponsiveNavigationMenu Component (NEW)

**Component**: Inline in `MainLayout.tsx` (not extracted to separate file)

**Purpose**: Conditional navigation rendering for mobile/desktop

**JSX Structure**:
```typescript
{/* Desktop navigation - inline buttons */}
<Group gap="xs" visibleFrom="md">
  <Button component={Link} to="/" variant="subtle" size="sm">
    Home
  </Button>
  <Button component={Link} to="/about" variant="subtle" size="sm">
    About
  </Button>
  <Button component={Link} to="/history" variant="subtle" size="sm">
    History
  </Button>
  <Button component={Link} to="/bookmarks" variant="subtle" size="sm">
    Bookmarks
  </Button>
  <Button component={Link} to="/catalogue" variant="subtle" size="sm">
    Catalogue
  </Button>
</Group>

{/* Mobile navigation - dropdown menu */}
<Menu opened={mobileMenuOpen} onChange={setMobileMenuOpen}>
  <Menu.Target>
    <ActionIcon
      variant="subtle"
      size="lg"
      aria-label="Open navigation menu"
      hiddenFrom="md"
    >
      <IconMenu size={18} />
    </ActionIcon>
  </Menu.Target>
  <Menu.Dropdown>
    <Menu.Item component={Link} to="/" onClick={() => setMobileMenuOpen(false)}>
      Home
    </Menu.Item>
    <Menu.Item component={Link} to="/about" onClick={() => setMobileMenuOpen(false)}>
      About
    </Menu.Item>
    <Menu.Item component={Link} to="/history" onClick={() => setMobileMenuOpen(false)}>
      History
    </Menu.Item>
    <Menu.Item component={Link} to="/bookmarks" onClick={() => setMobileMenuOpen(false)}>
      Bookmarks
    </Menu.Item>
    <Menu.Item component={Link} to="/catalogue" onClick={() => setMobileMenuOpen(false)}>
      Catalogue
    </Menu.Item>
  </Menu.Dropdown>
</Menu>
```

**Visibility Contract**:
- Desktop (≥ 768px): Inline buttons visible, menu icon hidden
- Mobile (< 768px): Inline buttons hidden, menu icon visible

**Interaction Contract**:
- Menu opens on icon click (mobile only)
- Menu closes on: navigation selection, outside click, Escape key
- Focus returns to menu button on close (accessibility)

**Accessibility Contract**:
- Menu icon has `aria-label="Open navigation menu"`
- Menu items have proper ARIA roles (Mantine provides)
- Keyboard navigation supported (Arrow keys, Enter, Escape)
- Focus trap within menu when open

## Contract 3: HeaderSearchInput Component (Modified)

**Component**: `apps/web/src/components/layout/HeaderSearchInput.tsx`

**Current Props** (unchanged):
```typescript
// Component has no props - uses internal state
```

**Responsive Behavior** (NEW):
```typescript
// Wrap component with responsive visibility
<Box visibleFrom="sm">
  <HeaderSearchInput />
</Box>
```

**Visibility Contract**:
- Visible on small+ viewports (≥ 576px)
- Hidden on extra-small viewports (< 576px)
- Hidden via CSS `display: none` (no DOM removal)

**Rationale**: Search input requires ~200px width; on 375px mobile screens, this leaves insufficient space for navigation controls

## Contract 4: Responsive Sidebar Sections

**Components**: `LeftRibbon`, `RightRibbon`, `BookmarksSidebar`, `HistorySidebar`, `RightSidebarDynamic`

**Responsive Spacing Changes**:
```typescript
// Before (fixed spacing)
<Stack gap="md">
  <BookmarksSidebar />
  <HistorySidebar />
</Stack>

// After (responsive spacing)
<Stack gap={{ base: 'xs', sm: 'sm', md: 'md' }}>
  <BookmarksSidebar />
  <HistorySidebar />
</Stack>
```

**Padding Changes**:
```typescript
// Sidebar content box
<Box
  flex={1}
  p={{ base: 'xs', sm: 'sm' }}
  style={{ /* ... */ }}
>
```

**Contract**:
- Mobile (< 576px): Minimal spacing (`xs` = 8px)
- Tablet (576-992px): Moderate spacing (`sm` = 12px)
- Desktop (≥ 992px): Generous spacing (`md` = 16px)

## Contract 5: Drag Handle Visibility

**Component**: Sidebar resize drag handles (inline in `MainLayout.tsx`)

**Responsive Behavior**:
```typescript
{/* Left drag handle - desktop only */}
{leftSidebarOpen && (
  <Box
    role="slider"
    aria-label="Resize left sidebar"
    visibleFrom="md"  // NEW: Only visible ≥ 768px
    w={rem(4)}
    h="100%"
    style={{ cursor: 'ew-resize' }}
    onMouseDown={(e) => handleDragStart({ side: 'left', e })}
  />
)}
```

**Visibility Contract**:
- Desktop (≥ 768px): Drag handles visible when sidebar open
- Mobile/Tablet (< 768px): Drag handles hidden via CSS

**Interaction Contract** (desktop only):
- Mouse down starts drag operation
- Mouse move updates width in real-time
- Mouse up ends drag operation
- Keyboard (Arrow Left/Right) adjusts width by 20px increments
- Focus visible on keyboard interaction

**Accessibility Contract**:
- `role="slider"` for assistive technologies
- `aria-label` describes purpose
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` for screen readers
- Keyboard navigation support (Arrow keys)

## Type Definitions (Mantine-Provided)

```typescript
// Import from @mantine/core - NO custom types needed
import type {
  AppShellProps,
  MantineBreakpoint,
  MantineSpacing,
  StyleProp,
} from '@mantine/core';

// Responsive value type (Mantine built-in)
type ResponsiveValue<T> = T | Partial<Record<MantineBreakpoint | 'base', T>>;
```

## Component Testing Contracts

### Component Test Requirements

```typescript
// Each modified component MUST have tests for:
describe('MainLayout.responsive.component.test.tsx', () => {
  it('applies mobile header height on small viewport', () => { /* ... */ });
  it('applies desktop header height on large viewport', () => { /* ... */ });
  it('collapses sidebars on mobile viewport', () => { /* ... */ });
  it('shows desktop navigation on large viewport', () => { /* ... */ });
  it('shows mobile menu on small viewport', () => { /* ... */ });
  it('applies responsive padding to main content', () => { /* ... */ });
});
```

### E2E Test Requirements

```typescript
// Each user story MUST have E2E tests:
describe('mobile-navigation.e2e.test.ts', () => {
  test('mobile menu opens and closes', async ({ page }) => { /* ... */ });
  test('navigation works from mobile menu', async ({ page }) => { /* ... */ });
});

describe('sidebar-responsive.e2e.test.ts', () => {
  test('sidebars collapse on mobile', async ({ page }) => { /* ... */ });
  test('sidebars adapt width on tablet', async ({ page }) => { /* ... */ });
  test('sidebars use full width on desktop', async ({ page }) => { /* ... */ });
});

describe('layout-adaptation.e2e.test.ts', () => {
  test('layout adapts smoothly on resize', async ({ page }) => { /* ... */ });
  test('no horizontal scrolling on mobile', async ({ page }) => { /* ... */ });
  test('content area uses 80%+ width on mobile', async ({ page }) => { /* ... */ });
});
```

### Accessibility Test Requirements

```typescript
// Accessibility tests MUST verify:
import { injectAxe, checkA11y } from 'axe-playwright';

test('mobile navigation passes WCAG 2.1 AA', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await injectAxe(page);
  await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: { html: true },
  });
});

test('touch targets meet 44px minimum', async ({ page }) => {
  // Verify all interactive elements ≥ 44×44 CSS pixels on mobile
});
```

## Performance Contracts

### Render Performance

```typescript
// Layout render time MUST be < 50ms
test('MainLayout renders in < 50ms', () => {
  const start = performance.now();
  render(<MainLayout />);
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(50);
});
```

### Viewport Resize Performance

```typescript
// Viewport resize adaptation MUST be < 100ms
test('layout adapts to resize in < 100ms', async () => {
  // Measure time from resize event to layout stabilization
  const duration = await measureResizeAdaptation();
  expect(duration).toBeLessThan(100);
});
```

### Sidebar Drag Performance

```typescript
// Drag response time MUST be < 100ms
test('sidebar drag responds in < 100ms', async () => {
  // Measure time from mouse move to width update
  const duration = await measureDragResponse();
  expect(duration).toBeLessThan(100);
});
```

## Error Handling

### Invalid Responsive Props

```typescript
// TypeScript prevents invalid props at compile time
// No runtime error handling needed for responsive props
```

### Viewport API Unavailable

```typescript
// Graceful degradation if window.matchMedia not available
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
```

### Storage Access Errors

```typescript
// Layout state loading errors should not crash component
try {
  const layoutState = await loadLayoutState();
} catch (error) {
  console.warn('Failed to load layout state, using defaults', error);
  // Use default layout configuration
}
```

## Summary

This feature introduces **zero new public APIs**. All changes are internal to existing components using Mantine's built-in responsive prop system. Type safety is provided by Mantine's TypeScript definitions. No custom types, interfaces, or API contracts beyond component prop modifications.

**Key Contracts**:
1. AppShell receives responsive configuration objects
2. Navigation conditionally renders based on viewport
3. Drag handles only visible on desktop
4. All responsive behavior is CSS-driven (Mantine handles implementation)
5. Performance targets: <50ms render, <100ms adaptation, <100ms drag response
6. Accessibility: WCAG 2.1 AA compliance, ≥44px touch targets

**Testing Requirements**: Component tests, E2E tests, accessibility tests, performance tests (all contracts validated programmatically)
