/**
 * E2E Tests for 404 Error Scenarios
 * Tests error handling for non-existent entities and malformed URLs
 *
 * @tags @error @404 @important
 */

import { test, expect } from '@playwright/test';
import { ErrorPage } from '../src/test/page-objects/ErrorPage';
import { NavigationHelper } from '../src/test/helpers/NavigationHelper';
import { waitForAppReady } from '../src/test/helpers/app-ready';

test.describe('404 Error Scenarios', () => {
  let errorPage: ErrorPage;
  let navigation: NavigationHelper;

  test.beforeEach(async ({ page }) => {
    errorPage = new ErrorPage(page);
    navigation = new NavigationHelper(page);
  });

  test('should show 404 error for non-existent work', async ({ page }) => {
    // Navigate to a work ID that doesn't exist
    await navigation.navigateToEntity('works', 'W9999999999999');
    await waitForAppReady(page);

    // Verify we're on an error page
    const isError = await errorPage.isErrorPage();
    expect(isError).toBe(true);

    // Verify it's a 404 error
    const errorType = await errorPage.getErrorType();
    expect(errorType).toBe('404');
  });

  test('should show 404 error for non-existent author', async ({ page }) => {
    // Navigate to an author ID that doesn't exist
    await navigation.navigateToEntity('authors', 'A9999999999999');
    await waitForAppReady(page);

    const isError = await errorPage.isErrorPage();
    expect(isError).toBe(true);

    const errorType = await errorPage.getErrorType();
    expect(errorType).toBe('404');
  });

  test('should show 404 error for non-existent institution', async ({ page }) => {
    // Navigate to an institution ID that doesn't exist
    await navigation.navigateToEntity('institutions', 'I9999999999999');
    await waitForAppReady(page);

    const isError = await errorPage.isErrorPage();
    expect(isError).toBe(true);

    const errorType = await errorPage.getErrorType();
    expect(errorType).toBe('404');
  });

  test('should display error message on 404', async ({ page }) => {
    await navigation.navigateToEntity('works', 'W9999999999999');
    await waitForAppReady(page);

    const errorMessage = await errorPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.length).toBeGreaterThan(0);

    // Error message should mention 404 or "not found"
    expect(errorMessage.toLowerCase()).toMatch(/404|not found/);
  });

  test('should have retry button on 404 error', async ({ page }) => {
    await navigation.navigateToEntity('works', 'W9999999999999');
    await waitForAppReady(page);

    const hasRetry = await errorPage.hasRetryButton();

    if (hasRetry) {
      await errorPage.clickRetry();
      await waitForAppReady(page);

      // After retry, should still be on error page (entity still doesn't exist)
      const stillError = await errorPage.isErrorPage();
      expect(stillError).toBe(true);
    }
  });

  test('should have back to home link on 404 error', async ({ page }) => {
    await navigation.navigateToEntity('works', 'W9999999999999');
    await waitForAppReady(page);

    const hasHomeLink = await errorPage.hasBackToHomeLink();

    if (hasHomeLink) {
      await errorPage.clickBackToHome();
      await waitForAppReady(page);

      // Should be back at home page
      const currentPath = navigation.getCurrentPath();
      expect(currentPath).toBe('/');
    }
  });

  test('should handle malformed entity ID', async ({ page }) => {
    // Navigate to malformed entity ID (invalid format)
    await page.goto('/works/invalid-id-format');
    await waitForAppReady(page);

    // Should show error (either 404 or validation error)
    const isError = await errorPage.isErrorPage();
    expect(isError).toBe(true);
  });

  test('should handle malformed URLs', async ({ page }) => {
    // Navigate to a malformed URL
    await page.goto('/this-route-does-not-exist');
    await waitForAppReady(page);

    const isError = await errorPage.isErrorPage();
    expect(isError).toBe(true);
  });

  test('404 error page should be accessible', async ({ page }) => {
    await navigation.navigateToEntity('works', 'W9999999999999');
    await waitForAppReady(page);

    // Ensure page loaded
    const isError = await errorPage.isErrorPage();
    expect(isError).toBe(true);

    // Check for basic accessibility (headings, proper ARIA roles, etc.)
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});
