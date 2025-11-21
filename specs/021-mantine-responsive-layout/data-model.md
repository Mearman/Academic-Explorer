# Data Model: Mantine Responsive Layout Configuration

**Feature**: 021-mantine-responsive-layout
**Date**: 2025-11-21
**Status**: Complete

## Overview

This feature primarily involves UI configuration rather than data persistence. However, there are a few configuration entities and state models that need to be defined for responsive layout behavior.

## Entity 1: ResponsiveBreakpointConfig

**Description**: Configuration object for Mantine responsive props across breakpoints

**TypeScript Interface**:
```typescript
// Mantine provides this type - we don't define it
type MantineBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Responsive value can be a single value or object with breakpoint keys
type ResponsiveValue<T> = T | Partial<Record<MantineBreakpoint | 'base', T>>;

// Example usage
interface AppShellConfig {
  header?: {
    height?: ResponsiveValue<number | string>;
  };
  navbar?: {
    width?: ResponsiveValue<number | string>;
    breakpoint?: MantineBreakpoint;
    collapsed?: {
      mobile?: boolean;
      desktop?: boolean;
    };
  };
  aside?: {
    width?: ResponsiveValue<number | string>;
    breakpoint?: MantineBreakpoint;
    collapsed?: {
      mobile?: boolean;
      desktop?: boolean;
    };
  };
  padding?: ResponsiveValue<MantineSpacing>;
}
```

**Fields**:
- `base`: Default value for all screen sizes (< xs breakpoint)
- `xs`: Value for extra-small screens (≥ 576px)
- `sm`: Value for small screens (≥ 768px)
- `md`: Value for medium screens (≥ 992px)
- `lg`: Value for large screens (≥ 1200px)
- `xl`: Value for extra-large screens (≥ 1408px)

**Validation Rules**:
- At minimum, `base` value must be provided
- Numeric values are converted to `rem` units by Mantine
- String values must be valid CSS values
- Breakpoint keys cascade upward (if `md` not specified, uses `sm` value)

**State Transitions**: N/A - static configuration

**Relationships**: Used by AppShell, Stack, Group, Flex, Box components

## Entity 2: LayoutState (Existing - No Changes)

**Description**: Persisted sidebar state (already exists in Dexie storage)

**TypeScript Interface** (existing):
```typescript
interface LayoutState {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftSidebarPinned: boolean;
  rightSidebarPinned: boolean;
  leftSidebarWidth?: number;   // Optional: User-customized width
  rightSidebarWidth?: number;  // Optional: User-customized width
}
```

**Fields** (no changes):
- `leftSidebarOpen`: Boolean flag for left sidebar visibility
- `rightSidebarOpen`: Boolean flag for right sidebar visibility
- `leftSidebarPinned`: Boolean flag for left sidebar pin state
- `rightSidebarPinned`: Boolean flag for right sidebar pin state
- `leftSidebarWidth`: Optional custom width (stored for desktop)
- `rightSidebarWidth`: Optional custom width (stored for desktop)

**Validation Rules** (existing):
- Width values must be between 200-600 pixels
- Pin state only meaningful when sidebar is open
- Persisted to IndexedDB via Dexie storage provider

**State Transitions** (existing):
- Sidebar can transition: closed → open → pinned
- Width changes persist only when sidebar is open
- Pin state cleared when sidebar closed

**Responsive Behavior** (NEW):
- On mobile (< 576px): sidebars always collapsed regardless of state
- On tablet (576-992px): reduced width applied if sidebar open
- On desktop (≥ 992px): full custom width applied if sidebar open
- State persists across breakpoint transitions (user preference maintained)

**Relationships**: Used by `useLayoutStore` hook, persisted via Dexie

## Entity 3: ViewportBreakpoint (Computed - Not Persisted)

**Description**: Current viewport category computed from window width

**TypeScript Type**:
```typescript
type ViewportBreakpoint = 'mobile' | 'tablet' | 'desktop';

// Computed based on window.innerWidth
function getViewportBreakpoint(): ViewportBreakpoint {
  const width = window.innerWidth;
  if (width < 576) return 'mobile';
  if (width < 992) return 'tablet';
  return 'desktop';
}
```

**Categorization**:
- `mobile`: < 576px (phones, small devices)
- `tablet`: 576px - 992px (tablets, small laptops)
- `desktop`: ≥ 992px (laptops, desktops, large screens)

**Usage**: Determines AppShell `collapsed` state logic
- Mobile: Always collapse sidebars
- Tablet: Use user preference with reduced widths
- Desktop: Use user preference with full widths

**Validation Rules**: N/A - computed from browser API

**State Transitions**: Updates on window resize events

**Relationships**: Influences AppShell configuration, does not persist

## Entity 4: ResponsiveNavigationState (Component State - Not Persisted)

**Description**: Mobile menu open/closed state (transient UI state)

**TypeScript Interface**:
```typescript
interface ResponsiveNavigationState {
  mobileMenuOpen: boolean;
}
```

