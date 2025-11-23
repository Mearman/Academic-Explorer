/**
 * E2E Tests for About Page
 * Tests about page content and display
 *
 * @tags @utility @about @nice-to-have
 */

import { test, expect } from '@playwright/test';
import { BaseSPAPageObject } from '../page-objects/BaseSPAPageObject';
import { AssertionHelper } from '../helpers/AssertionHelper';
import { waitForAppReady } from '../helpers/app-ready';

test.describe('About Page', () => {
  let aboutPage: BaseSPAPageObject;
  let assertions: AssertionHelper;

  test.beforeEach(async ({ page }) => {
    aboutPage = new BaseSPAPageObject(page);
    assertions = new AssertionHelper(page);
  });

  test('should load about page successfully', async ({ page }) => {
    await page.goto('/about');
    await waitForAppReady(page);

    expect(page.url()).toContain('/about');
    await assertions.waitForNoError();
  });

  test('should display about page content', async ({ page }) => {
    await page.goto('/about');
    await waitForAppReady(page);

    // Should have a heading
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    // Should have some content
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(50);
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/about');
    await waitForAppReady(page);

    // Look for navigation links
    const links = page.locator('a');
    const count = await links.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should be accessible', async ({ page }) => {
    await page.goto('/about');
    await waitForAppReady(page);

    await assertions.verifyAccessibility({
      includedImpacts: ['critical', 'serious'],
    });
  });
});
