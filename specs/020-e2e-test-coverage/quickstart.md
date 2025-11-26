# E2E Test Coverage - Quick Start Guide

**Feature**: E2E Test Coverage Enhancement
**Date**: 2025-11-26
**Status**: Complete (Phases 1-6)

## Overview

This guide provides instructions for running, developing, and debugging E2E tests in the Academic Explorer web application. The test suite uses Playwright Test with TypeScript and follows serial execution to prevent OOM errors.

---

## Prerequisites

**Required**:
- Node.js 18+ (project uses 20.x)
- pnpm 10.x (package manager)
- Playwright browsers installed

**Installation**:
```bash
# Install dependencies
pnpm install

# Install Playwright browsers (first time only)
pnpm exec playwright install chromium
```

---

## Running E2E Tests

### Smoke Suite (Default)

The smoke suite runs a subset of critical tests for quick validation:

```bash
pnpm nx e2e web
```

**What's tested**:
- Sample URLs for all 12 entity types
- Critical navigation paths
- Basic error scenarios
- Essential smoke tests

### Full Suite

The full suite runs ALL E2E tests across the application:

```bash
E2E_FULL_SUITE=true pnpm nx e2e web
```

**What's tested**:
- All entity routes and workflows
- Comprehensive error scenarios
- Accessibility scans
- Performance benchmarks
- Manual test automation

### By Category

Run tests filtered by category tags:

```bash
# Entity tests
pnpm nx e2e web --grep="@entity"

# Workflow tests
pnpm nx e2e web --grep="@workflow"

# Error tests
pnpm nx e2e web --grep="@error"

# Automated manual tests
pnpm nx e2e web --grep="@automated-manual"

# Utility pages
pnpm nx e2e web --grep="@utility"
```

### Individual Tests

Run specific test files or patterns:

```bash
# Run specific entity tests
pnpm nx e2e web --grep="domains"
pnpm nx e2e web --grep="works"
pnpm nx e2e web --grep="authors"

# Run specific workflow
pnpm nx e2e web --grep="search-workflow"

# Run specific test file
pnpm exec playwright test apps/web/e2e/domains.e2e.test.ts
```

### Debug Mode

Debug tests with visual browser and step-through execution:

```bash
# Run with visible browser
pnpm nx e2e web --headed

# Run with debugging (Playwright Inspector)
pnpm nx e2e web --debug

# Run with slow motion
pnpm nx e2e web --headed --slow-mo=1000

# Debug specific test
pnpm exec playwright test --debug apps/web/e2e/domains.e2e.test.ts
```

### UI Mode (Interactive Testing)

Playwright UI mode provides interactive test execution with time-travel debugging:

```bash
# Launch UI mode
pnpm exec playwright test --ui

# Launch UI mode for specific file
pnpm exec playwright test --ui apps/web/e2e/works.e2e.test.ts
```

**Features**:
- Watch test execution in real-time
- Step through test actions
- Inspect DOM at any point
- View screenshots and traces
- Re-run failed tests

---

## Test Organization

Test files are organized by feature area and time period:

- `apps/web/e2e/` - Modern E2E tests (spec-013+)
- `apps/web/src/test/e2e/` - Legacy E2E tests
- `apps/web/src/test/page-objects/` - Page object implementations
- `apps/web/src/test/helpers/` - Test utilities

### Page Object Hierarchy

```
BasePageObject → BaseSPAPageObject → BaseEntityPageObject → [Entity]DetailPage
```

**Example**: `DomainsDetailPage extends BaseEntityPageObject`

---

## Troubleshooting

### Memory Issues

Tests run serially to prevent OOM errors. If you see memory issues:

```bash
NODE_OPTIONS=--max-old-space-size=8192 pnpm nx e2e web
```

### Flaky Tests

Use deterministic wait helpers instead of `networkidle`:

```typescript
import { waitForAppReady, waitForEntityData } from '@/test/helpers/app-ready';

// Good: Deterministic wait
await page.goto('/#/works/W123', { waitUntil: 'commit' });
await waitForEntityData(page);

// Bad: Non-deterministic wait
await page.goto('/#/works/W123', { waitUntil: 'networkidle' });
```

### Nx Cache Issues

If tests behave unexpectedly due to cache corruption:

```bash
nx reset
pnpm nx e2e web
```

### Storage Pollution

Clear storage between tests to prevent pollution:

```typescript
test.beforeEach(async ({ page }) => {
  await page.evaluate(() => {
    indexedDB.deleteDatabase('academic-explorer');
    localStorage.clear();
    sessionStorage.clear();
  });
});
```

