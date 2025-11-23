# E2E Test Quickstart Guide

**Feature**: E2E Test Coverage Enhancement
**Date**: 2025-11-23
**Phase**: Phase 1 (Design & Data Models)

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

### Smoke Suite (32 tests, ~2 minutes)

The smoke suite runs a subset of critical tests for quick validation:

```bash
# Run smoke suite
pnpm nx e2e web

# Alternative: Direct Playwright command
pnpm exec playwright test apps/web/e2e/sample-urls-ci.e2e.test.ts
```

**What's tested**:
- Sample URLs for all 12 entity types
- Critical navigation paths
- Basic error scenarios
- Essential smoke tests

### Full Suite (~642 tests, ~30 minutes)

The full suite runs ALL E2E tests across the application:

```bash
# Run full suite
E2E_FULL_SUITE=true pnpm nx e2e web

# With HTML report
E2E_FULL_SUITE=true pnpm nx e2e web --reporter=html
```

**What's tested**:
- All entity routes and workflows
- Comprehensive error scenarios
- Accessibility scans
- Performance benchmarks
- Manual test automation

### Specific Test Files

Run individual test files for focused testing:

```bash
# Run specific test file
pnpm exec playwright test apps/web/e2e/domains.e2e.test.ts

# Run tests matching pattern
pnpm exec playwright test --grep "entity detail"

# Run tests in specific directory
pnpm exec playwright test apps/web/src/test/e2e/
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

Use page objects from `specs/020-e2e-test-coverage/contracts/page-objects.ts`:

```typescript
import { test, expect } from '@playwright/test';
import type { EntityDetailPage } from '@/specs/020-e2e-test-coverage/contracts/page-objects';

