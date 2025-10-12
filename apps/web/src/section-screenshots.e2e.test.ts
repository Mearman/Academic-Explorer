/**
 * E2E test for taking screenshots of specific UI sections
 * Captures All Nodes, All Edges, and Node Repository sections
 */

import { test } from "@playwright/test";
import { join } from "path";

test.describe("Section Screenshots", () => {
  const BASE_URL = "http://localhost:5173";
  const GRAPH_URL = `${BASE_URL}/explore/graph`;

  test("should capture screenshots of All Nodes, All Edges, and Node Repository sections", async ({
    page,
  }) => {
    // Navigate to the graph exploration page
    await page.goto(GRAPH_URL, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    });

    // Wait for the page to load
    await page.waitForTimeout(2000);

    // Open the left sidebar
    const leftSidebarToggle = page.locator(
      '[aria-label="Toggle left sidebar"]',
    );
    if ((await leftSidebarToggle.count()) > 0) {
      await leftSidebarToggle.click();
      await page.waitForTimeout(500);
    }

    // Try to find and click on section headers directly
    // Look for "All Nodes" text and take screenshot
    const allNodesText = page.locator("text=All Nodes");
    if ((await allNodesText.count()) > 0) {
      await allNodesText.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      // Take screenshot of the section content area
      const allNodesSection = allNodesText.locator(
        "xpath=ancestor::div[contains(@class, 'mantine-') and contains(@class, 'Paper') or contains(@class, 'section')]",
      );
      if ((await allNodesSection.count()) > 0) {
        await allNodesSection.screenshot({
          path: join(
            process.cwd(),
            ".tmp/dry-audit/screens/all-nodes-section.png",
          ),
        });
      } else {
        // Fallback: screenshot the text element itself
        await allNodesText.screenshot({
          path: join(
            process.cwd(),
            ".tmp/dry-audit/screens/all-nodes-section.png",
          ),
        });
      }
    }

    // Look for "All Edges" text and take screenshot
    const allEdgesText = page.locator("text=All Edges");
    if ((await allEdgesText.count()) > 0) {
      await allEdgesText.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      // Take screenshot of the section content area
      const allEdgesSection = allEdgesText.locator(
        "xpath=ancestor::div[contains(@class, 'mantine-') and contains(@class, 'Paper') or contains(@class, 'section')]",
      );
      if ((await allEdgesSection.count()) > 0) {
        await allEdgesSection.screenshot({
          path: join(
            process.cwd(),
            ".tmp/dry-audit/screens/all-edges-section.png",
          ),
        });
      } else {
        // Fallback: screenshot the text element itself
        await allEdgesText.screenshot({
          path: join(
            process.cwd(),
            ".tmp/dry-audit/screens/all-edges-section.png",
          ),
        });
      }
    }

    // Look for "Node Repository" text and take screenshot
    const nodeRepositoryText = page.locator("text=Node Repository");
    if ((await nodeRepositoryText.count()) > 0) {
      await nodeRepositoryText.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      // Take screenshot of the section content area
      const nodeRepositorySection = nodeRepositoryText.locator(
        "xpath=ancestor::div[contains(@class, 'mantine-') and contains(@class, 'Paper') or contains(@class, 'section')]",
      );
      if ((await nodeRepositorySection.count()) > 0) {
        await nodeRepositorySection.screenshot({
          path: join(
            process.cwd(),
            ".tmp/dry-audit/screens/node-repository-section.png",
          ),
        });
      } else {
        // Fallback: screenshot the text element itself
        await nodeRepositoryText.screenshot({
          path: join(
            process.cwd(),
            ".tmp/dry-audit/screens/node-repository-section.png",
          ),
        });
      }
    }

    // Take a full page screenshot for context
    await page.screenshot({
      path: join(process.cwd(), ".tmp/dry-audit/screens/graph-page-full.png"),
      fullPage: true,
    });

    console.log("✅ Screenshots captured successfully");
  });
});
