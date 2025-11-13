# Quickstart Guide: Landing Page Layout Testing & Verification

**Feature**: Landing Page Layout Improvements
**Branch**: `009-landing-page-layout`
**Last Updated**: 2025-11-13

## Quick Start

```bash
# 1. Start development server
pnpm dev

# 2. Run E2E tests for landing page
cd apps/web
pnpm playwright test src/test/e2e/manual/homepage.e2e.test.ts

# 3. Run with UI mode for visual debugging
pnpm playwright test src/test/e2e/manual/homepage.e2e.test.ts --ui

# 4. Generate test report
pnpm playwright test src/test/e2e/manual/homepage.e2e.test.ts --reporter=html
```

## Manual Testing Checklist

### Responsive Breakpoints

Test the landing page at these viewport sizes:

1. **Mobile (320px)**:
   ```bash
   # In Chrome DevTools:
   # - Open DevTools (F12)
   # - Toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
   # - Select "Responsive" and set width to 320px
   ```
   - ✅ No horizontal scrolling
   - ✅ All content visible and readable
   - ✅ Search button and input are properly sized
   - ✅ Example links wrap gracefully

2. **Tablet (768px)**:
   - ✅ Card remains centered
   - ✅ Proper spacing between sections
   - ✅ Feature badges wrap appropriately

