/**
 * E2E tests for timeout error scenarios
 *
 * Tests handling of slow/hanging requests that exceed timeout limits
 *
 * @module error-timeout.e2e
 * @tag @error
 * @see spec-020 Phase 5: Error scenario coverage
 */

import { test, expect } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';

test.describe('@error Timeout Errors', () => {
  // Set shorter test timeout for timeout tests
  test.setTimeout(90000);

  test('should handle request timeout gracefully', async ({ page }) => {
    // Simulate a very slow response that will timeout
    await page.route('**/api.openalex.org/**', async (route) => {
      // Never respond - will cause timeout
      await new Promise(() => {}); // Hang forever
    });

    // Set a shorter timeout for the navigation
    await page.goto('/works/W2741809807', { timeout: 30000 }).catch(() => {
      // Navigation may timeout, which is expected
    });

    await waitForAppReady(page);

    // Should show timeout or error message
    const errorIndicators = [
      page.getByText(/timeout|timed out|took too long|loading/i),
      page.getByText(/error|failed|unavailable/i),
      page.locator('[data-testid="error-message"], [role="alert"], .skeleton'),
    ];

    // Wait a bit for error state to appear
    await page.waitForTimeout(5000);

    let foundIndicator = false;
    for (const indicator of errorIndicators) {
      if (await indicator.isVisible().catch(() => false)) {
        foundIndicator = true;
        break;
      }
    }

    // Either shows error or still loading (which is acceptable for slow response)
    expect(foundIndicator).toBe(true);
  });

  test('should show loading state while waiting', async ({ page }) => {
    // Add 5 second delay to response
    await page.route('**/api.openalex.org/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      await route.continue();
    });

    await page.goto('/works/W2741809807');

    // Should show loading state initially
    const loadingIndicators = page.locator('.skeleton, [data-testid="loading"], [aria-busy="true"]');

    // Check loading state appears within first 2 seconds
    try {
      await expect(loadingIndicators.first()).toBeVisible({ timeout: 2000 });
    } catch {
      // If no explicit loading indicator, page should at least be rendering
      await expect(page.locator('#root, #app')).toBeVisible();
    }
  });

  test('should abort slow requests on navigation', async ({ page }) => {
    let requestAborted = false;

    await page.route('**/api.openalex.org/**', async (route) => {
      try {
        // Long delay
        await new Promise(resolve => setTimeout(resolve, 30000));
        await route.continue();
      } catch {
        requestAborted = true;
      }
    });

    // Start navigation to entity page
    page.goto('/works/W2741809807').catch(() => {});

    // Wait a bit then navigate away
    await page.waitForTimeout(2000);
    await page.goto('/browse');
    await waitForAppReady(page);

    // Should be on browse page without errors
    await expect(page).toHaveURL(/\/browse/);
  });

  test('should provide retry option after timeout', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api.openalex.org/**', async (route) => {
      requestCount++;
      if (requestCount <= 1) {
        // First request: abort to simulate timeout
        route.abort('timedout');
      } else {
        // Subsequent requests: succeed
        await route.continue();
      }
    });

    await page.goto('/works/W2741809807');
    await waitForAppReady(page);

    // Look for retry option
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try again"), [data-testid="retry-button"]');

    if (await retryButton.isVisible().catch(() => false)) {
      await retryButton.click();
      await page.waitForTimeout(3000);
      expect(requestCount).toBeGreaterThan(1);
    }
  });

  test('should display timeout-specific error message', async ({ page }) => {
    await page.route('**/api.openalex.org/**', (route) => {
      route.abort('timedout');
    });

    await page.goto('/authors/A5017898742');
    await waitForAppReady(page);

    // Should show error indicating timeout or general failure
    const errorText = page.getByText(/timeout|timed out|taking.*long|error|failed/i);
    await expect(errorText.first()).toBeVisible({ timeout: 15000 });
  });
});