test.describe('Domains Entity Detail', () => {
  let detailPage: EntityDetailPage;

  test.beforeEach(async ({ page }) => {
    // Initialize page object (implementation TBD)
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

## Debugging Failed Tests

### Headed Mode (See Browser)

Run tests with visible browser to observe interactions:

```bash
# Run with headed browser
pnpm exec playwright test --headed apps/web/e2e/domains.e2e.test.ts

# Run with headed + slow motion
pnpm exec playwright test --headed --slow-mo=1000 apps/web/e2e/domains.e2e.test.ts
```

### Debug Mode (Step Through)

Use Playwright Inspector to step through tests:

```bash
# Run test with debugging
pnpm exec playwright test --debug apps/web/e2e/domains.e2e.test.ts

# Run test with debugging from specific line
PWDEBUG=console pnpm exec playwright test apps/web/e2e/domains.e2e.test.ts
```

**Inspector Features**:
- Set breakpoints
- Step over/into actions
- Inspect page state
- View console logs
- Record new actions

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

### Common Issues and Solutions

**Issue: Test timeout**
```typescript
// Increase timeout for specific test
test('slow operation', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ... test code
});
```

**Issue: Element not found**
```typescript
// Use deterministic wait instead of sleep
await page.waitForSelector('[data-testid="entity-title"]', { state: 'visible' });

// NOT: await page.waitForTimeout(1000);
```

**Issue: Flaky test (passes sometimes)**
```typescript
// Use app-ready checks instead of networkidle
await page.goto('/#/works/W123', { waitUntil: 'commit' });
await page.waitForSelector('[data-testid="entity-data"]', { state: 'visible' });

// NOT: await page.goto('/#/works/W123', { waitUntil: 'networkidle' });
```

**Issue: Storage pollution between tests**
```typescript
// Clear storage in beforeEach
test.beforeEach(async ({ page }) => {
  // Clear IndexedDB, localStorage, sessionStorage
  await page.evaluate(() => {
    indexedDB.deleteDatabase('academic-explorer');
    localStorage.clear();
    sessionStorage.clear();
  });
});
```

---

## Performance Optimization

### Serial Execution (Required)

Tests MUST run serially to prevent OOM errors:

**playwright.config.ts**:
```typescript
export default defineConfig({
  workers: 1, // Serial execution
  fullyParallel: false,
  maxConcurrency: 1,
});
```

**Why**: Parallel execution causes memory exhaustion with 8GB heap limit.

### Memory Management

```bash
# Run tests with increased memory (if needed)
NODE_OPTIONS="--max-old-space-size=8192" pnpm exec playwright test

# Monitor memory usage during test run
NODE_OPTIONS="--max-old-space-size=8192 --expose-gc" pnpm exec playwright test
```

### Test Isolation

Each test should be fully isolated:

```typescript
test.beforeEach(async ({ page, context }) => {
  // Clear storage
  await context.clearCookies();
  await context.clearPermissions();

  // Reset API mocks
  await resetMswHandlers();

  // Initialize fresh state
  await initializeSpecialLists();
});
```

---

## Accessibility Testing

### Run Accessibility Scans

Use `@axe-core/playwright` for WCAG 2.1 AA validation:

```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

test('domain detail page is accessible', async ({ page }) => {
  await page.goto('/#/domains/D12345');
  await page.waitForSelector('[data-testid="entity-data"]');

  // Inject axe-core
  await injectAxe(page);

  // Run accessibility scan
  await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: { html: true },
  });
});
```

### Accessibility Report

```bash
# Run accessibility tests
pnpm exec playwright test --grep "@a11y"

# View accessibility violations in report
pnpm exec playwright show-report
```

---

## Coverage Reporting

### Generate Coverage Report

**Route Coverage** (Primary Metric):
```bash
# Run full suite with coverage tracking
E2E_FULL_SUITE=true pnpm nx e2e web

# Coverage script (TBD in Phase 3)
pnpm run coverage:routes
```

**Code Coverage** (Secondary Metric):
```bash
# Run tests with V8 coverage (requires @bgotink/playwright-coverage)
E2E_FULL_SUITE=true pnpm exec playwright test --coverage

# View coverage report
pnpm exec playwright show-report
```

### Coverage Goals

**Success Criteria**:
- SC-011: Route coverage increases by 20+ percentage points
- SC-008: Individual test execution time <60 seconds
- SC-009: Smoke suite <10 minutes, full suite <30 minutes

---

## CI/CD Integration

### GitHub Actions

E2E tests run in CI pipeline (`.github/workflows/ci.yml`):

```yaml
e2e:
  runs-on: ubuntu-latest
  steps:
    - name: Install dependencies
      run: pnpm install

    - name: Install Playwright
      run: pnpm exec playwright install --with-deps chromium

    - name: Run E2E tests
      run: E2E_FULL_SUITE=true pnpm nx e2e web
      env:
        NODE_OPTIONS: --max-old-space-size=8192

    - name: Upload test report
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: apps/web/playwright-report/
```

### Local CI Simulation

Simulate CI environment locally:

```bash
# Run tests in CI mode
CI=true E2E_FULL_SUITE=true pnpm nx e2e web

# With exact CI environment
NODE_OPTIONS="--max-old-space-size=8192" NX_DAEMON=false pnpm nx e2e web
```

---

## Configuration Files

### Playwright Config

**Location**: `apps/web/playwright.config.ts`

**Key settings**:
```typescript
export default defineConfig({
  testDir: './e2e',
  testMatch: process.env.E2E_FULL_SUITE
    ? ['**/*.e2e.test.ts']
    : ['**/sample-urls-ci.e2e.test.ts'],
  workers: 1, // Serial execution
  timeout: 60000, // 60 seconds per test
  expect: { timeout: 5000 },
  use: {
    baseURL: process.env.CI
      ? 'http://localhost:4173' // Preview server in CI
      : 'http://localhost:5173', // Dev server locally
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

### TypeScript Config

**Location**: `apps/web/tsconfig.json`

**Path mappings**:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/specs/*": ["../../specs/*"]
    }
  }
}
```

---

## Best Practices

### 1. Use Deterministic Waits

❌ **Bad**:
```typescript
await page.waitForTimeout(2000); // Arbitrary delay
await page.goto('/#/works/W123', { waitUntil: 'networkidle' }); // Generic wait
```

✅ **Good**:
```typescript
await page.waitForSelector('[data-testid="entity-title"]', { state: 'visible' });
await page.waitForFunction(() => window.appReady === true);
```

### 2. Isolate Storage

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

### 3. Use Page Objects

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

### 4. Test One Thing

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

### 5. Use Test Tags

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

## Next Steps

1. **Implement Phase 2**: Run `/speckit.tasks` to generate task breakdown
2. **Create Page Objects**: Implement interfaces from `contracts/page-objects.ts`
3. **Create Test Helpers**: Implement interfaces from `contracts/test-helpers.ts`
4. **Write Tests**: Follow coverage gap analysis from spec.md
5. **Verify Coverage**: Run coverage scripts and verify 20+ percentage point increase

---

## Resources

- **Playwright Documentation**: https://playwright.dev/docs/intro
- **Academic Explorer Spec**: `specs/020-e2e-test-coverage/spec.md`
- **Research Findings**: `specs/020-e2e-test-coverage/research.md`
- **Data Models**: `specs/020-e2e-test-coverage/data-model.md`
- **Constitution**: `.specify/memory/constitution.md`

---

**Last Updated**: 2025-11-23
**Version**: 1.0.0
