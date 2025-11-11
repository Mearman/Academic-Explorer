# Quickstart Guide: Fix Catalogue E2E Test Failures

**Date**: 2025-11-11
**Feature**: Fix Catalogue E2E Test Failures
**Branch**: `002-fix-catalogue-tests`

## Overview

This guide helps developers understand, run, and fix the 27 failing catalogue E2E tests. Follow this guide to set up your environment, run tests, and implement fixes.

## Prerequisites

- Node.js 18+
- pnpm 8+
- Chrome browser (for Playwright)
- Academic Explorer repository cloned
- Feature 001 (storage abstraction) completed

## Quick Start

```bash
# 1. Check out the feature branch
cd "/Users/joe/Documents/Research/PhD/Academic Explorer"
git checkout 002-fix-catalogue-tests

# 2. Install dependencies
pnpm install

# 3. Run E2E tests
cd apps/web
pnpm test:e2e

# 4. Run specific test file
pnpm test:e2e catalogue-entity-management.e2e.test.ts

# 5. Run tests in headed mode (see browser)
pnpm test:e2e:headed

# 6. Run tests in UI mode (debug)
pnpm test:e2e:ui
```

## Test Status

### Current State

- **Total tests**: 232
- **Passing**: 195 (84%)
- **Failing**: 27 (12%)
- **Skipped**: 10 (4%)

### Failing Test Files

1. **catalogue-entity-management.e2e.test.ts**: 9 failing tests
2. **catalogue-import-export.e2e.test.ts**: 9 failing tests
3. **catalogue-sharing-functionality.e2e.test.ts**: 8 failing tests

### No IndexedDB Hanging! ✅

The storage abstraction layer (feature 001) successfully resolved IndexedDB hanging issues. Tests now run to completion using `InMemoryStorageProvider`.

## Understanding Test Failures

### Common Failure Patterns

#### 1. Selector Not Found

```
Error: locator.click: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for locator('[data-testid="share-button"]')
```

**Cause**: Component missing `data-testid` attribute or selector mismatch

**Fix**: Add data-testid to component
```typescript
<Button data-testid="share-button" onClick={handleShare}>
  Share
</Button>
```

#### 2. Modal Not Opening

```
Error: expect(received).toBeVisible()
Received: <hidden />
```

**Cause**: Button click not triggering modal state change

**Fix**: Verify button onClick handler
```typescript
const [showModal, setShowModal] = useState(false);

<Button onClick={() => setShowModal(true)}>Share</Button>
<Modal opened={showModal} onClose={() => setShowModal(false)}>
  ...
</Modal>
```

#### 3. Feature Not Implemented

```
Error: expect(received).toBeVisible()
Expected: text="Export successful"
Received: text="Not Implemented"
```

**Cause**: Placeholder implementation, feature incomplete

**Fix**: Implement the feature (e.g., JSON export)

#### 4. Notification Not Appearing

```
Error: locator.toBeVisible: Timeout 10000ms exceeded.
waiting for locator('text="Success"')
```

**Cause**: Missing notification call or incorrect message

**Fix**: Add Mantine notification
```typescript
import { notifications } from '@mantine/notifications';

notifications.show({
  title: "Success",
  message: "Operation completed",
  color: "green",
});
```

## Running Tests

### Run All E2E Tests

```bash
cd apps/web
pnpm test:e2e
```

**Expected output**: 232 tests run, 195 pass, 27 fail, 10 skipped

### Run Specific Test File

```bash
# Entity management tests
pnpm test:e2e catalogue-entity-management.e2e.test.ts

# Import/export tests
pnpm test:e2e catalogue-import-export.e2e.test.ts

# Sharing tests
pnpm test:e2e catalogue-sharing-functionality.e2e.test.ts
```

### Run Single Test

```bash
pnpm test:e2e -g "should export list as compressed data"
```

### Debug Tests

```bash
# Headed mode (see browser)
pnpm test:e2e:headed

# UI mode (Playwright inspector)
pnpm test:e2e:ui

# With debugging
PWDEBUG=1 pnpm test:e2e
```

## Development Workflow

### Red-Green-Refactor Cycle

