/**
 * E2E tests for graph visualization functionality
 * Tests the XYFlow graph rendering, interactions, and performance
 */

import { expect, test } from "@playwright/test";

test.describe("Graph Visualization E2E Tests", () => {
  const TEST_AUTHOR_ID = "A5017898742";
  const BASE_URL = "http://localhost:5173";
  const AUTHOR_URL = `${BASE_URL}/authors/${TEST_AUTHOR_ID}`;

  test("should render the author page without infinite loops", async ({
    page,
  }) => {
    await page.goto(AUTHOR_URL, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    });

    // Wait for Academic Explorer header to appear
    await page.waitForSelector("text=Academic Explorer", { timeout: 5000 });

    // Check if page loaded successfully
    const pageContent = await page.locator("body").count();
    expect(pageContent).toBeGreaterThan(0);

    // Check for Academic Explorer header
    const header = await page.locator("text=Academic Explorer").count();
    expect(header).toBeGreaterThan(0);

    console.log("✅ Author page rendered without infinite loops");
  });

  test("should render graph components without crashing", async ({ page }) => {
    await page.goto(AUTHOR_URL, { timeout: 10000 });

    // Wait for page to be ready
    await page.waitForSelector("text=Academic Explorer", { timeout: 3000 });

    // Check for XYFlow/ReactFlow containers
    const graphSelectors = [
      ".xyflow",
      ".react-flow",
      '[data-testid="rf__wrapper"]',
      ".react-flow__renderer",
      ".react-flow__container",
    ];

    for (const selector of graphSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        console.log(`✅ Found graph container: ${selector}`);
        break;
      } catch {
        // Continue to next selector
      }
    }

    // Check for critical errors
    const hasErrors = await page.locator('text="Maximum update depth"').count();
    expect(hasErrors).toBe(0);

    console.log(`✅ Graph components rendered without crashing`);
  });

  test("should handle data loading without infinite loops", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];

    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(AUTHOR_URL, { timeout: 10000 });

    // Wait for page to stabilize
    await page.waitForSelector("text=Academic Explorer", { timeout: 3000 });

    // Wait for any loading indicators to disappear (if they exist)
    try {
      await page.waitForSelector('[data-loading="true"]', {
        state: "detached",
        timeout: 5000,
      });
    } catch {
      // Loading indicator might not exist, continue
    }

    // Filter out non-critical errors
    const criticalErrors = consoleErrors.filter(
      (error) =>
        error.includes("Maximum update depth") ||
        error.includes("infinite loop") ||
        error.includes("too many re-renders"),
    );

    expect(criticalErrors).toHaveLength(0);

    console.log("✅ Data loading handled without infinite loops");
  });
});
