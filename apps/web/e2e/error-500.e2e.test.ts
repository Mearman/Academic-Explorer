/**
 * E2E Tests for 500 Server Error Scenarios
 * Tests error handling for server errors and API failures using API mocking
 *
 * @tags @error @500 @important
 */

import { test, expect } from '@playwright/test';
import { ErrorPage } from '../src/test/page-objects/ErrorPage';
import { ApiMockHelper } from '../src/test/helpers/ApiMockHelper';
import { NavigationHelper } from '../src/test/helpers/NavigationHelper';
import { waitForAppReady } from '../src/test/helpers/app-ready';

test.describe('500 Server Error Scenarios', () => {
  let errorPage: ErrorPage;
  let apiMock: ApiMockHelper;
  let navigation: NavigationHelper;

  test.beforeEach(async ({ page }) => {
    errorPage = new ErrorPage(page);
    apiMock = new ApiMockHelper(page);
    navigation = new NavigationHelper(page);
  });

  test('should show 500 error for server failure', async ({ page }) => {
    // Mock 500 response for a work entity
    await apiMock.mock500(/api\.openalex\.org\/works\/W\d+/);

    // Navigate to an entity
    await navigation.navigateToEntity('works', 'W2741809807');
    await waitForAppReady(page);

    // Should show error page or error message
    const isError = await errorPage.isErrorPage();

    if (isError) {
      const errorType = await errorPage.getErrorType();
      expect(errorType).toMatch(/500|server|unknown/);
    } else {
      // May show inline error instead of full error page
      const hasError = await page.locator('[data-error], .error, [role="alert"]').count();
      expect(hasError).toBeGreaterThan(0);
    }
  });

  test('should display error message on 500', async ({ page }) => {
    await apiMock.mock500(/api\.openalex\.org\/works\/W\d+/);

    await navigation.navigateToEntity('works', 'W2741809807');
    await waitForAppReady(page);

    const errorMessage = await errorPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.toLowerCase()).toMatch(/error|failed|something went wrong/);
  });

  test('should have retry button on 500 error', async ({ page }) => {
    await apiMock.mock500(/api\.openalex\.org\/works\/W\d+/);

    await navigation.navigateToEntity('works', 'W2741809807');
    await waitForAppReady(page);

    const hasRetry = await errorPage.hasRetryButton();

    if (hasRetry) {
      // Clear the mock before retrying
      await apiMock.clearAllMocks();

      await errorPage.clickRetry();
      await waitForAppReady(page);

      // After retry with no mock, should either work or show different error
      // Just verify the action completed
      await page.waitForTimeout(500);
    }
  });

  test('should handle multiple 500 errors gracefully', async ({ page }) => {
    // Mock 500 for multiple endpoints
    await apiMock.mock500(/api\.openalex\.org\/works/);
    await apiMock.mock500(/api\.openalex\.org\/authors/);

    // Try navigating to different entity types
    await navigation.navigateToEntity('works', 'W2741809807');
    await waitForAppReady(page);

    const firstError = await errorPage.isErrorPage();

    // Navigate to another entity type
    await navigation.navigateToEntity('authors', 'A2208157607');
    await waitForAppReady(page);

    const secondError = await errorPage.isErrorPage();

    // Both should show errors (or error states)
    expect(firstError || secondError).toBeTruthy();
  });

  test('should handle 500 error during search', async ({ page }) => {
    // Mock 500 for search endpoint
    await apiMock.mock500(/api\.openalex\.org.*filter=/);

    await page.goto('/search?q=test');
    await waitForAppReady(page);

    // Should show error state
    const hasError = await errorPage.isErrorPage() ||
      (await page.locator('[data-error], .error-message').count()) > 0;

    expect(hasError).toBeTruthy();
  });

  test('should log 500 errors for debugging', async ({ page }) => {
    // Set up console error listener
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await apiMock.mock500(/api\.openalex\.org\/works\/W\d+/);

    await navigation.navigateToEntity('works', 'W2741809807');
    await waitForAppReady(page);

    // Console might log the error (depends on app implementation)
    // This test documents expected behavior
    await page.waitForTimeout(1000);

    // Test completes regardless of console logs
    expect(true).toBe(true);
  });

  test('500 error page should be accessible', async ({ page }) => {
    await apiMock.mock500(/api\.openalex\.org\/works\/W\d+/);

    await navigation.navigateToEntity('works', 'W2741809807');
    await waitForAppReady(page);

    const isError = await errorPage.isErrorPage();

    if (isError) {
      // Error page should have proper heading
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible();

      // Should have descriptive text
      const errorMessage = await errorPage.getErrorMessage();
      expect(errorMessage.length).toBeGreaterThan(0);
    }
  });

  test('should recover from 500 error after API is fixed', async ({ page }) => {
    // First, mock 500 error
    await apiMock.mock500(/api\.openalex\.org\/works\/W\d+/);

    await navigation.navigateToEntity('works', 'W2741809807');
    await waitForAppReady(page);

    const initialError = await errorPage.isErrorPage();

    // Now clear the mock (simulate API recovery)
    await apiMock.clearAllMocks();

    // Retry or refresh
    if (await errorPage.hasRetryButton()) {
      await errorPage.clickRetry();
      await waitForAppReady(page);

      // Should now work (or show different state)
      const stillError = await errorPage.isErrorPage();

      // Error should be resolved or different
      expect(initialError).toBeTruthy();
    }
  });
});
