# Test Selector Reference

**Date**: 2025-11-11
**Feature**: Fix Catalogue E2E Test Failures
**Branch**: `002-fix-catalogue-tests`

## Overview

Complete reference of all test selectors used in catalogue E2E tests. This document maps test expectations to required component attributes.

## Selector Strategy

**Priority**:
1. `data-testid` attributes (most reliable, test-specific)
2. ARIA labels and roles (accessibility-friendly)
3. Text content matching (fragile but readable)
4. CSS classes (least reliable, implementation-dependent)

## Test Files and Selectors

### catalogue-entity-management.e2e.test.ts

| Test Line | Selector | Component | Purpose |
|-----------|----------|-----------|---------|
| 10 | `'#/catalogue'` | Router | Navigate to catalogue page |
| 13-14 | `'[data-testid="catalogue-manager"], .mantine-Tabs-panel'` | CatalogueManager | Wait for page load |
| 27 | `'[data-testid="add-to-catalogue-button"]'` | Entity page button | Add to catalogue button |
| 34 | `'[role="dialog"]'` | Modal | Any modal container |
| 37 | `'[data-testid="add-to-list-select"]'` | AddToListModal | List selection dropdown |
| 40 | `'[role="option"]:has-text("Entity Test List")'` | Select option | Specific list option |
| 43 | `'[data-testid="add-to-list-submit"]'` | AddToListModal | Submit button |
| 46 | `'text="Added to List"'` | Notification | Success notification |
| 56 | `'[data-testid^="list-card-"]'` | CatalogueList | List card (any) |
| 59 | `'[data-testid="selected-list-details"]'` | CatalogueManager | Selected list details section |
| 79 | `'text="Mixed Entities List"'` | Text match | List title in UI |
| 82-87 | `'text="Authors"`, `text="Works"`, `text="Sources"`, `text="Total"` | Stats display | Entity count by type |
| 101 | `'[data-testid="entity-item"], .entity-card'` | EntityItem | Entity card elements |
| 104-106 | `'.entity-card', 'button:has-text("Remove"), [aria-label*="remove"]'` | EntityItem | Remove button |
| 109 | `'text="Are you sure"'` | Confirmation modal | Remove confirmation |
| 110 | `'button:has-text("Remove"), button:has-text("Confirm")'` | Confirmation modal | Confirm button |
| 128-141 | `'[data-testid="entity-item"]'`, `.entity-card` | EntityItem | Drag-and-drop entities |
| 162 | `'input[placeholder*="Search entities"], input[aria-label*="search"]'` | CatalogueEntities | Search input |
| 183-189 | `'[data-testid="entity-item"]', 'button:has-text("Edit"), [aria-label*="edit"]'` | EntityItem | Edit notes button |
| 192-198 | `'textarea[placeholder*="notes"], input[placeholder*="notes"]'` | Edit modal | Notes input |
| 214 | `'text="No entities yet", text="Add entities to get started"'` | Empty state | Empty list message |
| 229 | `'button:has-text("Select All"), input[type="checkbox"]:first-child'` | CatalogueEntities | Select all button |
| 234 | `'button:has-text("Remove Selected"), button:has-text("Bulk Remove")'` | CatalogueEntities | Bulk remove button |
| 262 | `'text="Author", text="A5017898742"'` | EntityItem | Entity type and ID |
| 269 | `'button:has-text("Create New List")'` | CatalogueManager | Create list button |
| 272 | `'input:below(:text("Title"))'` | CreateListModal | Title input |
| 273 | `'textarea:below(:text("Description"))'` | CreateListModal | Description textarea |
| 275 | `'button:has-text("Create List")'` | CreateListModal | Submit button |
| 279 | `'[data-testid="selected-list-title"]:has-text("...'` | CatalogueManager | Selected list title |

### catalogue-import-export.e2e.test.ts

| Test Line | Selector | Component | Purpose |
|-----------|----------|-----------|---------|
| 10 | `'#/catalogue'` | Router | Navigate to catalogue page |
| 13-14 | `'[data-testid="catalogue-manager"], .mantine-Tabs-panel'` | CatalogueManager | Wait for page load |
| 23 | `'[data-testid="selected-list-title"]:has-text("Export Test List")'` | CatalogueManager | Select list by title |
| 26 | `'button:has-text("Export"), [aria-label*="export"]'` | CatalogueManager | Export button |
| 31 | `'[role="dialog"]'` | ExportModal | Export modal |
| 32 | `'h2:has-text("Export List")'` | ExportModal | Modal title |
| 35 | `'input[value="compressed"], label:has-text("Compressed Data")'` | ExportModal | Compressed format radio |
| 38 | `'button:has-text("Export"), button:has-text("Download")'` | ExportModal | Export button |
| 41 | `'text="Export successful", text="Downloaded"'` | Notification | Success message |
| 61 | `'input[value="${format.toLowerCase()}"], label:has-text("${format}")'` | ExportModal | Format radio options |
| 84-95 | Direct storage access via `window.catalogueService` | Test helper | Clear test data |
| 103 | `'button:has-text("Import"), [aria-label*="import"]'` | CatalogueManager | Import button |
| 106 | `'[role="dialog"]'` | ImportModal | Import modal |
| 107 | `'h2:has-text("Import List")'` | ImportModal | Modal title |
| 110 | `'textarea[placeholder*="paste"], input[placeholder*="data"]'` | ImportModal | Paste data input |
| 113 | `'button:has-text("Import"), button:has-text("Confirm")'` | ImportModal | Import button |
| 116 | `'text="Import successful", text="Imported"'` | Notification | Success message |
| 132 | `'text="Invalid", text="Error"'` | ImportModal | Validation error |
| 149 | `'input[type="file"], [data-testid="import-file-input"]'` | ImportModal | File upload input |

