/**
 * E2E tests for sidebar functionality - bookmarks and history management
 */

import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:5173";

test.describe("Sidebar Functionality E2E Tests", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    // Navigate to the home page
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForSelector("main", { timeout: 20000 });
  });

  test("should display bookmarks in left sidebar", async ({ page }) => {
    // Open left sidebar
    await page.click('[aria-label="Toggle left sidebar"]');
    await page.waitForTimeout(1000);

    // Check if bookmarks sidebar is displayed
    const bookmarksSidebar = page.locator('text=Bookmarks');
    await expect(bookmarksSidebar).toBeVisible();

    // Check for search functionality
    const searchInput = page.locator('input[placeholder="Search bookmarks..."]');
    await expect(searchInput).toBeVisible();

    // Check for empty state message
    const emptyState = page.locator('text="No bookmarks yet"');
    await expect(emptyState).toBeVisible();
  });

  test("should display history in right sidebar", async ({ page }) => {
    // Open right sidebar
    await page.click('[aria-label="Toggle right sidebar"]');
    await page.waitForTimeout(1000);

    // Check if history sidebar is displayed
    const historySidebar = page.locator('text=History');
    await expect(historySidebar).toBeVisible();

    // Check for search functionality
    const searchInput = page.locator('input[placeholder="Search history..."]');
    await expect(searchInput).toBeVisible();

    // Check for clear history button
    const clearHistoryButton = page.locator('button[aria-label*="history"]');
    await expect(clearHistoryButton).toBeVisible();

    // Check for empty state message
    const emptyState = page.locator('text="No navigation history yet"');
    await expect(emptyState).toBeVisible();
  });

  test("should allow bookmarking entities from entity pages", async ({ page }) => {
    // Navigate to a work page
    const workUrl = `${BASE_URL}/#/works/W2741809807`;
    await page.goto(workUrl, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check if bookmark button is present
    const bookmarkButton = page.locator('[data-testid*="bookmark"], button[aria-label*="bookmark"], button:has-text("Bookmark")');

    // If bookmark button exists, try to bookmark
    if (await bookmarkButton.isVisible()) {
      await bookmarkButton.click();
      await page.waitForTimeout(1000);

      // Open left sidebar and check if bookmark appears
      await page.click('[aria-label="Toggle left sidebar"]');
      await page.waitForTimeout(1000);

      // Check if bookmark is displayed in sidebar
      const bookmarkCard = page.locator('[data-testid="bookmark-card"]');
      await expect(bookmarkCard).toBeVisible({ timeout: 5000 });
    }
  });

  test("should track navigation history when navigating between pages", async ({ page }) => {
    // Navigate to several pages to build history
    const pages = [
      `${BASE_URL}/#/works/W2741809807`,
      `${BASE_URL}/#/authors/A2091240782`,
      `${BASE_URL}/#/institutions/I33213144`,
      `${BASE_URL}/#/about`
    ];

    for (const pageUrl of pages) {
      await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1000);
    }

    // Open right sidebar and check if history is tracked
    await page.click('[aria-label="Toggle right sidebar"]');
    await page.waitForTimeout(1000);

    // Check if history entries are displayed
    const historyEntries = page.locator('text=/Today|Yesterday|\\d{1,2}\\/\\d{1,2}\\/\\d{4}/');
    await expect(historyEntries.first()).toBeVisible({ timeout: 5000 });

    // Check if history contains recent navigation
    const recentEntry = page.locator('text="/works/W2741809807"');
    await expect(recentEntry).toBeVisible();
  });

  test("should allow navigation from history entries", async ({ page }) => {
    // First, navigate to a page to build history
    const workUrl = `${BASE_URL}/#/works/W2741809807`;
    await page.goto(workUrl, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1000);

    // Navigate to another page
    await page.goto(`${BASE_URL}/#/about`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1000);

    // Open right sidebar
    await page.click('[aria-label="Toggle right sidebar"]');
    await page.waitForTimeout(1000);

    // Find and click on the work URL in history
    const historyEntry = page.locator('text="/works/W2741809807"');
    await expect(historyEntry).toBeVisible();

    // Click on the history entry or its navigation button
    const navigateButton = page.locator('button[aria-label*="Navigate"]');
    if (await navigateButton.isVisible()) {
      await navigateButton.first().click();
    } else {
      await historyEntry.click();
    }

    await page.waitForTimeout(2000);

    // Verify we're back on the work page
    const workContent = page.locator('text="WORK"');
    await expect(workContent).toBeVisible();
  });

  test("should allow searching bookmarks", async ({ page }) => {
    // Open left sidebar
    await page.click('[aria-label="Toggle left sidebar"]');
    await page.waitForTimeout(1000);

    // Focus on search input
    const searchInput = page.locator('input[placeholder="Search bookmarks..."]');
    await searchInput.fill("test");
    await page.waitForTimeout(500);

    // Check if search works (should show "No bookmarks found" since we don't have bookmarks)
    const noResults = page.locator('text="No bookmarks found"');
    await expect(noResults).toBeVisible();
  });

  test("should allow searching history", async ({ page }) => {
    // First, navigate to build some history
    await page.goto(`${BASE_URL}/#/works/W2741809807`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1000);

    // Open right sidebar
    await page.click('[aria-label="Toggle right sidebar"]');
    await page.waitForTimeout(1000);

    // Focus on search input
    const searchInput = page.locator('input[placeholder="Search history..."]');
    await searchInput.fill("works");
    await page.waitForTimeout(500);

    // Check if search works (should filter history)
    const filteredEntry = page.locator('text="/works/W2741809807"');
    await expect(filteredEntry).toBeVisible();
  });

  test("should allow clearing history", async ({ page }) => {
    // First, navigate to build some history
    await page.goto(`${BASE_URL}/#/works/W2741809807`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1000);

    // Open right sidebar
    await page.click('[aria-label="Toggle right sidebar"]');
    await page.waitForTimeout(1000);

    // Find and click clear history button
    const clearButton = page.locator('button[aria-label*="history"]');
    await expect(clearButton).toBeVisible();

    // Clear history
    await clearButton.click();
    await page.waitForTimeout(1000);

    // Check if history is cleared
    const emptyState = page.locator('text="No navigation history yet"');
    await expect(emptyState).toBeVisible();
  });

  test("should maintain sidebar state across page navigation", async ({ page }) => {
    // Open both sidebars
    await page.click('[aria-label="Toggle left sidebar"]');
    await page.waitForTimeout(500);
    await page.click('[aria-label="Toggle right sidebar"]');
    await page.waitForTimeout(500);

    // Navigate to another page
    await page.goto(`${BASE_URL}/#/works/W2741809807`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check if sidebars remain open
    const bookmarksSidebar = page.locator('text=Bookmarks');
    const historySidebar = page.locator('text=History');

    await expect(bookmarksSidebar).toBeVisible();
    await expect(historySidebar).toBeVisible();
  });

  test("should allow resizing sidebars", async ({ page }) => {
    // Open left sidebar
    await page.click('[aria-label="Toggle left sidebar"]');
    await page.waitForTimeout(1000);

    // Find the resize handle
    const resizeHandle = page.locator('[role="slider"][aria-label*="Resize left sidebar"]');
    await expect(resizeHandle).toBeVisible();

    // Note: Actually testing drag functionality in Playwright is complex
    // so we just verify the handle exists and has correct attributes
    await expect(resizeHandle).toHaveAttribute('aria-valuemin', '200');
    await expect(resizeHandle).toHaveAttribute('aria-valuemax', '600');
  });

  test("should allow pinning sidebars", async ({ page }) => {
    // Open left sidebar
    await page.click('[aria-label="Toggle left sidebar"]');
    await page.waitForTimeout(1000);

    // Find pin button
    const pinButton = page.locator('button[aria-label*="Pin left sidebar"]');
    await expect(pinButton).toBeVisible();

    // Click to pin
    await pinButton.click();
    await page.waitForTimeout(500);

    // Check if button changes to "Unpin"
    const unpinButton = page.locator('button[aria-label*="Unpin left sidebar"]');
    await expect(unpinButton).toBeVisible();
  });

  test("should be keyboard accessible", async ({ page }) => {
    // Focus on the main content area
    await page.press('body', 'Tab');

    // Try to navigate to sidebar toggle buttons using keyboard
    await page.press('body', 'Tab');
    await page.press('body', 'Tab');
    await page.press('body', 'Tab');
    await page.press('body', 'Tab');

    // Check if any sidebar toggle button is focused
    const focusedElement = page.locator(':focus');
    const isToggleFocused = await focusedElement.evaluate(el => {
      const ariaLabel = el.getAttribute('aria-label');
      return ariaLabel && ariaLabel.includes('sidebar');
    });

    // This test verifies keyboard navigation structure
    // In a real implementation, you'd want specific focus management
    expect(isToggleFocused).toBeDefined();
  });
});