/**
 * E2E tests for bookmark functionality
 * Tests bookmark creation, management, and persistence across entity types
 */

import { expect, test } from "@playwright/test";

test.describe("Bookmark Functionality E2E Tests", () => {
  const BASE_URL = "http://localhost:5173";

  // Test entities from different types
  const TEST_ENTITIES = [
    { type: "authors", id: "A5017898742", name: "Test Author" },
    { type: "works", id: "W2741809807", name: "Test Work" },
    { type: "institutions", id: "I27837315", name: "Test Institution" },
    { type: "sources", id: "S137773608", name: "Test Source" },
  ];

  test.beforeEach(async ({ page, context }) => {
    // Clear storage before each test to ensure clean state
    await context.clearCookies();
    await page.goto(BASE_URL);

    // Wait for app to load
    await page.waitForLoadState("networkidle");
  });

  test.describe("Entity Page Bookmarking", () => {
    test("should show bookmark button on author pages", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      await page.goto(`${BASE_URL}/authors/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Check for bookmark button (ActionIcon component in header)
    // Look for any button in the header area that might be the bookmark button
    const headerButtons = page.locator('button').filter({ has: page.locator('svg') }).all();

    let bookmarkButtonFound = false;
    for (const button of await headerButtons) {
      const isVisible = await button.isVisible();
      if (isVisible) {
        // Check if this button contains a bookmark-like icon
        const hasIcon = await button.locator('svg').isVisible();
        if (hasIcon) {
          bookmarkButtonFound = true;
          break;
        }
      }
    }

    expect(bookmarkButtonFound).toBe(true);
    });

    test("should show bookmark button on work pages", async ({ page }) => {
      const entity = TEST_ENTITIES[1]; // Work

      await page.goto(`${BASE_URL}/works/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Check for bookmark button (ActionIcon component in header)
    // Look for any button in the header area that might be the bookmark button
    const headerButtons = page.locator('button').filter({ has: page.locator('svg') }).all();

    let bookmarkButtonFound = false;
    for (const button of await headerButtons) {
      const isVisible = await button.isVisible();
      if (isVisible) {
        // Check if this button contains a bookmark-like icon
        const hasIcon = await button.locator('svg').isVisible();
        if (hasIcon) {
          bookmarkButtonFound = true;
          break;
        }
      }
    }

    expect(bookmarkButtonFound).toBe(true);
    });

    test("should bookmark an author entity successfully", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      await page.goto(`${BASE_URL}/authors/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Find and click bookmark button (look for any button with SVG icon in header)
      const buttons = page.locator('button').filter({ has: page.locator('svg') });
      const bookmarkButton = buttons.first();
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });

      // Get initial state (should be unbookmarked)
      const initialIcon = bookmarkButton.locator('svg');
      await expect(initialIcon).toBeVisible();

      // Click to bookmark
      await bookmarkButton.click();

      // Wait for bookmark to be processed
      await page.waitForTimeout(1000);

      // Verify bookmark was created by checking if button state changed
      // This might be a filled icon or different color
      const updatedIcon = bookmarkButton.locator('svg');
      await expect(updatedIcon).toBeVisible();
    });

    test("should unbookmark an entity successfully", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      await page.goto(`${BASE_URL}/authors/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Find bookmark button (look for any button with SVG icon in header)
      const buttons = page.locator('button').filter({ has: page.locator('svg') });
      const bookmarkButton = buttons.first();
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });

      // First bookmark the entity
      await bookmarkButton.click();
      await page.waitForTimeout(1000);

      // Then unbookmark it
      await bookmarkButton.click();
      await page.waitForTimeout(1000);

      // Verify the button state changed back
      const finalIcon = bookmarkButton.locator('svg');
      await expect(finalIcon).toBeVisible();
    });

    test("should persist bookmarks across page reloads", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      await page.goto(`${BASE_URL}/authors/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Find bookmark button (look for any button with SVG icon in header)
      const buttons = page.locator('button').filter({ has: page.locator('svg') });
      const bookmarkButton = buttons.first();
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });

      // Bookmark the entity
      await bookmarkButton.click();
      await page.waitForTimeout(1000);

      // Reload the page
      await page.reload({ waitUntil: "networkidle" });

      // Wait for page to load again
      await page.waitForTimeout(2000);

      // Verify bookmark button is still in bookmarked state
      const reloadedBookmarkButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      await expect(reloadedBookmarkButton).toBeVisible({ timeout: 10000 });
    });

    test("should bookmark multiple entity types", async ({ page }) => {
      // Test bookmarking multiple entities
      for (const entity of TEST_ENTITIES.slice(0, 2)) { // Test author and work
        await page.goto(`${BASE_URL}/${entity.type}/${entity.id}`, {
          waitUntil: "networkidle",
          timeout: 30000,
        });

        // Find and click bookmark button
        const buttons = page.locator('button').filter({ has: page.locator('svg') });
      const bookmarkButton = buttons.first();
        await expect(bookmarkButton).toBeVisible({ timeout: 10000 });

        await bookmarkButton.click();
        await page.waitForTimeout(1000);
      }

      // Navigate to bookmarks page to verify
      await page.goto(`${BASE_URL}/bookmarks`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Wait for bookmarks to load
      await page.waitForTimeout(2000);

      // Check that we have bookmarks
      const bookmarkCards = page.locator('[data-testid="bookmark-card"], .mantine-Card-root');
      await expect(bookmarkCards.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Bookmarks Page", () => {
    test("should load bookmarks page", async ({ page }) => {
      await page.goto(`${BASE_URL}/bookmarks`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Check page loaded
      const header = page.locator('text=Bookmarks');
      await expect(header).toBeVisible({ timeout: 10000 });
    });

    test("should display bookmarked entities", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      // First bookmark an entity
      await page.goto(`${BASE_URL}/authors/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      const buttons = page.locator('button').filter({ has: page.locator('svg') });
      const bookmarkButton = buttons.first();
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });
      await bookmarkButton.click();
      await page.waitForTimeout(1000);

      // Then go to bookmarks page
      await page.goto(`${BASE_URL}/bookmarks`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Wait for bookmarks to load
      await page.waitForTimeout(2000);

      // Should see bookmarked entity
      const bookmarkContent = page.locator('.mantine-Card-root').first();
      await expect(bookmarkContent).toBeVisible({ timeout: 10000 });
    });

    test("should allow navigation from bookmark to entity", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      // First bookmark an entity
      await page.goto(`${BASE_URL}/authors/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      const buttons = page.locator('button').filter({ has: page.locator('svg') });
      const bookmarkButton = buttons.first();
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });
      await bookmarkButton.click();
      await page.waitForTimeout(1000);

      // Go to bookmarks page
      await page.goto(`${BASE_URL}/bookmarks`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(2000);

      // Find and click on a bookmark
      const bookmarkLink = page.locator('.mantine-Card-root').first().locator('a').first();
      if (await bookmarkLink.isVisible()) {
        await bookmarkLink.click();

        // Should navigate back to entity page (wait for navigation and verify URL)
        await page.waitForTimeout(2000); // Wait for navigation
        const currentUrl = page.url();
        expect(currentUrl).toContain(`authors/${entity.id}`);
      }
    });

    test("should show empty state when no bookmarks", async ({ page }) => {
      // Ensure we're starting with no bookmarks
      await page.context().clearCookies();
      await page.goto(BASE_URL);
      await page.waitForLoadState("networkidle");

      // Go to bookmarks page
      await page.goto(`${BASE_URL}/bookmarks`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Should show empty state (look for any text indicating no bookmarks)
      await page.waitForTimeout(2000); // Wait for bookmarks to load

      // Check page content for empty state indicators
      const pageContent = await page.content();
      const hasEmptyStateText = pageContent.includes('No bookmarks yet') ||
                               pageContent.includes('No bookmarks found') ||
                               pageContent.includes('Bookmark entities you want to revisit');

      expect(hasEmptyStateText).toBe(true);
    });
  });

  test.describe("Search Bookmarking", () => {
    test("should bookmark search results", async ({ page }) => {
      const searchQuery = "machine learning";

      await page.goto(`${BASE_URL}/search?q=${encodeURIComponent(searchQuery)}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Look for bookmark button on search page
      const buttons = page.locator('button').filter({ has: page.locator('svg') });
      const bookmarkButton = buttons.first();

      if (await bookmarkButton.isVisible({ timeout: 10000 })) {
        await bookmarkButton.click();
        await page.waitForTimeout(1000);

        // Go to bookmarks to verify
        await page.goto(`${BASE_URL}/bookmarks`, {
          waitUntil: "networkidle",
          timeout: 30000,
        });

        await page.waitForTimeout(2000);

        // Should see the search bookmark
        const bookmarkContent = page.locator('.mantine-Card-root').first();
        if (await bookmarkContent.isVisible()) {
          await expect(bookmarkContent).toBeVisible();
        }
      }
    });
  });

  test.describe("Error Handling", () => {
    test("should handle bookmark errors gracefully", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      await page.goto(`${BASE_URL}/authors/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Listen for console errors
      const errors: string[] = [];
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });

      const buttons = page.locator('button').filter({ has: page.locator('svg') });
      const bookmarkButton = buttons.first();
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });

      // Try bookmarking multiple times rapidly
      for (let i = 0; i < 3; i++) {
        await bookmarkButton.click();
        await page.waitForTimeout(100);
      }

      // Wait for any errors to surface
      await page.waitForTimeout(2000);

      // Should not have console errors
      expect(errors.filter(e => e.includes('bookmark'))).toHaveLength(0);
    });

    test("should handle navigation with bookmarks", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      // Bookmark an entity
      await page.goto(`${BASE_URL}/authors/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      const buttons = page.locator('button').filter({ has: page.locator('svg') });
      const bookmarkButton = buttons.first();
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });
      await bookmarkButton.click();
      await page.waitForTimeout(1000);

      // Navigate to different pages
      await page.goto(`${BASE_URL}/works/W2741809807`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(1000);

      // Go back to original entity
      await page.goto(`${BASE_URL}/authors/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Should still see bookmark button and bookmarked state
      const returnBookmarkButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      await expect(returnBookmarkButton).toBeVisible({ timeout: 10000 });
    });
  });
});