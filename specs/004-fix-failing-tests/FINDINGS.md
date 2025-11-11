# Implementation Findings: Fix Failing Catalogue E2E Tests

**Feature**: 004-fix-failing-tests
**Date**: 2025-11-11
**Status**: In Progress - Phase 2 Complete

## Summary

Automated implementation discovered that much of the catalogue infrastructure already exists, but the underlying storage provider implementation is incomplete. This document records findings to guide remaining implementation work.

## Completed Work

### Phase 2: Foundational (Tasks T006-T012) ✅

**Status**: Complete
**Commit**: 103fa6c6

Files created:
- `apps/web/src/types/catalogue.ts` - Core type definitions
- `apps/web/src/utils/catalogue-guards.ts` - Type guards for metadata
- `apps/web/src/utils/catalogue-validation.ts` - Export format validation
- `apps/web/src/constants/catalogue.ts` - Entity type labels and colors
- `apps/web/src/lib/db/catalogue-db.ts` - Dexie database schema

**Validation**: TypeScript compilation passes, all types properly exported.

## Critical Discoveries

### Discovery 1: Existing Infrastructure

**Finding**: Tasks T013-T019 (Phase 3.1) already have implementations:

1. **`useCatalogue` hook** (`apps/web/src/hooks/useCatalogue.ts`)
   - Lines 222-234: `addEntityToList` method exists
   - Lines 258-269: `removeEntityFromList` method exists
   - Hook methods are thin wrappers around storage provider

2. **Components exist and are wired up**:
   - `AddToCatalogueButton.tsx` - Calls `addEntityToList` (lines 207-259)
   - `AddToListModal.tsx` - Handles list selection and submission (lines 53-200)
   - `CatalogueEntities.tsx` - Displays entities and handles removal (lines 241-623)

**Implication**: The UI layer is largely complete. Tests are failing because the **storage provider's actual implementation** is missing or incomplete.

### Discovery 2: Storage Provider Gap

**Root Cause**: The `useCatalogue` hook delegates to `storage.addEntityToList()` from the storage provider context.

**Evidence**:
```typescript
// apps/web/src/hooks/useCatalogue.ts:229
return await storage.addEntityToList(params);
```

The `storage` object comes from `useStorageProvider()` context, likely defined in `@academic-explorer/utils` package or a local storage provider implementation.

**Test Failure Pattern**:
- Modal opens successfully
- "Added to List" notification never appears
- Modal doesn't close (line 102 `onClose()` never reached)
- Suggests `storage.addEntityToList()` is throwing or never resolving

### Discovery 3: Missing Storage Implementation

**What exists**: Interface definitions, hook wrappers, UI components
**What's missing**: Actual Dexie database operations in the storage provider

**Expected Implementation Location**:
- Likely `@academic-explorer/utils/storage-provider` or similar
- Should implement `addEntityToList()`, `removeEntityFromList()`, etc.
- Should use the Dexie schema from `apps/web/src/lib/db/catalogue-db.ts`

## Remaining Work

### Immediate Priority: Storage Provider Implementation

The storage provider needs these methods implemented:

1. **`addEntityToList(params)`**:
   - Check for duplicate (composite key `${listId}:${entityId}`)
   - Query max position in list
   - Insert entity at position = maxPosition + 1
   - Update list's entityCount
   - Return entity record ID

2. **`removeEntityFromList(listId, entityRecordId)`**:
   - Delete entity record
   - Update list's entityCount
   - Handle position gaps (optional: recompute positions)

3. **`getListEntities(listId)`**:
   - Query entities by listId
   - Order by position
   - Return array of CatalogueEntity

4. **`reorderEntities(listId, entityIds)`**:
   - Update positions atomically (transaction)
   - entityIds array represents new order

5. **`updateEntityNotes(entityRecordId, notes)`**:
   - Update note field
   - Return updated entity

### Investigation Needed

1. **Locate storage provider implementation**:
   ```bash
   # Check utils package
   find packages/utils/src -name "*storage*" -o -name "*catalogue*"

   # Check for provider interface
   grep -r "addEntityToList" packages/utils/src
   ```