1. **Red**: Run failing test, understand error
2. **Green**: Implement minimal fix to pass test
3. **Refactor**: Clean up code, maintain quality

### Example: Fixing "should generate share URL" Test

#### Red (Test Failing)

```bash
pnpm test:e2e catalogue-sharing-functionality.e2e.test.ts -g "should generate share URL"
```

**Error**:
```
Error: locator.click: Timeout 30000ms exceeded.
waiting for locator('button:has-text("Share")')
```

**Analysis**: Share button not visible or not rendering

#### Green (Implement Fix)

1. Check `CatalogueManager.tsx` - Share button exists?
```typescript
// File: apps/web/src/components/catalogue/CatalogueManager.tsx

// BEFORE: Button missing or hidden
{selectedList && (
  <Button onClick={handleExport}>Export</Button>
)}

// AFTER: Add Share button
{selectedList && (
  <>
    <Button onClick={handleShare}>Share</Button>
    <Button onClick={handleExport}>Export</Button>
  </>
)}
```

2. Implement `handleShare` function
```typescript
const [showShareModal, setShowShareModal] = useState(false);
const [shareUrl, setShareUrl] = useState("");

const handleShare = async () => {
  if (!selectedList) return;
  const token = await generateShareUrl(selectedList.id);
  setShareUrl(`${window.location.origin}/#/catalogue/shared/${token}`);
  setShowShareModal(true);
};
```

3. Add ShareModal rendering
```typescript
<Modal opened={showShareModal} onClose={() => setShowShareModal(false)}>
  <ShareModal
    shareUrl={shareUrl}
    listTitle={selectedList?.title || ""}
    onClose={() => setShowShareModal(false)}
  />
</Modal>
```

4. Run test again
```bash
pnpm test:e2e catalogue-sharing-functionality.e2e.test.ts -g "should generate share URL"
```

**Result**: ✅ Test passes

#### Refactor (Clean Up)

1. Extract modal state to custom hook
2. Add TypeScript types
3. Add error handling
4. Add loading states

### Common Fix Patterns

#### Pattern 1: Add Missing data-testid

```typescript
// BEFORE
<Button onClick={handleAction}>Action</Button>

// AFTER
<Button data-testid="action-button" onClick={handleAction}>
  Action
</Button>
```

#### Pattern 2: Wire Up Modal State

```typescript
// State
const [showModal, setShowModal] = useState(false);

// Trigger
<Button onClick={() => setShowModal(true)}>Open</Button>

// Modal
<Modal opened={showModal} onClose={() => setShowModal(false)}>
  <ModalContent onClose={() => setShowModal(false)} />
</Modal>
```

#### Pattern 3: Implement Missing Feature

```typescript
// BEFORE
case "json":
  notifications.show({
    title: "Not Implemented",
    message: "JSON export not yet implemented",
    color: "yellow",
  });
  return;

// AFTER
case "json":
  const listData = await storage.getList(listId);
  const entities = await storage.getListEntities(listId);
  data = JSON.stringify({
    list: {
      title: listData.title,
      description: listData.description,
      type: listData.type,
    },
    entities: entities.map(e => ({
      entityType: e.entityType,
      entityId: e.entityId,
      notes: e.notes,
      metadata: e.metadata,
    })),
    version: "1.0",
  }, null, 2);
  break;
```

#### Pattern 4: Add Notification

```typescript
import { notifications } from '@mantine/notifications';

