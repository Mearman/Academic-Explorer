# E2E Testing Strategy

## Overview

The E2E test suite is split into two categories to balance coverage with API rate limiting:

### 1. Sample Tests (CI) - `sample-urls-ci.e2e.test.ts`
- **Purpose**: Fast, reliable CI testing
- **Coverage**: 30 representative URLs covering all entity types
- **Runtime**: ~10 minutes
- **Rate Limiting**: Safe for CI with delays between tests
- **When**: Every PR and commit to main

### 2. Full Tests (Manual) - `*-full.e2e.test.ts`
- **Purpose**: Complete validation of all 276 URLs
- **Coverage**: All URLs from `openalex-urls.json`
- **Runtime**: ~60 minutes (if API allows)
- **Rate Limiting**: May hit OpenAlex API limits
- **When**: Manual testing, releases, or local validation

## Sample Test Coverage

The 30-URL sample includes:
- **Works** (3 URLs): Detail, list, search with filters
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

### Full Test Suite (Local Only)
```bash
E2E_FULL_SUITE=true pnpm --filter @academic-explorer/web test:e2e
```

### Specific Test File
```bash
npx playwright test src/test/e2e/sample-urls-ci.e2e.test.ts
```

## Rate Limiting Considerations

### OpenAlex API Limits
- **Free tier**: 100,000 requests per day
- **Polite pool**: 100,000 requests per day (with email in User-Agent)
- **Rate limiting**: Throttled after sustained high request rates

### Our Mitigation
1. **Sample testing**: Reduces CI requests from 276 to 30 URLs
2. **Delays**: 500ms between test executions
3. **Caching**: Application caches API responses
4. **Sequential execution**: Tests run one at a time

### Why Tests Failed Previously
- **276 URLs × 3 retries** = ~800+ test executions
- Each test makes multiple API requests
- Total requests exceeded rate limits → HTTP 403 errors
- Solution: Sample testing for CI, full suite for manual testing only

## Adding New Tests

When adding URLs to test:
1. Add to `openalex-urls.json` (full suite)
2. If it's a new entity type or important edge case, add to `openalex-urls-sample.json`
3. Verify sample coverage remains balanced across entity types

## Data Completeness Verification

Both test suites verify:
- ✅ Page loads without errors
- ✅ Main content is present
- ✅ Entity data displays correctly
- ✅ List/search results render
- ✅ External ID routing works
- ✅ All entity fields are shown (EntityDataDisplay component)

The application is designed to show **ALL** data returned by the OpenAlex API, not just summaries.
