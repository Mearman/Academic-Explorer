# Flaky Tests Documentation

**Spec**: 020-e2e-test-coverage
**Date**: 2025-11-26
**Status**: Implemented

## Summary

This document tracks flaky tests and the strategies implemented to eliminate flakiness in the E2E test suite.

## Flakiness Prevention Strategy

### Deterministic Wait Helpers

All E2E tests use deterministic wait helpers instead of arbitrary timeouts or `networkidle`:

| Helper | Purpose | Location |
|--------|---------|----------|
| `waitForAppReady()` | Wait for full app initialization | `apps/web/src/test/helpers/app-ready.ts` |
| `waitForEntityData()` | Wait for entity detail page data | `apps/web/src/test/helpers/app-ready.ts` |
| `waitForSearchResults()` | Wait for search results to render | `apps/web/src/test/helpers/app-ready.ts` |
| `waitForGraphReady()` | Wait for D3 force simulation complete | `apps/web/src/test/helpers/app-ready.ts` |
| `waitForRouterReady()` | Wait for TanStack Router stable | `apps/web/src/test/helpers/app-ready.ts` |
| `waitForNoLoading()` | Wait for all loading states to clear | `apps/web/src/test/helpers/app-ready.ts` |

### Serial Execution

E2E tests run serially to prevent:
- Resource contention (memory, network)
- Race conditions between test suites
- OOM errors from parallel browser instances

Configuration (`apps/web/playwright.config.ts`):
```typescript
workers: 1,
maxConcurrency: 1,
```

### API Mocking for Error Tests

Error scenario tests (T049-T053) use Playwright's `route()` to mock API responses deterministically instead of relying on actual network failures.

## Known Flakiness Patterns

### Pattern 1: Navigation Timing
**Issue**: Tests fail when checking URL before navigation completes.
**Solution**: Use `page.waitForURL()` with pattern matching.

```typescript
// Bad - flaky
await page.click('[data-testid="link"]');
expect(page.url()).toContain('/target');

// Good - deterministic
await page.click('[data-testid="link"]');
await page.waitForURL(/\/target/);
```

### Pattern 2: Loading State Races
**Issue**: Tests check for content before loading completes.
**Solution**: Use `waitForNoLoading()` before assertions.

```typescript
// Bad - flaky
await searchPage.submitSearch();
const resultCount = await searchPage.getResultCount();

// Good - deterministic
await searchPage.submitSearch();
await waitForSearchResults(page);
await waitForNoLoading(page);
const resultCount = await searchPage.getResultCount();
```

### Pattern 3: Animation/Transition Timing
**Issue**: Tests interact with elements during animations.
**Solution**: Wait for specific DOM states rather than time-based delays.

```typescript
// Bad - flaky
await page.waitForTimeout(500);
await element.click();

// Good - deterministic
await expect(element).toBeVisible();
await expect(element).toBeEnabled();
await element.click();
```

### Pattern 4: IndexedDB Initialization
**Issue**: Tests fail when storage isn't initialized.
**Solution**: Use `waitForAppReady()` which includes storage initialization check.

### Pattern 5: Graph Simulation Completion
**Issue**: Tests check graph state before force simulation completes.
**Solution**: Use `waitForGraphReady()` which waits for simulation tick completion.

## Flaky Tests Log

| Date | Test File | Test Name | Cause | Fix | Status |
|------|-----------|-----------|-------|-----|--------|
| - | - | No flaky tests identified | - | - | - |

## Verification Process

### Local Verification
```bash
# Run E2E suite multiple times
for i in {1..10}; do
  echo "Run $i..."
  pnpm nx e2e web 2>&1 | tee -a e2e-runs.log
done

# Check for failures
grep -c "FAILED" e2e-runs.log
```

### CI Verification (T084)
The CI pipeline runs the E2E suite on every push. Flaky tests are identified by:
1. Monitoring test results over time
2. Using GitHub Actions' test retry feature
3. Reviewing test logs for intermittent failures

**Success Criteria (SC-012)**: Zero flaky tests over 10 consecutive CI runs.

## Guidelines for Writing Non-Flaky Tests

1. **Always use wait helpers** - Never assume page state without verification
2. **Use specific selectors** - Avoid generic selectors that might match multiple elements
3. **Check element state before interaction** - Verify visible, enabled, not covered
4. **Mock external dependencies** - Use API mocking for error scenarios
5. **Avoid time-based waits** - Use DOM state assertions instead of `waitForTimeout`
6. **Test isolation** - Each test should be independent, no shared state
7. **Serial execution** - Don't assume tests can run in parallel

## Retry Configuration

For legitimate network flakiness (external API calls), tests can use retry:

```typescript
test.describe('API Tests', () => {
  // Retry flaky API tests up to 2 times
  test.describe.configure({ retries: 2 });

  test('should fetch entity data', async ({ page }) => {
    // Test implementation
  });
});
```

**Note**: Retry should only be used for genuine external flakiness, not to mask test design issues.

## Monitoring

### CI Dashboard
Monitor test stability via:
- GitHub Actions test results
- Test run duration trends
- Failure rate metrics

### Alerts
Set up alerts for:
- Test failure rate > 5%
- Test duration increase > 20%
- New flaky tests introduced

## Next Steps

1. Monitor CI runs over 10 consecutive pushes
2. Document any new flaky tests in this log
3. Fix flaky tests using deterministic patterns
4. Update this document with findings