try {
  await storage.removeEntityFromList(listId, entityId);
  notifications.show({
    title: "Entity Removed",
    message: "Entity successfully removed from list",
    color: "green",
  });
} catch (error) {
  logger.error("catalogue-ui", "Failed to remove entity", { error });
  notifications.show({
    title: "Remove Failed",
    message: "Failed to remove entity. Please try again.",
    color: "red",
  });
}
```

## Component Implementation Priority

### Phase 1: Entity Management (P1) - 9 Tests

**Goal**: Fix entity display, removal, notes, reordering, search, bulk operations

1. **Add data-testid attributes** (1 hour)
   - EntityItem: `data-testid="entity-item"`
   - Edit button: `aria-label="Edit notes"`
   - Remove button: `aria-label="Remove entity"`

2. **Implement entity removal confirmation** (30 mins)
   - Confirmation modal with "Are you sure?" text
   - Confirm button that calls storage.removeEntityFromList()

3. **Add drag-and-drop reordering** (2 hours)
   - Install @dnd-kit/core, @dnd-kit/sortable (already installed)
   - Wrap CatalogueEntities with DndContext
   - Make EntityItem sortable with useSortable hook
   - Update entity positions on drag end

4. **Implement entity search** (1 hour)
   - Add TextInput with placeholder "Search entities..."
   - Filter entities by title, type, notes

5. **Add notes editing** (1 hour)
   - Modal with Textarea for notes
   - Save notes via storage.updateEntityNotes()

6. **Implement bulk selection** (2 hours)
   - Add checkbox to EntityItem
   - "Select All" button
   - Bulk remove button
   - Confirmation for bulk operations

7. **Fix empty state display** (15 mins)
   - Show "No entities yet" message when list is empty

### Phase 2: Import/Export (P2) - 9 Tests

**Goal**: Complete export functionality, implement import with validation

1. **Fix export button selectors** (15 mins)
   - Ensure export button has correct text
   - Add data-testid if needed

2. **Implement JSON export** (1 hour)
   - Add case for "json" format
   - Stringify list + entities with proper structure
   - Download as .json file

3. **Complete ImportModal** (3 hours)
   - File upload input
   - Paste textarea
   - URL input
   - Validation logic
   - Preview display
   - Error messages

4. **Add import data validation** (1 hour)
   - Type guards for import data structure
   - Validate required fields
   - Check entity types
   - Display validation errors

5. **Implement import preview** (1 hour)
   - Show list title, entity count
   - Detect duplicates
   - Confirm before import

### Phase 3: Sharing (P3) - 8 Tests

**Goal**: Wire up sharing functionality, handle shared URLs

1. **Add Share button to CatalogueManager** (30 mins)
   - Button visible when list selected
   - Opens ShareModal on click

2. **Wire up generateShareUrl** (30 mins)
   - Call storage.generateShareToken()
   - Construct share URL with token
   - Pass to ShareModal

3. **Fix QR code button selector** (5 mins)
   - Change `data-testid="toggle-qr-code-button"` to `data-testid="qr-code-button"`

4. **Add TanStack Router route** (1 hour)
   - Create route: `/catalogue/shared/$shareToken`
   - SharedListViewer component
   - Display shared list content

5. **Implement import from URL** (1 hour)
   - Extract token from route params
   - Call storage.getListByShareToken()
   - Display list, show "Import This List" button

6. **Handle invalid share tokens** (30 mins)
   - Error handling for getListByShareToken()
   - Display "Not Found" or "Invalid" message

## Testing Best Practices

### 1. Run Tests Serially

E2E tests MUST run serially to prevent out-of-memory errors.

**Playwright Config**:
```typescript
// apps/web/playwright.config.ts
export default defineConfig({
  workers: 1, // Serial execution
  // ...
});
```

### 2. Use InMemoryStorageProvider

Tests use in-memory storage from feature 001, not IndexedDB.

**Setup** (done in `playwright.global-setup.ts`):
```typescript
import { InMemoryStorageProvider } from '@academic-explorer/utils';

// Storage automatically uses InMemoryStorageProvider in E2E tests
// No manual setup needed in individual tests
```

### 3. Clean State Between Tests

Each test should start with clean catalogue state.

**Pattern**:
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:5173/#/catalogue");
  await page.waitForLoadState("networkidle");
  // InMemoryStorageProvider automatically cleared
});
```

### 4. Use Timeouts Wisely

**Default timeout**: 30 seconds
**Storage operations**: Complete in <2 seconds
**Modal animations**: ~300ms

**Pattern**:
```typescript
// Good: Reasonable timeout for async operation
await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

// Bad: Excessive timeout masks real issues
await page.waitForTimeout(10000); // Don't do this
```

### 5. Debug Failing Tests

```bash
# See browser
pnpm test:e2e:headed catalogue-entity-management.e2e.test.ts -g "should remove entities"

# Playwright inspector
pnpm test:e2e:ui

# Console logs
pnpm test:e2e --debug

# Screenshots on failure (automatic)
# See: apps/web/test-results/
```

