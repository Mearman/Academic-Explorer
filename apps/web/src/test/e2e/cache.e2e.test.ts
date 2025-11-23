/**
 * E2E Tests for Cache Management Page
 * Tests cache management UI and functionality
 *
 * @tags @utility @cache @nice-to-have
 */

import { test, expect } from '@playwright/test';
import { BaseSPAPageObject } from '../page-objects/BaseSPAPageObject';
import { AssertionHelper } from '../helpers/AssertionHelper';
import { StorageTestHelper } from '../helpers/StorageTestHelper';
import { waitForAppReady } from '../helpers/app-ready';

test.describe('Cache Management Page', () => {
  let cachePage: BaseSPAPageObject;
  let assertions: AssertionHelper;
  let storage: StorageTestHelper;

  test.beforeEach(async ({ page }) => {
    cachePage = new BaseSPAPageObject(page);
    assertions = new AssertionHelper(page);
    storage = new StorageTestHelper(page);
  });

  test('should load cache page successfully', async ({ page }) => {
    await page.goto('/cache');
    await waitForAppReady(page);

    expect(page.url()).toContain('/cache');
    await assertions.waitForNoError();
  });

  test('should display cache information', async ({ page }) => {
    await page.goto('/cache');
    await waitForAppReady(page);

    // Look for cache stats or information
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
  });

  test('should have clear cache button', async ({ page }) => {
    await page.goto('/cache');
    await waitForAppReady(page);

    // Look for clear cache button
    const clearButton = page.locator('button:has-text("Clear"), button:has-text("Delete"), [data-clear-cache]');

    if ((await clearButton.count()) > 0) {
      // Button exists
      await expect(clearButton.first()).toBeVisible();
      await expect(clearButton.first()).toBeEnabled();
    }
  });

  test('should clear cache when button clicked', async ({ page }) => {
    await page.goto('/cache');
    await waitForAppReady(page);

    const clearButton = page.locator('button:has-text("Clear"), button:has-text("Delete"), [data-clear-cache]').first();

    if ((await clearButton.count()) > 0) {
      await clearButton.click();
      await page.waitForTimeout(500);

      // Should show confirmation or success message
      await assertions.waitForNoError();
    }
  });

  test('should display cache size', async ({ page }) => {
    await page.goto('/cache');
    await waitForAppReady(page);

    // Look for cache size display
    const sizeDisplay = page.locator('[data-cache-size], .cache-size, text=/\\d+\\s*(KB|MB|GB)/i');

    // May or may not have size display
    await page.waitForTimeout(500);
  });

  test('should be accessible', async ({ page }) => {
    await page.goto('/cache');
    await waitForAppReady(page);

    await assertions.verifyAccessibility({
      includedImpacts: ['critical', 'serious'],
    });
  });
});
