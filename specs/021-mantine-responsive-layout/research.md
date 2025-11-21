# Research: Mantine Responsive Layout Configuration

**Feature**: 021-mantine-responsive-layout
**Date**: 2025-11-21
**Status**: Complete

## Overview

This research document captures decisions, rationale, and alternatives considered for implementing responsive layout configuration using Mantine 7.x in Academic Explorer.

## Decision 1: Mobile-First Breakpoint System

**Decision**: Use Mantine's default mobile-first breakpoint system with responsive prop objects

**Rationale**:
- Mantine 7.x provides built-in mobile-first breakpoints: `base` (< 576px), `sm` (576px), `md` (768px), `lg` (992px), `xl` (1200px)
- Mobile-first approach aligns with modern web development best practices
- Default breakpoints match common device widths (iPhone SE: 375px, iPad: 768px, Desktop: 1200px+)
- Object syntax `{ base: value, sm: value, md: value }` provides type-safe responsive configuration
- No custom breakpoint system needed - reduces complexity and maintains consistency with Mantine ecosystem

**Alternatives Considered**:
1. **Custom breakpoint system** - Rejected: Adds unnecessary complexity, conflicts with Mantine's type system, harder to maintain
2. **Desktop-first approach with max-width media queries** - Rejected: Mobile-first is industry standard, better progressive enhancement
3. **CSS modules with manual @media queries** - Rejected: Loses Mantine's type safety, more verbose, harder to maintain inline with component props

**Implementation**:
```typescript
// Mobile-first responsive props
<AppShell
  header={{ height: { base: 50, sm: 60 } }}
  padding={{ base: 'xs', sm: 'md', lg: 'xl' }}
>
```

## Decision 2: AppShell Responsive Configuration Strategy

**Decision**: Apply responsive width/height/padding directly to AppShell props, use `collapsed` states for mobile sidebar behavior

**Rationale**:
- AppShell's `navbar` and `aside` sections support responsive width objects: `{ base: 250, sm: 300, lg: leftSidebarWidth + 60 }`
- `breakpoint` prop determines when sections switch to mobile mode (100% width)
- `collapsed.mobile` and `collapsed.desktop` provide separate control for each viewport category
- AppShell automatically handles layout calculations and CSS variable updates
- Performance: Mantine handles responsive prop updates via CSS-in-JS without JavaScript layout recalculations

**Alternatives Considered**:
1. **CSS Grid with custom breakpoints** - Rejected: Duplicates Mantine's AppShell logic, loses built-in features (section offsets, padding management)
2. **useMediaQuery hook for manual state management** - Rejected: Causes hydration issues in SSR, requires manual DOM updates, performance overhead
3. **Separate mobile/desktop layouts with conditional rendering** - Rejected: Code duplication, layout shift on breakpoint transitions, poor UX

**Implementation**:
```typescript
<AppShell
  navbar={{
    width: { base: 280, sm: leftSidebarWidth + 60 },
    breakpoint: 'sm',
    collapsed: { mobile: true, desktop: !leftSidebarOpen }
  }}
  aside={{
    width: { base: 280, sm: rightSidebarWidth + 60 },
    breakpoint: 'sm',
    collapsed: { mobile: true, desktop: !rightSidebarOpen }
  }}
>
```

## Decision 3: Mobile Header Navigation Pattern

**Decision**: Use Mantine Menu component with `hiddenFrom`/`visibleFrom` props for responsive navigation

**Rationale**:
- `hiddenFrom="md"` hides element on medium+ screens (≥768px) - CSS-based, no JavaScript
- `visibleFrom="md"` shows element only on medium+ screens - inverse pattern
- Menu component provides accessible dropdown with keyboard navigation, focus management
- Burger icon (hamburger menu) is universally recognized mobile navigation pattern
- Avoids horizontal scrolling on small screens (5 nav buttons + search + toggles + theme button = overflow on 375px width)

