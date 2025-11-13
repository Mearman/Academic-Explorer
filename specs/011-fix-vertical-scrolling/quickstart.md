# Quickstart Guide: Testing Vertical Scrolling Fix

**Feature**: Fix Vertical Scrolling in Layout
**Branch**: `011-fix-vertical-scrolling`

## Quick Start

```bash
# 1. Start development server
pnpm dev

# 2. Run E2E tests for scroll behavior
cd apps/web
pnpm playwright test src/test/e2e/manual/layout-scrolling.e2e.test.ts

# 3. Manual testing (see procedures below)
```

## Manual Testing Procedures

### Test 1: Main Content Area Scroll Isolation

**Objective**: Verify main content area has NO nested scrollbar

**Steps**:
1. Open browser to `http://localhost:5173`
2. Navigate to `/bookmarks` or any route with MainLayout
3. Open both sidebars (click sidebar toggle buttons in header)
4. Look for scrollbars in the main content area (center section)

**Expected Behavior**:
- ✅ Main content area should NOT have its own scrollbar
- ✅ If content exceeds viewport, the entire page scrolls (not just the center section)
- ✅ No "scrollbar within a scrollbar" effect

**Bug Behavior** (before fix):
- ❌ Main content area has its own scrollbar
- ❌ Multiple nested scrollbars appear when both sidebars are open

---

### Test 2: Left Sidebar Independent Scrolling

**Objective**: Verify left sidebar scrolls independently without affecting main content

**Setup**:
1. Navigate to `/bookmarks`
2. Ensure left sidebar contains 20+ bookmarks (create test bookmarks if needed)
3. Open left sidebar (should be open by default on bookmarks page)
4. Scroll to middle position in main content area
5. Note the scroll position of main content

**Steps**:
1. Hover over left sidebar content
2. Scroll up and down within the sidebar
3. Observe main content area position

**Expected Behavior**:
- ✅ Left sidebar content scrolls smoothly
- ✅ Main content area scroll position remains unchanged
- ✅ Left sidebar has visible scrollbar when content exceeds height
- ✅ Sidebar scrollbar appears only within the sidebar boundary

---

### Test 3: Right Sidebar Independent Scrolling

**Objective**: Verify right sidebar scrolls independently without affecting main content

**Setup**:
1. Navigate to `/history`
2. Ensure right sidebar contains 20+ history items (browse entities to populate)
3. Open right sidebar (click right sidebar toggle button in header)
4. Scroll to middle position in main content area
5. Note the scroll position of main content

**Steps**:
1. Hover over right sidebar content
2. Scroll up and down within the sidebar
3. Observe main content area position

**Expected Behavior**:
- ✅ Right sidebar content scrolls smoothly
- ✅ Main content area scroll position remains unchanged
- ✅ Right sidebar has visible scrollbar when content exceeds height
- ✅ Sidebar scrollbar appears only within the sidebar boundary

---

### Test 4: Scroll Context Switching

**Objective**: Verify smooth transitions between scroll contexts

**Setup**:
1. Open both sidebars
2. Populate both with 20+ items each
3. Add content to main area that exceeds viewport height

**Steps**:
1. Scroll within left sidebar to middle position
2. Move mouse to main content area and scroll
3. Move mouse to right sidebar and scroll
4. Move back to main content and scroll again

**Expected Behavior**:
- ✅ Scrolling smoothly switches between contexts based on mouse position
- ✅ No "double scrolling" effect (scrolling two sections at once)
- ✅ Each section maintains its independent scroll position
- ✅ No visual glitches or layout shifts during transitions

---

### Test 5: Small Viewport Behavior

**Objective**: Verify scroll behavior on small viewports

**Setup**:
1. Resize browser window to 1024x600 (small laptop size)
2. Open both sidebars
3. Ensure all three sections have content exceeding available height

**Steps**:
1. Scroll each section independently
2. Verify scrollbars appear only where needed
3. Check that no section is completely hidden