### Element Not Found

Use deterministic selectors and waits:

```typescript
// Good: Wait for specific element
await page.waitForSelector('[data-testid="entity-title"]', { state: 'visible' });

// Bad: Arbitrary timeout
await page.waitForTimeout(1000);
```

### Test Timeouts

Increase timeout for slow operations:

```typescript
test('slow operation', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ... test code
});
```

---

## Test Development Workflow

### 1. Identify Coverage Gap

Review the coverage gap analysis in `specs/020-e2e-test-coverage/spec.md`:

**Example Gap**:
- **Route**: `/domains/$domainId`
- **Type**: Untested route
- **Priority**: P1 (Critical)
- **Description**: Domain detail page has no E2E tests

### 2. Create Test File

**Location Strategy**:
- **New tests** (spec-013+): `apps/web/e2e/*.e2e.test.ts`
- **Legacy tests** (pre-spec-013): `apps/web/src/test/e2e/*.e2e.test.ts`

**File naming**: `{feature-area}.e2e.test.ts`

**Example**:
```bash
# Create new test file for domains
touch apps/web/e2e/domains.e2e.test.ts
```

### 3. Write Test Using Page Objects

Use page objects from `apps/web/src/test/page-objects/`:

```typescript
import { test, expect } from '@playwright/test';
import { DomainsDetailPage } from '@/test/page-objects/domains-detail-page';

test.describe('Domains Entity Detail', () => {
  let detailPage: DomainsDetailPage;

  test.beforeEach(async ({ page }) => {
    detailPage = new DomainsDetailPage(page);
  });

  test('should display domain title and metadata', async () => {
    // Arrange: Navigate to domain
    await detailPage.goto('D12345');

    // Act: Wait for data to load
    await detailPage.waitForEntityData();

    // Assert: Verify title and metadata
    const title = await detailPage.getEntityTitle();
    expect(title).toBeTruthy();
    expect(await detailPage.hasEntityData()).toBe(true);
  });

  test('should display relationships', async () => {
    await detailPage.goto('D12345');
    await detailPage.waitForEntityData();

    // Verify relationship counts
    expect(await detailPage.hasRelationships()).toBe(true);
    expect(await detailPage.getIncomingRelationshipCount()).toBeGreaterThan(0);
  });
});
```

### 4. Follow Red-Green-Refactor

**Red**: Write test that fails
```bash
# Run test (should fail initially)
pnpm exec playwright test apps/web/e2e/domains.e2e.test.ts
```

**Green**: Implement fix/feature to make test pass
```bash
# Implement page object or fix bug
# Then run test again (should pass)
pnpm exec playwright test apps/web/e2e/domains.e2e.test.ts
```

**Refactor**: Clean up code while keeping tests green
```bash
# Run test again to verify refactor didn't break anything
pnpm exec playwright test apps/web/e2e/domains.e2e.test.ts
```

### 5. Verify Test Locally

```bash
# Run test multiple times to check for flakiness
for i in {1..5}; do
  pnpm exec playwright test apps/web/e2e/domains.e2e.test.ts
done

# Run with trace for debugging
pnpm exec playwright test --trace on apps/web/e2e/domains.e2e.test.ts
```

### 6. Commit Atomically

Use conventional commit messages:

```bash
# Stage test file
git add apps/web/e2e/domains.e2e.test.ts

# Commit with conventional format
git commit -m "test(e2e): add domains entity detail tests

- Test domain title and metadata display
- Test relationship visualization
- Test graph rendering

Closes: Coverage Gap #gap-domains-detail (P1)"
```

---

## Debugging Tools

### View Test Report

After test run, view HTML report:

```bash
# Generate and open HTML report
pnpm exec playwright show-report

# Report location: apps/web/playwright-report/index.html
```

**Report Contents**:
- Test results summary
- Failed test details
- Screenshots on failure
- Trace files
- Video recordings (if enabled)

### View Trace

Traces provide detailed execution timeline:

```bash
# Run test with trace enabled
pnpm exec playwright test --trace on apps/web/e2e/domains.e2e.test.ts

# View trace for failed test
pnpm exec playwright show-trace apps/web/test-results/domains-should-display/trace.zip
```

**Trace Features**:
- Timeline of all actions
- Network requests
- Console logs
- Screenshots at each step
- DOM snapshots
- Time-travel debugging

### List Available Tests

View all available tests without running them:

```bash
# List all tests
pnpm nx e2e web --list

# List tests matching pattern
pnpm nx e2e web --grep="@entity" --list
```

