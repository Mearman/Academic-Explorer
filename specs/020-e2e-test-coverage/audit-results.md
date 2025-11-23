# E2E Test Suite Audit Results

**Date**: 2025-11-23
**Branch**: `claude/implement-e2e-test-coverage-014XQky2wXT3EkebJxG8VCae`

## Executive Summary

Initial audit of the E2E test suite to establish baseline before implementing coverage enhancements.

**Note**: Dependencies were not installed in the test environment at the time of audit. This document will be updated once tests can be executed.

## Current Test Structure

### Test Locations

1. **Newer Tests** (`apps/web/e2e/`): 19 test files
   - author-verification.e2e.test.ts
   - edge-accessibility.e2e.test.ts
   - edge-direction.e2e.test.ts
   - filesystem-cache.e2e.test.ts
   - graph-xpac-styling.e2e.test.ts
   - incoming-affiliations.e2e.test.ts
   - incoming-authorships.e2e.test.ts
   - incoming-funding.e2e.test.ts
   - incoming-publications.e2e.test.ts
   - incoming-relationships.e2e.test.ts
   - metadata-badges.e2e.test.ts
   - version-comparison.e2e.test.ts
   - version-selector-november.e2e.test.ts
   - version-selector-removed.e2e.test.ts
   - version-v1-parameter.e2e.test.ts
   - walden-v2-default.e2e.test.ts
   - work-type-display.e2e.test.ts
   - xpac-default-enabled.e2e.test.ts
   - xpac-toggle.e2e.test.ts

2. **Legacy Tests** (`apps/web/src/test/e2e/`): 27 test files
   - autocomplete.e2e.test.ts
   - bioplastics-url-bookmarking.e2e.test.ts
   - bookmark-custom-fields.e2e.test.ts
   - bookmark-entity.e2e.test.ts
   - bookmark-query.e2e.test.ts
   - bookmark-search.e2e.test.ts
   - bookmark-tagging.e2e.test.ts
   - bookmarking.e2e.test.ts
   - bulk-bookmarks-management.e2e.test.ts
   - catalogue-basic-functionality.e2e.test.ts
   - catalogue-entity-management.e2e.test.ts
   - catalogue-import-export.e2e.test.ts
   - catalogue-realistic.e2e.test.ts
   - catalogue-sharing-functionality.e2e.test.ts
   - catalogue-smoke-test.e2e.test.ts
   - comprehensive-url-pattern-bookmarking.e2e.test.ts
   - deployed-verification.e2e.test.ts
   - edge-filtering.e2e.test.ts
   - external-canonical-ids.e2e.test.ts
   - keywords-navigation.e2e.test.ts
   - mobile-navigation.e2e.test.ts
   - openalex-url-bookmarking.e2e.test.ts
   - pretty-urls.e2e.test.ts
   - sample-urls-ci.e2e.test.ts
   - sidebar-functionality.e2e.test.ts
   - url-permutations.e2e.test.ts
   - url-redirect-data-display.e2e.test.ts

3. **Manual Tests** (`apps/web/src/test/e2e/manual/`): 16 test files
   - all-urls-load-full.e2e.test.ts
   - api-field-validation.e2e.test.ts
   - author-routes.e2e.test.ts
   - data-completeness.e2e.test.ts
   - data-consistency-full.e2e.test.ts
   - debug-homepage.e2e.test.ts
   - external-id-routing.e2e.test.ts
   - graph-visualization.e2e.test.ts
   - homepage.e2e.test.ts
   - issn-fix-verification.e2e.test.ts
   - issn-timeout-debug.e2e.test.ts
   - layout-scrolling.e2e.test.ts
   - openalex-url.e2e.test.ts
   - quick-deployed-check.e2e.test.ts
   - sample-urls-deployed.e2e.test.ts
   - section-screenshots.e2e.test.ts

**Total**: 62 test files (46 automated + 16 manual)

### Existing Test Infrastructure