3. **Desktop (1024px, 1920px)**:
   - ✅ Card stays at maxWidth (doesn't stretch too wide)
   - ✅ Content remains centered
   - ✅ Visual hierarchy is clear

4. **4K (3840px)**:
   - ✅ Card is properly centered
   - ✅ Background blur effect looks good
   - ✅ No layout breaking

### Touch Target Verification

Verify minimum 44x44 pixel touch targets:

```bash
# Use browser inspector to check element dimensions:
# Right-click element → Inspect → Check computed dimensions in Styles panel
```

- ✅ Search input: height ≥ 44px
- ✅ Search button: min-height ≥ 44px, min-width ≥ 44px
- ✅ Example links: clickable area ≥ 44px (including padding)

### Zoom Level Testing

Test at different browser zoom levels:

1. **100% zoom**: Baseline - should look good
2. **150% zoom**: Text should remain readable, no overflow
3. **200% zoom**: All content accessible, no horizontal scrolling

**How to test**:
- Chrome/Edge: `Ctrl/Cmd + Plus` to zoom in
- Firefox: `Ctrl/Cmd + Plus` to zoom in
- Or use browser menu: View → Zoom In

### Visual Hierarchy Check

Manually verify spacing creates clear visual hierarchy:

1. **Title section**: Prominent, well-spaced from description
2. **Description text**: Clear separation from search form
3. **Search form**: Visually distinct block with adequate padding
4. **Example searches**: Separated from main search, but related
5. **Feature badges**: Bottom section, clearly separated from examples

## Automated Test Coverage

The E2E test file (`apps/web/src/test/e2e/manual/homepage.e2e.test.ts`) covers:

### Existing Tests
- ✅ Page loads without infinite loops
- ✅ Homepage content displays correctly (title, description, search)
- ✅ Example search links are visible and functional
- ✅ Technology stack indicators display
- ✅ Search input allows typing
- ✅ Search button states (enabled/disabled) work correctly
- ✅ Usage instructions are visible
- ✅ Accessibility features (aria-labels) present

### Tests to Add (Pre-Implementation)

```typescript
// Responsive layout tests
test('should display properly on mobile viewport (320px)', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  // Verify no horizontal scroll, content visible
});

test('should display properly on desktop viewport (1920px)', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  // Verify card centered, max-width respected
});

// Touch target tests
test('should have minimum 44px touch targets for interactive elements', async ({ page }) => {
  const searchButton = page.locator('button:has-text("Search & Visualize")');
  const box = await searchButton.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect(box?.width).toBeGreaterThanOrEqual(44);
});

// Zoom level tests
test('should remain readable at 200% zoom', async ({ page }) => {
  await page.evaluate(() => {
    document.body.style.zoom = '200%';
  });
  // Verify content still visible and accessible
});
```

## Verification Commands

### Full Quality Pipeline

```bash
# From repository root:
pnpm validate

# This runs:
# 1. pnpm typecheck  - TypeScript validation
# 2. pnpm lint       - ESLint checking
# 3. pnpm test       - Full test suite
# 4. pnpm build      - Production build
```

### Isolated Landing Page Tests

```bash
# Run only homepage E2E tests
cd apps/web
pnpm playwright test src/test/e2e/manual/homepage.e2e.test.ts

# Run with headed browser (see what's happening)
pnpm playwright test src/test/e2e/manual/homepage.e2e.test.ts --headed

# Debug mode (pause at each step)
pnpm playwright test src/test/e2e/manual/homepage.e2e.test.ts --debug

# Run specific test by line number
pnpm playwright test src/test/e2e/manual/homepage.e2e.test.ts:32
```

### Visual Regression Testing

```bash
# Take screenshots at different viewports
pnpm playwright test src/test/e2e/manual/homepage.e2e.test.ts --update-snapshots

# Compare against baseline screenshots
pnpm playwright test src/test/e2e/manual/homepage.e2e.test.ts
```

## Common Issues & Solutions

### Issue: Horizontal scrolling on mobile

**Symptom**: Content extends beyond viewport width on narrow screens

**Solution**:
- Check Card `maxWidth` - should be percentage-based or responsive
- Verify Stack/Group components have proper `wrap` settings
- Ensure no fixed-width elements exceed viewport

### Issue: Touch targets too small

**Symptom**: Buttons/links difficult to tap on mobile devices

**Solution**:
- Increase Mantine component `size` prop (e.g., `size="lg"`)
- Add explicit `style={{ minHeight: '44px', minWidth: '44px' }}`
- Use Mantine's `h` and `w` props for sizing

### Issue: Content not centered on large screens

**Symptom**: Card appears off-center on desktop/4K monitors

**Solution**:
- Verify parent container has centering styles
- Check Card maxWidth is set appropriately
- Ensure Stack `align="center"` is applied

### Issue: Text overflow at high zoom

**Symptom**: Text gets cut off or wraps incorrectly at 150%+ zoom

**Solution**:
- Avoid fixed widths on text containers
- Use `overflow-wrap: break-word` for long text
- Test with browser zoom, not just viewport resize

## Performance Metrics

Expected performance benchmarks:

- **Lighthouse Performance**: ≥ 95
- **Lighthouse Accessibility**: ≥ 95
- **First Contentful Paint**: < 1.0s
- **Time to Interactive**: < 2.0s
- **Cumulative Layout Shift**: < 0.1

Run Lighthouse audit:
```bash
# In Chrome DevTools:
# 1. Open DevTools (F12)
# 2. Go to Lighthouse tab
# 3. Select "Performance" and "Accessibility"
# 4. Click "Analyze page load"
```

## Files Modified

Track which files are changed for this feature:

- ✅ `apps/web/src/routes/index.lazy.tsx` - Landing page layout improvements
- ✅ `apps/web/src/test/e2e/manual/homepage.e2e.test.ts` - Enhanced test coverage
- ❌ No new files created
- ❌ No shared package modifications

## Commit Strategy

Follow atomic conventional commits:

```bash
# 1. Test updates first (Red phase)
git add apps/web/src/test/e2e/manual/homepage.e2e.test.ts
git commit -m "test(homepage): add responsive layout and touch target tests"

# 2. Layout implementation (Green phase)
git add apps/web/src/routes/index.lazy.tsx
git commit -m "fix(ui): improve landing page responsive layout and spacing"

# 3. Any refinements (Refactor phase)
git add apps/web/src/routes/index.lazy.tsx
git commit -m "refactor(ui): optimize landing page Card sizing for mobile"
```

**Never use** `git add .` or `git add -A` - always use explicit file paths.

## Next Steps

After this feature is complete:

1. Run full E2E test suite: `pnpm test:e2e`
2. Create pull request against `main` branch
3. Verify CI/CD pipeline passes (GitHub Actions)
4. Request code review
5. Merge after approval

---

**Questions or Issues?**

- Check [spec.md](./spec.md) for feature requirements
- Check [plan.md](./plan.md) for implementation strategy
- Review existing E2E test patterns in `apps/web/src/test/e2e/`