---

## Best Practices

### Use Deterministic Waits

❌ **Bad**:
```typescript
await page.waitForTimeout(2000); // Arbitrary delay
await page.goto('/#/works/W123', { waitUntil: 'networkidle' }); // Generic wait
```

✅ **Good**:
```typescript
await page.waitForSelector('[data-testid="entity-title"]', { state: 'visible' });
await waitForEntityData(page);
```

### Isolate Storage

❌ **Bad**:
```typescript
test('test 1', async ({ page }) => {
  // Modifies storage, affects test 2
  await page.evaluate(() => localStorage.setItem('key', 'value'));
});

test('test 2', async ({ page }) => {
  // Assumes clean storage, but polluted by test 1
});
```

✅ **Good**:
```typescript
test.beforeEach(async ({ page }) => {
  // Clear storage before each test
  await page.evaluate(() => {
    indexedDB.deleteDatabase('academic-explorer');
    localStorage.clear();
    sessionStorage.clear();
  });
});
```

### Use Page Objects

❌ **Bad**:
```typescript
test('test', async ({ page }) => {
  // Direct DOM manipulation in test
  await page.goto('/#/works/W123');
  await page.locator('h1').textContent();
});
```

✅ **Good**:
```typescript
test('test', async ({ page }) => {
  const worksPage = new WorksDetailPage(page);
  await worksPage.goto('W123');
  const title = await worksPage.getEntityTitle();
});
```

### Test One Thing

❌ **Bad**:
```typescript
test('test everything', async ({ page }) => {
  // Tests navigation, data loading, relationships, graph, accessibility
  // Too broad - hard to debug failures
});
```

✅ **Good**:
```typescript
test('should display entity title', async ({ page }) => {
  // Tests one thing: title display
});

test('should display relationships', async ({ page }) => {
  // Tests one thing: relationships
});
```

### Use Test Tags

```typescript
test('critical path @smoke', async ({ page }) => {
  // Tagged as smoke test
});

test('accessibility check @a11y @slow', async ({ page }) => {
  // Tagged as accessibility and slow test
});

// Run only smoke tests
// pnpm exec playwright test --grep "@smoke"
```

---

## Advanced Usage

### CI/CD Simulation

Simulate CI environment locally:

```bash
# Run tests in CI mode
CI=true E2E_FULL_SUITE=true pnpm nx e2e web

# With exact CI environment variables
NODE_OPTIONS="--max-old-space-size=8192" NX_DAEMON=false pnpm nx e2e web
```

### Custom Reporters

Generate different report formats:

```bash
# HTML report (default)
pnpm nx e2e web --reporter=html

# JSON report
pnpm nx e2e web --reporter=json

# Line reporter (minimal output)
pnpm nx e2e web --reporter=line

# Multiple reporters
pnpm nx e2e web --reporter=html,json
```

### Video Recording

Capture video of test execution:

```bash
# Record all tests
pnpm nx e2e web --video=on

# Record only failures
pnpm nx e2e web --video=retain-on-failure

# Disable video
pnpm nx e2e web --video=off
```

---

## Configuration Reference

### Playwright Config

**Location**: `apps/web/playwright.config.ts`

**Key settings**:
```typescript
export default defineConfig({
  testDir: './e2e',
  testMatch: process.env.E2E_FULL_SUITE
    ? ['**/*.e2e.test.ts']
    : ['**/sample-urls-ci.e2e.test.ts'],
  workers: 1, // Serial execution (prevents OOM)
  timeout: 60000, // 60 seconds per test
  expect: { timeout: 5000 },
  use: {
    baseURL: 'http://localhost:5173', // Dev server
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

### Environment Variables

- `E2E_FULL_SUITE=true` - Run full test suite (all tests)
- `CI=true` - CI mode (affects baseURL and behavior)
- `NODE_OPTIONS=--max-old-space-size=8192` - Increase memory limit
- `NX_DAEMON=false` - Disable Nx daemon (CI mode)

---

## Resources

- **Playwright Documentation**: https://playwright.dev/docs/intro
- **Academic Explorer Spec**: `specs/020-e2e-test-coverage/spec.md`
- **Page Objects**: `apps/web/src/test/page-objects/`
- **Test Helpers**: `apps/web/src/test/helpers/`
- **Research Findings**: `specs/020-e2e-test-coverage/research.md`

---

**Last Updated**: 2025-11-26
**Version**: 2.0.0
**Status**: Complete (Phases 1-6)
