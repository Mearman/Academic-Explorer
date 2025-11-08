/**
 * E2E tests for sidebar functionality - bookmarks and history management
 */

import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:5173";

test.describe("Sidebar Functionality E2E Tests", () => {
  test.setTimeout(30000); // Reduced timeout for faster execution

  test.beforeEach(async ({ page }) => {
    // Navigate to the home page with shorter timeout
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 15000 });
  });

  test("should display bookmarks sidebar with basic functionality", async ({ page }) => {
    // Open left sidebar
    await page.click('[aria-label="Toggle left sidebar"]');

    // Check if bookmarks sidebar is displayed
    const bookmarksSidebar = page.locator('text=Bookmarks');
    await expect(bookmarksSidebar).toBeVisible({ timeout: 5000 });

    // Check for search functionality
    const searchInput = page.locator('input[placeholder="Search bookmarks..."]');
    await expect(searchInput).toBeVisible();

    // Check for empty state message
    const emptyState = page.locator('text="No bookmarks yet"');
    await expect(emptyState).toBeVisible();
  });

  test("should display history sidebar with basic functionality", async ({ page }) => {
    // Open right sidebar
    await page.click('[aria-label="Toggle right sidebar"]');

    // Check if history sidebar is displayed
    const historySidebar = page.locator('text=History');
    await expect(historySidebar).toBeVisible({ timeout: 5000 });

    // Check for search functionality
    const searchInput = page.locator('input[placeholder="Search history..."]');
    await expect(searchInput).toBeVisible();

    // Check for empty state message
    const emptyState = page.locator('text="No navigation history yet"');
    await expect(emptyState).toBeVisible();
  });

  test("should track navigation history", async ({ page }) => {
    // Navigate to a work page to build history
    const workUrl = `${BASE_URL}/#/works/W2741809807`;
    await page.goto(workUrl, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Open right sidebar and check if history is tracked
    await page.click('[aria-label="Toggle right sidebar"]');

    // Check if history entries are displayed (may be grouped by date)
    const historyEntries = page.locator('text=/works\\/W2741809807|Today|Yesterday/');
    await expect(historyEntries.first()).toBeVisible({ timeout: 5000 });
  });

  test("should maintain sidebar state across page navigation", async ({ page }) => {
    // Open both sidebars
    await page.click('[aria-label="Toggle left sidebar"]');
    await page.click('[aria-label="Toggle right sidebar"]');

    // Navigate to another page
    await page.goto(`${BASE_URL}/#/about`, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Check if sidebars remain open (they should)
    const bookmarksSidebar = page.locator('text=Bookmarks');
    const historySidebar = page.locator('text=History');

    await expect(bookmarksSidebar).toBeVisible({ timeout: 5000 });
    await expect(historySidebar).toBeVisible({ timeout: 5000 });
  });

  test("should allow searching in sidebars", async ({ page }) => {
    // Open left sidebar
    await page.click('[aria-label="Toggle left sidebar"]');

    // Test search functionality
    const searchInput = page.locator('input[placeholder="Search bookmarks..."]');
    await searchInput.fill("test");

    // Should show "No bookmarks found" since we don't have bookmarks
    const noResults = page.locator('text="No bookmarks found"');
    await expect(noResults).toBeVisible();
  });
});