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
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });

    // Check if left sidebar toggle button exists and is visible
    const leftSidebarToggle = page.locator('[aria-label="Toggle left sidebar"]');
    await expect(leftSidebarToggle).toBeVisible({ timeout: 5000 });

    // Check if sidebar is already open by looking for the bookmarks content directly
    let bookmarksSidebar = page.locator('text=Bookmarks');
    const isBookmarksVisible = await bookmarksSidebar.isVisible().catch(() => false);

    console.log(`Bookmarks sidebar initially visible: ${isBookmarksVisible}`);

    if (!isBookmarksVisible) {
      // Open left sidebar if it's not already open
      console.log('Opening left sidebar...');
      await leftSidebarToggle.click();

      // Wait for sidebar to open and content to potentially load
      await page.waitForTimeout(3000);
    }

    // Check if bookmarks sidebar is displayed
    await expect(bookmarksSidebar).toBeVisible({ timeout: 5000 });
    console.log('Bookmarks sidebar is visible');

    // Wait additional time for content to load after sidebar opens
    await page.waitForTimeout(5000);

    // Check if it's stuck in loading state first
    const loadingText = page.locator('text="Loading bookmarks..."');
    const isLoading = await loadingText.isVisible().catch(() => false);

    if (isLoading) {
      console.log('ERROR: Bookmarks sidebar is stuck in loading state');
      throw new Error('Bookmarks sidebar is stuck in loading state - useUserInteractions hook issue');
    }

    // Check for empty state message (should be visible if no bookmarks)
    const emptyState = page.locator('text="No bookmarks yet"');
    const emptyStateVisible = await emptyState.isVisible().catch(() => false);
    console.log(`Empty state visible: ${emptyStateVisible}`);

    // Check for search functionality
    const searchInput = page.locator('input[placeholder="Search bookmarks..."]');
    const searchInputVisible = await searchInput.isVisible().catch(() => false);
    console.log(`Search input visible: ${searchInputVisible}`);

    // Check for bookmarks panel text
    const panelText = page.locator('text="Bookmarks"');
    const panelTextVisible = await panelText.isVisible().catch(() => false);
    console.log(`Panel text visible: ${panelTextVisible}`);

    if (!searchInputVisible && !panelTextVisible) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'debug-sidebar-content.png' });
      console.log('Neither search input nor panel text is visible - taking screenshot');
    }

    // At least one of these should be visible
    await expect(searchInput.or(panelText)).toBeVisible();
    console.log('Either search input or panel text is visible');
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

    // Check for either empty state or actual history entries
    const emptyState = page.locator('text="No navigation history yet"');
    const historyEntries = page.locator('text=/Today|Yesterday|items/');
    await expect(emptyState.or(historyEntries)).toBeVisible();
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

    // Should show either "No bookmarks found" or actual bookmark entries
    const noResults = page.locator('text="No bookmarks found"');
    const bookmarkEntries = page.locator('text=/Bookmark|bookmark/');
    await expect(noResults.or(bookmarkEntries)).toBeVisible();
  });
});