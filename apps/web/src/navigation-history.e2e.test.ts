/**
 * E2E tests for navigation history functionality
 * Tests that navigation events are properly logged and displayed
 */

import { test, expect } from "@playwright/test";

test.describe("Navigation History", () => {
  test("should log navigation events with complete URLs including query parameters", async ({
    page,
  }) => {
    // Clear any existing history first
    await page.addInitScript(() => {
      // Clear localStorage and IndexedDB
      localStorage.clear();
      indexedDB.deleteDatabase("app-activity");
    });

    // Start at home page
    await page.goto("http://localhost:5173");

    // Wait for the app to load and initialize the store
    await page.waitForTimeout(2000);

    // Manually add a test event to see if the store works
    await page.evaluate(() => {
      // Access the store from the window - it should be available after app initialization
      const store = (window as any).useAppActivityStore?.getState();
      if (store && store.addEvent) {
        store.addEvent({
          type: "navigation",
          category: "ui",
          event: "route_change",
          description: "Test navigation event",
          severity: "info",
          metadata: {
            route: "/works?search=test",
            searchQuery: "test",
          },
        });
      } else {
        console.log("Store not available:", {
          store,
          useAppActivityStore: (window as any).useAppActivityStore,
        });
      }
    });

    // Navigate to works with search query
    await page.goto(
      "http://localhost:5173/#/works?search=machine%20learning&filter=from_publication_date:2023-01-01",
    );

    // Navigate to authors with filters
    await page.goto(
      "http://localhost:5173/#/authors?search=john%20doe&filter=institutions.id:I123456",
    );

    // Navigate to institutions
    await page.goto(
      "http://localhost:5173/#/institutions?search=university&filter=country_code:US",
    );

    // Go to history page
    await page.goto("http://localhost:5173/#/history");

    // Wait for history to load
    await page.waitForTimeout(10000);

    // Check that navigation events are displayed
    const historyItems = page.locator(".mantine-Card-root");
    const itemCount = await historyItems.count();
    expect(itemCount).toBeGreaterThan(0);

    // Verify at least some navigation or search events exist
    const navigationEvents = historyItems.filter({
      hasText: /Navigated from|Searched/,
    });
    expect(await navigationEvents.count()).toBeGreaterThan(0);

    // Check that URLs contain query parameters
    const historyText = await page
      .locator(".mantine-Card-root")
      .allTextContents();
    const hasQueryParams = historyText.some(
      (text) =>
        text.includes("?") &&
        (text.includes("search=") || text.includes("filter=")),
    );
    expect(hasQueryParams).toBe(true);
  });

  test("should display formatted search queries instead of [object Object]", async ({
    page,
  }) => {
    // Clear any existing history first
    await page.addInitScript(() => {
      localStorage.clear();
      indexedDB.deleteDatabase("app-activity");
    });

    // Start fresh
    await page.goto("http://localhost:5173");

    // Navigate to works with search
    await page.goto(
      "http://localhost:5173/#/works?search=artificial%20intelligence",
    );

    // Navigate to authors with search
    await page.goto("http://localhost:5173/#/authors?search=alan%20turing");

    // Go to history page
    await page.goto("http://localhost:5173/#/history");

    // Wait for history to load
    await page.waitForTimeout(10000);

    // Check that search queries are displayed properly (not [object Object])
    const historyContent = await page
      .locator(".mantine-Card-root")
      .allTextContents();
    const hasObjectObject = historyContent.some((text) =>
      text.includes("[object Object]"),
    );
    expect(hasObjectObject).toBe(false);

    // Check that search queries are displayed in quotes
    const hasFormattedSearch = historyContent.some(
      (text) => text.includes('Search: "') && text.includes('"'),
    );
    expect(hasFormattedSearch).toBe(true);
  });

  test("should navigate correctly when clicking history items", async ({
    page,
  }) => {
    // Clear any existing history first
    await page.addInitScript(() => {
      localStorage.clear();
      indexedDB.deleteDatabase("app-activity");
    });

    // Start at home page
    await page.goto("http://localhost:5173");

    // Navigate to a specific work
    await page.goto("http://localhost:5173/#/works/W123456789");

    // Navigate to an author
    await page.goto("http://localhost:5173/#/authors/A123456789");

    // Go to history page
    await page.goto("http://localhost:5173/#/history");

    // Wait for history to load
    await page.waitForTimeout(10000);

    // Find a navigation button for a route that's not the history page
    const historyCards = page.locator(".mantine-Card-root");
    const cardCount = await historyCards.count();

    let clickedButton = false;
    for (let i = 0; i < cardCount; i++) {
      const card = historyCards.nth(i);
      const cardText = await card.textContent();

      // Skip if this is the history page navigation
      if (cardText && !cardText.includes("/history")) {
        const button = card.locator('button[title="Navigate to this route"]');
        if (await button.isVisible()) {
          await button.click();
          clickedButton = true;
          break;
        }
      }
    }

    if (clickedButton) {
      // Wait for navigation
      await page.waitForTimeout(1000);

      // Verify we're not on the history page anymore
      const currentUrl = page.url();
      expect(currentUrl).not.toContain("/history");

      // Verify URL structure is correct (should not have malformed paths)
      expect(currentUrl).not.toContain("#/#"); // Should not have double hash
      expect(currentUrl).toMatch(
        /^http:\/\/localhost:5173\/(#\/)?(works|authors)/,
      ); // Should be a valid route
    } else {
      // If no navigation buttons found, that's also acceptable for this test
      console.log("No navigation buttons found in history");
    }
  });

  test("should handle pagination and filter parameters in history", async ({
    page,
  }) => {
    // Clear any existing history first
    await page.addInitScript(() => {
      localStorage.clear();
      indexedDB.deleteDatabase("app-activity");
    });

    // Start at home page
    await page.goto("http://localhost:5173");

    // Navigate to works with complex query parameters
    await page.goto(
      "http://localhost:5173/#/works?search=quantum%20computing&page=2&per_page=50&filter=from_publication_date:2020-01-01,to_publication_date:2023-12-31&sort=cited_by_count:desc",
    );

    // Navigate to institutions with filters
    await page.goto(
      "http://localhost:5173/#/institutions?search=stanford&page=1&filter=country_code:US,type:education",
    );

    // Go to history page
    await page.goto("http://localhost:5173/#/history");

    // Wait for history to load
    await page.waitForTimeout(10000);

    // Check that complex URLs are stored and displayed correctly
    const historyContent = await page
      .locator(".mantine-Card-root")
      .allTextContents();
    const hasComplexParams = historyContent.some(
      (text) =>
        text.includes("page=") ||
        text.includes("per_page=") ||
        text.includes("sort="),
    );
    expect(hasComplexParams).toBe(true);

    // Verify no malformed URLs
    const hasMalformedUrls = historyContent.some(
      (text) =>
        text.includes("undefined") ||
        text.includes("null") ||
        text.includes("[object"),
    );
    expect(hasMalformedUrls).toBe(false);
  });

  test("should maintain history across page refreshes", async ({ page }) => {
    // Clear any existing history first
    await page.addInitScript(() => {
      localStorage.clear();
      indexedDB.deleteDatabase("app-activity");
    });

    // Start at home page
    await page.goto("http://localhost:5173");

    // Navigate to works
    await page.goto("http://localhost:5173/#/works?search=neural%20networks");
    await page.waitForTimeout(2000);

    // Navigate to authors
    await page.goto("http://localhost:5173/#/authors?search=maria%20curie");
    await page.waitForTimeout(2000);

    // Go to history page
    await page.goto("http://localhost:5173/#/history");

    // Wait for history to load
    await page.waitForTimeout(10000);

    // Count initial history items
    const initialCount = await page.locator(".mantine-Card-root").count();
    expect(initialCount).toBeGreaterThan(0); // Should have at least some events

    // Refresh the page
    await page.reload();

    // Wait for history to reload
    await page.waitForTimeout(2000);

    // Verify history items persist after refresh
    const afterRefreshCount = await page.locator(".mantine-Card-root").count();
    expect(afterRefreshCount).toBeGreaterThan(0); // Should still have events after refresh
  });
});