- **Helpers**: `apps/web/e2e/helpers/populate-graph.ts`
- **Page Objects**: None found
- **Test Utilities**: Minimal

## Coverage Gaps Identified

### Missing Entity Type Tests

The following entity types have **NO** dedicated detail page tests:

1. **Domains** - No test coverage
2. **Fields** - No test coverage
3. **Subfields** - No test coverage
4. **Topics** - No test coverage
5. **Concepts** - No test coverage
6. **Institutions** - No test coverage
7. **Funders** - No test coverage
8. **Publishers** - No test coverage
9. **Sources** - No test coverage

### Missing Route Tests

The following routes have **NO** test coverage:

1. **Browse Page** (`/browse`) - No tests
2. **Search Page** (`/search`) - Autocomplete tested, but not search workflows
3. **Explore Page** (`/explore`) - No tests
4. **Settings Page** (`/settings`) - No tests
5. **About Page** (`/about`) - No tests
6. **Cache Management** (`/cache`) - No tests
7. **History Page** (`/history`) - No tests
8. **Privacy Page** (`/privacy`) - No tests
9. **Terms Page** (`/terms`) - No tests

### Missing Workflow Tests

No multi-step workflow tests covering:

1. **Search Workflow**: Query entry → results display → filtering → entity selection
2. **Browse Workflow**: Browse page → entity type selection → entity detail
3. **Graph Interaction**: Pan, zoom, node selection, edge filtering
4. **Catalogue Management**: Create list → add entities → manage list → delete list
5. **Bookmark Management**: Bookmark entity → view bookmarks → manage bookmarks

### Missing Error Scenario Tests

No error handling tests for:

1. **404 Errors**: Non-existent entities, malformed URLs
2. **500 Errors**: Server errors, API failures
3. **Network Failures**: Offline mode, connection issues
4. **Timeouts**: Slow API responses
5. **Malformed URLs**: Invalid entity IDs, collapsed protocols

## Configuration Issues

### Current Playwright Configuration

From `playwright.config.ts`:

```typescript
fullyParallel: true,
workers: process.env.CI ? 2 : 4,
```

**Issue**: According to spec, tests should run **serially** (workers: 1) to prevent OOM errors.

**Required Change**:
```typescript
fullyParallel: false,
workers: 1,
```

## Pre-Existing Test Failures

**Status**: Cannot be determined until dependencies are installed and tests are run.

**Action Required**:
1. Install dependencies: `pnpm install`
2. Run smoke suite: `pnpm nx e2e web`
3. Run full suite: `E2E_FULL_SUITE=true pnpm nx e2e web`
4. Document all failures

## Recommendations

### Immediate Actions

1. **Install dependencies** to enable test execution
2. **Run full audit** to identify pre-existing failures
3. **Fix configuration** to enforce serial execution
4. **Create test infrastructure**:
   - Base page objects
   - Test helpers (navigation, storage, assertions, API mocking)
   - Entity-specific page objects

### Priority Order

1. **Phase 1**: Fix existing infrastructure and failures
2. **Phase 2**: Add critical entity type tests (Domains, Fields, Subfields)
3. **Phase 3**: Add utility page tests (Browse, Search, Explore, Settings)
4. **Phase 4**: Add workflow tests
5. **Phase 5**: Add error scenario tests
6. **Phase 6**: Review and automate high-value manual tests

## Success Metrics

Target outcomes from spec.md:

- **SC-011**: 20+ percentage point increase in route coverage
- **SC-012**: Zero flaky tests over 10 consecutive CI runs
- **SC-008**: Smoke suite completes in <10 minutes
- **SC-009**: Full suite completes in <30 minutes

## Next Steps

1. Create test infrastructure (page objects, helpers)
2. Update playwright.config.ts for serial execution
3. Create missing entity detail page tests
4. Create missing utility page tests
5. Create workflow tests
6. Create error scenario tests
7. Review and automate manual tests
8. Validate all tests pass consistently

---

**Last Updated**: 2025-11-23
**Status**: Infrastructure creation in progress