**Fields**:
- `mobileMenuOpen`: Boolean flag indicating if mobile navigation menu (hamburger) is expanded

**Validation Rules**: N/A - simple boolean toggle

**State Transitions**:
- Closed → Open: User taps hamburger menu icon
- Open → Closed: User selects navigation item, taps outside menu, or presses Escape key

**Lifecycle**: Component-local state (React `useState`), resets on component unmount

**Relationships**: Controls Mantine Menu component visibility on mobile viewports

## Data Flow

### Responsive Layout Initialization

```
1. MainLayout mounts
2. Read LayoutState from Dexie (sidebar preferences)
3. Compute ViewportBreakpoint from window.innerWidth
4. Apply ResponsiveBreakpointConfig to AppShell props
5. Determine sidebar collapsed states based on viewport + user preferences
6. Render layout with responsive configuration
```

### Viewport Resize Handling

```
1. Window resize event fires
2. Recompute ViewportBreakpoint
3. AppShell responsive props automatically adjust (CSS-driven)
4. Sidebar collapsed states update if crossing mobile/tablet/desktop threshold
5. Layout re-renders smoothly without flickering (Mantine handles transitions)
6. LayoutState persisted preferences remain unchanged
```

### Mobile Navigation Interaction

```
1. User on mobile viewport (< 768px)
2. Navigation buttons hidden (visibleFrom="md")
3. Hamburger menu icon visible (hiddenFrom="md")
4. User taps icon → ResponsiveNavigationState.mobileMenuOpen = true
5. Menu dropdown appears with navigation links
6. User selects link → Navigation occurs, mobileMenuOpen = false
```

## Storage Requirements

### No New Storage Operations

This feature does NOT introduce new storage operations. It uses existing Dexie storage provider for LayoutState (already implemented).

### IndexedDB Schema (Existing - No Changes)

```typescript
// Existing Dexie schema - no modifications needed
db.version(1).stores({
  layoutState: 'id, leftSidebarOpen, rightSidebarOpen, leftSidebarPinned, rightSidebarPinned, leftSidebarWidth, rightSidebarWidth'
});
```

### Storage Provider Interface (Existing - No Changes)

```typescript
// No new methods required - using existing CatalogueStorageProvider
interface CatalogueStorageProvider {
  // ... existing methods for catalogue, bookmarks, history
  // LayoutState persisted separately via layout-store.ts
}
```

## Type Safety

### Mantine Types (Import from @mantine/core)

```typescript
import type {
  MantineBreakpoint,
  MantineSpacing,
  AppShellProps,
} from '@mantine/core';
```

### Responsive Prop Type Guards (Not Needed)

Mantine's TypeScript definitions provide compile-time type safety. No runtime type guards required for responsive props.

### Validation (Compile-Time Only)

```typescript
// ✅ VALID: TypeScript allows this
<AppShell padding={{ base: 'xs', sm: 'md', lg: 'xl' }} />

// ❌ INVALID: TypeScript rejects this
<AppShell padding={{ base: 'xs', sm: 999 }} />  // 999 not a valid MantineSpacing

// ❌ INVALID: TypeScript rejects this
<AppShell padding={{ invalidKey: 'xs' }} />  // invalidKey not a breakpoint
```

## Testing Data

### Component Test Fixtures

```typescript
// Mock window.matchMedia for breakpoint testing
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    })),
  });
};

// Test data for mobile viewport
const mobileViewport = { width: 375, height: 667 };

// Test data for tablet viewport
const tabletViewport = { width: 768, height: 1024 };

// Test data for desktop viewport
const desktopViewport = { width: 1920, height: 1080 };
```

### E2E Test Scenarios

```typescript
// Playwright viewport configurations
const viewports = {
  mobile: { width: 375, height: 667 },    // iPhone SE
  tablet: { width: 768, height: 1024 },   // iPad
  desktop: { width: 1920, height: 1080 }, // Full HD
};

// Test sidebar state persistence across breakpoints
const layoutState = {
  leftSidebarOpen: true,
  leftSidebarPinned: false,
  leftSidebarWidth: 350,
  rightSidebarOpen: false,
};
```

## Key Constraints

1. **No New Storage Operations**: This feature reuses existing Dexie storage, no schema changes
2. **Type Safety**: All responsive props typed via Mantine's TypeScript definitions
3. **Performance**: Responsive props limited to layout components (not used in lists)
4. **Accessibility**: Touch targets must be ≥44px on mobile (enforced via Mantine's default sizing)
5. **Persistence**: Sidebar preferences persist across breakpoint transitions (viewport changes don't reset user preferences)

## Summary

This feature is primarily a **configuration change** rather than a data modeling exercise. The key entities are:

1. **ResponsiveBreakpointConfig** - Mantine's type system for responsive props
2. **LayoutState** - Existing entity, no schema changes
3. **ViewportBreakpoint** - Computed value, not persisted
4. **ResponsiveNavigationState** - Transient component state

No new database tables, no new storage operations, no schema migrations required. All type safety provided by Mantine's TypeScript definitions.
