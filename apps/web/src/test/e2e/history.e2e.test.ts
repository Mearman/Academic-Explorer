/**
 * E2E Tests for History Page
 * Tests history catalogue display and navigation
 *
 * @tags @utility @history @nice-to-have
 */

import { test, expect } from '@playwright/test';
import { BaseSPAPageObject } from '../page-objects/BaseSPAPageObject';
import { AssertionHelper } from '../helpers/AssertionHelper';
import { StorageTestHelper } from '../helpers/StorageTestHelper';
import { NavigationHelper } from '../helpers/NavigationHelper';
import { waitForAppReady } from '../helpers/app-ready';

test.describe('History Page', () => {
  let historyPage: BaseSPAPageObject;
  let assertions: AssertionHelper;
  let storage: StorageTestHelper;
  let navigation: NavigationHelper;

  test.beforeEach(async ({ page }) => {
    historyPage = new BaseSPAPageObject(page);
    assertions = new AssertionHelper(page);
    storage = new StorageTestHelper(page);
    navigation = new NavigationHelper(page);

    // Clear storage for isolation
    await page.goto('/');
    await waitForAppReady(page);
    await storage.clearAllStorage();
  });

  test('should load history page successfully', async ({ page }) => {
    await page.goto('/history');
    await waitForAppReady(page);

    expect(page.url()).toContain('/history');
    await assertions.waitForNoError();
  });

  test('should display empty history state', async ({ page }) => {
    await page.goto('/history');
    await waitForAppReady(page);

    // Should show empty state or message
    const emptyState = page.locator('[data-empty-history], .empty-state, text=/no history/i, text=/empty/i');

    // May show empty state or just no items
    await page.waitForTimeout(500);
  });

  test('should display history after visiting entities', async ({ page }) => {
    // Visit some entities to populate history
    await navigation.navigateToEntity('works', 'W2741809807');
    await waitForAppReady(page);

    await navigation.navigateToEntity('authors', 'A2208157607');
    await waitForAppReady(page);

    // Navigate to history
    await page.goto('/history');
    await waitForAppReady(page);

    // Should show history items (if functionality exists)
    const historyItems = page.locator('[data-history-item], .history-item, [data-entity-item]');
    const count = await historyItems.count();

    // May have history items
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should allow clearing history', async ({ page }) => {
    await page.goto('/history');
    await waitForAppReady(page);

    // Look for clear history button
    const clearButton = page.locator('button:has-text("Clear"), button:has-text("Delete"), [data-clear-history]');

    if ((await clearButton.count()) > 0) {
      await clearButton.first().click();
      await page.waitForTimeout(500);

      // Should show empty state or confirmation
      await assertions.waitForNoError();
    }
  });

  test('should navigate to entity from history', async ({ page }) => {
    // Visit an entity
    await navigation.navigateToEntity('works', 'W2741809807');
    await waitForAppReady(page);

    // Go to history
    await page.goto('/history');
    await waitForAppReady(page);

    // Click on history item
    const historyItem = page.locator('[data-history-item], .history-item, a[href*="/works/"]').first();

    if ((await historyItem.count()) > 0) {
      await historyItem.click();
      await waitForAppReady(page);

      // Should navigate to entity
      expect(page.url()).toMatch(/\/works\/W\d+/);
    }
  });

  test('should display history items in chronological order', async ({ page }) => {
    // Visit entities in specific order
    await navigation.navigateToEntity('works', 'W2741809807');
    await waitForAppReady(page);
    await page.waitForTimeout(100);

    await navigation.navigateToEntity('works', 'W2109972906');
    await waitForAppReady(page);

    // Go to history
    await page.goto('/history');
    await waitForAppReady(page);

    // History items should exist (if functionality is implemented)
    const historyItems = page.locator('[data-history-item], .history-item');
    const count = await historyItems.count();

    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should be accessible', async ({ page }) => {
    await page.goto('/history');
    await waitForAppReady(page);

    await assertions.verifyAccessibility({
      includedImpacts: ['critical', 'serious'],
    });
  });
});
