# E2E Testing Strategy

## Overview

The E2E test suite is organized into CI tests (automated) and manual tests to balance coverage with API rate limiting:

### 1. CI Tests (Automated)
Located in `apps/web/src/test/e2e/`:
- **sample-urls-ci.e2e.test.ts**: 30 representative URLs covering all entity types
- **deployed-verification.e2e.test.ts**: Deployment smoke tests
- **Runtime**: ~10 minutes total
- **Rate Limiting**: Safe with 500ms delays between tests
- **When**: Every PR and commit to main

### 2. Manual Tests
Located in `apps/web/src/test/e2e/manual/`:
- **data-consistency-full.e2e.test.ts**: All 276 URLs with data validation (60+ min)
- **all-urls-load-full.e2e.test.ts**: All 276 URLs load testing (60+ min)
- **data-completeness.e2e.test.ts**: Deep field-level validation
- **external-id-routing.e2e.test.ts**: External ID edge cases (ORCID, ISSN, ROR)
- **issn-fix-verification.e2e.test.ts**: ISSN routing diagnostics
- **issn-timeout-debug.e2e.test.ts**: ISSN timeout debugging
- **quick-deployed-check.e2e.test.ts**: Quick deployment validation
- **sample-urls-deployed.e2e.test.ts**: Sample URL deployment checks
- **Runtime**: 60+ minutes (may hit rate limits)
- **When**: Manual testing, releases, or local validation

## Sample Test Coverage

The 30-URL sample includes:
- **Works** (3 URLs): Detail, list, search with filters (bioplastics)
- **Authors** (4 URLs): Detail, list, search, external ID (ORCID)
- **Sources** (4 URLs): Detail, list, search, external ID (ISSN)
- **Institutions** (4 URLs): Detail, list, search, external ID (ROR)
- **Topics** (3 URLs): Detail, list, search
- **Publishers** (3 URLs): Detail, list, search
- **Funders** (3 URLs): Detail, list, search
- **Concepts** (3 URLs): Detail, list, search
- **Keywords** (1 URL): List
- **Autocomplete** (2 URLs): Works, authors

## Running Tests

### CI Tests (Default)
```bash
pnpm --filter @academic-explorer/web test:e2e
```

### Manual Tests (Local Only)
```bash
# Run specific manual test
npx playwright test src/test/e2e/manual/data-completeness.e2e.test.ts

# Run all manual tests (requires E2E_FULL_SUITE env var)
E2E_FULL_SUITE=true npx playwright test src/test/e2e/manual/
```

### Specific Test File
```bash
npx playwright test src/test/e2e/sample-urls-ci.e2e.test.ts
```

## Rate Limiting Considerations

### OpenAlex API Limits
- **Free tier**: 100,000 requests per day
- **Polite pool**: 100,000 requests per day (with email in User-Agent)
- **Rate limiting**: Throttled after sustained high request rates (HTTP 403)

### Our Mitigation
1. **Sample testing**: Reduces CI requests from 276 to 30 URLs
2. **Delays**: 500ms between test executions
3. **Caching**: Application caches API responses (IndexedDB + localStorage)
4. **Sequential execution**: Tests run one at a time (workers: 1)
5. **Manual full suite**: 276 URLs only for local/release testing

### Why Tests Failed Previously
- **276 URLs × 3 retries** = ~800+ test executions
- Each test makes multiple API requests
- Total requests exceeded rate limits → HTTP 403 Forbidden
- Solution: Sample testing (30 URLs) for CI, full suite for manual testing

## Test Organization

### CI Tests (Always Run)
- Quick smoke tests for deployment verification
- Sample URL coverage across all entity types
- Data completeness spot checks
- Total runtime: ~10 minutes

### Manual Tests (On-Demand)
- Exhaustive 276-URL testing
- Deep data field validation
- External ID routing edge cases
- Debug and diagnostic tests
- Total runtime: 60+ minutes

## Adding New Tests

When adding URLs to test:
1. Add to `openalex-urls.json` (full suite)
2. If it's a new entity type or critical use case, add to `openalex-urls-sample.json`
3. Verify sample coverage remains balanced across entity types
4. Consider whether the test should be in CI or manual directory

## Data Completeness Verification

Both test suites verify:
- ✅ Page loads without errors
- ✅ Main content is present
- ✅ Entity data displays correctly
- ✅ List/search results render
- ✅ External ID routing works
- ✅ All entity fields are shown (EntityDataDisplay component)

The application is designed to show **ALL** data returned by the OpenAlex API in the Rich view. List pages show summaries, but users can click through to entity detail pages to see all fields in both Rich (formatted) and Raw (JSON) views.

## Troubleshooting

### E2E Tests Fail with HTTP 403
- OpenAlex API is rate limiting
- Solution: Run tests locally or wait for rate limit reset
- CI uses sample tests to avoid this

### Tests Timeout
- Increase test timeout in specific test file
- Check network connectivity
- Verify deployed site is accessible

### Element Not Found Errors
- Check if entity data structure changed
- Verify EntityDataDisplay component handles the data type
- Check if external ID routing is working correctly