**Alternatives Considered**:
1. **Drawer component for mobile navigation** - Rejected: Overkill for simple navigation menu, blocks full screen, harder to dismiss
2. **Horizontal scrolling navigation** - Rejected: Poor UX, violates SC-001 (no horizontal scrolling), hides navigation items
3. **Stacked vertical navigation** - Rejected: Takes too much vertical space in header, pushes content down
4. **Tab-based navigation** - Rejected: Tabs imply related content sections, not top-level site navigation

**Implementation**:
```typescript
{/* Desktop navigation - inline buttons */}
<Group gap="xs" visibleFrom="md">
  <Button component={Link} to="/">Home</Button>
  <Button component={Link} to="/about">About</Button>
  {/* ... more buttons */}
</Group>

{/* Mobile navigation - dropdown menu */}
<Menu hiddenFrom="md">
  <Menu.Target>
    <ActionIcon><IconMenu /></ActionIcon>
  </Menu.Target>
  <Menu.Dropdown>
    <Menu.Item component={Link} to="/">Home</Menu.Item>
    {/* ... more items */}
  </Menu.Dropdown>
</Menu>
```

## Decision 4: Responsive Spacing Strategy

**Decision**: Apply responsive `gap`, `padding`, and `spacing` props to Stack, Group, and Flex components using mobile-first values

**Rationale**:
- Tight spacing on mobile maximizes content area (limited screen real estate)
- Generous spacing on desktop improves visual comfort (larger screens benefit from whitespace)
- Mantine's theme.spacing provides consistent scale: `xs` (8px), `sm` (12px), `md` (16px), `lg` (20px), `xl` (24px)
- Responsive spacing props automatically adjust without layout shift or flickering
- Performance: CSS-based responsive spacing via Mantine's style props system

**Alternatives Considered**:
1. **Fixed spacing values across all breakpoints** - Rejected: Either too cramped on desktop or too loose on mobile, poor UX at extremes
2. **Manual CSS classes with @media queries** - Rejected: Loses Mantine theme consistency, harder to maintain, more verbose
3. **JavaScript-based dynamic spacing** - Rejected: Layout thrashing, poor performance, complexity overhead

**Implementation**:
```typescript
<Stack gap={{ base: 'xs', sm: 'sm', md: 'md' }}>
  {/* Content with responsive vertical spacing */}
</Stack>

<Group gap={{ base: 'xs', sm: 'md' }} px={{ base: 'xs', sm: 'md' }}>
  {/* Content with responsive horizontal spacing and padding */}
</Group>
```

## Decision 5: Sidebar Drag Handle Visibility

**Decision**: Hide sidebar resize drag handles on mobile/tablet (< 768px), show only on desktop (≥ 768px)

**Rationale**:
- Touch-based dragging is imprecise and frustrating on mobile devices
- Sidebars are collapsed by default on mobile - no need for resize handles when sidebar isn't open
- Desktop users expect resize functionality for customizable workspace layout
- Reduces UI clutter on small screens
- Prevents accidental drag operations on touch devices

**Alternatives Considered**:
1. **Show drag handles on all devices** - Rejected: Poor touch UX, confusing when sidebars are collapsed on mobile, adds visual noise
2. **Touch-specific drag gesture (pinch/spread)** - Rejected: Non-standard interaction, conflicts with browser zoom gestures, requires custom implementation
3. **Settings panel for sidebar width** - Rejected: Extra clicks required, disconnects action from feedback, less intuitive than direct manipulation

**Implementation**:
```typescript
{/* Drag handle only visible on desktop */}
{leftSidebarOpen && (
  <Box
    visibleFrom="md"
    role="slider"
    w={rem(4)}
    style={{ cursor: 'ew-resize' }}
    onMouseDown={(e) => handleDragStart({ side: 'left', e })}
  />
)}
```

## Decision 6: Performance Optimization Approach

**Decision**: Use responsive style props sparingly, prefer `hiddenFrom`/`visibleFrom` for conditional visibility, avoid responsive props in large lists

