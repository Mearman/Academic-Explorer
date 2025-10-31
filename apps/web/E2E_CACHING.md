# E2E Test Caching Documentation

This document describes the comprehensive caching strategy implemented for E2E tests to improve performance and reduce API calls.

## Overview

The caching system consists of multiple layers:

1. **CI-Level Caching** - GitHub Actions cache for dependencies and browsers
2. **HAR File Caching** - HTTP Archive files for network response caching
3. **Storage State Persistence** - Browser storage (cookies, localStorage, IndexedDB) reuse
4. **Build Artifact Caching** - Nx and Vite build cache

## CI-Level Caching

### Playwright Browsers Cache

Playwright browsers are cached based on the Playwright version to avoid reinstalling on every CI run.

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-browsers-${{ runner.os }}-${{ env.PLAYWRIGHT_VERSION }}
```

**Benefits:**
- Saves 30-60 seconds per CI run
- Reduces bandwidth usage
- Only reinstalls when Playwright version changes

### pnpm Store Cache

Dependencies are cached using pnpm's store directory:

```yaml
- name: Setup pnpm cache
  uses: actions/cache@v4
  with:
    path: ${{ env.STORE_PATH }}
    key: pnpm-store-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}
```

### Test Data Cache

Storage state and HAR files are cached between runs:

```yaml
- name: Cache test data
  uses: actions/cache@v4
  with:
    path: |
      apps/web/test-results/storage-state
      apps/web/test-results/har-cache
    key: e2e-test-data-${{ runner.os }}-${{ hashFiles('openalex-urls-sample.json') }}-v1
```

## HAR File Caching

HTTP Archive (HAR) files record and replay network traffic, reducing API calls to OpenAlex.

### How It Works

1. **First Run**: Tests record all network traffic to HAR files
2. **Subsequent Runs**: Tests replay from HAR files (no network calls)
3. **Cache Refresh**: Set `E2E_REFRESH_CACHE=true` to re-record

### Using HAR Caching in Tests

#### Option 1: Use Cache Fixtures (Recommended)

```typescript
import { test, expect } from '../fixtures/cache-fixtures';

test('should load work detail', async ({ cachedPage, cacheStats }) => {
  await cachedPage.goto('/#/works/W2100837269');

  // Test assertions...

  // Cache stats are automatically logged
  // Output: Cache stats - Hits: 5, Misses: 0, Hit rate: 100%
});
```

#### Option 2: Manual HAR Setup

```typescript
import { test, expect } from '@playwright/test';

test.use({
  // Record HAR for this test
  contextOptions: {
    recordHar: {
      path: 'test-results/har-cache/my-test.har',
      mode: 'minimal',
    },
  },
});

test('my test', async ({ page }) => {
  // Test implementation
});
```

### HAR Cache Location

- **Directory**: `apps/web/test-results/har-cache/`
- **Naming**: `{test-hash}.har` (MD5 hash of test title)
- **CI Cache**: Persisted between runs using GitHub Actions cache

## Storage State Persistence

Browser storage state (cookies, localStorage, IndexedDB) is persisted and reused across tests.

### Global Setup

The `playwright.global-setup.ts` file:

1. Launches browser on first run
2. Navigates to the app to populate IndexedDB cache
3. Saves storage state to `test-results/storage-state/state.json`
4. Subsequent tests reuse this state

### Benefits

- **Faster Test Startup**: Tests start with pre-populated cache
- **Reduced API Calls**: IndexedDB already contains cached data
- **Consistent State**: All tests share the same baseline storage

### Manual Cache Warming

Force cache warmup:

```bash
E2E_WARM_CACHE=true pnpm nx e2e web
```

## Environment Variables

### E2E_WARM_CACHE

- **Default**: `false`
- **Description**: Forces cache warmup even if storage state exists
- **Usage**: `E2E_WARM_CACHE=true pnpm nx e2e web`

### E2E_REFRESH_CACHE

- **Default**: `false`
- **Description**: Re-records HAR files (updates network cache)
- **Usage**: `E2E_REFRESH_CACHE=true pnpm nx e2e web`

### E2E_BASE_URL

- **Default**: `http://localhost:5173`
- **Description**: Base URL for tests
- **Usage**: `E2E_BASE_URL=https://example.com pnpm nx e2e web`

## Build Artifact Caching

Nx and Vite build artifacts are cached:

```yaml
- name: Cache Nx build artifacts
  uses: actions/cache@v4
  with:
    path: |
      .nx/cache
      **/node_modules/.cache
      **/.vite
    key: ${{ runner.os }}-nx-e2e-${{ hashFiles('nx.json', '**/project.json', 'pnpm-lock.yaml') }}
```

