# Developer Quickstart: Fix Failing Catalogue E2E Tests

**Feature**: 004-fix-failing-tests
**Created**: 2025-11-11
**Branch**: `004-fix-failing-tests`

## Overview

This guide helps developers quickly understand and fix the 27 failing catalogue E2E tests. The tests define expected behavior - your job is to make the implementation match the tests.

## Prerequisites

- Node.js 18+ with pnpm installed
- Repository cloned and on branch `004-fix-failing-tests`
- All dependencies installed: `pnpm install`
- TypeScript compilation fix complete (feature 003)

## Quick Start

### 1. Run Failing Tests

```bash
# Navigate to web app
cd apps/web

# Run all catalogue E2E tests (27 will fail)
pnpm test:e2e

# Run specific test file in isolation
pnpm test:e2e catalogue-entity-management.e2e.test.ts

# Run with Playwright UI for debugging
pnpm test:e2e catalogue-entity-management.e2e.test.ts --headed

# Run single test by name
pnpm test:e2e -g "should add entities from entity pages"
```

### 2. Analyze Failure

When a test fails, Playwright provides:

- **Console output**: Error messages and stack traces
- **Screenshots**: Visual state at failure point
- **Trace files**: Full execution trace in `test-results/`
- **DOM snapshots**: HTML state at failure

**View trace**:
```bash
# Open trace viewer
npx playwright show-trace test-results/<test-name>/trace.zip
```

### 3. Fix Implementation

**DO NOT modify tests** - fix the implementation to match test expectations.

Example workflow for "should add entities from entity pages" test:

1. **Read test code** in `catalogue-entity-management.e2e.test.ts:64`
2. **Identify expected behavior**: Click "Add to Catalogue" → entity appears in list
3. **Find component**: `apps/web/src/components/catalogue/AddToCatalogueButton.tsx`
4. **Check hook**: `apps/web/src/hooks/useCatalogue.ts`
5. **Fix bug**: Implement `addEntity` method or fix existing logic
6. **Re-run test**: `pnpm test:e2e -g "should add entities from entity pages"`
7. **Verify pass**: Test should turn green

### 4. Run Full Suite

After fixing a batch of tests:

```bash
# Run all E2E tests to check for regressions
pnpm test:e2e

# Check TypeScript compilation
pnpm typecheck

# Run full validation pipeline
pnpm verify
```

## Test Organization

### Failing Tests by Priority

**P1: Entity Management** (Tests 64-72, 9 failing)
- File: `catalogue-entity-management.e2e.test.ts`
- Features: Add, remove, reorder, search, notes, bulk ops, metadata display

**P2: Import/Export** (Tests 73-81, 9 failing)
- File: `catalogue-import-export.e2e.test.ts`
- Features: Compressed export, import from file/data, validation, preview, duplicates

**P3: Sharing** (Tests 89-97, 9 failing)
- File: `catalogue-sharing-functionality.e2e.test.ts`
- Features: Share URLs, QR codes, clipboard copy, import from share

**P3: UI Components** (Test 87, 1 failing)
- File: Part of catalogue test suite
- Feature: Mantine components with proper ARIA attributes

## Key Files to Modify

### Components (Fix targets)

```
apps/web/src/components/catalogue/
├── AddToCatalogueButton.tsx   ← Fix "add entity" functionality
├── AddToListModal.tsx          ← Fix list selection modal
├── CatalogueEntities.tsx       ← Fix entity display, reorder, notes
├── CatalogueList.tsx           ← Fix list view rendering
├── CatalogueManager.tsx        ← Fix main catalogue UI
├── ExportModal.tsx             ← Fix export functionality
├── ImportModal.tsx             ← Fix import functionality
└── ShareModal.tsx              ← Fix sharing functionality
```

### Hook (Core logic)

```
apps/web/src/hooks/useCatalogue.ts  ← Implement hook methods per contract
```

### Tests (Do NOT modify)

```
apps/web/src/test/e2e/
├── catalogue-entity-management.e2e.test.ts    ← P1 tests
├── catalogue-import-export.e2e.test.ts        ← P2 tests
└── catalogue-sharing-functionality.e2e.test.ts ← P3 tests
```

## Implementation Contracts

All implementation must satisfy the contracts in `specs/004-fix-failing-tests/contracts/`:

