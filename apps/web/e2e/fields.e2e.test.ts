/**
 * E2E Tests for Field Entity Pages
 * Tests basic field detail page functionality
 *
 * @tags @entity @fields @critical
 */

import { test, expect } from '@playwright/test';
import { FieldsDetailPage } from '../src/test/page-objects/FieldsDetailPage';
import { AssertionHelper } from '../src/test/helpers/AssertionHelper';
import { waitForAppReady } from '../src/test/helpers/app-ready';

test.describe('Field Detail Pages', () => {
  let fieldsPage: FieldsDetailPage;
  let assertions: AssertionHelper;

  test.beforeEach(async ({ page }) => {
    fieldsPage = new FieldsDetailPage(page);
    assertions = new AssertionHelper(page);
  });

  test('should display field title and basic information', async ({ page }) => {
    // Navigate to a known field (example: Computer Science field)
    // Note: Replace with actual field ID from your data
    await fieldsPage.gotoEntity('F41008148');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    const title = await fieldsPage.getFieldName();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    expect(page.url()).toContain('/fields/');
  });

  test('should display subfields associated with field', async ({ page }) => {
    await fieldsPage.gotoEntity('F41008148');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    const hasSubfields = await fieldsPage.hasSubfields();

    if (hasSubfields) {
      const subfieldCount = await fieldsPage.getSubfieldCount();
      expect(subfieldCount).toBeGreaterThan(0);
    }
  });

  test('should handle graph visualization', async ({ page }) => {
    await fieldsPage.gotoEntity('F41008148');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    const hasGraph = await fieldsPage.hasGraph();

    if (hasGraph) {
      await assertions.waitForGraphRendered(30000);
    }
  });

  test('should be accessible', async ({ page }) => {
    await fieldsPage.gotoEntity('F41008148');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    await assertions.verifyAccessibility({
      includedImpacts: ['critical', 'serious'],
    });
  });
});