### catalogue-sharing-functionality.e2e.test.ts

| Test Line | Selector | Component | Purpose |
|-----------|----------|-----------|---------|
| 10 | `'#/catalogue'` | Router | Navigate to catalogue page |
| 13-14 | `'[data-testid="catalogue-manager"], .mantine-Tabs-panel'` | CatalogueManager | Wait for page load |
| 23 | `'[data-testid="selected-list-title"]:has-text("Shareable Test List")'` | CatalogueManager | Select list by title |
| 26-27 | `'button:has-text("Share")'` | CatalogueManager | Share button |
| 30 | `'[role="dialog"]'` | ShareModal | Share modal |
| 31 | `'h2:has-text("Share List")'` | ShareModal | Modal title |
| 32 | `'text="Share this list"'` | ShareModal | Modal description |
| 44 | `'input[value*="catalogue/shared/"]'` | ShareModal | Share URL input |
| 45 | `'text="Share URL"'` | ShareModal | URL label |
| 48 | Read input value | ShareModal | Get share URL |
| 50-51 | URL validation | Test assertion | Check URL format |
| 64 | `'[data-testid="copy-share-url-button"]'` | ShareModal | Copy button |
| 67 | `'text="Copied!", text="URL copied to clipboard"'` | Notification | Copy success |
| 80 | `'[data-testid="qr-code-button"]'` | ShareModal | QR code toggle button |
| 83 | `'img[alt*="QR"], img[src*="data:image"]'` | ShareModal | QR code image |
| 84 | `'text="QR Code"'` | ShareModal | QR code label |
| 97 | Read input value | ShareModal | Get share URL |
| 101 | `'button:has-text("Close"), button:has-text("Done")'` | ShareModal | Close button |
| 115 | Navigate to share URL | Router | Access shared list |
| 119 | `'[data-testid="shared-list-viewer"]'` | SharedListViewer | Shared list container |
| 122 | `'button:has-text("Import This List")'` | SharedListViewer | Import button |
| 131 | Navigate to URL with query params | Router | URL parameter import |
| 134 | `'[role="dialog"]'` | Import confirmation | Import modal/notification |
| 137 | `'button:has-text("Import"), button:has-text("Confirm")'` | Import modal | Confirm import |
| 169 | Navigate to invalid URL | Router | Invalid share token |
| 172 | `'text="Not Found", text="Invalid"'` | Error message | Invalid token error |

## Required data-testid Attributes

### CatalogueManager

```typescript
<div data-testid="catalogue-manager">
  <Button data-testid="create-list-button">Create New List</Button>
  <Button data-testid="import-button">Import</Button>
  <Button data-testid="export-button">Export</Button>
  <Button data-testid="share-button">Share</Button>
  <div data-testid="selected-list-title">{selectedList?.title}</div>
  <div data-testid="selected-list-details">...</div>
</div>
```

### CatalogueList

```typescript
<Card data-testid={`list-card-${list.id}`}>
  {list.title}
</Card>
```

### CatalogueEntities

```typescript
<div data-testid="entities-list">
  <TextInput
    placeholder="Search entities..."
    data-testid="entity-search-input"
  />
  <Button data-testid="select-all-button">Select All</Button>
  <Button data-testid="bulk-remove-button">Remove Selected</Button>
</div>
```

### EntityItem

```typescript
<Card data-testid="entity-item" className="entity-card">
  <Badge>{entityType}</Badge>
  <Button data-testid={`edit-notes-${entity.id}`} aria-label="Edit notes">Edit</Button>
  <Button data-testid={`remove-entity-${entity.id}`} aria-label="Remove entity">Remove</Button>
</Card>
```

### ShareModal

```typescript
<Modal opened={opened} onClose={onClose}>
  <Title order={2}>Share List</Title>
  <TextInput
    value={shareUrl}
    readOnly
    data-testid="share-url-input"
  />
  <Button data-testid="copy-share-url-button">Copy</Button>
  <Button data-testid="qr-code-button">Show QR Code</Button>
  {showQR && <img src={qrCodeUrl} alt="QR Code for sharing" data-testid="share-qr-code" />}
</Modal>
```

### ExportModal

