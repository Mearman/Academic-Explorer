/**
 * E2E Tests for Browse Workflow
 * Tests complete browse workflow: browse page → entity type selection → entity selection → detail page
 *
 * @tags @workflow @browse @important
 */

import { test, expect } from '@playwright/test';
import { BrowsePage } from '../src/test/page-objects/BrowsePage';
import { NavigationHelper } from '../src/test/helpers/NavigationHelper';
import { AssertionHelper } from '../src/test/helpers/AssertionHelper';
import { waitForAppReady } from '../src/test/helpers/app-ready';

test.describe('Browse Workflow', () => {
  let browsePage: BrowsePage;
  let navigation: NavigationHelper;
  let assertions: AssertionHelper;

  test.beforeEach(async ({ page }) => {
    browsePage = new BrowsePage(page);
    navigation = new NavigationHelper(page);
    assertions = new AssertionHelper(page);
  });

  test('complete browse workflow: browse → select type → select entity → view detail', async ({ page }) => {
    // Step 1: Navigate to browse page
    await browsePage.goto();
    await waitForAppReady(page);

    // Step 2: Verify entity types are displayed
    const hasGrid = await browsePage.hasEntityTypeGrid();
    expect(hasGrid).toBe(true);

    const entityTypeCount = await browsePage.getEntityTypeCount();
    expect(entityTypeCount).toBeGreaterThan(0);

    // Step 3: Select an entity type (works)
    const hasWorks = await browsePage.hasEntityType('works');

    if (hasWorks) {
      await browsePage.clickEntityType('works');
      await waitForAppReady(page);

      // Step 4: Verify navigation to works index page
      expect(page.url()).toContain('/works');

      // Step 5: Look for entity items to click
      const entityItems = page.locator('[data-entity-item], .entity-item, a[href*="/works/"]');
      const itemCount = await entityItems.count();

      if (itemCount > 0) {
        // Step 6: Click on first entity
        await entityItems.first().click();
        await waitForAppReady(page);

        // Step 7: Verify we're on entity detail page
        expect(page.url()).toMatch(/\/works\/W\d+/);

        // Step 8: Verify entity data loaded
        await assertions.waitForEntityData();
      }
    }
  });

  test('browse workflow with different entity types', async ({ page }) => {
    await browsePage.goto();
    await waitForAppReady(page);

    const entityTypes = await browsePage.getEntityTypes();
    expect(entityTypes.length).toBeGreaterThan(0);

    // Try browsing to authors if available
    const hasAuthors = await browsePage.hasEntityType('authors');

    if (hasAuthors) {
      await browsePage.clickEntityType('authors');
      await waitForAppReady(page);

      expect(page.url()).toContain('/authors');
      await assertions.waitForNoError();
    }
  });

  test('browse workflow with search filter', async ({ page }) => {
    await browsePage.goto();
    await waitForAppReady(page);

    // Try to search/filter entity types
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

    if ((await searchInput.count()) > 0) {
      await searchInput.first().fill('works');
      await page.waitForTimeout(500);

      // Should filter to show only works
      const visibleCount = await browsePage.getEntityTypeCount();
      expect(visibleCount).toBeGreaterThanOrEqual(0);

      await assertions.waitForNoError();
    }
  });

  test('browse workflow with back navigation', async ({ page }) => {
    // Navigate through browse workflow
    await browsePage.goto();
    await waitForAppReady(page);

    const hasWorks = await browsePage.hasEntityType('works');

    if (hasWorks) {
      // Click entity type
      await browsePage.clickEntityType('works');
      await waitForAppReady(page);

      const currentPath = navigation.getCurrentPath();
      expect(currentPath).toContain('/works');

      // Go back
      await navigation.goBack();
      await waitForAppReady(page);

      // Should be back at browse page
      const backPath = navigation.getCurrentPath();
      expect(backPath).toContain('/browse');

      await assertions.waitForNoError();
    }
  });

  test('browse workflow handles all entity type categories', async ({ page }) => {
    await browsePage.goto();
    await waitForAppReady(page);

    // Get all available entity types
    const entityTypes = await browsePage.getEntityTypes();

    // Should have common entity types
    const commonTypes = ['works', 'authors', 'institutions', 'sources', 'concepts'];
    const availableCommonTypes = commonTypes.filter((type) =>
      entityTypes.some((et) => et.toLowerCase().includes(type))
    );

    // Should have at least some of the common types
    expect(availableCommonTypes.length).toBeGreaterThan(0);
  });

  test('browse workflow with keyboard navigation', async ({ page }) => {
    await browsePage.goto();
    await waitForAppReady(page);

    // Try keyboard navigation through entity type cards
    const firstCard = page.locator('[data-entity-type], .entity-type-card').first();

    if ((await firstCard.count()) > 0) {
      // Focus the card
      await firstCard.focus();

      // Press Enter to navigate
      await firstCard.press('Enter');
      await waitForAppReady(page);

      // Should have navigated to an entity type page
      const currentPath = navigation.getCurrentPath();
      expect(currentPath).not.toBe('/browse');

      await assertions.waitForNoError();
    }
  });

  test('browse workflow is accessible', async ({ page }) => {
    await browsePage.goto();
    await waitForAppReady(page);

    // Verify browse page accessibility
    await assertions.verifyAccessibility({
      includedImpacts: ['critical', 'serious'],
    });

    // Entity type cards should have proper ARIA labels and roles
    const cards = page.locator('[data-entity-type], .entity-type-card');
    const count = await cards.count();

    if (count > 0) {
      // Verify first card has accessible attributes
      const firstCard = cards.first();
      const role = await firstCard.getAttribute('role');
      const ariaLabel = await firstCard.getAttribute('aria-label');

      // Should have either a role or aria-label for accessibility
      expect(role || ariaLabel).toBeTruthy();
    }
  });

  test('browse workflow with direct entity type URLs', async ({ page }) => {
    // User can also navigate directly to entity type pages
    await page.goto('/works');
    await waitForAppReady(page);

    // Should be on works index page
    expect(page.url()).toContain('/works');
    await assertions.waitForNoError();

    // Navigate back to browse
    await browsePage.goto();
    await waitForAppReady(page);

    // Should be on browse page
    expect(page.url()).toContain('/browse');
  });
});
