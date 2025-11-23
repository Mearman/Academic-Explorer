/**
 * E2E Tests for Browse Page
 * Tests browse page functionality including entity type grid and navigation
 *
 * @tags @utility @browse @critical
 */

import { test, expect } from '@playwright/test';
import { BrowsePage } from '../page-objects/BrowsePage';
import { waitForAppReady } from '../helpers/app-ready';
import { AssertionHelper } from '../helpers/AssertionHelper';

test.describe('Browse Page', () => {
  let browsePage: BrowsePage;
  let assertions: AssertionHelper;

  test.beforeEach(async ({ page }) => {
    browsePage = new BrowsePage(page);
    assertions = new AssertionHelper(page);
  });

  test('should load browse page successfully', async ({ page }) => {
    await browsePage.goto();
    await waitForAppReady(page);

    // Verify we're on the browse page
    expect(page.url()).toContain('/browse');

    // Verify no error state
    await assertions.waitForNoError();
  });

  test('should display entity type grid', async ({ page }) => {
    await browsePage.goto();
    await waitForAppReady(page);

    const hasGrid = await browsePage.hasEntityTypeGrid();
    expect(hasGrid).toBe(true);

    // Should have at least some entity types
    const entityTypes = await browsePage.getEntityTypes();
    expect(entityTypes.length).toBeGreaterThan(0);
  });

  test('should navigate to entity type when clicked', async ({ page }) => {
    await browsePage.goto();
    await waitForAppReady(page);

    // Check if works entity type is available
    const hasWorks = await browsePage.hasEntityType('works');

    if (hasWorks) {
      await browsePage.clickEntityType('works');
      await waitForAppReady(page);

      // Verify navigation occurred
      expect(page.url()).toContain('/works');
    }
  });

  test('should display multiple entity types', async ({ page }) => {
    await browsePage.goto();
    await waitForAppReady(page);

    const entityTypeCount = await browsePage.getEntityTypeCount();

    // Should have multiple entity types (at least 5: works, authors, institutions, sources, concepts)
    expect(entityTypeCount).toBeGreaterThanOrEqual(5);
  });

  test('should be accessible', async ({ page }) => {
    await browsePage.goto();
    await waitForAppReady(page);

    await assertions.verifyAccessibility({
      includedImpacts: ['critical', 'serious'],
    });
  });
});
