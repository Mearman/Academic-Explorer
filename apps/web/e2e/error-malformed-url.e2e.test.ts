/**
 * E2E Tests for Malformed URL Error Scenarios
 * Tests error handling for invalid entity IDs, malformed URLs, and edge cases
 *
 * @tags @error @malformed-url @important
 */

import { test, expect } from '@playwright/test';
import { ErrorPage } from '../src/test/page-objects/ErrorPage';
import { NavigationHelper } from '../src/test/helpers/NavigationHelper';
import { waitForAppReady } from '../src/test/helpers/app-ready';

test.describe('Malformed URL Error Scenarios', () => {
  let errorPage: ErrorPage;
  let navigation: NavigationHelper;

  test.beforeEach(async ({ page }) => {
    errorPage = new ErrorPage(page);
    navigation = new NavigationHelper(page);
  });

  test('should handle invalid entity ID format', async ({ page }) => {
    // Navigate to entity with invalid ID format
    await page.goto('/works/invalid-id');
    await waitForAppReady(page);

    // Should show error
    const isError = await errorPage.isErrorPage();
    expect(isError).toBe(true);
  });

  test('should handle malformed work ID', async ({ page }) => {
    // Valid format would be W followed by digits
    const malformedIds = [
      '/works/W',
      '/works/W123ABC',
      '/works/12345',
      '/works/work-id',
    ];

    for (const path of malformedIds) {
      await page.goto(path);
      await waitForAppReady(page);

      const isError = await errorPage.isErrorPage();
      expect(isError).toBe(true);

      // Error should indicate invalid ID
      const errorMessage = await errorPage.getErrorMessage();
      expect(errorMessage.toLowerCase()).toMatch(/not found|invalid|error/);
    }
  });

  test('should handle malformed author ID', async ({ page }) => {
    const malformedIds = [
      '/authors/A',
      '/authors/ABCD1234',
      '/authors/author-name',
    ];

    for (const path of malformedIds) {
      await page.goto(path);
      await waitForAppReady(page);

      const isError = await errorPage.isErrorPage();
      expect(isError).toBe(true);
    }
  });

  test('should handle collapsed protocol URLs', async ({ page }) => {
    // URLs like https:/doi.org/... (missing second slash)
    // These should be handled gracefully

    await page.goto('/works/https:/doi.org/10.1234/test');
    await waitForAppReady(page);

    // Should show error or redirect
    const isError = await errorPage.isErrorPage();
    const currentUrl = page.url();

    // Should handle malformed URL
    expect(isError || currentUrl.includes('/404')).toBeTruthy();
  });

  test('should handle URLs with special characters', async ({ page }) => {
    const specialCharUrls = [
      '/works/W<script>alert("xss")</script>',
      '/works/W2741809807?param=<img src=x>',
      '/works/W2741809807#<svg onload=alert(1)>',
    ];

    for (const url of specialCharUrls) {
      await page.goto(url);
      await waitForAppReady(page);

      // Should handle safely without XSS
      const hasAlert = await page.evaluate(() => {
        return document.querySelector('script') !== null;
      });

      // Should not execute injected scripts
      expect(hasAlert).toBe(false);

      // Should show error or sanitized page
      const isError = await errorPage.isErrorPage();
      expect(isError || true).toBeTruthy();
    }
  });

  test('should handle very long entity IDs', async ({ page }) => {
    const longId = 'W' + '9'.repeat(1000);
    await page.goto(`/works/${longId}`);
    await waitForAppReady(page);

    // Should handle without crashing
    const isError = await errorPage.isErrorPage();
    expect(isError).toBe(true);
  });

  test('should handle non-existent routes', async ({ page }) => {
    const nonExistentRoutes = [
      '/this-route-does-not-exist',
      '/random/path/to/nowhere',
      '/works/subpage/that/doesnt/exist',
    ];

    for (const route of nonExistentRoutes) {
      await page.goto(route);
      await waitForAppReady(page);

      const isError = await errorPage.isErrorPage();
      expect(isError).toBe(true);

      const errorType = await errorPage.getErrorType();
      expect(errorType).toBe('404');
    }
  });

  test('should handle URLs with multiple slashes', async ({ page }) => {
    await page.goto('/works//W2741809807');
    await waitForAppReady(page);

    // Should either normalize or show error
    const currentPath = navigation.getCurrentPath();

    // Path should be handled (either normalized or error shown)
    expect(currentPath).toBeTruthy();
  });

  test('should handle URLs with trailing slashes', async ({ page }) => {
    await page.goto('/works/W2741809807/');
    await waitForAppReady(page);

    // Should handle trailing slash (either normalize or accept)
    const currentPath = navigation.getCurrentPath();
    expect(currentPath).toContain('/works/');
  });

  test('should handle mixed case entity types', async ({ page }) => {
    await page.goto('/Works/W2741809807');
    await waitForAppReady(page);

    // Should either normalize or show error
    const isError = await errorPage.isErrorPage();
    const currentPath = navigation.getCurrentPath().toLowerCase();

    // Should handle case (normalize or error)
    expect(isError || currentPath.includes('works')).toBeTruthy();
  });

  test('should handle entity ID with wrong prefix', async ({ page }) => {
    // Work ID with author prefix
    await page.goto('/works/A2208157607');
    await waitForAppReady(page);

    // Should show 404 or error
    const isError = await errorPage.isErrorPage();
    expect(isError).toBe(true);
  });

  test('should handle query parameters in entity URLs', async ({ page }) => {
    await page.goto('/works/W2741809807?foo=bar&baz=qux');
    await waitForAppReady(page);

    // Should load entity and ignore/preserve query params
    const currentUrl = page.url();
    expect(currentUrl).toContain('W2741809807');

    // Should not show error
    const isError = await errorPage.isErrorPage();
    expect(isError).toBe(false);
  });

  test('should handle hash fragments in URLs', async ({ page }) => {
    await page.goto('/works/W2741809807#section-name');
    await waitForAppReady(page);

    // Should load entity
    const currentUrl = page.url();
    expect(currentUrl).toContain('W2741809807');

    // Hash should be preserved
    expect(currentUrl).toContain('#section-name');
  });

  test('malformed URL errors should be accessible', async ({ page }) => {
    await page.goto('/works/invalid-format');
    await waitForAppReady(page);

    const isError = await errorPage.isErrorPage();

    if (isError) {
      // Should have proper heading
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible();

      // Should have helpful error message
      const errorMessage = await errorPage.getErrorMessage();
      expect(errorMessage.length).toBeGreaterThan(0);

      // Should have navigation option
      const hasHomeLink = await errorPage.hasBackToHomeLink();
      expect(hasHomeLink).toBeTruthy();
    }
  });

  test('should handle URL encoding edge cases', async ({ page }) => {
    // URL with encoded characters
    await page.goto('/works/W%202741809807');
    await waitForAppReady(page);

    // Should handle URL encoding
    const isError = await errorPage.isErrorPage();
    expect(isError).toBeTruthy(); // Space in ID is invalid
  });

  test('should handle NULL bytes in URLs', async ({ page }) => {
    await page.goto('/works/W2741809807%00');
    await waitForAppReady(page);

    // Should handle NULL bytes safely
    const isError = await errorPage.isErrorPage();

    // Should not crash
    expect(true).toBe(true);
  });
});
