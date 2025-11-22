# Quickstart: Mantine Responsive Layout Configuration

**Feature**: 021-mantine-responsive-layout
**Estimated Time**: 10 minutes to understand, 2-4 hours to implement
**Difficulty**: Intermediate

## Overview

This guide provides a quickstart for implementing responsive layout configuration in Bibliom using Mantine 7.x's mobile-first responsive system.

## Prerequisites

- Familiarity with React 19 and TypeScript
- Understanding of Mantine component library
- Basic knowledge of CSS breakpoints and responsive design
- Bibliom development environment set up

## Key Concepts (5 minutes)

### 1. Mobile-First Breakpoints

Mantine uses mobile-first breakpoints measured in `em` units:

| Breakpoint | Width | Device Category |
|------------|-------|----------------|
| `base`     | < 576px | Mobile phones |
| `sm`       | ≥ 576px | Large phones, small tablets |
| `md`       | ≥ 768px | Tablets, small laptops |
| `lg`       | ≥ 992px | Laptops, desktops |
| `xl`       | ≥ 1200px | Large desktops |

### 2. Responsive Prop Syntax

```typescript
// Single value (applies to all breakpoints)
<Box padding="md" />

// Responsive object (mobile-first)
<Box padding={{ base: 'xs', sm: 'md', lg: 'xl' }} />
```

### 3. Visibility Control

```typescript
// Hide from medium breakpoint and up
<Box hiddenFrom="md">Mobile only</Box>

// Show from medium breakpoint and up
<Box visibleFrom="md">Desktop only</Box>
```

## Quick Implementation (15 minutes)

### Step 1: Update AppShell Configuration

**File**: `apps/web/src/components/layout/MainLayout.tsx`

```typescript
// BEFORE (fixed values)
<AppShell
  header={{ height: 60 }}
  navbar={{
    width: leftSidebarOpen ? leftSidebarWidth + 60 : 60,
    breakpoint: "sm",
    collapsed: { mobile: true },
  }}
  padding={0}
>

// AFTER (responsive values)
<AppShell
  header={{ height: { base: 50, sm: 60 } }}
  navbar={{
    width: leftSidebarOpen
      ? { base: 280, sm: leftSidebarWidth + 60 }
      : 60,
    breakpoint: "sm",
    collapsed: { mobile: true, desktop: !leftSidebarOpen },
  }}
  aside={{
    width: rightSidebarOpen
      ? { base: 280, sm: rightSidebarWidth + 60 }
      : 60,
    breakpoint: "sm",
    collapsed: { mobile: true, desktop: !rightSidebarOpen },
  }}
  padding={{ base: 0, sm: 'xs', md: 'sm' }}
>
```

**Why**: Adapts header height, sidebar widths, and padding to viewport size.

### Step 2: Add Mobile Navigation Menu

**File**: `apps/web/src/components/layout/MainLayout.tsx`

```typescript
// 1. Add state for mobile menu
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

// 2. Replace navigation Group with responsive pattern
{/* Desktop navigation */}
<Group gap="xs" visibleFrom="md">
  <Button component={Link} to="/" variant="subtle" size="sm">Home</Button>
  <Button component={Link} to="/about" variant="subtle" size="sm">About</Button>
  <Button component={Link} to="/history" variant="subtle" size="sm">History</Button>
  <Button component={Link} to="/bookmarks" variant="subtle" size="sm">Bookmarks</Button>
  <Button component={Link} to="/catalogue" variant="subtle" size="sm">Catalogue</Button>
</Group>

{/* Mobile menu */}
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
    {/* ... more items ... */}
  </Menu.Dropdown>
</Menu>
```

**Why**: Prevents horizontal overflow on mobile, provides accessible navigation menu.

### Step 3: Hide Search on Mobile

**File**: `apps/web/src/components/layout/MainLayout.tsx`

```typescript
// BEFORE
<HeaderSearchInput />

// AFTER
<Box visibleFrom="sm">
  <HeaderSearchInput />
</Box>
```

**Why**: Search input requires ~200px width; hiding on small screens frees space for critical navigation controls.

### Step 4: Add Responsive Spacing

**File**: `apps/web/src/components/layout/MainLayout.tsx`

```typescript
// Update Stack, Group, and Box components with responsive gaps/padding
<Stack gap={{ base: 'xs', sm: 'sm', md: 'md' }}>
  <BookmarksSidebar />
  <HistorySidebar />
</Stack>

<Group gap={{ base: 'xs', sm: 'md' }} px={{ base: 'xs', sm: 'md' }}>
  {/* Header controls */}
</Group>

<Box p={{ base: 'xs', sm: 'sm' }}>
  {/* Sidebar content */}
</Box>
```

**Why**: Tight spacing on mobile maximizes content area; generous spacing on desktop improves readability.

### Step 5: Hide Drag Handles on Mobile

**File**: `apps/web/src/components/layout/MainLayout.tsx`

```typescript
// BEFORE
{leftSidebarOpen && (
  <Box
    role="slider"
    w={rem(4)}
    onMouseDown={(e) => handleDragStart({ side: 'left', e })}
  />
)}

// AFTER
{leftSidebarOpen && (
  <Box
    role="slider"
    visibleFrom="md"  // Only show on desktop
    w={rem(4)}
    onMouseDown={(e) => handleDragStart({ side: 'left', e })}
  />
)}
```

**Why**: Drag handles are difficult to use on touch devices; sidebar resizing only makes sense on desktop.

## Testing (30 minutes)

### Manual Testing

