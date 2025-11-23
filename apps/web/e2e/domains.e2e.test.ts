/**
 * E2E Tests for Domain Entity Pages
 * Tests basic domain detail page functionality including title display,
 * metadata rendering, and relationship visualization
 *
 * @tags @entity @domains @critical
 */

import { test, expect } from '@playwright/test';
import { DomainsDetailPage } from '../src/test/page-objects/DomainsDetailPage';
import { AssertionHelper } from '../src/test/helpers/AssertionHelper';
import { waitForAppReady } from '../src/test/helpers/app-ready';

test.describe('Domain Detail Pages', () => {
  let domainsPage: DomainsDetailPage;
  let assertions: AssertionHelper;

  test.beforeEach(async ({ page }) => {
    domainsPage = new DomainsDetailPage(page);
    assertions = new AssertionHelper(page);
  });

  test('should display domain title and basic information', async ({ page }) => {
    // Navigate to a known domain (example: Physical Sciences domain)
    // Note: Replace with actual domain ID from your data
    await domainsPage.gotoEntity('D127313418');
    await waitForAppReady(page);

    // Wait for entity data to load
    await assertions.waitForEntityData();

    // Verify domain title is displayed
    const title = await domainsPage.getDomainName();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);

    // Verify we're on the correct route
    expect(page.url()).toContain('/domains/');
  });

  test('should display metadata for domain', async ({ page }) => {
    await domainsPage.gotoEntity('D127313418');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    // Get metadata
    const metadata = await domainsPage.getEntityMetadata();

    // Metadata should exist (even if empty object)
    expect(metadata).toBeDefined();
  });

  test('should show fields associated with domain', async ({ page }) => {
    await domainsPage.gotoEntity('D127313418');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    // Check if domain has fields section
    const hasFields = await domainsPage.hasFields();

    if (hasFields) {
      const fieldCount = await domainsPage.getFieldCount();
      expect(fieldCount).toBeGreaterThan(0);
    }
  });

  test('should handle bookmark functionality', async ({ page }) => {
    await domainsPage.gotoEntity('D127313418');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    // Check if bookmark button exists
    const hasBookmark = await domainsPage.hasBookmarkButton();

    if (hasBookmark) {
      // Get initial bookmark state
      const initialState = await domainsPage.isBookmarked();

      // Click bookmark button
      await domainsPage.clickBookmark();
      await page.waitForTimeout(500); // Wait for state to update

      // Verify state changed
      const newState = await domainsPage.isBookmarked();
      expect(newState).not.toBe(initialState);
    }
  });

  test('should navigate to domain index page', async ({ page }) => {
    await domainsPage.gotoIndex();
    await waitForAppReady(page);

    // Verify we're on the index page
    expect(page.url()).toContain('/domains');
    expect(page.url()).not.toContain('/domains/D');
  });

  test('should display graph visualization if available', async ({ page }) => {
    await domainsPage.gotoEntity('D127313418');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    // Check if domain has graph visualization
    const hasGraph = await domainsPage.hasGraph();

    if (hasGraph) {
      // Wait for graph to render
      await assertions.waitForGraphRendered(30000);

      // Verify canvas exists and has content
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
    }
  });

  test('should display relationships if available', async ({ page }) => {
    await domainsPage.gotoEntity('D127313418');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    // Check if domain has relationships
    const hasRelationships = await domainsPage.hasRelationships();

    if (hasRelationships) {
      const incomingCount = await domainsPage.getIncomingRelationshipCount();
      const outgoingCount = await domainsPage.getOutgoingRelationshipCount();

      // At least one type of relationship should exist
      expect(incomingCount + outgoingCount).toBeGreaterThan(0);
    }
  });

  test('should have accessible error-free page', async ({ page }) => {
    await domainsPage.gotoEntity('D127313418');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    // Verify no error boundary is displayed
    const hasError = await domainsPage.hasErrorBoundary();
    expect(hasError).toBe(false);

    // Check accessibility (critical and serious issues only)
    await assertions.verifyAccessibility({
      includedImpacts: ['critical', 'serious'],
    });
  });
});