**Rationale**:
- Mantine documentation warns: "responsive style props are less performant than regular style props"
- `hiddenFrom`/`visibleFrom` use CSS display properties - hardware-accelerated, no JavaScript execution
- Responsive props in large lists (>50 items) cause performance degradation due to style recalculation
- Layout components (AppShell, header, sidebars) are single instances - safe for responsive props
- Content lists (entity results, bookmarks) should use CSS classes or conditional rendering instead

**Alternatives Considered**:
1. **Responsive props everywhere** - Rejected: Performance degradation in lists, slower viewport resize handling
2. **JavaScript-based conditional rendering** - Rejected: Causes layout shift, hydration mismatches, poor UX
3. **CSS modules for all responsive behavior** - Rejected: Loses Mantine's type safety and theme integration

**Implementation**:
```typescript
{/* ✅ GOOD: Responsive props on single layout element */}
<AppShell padding={{ base: 'xs', sm: 'md', lg: 'xl' }} />

{/* ✅ GOOD: CSS-based visibility control */}
<Box hiddenFrom="sm">Mobile content</Box>

{/* ❌ BAD: Responsive props in repeated list items */}
{items.map(item => (
  <Card key={item.id} p={{ base: 'xs', md: 'md' }}>  // 100+ cards = performance issue
    {item.content}
  </Card>
))}

{/* ✅ BETTER: Fixed padding or CSS class */}
{items.map(item => (
  <Card key={item.id} p="sm">  // Single value, better performance
    {item.content}
  </Card>
))}
```

## Decision 7: Testing Strategy

**Decision**: Write component tests for responsive prop rendering, E2E tests for viewport resizing behavior, accessibility tests for touch targets

**Rationale**:
- Component tests verify responsive props render correct CSS/attributes at different breakpoints
- E2E tests with Playwright validate actual layout behavior on real viewport sizes (375px, 768px, 1200px)
- Accessibility tests ensure WCAG 2.1 AA compliance (≥44px touch targets on mobile)
- Mock `window.matchMedia` in component tests for deterministic breakpoint simulation
- Playwright's viewport resizing simulates real user behavior better than CSS mocking

**Alternatives Considered**:
1. **Visual regression tests (screenshots)** - Rejected: Brittle, slow, hard to debug, flaky in CI, large snapshot storage
2. **Only E2E tests** - Rejected: Slow feedback loop, expensive to run, harder to isolate component-specific issues
3. **Manual testing only** - Rejected: Not repeatable, no regression detection, time-consuming, error-prone

**Implementation**:
```typescript
// Component test - verify responsive props
describe('MainLayout.responsive', () => {
  it('applies mobile padding on small viewport', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn().mockImplementation(query => ({
        matches: query.includes('max-width: 768px'),
      })),
    });
    const { container } = render(<MainLayout />);
    expect(container.querySelector('.mantine-AppShell-main')).toHaveStyle({
      padding: 'var(--mantine-spacing-xs)',
    });
  });
});

// E2E test - verify actual behavior
test('mobile navigation menu appears on small viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Home' })).toBeHidden();
});
```

## Key Takeaways

1. **Mantine's responsive system is sufficient** - No custom breakpoint system or media query management needed
2. **Mobile-first is default** - Always start with base values, override for larger screens
3. **Type safety maintained** - Responsive props use TypeScript types, no string-based magic values
4. **Performance considerations** - Use responsive props judiciously, prefer CSS-based visibility control
5. **Accessibility built-in** - Mantine components handle ARIA attributes, focus management automatically
6. **Testing strategy is clear** - Component tests for props, E2E tests for behavior, accessibility tests for standards compliance

## References

- **Mantine Responsive Styles**: https://mantine.dev/styles/responsive/
- **Mantine AppShell**: https://mantine.dev/core/app-shell/
- **Mantine Flex**: https://mantine.dev/core/flex/
- **WCAG 2.1 AA Touch Target Size**: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html (44×44 CSS pixels minimum)
- **Mobile-First Design**: Industry standard approach, progressive enhancement from small screens upward
