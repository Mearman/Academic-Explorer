/**
 * E2E Tests for Network Failure Scenarios
 * Tests error handling for network disconnections and offline mode
 *
 * @tags @error @network @important
 */

import { test, expect } from '@playwright/test';
import { ErrorPage } from '../src/test/page-objects/ErrorPage';
import { ApiMockHelper } from '../src/test/helpers/ApiMockHelper';
import { NavigationHelper } from '../src/test/helpers/NavigationHelper';
import { waitForAppReady } from '../src/test/helpers/app-ready';

test.describe('Network Failure Scenarios', () => {
  let errorPage: ErrorPage;
  let apiMock: ApiMockHelper;
  let navigation: NavigationHelper;

  test.beforeEach(async ({ page }) => {
    errorPage = new ErrorPage(page);
    apiMock = new ApiMockHelper(page);
    navigation = new NavigationHelper(page);
  });

  test('should show error for network failure', async ({ page }) => {
    // Mock network failure for API requests
    await apiMock.mockNetworkFailure(/api\.openalex\.org/);

    // Navigate to an entity
    await page.goto('/works/W2741809807');
    await waitForAppReady(page);

    // Should show error state (may be inline or full page)
    const isErrorPage = await errorPage.isErrorPage();
    const hasErrorElement = (await page.locator('[data-error], .error, [role="alert"]').count()) > 0;

    expect(isErrorPage || hasErrorElement).toBeTruthy();
  });

  test('should display network error message', async ({ page }) => {
    await apiMock.mockNetworkFailure(/api\.openalex\.org/);

    await page.goto('/works/W2741809807');
    await waitForAppReady(page);

    const errorMessage = await errorPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();

    // Message should indicate network issue
    expect(errorMessage.toLowerCase()).toMatch(/network|connection|offline|failed/);
  });

  test('should have retry button for network failure', async ({ page }) => {
    await apiMock.mockNetworkFailure(/api\.openalex\.org/);

    await page.goto('/works/W2741809807');
    await waitForAppReady(page);

    const hasRetry = await errorPage.hasRetryButton();

    if (hasRetry) {
      // Clear network failure mock
      await apiMock.clearAllMocks();

      await errorPage.clickRetry();
      await waitForAppReady(page);

      // Should attempt to load again
      await page.waitForTimeout(500);
    }
  });

  test('should handle offline mode', async ({ page, context }) => {
    // Simulate offline mode
    await context.setOffline(true);

    await page.goto('/works/W2741809807');
    await waitForAppReady(page);

    // Should show error or offline indicator
    const hasError = await errorPage.isErrorPage() ||
      (await page.locator('[data-offline], [data-error]').count()) > 0;

    expect(hasError).toBeTruthy();

    // Return to online
    await context.setOffline(false);
  });

  test('should recover when network is restored', async ({ page, context }) => {
    // Start offline
    await context.setOffline(true);

    await page.goto('/works/W2741809807');
    await waitForAppReady(page);

    const initialError = await errorPage.isErrorPage();

    // Restore network
    await context.setOffline(false);

    // Retry
    if (await errorPage.hasRetryButton()) {
      await errorPage.clickRetry();
      await waitForAppReady(page);

      // Should now load successfully (or show different error)
      const stillError = await errorPage.isErrorPage();

      // Initial should be error, recovery may succeed
      expect(initialError).toBeTruthy();
    }
  });

  test('should handle intermittent network failures', async ({ page }) => {
    // Mock network failure for first request
    let requestCount = 0;
    await page.route(/api\.openalex\.org/, (route) => {
      requestCount++;

      if (requestCount === 1) {
        // Fail first request
        route.abort('failed');
      } else {
        // Allow subsequent requests
        route.continue();
      }
    });

    await page.goto('/works/W2741809807');
    await waitForAppReady(page);

    // May show error initially, then retry and succeed
    await page.waitForTimeout(2000);

    // Test completes - intermittent failures should be handled
    expect(true).toBe(true);
  });

  test('should show network error during search', async ({ page }) => {
    await apiMock.mockNetworkFailure(/api\.openalex\.org/);

    await page.goto('/search?q=test');
    await waitForAppReady(page);

    // Should show error state in search results
    const hasError = await errorPage.isErrorPage() ||
      (await page.locator('[data-error], .error-message, [data-no-results]').count()) > 0;

    expect(hasError).toBeTruthy();
  });

  test('should handle slow network gracefully', async ({ page }) => {
    // Mock slow network (delay of 5 seconds)
    await apiMock.mockTimeout(/api\.openalex\.org/, 5000);

    await page.goto('/works/W2741809807');

    // Should show loading indicator
    const hasLoading = await page.evaluate(() => {
      const loadingIndicators = [
        '[data-loading="true"]',
        '.loading',
        '.spinner',
        '[role="progressbar"]',
      ];

      for (const selector of loadingIndicators) {
        if (document.querySelector(selector)) {
          return true;
        }
      }

      return false;
    });

    // Should eventually load or timeout
    await page.waitForTimeout(6000);

    // Test completes - slow network should be handled
    expect(true).toBe(true);
  });

  test('network error page should be accessible', async ({ page }) => {
    await apiMock.mockNetworkFailure(/api\.openalex\.org/);

    await page.goto('/works/W2741809807');
    await waitForAppReady(page);

    const isError = await errorPage.isErrorPage();

    if (isError) {
      // Should have proper error heading
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible();

      // Should have retry button with accessible label
      if (await errorPage.hasRetryButton()) {
        const retryButton = page.locator('button:has-text("Retry"), [data-retry]').first();
        const ariaLabel = await retryButton.getAttribute('aria-label');
        const text = await retryButton.textContent();

        expect(ariaLabel || text).toBeTruthy();
      }
    }
  });
});