## Troubleshooting

### Test Hangs or Times Out

**Symptom**: Test runs for 30+ seconds, then times out

**Causes**:
1. Selector not found (element doesn't exist)
2. Modal not opening (state not updated)
3. Storage operation hanging (should use InMemoryStorageProvider)

**Solution**:
1. Verify element exists with correct selector
2. Check component state management
3. Confirm InMemoryStorageProvider is being used

### Test Passes Locally, Fails in CI

**Symptom**: Test passes on your machine, fails in GitHub Actions

**Causes**:
1. Timing differences (CI slower)
2. Browser differences
3. Environment variables

**Solution**:
1. Increase timeouts slightly
2. Use waitForSelector with explicit timeouts
3. Check CI environment configuration

### Import/Export Tests Fail

**Symptom**: Export/import tests fail with "Not Implemented" or validation errors

**Causes**:
1. Export formats not implemented (JSON, CSV, BibTeX)
2. Import validation missing
3. Data structure mismatch

**Solution**:
1. Implement missing export formats (at least JSON)
2. Add validateImportData() function
3. Check data-model.md for expected structure

### Drag-and-Drop Tests Fail

**Symptom**: Reorder tests fail, drag-and-drop doesn't work

**Causes**:
1. @dnd-kit not installed
2. DndContext not wrapping entities
3. EntityItem not using useSortable hook

**Solution**:
1. Verify dependencies: `pnpm list @dnd-kit/core @dnd-kit/sortable`
2. Wrap CatalogueEntities with DndContext
3. Implement useSortable in EntityItem

### Share URL Not Generating

**Symptom**: Share modal doesn't display URL

**Causes**:
1. generateShareUrl not called
2. Storage provider not returning token
3. URL not constructed correctly

**Solution**:
1. Verify handleShare calls generateShareUrl()
2. Check storage.generateShareToken() implementation
3. Construct URL: `${window.location.origin}/#/catalogue/shared/${token}`

## Performance Benchmarks

### Expected Test Times

- **Entity management tests**: ~30 seconds (9 tests)
- **Import/export tests**: ~45 seconds (9 tests)
- **Sharing tests**: ~40 seconds (8 tests)
- **Total catalogue tests**: ~2 minutes (26 tests)

### Storage Operation Times

| Operation | Expected Time |
|-----------|---------------|
| createList() | <50ms |
| addEntityToList() | <50ms |
| removeEntityFromList() | <30ms |
| generateShareToken() | <100ms |
| exportListAsCompressedData() | <200ms |

All operations use InMemoryStorageProvider, which is 100x faster than IndexedDB.

## Next Steps

1. **Read documentation**:
   - [research.md](./research.md) - Technology decisions
   - [data-model.md](./data-model.md) - Entity relationships
   - [contracts/component-contracts.md](./contracts/component-contracts.md) - Component interfaces
   - [contracts/test-selectors.md](./contracts/test-selectors.md) - Complete selector reference

2. **Set up environment**:
   ```bash
   git checkout 002-fix-catalogue-tests
   pnpm install
   cd apps/web && pnpm test:e2e
   ```

3. **Run `/speckit.tasks`** command to generate task breakdown

4. **Start implementation** following Red-Green-Refactor cycle

## Resources

- **Playwright Docs**: https://playwright.dev/docs/intro
- **Mantine UI**: https://mantine.dev/core/introduction/
- **@dnd-kit**: https://docs.dndkit.com/
- **TanStack Router**: https://tanstack.com/router/latest
- **Storage Provider**: `packages/utils/src/storage/catalogue-storage-provider.ts`
- **Test Files**: `apps/web/src/test/e2e/catalogue-*.e2e.test.ts`

## Summary

This quickstart guide provides:
- Commands to run tests and debug failures
- Red-Green-Refactor workflow examples
- Common fix patterns
- Implementation priority by phase
- Troubleshooting guide
- Performance benchmarks

Follow this guide to systematically fix all 27 failing catalogue E2E tests while maintaining code quality and test-first principles.
