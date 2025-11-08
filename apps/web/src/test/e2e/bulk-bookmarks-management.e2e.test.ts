/**
 * End-to-end test for bulk bookmarks delete functionality
 */

import { test, expect } from "@playwright/test";

test.describe("Bulk Bookmarks Management", () => {
  test.beforeEach(async ({ page }) => {
    // First, ensure we have some bookmarks by creating them
    await createTestBookmarks(page);

    // Navigate to bookmarks page
    await page.goto("http://localhost:5173/#/bookmarks");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Wait for bookmarks to load (look for bookmark cards or empty state)
    await Promise.race([
      page.waitForSelector('[data-testid="bookmark-card"], .mantine-Card-withBorder', { timeout: 10000 }),
      page.waitForSelector('text="No bookmarks yet"', { timeout: 10000 })
    ]);
  });

  // Helper function to create test bookmarks
  async function createTestBookmarks(page) {
    // Navigate to author page first to ensure context is loaded
    await page.goto("http://localhost:5173/#/authors/A5017898742");
    await page.waitForLoadState("networkidle");

    // Create bookmarks programmatically by accessing global service
    await page.evaluate(async () => {
      try {
        // Access the global user interactions service if it exists
        // @ts-ignore - Access global service for testing
        const { userInteractionsService } = window;

        if (!userInteractionsService) {
          throw new Error('userInteractionsService not available on window object');
        }

        // Create first bookmark for author A5017898742
        await userInteractionsService.addBookmark({
          request: {
            cacheKey: '/authors/A5017898742',
            hash: 'entity-authors-A5017898742'.slice(0, 16),
            endpoint: '/authors',
            params: { id: 'A5017898742' }
          },
          title: 'Test Author 1 - A5017898742',
          notes: 'Test bookmark for e2e testing',
          tags: ['test', 'e2e', 'author']
        });

        // Create second bookmark for author A5023888391
        await userInteractionsService.addBookmark({
          request: {
            cacheKey: '/authors/A5023888391',
            hash: 'entity-authors-A5023888391'.slice(0, 16),
            endpoint: '/authors',
            params: { id: 'A5023888391' }
          },
          title: 'Test Author 2 - A5023888391',
          notes: 'Another test bookmark for e2e testing',
          tags: ['test', 'e2e', 'author']
        });

        return 'Bookmarks created successfully';
      } catch (error) {
        console.error('Failed to create bookmarks:', error);
        return `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    });

    // Wait a moment for bookmarks to be saved
    await page.waitForTimeout(1000);
  }

  test("should display bookmarks management interface", async ({ page }) => {
    // Check that bookmarks section is visible in main content
    await expect(page.locator('main:has-text("Bookmarks")')).toBeVisible();

    // Check for search input in main content
    await expect(page.locator('main input[placeholder="Search bookmarks..."]')).toBeVisible();

    // Get initial count of bookmarks
    const bookmarkCards = page.locator('[data-testid="bookmark-card"]');
    const initialCount = await bookmarkCards.count();

    console.log(`Found ${initialCount} bookmarks initially`);

    // If there are bookmarks, check for Select All button
    if (initialCount > 0) {
      await expect(page.locator('button:has-text("Select All")')).toBeVisible();
    }
  });

  test("should allow selecting individual bookmarks", async ({ page }) => {
    // Look for bookmark cards
    const bookmarkCards = page.locator('[data-testid="bookmark-card"]');
    const count = await bookmarkCards.count();

    if (count === 0) {
      test.skip();
      return;
    }

    // Get the first bookmark checkbox
    const firstCheckbox = bookmarkCards.first().locator('input[type="checkbox"]');
    await expect(firstCheckbox).toBeVisible();

    // Select the first bookmark
    await firstCheckbox.check();

    // Verify it's selected (should have blue border)
    const firstCard = bookmarkCards.first();
    await expect(firstCard).toHaveClass(/border-blue-500/);

    // Check that selection counter appears
    await expect(page.locator('text=1 selected')).toBeVisible();

    // Check that delete button appears
    await expect(page.locator('[title="Delete selected bookmarks"]')).toBeVisible();
  });

  test("should allow selecting all bookmarks", async ({ page }) => {
    // Look for bookmark cards
    const bookmarkCards = page.locator('[data-testid="bookmark-card"]');
    const count = await bookmarkCards.count();

    if (count === 0) {
      test.skip();
      return;
    }

    // Click Select All button
    await page.locator('button:has-text("Select All")').click();

    // Verify all checkboxes are checked
    const checkboxes = page.locator('[data-testid="bookmark-card"] input[type="checkbox"]');
    const checkedCount = await checkboxes.filter({ hasText: "" }).evaluateAll((elements) =>
      elements.filter(el => (el as HTMLInputElement).checked).length
    );

    expect(checkedCount).toBe(count);

    // Check that selection counter shows total count
    await expect(page.locator(`text=${count} selected`)).toBeVisible();

    // Check that delete button appears
    await expect(page.locator('[title="Delete selected bookmarks"]')).toBeVisible();
  });

  test("should allow deselecting all bookmarks", async ({ page }) => {
    // Look for bookmark cards
    const bookmarkCards = page.locator('[data-testid="bookmark-card"]');
    const count = await bookmarkCards.count();

    if (count === 0) {
      test.skip();
      return;
    }

    // First select all
    await page.locator('button:has-text("Select All")').click();

    // Verify selection counter appears
    await expect(page.locator(`text=${count} selected`)).toBeVisible();

    // Click Deselect All button
    await page.locator('button:has-text("Deselect All")').click();

    // Verify no cards are selected
    const selectedCards = page.locator('.border-blue-500');
    await expect(selectedCards).toHaveCount(0);

    // Verify selection counter disappears
    await expect(page.locator('text=selected')).not.toBeVisible();
  });

  test("should perform bulk delete operation", async ({ page }) => {
    // Look for bookmark cards
    const bookmarkCards = page.locator('[data-testid="bookmark-card"]');
    const count = await bookmarkCards.count();

    if (count === 0) {
      test.skip();
      return;
    }

    // Get initial count
    const initialCount = count;
    console.log(`Starting with ${initialCount} bookmarks`);

    // Select at least one bookmark (or all if there are few)
    if (count >= 2) {
      // Select the first two bookmarks
      await bookmarkCards.first().locator('input[type="checkbox"]').check();
      await bookmarkCards.nth(1).locator('input[type="checkbox"]').check();

      // Verify 2 are selected
      await expect(page.locator('text=2 selected')).toBeVisible();
    } else {
      // Select the only bookmark
      await bookmarkCards.first().locator('input[type="checkbox"]').check();
      await expect(page.locator('text=1 selected')).toBeVisible();
    }

    // Click delete button
    await page.locator('[title="Delete selected bookmarks"]').click();

    // Verify confirmation modal appears
    await expect(page.locator('text=Delete Selected Bookmarks')).toBeVisible();
    await expect(page.locator('text=Are you sure you want to delete')).toBeVisible();

    // Click confirm button
    const confirmButton = page.locator('button:has-text("Delete")');
    await confirmButton.click();

    // Wait for operation to complete (modal should disappear)
    await page.waitForSelector('text=Delete Selected Bookmarks', { state: 'detached', timeout: 10000 });

    // Wait a bit for the UI to update
    await page.waitForTimeout(1000);

    // Verify success modal appears (use main content to avoid sidebar conflicts)
    await expect(page.locator('main:has-text("Success")')).toBeVisible({ timeout: 5000 });

    // Close success modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Wait for the UI to update without full page refresh
    await page.waitForTimeout(1000);

    // Get final count - should be immediately updated
    const finalBookmarkCards = page.locator('[data-testid="bookmark-card"]');
    const finalCount = await finalBookmarkCards.count();

    console.log(`Ended with ${finalCount} bookmarks after bulk delete`);

    // The count should have decreased by the number of deleted bookmarks
    const expectedFinalCount = initialCount >= 2 ? initialCount - 2 : initialCount - 1;
    expect(finalCount).toBeLessThanOrEqual(expectedFinalCount);
  });

  test("should handle search functionality", async ({ page }) => {
    // Look for bookmark cards
    const bookmarkCards = page.locator('[data-testid="bookmark-card"]');
    const count = await bookmarkCards.count();

    if (count === 0) {
      test.skip();
      return;
    }

    // Get the title of the first bookmark for searching
    const firstTitle = await bookmarkCards.first().locator('[data-testid="bookmark-title-link"]').textContent();

    if (!firstTitle) {
      test.skip();
      return;
    }

    // Search for the first bookmark title (use main content to avoid sidebar conflicts)
    const searchInput = page.locator('main input[placeholder="Search bookmarks..."]');
    await searchInput.fill(firstTitle);

    // Wait for search to filter
    await page.waitForTimeout(500);

    // Should show 1 bookmark (the one we searched for)
    const filteredCards = page.locator('[data-testid="bookmark-card"]');
    const filteredCount = await filteredCards.count();

    expect(filteredCount).toBeGreaterThanOrEqual(1);

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(500);

    // Should show all bookmarks again
    const allCardsAfterClear = page.locator('[data-testid="bookmark-card"]');
    const countAfterClear = await allCardsAfterClear.count();

    expect(countAfterClear).toBe(count);
  });

  test("should show empty state when no bookmarks exist", async ({ page }) => {
    // This test is for when there are no bookmarks
    const bookmarkCards = page.locator('[data-testid="bookmark-card"]');
    const count = await bookmarkCards.count();

    if (count > 0) {
      test.skip();
      return;
    }

    // Check for empty state in main content
    await expect(page.locator('main:has-text("No bookmarks yet")')).toBeVisible();
    await expect(page.locator('main:has-text("Bookmark entities you want to revisit later")')).toBeVisible();

    // Select All button should not be visible
    await expect(page.locator('button:has-text("Select All")')).not.toBeVisible();
  });

  test("should sync bookmark deletions between main page and sidebar", async ({ page }) => {
    // Look for bookmark cards
    const bookmarkCards = page.locator('[data-testid="bookmark-card"]');
    const count = await bookmarkCards.count();

    if (count < 2) {
      test.skip();
      return;
    }

    // Helper function to open/close bookmarks sidebar
    const toggleSidebar = async () => {
      // Look for the left sidebar toggle button (it has a specific icon)
      const sidebarToggle = page.locator('button[aria-label*="left"], button[title*="left"], button:has(svg)').first();
      if (await sidebarToggle.isVisible()) {
        await sidebarToggle.click();
        await page.waitForTimeout(500); // Wait for sidebar animation
      }
    };

    // Helper function to get sidebar bookmark count
    const getSidebarBookmarkCount = async () => {
      const sidebarBookmarks = page.locator('.sidebar [data-testid="bookmark-card"]');
      return await sidebarBookmarks.count();
    };

    // Helper function to get main page bookmark count
    const getMainPageBookmarkCount = async () => {
      const mainBookmarks = page.locator(':not(.sidebar) [data-testid="bookmark-card"]');
      return await mainBookmarks.count();
    };

    // Open bookmarks sidebar
    await toggleSidebar();

    // Wait for left sidebar to be visible (look for navigation element with bookmarks)
    await expect(page.locator('navigation:has-text("Bookmarks")')).toBeVisible({ timeout: 5000 });

    // Get initial counts from both locations
    const initialMainCount = await getMainPageBookmarkCount();
    const initialSidebarCount = await getSidebarBookmarkCount();

    console.log(`Initial counts - Main: ${initialMainCount}, Sidebar: ${initialSidebarCount}`);

    // Verify both locations have bookmarks
    expect(initialMainCount).toBeGreaterThan(0);
    expect(initialSidebarCount).toBeGreaterThan(0);

    // Test 1: Delete from main page, verify sidebar updates
    console.log("Testing: Delete from main page → sidebar should update");

    // Select first bookmark on main page
    const mainPageFirstBookmark = page.locator(':not(.sidebar) [data-testid="bookmark-card"]').first();
    await mainPageFirstBookmark.locator('input[type="checkbox"]').check();

    // Verify selection
    await expect(page.locator('text=1 selected')).toBeVisible();

    // Perform bulk delete
    await page.locator('[title="Delete selected bookmarks"]').click();
    await expect(page.locator('text=Delete Selected Bookmarks')).toBeVisible();
    await page.locator('button:has-text("Delete")').click();

    // Wait for success modal and close it
    await expect(page.locator('text=Success')).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Check that main page count decreased
    const mainCountAfterDelete = await getMainPageBookmarkCount();
    expect(mainCountAfterDelete).toBeLessThan(initialMainCount);

    // Check that sidebar count also decreased (should sync automatically)
    const sidebarCountAfterMainDelete = await getSidebarBookmarkCount();
    expect(sidebarCountAfterMainDelete).toBeLessThan(initialSidebarCount);

    console.log(`After main page delete - Main: ${mainCountAfterDelete}, Sidebar: ${sidebarCountAfterMainDelete}`);

    // Test 2: Delete from sidebar, verify main page updates
    console.log("Testing: Delete from sidebar → main page should update");

    // Get current counts
    const currentMainCount = await getMainPageBookmarkCount();
    const currentSidebarCount = await getSidebarBookmarkCount();

    if (currentSidebarCount > 0) {
      // Find a bookmark in the sidebar and delete it
      const sidebarFirstBookmark = page.locator('.sidebar [data-testid="bookmark-card"]').first();

      // Look for delete button within the sidebar bookmark card
      const sidebarDeleteButton = sidebarFirstBookmark.locator('[title*="Delete"], button:has-text("Delete"), .action-icon');

      if (await sidebarDeleteButton.isVisible()) {
        await sidebarDeleteButton.click();

        // If confirmation modal appears, confirm it
        if (await page.locator('text=Delete Selected Bookmarks').isVisible({ timeout: 2000 })) {
          await page.locator('button:has-text("Delete")').click();
          await expect(page.locator('text=Success')).toBeVisible({ timeout: 5000 });
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);
        }

        // Check that sidebar count decreased
        const sidebarCountAfterSidebarDelete = await getSidebarBookmarkCount();
        expect(sidebarCountAfterSidebarDelete).toBeLessThan(currentSidebarCount);

        // Check that main page count also decreased (should sync automatically)
        const mainCountAfterSidebarDelete = await getMainPageBookmarkCount();
        expect(mainCountAfterSidebarDelete).toBeLessThan(currentMainCount);

        console.log(`After sidebar delete - Main: ${mainCountAfterSidebarDelete}, Sidebar: ${sidebarCountAfterSidebarDelete}`);
      } else {
        console.log("No delete button found in sidebar bookmark - skipping sidebar delete test");
      }
    } else {
      console.log("No bookmarks left in sidebar - skipping sidebar delete test");
    }

    // Close sidebar to clean up
    await toggleSidebar();
  });
});