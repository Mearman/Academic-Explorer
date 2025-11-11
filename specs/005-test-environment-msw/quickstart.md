# Quick Start: MSW Integration for Playwright Tests

**Feature**: 005-test-environment-msw
**Audience**: Developers adding MSW to Playwright E2E tests
**Time to Complete**: 15-20 minutes

## Problem Statement

Playwright E2E tests are making real API calls to api.openalex.org, which returns HTTP 403 errors. This causes 27 out of 232 tests to fail. MSW (Mock Service Worker) will intercept these requests and return mock responses.

## Prerequisites

- MSW handlers already exist in `apps/web/src/test/msw/handlers.ts`
- Playwright is configured in `apps/web/playwright.config.ts`
- Node.js 18+ installed
- pnpm installed

## Implementation Steps

### Step 1: Verify MSW is Installed

```bash
cd apps/web
pnpm list msw
```

**Expected**: `msw@2.x.x` listed as devDependency

**If not installed**:
```bash
pnpm add -D msw@latest
```

---

### Step 2: Create MSW Setup File

**File**: `apps/web/test/setup/msw-setup.ts`

```typescript
/**
 * MSW Server Setup for Playwright Tests
 * Initializes MSW Node.js server to intercept OpenAlex API requests
 */

import { setupServer } from 'msw/node';
import { openalexHandlers } from '../msw/handlers';

// Initialize MSW server with OpenAlex handlers
export const mswServer = setupServer(...openalexHandlers);

// Configure server options
export function startMSWServer() {
  mswServer.listen({
    onUnhandledRequest: 'warn', // Warn about unmocked requests
  });
  console.log('✅ MSW server started for OpenAlex API mocking');
}

export function stopMSWServer() {
  mswServer.close();
  console.log('🛑 MSW server stopped');
}

export function resetMSWHandlers() {
  mswServer.resetHandlers();
  console.log('🔄 MSW handlers reset');
}
```

---

### Step 3: Update Playwright Global Setup

**File**: `apps/web/playwright.global-setup.ts`

Add MSW initialization at the **beginning** of `globalSetup` function:

```typescript
import { chromium, FullConfig } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { startMSWServer } from "./test/setup/msw-setup"; // ADD THIS

async function globalSetup(config: FullConfig) {
  // START MSW SERVER FIRST
  startMSWServer(); // ADD THIS
  console.log("🚀 MSW server initialized before tests");

  console.log("🚀 Starting Playwright global setup...");

  // ... rest of existing setup code
}

export default globalSetup;
```

**Why at the beginning?**
- MSW must intercept requests before any browser contexts are created
- Global setup runs before any tests, so MSW will be active for entire suite

---

### Step 4: Update Playwright Global Teardown

**File**: `apps/web/playwright.global-teardown.ts`

Add MSW cleanup at the **end** of `globalTeardown` function:

```typescript
import { FullConfig } from "@playwright/test";
import { stopMSWServer } from "./test/setup/msw-setup"; // ADD THIS

async function globalTeardown(config: FullConfig) {
  console.log("🧹 Starting Playwright global teardown...");

  // ... existing teardown code

  // STOP MSW SERVER LAST
  stopMSWServer(); // ADD THIS
  console.log("✨ Teardown complete!");
}

export default globalTeardown;
```

---

### Step 5: Verify Integration

Run a single E2E test to verify MSW is active:

```bash
cd apps/web
pnpm playwright test src/test/e2e/bookmarking.e2e.test.ts --headed
```

**Expected Console Output**:
```
✅ MSW server started for OpenAlex API mocking
🚀 Starting Playwright global setup...
... tests run ...
🛑 MSW server stopped
```

**Expected Test Behavior**:
- No real network requests to api.openalex.org
- No HTTP 403 errors in test output
- Tests use mock data from `createMockWork()`, `createMockAuthor()`, etc.

---

### Step 6: Run Full Test Suite

```bash
cd apps/web
pnpm test:e2e
```

**Expected Results**:
- 232/232 tests passing (up from 205/232)
- Zero HTTP 403 errors
- Test execution time: <5 minutes

---