2. **Verify storage provider context**:
   - Check `apps/web/src/contexts/storage-provider-context.tsx`
   - Confirm which implementation is being used (Dexie? In-memory?)
   - E2E tests should use in-memory provider per constitution

3. **Check database initialization**:
   - Verify `catalogueDb` from `apps/web/src/lib/db/catalogue-db.ts` is imported and initialized
   - Check if tables are being created properly

## Recommended Next Steps

### Option A: Fix Storage Provider (Fastest)

1. Locate the storage provider implementation
2. Add missing Dexie operations for catalogue entities
3. Use the database schema from `catalogue-db.ts`
4. Run tests to verify fixes

### Option B: Continue with Agents (Most Thorough)

Continue parallel execution for remaining phases:
- Phase 3.2-3.7: UI enhancements (type display, search, drag-drop, notes, bulk ops)
- Phase 4: Import/export (needs pako compression)
- Phase 5: Sharing (needs QR codes)
- Phase 6: UI accessibility
- Phase 7: Polish

**Note**: Option B still requires fixing storage provider first, as all phases depend on working entity management.

## Test Status

**Current**: 205/232 tests passing (27 failing)

**Failing Tests**:
- Tests 64-72: Catalogue entity management (9 tests)
- Tests 73-81: Catalogue import/export (9 tests)
- Tests 89-97: Catalogue sharing (9 tests)

**After Storage Provider Fix**: Should see immediate improvement in Tests 64-66 (add, display, remove entities)

## Technical Debt

1. **InstitutionMetadata type conflict**: Fixed by renaming second `type` property to `institutionType`
2. **Storage abstraction**: Hook is properly abstracted, but provider implementation incomplete
3. **Error handling**: Components have error handling, but storage provider may be failing silently

## References

- [Implementation Plan](./plan.md) - Complete technical plan
- [Tasks](./tasks.md) - 84 tasks, T006-T012 complete
- [Quickstart Guide](./quickstart.md) - Manual implementation workflow
- [Data Model](./data-model.md) - Entity schemas and relationships
- [Contracts](./contracts/) - TypeScript interface definitions

## Conclusion

Phase 2 (Foundational) is complete and provides all necessary types for the feature. The UI components and hooks exist but are blocked by missing storage provider implementation. **Fixing the storage provider is the critical path** to unblocking all 27 failing tests.

Once storage provider is fixed, remaining work is primarily UI enhancements (drag-drop, search, import/export, sharing) which can be implemented incrementally.

---

## Phase 2 Cleanup - Dead Code Removal

### Duplicate Database Schema File Removed

**Date**: 2025-11-11

**File Removed**: `apps/web/src/lib/db/catalogue-db.ts`

**Reason**: Phase 2 implementation created a duplicate database schema file that was never imported or used anywhere in the codebase.

**Why Safe to Remove**:
- Codebase search confirmed zero imports of `lib/db/catalogue-db`
- All actual database code uses `@academic-explorer/utils/storage/catalogue-db` (the primary database location)
- The removed file was a simplified Dexie schema stub that duplicated the more complete implementation in the utils package
- Build verification: TypeScript compilation and Vite build both pass after removal

**Actual Database Location**: `/packages/utils/src/storage/catalogue-db.ts`
- This is the production database with full CatalogueService implementation
- Features: list management, entity operations, sharing, bookmarks, history, bulk operations
- Used by: HistorySidebar, BookmarksSidebar, CatalogueManager, BookmarkManager, use-user-interactions

**What the Duplicate Contained**:
- Simple Dexie database class with only catalogueLists and catalogueEntities tables
- Lacked event system, service layer, sharing features, and comprehensive operations
- Would have created maintenance burden if kept (risk of drift between duplicates)

**Verification**:
```bash
# Confirmed zero imports
grep -r "lib/db/catalogue-db" apps/web/src/
# Result: No imports found

# Build verification
npm run build  # ✓ Passed (dist built in 5.59s)
```

**Impact**:
- Eliminated dead code duplication
- Reduced codebase complexity
- Ensured single source of truth for catalogue database
- No functional changes to application behavior