- **`types.ts`**: Core type definitions, validation, type guards
- **`useCatalogue.interface.ts`**: Hook API surface
- **`README.md`**: Contract usage guide

Example: Implementing `addEntity`:

```typescript
// apps/web/src/hooks/useCatalogue.ts
import type { UseCatalogueReturn } from '../../specs/004-fix-failing-tests/contracts/useCatalogue.interface';
import type { EntityType, EntityMetadata } from '../../specs/004-fix-failing-tests/contracts/types';

export function useCatalogue(): UseCatalogueReturn {
  // ... state setup

  const addEntity: UseCatalogueReturn['addEntity'] = async (
    listId,
    entityId,
    entityType,
    metadata,
    note
  ) => {
    // Check for duplicates
    const existing = await db.catalogueEntities.get(`${listId}:${entityId}`);
    if (existing) {
      throw new Error('Entity already in list');
    }

    // Get next position
    const maxPosition = await db.catalogueEntities
      .where('listId')
      .equals(listId)
      .sortBy('position')
      .then(entities => entities[entities.length - 1]?.position ?? -1);

    // Add entity
    await db.catalogueEntities.add({
      id: `${listId}:${entityId}`,
      listId,
      entityId,
      entityType,
      position: maxPosition + 1,
      note,
      addedAt: new Date().toISOString(),
      metadata,
    });

    // Update list count
    await updateListEntityCount(listId);

    // Refresh state
    await refreshEntities();
  };

  return {
    // ... other properties
    addEntity,
    // ... other methods
  };
}
```

## Common Fix Patterns

### Pattern 1: Missing Implementation

**Symptom**: Test fails with "element not found" or "expected function to be called"

**Fix**: Implement the missing feature completely

Example:
```typescript
// Before: Drag-and-drop not implemented
<div>{entity.displayName}</div>

// After: Implement with @dnd-kit
import { useSortable } from '@dnd-kit/sortable';

const { attributes, listeners, setNodeRef, transform } = useSortable({ id: entity.id });
<div ref={setNodeRef} {...attributes} {...listeners}>
  {entity.displayName}
</div>
```

### Pattern 2: Logic Error

**Symptom**: Test fails with wrong data displayed or incorrect behavior

**Fix**: Debug and correct the logic bug

Example:
```typescript
// Before: Wrong entity type badge color
<Badge color="blue">{entity.type}</Badge>

// After: Use correct color mapping
import { ENTITY_TYPE_COLORS } from './contracts/types';
<Badge color={ENTITY_TYPE_COLORS[entity.type]}>{entity.type}</Badge>
```

### Pattern 3: Timing Issue

**Symptom**: Test fails intermittently or with "timeout exceeded"

**Fix**: Add proper async/await handling

Example:
```typescript
// Before: Not awaiting storage operation
const handleAdd = () => {
  addEntity(listId, entityId, entityType, metadata);
  onClose(); // Closes before add completes!
};

// After: Wait for completion
const handleAdd = async () => {
  await addEntity(listId, entityId, entityType, metadata);
  onClose(); // Closes after add completes
};
```

### Pattern 4: Data Integrity

**Symptom**: Export/import test fails with data mismatch

**Fix**: Ensure serialization preserves all data

Example:
```typescript
// Before: Missing fields in export
const exportData = {
  entities: entities.map(e => ({ id: e.id }))
};

// After: Include all required fields
const exportData: ExportFormat = {
  version: '1.0',
  exportedAt: new Date().toISOString(),
  listMetadata: { /* ... */ },
  entities: entities.map(e => ({
    entityId: e.entityId,
    type: e.entityType,
    position: e.position,
    note: e.note,
    addedAt: e.addedAt,
    metadata: e.metadata,
  })),
};
```

## Debugging Tips

### 1. Use Playwright Inspector

```bash
# Run with debugger
PWDEBUG=1 pnpm test:e2e catalogue-entity-management.e2e.test.ts
```

### 2. Add Console Logs

Tests capture console output - use it:

```typescript
console.log('Adding entity:', entityId, 'to list:', listId);
await addEntity(listId, entityId, entityType, metadata);
console.log('Entity added successfully');
```

### 3. Check Storage State

Inspect IndexedDB in browser DevTools:
- Application tab → Storage → IndexedDB
- Look for `AcademicExplorerCatalogue` database
- Verify `catalogueLists` and `catalogueEntities` tables

### 4. Trace Network Requests