```typescript
<Modal opened={opened} onClose={onClose}>
  <Title order={2}>Export List</Title>
  <Radio.Group value={format} onChange={setFormat}>
    <Radio value="compressed" label="Compressed Data" />
    <Radio value="json" label="JSON" />
    <Radio value="csv" label="CSV" />
    <Radio value="bibtex" label="BibTeX" />
  </Radio.Group>
  <Button data-testid="export-list-button">Export</Button>
</Modal>
```

### ImportModal

```typescript
<Modal opened={opened} onClose={onClose}>
  <Title order={2}>Import List</Title>
  <Textarea
    placeholder="Paste exported data here..."
    data-testid="import-data-textarea"
  />
  <FileInput
    accept=".json,.txt"
    data-testid="import-file-input"
  />
  {validationErrors.length > 0 && (
    <Alert data-testid="validation-error">
      {validationErrors.join(', ')}
    </Alert>
  )}
  {previewData && (
    <div data-testid="import-preview">
      <Text>List: {previewData.list.title}</Text>
      <Text>Entities: {previewData.entities.length}</Text>
    </div>
  )}
  <Button data-testid="import-submit-button">Import</Button>
</Modal>
```

### CreateListModal

```typescript
<Modal opened={opened} onClose={onClose}>
  <Title order={2}>Create New List</Title>
  <TextInput
    label="Title"
    required
    data-testid="list-title-input"
  />
  <Textarea
    label="Description"
    data-testid="list-description-textarea"
  />
  <Select
    label="Type"
    data={['list', 'bibliography']}
    data-testid="list-type-select"
  />
  <Button data-testid="create-list-submit">Create List</Button>
</Modal>
```

### AddToListModal

```typescript
<Modal opened={opened} onClose={onClose}>
  <Title order={2}>Add to Catalogue</Title>
  <Select
    label="Select List"
    data={lists.map(l => ({ value: l.id, label: l.title }))}
    data-testid="add-to-list-select"
  />
  <Button data-testid="add-to-list-submit">Add to List</Button>
</Modal>
```

## Test Helper Patterns

### Common Navigation

```typescript
await page.goto("http://localhost:5173/#/catalogue");
await page.waitForLoadState("networkidle");
await Promise.race([
  page.waitForSelector('[data-testid="catalogue-manager"]', { timeout: 10000 }),
  page.waitForSelector('.mantine-Tabs-panel', { timeout: 10000 })
]);
```

### Modal Interaction

```typescript
// Open modal
await page.click('[data-testid="share-button"]');
await expect(page.locator('[role="dialog"]')).toBeVisible();

// Interact with modal
await page.fill('[data-testid="input"]', 'value');
await page.click('[data-testid="submit-button"]');

// Wait for modal to close
await expect(page.locator('[role="dialog"]')).not.toBeVisible();
```

### Entity Selection

```typescript
// Select entity card
const entity = page.locator('[data-testid="entity-item"]').first();
await entity.hover();
await entity.locator('button:has-text("Remove")').click();

// Confirm action
await expect(page.locator('text="Are you sure"')).toBeVisible();
await page.click('button:has-text("Confirm")');
```

### Notification Assertions

```typescript
// Success notification
await expect(page.locator('text="Success"')).toBeVisible({ timeout: 10000 });

// Error notification
await expect(page.locator('text="Error"')).toBeVisible({ timeout: 5000 });
```

## Selector Priority by Component

### High Priority (Test Failures)

1. **ShareModal**: `data-testid="qr-code-button"` (currently using `data-testid="toggle-qr-code-button"`)
2. **ExportModal**: Export button text matching
3. **ImportModal**: All selectors (component incomplete)
4. **EntityItem**: `data-testid="entity-item"` for all cards
5. **CatalogueEntities**: Search input, bulk action buttons

### Medium Priority (Selector Improvements)

1. **CatalogueManager**: Consistent button data-testids
2. **AddToListModal**: Selector consistency
3. **CreateListModal**: data-testid for all inputs

### Low Priority (Working, but could be better)

1. Text-based selectors (fragile but passing)
2. ARIA label selectors (good accessibility, but tests use text matching)

## Accessibility Notes

While tests primarily use text matching and data-testids, all interactive elements should include:

1. **ARIA labels**: Especially for icon-only buttons
2. **Roles**: Proper semantic HTML (button, dialog, etc.)
3. **Keyboard navigation**: Tab order, Enter/Space activation
4. **Screen reader text**: For complex interactions

Example:
```typescript
<Button
  onClick={handleRemove}
  data-testid="remove-entity-button"
  aria-label="Remove entity from list"
>
  <IconTrash size={16} />
</Button>
```

## Summary

This reference provides:
- Complete selector mapping from tests to components
- Required data-testid attributes for each component
- Common test patterns for navigation and interaction
- Priority guide for fixing selector mismatches

All selectors extracted from:
- `apps/web/src/test/e2e/catalogue-entity-management.e2e.test.ts`
- `apps/web/src/test/e2e/catalogue-import-export.e2e.test.ts`
- `apps/web/src/test/e2e/catalogue-sharing-functionality.e2e.test.ts`

Implementation should match these selectors exactly to ensure tests pass.
