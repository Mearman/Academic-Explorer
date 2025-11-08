/**
 * End-to-end test for bulk bookmarks delete functionality
 */

import { test, expect } from "@playwright/test";

test.describe("Bulk Bookmarks Management", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to bookmarks page
    await page.goto("http://localhost:5173/#/bookmarks");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Wait for bookmarks to load (look for bookmark cards or empty state)
    await page.waitForSelector('[data-testid="bookmark-card"], .mantine-Card-withBorder', { timeout: 10000 });
  });

  test("should display bookmarks management interface", async ({ page }) => {
    // Check that bookmarks section is visible
    await expect(page.locator("text=Bookmarks")).toBeVisible();

    // Check for search input
    await expect(page.locator('input[placeholder="Search bookmarks..."]')).toBeVisible();

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

    // Verify success modal appears
    await expect(page.locator('text=Success')).toBeVisible({ timeout: 5000 });

    // Close success modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Refresh the page to see updated bookmark count
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('[data-testid="bookmark-card"], .mantine-Card-withBorder', { timeout: 10000 });

    // Get final count
    const finalBookmarkCards = page.locator('[data-testid="bookmark-card"]');
    const finalCount = await finalBookmarkCards.count();

    console.log(`Ended with ${finalCount} bookmarks`);

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

    // Search for the first bookmark title
    const searchInput = page.locator('input[placeholder="Search bookmarks..."]');
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

    // Check for empty state
    await expect(page.locator('text=No bookmarks yet')).toBeVisible();
    await expect(page.locator('text=Bookmark entities you want to revisit later')).toBeVisible();

    // Select All button should not be visible
    await expect(page.locator('button:has-text("Select All")')).not.toBeVisible();
  });
});