**Expected Behavior**:
- ✅ All three sections (left sidebar, main, right sidebar) are accessible
- ✅ Each section has scrollbar only when content exceeds available height
- ✅ No horizontal scrollbars appear unexpectedly
- ✅ Layout remains usable and sections don't overlap

---

### Test 6: Browser Window Resize

**Objective**: Verify scroll behavior adapts to window resize

**Setup**:
1. Open application with both sidebars visible
2. Start with large window (1920x1080)

**Steps**:
1. Slowly resize window to smaller size (1024x768)
2. Continue to very small size (800x600)
3. Expand window back to large size
4. During each resize, scroll in different sections

**Expected Behavior**:
- ✅ Scrollbars appear/disappear appropriately as window resizes
- ✅ No broken layouts during resize
- ✅ Scroll positions are preserved when resizing
- ✅ No unexpected scrollbars appear temporarily during resize

---

### Test 7: Keyboard Navigation

**Objective**: Verify keyboard navigation works across scroll contexts

**Setup**:
1. Open both sidebars
2. Populate with interactive content (links, buttons)

**Steps**:
1. Press Tab key repeatedly to cycle through focusable elements
2. Use arrow keys to scroll within focused section
3. Press Shift+Tab to reverse cycle
4. Use Page Up/Page Down keys

**Expected Behavior**:
- ✅ Focus moves logically through all three sections
- ✅ Arrow keys scroll the currently focused section
- ✅ Page Up/Down scrolls the section with keyboard focus
- ✅ No focus trapping (can always Tab out of any section)

---

## Common Issues to Check

### Issue: Multiple Scrollbars in Main Content
**Symptom**: Main content area shows scrollbar within scrollbar
**Expected Fix**: Only outermost scrollbar should be visible
**Check**: Line 485 of MainLayout.tsx - `overflow: "auto"` should be removed or set to `"visible"`

### Issue: Sidebars Don't Scroll
**Symptom**: Long bookmark/history lists are cut off, no scrollbar
**Expected Fix**: Sidebars should have independent scrollbars
**Check**:
- Line 287 (left sidebar): `overflowY: "auto"` should be present
- Line 429 (right sidebar): `overflowY: "auto"` should be present

### Issue: Layout Breaks on Resize
**Symptom**: Content overlaps or disappears on window resize
**Expected Fix**: Layout should adapt smoothly
**Check**: Height calculations (line 485: `h="calc(100vh - 60px)"`)

---

## Testing Routes

Test the scroll fix on these key routes:

1. **`/bookmarks`** - Left sidebar with bookmarks, main content with lists
2. **`/history`** - Right sidebar with history, main content with recent items
3. **`/catalogue`** - Both sidebars, main content with catalogue cards
4. **`/authors/A123`** - Entity detail with graph visualization
5. **`/works/W123`** - Entity detail with paper details

---

## E2E Test Verification

After manual testing, run automated E2E tests:

```bash
cd apps/web

# Run all layout scrolling tests
pnpm playwright test src/test/e2e/manual/layout-scrolling.e2e.test.ts

# Run with UI mode for debugging
pnpm playwright test src/test/e2e/manual/layout-scrolling.e2e.test.ts --ui

# Run specific test
pnpm playwright test src/test/e2e/manual/layout-scrolling.e2e.test.ts -g "main content area"
```

**All tests should PASS after fix is implemented** ✅

---

## Rollback Procedure

If the fix causes issues:

```bash
# Revert the CSS changes
git checkout HEAD~1 -- apps/web/src/components/layout/MainLayout.tsx

# Or revert entire commit
git revert HEAD
```

---

## Success Checklist

Before considering this feature complete:

- [ ] All manual tests pass (Tests 1-7 above)
- [ ] All E2E tests pass (`layout-scrolling.e2e.test.ts`)
- [ ] No visual regressions on major routes
- [ ] No console errors or warnings
- [ ] TypeScript compilation successful
- [ ] Both atomic commits created (test + fix)
