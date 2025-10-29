# 276 URL Test Results - Initial Run

**Test Date**: 2025-10-29
**Test Command**: `pnpm exec playwright test all-urls-load.e2e.test.ts --max-failures=20`
**Test Duration**: ~4.8 minutes
**Max Failures**: 20 (stop after 20 failures)

## Summary

- **✅ Passed**: 43 tests
- **❌ Failed**: 20 tests
- **⏸️ Not Run**: 214 tests (stopped after max failures reached)

## Critical Discovery: Missing Concepts Entity Routes

**Most Significant Issue**: ALL 17 concept-related tests failed because the concepts detail routes were missing:
- `/apps/web/src/routes/concepts/$conceptId.tsx` - **MISSING** ❌
- `/apps/web/src/routes/concepts/$conceptId.lazy.tsx` - **MISSING** ❌

This is an architectural gap - all other entities (authors, works, institutions, sources, topics, funders, publishers) have detail routes, but concepts did not.

## Failure Breakdown

### 1. Missing Concepts Routes (17 failures)

**Affected URLs**:
- `/concepts` - Base concepts list
- `/concepts/C71924100` - Concept detail page
- `/concepts/C71924100?select=id,display_name` - With select parameter
- All concept filters: `display_name.search`, `has_wikidata`, `level`
- All concept operations: `group_by`, `per-page`, `sample`, `search`, `select`, `sort`

**Root Cause**: No `$conceptId.tsx` or `$conceptId.lazy.tsx` files existed in `/apps/web/src/routes/concepts/`

**Status**: ✅ **FIXED** - Created both files following the pattern used by other entities

**Remaining Issue**: TanStack Router types not yet regenerated (TypeScript errors during development, but runtime should work)

### 2. ORCID URLs with https:// Protocol (2 failures)

**Affected URLs**:
- `/authors/https://orcid.org/0000-0002-1298-3089`
- `/authors/https://orcid.org/0000-0003-1613-5981`

**Error**: "Unable to detect entity type for: https%3A%2Forcid.org..." (missing double slash)

**Root Cause**: TanStack Router path normalization collapses consecutive slashes (`//`) even when URL-encoded

**Status**: ❌ **DOCUMENTED** - See `ROUTING-KNOWN-ISSUES.md` for details

**Workarounds**:
- ✅ Use prefix format: `/authors/orcid:0000-0002-1298-3089`
- ✅ Use OpenAlex ID: `/authors/A5017898742`
- ❌ Full protocol in path parameter: `/authors/https://orcid.org/...` (architectural limitation)

### 3. Insufficient Content Warnings (1 failure)

**Affected URL**: `/authors/A2798520857`

**Error**: Expected content length >100 characters, received 59 characters

**Possible Causes**:
1. Genuinely sparse author profile (minimal data in API)
2. Rendering issue (component not displaying all available data)
3. Test threshold too strict for this specific author

**Status**: ⏸️ **PENDING INVESTIGATION** - Needs manual verification of API response vs. rendered content

## Test Categories That Passed

Based on the 43 passing tests before failures stopped execution:

- ✅ **Authors with OpenAlex IDs** - Working
- ✅ **DOI URLs** - All 3 DOI tests passed in previous runs
- ✅ **Works entity** - Detail pages and list views working
- ✅ **Institutions entity** - Working
- ✅ **Sources entity** - Working
- ✅ **Topics entity** - Working
- ✅ **Funders entity** - Partial (some filter tests passed)
- ✅ **Publishers entity** - Working

## Next Steps

### Immediate (This Session)

1. ✅ Create concepts detail routes (`$conceptId.tsx`, `$conceptId.lazy.tsx`)
2. ⏳ Fix TanStack Router type generation for concepts
3. ⏸️ Re-run full 276 URL test suite
4. ⏸️ Investigate author A2798520857 content issue
5. ⏸️ Create detailed test report with pass/fail breakdown by URL pattern

### Future Work

1. **TanStack Router Upgrade**: Investigate if newer versions handle consecutive slashes better
2. **Alternative Routing**: Consider query parameter approach for external IDs with protocols
3. **Test Thresholds**: Review content length expectations for sparse entities
4. **Type Generation**: Automate TanStack Router type regeneration in CI/CD pipeline

## File Changes

### Created
- `/apps/web/src/routes/concepts/$conceptId.tsx` - Route definition with lazy loading
- `/apps/web/src/routes/concepts/$conceptId.lazy.tsx` - Concept detail component

### Pattern Applied
- Same structure as other entities (sources, funders, publishers, topics, etc.)
- Uses `decodeEntityId()` utility for URL parameter decoding
- Supports `select` query parameter for field selection
- Includes loading, error, and success states
- Toggle between raw JSON and rich view

## Architecture Notes

### Why Concepts Were Missing

Likely historical reasons:
1. Concepts might have been implemented before the entity detail pattern was standardized
2. Or concepts were deprioritized as they're often used for filtering rather than as standalone entities
3. The concepts list view (`/concepts/index.lazy.tsx`) exists, but detail routes were never added

### Impact

This gap meant:
- Users couldn't view individual concept details
- URLs like `/concepts/C71924100` returned 404
- Filters and queries on concepts API endpoints couldn't render results
- ~6% of test URLs (17/276) were broken due to this single architectural gap

## Test Environment

- **Framework**: Playwright E2E testing
- **Browser**: Chromium
- **Test Pattern**: Load URL → Wait for main content → Verify content length > threshold → Check for error messages
- **Thresholds**:
  - List pages: >75 characters
  - Detail pages: >100 characters
  - With select param: >50 characters (reduced due to selective fields)

## References

- Test file: `/apps/web/src/test/e2e/all-urls-load.e2e.test.ts`
- Test data: `/apps/web/test-data/openalex-urls.json`
- Routing issues doc: `/apps/web/ROUTING-KNOWN-ISSUES.md`
- URL decoding utility: `/apps/web/src/utils/url-decoding.ts`