If OpenAlex API involved:
```typescript
// In test file, enable network logging
await page.route('**', route => {
  console.log('Request:', route.request().url());
  route.continue();
});
```

### 5. Take Manual Screenshots

```typescript
// In component, during debugging
useEffect(() => {
  console.log('Current entities:', currentEntities);
}, [currentEntities]);
```

## Testing Best Practices

### DO:
- ✅ Run tests individually while fixing
- ✅ Use TypeScript to catch errors early
- ✅ Follow existing code patterns in components
- ✅ Use the `useCatalogue` hook, never direct Dexie calls
- ✅ Run full suite after each batch of fixes
- ✅ Commit working fixes incrementally

### DON'T:
- ❌ Modify test expectations
- ❌ Use `any` types (constitution violation)
- ❌ Skip TypeScript errors with `@ts-ignore`
- ❌ Add delays/timeouts to fix race conditions (fix root cause)
- ❌ Couple components directly to Dexie (use hook)
- ❌ Break other tests while fixing one

## Verification Checklist

Before considering a test fixed:

- [ ] Test passes 3 consecutive times (`--repeat-each=3`)
- [ ] Full test suite still passes (no regressions)
- [ ] TypeScript compilation succeeds (`pnpm typecheck`)
- [ ] No console errors in test output
- [ ] Code follows existing patterns
- [ ] Hook contract satisfied (if hook modified)
- [ ] Type guards used (no `any` or `as` assertions)
- [ ] Storage abstraction maintained

## Success Criteria

All 27 tests passing means:

- Tests 64-72: Entity management works ✅
- Tests 73-81: Import/export works ✅
- Tests 89-97: Sharing works ✅
- Test 87: UI components accessible ✅
- Total: 232/232 tests passing (up from 205/232)

## Getting Help

### Documentation
- [Feature Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Data Model](./data-model.md)
- [Technical Research](./research.md)
- [API Contracts](./contracts/)

### Code References
- [@dnd-kit docs](https://docs.dndkit.com/) for drag-and-drop
- [Mantine docs](https://mantine.dev/) for UI components
- [Dexie docs](https://dexie.org/) for storage operations

### Questions?
1. Check specification first (it defines expected behavior)
2. Read failing test code (it shows exact expectations)
3. Review contracts (they define required API)
4. Examine trace files (they show what happened)

## Next Steps

After all tests pass:

1. Run full validation: `pnpm verify`
2. Commit changes: See [Git workflow](#git-workflow)
3. Generate tasks: `/speckit.tasks` (automated task generation)
4. Implementation: `/speckit.implement` (execute task plan)

## Git Workflow

```bash
# Check status
git status

# Stage catalogue changes
git add apps/web/src/components/catalogue/
git add apps/web/src/hooks/useCatalogue.ts

# Commit with scope
git commit -m "fix(academic-explorer): implement catalogue entity management

- Add entity to list functionality (FR-001)
- Remove entity from list (FR-003)
- Fix entity type badge display (FR-002)
- Tests 64-66 now passing"

# Continue with next batch of fixes
```

## Performance Targets

From success criteria:

- Add entity: <500ms
- Export list: <2s (typical dataset)
- Import list: <5s (typical dataset)
- Drag-and-drop: immediate visual feedback
- Bulk operations: Handle 100+ entities without UI freezing

Monitor with browser DevTools Performance tab during test runs.

## Troubleshooting

### "Test timed out after 30s"
- Async operation not awaited properly
- Infinite loop in component render
- Storage operation hanging

**Fix**: Add proper async/await, check for infinite re-renders

### "Element not found"
- Selector wrong or element not rendered
- Condition not met (e.g., list empty)
- Component not mounted

**Fix**: Check test selector, verify component renders conditionally correctly

### "Expected 5, received 0"
- Feature not implemented
- Storage operation failed silently
- State not updating after operation

**Fix**: Implement feature, check for thrown errors, verify state updates

### "localStorage is not defined"
- Test environment issue
- Wrong storage mechanism used

**Fix**: Use IndexedDB via Dexie, not localStorage (per constitution)

## Summary

1. **Run test** → Identify failure
2. **Read test code** → Understand expectation
3. **Fix implementation** → Match expectation
4. **Verify pass** → Test turns green
5. **Check regressions** → Full suite still passes
6. **Commit** → Save working code
7. **Repeat** → Next failing test

Good luck! 🚀