## Troubleshooting

### Issue: MSW Not Intercepting Requests

**Symptoms**: Tests still fail with HTTP 403 errors

**Diagnosis**:
```bash
# Check if MSW handlers are loaded
grep "openalexHandlers" apps/web/test/setup/msw-setup.ts

# Check if globalSetup calls startMSWServer
grep "startMSWServer" apps/web/playwright.global-setup.ts
```

**Fix**:
- Ensure `startMSWServer()` is called **before** any browser contexts created
- Verify handlers are exported from `apps/web/src/test/msw/handlers.ts`

---

### Issue: "Request Not Mocked" Warnings

**Symptoms**: Console shows warnings like:
```
[MSW] Warning: captured a request without a matching request handler
```

**Diagnosis**: Request URL doesn't match any MSW handler patterns

**Fix**:
Check handler patterns in `apps/web/src/test/msw/handlers.ts`:
```typescript
http.get('https://api.openalex.org/works/:id', ...) // Matches /works/W123
http.get('https://api.openalex.org/*', ...) // Catch-all 404
```

Ensure request URL matches pattern exactly (including `https://` prefix).

---

### Issue: MSW Handlers Return Wrong Data

**Symptoms**: Tests fail because mock data doesn't match expectations

**Diagnosis**: Mock factories generate generic data, not specific test data

**Fix** (if specific data needed):
1. Create static fixture: `apps/web/test/fixtures/works/work-specific.json`
2. Update handler to check for static fixture first:
```typescript
http.get(`${API_BASE}/works/:id`, ({ params }) => {
  const { id } = params;

  // Check for static fixture
  const fixture = loadWorkFixture(id);
  if (fixture) return HttpResponse.json(fixture);

  // Fallback to factory
  return HttpResponse.json(createMockWork(id));
});
```

---

### Issue: MSW Server Doesn't Stop

**Symptoms**: MSW server keeps running after tests complete

**Diagnosis**: `globalTeardown` not called or `stopMSWServer()` missing

**Fix**:
```bash
# Verify globalTeardown is configured
grep "globalTeardown" apps/web/playwright.config.ts

# Should output:
# globalTeardown: "./playwright.global-teardown.ts",
```

If missing, add to `playwright.config.ts`:
```typescript
export default defineConfig({
  globalSetup: "./playwright.global-setup.ts",
  globalTeardown: "./playwright.global-teardown.ts", // ADD THIS
  // ... rest of config
});
```

---

## Advanced Usage

### Override Handlers for Specific Tests

```typescript
import { test } from '@playwright/test';
import { mswServer } from '../test/setup/msw-setup';
import { http, HttpResponse } from 'msw';

test('handle API error gracefully', async ({ page }) => {
  // Override handler to return 500 error
  mswServer.use(
    http.get('https://api.openalex.org/works/W123', () => {
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    })
  );

  // Test error handling logic
  await page.goto('/works/W123');
  await expect(page.locator('.error-message')).toBeVisible();

  // Handlers automatically reset after this test
});
```

### Add Custom Mock for New Endpoint

```typescript
// apps/web/src/test/msw/handlers.ts

export const openalexHandlers = [
  // ... existing handlers

  // NEW: Add /sources/:id endpoint
  http.get(`${API_BASE}/sources/:id`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id: `https://openalex.org/${id}`,
      display_name: `Mock Source ${id}`,
      type: 'journal',
      issn_l: '1234-5678',
      works_count: 1000,
      cited_by_count: 5000,
    });
  }),
];
```

---

## Summary

1. **MSW Setup**: Create `test/setup/msw-setup.ts` with `startMSWServer()` and `stopMSWServer()`
2. **Global Setup**: Call `startMSWServer()` in `playwright.global-setup.ts`
3. **Global Teardown**: Call `stopMSWServer()` in `playwright.global-teardown.ts`
4. **Verify**: Run tests and confirm no HTTP 403 errors
5. **Troubleshoot**: Use console output to diagnose issues

**Time Investment**: 15-20 minutes setup, saves hours of debugging flaky tests

**Next Steps**: Run full test suite and verify 232/232 tests pass
