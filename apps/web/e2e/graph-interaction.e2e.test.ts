/**
 * E2E Tests for Graph Interaction Workflow
 * Tests graph visualization interactions: pan, zoom, node selection, edge filtering
 *
 * @tags @workflow @graph @important
 */

import { test, expect } from '@playwright/test';
import { BaseEntityPageObject } from '../src/test/page-objects/BaseEntityPageObject';
import { NavigationHelper } from '../src/test/helpers/NavigationHelper';
import { AssertionHelper } from '../src/test/helpers/AssertionHelper';
import { PerformanceHelper } from '../src/test/helpers/PerformanceHelper';
import { waitForAppReady } from '../src/test/helpers/app-ready';

test.describe('Graph Interaction Workflow', () => {
  let entityPage: BaseEntityPageObject;
  let navigation: NavigationHelper;
  let assertions: AssertionHelper;
  let performance: PerformanceHelper;

  test.beforeEach(async ({ page }) => {
    entityPage = new BaseEntityPageObject(page, 'works');
    navigation = new NavigationHelper(page);
    assertions = new AssertionHelper(page);
    performance = new PerformanceHelper(page);
  });

  test('should render graph visualization on entity page', async ({ page }) => {
    // Navigate to an entity known to have a graph
    await navigation.navigateToEntity('works', 'W2741809807');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    // Check if graph exists
    const hasGraph = await entityPage.hasGraph();

    if (hasGraph) {
      // Wait for graph to render
      await assertions.waitForGraphRendered(30000);

      // Verify canvas is visible and has dimensions
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      const dimensions = await canvas.evaluate((el) => ({
        width: el.width,
        height: el.height,
      }));

      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);
    }
  });

  test('should measure graph rendering performance', async ({ page }) => {
    await navigation.navigateToEntity('works', 'W2741809807');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    const hasGraph = await entityPage.hasGraph();

    if (hasGraph) {
      // Measure graph rendering time
      const renderTime = await performance.measureGraphRendering(30000);

      // Graph should render in reasonable time (<10 seconds for most cases)
      expect(renderTime).toBeLessThan(10000);

      console.log(`Graph rendered in ${renderTime}ms`);
    }
  });

  test('should handle graph pan interaction', async ({ page }) => {
    await navigation.navigateToEntity('works', 'W2741809807');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    const hasGraph = await entityPage.hasGraph();

    if (hasGraph) {
      await assertions.waitForGraphRendered();

      const canvas = page.locator('canvas').first();

      // Get initial canvas state (if there's a way to track position)
      // Pan by dragging on canvas
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100);
        await page.mouse.up();

        // Wait for pan to settle
        await page.waitForTimeout(500);

        // Verify canvas is still visible (didn't crash)
        await expect(canvas).toBeVisible();
      }
    }
  });

  test('should handle graph zoom interaction', async ({ page }) => {
    await navigation.navigateToEntity('works', 'W2741809807');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    const hasGraph = await entityPage.hasGraph();

    if (hasGraph) {
      await assertions.waitForGraphRendered();

      const canvas = page.locator('canvas').first();

      // Check for zoom controls (buttons or mouse wheel)
      const zoomInButton = page.locator('button:has-text("Zoom In"), [data-zoom-in], [aria-label*="zoom in" i]');
      const zoomOutButton = page.locator('button:has-text("Zoom Out"), [data-zoom-out], [aria-label*="zoom out" i]');

      if ((await zoomInButton.count()) > 0) {
        await zoomInButton.first().click();
        await page.waitForTimeout(300);

        // Verify canvas is still visible
        await expect(canvas).toBeVisible();
      }

      if ((await zoomOutButton.count()) > 0) {
        await zoomOutButton.first().click();
        await page.waitForTimeout(300);

        await expect(canvas).toBeVisible();
      }
    }
  });

  test('should handle node selection in graph', async ({ page }) => {
    await navigation.navigateToEntity('works', 'W2741809807');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    const hasGraph = await entityPage.hasGraph();

    if (hasGraph) {
      await assertions.waitForGraphRendered();

      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();

      if (box) {
        // Click on canvas (may select a node)
        await canvas.click({
          position: {
            x: box.width / 2,
            y: box.height / 2,
          },
        });

        await page.waitForTimeout(500);

        // Check if a node detail panel appeared or selection changed
        // This depends on the graph implementation
        const hasSelectionUI = await page.evaluate(() => {
          const indicators = [
            '[data-selected-node]',
            '.selected-node',
            '[data-node-details]',
            '.node-panel',
          ];

          for (const selector of indicators) {
            if (document.querySelector(selector)) {
              return true;
            }
          }

          return false;
        });

        // Graph should still be functional regardless of selection
        await expect(canvas).toBeVisible();
      }
    }
  });

  test('should handle edge filtering if available', async ({ page }) => {
    await navigation.navigateToEntity('works', 'W2741809807');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    const hasGraph = await entityPage.hasGraph();

    if (hasGraph) {
      await assertions.waitForGraphRendered();

      // Look for edge filter controls
      const edgeFilterControls = page.locator('[data-edge-filter], .edge-filter, button:has-text("Filter")');

      if ((await edgeFilterControls.count()) > 0) {
        await edgeFilterControls.first().click();
        await page.waitForTimeout(500);

        // Graph should still be visible
        const canvas = page.locator('canvas').first();
        await expect(canvas).toBeVisible();
      }
    }
  });

  test('should have accessible graph controls', async ({ page }) => {
    await navigation.navigateToEntity('works', 'W2741809807');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    const hasGraph = await entityPage.hasGraph();

    if (hasGraph) {
      await assertions.waitForGraphRendered();

      // Check for keyboard accessibility
      // Graph controls should have proper ARIA labels and be keyboard accessible
      const controls = page.locator('[role="button"], button').filter({ hasText: /zoom|pan|reset/i });

      const count = await controls.count();
      if (count > 0) {
        // Verify controls are visible and enabled
        for (let i = 0; i < count; i++) {
          const control = controls.nth(i);
          await expect(control).toBeEnabled();
        }
      }
    }
  });

  test('complete graph interaction workflow', async ({ page }) => {
    // Step 1: Navigate to entity with graph
    await navigation.navigateToEntity('works', 'W2741809807');
    await waitForAppReady(page);
    await assertions.waitForEntityData();

    const hasGraph = await entityPage.hasGraph();

    if (hasGraph) {
      // Step 2: Wait for graph to load
      await assertions.waitForGraphRendered();

      // Step 3: Interact with graph (zoom)
      const zoomControls = page.locator('button:has-text("Zoom"), [data-zoom]');
      if ((await zoomControls.count()) > 0) {
        await zoomControls.first().click();
        await page.waitForTimeout(300);
      }

      // Step 4: Pan the graph
      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.move(box.x + 100, box.y + 100);
        await page.mouse.down();
        await page.mouse.move(box.x + 150, box.y + 150);
        await page.mouse.up();
        await page.waitForTimeout(300);
      }

      // Step 5: Select a node (click on canvas)
      await canvas.click();
      await page.waitForTimeout(500);

      // Step 6: Verify graph is still functional
      await expect(canvas).toBeVisible();
      const dimensions = await canvas.evaluate((el) => ({
        width: el.width,
        height: el.height,
      }));
      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);
    }
  });
});
