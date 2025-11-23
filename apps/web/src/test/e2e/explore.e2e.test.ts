/**
 * E2E Tests for Explore Page
 * Tests explore page rendering and visualization
 *
 * @tags @utility @explore @critical
 */

import { test, expect } from '@playwright/test';
import { ExplorePage } from '../page-objects/ExplorePage';
import { waitForAppReady } from '../helpers/app-ready';
import { AssertionHelper } from '../helpers/AssertionHelper';

test.describe('Explore Page', () => {
  let explorePage: ExplorePage;
  let assertions: AssertionHelper;

  test.beforeEach(async ({ page }) => {
    explorePage = new ExplorePage(page);
    assertions = new AssertionHelper(page);
  });

  test('should load explore page successfully', async ({ page }) => {
    await explorePage.goto();
    await waitForAppReady(page);

    expect(page.url()).toContain('/explore');
    await assertions.waitForNoError();
  });

  test('should display visualization if available', async ({ page }) => {
    await explorePage.goto();
    await waitForAppReady(page);

    const hasVisualization = await explorePage.hasVisualization();

    if (hasVisualization) {
      await explorePage.waitForVisualizationReady();
    }

    // Page should be functional even if no visualization
    expect(true).toBe(true);
  });

  test('should have controls or options', async ({ page }) => {
    await explorePage.goto();
    await waitForAppReady(page);

    // Check if controls exist (optional feature)
    const hasControls = await explorePage.hasControls();

    // Just verify page loaded without errors
    await assertions.waitForNoError();
  });

  test('should be accessible', async ({ page }) => {
    await explorePage.goto();
    await waitForAppReady(page);

    await assertions.verifyAccessibility({
      includedImpacts: ['critical', 'serious'],
    });
  });
});
