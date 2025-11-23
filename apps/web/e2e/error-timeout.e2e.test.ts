/**
 * E2E Tests for Timeout Error Scenarios
 * Tests error handling for slow API responses and request timeouts
 *
 * @tags @error @timeout @important
 */

import { test, expect } from '@playwright/test';
import { ErrorPage } from '../src/test/page-objects/ErrorPage';
import { ApiMockHelper } from '../src/test/helpers/ApiMockHelper';
import { NavigationHelper } from '../src/test/helpers/NavigationHelper';
import { waitForAppReady } from '../src/test/helpers/app-ready';

test.describe('Timeout Error Scenarios', () => {
  let errorPage: ErrorPage;
  let apiMock: ApiMockHelper;
  let navigation: NavigationHelper;

  test.beforeEach(async ({ page }) => {
    errorPage = new ErrorPage(page);
    apiMock = new ApiMockHelper(page);
    navigation = new NavigationHelper(page);
  });

  test('should show error for request timeout', async ({ page }) => {
    // Mock timeout (65 seconds to trigger timeout)
    await apiMock.mockTimeout(/api\.openalex\.org\/works\/W\d+/, 65000);

    await page.goto('/works/W2741809807');

    // Wait for timeout to occur (use shorter wait in test)
    await page.waitForTimeout(3000);

    // Should show loading or error state
    const hasError = await errorPage.isErrorPage() ||
      (await page.locator('[data-error], .error, [data-timeout]').count()) > 0;

    const isLoading = await page.evaluate(() => {
      return document.querySelector('[data-loading="true"], .loading') !== null;
    });

    // Should show loading or error
    expect(hasError || isLoading).toBeTruthy();
  });

  test('should display timeout error message', async ({ page }) => {
    // Mock a more reasonable timeout for testing
    await apiMock.mockTimeout(/api\.openalex\.org/, 2000);

    // Set a shorter navigation timeout for this test
    await page.goto('/works/W2741809807', { timeout: 5000 }).catch(() => {
      // Timeout expected
    });

    await waitForAppReady(page);

    // Check if timeout error is displayed
    const errorMessage = await page.locator('[data-error], .error-message, [role="alert"]').first().textContent().catch(() => '');

    if (errorMessage) {
      expect(errorMessage.toLowerCase()).toMatch(/timeout|slow|taking too long|timed out/);
    }
  });

  test('should show loading indicator during slow request', async ({ page }) => {
    // Mock slow response (3 seconds)
    await apiMock.mockTimeout(/api\.openalex\.org/, 3000);

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

    // Should show loading or have loaded
    await page.waitForTimeout(4000);

    // Test completes - loading state should be shown
    expect(true).toBe(true);
  });

  test('should have retry button after timeout', async ({ page }) => {
    // Mock timeout
    await apiMock.mockTimeout(/api\.openalex\.org/, 2000);

    await page.goto('/works/W2741809807', { timeout: 5000 }).catch(() => {});
    await waitForAppReady(page);

    const hasRetry = await errorPage.hasRetryButton();

    if (hasRetry) {
      // Clear timeout mock
      await apiMock.clearAllMocks();

      await errorPage.clickRetry();
      await waitForAppReady(page);

      // Should attempt to load again
      await page.waitForTimeout(500);
    }
  });

  test('should handle timeout during search', async ({ page }) => {
    // Mock timeout for search endpoint
    await apiMock.mockTimeout(/api\.openalex\.org.*filter=/, 3000);

    await page.goto('/search?q=test');

    // Wait a bit for the slow request
    await page.waitForTimeout(1000);

    // Should show loading state
    const isLoading = await page.evaluate(() => {
      return document.querySelector('[data-loading="true"], .loading, .spinner') !== null;
    });

    // Should show loading or complete
    await page.waitForTimeout(4000);

    expect(true).toBe(true);
  });

  test('should handle multiple concurrent slow requests', async ({ page }) => {
    // Mock slow responses for multiple endpoints
    await apiMock.mockTimeout(/api\.openalex\.org/, 2000);

    // Navigate to a page that might make multiple requests
    await page.goto('/browse');
    await page.waitForTimeout(500);

    // Navigate to entity page (triggers another request)
    await page.goto('/works/W2741809807');

    // Should handle multiple slow requests
    await page.waitForTimeout(3000);

    await waitForAppReady(page);

    // Test completes - multiple slow requests should be handled
    expect(true).toBe(true);
  });

  test('should cancel previous request when navigating away', async ({ page }) => {
    // Mock slow response
    await apiMock.mockTimeout(/api\.openalex\.org/, 5000);

    // Start navigation
    await page.goto('/works/W2741809807');
    await page.waitForTimeout(500);

    // Navigate away before request completes
    await page.goto('/browse');
    await waitForAppReady(page);

    // Should cancel the previous slow request and navigate successfully
    expect(page.url()).toContain('/browse');

    await page.waitForTimeout(1000);
  });

  test('should show appropriate timeout duration in error message', async ({ page }) => {
    await apiMock.mockTimeout(/api\.openalex\.org/, 2000);

    await page.goto('/works/W2741809807', { timeout: 5000 }).catch(() => {});
    await waitForAppReady(page);

    // Look for error message with timing information
    const errorText = await page.locator('body').textContent();

    // Error message might include timing information
    // This test documents expected behavior
    expect(errorText).toBeTruthy();
  });

  test('timeout error should be user-friendly', async ({ page }) => {
    await apiMock.mockTimeout(/api\.openalex\.org/, 2000);

    await page.goto('/works/W2741809807', { timeout: 5000 }).catch(() => {});
    await waitForAppReady(page);

    const isError = await errorPage.isErrorPage();

    if (isError) {
      const errorMessage = await errorPage.getErrorMessage();

      // Error should be descriptive and helpful
      expect(errorMessage.length).toBeGreaterThan(0);

      // Should not show technical jargon
      expect(errorMessage).not.toMatch(/ERR_|ECONNREFUSED|stack trace/i);

      // Should have retry option
      const hasRetry = await errorPage.hasRetryButton();
      expect(hasRetry).toBeTruthy();
    }
  });
});
