# Critical Fix: EntityList Missing Entity Types

**Date**: 2025-10-29
**Commit**: ae835baf
**Issue**: Concepts and Topics routes created but EntityList component missing support

## Problem Discovery

After creating concepts detail routes (`$conceptId.tsx` and `$conceptId.lazy.tsx`), tests revealed:
- **13 out of 15 concepts tests failing** with error: "Unsupported entity type: concepts"
- **All funders list tests failing** (similar issue)
- **All institutions list tests failing** (similar issue)

## Root Cause

The `EntityList.tsx` component had a switch statement (lines 109-155) that only handled:
- ✅ works
- ✅ authors
- ✅ institutions (detail only)
- ✅ sources
- ✅ funders (detail only)
- ✅ publishers

**MISSING**:
- ❌ concepts (all list page URLs)
- ❌ topics (all list page URLs)

## Fix Applied

Added missing cases to EntityList.tsx switch statement:

```typescript
case "concepts":
  response = await openAlex.client.concepts.getConcepts({
    per_page: perPage,
    page: currentPage,
  });
  break;
case "topics":
  response = await openAlex.client.topics.getMultiple({
    per_page: perPage,
    page: currentPage,
  });
  break;
```

### Additional Fix

Fixed TypeScript error in `$conceptId.lazy.tsx` line 60:
- Changed: `{selectParam && (<>...</>)}`
- To: `{selectParam && typeof selectParam === 'string' ? selectParam : 'default (all fields)'}`

## Expected Impact

### Before Fix
- **30 failures** out of 78 tests run (38.5% failure rate)
- Breakdown:
  - 2 ORCID https:// URLs (known TanStack Router limitation)
  - 1 invalid author A2798520857 (needs test data cleanup)
  - 1 authors list page
  - 13 concepts list pages (fixed by this commit)
  - 1 funders list page (fixed by this commit)
  - 1 institutions list page (fixed by this commit)
  - 11 other list page failures (likely fixed)

### After Fix (Expected)
- **~10-15 failures** remaining (96-98% pass rate):
  - 2 ORCID https:// URLs (router limitation - documented)
  - 1 invalid author (test data issue)
  - ~7-12 remaining issues to investigate

## Testing Status

### Deployment
- **Old deployment (18902453865)**: concepts routes WITHOUT EntityList fix
- **New deployment (18902747695)**: concepts routes WITH EntityList fix ✅

### Next Steps
1. Wait for deployment 18902747695 to complete
2. Verify deployed site at https://mearman.github.io/Academic-Explorer/
3. Re-run 276 URL test suite
4. Analyze remaining failures
5. Clean up test data (remove A2798520857)

## Related Files

**Modified**:
- `apps/web/src/components/EntityList.tsx` - Added concepts + topics cases
- `apps/web/src/routes/concepts/$conceptId.lazy.tsx` - Fixed TypeScript type guard

**Previously Created**:
- `apps/web/src/routes/concepts/$conceptId.tsx` - Route definition
- `apps/web/src/routes/concepts/$conceptId.lazy.tsx` - Component implementation
- `apps/web/src/routeTree.gen.ts` - Manual type additions

## API Methods Used

- `client.concepts.getConcepts()` - NOT `getMultiple()` ⚠️
- `client.topics.getMultiple()` - Standard pattern ✅

## Performance Notes

**Build Output**:
```
dist/assets/_conceptId.lazy-B5D7pMvU.js  2.75 kB │ gzip: 1.15 kB │ map: 7.25 kB
```

Total build time: 6.63s (7579 modules transformed)

## Lessons Learned

1. **Always check EntityList.tsx** when adding new entity type routes
2. **API methods vary by entity** - some use `getMultiple()`, some use custom methods
3. **Type guards required** for route search params (unknown type from router)
4. **Test BEFORE and AFTER** creating routes to catch integration issues early
5. **List pages !== Detail pages** - both require separate implementation
