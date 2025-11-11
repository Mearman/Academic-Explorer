# Research: Fix Catalogue E2E Test Failures

**Date**: 2025-11-11
**Feature**: Fix Catalogue E2E Test Failures
**Branch**: `002-fix-catalogue-tests`

## Overview

Research findings for implementing missing catalogue functionality identified by failing E2E tests. Tests reveal that basic UI components exist but lack complete feature implementations and proper test selectors.

## Test Failure Analysis

### Entity Management Tests (9 failures)

**Current State**: Tests expect UI components with specific data-testid attributes and ARIA labels that don't exist or don't match.

**Failing Test Patterns**:
1. `apps/web/src/test/e2e/catalogue-entity-management.e2e.test.ts:64-88` - Display different entity types correctly
2. `apps/web/src/test/e2e/catalogue-entity-management.e2e.test.ts:90-115` - Remove entities from lists
3. `apps/web/src/test/e2e/catalogue-entity-management.e2e.test.ts:117-149` - Reorder entities via drag and drop
4. `apps/web/src/test/e2e/catalogue-entity-management.e2e.test.ts:151-170` - Search and filter entities within a list
5. `apps/web/src/test/e2e/catalogue-entity-management.e2e.test.ts:172-201` - Add notes to entities
6. `apps/web/src/test/e2e/catalogue-entity-management.e2e.test.ts:203-216` - Handle empty lists gracefully
7. `apps/web/src/test/e2e/catalogue-entity-management.e2e.test.ts:218-246` - Support bulk entity operations
8. `apps/web/src/test/e2e/catalogue-entity-management.e2e.test.ts:248-263` - Display entity metadata correctly

**Root Cause**: Missing UI elements, incorrect selectors, incomplete drag-and-drop implementation.

### Import/Export Tests (9 failures)

**Current State**:
- `ExportModal.tsx` exists with compressed data export implementation
- Only compressed format works; JSON, CSV, BibTeX marked as TODO
- Import functionality incomplete

**Failing Test Patterns**:
1. `apps/web/src/test/e2e/catalogue-import-export.e2e.test.ts:18-43` - Export list as compressed data
2. `apps/web/src/test/e2e/catalogue-import-export.e2e.test.ts:45-74` - Export list in different formats
3. `apps/web/src/test/e2e/catalogue-import-export.e2e.test.ts:76-118` - Import list from compressed data
4. `apps/web/src/test/e2e/catalogue-import-export.e2e.test.ts:120-144` - Validate import data
5. `apps/web/src/test/e2e/catalogue-import-export.e2e.test.ts:146-175` - Import from file upload
6. `apps/web/src/test/e2e/catalogue-import-export.e2e.test.ts:177-213` - Handle large dataset imports

**Root Cause**: Export modal missing button/selector matches, import modal incomplete implementation, no validation UI.

### Sharing Tests (8 failures)

**Current State**:
- `ShareModal.tsx` exists with QR code generation (qrcode library)
- Missing integration with CatalogueManager
- Share URL generation not wired up correctly

**Failing Test Patterns**:
1. `apps/web/src/test/e2e/catalogue-sharing-functionality.e2e.test.ts:18-33` - Open share modal for a list
2. `apps/web/src/test/e2e/catalogue-sharing-functionality.e2e.test.ts:35-52` - Generate share URL
3. `apps/web/src/test/e2e/catalogue-sharing-functionality.e2e.test.ts:54-68` - Copy share URL to clipboard
4. `apps/web/src/test/e2e/catalogue-sharing-functionality.e2e.test.ts:70-85` - Display QR code for sharing
5. `apps/web/src/test/e2e/catalogue-sharing-functionality.e2e.test.ts:87-125` - Import list from shared URL
6. `apps/web/src/test/e2e/catalogue-sharing-functionality.e2e.test.ts:127-161` - Import list from URL parameters
7. `apps/web/src/test/e2e/catalogue-sharing-functionality.e2e.test.ts:163-185` - Handle invalid shared URLs
8. `apps/web/src/test/e2e/catalogue-sharing-functionality.e2e.test.ts:187-218` - Share bibliography as well as lists