1. **Mobile (375px)**: Open DevTools → Toggle device toolbar → Select "iPhone SE"
   - ✓ No horizontal scrolling
   - ✓ Hamburger menu visible
   - ✓ Navigation buttons hidden
   - ✓ Search hidden
   - ✓ Sidebars collapsed

2. **Tablet (768px)**: Select "iPad"
   - ✓ Search visible
   - ✓ Sidebars reduced width when open
   - ✓ Navigation buttons visible

3. **Desktop (1920px)**: Select "Responsive" → Set to 1920×1080
   - ✓ Full sidebar widths
   - ✓ Drag handles visible
   - ✓ Generous spacing

### Automated Testing

```bash
# Run component tests
pnpm nx test web --testPathPattern=MainLayout.responsive

# Run E2E tests
pnpm nx e2e web --grep="mobile-navigation|sidebar-responsive|layout-adaptation"

# Run accessibility tests
pnpm nx e2e web --grep="WCAG"
```

## Common Issues & Solutions

### Issue 1: Layout Doesn't Adapt on Resize

**Symptom**: Layout stays the same when resizing browser

**Solution**: Ensure responsive props use object syntax, not static values
```typescript
// ❌ WRONG
<AppShell padding="md" />

// ✅ CORRECT
<AppShell padding={{ base: 'xs', md: 'md' }} />
```

### Issue 2: Mobile Menu Doesn't Close on Navigation

**Symptom**: Menu stays open after selecting a link

**Solution**: Add `onClick` handler to Menu.Item components
```typescript
<Menu.Item
  component={Link}
  to="/"
  onClick={() => setMobileMenuOpen(false)}  // Close menu
>
  Home
</Menu.Item>
```

### Issue 3: Horizontal Scrolling on Mobile

**Symptom**: Page scrolls horizontally on small screens

**Solution**: Check for fixed-width elements without responsive alternatives
```typescript
// ❌ WRONG
<Box width={400}>Content</Box>

// ✅ CORRECT
<Box width={{ base: '100%', md: 400 }}>Content</Box>
```

### Issue 4: Sidebars Don't Collapse on Mobile

**Symptom**: Sidebars remain visible on small screens

**Solution**: Ensure `collapsed.mobile: true` is set in AppShell config
```typescript
<AppShell
  navbar={{
    collapsed: { mobile: true, desktop: !leftSidebarOpen },  // mobile: true forces collapse
  }}
>
```

### Issue 5: Touch Targets Too Small

**Symptom**: Buttons difficult to tap on mobile devices

**Solution**: Use Mantine's size prop with responsive values
```typescript
<ActionIcon size={{ base: 'md', sm: 'lg' }}>  // Larger on mobile for easier tapping
  <IconMenu />
</ActionIcon>
```

## Performance Tips

1. **Use responsive props sparingly** - Only apply to layout components, not repeated list items
2. **Prefer hiddenFrom/visibleFrom** - CSS-based visibility is faster than conditional rendering
3. **Avoid responsive props in loops** - Extract static values when possible
4. **Use Mantine's built-in spacing** - Theme values are optimized for performance

## Next Steps

1. **Write Tests**: Component tests for responsive behavior, E2E tests for viewport resizing
2. **Test Accessibility**: Run `@axe-core/playwright` to verify WCAG 2.1 AA compliance
3. **Measure Performance**: Use DevTools Performance tab to verify <100ms adaptation time
4. **Document Changes**: Update CLAUDE.md with responsive patterns for future development

## Reference

- **Mantine Responsive Styles**: https://mantine.dev/styles/responsive/
- **AppShell Documentation**: https://mantine.dev/core/app-shell/
- **Flex Component**: https://mantine.dev/core/flex/
- **WCAG Touch Target Size**: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html

## Full Example

See `specs/021-mantine-responsive-layout/contracts/responsive-layout-api.md` for complete component prop interfaces and testing requirements.

## Cheat Sheet

```typescript
// Responsive value syntax
height={{ base: 50, sm: 60, lg: 76 }}

// Visibility control
<Box hiddenFrom="md">Mobile only</Box>
<Box visibleFrom="md">Desktop only</Box>

// Responsive spacing
gap={{ base: 'xs', sm: 'sm', md: 'md', lg: 'lg', xl: 'xl' }}
padding={{ base: 'xs', md: 'md' }}

// AppShell configuration
<AppShell
  header={{ height: { base: 50, sm: 60 } }}
  navbar={{
    width: { base: 280, md: 350 },
    breakpoint: 'sm',
    collapsed: { mobile: true, desktop: false }
  }}
  padding={{ base: 0, sm: 'xs' }}
>
```

## Estimated Implementation Time

- **Setup & Planning**: 30 minutes
- **MainLayout Modifications**: 1 hour
- **Mobile Navigation Menu**: 30 minutes
- **Responsive Spacing Updates**: 30 minutes
- **Testing**: 1 hour
- **Accessibility Verification**: 30 minutes
- **Total**: 3-4 hours

## Success Criteria Checklist

- [ ] No horizontal scrolling on 375px viewport (SC-001)
- [ ] Layout adapts within 100ms on resize (SC-002)
- [ ] Main content ≥80% width on mobile (SC-003)
- [ ] No overflow on 375px-2560px range (SC-004)
- [ ] Task completion parity mobile/desktop (SC-005)
- [ ] Sidebar drag <100ms response (SC-006)
- [ ] WCAG 2.1 AA compliance (SC-007)

---

**Need Help?** See research.md for design decisions, data-model.md for entity definitions, contracts/ for component prop interfaces.
