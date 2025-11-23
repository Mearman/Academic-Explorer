/**
 * E2E Tests for Subfield Entity Pages
 * Tests basic subfield detail page functionality
 *
 * @tags @entity @subfields @critical
 */

import { test, expect } from '@playwright/test';
import { SubfieldsDetailPage } from '../src/test/page-objects/SubfieldsDetailPage';
import { AssertionHelper } from '../src/test/helpers/AssertionHelper';
import { waitForAppReady } from '../src/test/helpers/app-ready';

test.describe('Subfield Detail Pages', () => {
  let subfieldsPage: SubfieldsDetailPage;
  let assertions: AssertionHelper;

  test.beforeEach(async ({ page }) => {
    subfieldsPage = new SubfieldsDetailPage(page);
    assertions = new AssertionHelper(page);
  });

  test('should display subfield title and basic information', async ({ page }) => {
    // Navigate to a known subfield (example: Artificial Intelligence subfield)
    // Note: Replace with actual subfield ID from your data
    await subfieldsPage.gotoEntity('S154945302');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    const title = await subfieldsPage.getSubfieldName();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    expect(page.url()).toContain('/subfields/');
  });

  test('should display topics if available', async ({ page }) => {
    await subfieldsPage.gotoEntity('S154945302');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    const hasTopics = await subfieldsPage.hasTopics();

    if (hasTopics) {
      const topicCount = await subfieldsPage.getTopicCount();
      expect(topicCount).toBeGreaterThan(0);
    }
  });

  test('should handle graph visualization', async ({ page }) => {
    await subfieldsPage.gotoEntity('S154945302');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    const hasGraph = await subfieldsPage.hasGraph();

    if (hasGraph) {
      await assertions.waitForGraphRendered(30000);
    }
  });

  test('should be accessible', async ({ page }) => {
    await subfieldsPage.gotoEntity('S154945302');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    await assertions.verifyAccessibility({
      includedImpacts: ['critical', 'serious'],
    });
  });
});