**Root Cause**: Share button not visible/connected, URL generation not calling storage provider, test selector mismatches.

## Technology Research

### 1. React DnD (@dnd-kit/core) for Entity Reordering

**Decision**: Use existing `@dnd-kit/core` package (v6.3.1) and `@dnd-kit/sortable` (v10.0.0)

**Rationale**:
- Already installed in package.json
- Modern, performant drag-and-drop library
- React 19 compatible
- Better accessibility than react-dnd
- Type-safe with TypeScript

**Implementation Pattern**:
```typescript
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';

// Wrap entity list with DndContext + SortableContext
// Each EntityItem uses useSortable hook
// onDragEnd handler calls storage provider updateEntityOrder()
```

**Alternatives Considered**:
- `react-beautiful-dnd`: No longer maintained, React 18+ incompatible
- `react-dnd`: More complex API, larger bundle size
- HTML5 native drag-and-drop: Poor accessibility, browser inconsistencies

**References**:
- [dnd-kit Documentation](https://docs.dndkit.com/)
- [Sortable List Example](https://docs.dndkit.com/presets/sortable)

### 2. QR Code Generation (qrcode library)

**Decision**: Use existing `qrcode` package (v1.5.4)

**Rationale**:
- Already installed and used in ShareModal.tsx
- Small bundle size (~10KB gzipped)
- Works correctly in current implementation
- No changes needed

**Current Implementation**: ShareModal.tsx lines 36-59 - generates data URL, displays as img element

**Alternatives Considered**: None - existing implementation works correctly.

### 3. Export Formats (JSON, CSV, BibTeX)

**Decision**: Implement JSON export first (P2), defer CSV and BibTeX to future work

**Rationale**:
- Tests primarily focus on compressed data export (P2)
- JSON export straightforward: `JSON.stringify(listData)`
- CSV requires entity type-specific formatting logic
- BibTeX only applies to works, needs bibliography conversion
- Success criteria don't mandate all formats

**Implementation Pattern**:
```typescript
// ExportModal.tsx - Add JSON case
case "json":
  const listData = await storage.getList(listId);
  const entities = await storage.getListEntities(listId);
  data = JSON.stringify({ list: listData, entities }, null, 2);
  break;
```

**Alternatives Considered**:
- Implement all formats: Too much scope for initial pass
- Remove format options: Would break test expectations

### 4. Import Validation and Error Handling

**Decision**: Use JSON Schema validation for import data structure

**Rationale**:
- Type-safe validation matches TypeScript types
- Clear error messages for users
- Prevents corrupted data from entering storage
- Lightweight validation without external library

**Implementation Pattern**:
```typescript
function validateImportData(data: unknown): data is ImportedListData {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  return (
    typeof obj.list === 'object' &&
    typeof obj.list.title === 'string' &&
    Array.isArray(obj.entities)
  );
}
```

**Alternatives Considered**:
- Zod library: Adds bundle size, YAGNI for this feature
- No validation: Risks storage corruption, poor UX

### 5. Compressed Data Format (LZ-String or Base64)

**Decision**: Use built-in browser APIs (TextEncoder + Compression Streams API or Base64)

**Rationale**:
- Existing compressed export already implemented (ExportModal.tsx line 41)
- Tests expect compressed data, not specific algorithm
- Browser Compression Streams API supported in all modern browsers
- Zero dependencies

**Current Implementation**: Review `useCatalogue.ts` for `exportListAsCompressedData()` method

**Alternatives Considered**:
- lz-string library: Extra dependency, likely unnecessary
- No compression: Test explicitly requires "compressed data"

### 6. Entity Search and Filtering

**Decision**: Client-side filtering using string matching on entity metadata

**Rationale**:
- Catalogue lists expected to be <1000 entities
- No backend search infrastructure
- Fast enough for user experience (<50ms for 1000 entities)
- Storage provider interface doesn't include search

**Implementation Pattern**:
```typescript
const filteredEntities = entities.filter(entity => {
  const searchLower = searchQuery.toLowerCase();
  return (
    entity.metadata.title?.toLowerCase().includes(searchLower) ||
    entity.entityType.toLowerCase().includes(searchLower) ||
    entity.notes?.toLowerCase().includes(searchLower)
  );
});
```

**Alternatives Considered**:
- Fuse.js fuzzy search: Overkill for current scale
- Backend search: Out of scope, no API changes allowed

### 7. Share URL Structure and Routing

**Decision**: Use hash-based routing pattern: `/#/catalogue/shared/{shareToken}`

**Rationale**:
- TanStack Router already uses hash routing in dev
- Share tokens from `storage.generateShareToken(listId)`
- Matches test expectations (catalogue-sharing-functionality.e2e.test.ts:44)
- No backend routing changes needed

**Implementation Pattern**:
```typescript
// Route definition in TanStack Router
const sharedListRoute = createRoute({
  path: '/catalogue/shared/$shareToken',
  component: SharedListViewer,
});

// ShareModal generates URL
const shareUrl = `${window.location.origin}/#/catalogue/shared/${shareToken}`;
```

**Alternatives Considered**:
- Query parameters: Less clean URLs, harder to parse
- Custom domain: Out of scope for E2E tests

### 8. Bulk Operations (Select Multiple Entities)

**Decision**: Implement checkbox-based multi-select with bulk action buttons

**Rationale**:
- Standard UX pattern (Gmail, file managers)
- Mantine Checkbox component supports indeterminate state
- Tests expect "Select All" button and bulk remove
- Accessible via keyboard (Space to toggle checkboxes)

**Implementation Pattern**:
```typescript
const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set());

// Select all
const handleSelectAll = () => {
  setSelectedEntityIds(new Set(entities.map(e => e.id)));
};

// Bulk remove
const handleBulkRemove = async () => {
  for (const entityId of selectedEntityIds) {
    await storage.removeEntityFromList(listId, entityId);
  }
  setSelectedEntityIds(new Set());
};
```

**Alternatives Considered**:
- Drag-to-select: Complex interaction, poor accessibility
- Context menu: Not expected by tests

### 9. Entity Notes Editing

**Decision**: Inline editing with Textarea or Modal with Textarea

**Rationale**:
- Tests expect edit button that opens notes input
- Mantine Textarea component supports multiline
- Storage provider already has `updateEntityNotes()` method
- Modal approach prevents layout shift

**Implementation Pattern**:
```typescript
// Edit notes modal
<Modal opened={editingEntityId !== null} onClose={() => setEditingEntityId(null)}>
  <Textarea
    label="Notes"
    placeholder="Add notes about this entity..."
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    minRows={4}
  />
  <Button onClick={handleSaveNotes}>Save</Button>
</Modal>
```

**Alternatives Considered**:
- Inline editing: Can cause layout issues with long notes
- Rich text editor: YAGNI, tests expect plain textarea

## Best Practices

### Playwright E2E Test Selectors

**Guideline**: Use `data-testid` attributes for all interactive elements

**Rationale**:
- Test-specific selectors don't break when UI text changes
- Clearer intent than CSS classes or text matching
- Mantine components support `data-testid` prop

**Pattern**:
```typescript
<Button data-testid="share-list-button" onClick={handleShare}>
  Share
</Button>

// Test
await page.click('[data-testid="share-list-button"]');
```

**Applied to**:
- All modal open/close buttons
- Form submit buttons
- Entity action buttons (remove, edit, reorder)
- List selection elements

### React State Management for Modals

**Guideline**: Use local component state for modal open/closed, not global store

**Rationale**:
- Modals are UI-only state, not business logic
- Reduces global state complexity
- Easier to test individual components
- Follows React best practices

**Pattern**:
```typescript
const [showShareModal, setShowShareModal] = useState(false);
const [shareUrl, setShareUrl] = useState<string>("");

const handleShare = async () => {
  const token = await storage.generateShareToken(listId);
  setShareUrl(`${window.location.origin}/#/catalogue/shared/${token}`);
  setShowShareModal(true);
};
```

### TypeScript Type Guards for Import Validation

**Guideline**: Use type predicates for runtime validation of imported data

**Rationale**:
- Ensures type safety after parsing JSON
- Clear error messages for invalid data
- Prevents `any` types from validation functions

**Pattern**:
```typescript
interface ImportedListData {
  list: { title: string; description?: string; type: 'list' | 'bibliography' };
  entities: Array<{ entityType: string; entityId: string; notes?: string }>;
}

function isImportedListData(data: unknown): data is ImportedListData {
  // Validation logic
}

// Usage
const parsed = JSON.parse(importedJson);
if (!isImportedListData(parsed)) {
  throw new Error("Invalid import data structure");
}
// TypeScript knows parsed is ImportedListData here
```

### Error Boundary for Storage Operations

**Guideline**: Wrap storage operations in try-catch, show user-friendly notifications

**Rationale**:
- Storage operations can fail (IndexedDB quota, network for API calls)
- Users need clear feedback when operations fail
- Prevents unhandled promise rejections

**Pattern**:
```typescript
try {
  await storage.removeEntityFromList(listId, entityId);
  notifications.show({
    title: "Entity Removed",
    message: "Entity removed from list",
    color: "green",
  });
} catch (error) {
  logger.error("catalogue-ui", "Failed to remove entity", { error, listId, entityId });
  notifications.show({
    title: "Remove Failed",
    message: "Failed to remove entity. Please try again.",
    color: "red",
  });
}
```

## Implementation Priority

Based on test failures and user story priorities from spec.md:

### Priority 1: Entity Management (P1)
1. Add missing `data-testid` attributes to EntityItem, CatalogueEntities components
2. Implement entity removal confirmation modal
3. Add drag-and-drop reordering with @dnd-kit
4. Implement entity search/filter input
5. Add notes editing modal
6. Implement bulk selection and bulk remove
7. Fix empty state display

### Priority 2: Import/Export (P2)
1. Fix export modal button selectors
2. Implement JSON export format
3. Complete import modal with file upload
4. Add import data validation with error messages
5. Display import preview before confirmation
6. Add duplicate detection UI

### Priority 3: Sharing (P3)
1. Wire up Share button in CatalogueManager
2. Connect generateShareUrl to storage provider
3. Add TanStack Router route for shared lists
4. Fix QR code button test selector mismatch
5. Implement import from URL parameters
6. Add error handling for invalid share tokens
7. Test bibliography sharing flow

## Risks and Mitigations

### Risk 1: Drag-and-Drop Performance with Large Lists

**Risk**: Dragging entities in lists with 500+ items may lag

**Mitigation**:
- Use React.memo on EntityItem components
- Implement virtualization with @tanstack/react-virtual if needed
- Tests focus on small lists (2-5 entities), so not critical for passing tests

### Risk 2: Import Data Validation Edge Cases

**Risk**: Malformed JSON or unexpected data structures could crash import

**Mitigation**:
- Comprehensive type guards with explicit checks
- Try-catch around JSON.parse()
- Show clear error messages for each validation failure type
- Unit tests for validation functions with edge cases

### Risk 3: Share URL Expiration Not Implemented

**Risk**: Tests may expect share URL validation, but spec says "indefinitely valid"

**Mitigation**:
- Storage provider interface has no expiration in shareToken generation
- Tests don't check expiration behavior
- Document in quickstart.md that URLs never expire

### Risk 4: Test Selector Brittleness

**Risk**: Tests use multiple selector strategies (text, ARIA, data-testid), may break easily

**Mitigation**:
- Prioritize data-testid attributes for all interactive elements
- Update tests if selectors are overly specific
- Document selector strategy in contracts/

## Open Questions

None. All technical decisions resolved through research. Ready to proceed to Phase 1 (data-model.md, contracts/).

## References

- [dnd-kit Documentation](https://docs.dndkit.com/)
- [Mantine UI Components](https://mantine.dev/core/introduction/)
- [TanStack Router](https://tanstack.com/router/latest)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [TypeScript Type Guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)
- Academic Explorer Constitution (.specify/memory/constitution.md)
- Feature Specification (specs/002-fix-catalogue-tests/spec.md)