## Cache Statistics

### Viewing Cache Stats

Cache statistics are automatically logged during test execution:

```
🚀 Starting Playwright global setup...
✅ Created storage state directory: /path/to/storage-state
✅ Created HAR cache directory: /path/to/har-cache
🔥 Warming cache with initial application load...
📡 Loading http://localhost:5173 to warm cache...
✅ Storage state saved to: /path/to/state.json
📊 Cache statistics: {
  indexedDBStores: ['cache', 'metadata'],
  localStorageKeys: ['theme', 'settings']
}
✨ Global setup complete!

...

📈 Cache stats for "should load work detail":
   Hits: 15, Misses: 0
   Hit rate: 100%
```

### CI Cache Efficiency

The CI workflow logs cache hit/miss status:

```
Cache Playwright browsers
  Cache restored from key: playwright-browsers-Linux-1.40.0

Cache test data
  Cache restored from key: e2e-test-data-Linux-abc123-v1
```

## Performance Impact

### Before Caching

- **First Run**: 10 minutes (30 URLs × 20s avg)
- **Dependencies Install**: 2-3 minutes
- **Browser Install**: 1-2 minutes
- **Build**: 2-3 minutes
- **Total**: ~15-18 minutes

### After Caching

- **First Run**: 10 minutes (initial HAR recording)
- **Subsequent Runs**: 2-3 minutes (HAR replay)
- **Dependencies Install**: 30-60 seconds (cached)
- **Browser Install**: 10-20 seconds (cached)
- **Build**: 1-2 minutes (cached artifacts)
- **Total**: ~4-6 minutes (60-65% improvement)

## Cache Invalidation

### When Caches Are Invalidated

1. **Playwright Browser**: When `@playwright/test` version changes
2. **pnpm Store**: When `pnpm-lock.yaml` changes
3. **Test Data**: When `openalex-urls-sample.json` changes or cache version bumps
4. **Build Artifacts**: When config files or dependencies change

### Manual Cache Invalidation

```bash
# Clear local test results
rm -rf apps/web/test-results

# Clear Nx cache
npx nx reset

# Force cache refresh on next run
E2E_REFRESH_CACHE=true E2E_WARM_CACHE=true pnpm nx e2e web
```

## Troubleshooting

### HAR Files Not Being Used

1. Check if HAR files exist: `ls -lh apps/web/test-results/har-cache/`
2. Enable refresh: `E2E_REFRESH_CACHE=true pnpm nx e2e web`
3. Check console logs for "Using cached HAR" vs "Recording HAR"

### Storage State Issues

1. Delete existing state: `rm apps/web/test-results/storage-state/state.json`
2. Force warmup: `E2E_WARM_CACHE=true pnpm nx e2e web`
3. Check global setup logs for errors

### CI Cache Not Restoring

1. Check GitHub Actions logs for cache restore status
2. Verify cache key matches (Playwright version, lock file hash)
3. Caches expire after 7 days of no access

## Best Practices

1. **Use Cache Fixtures**: Prefer `{ cachedPage, cacheStats }` for automatic HAR management
2. **Monitor Cache Hit Rates**: Check logs for hit rates below 80%
3. **Refresh Periodically**: Run `E2E_REFRESH_CACHE=true` weekly to update test data
4. **Version Cache Keys**: Bump cache version when changing cache strategy
5. **Clean Old Files**: Periodically remove unused HAR files

## File Structure

```
apps/web/
├── playwright.config.ts                 # Main Playwright config
├── playwright.global-setup.ts           # Cache warming and setup
├── playwright.global-teardown.ts        # Cleanup and stats
├── E2E_CACHING.md                       # This documentation
└── src/test/
    ├── fixtures/
    │   └── cache-fixtures.ts            # Test fixtures with HAR caching
    ├── e2e/
    │   ├── sample-urls-ci.e2e.test.ts  # CI test suite
    │   └── ...                          # Other test files
    └── test-results/
        ├── storage-state/
        │   └── state.json               # Persisted browser storage
        ├── har-cache/
        │   ├── abc12345.har             # Test-specific HAR files
        │   └── ...
        └── playwright-report/           # Test reports
```

## References

- [Playwright HAR Routing](https://playwright.dev/docs/api/class-browsercontext#browser-context-route-from-har)
- [Playwright Storage State](https://playwright.dev/docs/auth#reuse-signed-in-state)
- [GitHub Actions Caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [OpenAlex API Docs](https://docs.openalex.org/)
