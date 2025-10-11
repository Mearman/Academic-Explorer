/**
 * Debug test to see what navigation events are actually being logged
 */

import { test, expect } from "@playwright/test";

test.describe("Debug Navigation", () => {
  test("check what events are logged", async ({ page }) => {
    // Clear any existing history first
    await page.addInitScript(() => {
      localStorage.clear();
      indexedDB.deleteDatabase("app-activity");
    });

    // Start at home page
    await page.goto("http://localhost:5173");

    // Navigate to works with search
    await page.goto("http://localhost:5173/#/works?search=machine+learning");

    // Wait a bit
    await page.waitForTimeout(2000);

    // Go to history page
    await page.goto("http://localhost:5173/#/history");

    // Wait for history to load
    await page.waitForTimeout(2000);

    // Get all history items
    const historyItems = page.locator(".mantine-Card-root");
    const itemCount = await historyItems.count();
    console.log(`Found ${itemCount} history items`);

    if (itemCount > 0) {
      const allText = await historyItems.allTextContents();
      console.log("History items text:", allText);
    }

    // Check if there are any events at all
    expect(itemCount).toBeGreaterThanOrEqual(0); // Just check we can access the page
  });
});
